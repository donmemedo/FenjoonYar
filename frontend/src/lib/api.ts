export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8044";

const TOKEN_KEY = "cups.token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event("cups:auth"));
}

export class ApiError extends Error {
  constructor(public code: string, public status: number) {
    super(code);
  }
}

export async function api<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = options;
  const token = auth ? getToken() : null;
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    let code = `http_${res.status}`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") code = body.detail;
    } catch {
      /* keep the default code */
    }
    if (res.status === 401) setToken(null);
    throw new ApiError(code, res.status);
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
  total_bought: number;
  expiring_soon: number;
  next_expiry: string | null;
  batches: { id: number; remaining: number; total: number; expires_at: string }[];
};

export type Order = {
  id: number;
  cups: number;
  amount: number;
  status: string;
  created_at: string;
  plan: { slug: string; fa: string; en: string };
};

export type Redemption = {
  id: number;
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
