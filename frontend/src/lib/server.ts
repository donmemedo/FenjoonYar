import { API_BASE, type Cafe, type Plan, type Stats } from "./api";

const SERVER_BASE = (
  process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || API_BASE
).replace(/\/$/, "");

/** Fetches from the API but never breaks the page: falls back to seed-shaped data. */
async function safeGet<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${SERVER_BASE}${path}`, { cache: "no-store" });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export const getPlans = () => safeGet<Plan[]>("/api/plans", []);
export const getCafes = () => safeGet<Cafe[]>("/api/cafes", []);
export const getStats = () =>
  safeGet<Stats>("/api/stats", { cafes: 12, cities: 5, members: 9400, cups_served: 128500 });
