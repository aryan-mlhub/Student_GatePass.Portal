"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { RotatingLogo } from "@/components/RotatingLogo";
import { StatusBadge, FlowBadge } from "@/components/StatusBadge";

interface Pass {
  id: number;
  passId: string;
  studentName: string;
  studentUsn: string;
  department: string;
  semester: number;
  section: string;
  reason: string;
  status: "pending_mentor" | "pending_hod" | "approved" | "rejected";
  flow: "academic" | "free_period" | "emergency";
  requestTimestamp: string;
  exitTimestamp: string | null;
  parentSmsSent: boolean;
}

export default function AdminOverview() {
  return (
    <PortalShell allowedRoles={["admin"]}>
      <Inner />
    </PortalShell>
  );
}

function Inner() {
  const [all, setAll] = useState<Pass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/passes")
      .then((r) => r.json())
      .then((d) => {
        setAll(d.passes);
        setLoading(false);
      });
  }, []);

  const total = all.length;
  const approved = all.filter((p) => p.status === "approved").length;
  const pending = all.filter(
    (p) => p.status === "pending_mentor" || p.status === "pending_hod",
  ).length;
  const rejected = all.filter((p) => p.status === "rejected").length;
  const exited = all.filter((p) => p.exitTimestamp).length;
  const smsSent = all.filter((p) => p.parentSmsSent).length;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="section-title">Admin overview</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            System pulse
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            A live snapshot of every pass flowing through the SBJITMR engine.
          </p>
        </div>
        <div className="card flex items-center gap-3 px-4 py-2 text-sm">
          <span className="relative inline-flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="font-semibold text-slate-700">All systems normal</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI label="Total requests" value={total} />
        <KPI label="Approved" value={approved} tone="emerald" />
        <KPI label="Pending" value={pending} tone="amber" />
        <KPI label="Rejected" value={rejected} tone="rose" />
        <KPI label="Exited" value={exited} tone="indigo" />
        <KPI label="Parent SMS sent" value={smsSent} tone="emerald" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="section-title">Recent activity</div>
            <Link
              href="/admin/sms"
              className="text-sm font-semibold text-indigo-700 hover:underline"
            >
              View SMS log →
            </Link>
          </div>
          {loading ? (
            <div className="mt-4 h-32 animate-pulse rounded-xl bg-slate-100" />
          ) : all.length === 0 ? (
            <div className="mt-4 text-sm text-slate-500">No activity yet.</div>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {all.slice(0, 8).map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center gap-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-mono text-xs text-slate-500">
                        {p.passId}
                      </div>
                      <StatusBadge status={p.status} />
                      <FlowBadge flow={p.flow} />
                    </div>
                    <div className="mt-0.5 text-sm font-semibold text-slate-900">
                      {p.studentName} ({p.studentUsn})
                    </div>
                    <div className="line-clamp-1 text-xs text-slate-500">
                      {p.reason}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(p.requestTimestamp).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card p-6">
          <div className="section-title">Quick actions</div>
          <div className="mt-3 space-y-2">
            <Link
              href="/admin/timetable"
              className="block rounded-xl border border-slate-200 p-3 hover:border-emerald-300 hover:bg-emerald-50/50"
            >
              <div className="text-sm font-semibold text-slate-900">
                Manage timetables
              </div>
              <div className="text-xs text-slate-500">
                Add, edit or remove slots across all departments.
              </div>
            </Link>
            <Link
              href="/admin/sms"
              className="block rounded-xl border border-slate-200 p-3 hover:border-indigo-300 hover:bg-indigo-50/50"
            >
              <div className="text-sm font-semibold text-slate-900">
                Parent SMS log
              </div>
              <div className="text-xs text-slate-500">
                Audit every SMS dispatched on approval.
              </div>
            </Link>
            <Link
              href="/admin/users"
              className="block rounded-xl border border-slate-200 p-3 hover:border-amber-300 hover:bg-amber-50/50"
            >
              <div className="text-sm font-semibold text-slate-900">
                Staff accounts
              </div>
              <div className="text-xs text-slate-500">
                Mentor, HOD and security guard directory.
              </div>
            </Link>
          </div>
        </div>
      </div>

      <div className="card flex items-center gap-4 p-5">
        <RotatingLogo size="sm" showLabel={false} />
        <div>
          <div className="text-sm font-semibold text-slate-900">
            SBJITMR Gate Pass Engine
          </div>
          <div className="text-xs text-slate-500">
            v1.0 · S.B. Jain Institute of Technology, Management &amp; Research
          </div>
        </div>
      </div>
    </div>
  );
}

function KPI({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number;
  tone?: "slate" | "emerald" | "amber" | "rose" | "indigo";
}) {
  const colorMap = {
    slate: "text-slate-900",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    rose: "text-rose-700",
    indigo: "text-indigo-700",
  } as const;
  return (
    <div className="card p-5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className={`mt-2 text-3xl font-bold ${colorMap[tone]}`}>{value}</div>
    </div>
  );
}
