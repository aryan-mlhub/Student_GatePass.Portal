"use client";

import { useEffect, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { FlowBadge } from "@/components/StatusBadge";

interface ExitLog {
  id: number;
  passId: string;
  studentName: string;
  studentUsn: string;
  scannedBy: string;
  exitTimestamp: string;
  notes: string | null;
}

export default function SecurityLogsPage() {
  return (
    <PortalShell allowedRoles={["security", "admin"]}>
      <Inner />
    </PortalShell>
  );
}

function Inner() {
  const [logs, setLogs] = useState<ExitLog[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/gatepass/scan")
      .then((r) => r.json())
      .then((d) => {
        setLogs(d.logs);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6 fade-in">
      <div>
        <div className="section-title">Exit logs</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          Today at the gate
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Every QR scan logs the exact exit time and the guard on duty.
        </p>
      </div>
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 text-slate-400">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No exits have been logged yet.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Pass</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Scanned by</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-xs text-slate-700">
                    {new Date(l.exitTimestamp).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {l.passId}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">
                      {l.studentName}
                    </div>
                    <div className="text-xs text-slate-500">{l.studentUsn}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-700">
                    {l.scannedBy}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {l.notes || "—"}
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
