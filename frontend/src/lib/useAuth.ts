"use client";

import { useCallback, useEffect, useState } from "react";

import { api, getToken, setToken, type User } from "./api";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setReady(true);
      return;
    }
    try {
      setUser(await api<User>("/api/auth/me"));
    } catch {
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    load();
    const onAuth = () => load();
    window.addEventListener("cups:auth", onAuth);
    return () => window.removeEventListener("cups:auth", onAuth);
  }, [load]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return { user, ready, reload: load, logout };
}
