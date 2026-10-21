/** Browser: same origin (Next rewrites /api to FastAPI). Server: the internal API URL. */
export const API_BASE =
  typeof window === "undefined"
    ? (process.env.API_INTERNAL_URL || "http://127.0.0.1:8044").replace(/\/$/, "")
    : "";

export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
    /** Seconds to wait before retrying (429), from Retry-After or the body. */
    public retryAfter?: number,
  ) {
    super(code);
    this.name = "ApiError";
  }
}

const UNSAFE = new Set(["POST", "PATCH", "PUT", "DELETE"]);

export async function api<T>(
  path: string,
  // ponytail: `auth` is accepted and ignored (the session is a cookie now) so old call sites compile.
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth: _legacy, headers: extra, ...rest } = options;
  const method = (rest.method ?? "GET").toUpperCase();
  const headers = new Headers(extra);
  // Content-Type only with a body: on a GET it is pointless and forces a preflight cross-origin.
  if (rest.body != null && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (UNSAFE.has(method)) headers.set("X-Requested-With", "cups-web");

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    method,
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!res.ok) {
    let code = `http_${res.status}`;
    let retryAfter = Number(res.headers.get("Retry-After"));
    try {
      const body = await res.json();
      if (typeof body.detail === "string") code = body.detail;
      if (!(retryAfter > 0) && typeof body.retry_after === "number") retryAfter = body.retry_after;
    } catch {
      /* keep the default code */
    }
    // /auth/me is how AuthProvider learns the session is gone; signalling there would loop.
    if (res.status === 401 && path !== "/api/auth/me" && typeof window !== "undefined") {
      window.dispatchEvent(new Event("cups:auth"));
    }
    throw new ApiError(code, res.status, retryAfter > 0 ? retryAfter : undefined);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/* ---------- shared shapes ---------- */

export type Bilingual = { fa: string; en: string };

export type User = {
  id: number;
  phone: string;
  name: string | null;
  role: "customer" | "partner" | "admin";
  cafe_id: number | null;
};

export type Plan = {
  id: number;
  slug: string;
  kind: "package" | "subscription" | "corporate";
  title: Bilingual;
  subtitle: Bilingual;
  cups: number;
  price: number;
  list_price: number;
  per_cup: number;
  saving_percent: number;
  validity_days: number;
  popular: boolean;
};

export type Cafe = {
  id: number;
  slug: string;
  name: Bilingual;
  city: Bilingual;
  area: Bilingual;
  address: Bilingual;
  lat: number;
  lng: number;
  rating: number;
  cover: string;
  tags: string[];
};

export type Wallet = {
  cups_remaining: number;
  cups_used: number;
  cups_expired: number;
  total_bought: number;
  expiring_soon: number;
  next_expiry: string | null;
  batches: { id: number; remaining: number; total: number; expires_at: string }[];
};

export type Order = {
  id: number;
  cups: number;
  amount: number;
  /** "pending" + payment_required: nothing is credited until the gateway confirms. */
  status: "paid" | "pending" | "failed";
  created_at: string;
  plan: { slug: string; fa: string; en: string };
  payment_required?: boolean;
};

export type Drink = "espresso" | "latte" | "cappuccino" | "filter" | "cold";

export type Redemption = {
  id: number;
  /** Exactly 8 digits. */
  code: string;
  drink: string;
  status: "pending" | "confirmed" | "expired" | "cancelled";
  created_at: string;
  expires_at: string;
  confirmed_at: string | null;
  cafe: { slug: string; fa: string; en: string } | null;
  qr_payload: string;
};

export type PartnerSummary = {
  cafe: { slug: string; fa: string; en: string } | null;
  today_cups: number;
  today_settle: number;
  week_cups: number;
  week_settle: number;
  unique_customers: number;
  pending_settlement: number;
  chart: { day: string; cups: number }[];
  recent: { code: string; drink: string; at: string | null; settle: number }[];
};

export type Stats = {
  cafes: number;
  cities: number;
  members: number;
  cups_served: number;
};

/** POST /auth/request-otp. `dev_code` is a string only when the server runs DEMO_MODE=1. */
export type OtpRequest = {
  sent: boolean;
  ttl_seconds: number;
  resend_after_seconds: number;
  dev_code: string | null;
};

/** POST /auth/verify-otp. `token` only appears for native clients (X-Client: native). */
export type VerifyOtp = { user: User; token?: string };

/** POST /partner/redemptions/confirm. No customer data by design. */
export type PartnerConfirm = {
  ok: boolean;
  code: string;
  drink: string;
  settle_toman: number;
  confirmed_at: string;
};
