"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PortalShell } from "@/components/PortalShell";
import { StatusBadge, FlowBadge } from "@/components/StatusBadge";

interface PassDetail {
  pass: {
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
    mentorName: string | null;
    mentorActionAt: string | null;
    mentorComment: string | null;
    hodName: string | null;
    hodActionAt: string | null;
    hodComment: string | null;
    qrPayload: string | null;
    qrExpiresAt: string | null;
    exitTimestamp: string | null;
    parentSmsSent: boolean;
    parentSmsBody: string | null;
  };
  qrSvg: string | null;
}

export default function PassDetailPage() {
  return (
    <PortalShell allowedRoles={["student"]}>
      <Inner />
    </PortalShell>
  );
}

function Inner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<PassDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch(`/api/gatepass/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (alive) {
          setData(d);
          setLoading(false);
        }
      });
    const t = setInterval(async () => {
      const r = await fetch(`/api/gatepass/${params.id}`);
      if (alive && r.ok) setData(await r.json());
    }, 15000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [params.id]);

  if (loading || !data) {
    return (
      <div className="card animate-pulse p-8 text-slate-400">Loading…</div>
    );
  }
  const p = data.pass;
  return (
    <div className="space-y-6 fade-in">
      <div>
        <button
          className="text-sm font-semibold text-slate-600 hover:text-slate-900"
          onClick={() => router.back()}
        >
          ← Back
        </button>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="font-mono text-sm text-slate-500">{p.passId}</div>
          <StatusBadge status={p.status} />
          <FlowBadge flow={p.flow} />
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          Gate pass details
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Requested on{" "}
          {new Date(p.requestTimestamp).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })}
        </p>

        {/* Dynamic routing helper banner */}
        {p.status === "pending_mentor" && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-amber-950">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              Stage 1 of 2: Awaiting Mentor Approval
            </div>
            <p className="mt-1 text-xs text-amber-800 leading-relaxed">
              This request is currently in the <strong>Mentor</strong> queue for {p.department} (Sem {p.semester}-{p.section}).
              To review or approve, sign in as mentor: <code className="bg-white/80 border border-amber-200 px-1.5 py-0.5 rounded font-mono font-bold text-amber-900">mentor_cse_5_a</code> (Password: <code className="font-mono">mentor123</code>).
            </p>
          </div>
        )}

        {p.status === "pending_hod" && (
          <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/80 p-4 text-indigo-950">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-800">
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
              Final Stage: Awaiting HOD Final Approval
            </div>
            <p className="mt-1 text-xs text-indigo-800 leading-relaxed">
              This request is currently in the <strong>HOD</strong> queue for {p.department}.
              To review or give final signoff, sign in as HOD: <code className="bg-white/80 border border-indigo-200 px-1.5 py-0.5 rounded font-mono font-bold text-indigo-900">hod_cse</code> (Password: <code className="font-mono">hod123</code>) or <code className="font-mono">admin</code>.
            </p>
          </div>
        )}

        {p.status === "approved" && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-950">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
              ✓ Approved & Active
            </div>
            <p className="mt-1 text-xs text-emerald-800 leading-relaxed">
              Your gate pass has been approved by HOD. Show the signed QR code to the Security Guard at the gate.
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <div className="section-title">Request</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Info label="Student" value={`${p.studentName} (${p.studentUsn})`} />
            <Info
              label="Class"
              value={`${p.department} · Sem ${p.semester} · Sec ${p.section}`}
            />
            <Info label="Reason" value={p.reason} full />
          </div>

          {p.currentSubject && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="text-[11px] font-semibold uppercase tracking-wider">
                Timetable context
              </div>
              <div className="mt-1 font-semibold">
                Was supposed to be in {p.currentSubject} ({p.currentSubjectCode})
                {p.slotStart && p.slotEnd && ` from ${p.slotStart} to ${p.slotEnd}`}
              </div>
              {p.currentFaculty && (
                <div className="text-xs">Faculty: {p.currentFaculty}</div>
              )}
            </div>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Timeline
              label="Mentor"
              active={p.status === "pending_mentor"}
              done={!!p.mentorActionAt}
              rejected={p.status === "rejected" && !p.hodActionAt}
              actor={p.mentorName}
              at={p.mentorActionAt}
              comment={p.mentorComment}
              skipped={
                p.status === "pending_hod" || p.status === "approved"
                  ? !p.mentorActionAt
                  : false
              }
            />
            <Timeline
              label="HOD"
              active={p.status === "pending_hod"}
              done={!!p.hodActionAt}
              rejected={p.status === "rejected" && !!p.hodActionAt}
              actor={p.hodName}
              at={p.hodActionAt}
              comment={p.hodComment}
            />
          </div>

          {p.parentSmsBody && (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <div className="text-[11px] font-semibold uppercase tracking-wider">
                Parent SMS sent
              </div>
              <div className="mt-1 text-xs text-emerald-700">
                {p.parentSmsSent ? "✓ Delivered (simulated)" : "Queued"}
              </div>
              <div className="mt-2 leading-relaxed">{p.parentSmsBody}</div>
            </div>
          )}

          {p.exitTimestamp && (
            <div className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
              <div className="text-[11px] font-semibold uppercase tracking-wider">
                Exit logged
              </div>
              <div className="mt-1">
                Student exited at{" "}
                {new Date(p.exitTimestamp).toLocaleString("en-IN")}
              </div>
            </div>
          )}
        </div>

        <div>
          {p.status === "approved" && data.qrSvg ? (
            <div className="card overflow-hidden">
              <div className="border-b border-slate-200 bg-gradient-to-br from-emerald-50 to-indigo-50 p-4 text-center">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                  Approved · show at gate
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Valid until{" "}
                  {p.qrExpiresAt
                    ? new Date(p.qrExpiresAt).toLocaleString("en-IN")
                    : "—"}
                </div>
              </div>
              <div className="p-4">
                <div
                  className="mx-auto w-fit rounded-xl border border-slate-200 bg-white p-3"
                  dangerouslySetInnerHTML={{ __html: data.qrSvg }}
                />
                <div className="mt-3 text-center font-mono text-xs text-slate-500">
                  {p.passId}
                </div>
              </div>
            </div>
          ) : p.status === "rejected" ? (
            <div className="card p-6 text-center text-rose-700">
              <div className="text-2xl">✕</div>
              <div className="mt-2 text-base font-semibold">Pass rejected</div>
              <div className="mt-1 text-xs text-slate-500">
                Please contact your mentor or HOD.
              </div>
            </div>
          ) : (
            <div className="card p-6 text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-500" />
              <div className="mt-3 text-sm font-semibold text-slate-900">
                Awaiting approval
              </div>
              <div className="mt-1 text-xs text-slate-500">
                This page auto-refreshes every 15 seconds.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm text-slate-900">{value}</div>
    </div>
  );
}

function Timeline({
  label,
  active,
  done,
  rejected,
  actor,
  at,
  comment,
  skipped,
}: {
  label: string;
  active: boolean;
  done: boolean;
  rejected: boolean;
  actor: string | null;
  at: string | null;
  comment: string | null;
  skipped?: boolean;
}) {
  let stateColor = "border-slate-200 bg-slate-50 text-slate-500";
  let stateLabel = "Pending";
  if (rejected) {
    stateColor = "border-rose-200 bg-rose-50 text-rose-700";
    stateLabel = "Rejected";
  } else if (done) {
    stateColor = "border-emerald-200 bg-emerald-50 text-emerald-700";
    stateLabel = "Approved";
  } else if (skipped) {
    stateColor = "border-slate-200 bg-slate-50 text-slate-500";
    stateLabel = "Skipped";
  } else if (active) {
    stateColor = "border-amber-200 bg-amber-50 text-amber-700";
    stateLabel = "Awaiting";
  }
  return (
    <div className={`rounded-xl border p-4 ${stateColor}`}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-[10px] font-bold uppercase tracking-wider">
          {stateLabel}
        </div>
      </div>
      {actor && (
        <div className="mt-2 text-xs">
          <span className="font-semibold">{actor}</span>{" "}
          {at && (
            <span className="text-slate-500">
              · {new Date(at).toLocaleString("en-IN")}
            </span>
          )}
        </div>
      )}
      {comment && (
        <div className="mt-2 text-xs italic text-slate-600">“{comment}”</div>
      )}
      {skipped && (
        <div className="mt-2 text-xs text-slate-500">
          Skipped — request was raised during a free period.
        </div>
      )}
    </div>
  );
}
