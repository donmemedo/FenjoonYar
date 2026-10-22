import { API_BASE, type Cafe, type Plan, type Stats } from "./api";

/**
 * Public catalog reads for server components. Cached 60 s by Next's data cache (the API sends
 * the same max-age), so a render never waits on the backend. Never throws: the page renders
 * with an empty/zero fallback instead of failing.
 */
async function safeGet<T>(path: string, fallback: T): Promise<T> {
  try {
    // The timeout keeps a hung backend from hanging every dynamic render (undici waits minutes).
    const res = await fetch(`${API_BASE}${path}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(4000),
    });
    return res.ok ? ((await res.json()) as T) : fallback;
  } catch {
    return fallback;
  }
}

export const getPlans = () => safeGet<Plan[]>("/api/plans", []);
export const getCafes = () => safeGet<Cafe[]>("/api/cafes", []);
export const getStats = () =>
  safeGet<Stats>("/api/stats", { cafes: 0, cities: 0, members: 0, cups_served: 0 });
