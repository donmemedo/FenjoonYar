from sqlmodel import update

from app.models import Cafe


def slugs(client, query=""):
    return [c["slug"] for c in client.get(f"/api/cafes{query}").json()]


def test_unfiltered_list_is_sorted_by_rating(client):
    cafes = client.get("/api/cafes").json()
    assert len(cafes) == 12
    ratings = [c["rating"] for c in cafes]
    assert ratings == sorted(ratings, reverse=True)
    assert set(cafes[0]) == {"id", "slug", "name", "city", "area", "address", "lat", "lng", "rating", "cover", "tags"}
    assert isinstance(cafes[0]["tags"], list)


def test_city_filter_matches_persian_and_english_names(client):
    assert set(slugs(client, "?city=Shiraz")) == {"khaak", "naranj"}
    assert set(slugs(client, "?city=شیراز")) == {"khaak", "naranj"}
    assert slugs(client, "?city=Atlantis") == []


def test_tag_filter_matches_whole_keys_only(client):
    assert set(slugs(client, "?tag=vegan")) == {"hamsayeh", "zende", "baran"}
    assert slugs(client, "?tag=veg") == [] and slugs(client, "?tag=specialty,brunch") == []
    assert set(slugs(client, "?tag=late")) == {"baam", "parvaz", "chehelsotoon"}


def test_text_search_covers_names_and_areas_case_insensitively(client):
    assert slugs(client, "?q=NOGHTE") == ["noghte"]
    assert slugs(client, "?q=نقطه") == ["noghte"]
    assert slugs(client, "?q=vanak") == ["noghte"] and slugs(client, "?q=JORDAN") == ["keshvar"]
    assert slugs(client, "?q=%20%20") == slugs(client)  # blank query is ignored


def test_search_wildcards_are_literal(client):
    assert slugs(client, "?q=%25") == [] and slugs(client, "?q=_") == [] and slugs(client, "?q=a%25b") == []


def test_filters_combine(client):
    assert slugs(client, "?city=Tehran&tag=workspace&q=ونک") == ["noghte"]
    assert set(slugs(client, "?city=Isfahan&tag=late")) == {"chehelsotoon"}


def test_inactive_cafes_are_hidden_from_the_list(client, upd):
    upd(update(Cafe).where(Cafe.slug == "tus").values(is_active=False))
    try:
        assert "tus" not in slugs(client) and client.get("/api/stats").json()["cafes"] == 11
    finally:
        upd(update(Cafe).where(Cafe.slug == "tus").values(is_active=True))


def test_filtering_happens_in_sql(client, sql_log):
    sql_log.clear()
    client.get("/api/cafes?city=Tehran&tag=late&q=abc")
    (stmt,) = [s for s in sql_log if "FROM cafe" in s]
    assert "city_fa" in stmt and "LIKE" in stmt.upper() and "tags" in stmt


def test_get_cafe(client):
    r = client.get("/api/cafes/noghte")
    assert r.status_code == 200 and r.json()["slug"] == "noghte" and r.json()["name"]["en"] == "Noghte Coffee"
    r = client.get("/api/cafes/nope")
    assert (r.status_code, r.json()) == (404, {"detail": "not_found"})


def test_plans_lists_only_active_plans_by_cups(client):
    plans = client.get("/api/plans").json()
    assert [p["cups"] for p in plans] == sorted(p["cups"] for p in plans) and len(plans) == 6
    p = next(p for p in plans if p["slug"] == "regular-10")
    assert (p["per_cup"], p["saving_percent"], p["popular"]) == (89_000, 26, True)


def test_stats_are_real_counts_only(client, make_user, make_redemption):
    base = client.get("/api/stats").json()
    assert base == {"cafes": 12, "cities": 5, "members": 0, "cups_served": 0}
    a, b = make_user(), make_user("09120000009")
    make_user("09120000008", role="partner", cafe="noghte")  # partners are not members
    make_redemption(a, code="10000001", status="confirmed")
    make_redemption(a, code="10000002", status="cancelled")
    make_redemption(b, code="10000003", status="pending")
    assert client.get("/api/stats").json() == {"cafes": 12, "cities": 5, "members": 2, "cups_served": 1}
