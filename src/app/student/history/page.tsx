"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { StatusBadge, FlowBadge } from "@/components/StatusBadge";

interface Pass {
  id: number;
  passId: string;
  reason: string;
  status: "pending_mentor" | "pending_hod" | "approved" | "rejected";
  flow: "academic" | "free_period" | "emergency";
  currentSubject: string | null;
  slotStart: string | null;
  slotEnd: string | null;
  requestTimestamp: string;
}

export default function StudentHistory() {
  return (
    <PortalShell allowedRoles={["student"]}>
      <Inner />
    </PortalShell>
  );
}

function Inner() {
  const [passes, setPasses] = useState<Pass[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/gatepass?scope=mine")
      .then((r) => r.json())
      .then((d) => {
        setPasses(d.passes);
        setLoading(false);
      });
  }, []);

  const filtered = passes.filter((p) =>
    filter === "all" ? true : p.status === filter,
  );

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="section-title">My passes</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            All gate pass requests
          </h1>
        </div>
        <Link href="/student/new" className="btn btn-primary">
          + New pass
        </Link>
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 p-3 text-xs font-semibold">
          {[
            { v: "all", l: "All" },
            { v: "pending_mentor", l: "Pending mentor" },
            { v: "pending_hod", l: "Pending HOD" },
            { v: "approved", l: "Approved" },
            { v: "rejected", l: "Rejected" },
          ].map((f) => (
            <button
              key={f.v}
              onClick={() => setFilter(f.v)}
              className={`rounded-lg px-3 py-1.5 ${
                filter === f.v
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {f.l}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="p-6 text-slate-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No passes to show.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((p) => {
              const d = new Date(p.requestTimestamp);
              return (
                <Link
                  key={p.id}
                  href={`/student/pass/${p.passId}`}
                  className="flex flex-wrap items-center gap-3 p-4 hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-mono text-xs text-slate-500">
                        {p.passId}
                      </div>
                      <StatusBadge status={p.status} />
                      <FlowBadge flow={p.flow} />
                    </div>
                    <div className="mt-1 line-clamp-1 text-sm text-slate-800">
                      {p.reason}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {d.toLocaleString("en-IN")}
                      {p.slotStart && p.slotEnd && (
                        <> · slot {p.slotStart}–{p.slotEnd}</>
                      )}
                      {p.currentSubject && (
                        <> · {p.currentSubject}</>
                      )}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-indigo-700">
                    View →
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
