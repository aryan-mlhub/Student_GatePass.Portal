"use client";

import { useEffect, useState } from "react";
import { PortalShell } from "@/components/PortalShell";

interface User {
  id: number;
  role: string;
  name: string;
  identifier: string;
  department: string | null;
  semester: number | null;
  section: string | null;
  parentPhone: string | null;
  managedDepartment: string | null;
  managedSemester: number | null;
  managedSection: string | null;
  createdAt: string;
}

export default function AdminUsersPage() {
  return (
    <PortalShell allowedRoles={["admin"]}>
      <Inner />
    </PortalShell>
  );
}

function Inner() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => {
        setUsers(d.users);
        setLoading(false);
      });
  }, []);

  const filtered =
    filter === "all" ? users : users.filter((u) => u.role === filter);

  return (
    <div className="space-y-6 fade-in">
      <div>
        <div className="section-title">Staff directory</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          Mentors, HODs and security
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Seeded by the system administrator. Students sign up themselves using
          their USN.
        </p>
      </div>

      <div className="card p-3">
        <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
          {[
            { v: "all", l: "All" },
            { v: "mentor", l: "Mentors" },
            { v: "hod", l: "HODs" },
            { v: "security", l: "Security" },
            { v: "admin", l: "Admin" },
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
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 text-slate-400">Loading…</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Identifier</th>
                <th className="px-4 py-3">Scope</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {u.name}
                  </td>
                  <td className="px-4 py-3 capitalize">
                    <span className="badge badge-indigo">{u.role}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {u.identifier}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-700">
                    {u.managedDepartment && (
                      <div>{u.managedDepartment}</div>
                    )}
                    {(u.managedSemester || u.semester) && (
                      <div className="text-slate-500">
                        Sem {u.managedSemester ?? u.semester} · Sec{" "}
                        {u.managedSection ?? u.section}
                      </div>
                    )}
                    {!u.managedDepartment && !u.department && (
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
