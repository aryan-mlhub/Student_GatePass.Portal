"use client";

import { useEffect, useState } from "react";

export interface SessionUser {
  uid: number;
  role: "student" | "mentor" | "hod" | "security" | "admin";
  name: string;
  identifier: string;
  department?: string | null;
  semester?: number | null;
  section?: string | null;
}

export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (alive) setUser(data.user);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [refreshKey]);

  return { user, loading, refresh: () => setRefreshKey((k) => k + 1) };
}
