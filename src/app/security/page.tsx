"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { useSession } from "@/lib/useSession";
import { StatusBadge, FlowBadge } from "@/components/StatusBadge";

interface ApprovedPass {
  id: number;
  passId: string;
  studentName: string;
  studentUsn: string;
  department: string;
  semester: number;
  section: string;
  reason: string;
  flow: "academic" | "free_period" | "emergency";
  requestTimestamp: string;
  hodName: string | null;
  hodActionAt: string | null;
  qrPayload: string | null;
  qrExpiresAt: string | null;
  exitTimestamp: string | null;
}

interface ScanResult {
  ok: boolean;
  message: string;
  pass?: ApprovedPass;
  alreadyExited?: boolean;
}

export default function SecurityPage() {
  return (
    <PortalShell allowedRoles={["security", "admin"]}>
      <Inner />
    </PortalShell>
  );
}

function Inner() {
  const { user } = useSession();
  const [approved, setApproved] = useState<ApprovedPass[]>([]);
  const [loading, setLoading] = useState(true);
  const [scannerOn, setScannerOn] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [notes, setNotes] = useState("");
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<unknown>(null);

  async function refresh() {
    const r = await fetch("/api/gatepass?scope=security");
    if (r.ok) {
      const d = await r.json();
      setApproved(d.passes);
    }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    return () => {
      // stop scanner on unmount
      const sc = scannerRef.current as { stop?: () => Promise<void> } | null;
      if (sc && typeof sc.stop === "function") {
        sc.stop().catch(() => {});
      }
    };
  }, []);

  async function startScanner() {
    setResult(null);
    setScannerOn(true);
    setScanning(true);
    // dynamic import to keep SSR happy
    const mod = await import("html5-qrcode");
    const Html5Qrcode = mod.Html5Qrcode;
    const el = document.getElementById("qr-reader");
    if (!el) return;
    const sc = new Html5Qrcode("qr-reader");
    scannerRef.current = sc;
    try {
      await sc.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decoded: string) => {
          await handleScan(decoded);
          await sc.stop().catch(() => {});
          setScannerOn(false);
          setScanning(false);
        },
        () => {
          // ignore errors during scan
        },
      );
    } catch (err) {
      console.error("Scanner start failed", err);
      setScannerOn(false);
      setScanning(false);
    }
  }

  async function stopScanner() {
    const sc = scannerRef.current as { stop?: () => Promise<void> } | null;
    if (sc && typeof sc.stop === "function") {
      await sc.stop().catch(() => {});
    }
    setScannerOn(false);
    setScanning(false);
  }

  async function handleScan(payload: string) {
    const r = await fetch("/api/gatepass/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ payload, notes }),
    });
    const data = await r.json();
    setResult({
      ok: !!data.valid,
      message: data.message || data.reason || "Done",
      pass: data.pass,
      alreadyExited: data.alreadyExited,
    });
    setNotes("");
    refresh();
  }

  async function handleManual() {
    if (!manualCode.trim()) return;
    // Allow entering just the pass id (GP-...) for testing
    let payload = manualCode.trim();
    if (!payload.startsWith("SBJITMR|")) {
      payload = `SBJITMR|PASS=${payload}|SIG=manual`;
    }
    await handleScan(payload);
    setManualCode("");
  }

  async function quickExit(pass: ApprovedPass) {
    if (!pass.qrPayload) {
      alert("No QR payload for this pass");
      return;
    }
    await handleScan(pass.qrPayload);
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="section-title">Security portal</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Gate QR scanner
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Scan an approved pass to verify and log the exit. Logged in as{" "}
            <span className="font-semibold text-slate-700">{user?.name}</span>.
          </p>
        </div>
        <div className="card flex items-center gap-3 px-4 py-2 text-sm">
          <span className="relative inline-flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="font-semibold text-slate-700">On duty</span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="section-title">Camera scanner</div>
            {scannerOn && (
              <button className="btn btn-danger" onClick={stopScanner}>
                Stop camera
              </button>
            )}
            {!scannerOn && (
              <button
                className="btn btn-primary"
                onClick={startScanner}
                disabled={scanning}
              >
                {scanning ? "Starting…" : "Start camera"}
              </button>
            )}
          </div>
          <div
            id="qr-reader"
            className="mt-4 grid min-h-[260px] place-items-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50"
          >
            {!scannerOn && (
              <div className="p-6 text-center text-slate-500">
                <div className="text-2xl">📷</div>
                <p className="mt-2 text-sm">
                  Click "Start camera" and point at the student's QR.
                </p>
              </div>
            )}
          </div>

          <div className="mt-5">
            <div className="section-title">Manual entry (fallback)</div>
            <div className="mt-2 flex gap-2">
              <input
                className="input"
                placeholder="Paste QR payload or enter Pass ID (e.g. GP-2025-XXXXXX)"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
              />
              <button className="btn btn-indigo" onClick={handleManual}>
                Verify
              </button>
            </div>
            <textarea
              className="textarea mt-2"
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {result && (
            <div
              className={`mt-5 rounded-xl border p-4 ${
                result.ok
                  ? result.alreadyExited
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-rose-200 bg-rose-50 text-rose-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-xl">{result.ok ? "✓" : "✕"}</div>
                <div>
                  <div className="text-sm font-semibold">{result.message}</div>
                  {result.pass && (
                    <div className="text-xs">
                      {result.pass.studentName} ({result.pass.studentUsn}) ·{" "}
                      {result.pass.department}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="card p-6">
            <div className="section-title">Today at gate</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Stat
                label="Approved"
                value={approved.length}
                tone="indigo"
              />
              <Stat
                label="Exited"
                value={approved.filter((p) => !!p.exitTimestamp).length}
                tone="emerald"
              />
            </div>
            <Link
              href="/security/logs"
              className="mt-4 block text-center text-sm font-semibold text-indigo-700 hover:underline"
            >
              View exit logs →
            </Link>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-900">
            Approved passes awaiting exit
          </div>
        </div>
        {loading ? (
          <div className="p-6 text-slate-400">Loading…</div>
        ) : approved.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No approved passes yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {approved.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center gap-3 p-4 hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-mono text-xs text-slate-500">
                      {p.passId}
                    </div>
                    {p.exitTimestamp ? (
                      <span className="badge badge-emerald">Exited</span>
                    ) : (
                      <span className="badge badge-indigo">Pending exit</span>
                    )}
                    <FlowBadge flow={p.flow} />
                  </div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {p.studentName}{" "}
                    <span className="font-normal text-slate-500">
                      ({p.studentUsn})
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {p.department} · Sem {p.semester} · Sec {p.section}
                  </div>
                  <div className="mt-1 line-clamp-1 text-sm text-slate-700">
                    Reason: {p.reason}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {p.exitTimestamp ? (
                    <div className="text-xs text-slate-500">
                      Exited{" "}
                      {new Date(p.exitTimestamp).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </div>
                  ) : (
                    <button
                      className="btn btn-indigo"
                      onClick={() => quickExit(p)}
                    >
                      Log exit
                    </button>
                  )}
                </div>
              </div>
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
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-bold ${colorMap[tone]}`}>{value}</div>
    </div>
  );
}


