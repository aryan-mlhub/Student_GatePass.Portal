"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { StatusBadge, FlowBadge } from "@/components/StatusBadge";
import { useSession } from "@/lib/useSession";

interface Pass {
  id: number;
  passId: string;
  studentName: string;
  studentUsn: string;
  reason: string;
  status: "pending_mentor" | "pending_hod" | "approved" | "rejected";
  flow: "academic" | "free_period" | "emergency";
  currentSubject: string | null;
  currentSubjectCode: string | null;
  currentFaculty: string | null;
  slotStart: string | null;
  slotEnd: string | null;
  requestTimestamp: string;
  mentorName?: string | null;
  hodName?: string | null;
  exitTimestamp?: string | null;
}

interface Preview {
  day: string;
  time: string;
  slot: {
    startTime: string;
    endTime: string;
    subjectName: string;
    subjectCode: string;
    facultyName: string;
    isBreak: boolean;
  } | null;
  flow: "academic" | "free_period" | "emergency";
  summary: string;
  requiresMentor: boolean;
  requiresHod: boolean;
}

export default function StudentDashboard() {
  return (
    <PortalShell allowedRoles={["student"]}>
      <DashboardInner />
    </PortalShell>
  );
}

function DashboardInner() {
  const { user } = useSession();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [passes, setPasses] = useState<Pass[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const [prevRes, passRes] = await Promise.all([
      fetch("/api/gatepass/preview", { method: "POST" }),
      fetch("/api/gatepass?scope=mine"),
    ]);
    if (prevRes.ok) setPreview(await prevRes.json());
    if (passRes.ok) {
      const data = await passRes.json();
      setPasses(data.passes);
    }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 20000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recent = passes.slice(0, 4);

  return (
    <div className="space-y-8 fade-in">
      {/* Welcome */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="section-title">Student dashboard</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Hi, {user?.name?.split(" ")[0] || "Student"} 👋
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {user?.identifier} · {user?.department} · Semester {user?.semester} · Section {user?.section}
          </p>
        </div>
        <Link href="/student/new" className="btn btn-primary">
          + Request a gate pass
        </Link>
      </div>

      {/* Live status card */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="section-title">Live timetable status</div>
            {preview && (
              <FlowBadge flow={preview.flow} />
            )}
          </div>
          {loading ? (
            <div className="mt-4 h-20 animate-pulse rounded-xl bg-slate-100" />
          ) : preview?.slot ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Current slot
                </div>
                <div className="mt-1 text-2xl font-bold text-slate-900">
                  {preview.slot.startTime} – {preview.slot.endTime}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {preview.day.charAt(0).toUpperCase() + preview.day.slice(1)},{" "}
                  {preview.time}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {preview.slot.isBreak ? "Break" : "Subject"}
                </div>
                <div className="mt-1 text-xl font-bold text-slate-900">
                  {preview.slot.subjectName}
                </div>
                <div className="mt-0.5 text-sm text-slate-600">
                  {preview.slot.subjectCode} · {preview.slot.facultyName}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-center text-slate-500">
              No class scheduled for this slot — looks like a free period.
            </div>
          )}
          {preview && (
            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-500">Approval will require:</span>
              {preview.requiresMentor && (
                <span className="badge badge-amber">Mentor</span>
              )}
              {preview.requiresHod && (
                <span className="badge badge-indigo">HOD</span>
              )}
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="section-title">Quick stats</div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Stat label="Total" value={passes.length} />
            <Stat
              label="Approved"
              value={passes.filter((p) => p.status === "approved").length}
              tone="emerald"
            />
            <Stat
              label="Pending"
              value={
                passes.filter(
                  (p) => p.status === "pending_mentor" || p.status === "pending_hod",
                ).length
              }
              tone="amber"
            />
            <Stat
              label="Rejected"
              value={passes.filter((p) => p.status === "rejected").length}
              tone="rose"
            />
          </div>
          <Link
            href="/student/history"
            className="mt-5 block text-center text-sm font-semibold text-indigo-700 hover:underline"
          >
            View all passes →
          </Link>
        </div>
      </div>

      {/* Recent passes */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Recent passes</h2>
          <Link
            href="/student/history"
            className="text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            View all
          </Link>
        </div>
        {loading ? (
          <div className="card animate-pulse p-6 text-slate-400">Loading…</div>
        ) : recent.length === 0 ? (
          <div className="card p-8 text-center text-slate-500">
            <div className="text-base font-semibold text-slate-900">
              No passes yet
            </div>
            <p className="mt-1 text-sm">
              Tap "Request a gate pass" to get started.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {recent.map((p) => (
              <PassCard key={p.id} pass={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number;
  tone?: "slate" | "emerald" | "amber" | "rose";
}) {
  const colorMap = {
    slate: "text-slate-900",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    rose: "text-rose-700",
  } as const;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-bold ${colorMap[tone]}`}>
        {value}
      </div>
    </div>
  );
}

function PassCard({ pass }: { pass: Pass }) {
  const d = new Date(pass.requestTimestamp);
  return (
    <div className="card card-hover p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="font-mono text-xs font-semibold text-slate-500">
          {pass.passId}
        </div>
        <StatusBadge status={pass.status} />
      </div>
      <div className="mt-3 text-sm text-slate-700">
        <span className="font-semibold text-slate-900">Reason:</span>{" "}
        {pass.reason}
      </div>
      <div className="mt-2 text-xs text-slate-500">
        {d.toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })}
        {pass.slotStart && pass.slotEnd && (
          <> · {pass.slotStart}–{pass.slotEnd}</>
        )}
      </div>
      {pass.currentSubject && (
        <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Was supposed to be in <span className="font-semibold">{pass.currentSubject}</span> ({pass.currentSubjectCode})
        </div>
      )}
      <div className="mt-3 flex items-center justify-between">
        <FlowBadge flow={pass.flow} />
        <Link
          href={`/student/pass/${pass.passId}`}
          className="text-sm font-semibold text-indigo-700 hover:underline"
        >
          View →
        </Link>
      </div>
    </div>
  );
}
