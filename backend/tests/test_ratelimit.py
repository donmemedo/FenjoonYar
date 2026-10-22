import pytest
from starlette.requests import Request

from app.config import settings
from app.ratelimit import SlidingWindowLimiter, client_ip
from tests.consts import PHONE

REQ = "/api/auth/request-otp"


class Clock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now


def make(clock=None, **kw):
    clock = clock or Clock()
    return SlidingWindowLimiter(clock=clock, **kw), clock


def test_window_slides():
    lim, clock = make()
    assert [lim.hit("k", 3, 60) for _ in range(3)] == [0, 0, 0]
    wait = lim.hit("k", 3, 60)
    assert wait == 61
    clock.now += 30
    assert lim.hit("k", 3, 60) > 0  # the first hits are still inside the window
    clock.now += 31
    assert lim.hit("k", 3, 60) == 0  # they slid out


def test_retry_after_counts_down():
    lim, clock = make()
    lim.hit("k", 1, 100)
    assert lim.hit("k", 1, 100) == 101
    clock.now += 40
    assert lim.hit("k", 1, 100) == 61


def test_keys_are_independent_and_check_records_nothing():
    lim, _ = make()
    assert lim.hit("a", 1, 60) == 0 and lim.hit("a", 1, 60) > 0 and lim.hit("b", 1, 60) == 0
    assert all(lim.check("c", 1, 60) == 0 for _ in range(5))
    lim.record("c", 60)
    assert lim.check("c", 1, 60) > 0


def test_purge_drops_only_dead_keys():
    lim, clock = make()
    lim.hit("short", 5, 10)
    lim.hit("long", 5, 1000)
    clock.now += 11
    assert lim.purge() == 1 and len(lim) == 1
    clock.now += 1000
    assert lim.purge() == 1 and len(lim) == 0


def test_memory_stays_bounded_under_a_flood_of_distinct_keys():
    lim, _ = make(max_keys=100)
    for i in range(1000):
        lim.hit(f"ip-{i}", 5, 600)
    assert len(lim) <= 100


def test_reset_empties_the_limiter():
    lim, _ = make()
    lim.hit("a", 1, 60)
    lim.reset()
    assert len(lim) == 0 and lim.hit("a", 1, 60) == 0


def req(xff=None, peer="9.9.9.9"):
    headers = [(b"x-forwarded-for", v.encode()) for v in ([] if xff is None else [xff])]
    return Request({"type": "http", "headers": headers, "client": (peer, 1234) if peer else None})


@pytest.mark.parametrize("proxies,xff,expected", [
    (0, "1.1.1.1, 2.2.2.2", "9.9.9.9"),            # untrusted: the header is ignored
    (1, "1.1.1.1, 2.2.2.2", "2.2.2.2"),            # last entry: appended by our proxy
    (2, "1.1.1.1, 2.2.2.2, 3.3.3.3", "2.2.2.2"),
    (1, "6.6.6.6, 1.1.1.1", "1.1.1.1"),            # a client-forged leading entry is ignored
    (2, "1.1.1.1", "9.9.9.9"),                     # fewer entries than proxies: fall back to the peer
    (1, None, "9.9.9.9"),
    (1, "not-an-ip", "9.9.9.9"),
    (1, "2001:db8::1", "2001:db8::1"),
    (1, " 1.1.1.1 ,  4.4.4.4 ", "4.4.4.4"),
])
def test_client_ip(monkeypatch, proxies, xff, expected):
    monkeypatch.setattr(settings, "trusted_proxies", proxies)
    assert client_ip(req(xff)) == expected


def test_client_ip_without_a_peer(monkeypatch):
    monkeypatch.setattr(settings, "trusted_proxies", 0)
    assert client_ip(req(peer=None)) == "unknown"


def test_forged_forwarded_for_does_not_dodge_the_ip_limit(client):
    for i in range(10):
        r = client.post(REQ, json={"phone": f"0913000000{i}"}, headers={"X-Forwarded-For": f"10.0.0.{i}"})
        assert r.status_code == 200
    r = client.post(REQ, json={"phone": "09139999999"}, headers={"X-Forwarded-For": "10.0.0.99"})
    assert r.status_code == 429


def test_trusted_proxy_header_gives_each_client_its_own_budget(client, monkeypatch):
    monkeypatch.setattr(settings, "trusted_proxies", 1)
    for i in range(10):
        assert client.post(REQ, json={"phone": f"0913000000{i}"}, headers={"X-Forwarded-For": "5.5.5.5"}).status_code == 200
    assert client.post(REQ, json={"phone": "09139999999"}, headers={"X-Forwarded-For": "5.5.5.5"}).status_code == 429
    assert client.post(REQ, json={"phone": "09138888888"}, headers={"X-Forwarded-For": "6.6.6.6"}).status_code == 200


def test_a_429_carries_retry_after_in_body_and_header(client):
    client.post(REQ, json={"phone": PHONE})
    r = client.post(REQ, json={"phone": PHONE})
    assert r.status_code == 429
    assert r.json()["retry_after"] == int(r.headers["retry-after"])
