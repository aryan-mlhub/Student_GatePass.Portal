"use client";

import { useEffect, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { RotatingLogo } from "@/components/RotatingLogo";

interface SmsLog {
  id: number;
  passId: string;
  studentName: string;
  studentUsn: string;
  parentPhone: string;
  body: string;
  sentAt: string;
}

export default function AdminSmsPage() {
  return (
    <PortalShell allowedRoles={["admin", "hod", "security"]}>
      <Inner />
    </PortalShell>
  );
}

function Inner() {
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sms-log")
      .then((r) => r.json())
      .then((d) => {
        setLogs(d.logs);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="section-title">Parent SMS · audit log</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Every parent notification
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Simulated deliveries — captured for every HOD-approved pass.
          </p>
        </div>
        <div className="card flex items-center gap-3 px-4 py-2 text-sm">
          <span className="text-slate-500">Total sent</span>
          <span className="text-base font-bold text-emerald-700">
            {logs.length}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="card animate-pulse p-6 text-slate-400">Loading…</div>
      ) : logs.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="mx-auto inline-block">
            <RotatingLogo size="sm" showLabel={false} />
          </div>
          <div className="mt-3 text-sm font-semibold text-slate-900">
            No SMS sent yet
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Approve a pass as HOD to trigger a parent notification.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((l) => (
            <div key={l.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="badge badge-emerald">Delivered</span>
                  <span className="font-mono text-xs text-slate-500">
                    {l.passId}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  {new Date(l.sentAt).toLocaleString("en-IN")}
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Student
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    {l.studentName}
                  </div>
                  <div className="text-xs text-slate-500">{l.studentUsn}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Parent phone
                  </div>
                  <div className="text-sm font-mono text-slate-900">
                    {l.parentPhone}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Channel
                  </div>
                  <div className="text-sm text-slate-900">SBJITMR SMS Gateway</div>
                </div>
              </div>
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-800">
                {l.body}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
