"use client";

import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { api, type User } from "./api";

type Auth = {
  user: User | null;
  /** False until the first /auth/me answer, so pages can avoid a logged-out flash. */
  ready: boolean;
  reload: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);

/** One /auth/me per session for the whole tree (was one per component using the hook). */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  // Latest call wins. Sharing an in-flight request was wrong here: `await reload()` right after login
  // could resolve with an /auth/me sent before the cookie existed, and a reply landing after logout
  // put the user back. ponytail: a burst of 401s costs one /auth/me each (only when a session dies).
  const seq = useRef(0);

  const reload = useCallback(async () => {
    const n = ++seq.current;
    const me = await api<User>("/api/auth/me").catch(() => null);
    if (n !== seq.current) return; // a newer reload or a logout owns the state now
    setUser(me);
    setReady(true);
  }, []);

  useEffect(() => {
    void reload();
    // api() fires this on a 401 from anywhere; pages may fire it after login too.
    const onAuth = () => void reload();
    window.addEventListener("cups:auth", onAuth);
    return () => window.removeEventListener("cups:auth", onAuth);
  }, [reload]);

  const logout = useCallback(async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      // ponytail: on a network failure the cookie can outlive the UI state; the next /auth/me
      // would log the user back in. Surface the error to the caller if that ever matters.
    }
    seq.current++; // drop any /auth/me still in flight
    setUser(null);
    setReady(true);
  }, []);

  const value = useMemo(() => ({ user, ready, reload, logout }), [user, ready, reload, logout]);
  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): Auth {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider> (wrap the locale layout).");
  return ctx;
}
