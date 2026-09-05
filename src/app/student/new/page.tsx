"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PortalShell } from "@/components/PortalShell";
import { useSession } from "@/lib/useSession";
import { FlowBadge } from "@/components/StatusBadge";

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

export default function NewPassPage() {
  return (
    <PortalShell allowedRoles={["student"]}>
      <Inner />
    </PortalShell>
  );
}

function Inner() {
  const router = useRouter();
  const { user } = useSession();
  const [reason, setReason] = useState("");
  const [targetRoute, setTargetRoute] = useState<"auto" | "mentor" | "hod">("auto");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/gatepass/preview", { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (alive) {
          setPreview(d);
          setLoading(false);
        }
      });
    const t = setInterval(async () => {
      const r = await fetch("/api/gatepass/preview", { method: "POST" });
      if (alive && r.ok) setPreview(await r.json());
    }, 15000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  async function submit() {
    if (!preview) return;
    if (reason.trim().length < 5) {
      setError("Please describe the reason in at least 5 characters.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/gatepass", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason, targetRoute }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed to create pass");
      router.push(`/student/pass/${data.pass.passId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create pass");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 fade-in">
      <div>
        <div className="section-title">New gate pass</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          Request a gate pass
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          We automatically check your timetable and pick the right approver.
        </p>
      </div>

      {/* Live conflict check */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div className="section-title">Live conflict check</div>
          {preview && <FlowBadge flow={preview.flow} />}
        </div>
        {loading ? (
          <div className="mt-4 h-16 animate-pulse rounded-xl bg-slate-100" />
        ) : !preview ? (
          <div className="mt-4 text-sm text-slate-500">Checking timetable…</div>
        ) : preview.slot ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Current slot
              </div>
              <div className="mt-1 text-xl font-bold text-slate-900">
                {preview.slot.startTime} – {preview.slot.endTime}
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                {preview.day.charAt(0).toUpperCase() + preview.day.slice(1)} · {preview.time}
              </div>
            </div>
            <div
              className={`rounded-xl border p-4 ${
                preview.slot.isBreak
                  ? "border-slate-200 bg-slate-50"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {preview.slot.isBreak ? "Break" : "Class now"}
              </div>
              <div className="mt-1 text-base font-bold text-slate-900">
                {preview.slot.subjectName}
              </div>
              <div className="text-xs text-slate-600">
                {preview.slot.subjectCode} · {preview.slot.facultyName}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
            No class is scheduled at this time. You are in a free period.
          </div>
        )}

        {preview && (
          <div className="mt-5 rounded-xl bg-slate-900 p-4 text-slate-100">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Smart routing destination
            </div>
            <div className="mt-1 text-sm">
              {targetRoute === "mentor"
                ? "Academic leave: will route directly to Mentor (Prof. Fifth A Mentor) first, then forward to HOD."
                : targetRoute === "hod"
                  ? "Free-period / Fast-track: will route directly to HOD (Dr. CSE HOD) for instant signoff."
                  : preview.summary}
            </div>
          </div>
        )}
      </div>

      {/* Route Target Selector */}
      <div className="card p-6">
        <div className="section-title">Approval destination</div>
        <h2 className="mt-1 text-base font-bold text-slate-900">
          Where should this pass be sent?
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setTargetRoute("auto")}
            className={`p-3.5 rounded-xl border text-left transition ${
              targetRoute === "auto"
                ? "border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20"
                : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
            }`}
          >
            <div className="text-xs font-bold text-slate-900">🎯 Timetable Auto</div>
            <div className="text-[11px] text-slate-500 mt-1">
              Checks live timetable to decide Mentor vs HOD
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTargetRoute("mentor")}
            className={`p-3.5 rounded-xl border text-left transition ${
              targetRoute === "mentor"
                ? "border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20"
                : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
            }`}
          >
            <div className="text-xs font-bold text-amber-900">👨‍🏫 Send to Mentor</div>
            <div className="text-[11px] text-slate-500 mt-1">
              For leaving ongoing class (Mentor $\rightarrow$ HOD)
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTargetRoute("hod")}
            className={`p-3.5 rounded-xl border text-left transition ${
              targetRoute === "hod"
                ? "border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/20"
                : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
            }`}
          >
            <div className="text-xs font-bold text-indigo-900">🏛️ Send to HOD</div>
            <div className="text-[11px] text-slate-500 mt-1">
              Direct HOD approval (Free period / Fast track)
            </div>
          </button>
        </div>
      </div>

      {/* Reason */}
      <div className="card p-6">
        <div className="section-title">Reason for exit</div>
        <h2 className="mt-1 text-lg font-bold text-slate-900">
          Tell us why you need to leave
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Be specific. Your reason is shown to the mentor, HOD, and parent.
        </p>
        <textarea
          className="textarea mt-4 min-h-[120px] resize-y"
          placeholder="e.g. Medical appointment with family doctor at 12:30 PM. Will return by 3:00 PM."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={400}
        />
        <div className="mt-1 text-right text-xs text-slate-500">
          {reason.length}/400
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Logged in as <span className="font-semibold text-slate-700">{user?.name}</span> ({user?.identifier})
          </div>
          <button
            className="btn btn-primary"
            disabled={submitting || !preview}
            onClick={submit}
          >
            {submitting ? "Submitting…" : "Submit request"}
          </button>
        </div>
      </div>
    </div>
  );
}
