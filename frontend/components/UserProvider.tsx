"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type CurrentUser = { username: string; role: string };

const UserContext = createContext<CurrentUser | null>(null);

/**
 * Shared across every product: resolves the logged-in user once per tab and
 * guards the route, so product pages never fetch /api/auth/me themselves.
 */
export function UserProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        router.push("/login");
        return;
      }
      const me = await res.json();
      setUser({ username: me.username, role: me.role });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) {
    return <div className="flex h-screen items-center justify-center text-sm opacity-60">Loading...</div>;
  }

  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within a UserProvider");
  return ctx;
}
