export const locales = ["fa", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fa";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Awaits the route params and narrows `locale`; unknown values fall back to the default. */
export async function localeOf(params: Promise<{ locale: string }>): Promise<Locale> {
  const { locale } = await params;
  return isLocale(locale) ? locale : defaultLocale;
}

const fa = {
  dir: "rtl",
  brand: "کاپ‌یار",
  brandSub: "شبکه کافه‌های مستقل",
  meta: {
    title: "کاپ‌یار | یک اشتراک، همه کافه‌های مستقل",
    template: "%s | کاپ‌یار",
    description: "کاپ‌یار: بسته‌های پیش‌پرداخت قهوه برای شبکه کافه‌های مستقل ایران. یک بسته بخرید و در هر کافه عضو قهوه‌تان را بگیرید.",
  },
  nav: {
    plans: "بسته‌ها",
    cafes: "کافه‌ها",
    how: "چطور کار می‌کند",
    partner: "پیش‌خوان کافه",
    app: "حساب کاربری",
    login: "ورود",
    logout: "خروج",
    skip: "رفتن به محتوای اصلی",
    menu: "باز کردن منو",
    menuClose: "بستن منو",
    main: "پیمایش اصلی",
    tabs: "پیمایش سریع",
    footer: "پیوندهای پایین صفحه",
  },
  common: {
    continue: "تایید و ادامه",
    back: "بازگشت",
    cancel: "انصراف",
    search: "جستجو",
    loading: "در حال بارگذاری…",
    toman: "تومان",
    cup: "فنجان",
    cups: "فنجان",
    all: "همه",
    save: "ذخیره",
    close: "بستن",
    error: "چیزی درست پیش نرفت. دوباره تلاش کنید.",
    empty: "فعلاً چیزی اینجا نیست.",
    theme: "حالت تاریک",
    language: "زبان",
    retry: "تلاش دوباره",
    retryIn: "{t} تا تلاش دوباره",
    sample: "نمونه برای نمایش",
    home: "رفتن به صفحه اصلی",
  },
  hero: {
    badge: "پیش‌فروش قهوه، بدون مرز کافه",
    title1: "یک اشتراک،",
    title2: "همه کافه‌های مستقل",
    desc: "بسته فنجان بخرید، در هر کافه عضو کاپ‌یار کد مصرف بسازید و قهوه‌تان را بگیرید. بدون پرداخت جداگانه، بدون کارت وفاداری کاغذی.",
    ctaPrimary: "خرید بسته",
    ctaSecondary: "دیدن کافه‌ها",
    note: "اعتبار هر بسته روی خود بسته نوشته شده است.",
  },
  stats: {
    cafes: "کافه عضو",
    cities: "شهر",
    members: "کاربر",
    cups: "فنجان سرو شده",
  },
  how: {
    title: "سه قدم تا فنجان بعدی",
    sub: "بدون صف حساب، بدون نقد، بدون اپلیکیشن سنگین.",
    steps: [
      { t: "بسته‌تان را بخرید", d: "بسته ۵، ۱۰ یا ۲۰ فنجانی یا اشتراک ماهانه. مبلغ یک‌بار پرداخت می‌شود." },
      { t: "کد مصرف بسازید", d: "در کافه، از حساب کاربری یک کد یک‌بار مصرف یا QR بگیرید؛ ۱۰ دقیقه اعتبار دارد." },
      { t: "قهوه را تحویل بگیرید", d: "کافه کد را در پیش‌خوان خود تایید می‌کند و یک فنجان از اعتبار شما کم می‌شود." },
    ],
  },
  plans: {
    title: "بسته‌ها و اشتراک‌ها",
    sub: "هرچه بیشتر برمی‌دارید، هر فنجان ارزان‌تر تمام می‌شود.",
    package: "بسته پیش‌پرداخت",
    subscription: "اشتراک ماهانه",
    corporate: "پلن شرکتی",
    perCup: "هر فنجان",
    validity: "روز اعتبار",
    saving: "صرفه‌جویی",
    popular: "محبوب‌ترین",
    buy: "خرید بسته",
    buyLogin: "برای خرید وارد شوید",
    viewAll: "دیدن همه بسته‌ها",
    bought: "بسته به حساب شما اضافه شد",
    paymentPending:
      "سفارش شما ثبت شد، اما درگاه پرداخت هنوز متصل نیست. تا پایان پرداخت، فنجانی به کیف پولتان اضافه نمی‌شود.",
    viewOrders: "مشاهده سفارش‌ها",
    errors: {
      plan_not_found: "این بسته دیگر در دسترس نیست.",
      rate_limited: "درخواست‌ها زیاد بود. {t} دیگر دوباره امتحان کنید.",
    },
  },
  cafes: {
    title: "کافه‌های عضو",
    sub: "کافه‌های مستقلی که کد مصرف کاپ‌یار را می‌پذیرند.",
    searchLabel: "جستجوی کافه",
    viewAll: "دیدن همه کافه‌ها",
    searchPlaceholder: "نام کافه یا محله را بنویسید",
    city: "شهر",
    tag: "حال‌وهوا",
    rating: "امتیاز",
    empty: "کافه‌ای با این جستجو پیدا نشد.",
    count: "{n} کافه",
    tags: {
      specialty: "قهوه تخصصی",
      brunch: "صبحانه",
      workspace: "مناسب کار",
      late: "باز تا دیروقت",
      vegan: "گیاهی",
    },
  },
  auth: {
    title: "ورود یا ثبت‌نام",
    sub: "با شماره تلفن همراه وارد شوید. رمز یک‌بار مصرف برایتان پیامک می‌شود.",
    phone: "شماره تلفن همراه",
    phoneHint: "مثال: ۰۹۱۲۳۴۵۶۷۸۹",
    name: "نام شما (اختیاری)",
    send: "دریافت رمز یک‌بار مصرف",
    code: "رمز یک‌بار مصرف ۶ رقمی",
    codeSent: "رمز یک‌بار مصرف برای شماره {phone} پیامک شد.",
    codeLife: "زمان باقی‌مانده تا پایان اعتبار رمز",
    codeMinutes: "{n} دقیقه تا پایان اعتبار رمز",
    codeExpired: "اعتبار رمز تمام شد. رمز تازه بگیرید.",
    resend: "ارسال دوباره رمز",
    resendIn: "{t} تا ارسال دوباره",
    devCode: "رمز نمایشی:",
    demoNote: "حالت نمایشی: برای دیدن پیش‌خوان کافه با شماره ۰۹۱۲۰۰۰۰۰۰۰ وارد شوید.",
    verify: "ورود به حساب کاربری",
    changePhone: "تغییر شماره",
    invalidPhone: "شماره را درست بنویسید؛ با ۰۹ شروع می‌شود و ۱۱ رقم است.",
    invalidCode: "رمز نادرست است یا اعتبارش تمام شده است.",
    cooldown: "رمز تازه‌ای همین حالا فرستاده شد. کمی صبر کنید.",
    rateLimited: "تلاش‌ها بیش از حد مجاز بود. {t} دیگر دوباره امتحان کنید.",
    partnerHint: "کافه‌دار هستید؟ با شماره‌ای که کافه‌تان در کاپ‌یار ثبت کرده وارد شوید.",
  },
  app: {
    title: "حساب کاربری",
    hello: "سلام",
    wallet: "کیف پول فنجان",
    remaining: "فنجان باقی‌مانده",
    used: "مصرف‌شده",
    expired: "منقضی‌شده",
    expiring: "نزدیک به انقضا",
    nextExpiry: "انقضای بعدی",
    newCode: "ساخت کد مصرف",
    codeTitle: "کد مصرف شما",
    codeHelp: "این کد را به باریستا نشان دهید. تا ۱۰ دقیقه معتبر است.",
    codeMinutes: "{n} دقیقه تا پایان اعتبار کد",
    codeExpired: "اعتبار کد مصرف تمام شد.",
    codeLife: "زمان باقی‌مانده تا پایان اعتبار کد",
    qrLabel: "کد QR مصرف. آن را به باریستا نشان دهید.",
    noCups: "اعتبار فنجان ندارید. اول یک بسته بخرید.",
    buyMore: "خرید بسته",
    orders: "سفارش‌ها",
    history: "تاریخچه مصرف",
    sections: "نمایش",
    status: {
      pending: "در انتظار تایید کافه",
      confirmed: "تحویل شده",
      expired: "منقضی شد",
      cancelled: "لغوشده",
    },
    orderStatus: {
      paid: "پرداخت شده",
      pending: "در انتظار پرداخت",
      failed: "ناموفق",
    },
    orderPending: "پس از پرداخت، فنجان‌ها به کیف پول اضافه می‌شوند.",
    loadError: "اطلاعات حساب بارگذاری نشد.",
    at: "در",
    anyCafe: "هر کافه عضو",
    cafe: "کافه",
    drink: "نوشیدنی",
    drinks: { espresso: "اسپرسو", latte: "لاته", cappuccino: "کاپوچینو", filter: "قهوه دمی", cold: "آیس‌کافی" },
    errors: {
      no_cups_left: "اعتبار فنجان ندارید. اول یک بسته بخرید.",
      rate_limited: "در این مدت کد زیادی ساخته‌اید. {t} دیگر دوباره امتحان کنید.",
    },
  },
  partner: {
    title: "پیش‌خوان کافه",
    sub: "کد مصرف مشتری را اینجا تایید کنید.",
    codeLabel: "کد مصرف مشتری (۸ رقم)",
    confirm: "تایید و ثبت فنجان",
    todayCups: "فنجان امروز",
    todaySettle: "تسویه امروز",
    weekCups: "فنجان هفت روز",
    unique: "مشتری یکتا",
    pending: "در انتظار تسویه",
    chart: "روند هفت روز گذشته",
    chartEmpty: "در هفت روز گذشته فنجانی تایید نشده است.",
    day: "روز",
    cupsCol: "فنجان",
    recent: "آخرین تاییدها",
    success: "ثبت شد. یک فنجان از اعتبار مشتری کم شد.",
    result: { drink: "نوشیدنی", settle: "تسویه این فنجان", time: "زمان تایید" },
    notPartner: "این حساب کاربری به کافه‌ای وصل نیست.",
    errors: {
      code_invalid: "این کد پیدا نشد، قبلاً استفاده شده یا اعتبارش تمام شده است.",
      no_cups_left: "مشتری فنجان باقی‌مانده ندارد.",
      rate_limited: "تلاش‌های ناموفق زیاد بود. {t} دیگر دوباره امتحان کنید.",
    },
  },
  cta: {
    title: "کافه دارید؟",
    desc: "با عضویت در شبکه کاپ‌یار، مشتری تازه می‌گیرید، کد مصرف را در چند ثانیه تایید می‌کنید و تسویه هر فنجان را شفاف در پیش‌خوان می‌بینید.",
    action: "ورود به پیش‌خوان کافه",
    sample: "نمونه نمودار پیش‌خوان",
  },
  faq: {
    title: "سوال‌های پرتکرار",
    items: [
      { q: "اعتبار بسته چقدر است؟", a: "بسته‌های پیش‌پرداخت ۹۰ روز و اشتراک‌های ماهانه ۳۰ روز اعتبار دارند. فنجان‌های منقضی‌شده در کیف پول جداگانه نشان داده می‌شوند." },
      { q: "در هر کافه‌ای می‌توانم استفاده کنم؟", a: "در همه کافه‌های عضو شبکه. فهرست کافه‌ها همیشه در صفحه کافه‌ها به‌روز است." },
      { q: "نوشیدنی گران‌تر از سقف بسته چه می‌شود؟", a: "مابه‌التفاوت را مستقیم به کافه می‌پردازید؛ یک فنجان از اعتبار شما کم می‌شود." },
      { q: "کافه‌ها چطور تسویه می‌شوند؟", a: "به‌ازای هر فنجان تاییدشده، مبلغ تسویه در پیش‌خوان کافه ثبت می‌شود." },
    ],
  },
  footer: {
    rights: "همه حقوق محفوظ است.",
    made: "ساخته‌شده برای کافه‌های مستقل ایران",
    privacy: "حریم خصوصی",
    terms: "شرایط استفاده",
  },
  notFound: {
    title: "این فنجان خالی است",
    desc: "صفحه‌ای که دنبالش هستید پیدا نشد.",
    back: "بازگشت به صفحه اصلی",
  },
  legal: {
    draftTitle: "پیش‌نویس",
    draft: "این متن پیش‌نویس است و پیش از انتشار عمومی باید توسط مشاور حقوقی بررسی شود. بخش‌های داخل کروشه هنوز تصمیم‌گیری نشده‌اند.",
    privacy: {
      title: "حریم خصوصی",
      sections: [
        {
          h: "چه اطلاعاتی را نگه می‌داریم",
          p: [
            "شماره تلفن همراه شما، برای ورود و دریافت رمز یک‌بار مصرف.",
            "نام و ایمیل، فقط اگر خودتان وارد کنید. هر دو اختیاری‌اند.",
            "سفارش‌ها: بسته خریداری‌شده، مبلغ، زمان و وضعیت پرداخت.",
            "تاریخچه مصرف: کد مصرف، نوشیدنی، کافه، وضعیت و زمان هر درخواست.",
          ],
        },
        {
          h: "برای چه استفاده می‌کنیم",
          p: [
            "ورود به حساب کاربری، نمایش کیف پول و تاریخچه، ساخت و تایید کد مصرف و تسویه با کافه‌ها.",
            "پیامک و درگاه پرداخت هنوز متصل نشده‌اند. [پیش از اتصال، نام ارائه‌دهندگان و اطلاعاتی که با آن‌ها به اشتراک گذاشته می‌شود اینجا نوشته شود.]",
          ],
        },
        {
          h: "کافه‌ها چه چیزی می‌بینند",
          p: ["هنگام تایید کد، کافه فقط نوشیدنی، مبلغ تسویه و زمان تایید را می‌بیند. نام و شماره تلفن شما به کافه نمایش داده نمی‌شود."],
        },
        {
          h: "کوکی و ذخیره‌سازی در مرورگر",
          p: [
            "پس از ورود، یک کوکی نشست (cups_session) ذخیره می‌شود که فقط برای ورود لازم است و جاوااسکریپت صفحه به آن دسترسی ندارد.",
            "انتخاب حالت روشن یا تاریک در حافظه مرورگر شما می‌ماند.",
            "از ابزار تبلیغاتی یا تحلیل رفتاری بیرونی استفاده نمی‌کنیم و فونت‌ها از خود سرور ما بارگیری می‌شوند.",
          ],
        },
        {
          h: "گزارش‌های امنیتی",
          p: [
            "برای جلوگیری از سوءاستفاده، نشانی IP و نسخه رمزنگاری‌شده (هش) شماره تلفن در گزارش‌های فنی ثبت می‌شود. متن شماره تلفن در این گزارش‌ها نیست.",
            "[مدت نگهداری گزارش‌ها و اطلاعات حساب پیش از انتشار تعیین شود.]",
          ],
        },
        {
          h: "حذف اطلاعات و تماس",
          p: ["[روش درخواست حذف حساب و نشانی تماس پیش از انتشار اضافه شود.]"],
        },
      ],
    },
    terms: {
      title: "شرایط استفاده",
      sections: [
        {
          h: "کاپ‌یار چیست",
          p: ["کاپ‌یار بسته‌های پیش‌پرداخت فنجان می‌فروشد. هر فنجان با یک کد مصرف در کافه‌های عضو شبکه تحویل گرفته می‌شود."],
        },
        {
          h: "حساب کاربری",
          p: [
            "ورود با شماره تلفن همراه و رمز یک‌بار مصرف انجام می‌شود. دسترسی به شماره‌تان با خودتان است.",
            "کد مصرف را فقط هنگام تحویل قهوه به باریستا نشان دهید.",
          ],
        },
        {
          h: "بسته‌ها و اعتبار",
          p: [
            "هر بسته مدت اعتبار مشخصی دارد (برای بسته‌های پیش‌پرداخت ۹۰ روز و برای اشتراک ماهانه ۳۰ روز؛ مقدار دقیق در صفحه هر بسته آمده است).",
            "فنجان‌های منقضی‌شده دیگر قابل مصرف نیستند.",
          ],
        },
        {
          h: "کد مصرف",
          p: [
            "کد مصرف ۸ رقمی و یک‌بار مصرف است و ۱۰ دقیقه اعتبار دارد. با ساختن کد تازه، کد قبلی لغو می‌شود.",
            "پس از تایید کافه، یک فنجان از اعتبار شما کم می‌شود.",
          ],
        },
        {
          h: "پرداخت و بازپرداخت",
          p: ["پرداخت آنلاین هنوز فعال نیست. [شرایط پرداخت، بازپرداخت و رسیدگی به شکایت پیش از فعال‌سازی تعیین شود.]"],
        },
        {
          h: "مسئولیت و قانون حاکم",
          p: ["[محدودیت مسئولیت، قانون حاکم و مرجع رسیدگی پیش از انتشار تعیین شود.]"],
        },
      ],
    },
  },
};

const en: typeof fa = {
  dir: "ltr",
  brand: "CUPS",
  brandSub: "independent cafe network",
  meta: {
    title: "CUPS | One subscription, every independent cafe",
    template: "%s | CUPS",
    description: "CUPS Iran: prepaid coffee packs for a network of independent cafes. Buy a pack and redeem it at any member cafe.",
  },
  nav: {
    plans: "Plans",
    cafes: "Cafes",
    how: "How it works",
    partner: "Cafe desk",
    app: "My account",
    login: "Log in",
    logout: "Log out",
    skip: "Skip to main content",
    menu: "Open menu",
    menuClose: "Close menu",
    main: "Main navigation",
    tabs: "Quick navigation",
    footer: "Footer links",
  },
  common: {
    continue: "Continue",
    back: "Back",
    cancel: "Cancel",
    search: "Search",
    loading: "Loading…",
    toman: "Toman",
    cup: "cup",
    cups: "cups",
    all: "All",
    save: "Save",
    close: "Close",
    error: "Something went wrong. Please try again.",
    empty: "Nothing here yet.",
    theme: "Dark mode",
    language: "Language",
    retry: "Try again",
    retryIn: "Try again in {t}",
    sample: "Sample for illustration",
    home: "Go to the home page",
  },
  hero: {
    badge: "Prepaid coffee, across every cafe",
    title1: "One subscription,",
    title2: "every independent cafe",
    desc: "Buy a pack of cups, generate a one-time code at any member cafe and pick up your coffee. No separate payment, no paper loyalty card.",
    ctaPrimary: "Buy a pack",
    ctaSecondary: "Browse cafes",
    note: "Each pack shows its own validity.",
  },
  stats: { cafes: "member cafes", cities: "cities", members: "members", cups: "cups served" },
  how: {
    title: "Three steps to your next cup",
    sub: "No checkout queue, no cash, no heavy app.",
    steps: [
      { t: "Buy your pack", d: "5, 10 or 20 cups, or a monthly subscription. You pay once." },
      { t: "Generate a code", d: "At the cafe, create a one-time code or QR from your account. It lives for 10 minutes." },
      { t: "Pick up your coffee", d: "The cafe confirms the code at its desk and one cup leaves your balance." },
    ],
  },
  plans: {
    title: "Packs and subscriptions",
    sub: "The more cups you take, the cheaper each one gets.",
    package: "Prepaid pack",
    subscription: "Monthly subscription",
    corporate: "Team plan",
    perCup: "per cup",
    validity: "days valid",
    saving: "saving",
    popular: "Most popular",
    buy: "Buy pack",
    buyLogin: "Log in to buy",
    viewAll: "See all plans",
    bought: "The pack was added to your account",
    paymentPending:
      "Your order is saved, but the payment gateway is not connected yet. No cups are added to your wallet until payment completes.",
    viewOrders: "View orders",
    errors: {
      plan_not_found: "This pack is no longer available.",
      rate_limited: "Too many requests. Try again in {t}.",
    },
  },
  cafes: {
    title: "Member cafes",
    sub: "Independent cafes that accept CUPS redemption codes.",
    searchLabel: "Search cafes",
    viewAll: "See all cafes",
    searchPlaceholder: "Cafe name or neighbourhood",
    city: "City",
    tag: "Vibe",
    rating: "Rating",
    empty: "No cafe matches this search.",
    count: "{n} cafes",
    tags: {
      specialty: "Specialty",
      brunch: "Brunch",
      workspace: "Work friendly",
      late: "Open late",
      vegan: "Plant based",
    },
  },
  auth: {
    title: "Log in or sign up",
    sub: "Use your mobile number. We text you a one-time code.",
    phone: "Mobile number",
    phoneHint: "Example: 09123456789",
    name: "Your name (optional)",
    send: "Send the code",
    code: "6-digit verification code",
    codeSent: "We texted a code to {phone}.",
    codeLife: "Time left before the code expires",
    codeMinutes: "{n} minutes until the code expires",
    codeExpired: "The code has expired. Request a new one.",
    resend: "Send the code again",
    resendIn: "Send again in {t}",
    devCode: "Demo code:",
    demoNote: "Demo mode: log in with 09120000000 to see the cafe desk.",
    verify: "Enter my account",
    changePhone: "Change number",
    invalidPhone: "Please write a valid number: 11 digits starting with 09.",
    invalidCode: "That code is wrong or expired.",
    cooldown: "A code was just sent. Wait a moment and try again.",
    rateLimited: "Too many attempts. Try again in {t}.",
    partnerHint: "Run a cafe? Log in with the number your cafe registered with CUPS.",
  },
  app: {
    title: "My account",
    hello: "Hi",
    wallet: "Cup wallet",
    remaining: "cups left",
    used: "used",
    expired: "expired",
    expiring: "expiring soon",
    nextExpiry: "Next expiry",
    newCode: "Create redemption code",
    codeTitle: "Your redemption code",
    codeHelp: "Show this to the barista. Valid for 10 minutes.",
    codeMinutes: "{n} minutes until the code expires",
    codeExpired: "The redemption code has expired.",
    codeLife: "Time left before the code expires",
    qrLabel: "Redemption QR code. Show it to the barista.",
    noCups: "You have no cups left. Buy a pack first.",
    buyMore: "Buy a pack",
    orders: "Orders",
    history: "Redemption history",
    sections: "Show",
    status: {
      pending: "Waiting for the cafe",
      confirmed: "Delivered",
      expired: "Expired",
      cancelled: "Cancelled",
    },
    orderStatus: {
      paid: "Paid",
      pending: "Awaiting payment",
      failed: "Failed",
    },
    orderPending: "Cups are added to your wallet once the payment completes.",
    loadError: "Your account data could not be loaded.",
    at: "at",
    anyCafe: "Any member cafe",
    cafe: "Cafe",
    drink: "Drink",
    drinks: { espresso: "Espresso", latte: "Latte", cappuccino: "Cappuccino", filter: "Filter", cold: "Iced coffee" },
    errors: {
      no_cups_left: "You have no cups left. Buy a pack first.",
      rate_limited: "You created a lot of codes. Try again in {t}.",
    },
  },
  partner: {
    title: "Cafe desk",
    sub: "Confirm a customer redemption code here.",
    codeLabel: "Customer code (8 digits)",
    confirm: "Confirm the cup",
    todayCups: "cups today",
    todaySettle: "settlement today",
    weekCups: "cups this week",
    unique: "unique customers",
    pending: "pending settlement",
    chart: "Last seven days",
    chartEmpty: "No cups were confirmed in the last seven days.",
    day: "Day",
    cupsCol: "Cups",
    recent: "Recent confirmations",
    success: "Done. One cup was taken from the customer balance.",
    result: { drink: "Drink", settle: "Settlement for this cup", time: "Confirmed at" },
    notPartner: "This account is not linked to a cafe.",
    errors: {
      code_invalid: "This code was not found, was already used, or has expired.",
      no_cups_left: "The customer has no cups left.",
      rate_limited: "Too many failed attempts. Try again in {t}.",
    },
  },
  cta: {
    title: "Run a cafe?",
    desc: "Join the CUPS network to reach new customers, confirm a code in seconds and see the settlement for every cup at your desk.",
    action: "Open the cafe desk",
    sample: "Sample desk chart",
  },
  faq: {
    title: "Frequent questions",
    items: [
      { q: "How long is a pack valid?", a: "Prepaid packs last 90 days, monthly subscriptions 30 days. Expired cups are shown separately in your wallet." },
      { q: "Can I use it at any cafe?", a: "At every cafe in the network. The cafes page is always up to date." },
      { q: "What if the drink costs more than the cup value?", a: "You pay the difference directly to the cafe, and one cup leaves your balance." },
      { q: "How are cafes settled?", a: "For every confirmed cup, the settlement amount is recorded at the cafe desk." },
    ],
  },
  footer: {
    rights: "All rights reserved.",
    made: "Built for Iran's independent cafes",
    privacy: "Privacy",
    terms: "Terms of service",
  },
  notFound: {
    title: "This cup is empty",
    desc: "We could not find the page you were looking for.",
    back: "Back to the home page",
  },
  legal: {
    draftTitle: "Draft",
    draft: "This text is a draft and needs legal review before public launch. Items in square brackets are still undecided.",
    privacy: {
      title: "Privacy",
      sections: [
        {
          h: "What we keep",
          p: [
            "Your mobile number, to log you in and send the one-time code.",
            "Your name and email, only if you enter them. Both are optional.",
            "Orders: the pack, the amount, the time and the payment status.",
            "Redemption history: the code, the drink, the cafe, the status and the time of each request.",
          ],
        },
        {
          h: "What we use it for",
          p: [
            "Logging you in, showing your wallet and history, creating and confirming redemption codes, and settling with cafes.",
            "SMS and the payment gateway are not connected yet. [Before connecting them, name the providers and what is shared with them here.]",
          ],
        },
        {
          h: "What cafes see",
          p: ["When a cafe confirms a code, it sees only the drink, the settlement amount and the time. Your name and phone number are not shown to the cafe."],
        },
        {
          h: "Cookies and browser storage",
          p: [
            "After login we set a session cookie (cups_session). It is needed to keep you logged in, and page scripts cannot read it.",
            "Your light or dark choice is kept in your browser storage.",
            "We use no third-party advertising or behaviour analytics, and fonts load from our own server.",
          ],
        },
        {
          h: "Security logs",
          p: [
            "To prevent abuse, technical logs record the IP address and a hash of the phone number. The phone number itself is not in these logs.",
            "[Set the retention period for logs and account data before launch.]",
          ],
        },
        {
          h: "Deleting your data and contact",
          p: ["[Add how to request account deletion and a contact address before launch.]"],
        },
      ],
    },
    terms: {
      title: "Terms of service",
      sections: [
        {
          h: "What CUPS is",
          p: ["CUPS sells prepaid packs of cups. You redeem each cup at a member cafe with a redemption code."],
        },
        {
          h: "Your account",
          p: [
            "You log in with a mobile number and a one-time code. You are responsible for access to your number.",
            "Show your redemption code only to the barista when you collect your coffee.",
          ],
        },
        {
          h: "Packs and validity",
          p: [
            "Every pack has a validity period (90 days for prepaid packs and 30 days for the monthly subscription; each pack page shows the exact value).",
            "Expired cups can no longer be redeemed.",
          ],
        },
        {
          h: "Redemption codes",
          p: [
            "A redemption code has 8 digits, works once and lives for 10 minutes. Creating a new code cancels the previous one.",
            "Once the cafe confirms, one cup leaves your balance.",
          ],
        },
        {
          h: "Payment and refunds",
          p: ["Online payment is not active yet. [Set the payment, refund and complaint terms before activating it.]"],
        },
        {
          h: "Liability and governing law",
          p: ["[Set the liability limits, governing law and venue before launch.]"],
        },
      ],
    },
  },
};

export const dictionaries = { fa, en };
export type Copy = typeof fa;

export function getCopy(locale: Locale): Copy {
  return dictionaries[locale];
}

/** Replaces `{key}` placeholders. Unknown keys are left as written. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

/** Persian digits for fa, unchanged for en. */
export function localizeDigits(s: string, locale: Locale): string {
  return locale === "fa" ? s.replace(/\d/g, (d) => FA_DIGITS[Number(d)]) : s;
}

/** Persian and Arabic-Indic digits to ASCII. `\d` in JS only matches ASCII, so input needs this first. */
export function toLatinDigits(s: string): string {
  return s
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

/** Lower-cases and folds Arabic letter variants so a Persian search matches either keyboard. */
export function foldText(s: string): string {
  return toLatinDigits(s).replace(/ي/g, "ی").replace(/ك/g, "ک").toLowerCase().trim();
}

export function formatNumber(value: number, locale: Locale): string {
  const s = Math.round(value).toLocaleString("en-US");
  // Persian thousands separator is ٬ (U+066C), not a Latin comma.
  return locale === "fa" ? localizeDigits(s, locale).replace(/,/g, "٬") : s;
}

export function formatToman(value: number, locale: Locale): string {
  return `${formatNumber(value, locale)} ${getCopy(locale).common.toman}`;
}

/** mm:ss from whole seconds. */
export function formatClock(seconds: number, locale: Locale): string {
  const s = Math.max(0, Math.floor(seconds));
  const pad = (n: number) => String(n).padStart(2, "0");
  return localizeDigits(`${pad(Math.floor(s / 60))}:${pad(s % 60)}`, locale);
}

/** "30 seconds" / "5 minutes" in the locale, for rate-limit messages. */
export function formatWait(seconds: number, locale: Locale): string {
  const s = Math.max(1, Math.ceil(seconds));
  const [value, unit] = s < 60 ? [s, "second"] : [Math.ceil(s / 60), "minute"];
  return new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-GB", {
    style: "unit",
    unit,
    unitDisplay: "long",
  }).format(value);
}

export function formatDate(iso: string, locale: Locale): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** A calendar day ("2026-10-22") in the locale's own calendar. `short` is the day number only. */
export function formatDay(day: string, locale: Locale, short = false): string {
  // Noon, local time: the date can never slip to the neighbouring day.
  return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-GB", short ? { day: "numeric" } : { day: "numeric", month: "long" }).format(
    new Date(`${day}T12:00:00`),
  );
}

export function formatDecimal(value: number, locale: Locale, digits = 1): string {
  const s = value.toFixed(digits);
  return locale === "fa" ? localizeDigits(s, locale).replace(".", "٫") : s;
}

/** Current year in the locale's calendar (Solar Hijri for fa). */
export function currentYear(locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR-u-ca-persian" : "en-GB", { year: "numeric" }).format(new Date());
}
