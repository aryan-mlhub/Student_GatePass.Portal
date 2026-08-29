"use client";

import { useSession } from "@/lib/useSession";
import { Topbar } from "@/components/Topbar";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function PortalShell({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: Array<"student" | "mentor" | "hod" | "security" | "admin">;
}) {
  const { user, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!allowedRoles.includes(user.role)) {
      router.replace(`/${user.role}`);
    }
  }, [user, loading, allowedRoles, router]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center text-slate-500">
        <div className="flex items-center gap-3">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          Loading portal…
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-slate-50">
      <Topbar user={user} />
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
