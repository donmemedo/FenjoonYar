from sqlmodel import Session, select

from .models import Cafe, Plan, User

PLANS = [
    dict(slug="taste-5", kind="package", title_fa="بسته ۵ فنجانی", title_en="5 Cup Pack",
         subtitle_fa="برای شروع و آشنایی با شبکه کافه‌ها",
         subtitle_en="A relaxed start across the network",
         cups=5, price_toman=480_000, list_price_toman=600_000, validity_days=90),
    dict(slug="regular-10", kind="package", title_fa="بسته ۱۰ فنجانی", title_en="10 Cup Pack",
         subtitle_fa="انتخاب محبوب مشتری‌های نیمه‌منظم",
         subtitle_en="The everyday favourite",
         cups=10, price_toman=890_000, list_price_toman=1_200_000, validity_days=90, popular=True),
    dict(slug="ritual-20", kind="package", title_fa="بسته ۲۰ فنجانی", title_en="20 Cup Pack",
         subtitle_fa="برای قهوه‌خورهای حرفه‌ای و روزانه",
         subtitle_en="For daily drinkers",
         cups=20, price_toman=1_680_000, list_price_toman=2_400_000, validity_days=90),
    dict(slug="monthly-12", kind="subscription", title_fa="اشتراک ماهانه ۱۲ فنجان",
         title_en="Monthly 12 Cups",
         subtitle_fa="هر ماه تمدید می‌شود، هر روز یک فنجان تازه",
         subtitle_en="Renews monthly, fresh cup daily",
         cups=12, price_toman=1_020_000, list_price_toman=1_440_000, validity_days=30),
    dict(slug="monthly-24", kind="subscription", title_fa="اشتراک ماهانه ۲۴ فنجان",
         title_en="Monthly 24 Cups",
         subtitle_fa="مصرف منصفانه، دو فنجان در روز",
         subtitle_en="Fair use, two cups a day",
         cups=24, price_toman=1_900_000, list_price_toman=2_880_000, validity_days=30),
    dict(slug="team-50", kind="corporate", title_fa="پلن شرکتی ۵۰ فنجان", title_en="Team 50 Cups",
         subtitle_fa="اعتبار نوشیدنی برای تیم‌ها و فضاهای کار اشتراکی",
         subtitle_en="Drink credit for teams and co-working spaces",
         cups=50, price_toman=3_950_000, list_price_toman=6_000_000, validity_days=120),
]

CAFES = [
    ("noghte", "کافه نقطه", "Noghte Coffee", "تهران", "Tehran", "ونک", "Vanak",
     "ونک، خیابان ملاصدرا", "Mollasadra St, Vanak", 35.7575, 51.4098, 4.8, "beans",
     "specialty,workspace"),
    ("raj", "رُج رُستری", "Raj Roastery", "تهران", "Tehran", "تجریش", "Tajrish",
     "تجریش، خیابان دربند", "Darband St, Tajrish", 35.8046, 51.4285, 4.7, "roast",
     "specialty,brunch"),
    ("baam", "کافه بام", "Baam Rooftop", "تهران", "Tehran", "سعادت‌آباد", "Saadatabad",
     "سعادت‌آباد، میدان کاج", "Kaj Sq, Saadatabad", 35.7810, 51.3720, 4.6, "cup",
     "brunch,late"),
    ("hamsayeh", "کافه همسایه", "Hamsayeh", "تهران", "Tehran", "یوسف‌آباد", "Yousefabad",
     "یوسف‌آباد، خیابان سیدجمال‌الدین", "Seyed Jamaleddin St", 35.7360, 51.4030, 4.5,
     "cup", "workspace,vegan"),
    ("parvaz", "کافه پرواز", "Parvaz", "تهران", "Tehran", "انقلاب", "Enghelab",
     "انقلاب، روبه‌روی دانشگاه تهران", "Opposite Tehran University", 35.7008, 51.3920,
     4.4, "beans", "workspace,late"),
    ("keshvar", "قهوه کشور", "Keshvar Coffee", "تهران", "Tehran", "جردن", "Jordan",
     "جردن، خیابان ونک", "Vanak St, Jordan", 35.7660, 51.4180, 4.7, "roast", "specialty"),
    ("khaak", "کافه خاک", "Khaak", "شیراز", "Shiraz", "معالی‌آباد", "Maaliabad",
     "معالی‌آباد، بلوار دوستان", "Doostan Blvd", 29.6250, 52.5100, 4.6, "cup",
     "specialty,brunch"),
    ("naranj", "کافه نارنج", "Naranj", "شیراز", "Shiraz", "حافظیه", "Hafezieh",
     "حافظیه، خیابان گلستان", "Golestan St", 29.6260, 52.5580, 4.5, "beans", "brunch"),
    ("chehelsotoon", "کافه چهل‌ستون", "Chehelsotoon", "اصفهان", "Isfahan", "چهارباغ",
     "Chaharbagh", "چهارباغ عباسی", "Chaharbagh Abbasi", 32.6570, 51.6680, 4.7, "roast",
     "specialty,late"),
    ("zende", "کافه زنده‌رود", "Zendeh Roud", "اصفهان", "Isfahan", "سی‌وسه‌پل", "Si-o-se-pol",
     "کنار پل خواجو", "Near Khaju Bridge", 32.6350, 51.6700, 4.4, "cup", "brunch,vegan"),
    ("tus", "کافه توس", "Tus", "مشهد", "Mashhad", "احمدآباد", "Ahmadabad",
     "احمدآباد، خیابان رضا", "Reza St, Ahmadabad", 36.2970, 59.5800, 4.5, "beans",
     "workspace"),
    ("baran", "کافه باران", "Baran", "رشت", "Rasht", "گلسار", "Golsar",
     "گلسار، بلوار نواب", "Navvab Blvd, Golsar", 37.2860, 49.5830, 4.6, "roast",
     "specialty,vegan"),
]


def seed(session: Session) -> None:
    if not session.exec(select(Plan)).first():
        for p in PLANS:
            session.add(Plan(**p))
    if not session.exec(select(Cafe)).first():
        for c in CAFES:
            session.add(
                Cafe(
                    slug=c[0], name_fa=c[1], name_en=c[2], city_fa=c[3], city_en=c[4],
                    area_fa=c[5], area_en=c[6], address_fa=c[7], address_en=c[8],
                    lat=c[9], lng=c[10], rating=c[11], cover=c[12], tags=c[13],
                )
            )
    session.commit()

    # Demo partner account bound to the first cafe (login: 09120000000).
    if not session.exec(select(User).where(User.phone == "09120000000")).first():
        cafe = session.exec(select(Cafe).where(Cafe.slug == "noghte")).first()
        session.add(
            User(phone="09120000000", name="کافه نقطه", role="partner", cafe_id=cafe.id)
        )
        session.commit()
