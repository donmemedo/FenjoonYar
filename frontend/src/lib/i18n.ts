export const locales = ["fa", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fa";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

const fa = {
  dir: "rtl",
  brand: "کاپ‌یار",
  brandSub: "شبکه کافه‌های مستقل",
  nav: {
    plans: "بسته‌ها",
    cafes: "کافه‌ها",
    how: "چطور کار می‌کند",
    partner: "پنل کافه",
    app: "حساب کاربری",
    login: "ورود",
    logout: "خروج",
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
    theme: "روشن / تاریک",
    language: "زبان",
  },
  hero: {
    badge: "پیش‌فروش قهوه، بدون مرز کافه",
    title1: "یک اشتراک،",
    title2: "همه کافه‌های مستقل",
    desc: "بسته فنجان بخرید، در هر کافه عضو کاپ‌یار کد مصرف بسازید و قهوه‌تان را بگیرید. بدون پرداخت جداگانه، بدون کارت وفاداری کاغذی.",
    ctaPrimary: "خرید بسته",
    ctaSecondary: "کافه‌های نزدیک",
    note: "اعتبار هر بسته ۹۰ روز است.",
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
    bought: "بسته به حساب شما اضافه شد",
  },
  cafes: {
    title: "کافه‌های عضو",
    sub: "کافه‌های مستقلی که کد مصرف کاپ‌یار را می‌پذیرند.",
    searchPlaceholder: "نام کافه یا محله را بنویسید",
    city: "شهر",
    tag: "حال‌وهوا",
    rating: "امتیاز",
    empty: "کافه‌ای با این جستجو پیدا نشد.",
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
    send: "دریافت کد تایید",
    code: "کد تایید",
    codeSent: "کد تایید برای شماره {phone} فرستاده شد.",
    devCode: "کد نمایشی:",
    verify: "ورود به حساب کاربری",
    changePhone: "تغییر شماره",
    invalidPhone: "شماره را درست بنویسید؛ با ۰۹ شروع می‌شود و ۱۱ رقم است.",
    invalidCode: "کد نادرست است یا منقضی شده.",
    partnerHint: "ورود کافه‌ها: شماره نمایشی ۰۹۱۲۰۰۰۰۰۰۰",
  },
  app: {
    title: "حساب کاربری",
    hello: "سلام",
    wallet: "کیف پول فنجان",
    remaining: "فنجان باقی‌مانده",
    used: "مصرف‌شده",
    expiring: "نزدیک به انقضا",
    nextExpiry: "انقضای بعدی",
    newCode: "ساخت کد مصرف",
    codeTitle: "کد مصرف شما",
    codeHelp: "این کد را به باریستا نشان دهید. تا ۱۰ دقیقه معتبر است.",
    noCups: "اعتبار فنجان ندارید. اول یک بسته بخرید.",
    buyMore: "خرید بسته",
    orders: "سفارش‌ها",
    history: "تاریخچه مصرف",
    status: {
      pending: "در انتظار تایید کافه",
      confirmed: "تحویل شده",
      expired: "منقضی شد",
      cancelled: "لغو شده",
      paid: "پرداخت شده",
    },
    at: "در",
    anyCafe: "هر کافه عضو",
    drink: "نوشیدنی",
    drinks: { espresso: "اسپرسو", latte: "لاته", cappuccino: "کاپوچینو", filter: "قهوه دمی", cold: "آیس‌کافی" },
  },
  partner: {
    title: "پیش‌خوان کافه",
    sub: "کد مصرف مشتری را اینجا تایید کنید.",
    codeLabel: "کد مصرف مشتری",
    confirm: "تایید و ثبت فنجان",
    todayCups: "فنجان امروز",
    todaySettle: "تسویه امروز",
    weekCups: "فنجان هفت روز",
    unique: "مشتری یکتا",
    pending: "در انتظار تسویه",
    chart: "روند هفت روز گذشته",
    recent: "آخرین تاییدها",
    success: "ثبت شد. یک فنجان از اعتبار مشتری کم شد.",
    notPartner: "این حساب کاربری به کافه‌ای وصل نیست.",
    errors: {
      code_not_found: "چنین کدی پیدا نشد.",
      already_used: "این کد قبلاً استفاده شده.",
      code_expired: "اعتبار این کد تمام شده.",
      no_cups_left: "مشتری فنجان باقی‌مانده ندارد.",
    },
  },
  cta: {
    title: "کافه دارید؟",
    desc: "با عضویت در شبکه کاپ‌یار، مشتری تکراری، داده رفتاری و تسویه شفاف هفتگی می‌گیرید.",
    action: "درخواست عضویت کافه",
  },
  faq: {
    title: "سوال‌های پرتکرار",
    items: [
      { q: "اعتبار بسته چقدر است؟", a: "بسته‌های پیش‌پرداخت ۹۰ روز و اشتراک‌های ماهانه ۳۰ روز اعتبار دارند. پیش از انقضا برایتان پیامک و اعلان می‌فرستیم." },
      { q: "در هر کافه‌ای می‌توانم استفاده کنم؟", a: "در همه کافه‌های عضو شبکه. فهرست کافه‌ها همیشه در صفحه کافه‌ها به‌روز است." },
      { q: "نوشیدنی گران‌تر از سقف بسته چه می‌شود؟", a: "مابه‌التفاوت را مستقیم به کافه می‌پردازید؛ یک فنجان از اعتبار شما کم می‌شود." },
      { q: "کافه‌ها چطور تسویه می‌شوند؟", a: "به‌ازای هر فنجان تاییدشده، تسویه هفتگی از طریق پیش‌خوان کافه انجام می‌شود." },
    ],
  },
  footer: {
    rights: "همه حقوق محفوظ است.",
    made: "ساخته‌شده برای کافه‌های مستقل ایران",
    privacy: "حریم خصوصی",
    terms: "شرایط استفاده",
  },
};

const en: typeof fa = {
  dir: "ltr",
  brand: "CUPS",
  brandSub: "independent cafe network",
  nav: {
    plans: "Plans",
    cafes: "Cafes",
    how: "How it works",
    partner: "Cafe panel",
    app: "My account",
    login: "Log in",
    logout: "Log out",
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
    theme: "Light / dark",
    language: "Language",
  },
  hero: {
    badge: "Prepaid coffee, across every cafe",
    title1: "One subscription,",
    title2: "every independent cafe",
    desc: "Buy a pack of cups, generate a one-time code at any member cafe and pick up your coffee. No separate payment, no paper loyalty card.",
    ctaPrimary: "Buy a pack",
    ctaSecondary: "Cafes near you",
    note: "Every pack stays valid for 90 days.",
  },
  stats: { cafes: "member cafes", cities: "cities", members: "members", cups: "cups served" },
  how: {
    title: "Three steps to your next cup",
    sub: "No checkout queue, no cash, no heavy app.",
    steps: [
      { t: "Buy your pack", d: "5, 10 or 20 cups, or a monthly subscription. You pay once." },
      { t: "Generate a code", d: "At the cafe, create a one-time code or QR from your account. It lives for 10 minutes." },
      { t: "Pick up your coffee", d: "The cafe confirms the code in its panel and one cup leaves your balance." },
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
    bought: "The pack was added to your account",
  },
  cafes: {
    title: "Member cafes",
    sub: "Independent cafes that accept CUPS redemption codes.",
    searchPlaceholder: "Cafe name or neighbourhood",
    city: "City",
    tag: "Vibe",
    rating: "Rating",
    empty: "No cafe matches this search.",
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
    code: "Verification code",
    codeSent: "We sent a code to {phone}.",
    devCode: "Demo code:",
    verify: "Enter my account",
    changePhone: "Change number",
    invalidPhone: "Please write a valid number: 11 digits starting with 09.",
    invalidCode: "That code is wrong or expired.",
    partnerHint: "Cafe demo login: 09120000000",
  },
  app: {
    title: "My account",
    hello: "Hi",
    wallet: "Cup wallet",
    remaining: "cups left",
    used: "used",
    expiring: "expiring soon",
    nextExpiry: "Next expiry",
    newCode: "Create redemption code",
    codeTitle: "Your redemption code",
    codeHelp: "Show this to the barista. Valid for 10 minutes.",
    noCups: "You have no cups left. Buy a pack first.",
    buyMore: "Buy a pack",
    orders: "Orders",
    history: "Redemption history",
    status: {
      pending: "Waiting for the cafe",
      confirmed: "Delivered",
      expired: "Expired",
      cancelled: "Cancelled",
      paid: "Paid",
    },
    at: "at",
    anyCafe: "Any member cafe",
    drink: "Drink",
    drinks: { espresso: "Espresso", latte: "Latte", cappuccino: "Cappuccino", filter: "Filter", cold: "Iced coffee" },
  },
  partner: {
    title: "Cafe panel",
    sub: "Confirm a customer redemption code here.",
    codeLabel: "Customer code",
    confirm: "Confirm the cup",
    todayCups: "cups today",
    todaySettle: "settlement today",
    weekCups: "cups this week",
    unique: "unique customers",
    pending: "pending settlement",
    chart: "Last seven days",
    recent: "Recent confirmations",
    success: "Done. One cup was taken from the customer balance.",
    notPartner: "This account is not linked to a cafe.",
    errors: {
      code_not_found: "No such code.",
      already_used: "This code was already used.",
      code_expired: "This code has expired.",
      no_cups_left: "The customer has no cups left.",
    },
  },
  cta: {
    title: "Run a cafe?",
    desc: "Join the CUPS network for repeat customers, behavioural data and transparent weekly settlement.",
    action: "Apply as a cafe",
  },
  faq: {
    title: "Frequent questions",
    items: [
      { q: "How long is a pack valid?", a: "Prepaid packs last 90 days, monthly subscriptions 30 days. We notify you before anything expires." },
      { q: "Can I use it at any cafe?", a: "At every cafe in the network. The cafes page is always up to date." },
      { q: "What if the drink costs more than the cup value?", a: "You pay the difference directly to the cafe, and one cup leaves your balance." },
      { q: "How are cafes settled?", a: "Every confirmed cup is settled weekly through the cafe panel." },
    ],
  },
  footer: {
    rights: "All rights reserved.",
    made: "Built for Iran's independent cafes",
    privacy: "Privacy",
    terms: "Terms of service",
  },
};

export const dictionaries = { fa, en };
export type Copy = typeof fa;

export function getCopy(locale: Locale): Copy {
  return dictionaries[locale];
}

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function formatNumber(value: number, locale: Locale): string {
  const s = Math.round(value).toLocaleString("en-US");
  return locale === "fa" ? s.replace(/\d/g, (d) => FA_DIGITS[Number(d)]) : s;
}

export function formatToman(value: number, locale: Locale): string {
  return `${formatNumber(value, locale)} ${getCopy(locale).common.toman}`;
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

export function formatDecimal(value: number, locale: Locale, digits = 1): string {
  const s = value.toFixed(digits);
  return locale === "fa"
    ? s.replace(/\d/g, (d) => FA_DIGITS[Number(d)]).replace(".", "٫")
    : s;
}
