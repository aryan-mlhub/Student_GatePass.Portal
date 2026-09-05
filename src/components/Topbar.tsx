"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { UserButton, useClerk } from "@clerk/nextjs";
import { RotatingLogo } from "./RotatingLogo";

export interface SessionUser {
  uid: number;
  role: "student" | "mentor" | "hod" | "security" | "admin";
  name: string;
  identifier: string;
  department?: string | null;
  semester?: number | null;
  section?: string | null;
}

const NAV_BY_ROLE: Record<SessionUser["role"], { href: string; label: string }[]> = {
  student: [
    { href: "/student", label: "Dashboard" },
    { href: "/student/new", label: "New Pass" },
    { href: "/student/history", label: "My Passes" },
  ],
  mentor: [
    { href: "/mentor", label: "Approval Queue" },
    { href: "/mentor/history", label: "History" },
  ],
  hod: [
    { href: "/hod", label: "Approval Queue" },
    { href: "/hod/history", label: "History" },
    { href: "/hod/timetable", label: "Timetable" },
  ],
  security: [
    { href: "/security", label: "Scanner" },
    { href: "/security/logs", label: "Exit Logs" },
  ],
  admin: [
    { href: "/admin", label: "Overview" },
    { href: "/admin/timetable", label: "Timetable" },
    { href: "/admin/sms", label: "Parent SMS" },
    { href: "/admin/users", label: "Staff" },
  ],
};

export function Topbar({ user }: { user: SessionUser | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const { signOut } = useClerk();
  const [now, setNow] = useState<string>("");

  useEffect(() => {
    const update = () => {
      const d = new Date();
      setNow(
        d.toLocaleString("en-IN", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
      );
    };
    update();
    const i = setInterval(update, 30000);
    return () => clearInterval(i);
  }, []);

  const items = user ? NAV_BY_ROLE[user.role] : [];
  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname?.startsWith(href));

  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      // Ignored if Clerk not in use
    }
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href={user ? `/${user.role}` : "/"} className="flex items-center">
            <RotatingLogo />
          </Link>
          {user && (
            <nav className="hidden items-center gap-1 md:flex">
              {items.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive(it.href)
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {it.label}
                </Link>
              ))}
            </nav>
          )}
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <>
              <div className="hidden text-right md:block">
                <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  {user.role}
                </div>
                <div className="text-sm font-semibold text-slate-800">
                  {user.name}
                </div>
              </div>
              <UserButton />
              <button
                className="btn btn-secondary text-xs"
                onClick={handleSignOut}
              >
                Sign out
              </button>
            </>
          )}
          {!user && (
            <Link href="/login" className="btn btn-primary">
              Sign in
            </Link>
          )}
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl items-center justify-between border-t border-slate-100 px-6 py-1.5 text-[11px] text-slate-500">
        <div>
          {user && items.length > 0 ? (
            <span className="capitalize">{user.role} portal</span>
          ) : (
            <span>Visitor view</span>
          )}
        </div>
        <div className="hidden md:block">{now}</div>
      </div>
    </header>
  );
}
