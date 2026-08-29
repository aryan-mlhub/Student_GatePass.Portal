"use client";

import { useEffect, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { StatusBadge, FlowBadge } from "@/components/StatusBadge";

interface Pass {
  id: number;
  passId: string;
  studentName: string;
  studentUsn: string;
  reason: string;
  status: string;
  flow: string;
  requestTimestamp: string;
  mentorName: string | null;
  hodName: string | null;
  hodActionAt: string | null;
  hodComment: string | null;
  exitTimestamp: string | null;
}

export default function HodHistoryPage() {
  return (
    <PortalShell allowedRoles={["hod", "admin"]}>
      <Inner />
    </PortalShell>
  );
}

function Inner() {
  const [passes, setPasses] = useState<Pass[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/gatepass?scope=acted")
      .then((r) => r.json())
      .then((d) => {
        setPasses(d.passes);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6 fade-in">
      <div>
        <div className="section-title">HOD history</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          Passes you have finalised
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Includes all approvals and rejections signed by you.
        </p>
      </div>
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 text-slate-400">Loading…</div>
        ) : passes.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            You have not finalised any pass yet.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Pass ID</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Decision</th>
                <th className="px-4 py-3">Exit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {passes.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {p.passId}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">
                      {p.studentName}
                    </div>
                    <div className="text-xs text-slate-500">{p.studentUsn}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={p.status} />
                      <FlowBadge flow={p.flow} />
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <div className="line-clamp-2 text-slate-700">{p.reason}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {p.hodActionAt && (
                      <div className="text-slate-500">
                        {new Date(p.hodActionAt).toLocaleString("en-IN")}
                      </div>
                    )}
                    {p.hodComment && (
                      <div className="mt-1 italic text-slate-600">
                        "{p.hodComment}"
                      </div>
                    )}
                    {p.mentorName && (
                      <div className="mt-1 text-[11px] text-slate-500">
                        Mentor: {p.mentorName}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {p.exitTimestamp ? (
                      <span className="badge badge-emerald">
                        {new Date(p.exitTimestamp).toLocaleString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
