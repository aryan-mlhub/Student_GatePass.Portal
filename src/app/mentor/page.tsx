"use client";

import { useEffect, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { useSession } from "@/lib/useSession";
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
  currentSubject: string | null;
  currentSubjectCode: string | null;
  currentFaculty: string | null;
  slotStart: string | null;
  slotEnd: string | null;
  requestTimestamp: string;
}

export default function MentorDashboard() {
  return (
    <PortalShell allowedRoles={["mentor", "admin", "hod"]}>
      <Inner />
    </PortalShell>
  );
}

function Inner() {
  const { user } = useSession();
  const [pending, setPending] = useState<Pass[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [showAllDept, setShowAllDept] = useState(true);

  async function refresh() {
    const url = showAllDept
      ? "/api/gatepass?scope=mentor&all=true"
      : "/api/gatepass?scope=mentor";
    const r = await fetch(url);
    if (r.ok) {
      const data = await r.json();
      setPending(data.passes || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [showAllDept]);

  async function decide(pass: Pass, action: "approve_mentor" | "reject") {
    setActing(pass.id);
    try {
      const r = await fetch(`/api/gatepass/${pass.passId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          comment: comments[pass.passId] || null,
        }),
      });
      if (!r.ok) {
        const d = await r.json();
        alert(d.error || "Failed");
      }
      await refresh();
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="section-title">Mentor panel</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Pending approvals
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {user?.role === "mentor" ? (
              <>
                Showing requests from <span className="font-semibold">{user.department}</span> · Sem {user.semester} · Sec {user.section}
              </>
            ) : (
              "Showing all pending mentor approvals"
            )}
          </p>
        </div>
        <div className="card flex items-center gap-3 px-4 py-2 text-sm">
          <span className="relative inline-flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="font-semibold text-slate-700">Live · refreshes every 15s</span>
        </div>
      </div>

      {loading ? (
        <div className="card animate-pulse p-6 text-slate-400">Loading…</div>
      ) : pending.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-3xl">🎉</div>
          <div className="mt-2 text-base font-semibold text-slate-900">
            Inbox zero
          </div>
          <p className="mt-1 text-sm text-slate-500">
            There are no pass requests awaiting your approval right now.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {pending.map((p) => (
            <div key={p.id} className="card p-5">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-mono text-xs text-slate-500">
                      {p.passId}
                    </div>
                    <StatusBadge status={p.status} />
                    <FlowBadge flow={p.flow} />
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-indigo-500 text-sm font-bold text-white">
                      {p.studentName
                        .split(" ")
                        .map((s) => s[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">
                        {p.studentName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {p.studentUsn} · {p.department} · Sem {p.semester} · Sec {p.section}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Reason
                    </div>
                    <div className="mt-0.5">{p.reason}</div>
                  </div>
                  {p.currentSubject && (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      <div className="text-[11px] font-semibold uppercase tracking-wider">
                        Timetable status
                      </div>
                      <div className="mt-0.5">
                        Was supposed to be in{" "}
                        <span className="font-semibold">
                          {p.currentSubject} ({p.currentSubjectCode})
                        </span>
                        {p.slotStart && p.slotEnd && (
                          <> · {p.slotStart}–{p.slotEnd}</>
                        )}
                      </div>
                      {p.currentFaculty && (
                        <div className="text-xs">Faculty: {p.currentFaculty}</div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 text-xs text-slate-500">
                  <div>
                    {new Date(p.requestTimestamp).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                <input
                  className="input"
                  placeholder="Add a comment (optional)"
                  value={comments[p.passId] || ""}
                  onChange={(e) =>
                    setComments({ ...comments, [p.passId]: e.target.value })
                  }
                />
                <button
                  className="btn btn-danger"
                  disabled={acting === p.id}
                  onClick={() => decide(p, "reject")}
                >
                  Reject
                </button>
                <button
                  className="btn btn-success"
                  disabled={acting === p.id}
                  onClick={() => decide(p, "approve_mentor")}
                >
                  Approve & forward to HOD
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
