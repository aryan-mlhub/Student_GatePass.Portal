"use client";

import { useEffect, useMemo, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { useSession } from "@/lib/useSession";
import { DEPARTMENTS, SECTIONS, DAYS } from "@/lib/timetable";
import { RotatingLogo } from "@/components/RotatingLogo";

interface Entry {
  id: number;
  department: string;
  semester: number;
  section: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subjectName: string;
  subjectCode: string;
  facultyName: string;
  isBreak: boolean;
}

export default function HodTimetablePage() {
  return (
    <PortalShell allowedRoles={["hod", "admin"]}>
      <Inner />
    </PortalShell>
  );
}

function Inner() {
  const { user } = useSession();
  const department = user?.department || DEPARTMENTS[0];
  const [semester, setSemester] = useState<number>(5);
  const [section, setSection] = useState<string>("A");
  const [day, setDay] = useState<string>("monday");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);

  async function refresh() {
    setLoading(true);
    const r = await fetch(
      `/api/timetable?department=${encodeURIComponent(
        department,
      )}&semester=${semester}&section=${section}&day=${day}`,
    );
    if (r.ok) {
      const d = await r.json();
      setEntries(d.entries);
    }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [department, semester, section, day]);

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="section-title">Timetable management · HOD</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {department}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage master timetable for your department. Edits are visible to
            students instantly.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditing(null);
            setShowAdd(true);
          }}
        >
          + Add slot
        </button>
      </div>

      <div className="card p-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <Select
            label="Semester"
            value={String(semester)}
            onChange={(v) => setSemester(parseInt(v, 10))}
            options={[1, 2, 3, 4, 5, 6, 7, 8].map((s) => ({
              value: String(s),
              label: `Semester ${s}`,
            }))}
          />
          <Select
            label="Section"
            value={section}
            onChange={setSection}
            options={SECTIONS.map((s) => ({ value: s, label: `Section ${s}` }))}
          />
          <Select
            label="Day"
            value={day}
            onChange={setDay}
            options={DAYS.map((d) => ({
              value: d,
              label: d.charAt(0).toUpperCase() + d.slice(1),
            }))}
          />
          <div className="flex items-end">
            <div className="text-xs text-slate-500">
              Department is locked to your HOD assignment.
            </div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-900">
            {day.charAt(0).toUpperCase() + day.slice(1)} · Sem {semester} · Sec{" "}
            {section}
          </div>
          <div className="text-xs text-slate-500">
            {entries.length} slots · {entries.filter((e) => !e.isBreak).length}{" "}
            classes
          </div>
        </div>
        {loading ? (
          <div className="p-6 text-slate-400">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto inline-block">
              <RotatingLogo size="sm" showLabel={false} />
            </div>
            <div className="mt-3 text-sm font-semibold text-slate-900">
              No slots configured
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Use “Add slot” to publish the master timetable.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Faculty</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {e.startTime} – {e.endTime}
                    </td>
                    <td className="px-4 py-3">
                      {e.isBreak ? (
                        <span className="badge badge-slate">Break</span>
                      ) : (
                        <span className="font-semibold text-slate-900">
                          {e.subjectName}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {e.subjectCode}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {e.facultyName}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          className="rounded-md px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                          onClick={() => {
                            setEditing(e);
                            setShowAdd(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-md px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                          onClick={async () => {
                            if (!confirm("Delete this slot?")) return;
                            await fetch(`/api/timetable/${e.id}`, {
                              method: "DELETE",
                            });
                            refresh();
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <SlotModal
          entry={editing}
          defaults={{
            department,
            semester: String(semester),
            section,
            dayOfWeek: day,
          }}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <select
        className="select mt-1.5"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SlotModal({
  entry,
  defaults,
  onClose,
  onSaved,
}: {
  entry: Entry | null;
  defaults: { department: string; semester: string; section: string; dayOfWeek: string };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    department: entry?.department ?? defaults.department,
    semester: String(entry?.semester ?? defaults.semester),
    section: entry?.section ?? defaults.section,
    dayOfWeek: entry?.dayOfWeek ?? defaults.dayOfWeek,
    startTime: entry?.startTime ?? "09:00",
    endTime: entry?.endTime ?? "10:00",
    subjectName: entry?.subjectName ?? "",
    subjectCode: entry?.subjectCode ?? "",
    facultyName: entry?.facultyName ?? "",
    isBreak: entry?.isBreak ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const url = entry ? `/api/timetable/${entry.id}` : "/api/timetable";
      const method = entry ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          semester: parseInt(form.semester, 10),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Save failed");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 p-4">
      <div className="card w-full max-w-lg p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            {entry ? "Edit slot" : "Add new slot"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Select
            label="Department"
            value={form.department}
            onChange={(v) => setForm({ ...form, department: v })}
            options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
          />
          <Select
            label="Semester"
            value={form.semester}
            onChange={(v) => setForm({ ...form, semester: v })}
            options={[1, 2, 3, 4, 5, 6, 7, 8].map((s) => ({
              value: String(s),
              label: `Sem ${s}`,
            }))}
          />
          <Select
            label="Section"
            value={form.section}
            onChange={(v) => setForm({ ...form, section: v })}
            options={SECTIONS.map((s) => ({ value: s, label: `Sec ${s}` }))}
          />
          <Select
            label="Day"
            value={form.dayOfWeek}
            onChange={(v) => setForm({ ...form, dayOfWeek: v })}
            options={DAYS.map((d) => ({
              value: d,
              label: d.charAt(0).toUpperCase() + d.slice(1),
            }))}
          />
          <Field
            label="Start time"
            value={form.startTime}
            onChange={(v) => setForm({ ...form, startTime: v })}
            placeholder="09:00"
          />
          <Field
            label="End time"
            value={form.endTime}
            onChange={(v) => setForm({ ...form, endTime: v })}
            placeholder="10:00"
          />
          <Field
            label="Subject name"
            value={form.subjectName}
            onChange={(v) => setForm({ ...form, subjectName: v })}
            placeholder="Data Structures"
          />
          <Field
            label="Subject code"
            value={form.subjectCode}
            onChange={(v) => setForm({ ...form, subjectCode: v })}
            placeholder="CS301"
          />
          <div className="sm:col-span-2">
            <Field
              label="Faculty name"
              value={form.facultyName}
              onChange={(v) => setForm({ ...form, facultyName: v })}
              placeholder="Dr. S. Joshi"
            />
          </div>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.isBreak}
              onChange={(e) => setForm({ ...form, isBreak: e.target.checked })}
            />
            <span className="text-sm text-slate-700">This slot is a break</span>
          </label>
        </div>
        {error && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : entry ? "Save changes" : "Add slot"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <input
        className="input mt-1.5"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
