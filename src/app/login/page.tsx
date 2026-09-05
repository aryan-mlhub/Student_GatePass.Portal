"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { RotatingLogo } from "@/components/RotatingLogo";

type Role = "student" | "mentor" | "hod" | "security" | "admin";

const ROLE_LABELS: Record<Role, string> = {
  student: "Student",
  mentor: "Mentor",
  hod: "HOD",
  security: "Security Guard",
  admin: "Admin",
};

function LoginInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const initialRole = (sp.get("role") as Role) || "student";
  const initialMode = sp.get("signup") ? "signup" : "login";

  const [role, setRole] = useState<Role>(initialRole);
  const [mode, setMode] = useState<"login" | "signup" | "clerk">(initialMode);

  // login fields
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  // signup fields
  const [usn, setUsn] = useState("");
  const [name, setName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rollHint, setRollHint] = useState<{
    exists: boolean;
    student?: {
      usn: string;
      name: string;
      department: string;
      semester: number;
      section: string;
      parentPhone: string;
    };
    error?: string;
  } | null>(null);
  const [looking, setLooking] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isClerkConfigured =
    typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "string" &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith("pk_") &&
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("your_clerk");

  // When switching to student signup, lookup roll list as USN is typed
  useEffect(() => {
    if (mode !== "signup" || role !== "student") {
      setRollHint(null);
      return;
    }
    if (usn.length < 6) {
      setRollHint(null);
      return;
    }
    let alive = true;
    setLooking(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(
          `/api/auth/lookup?usn=${encodeURIComponent(usn.toUpperCase())}`,
        );
        const data = await r.json();
        if (alive) {
          setRollHint(data);
          if (data.student) {
            setName(data.student.name);
            setParentPhone(data.student.parentPhone);
          }
        }
      } catch {
        if (alive) setRollHint({ exists: false });
      } finally {
        if (alive) setLooking(false);
      }
    }, 350);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [usn, mode, role]);

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role, identifier, password }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Login failed");
      router.push(`/${data.user.role}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const r = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          usn: usn.toUpperCase(),
          name,
          parentPhone,
          password,
          confirmPassword,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Signup failed");
      router.push(`/student`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center">
            <RotatingLogo />
          </div>
          <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 border border-brand-200">
            Official Gate Pass Portal
          </span>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-2">
        {/* Form */}
        <div className="card p-8">
          <div className="section-title">Authentication</div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {mode === "login" ? "Sign in to your portal" : "Create a student account"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {mode === "login"
              ? "Use your portal credentials to continue."
              : "Enter your SBJITMR USN to auto-fill your details from the official roll list."}
          </p>

          {/* Auth mode selector: Campus Credentials vs Clerk SSO */}
          {isClerkConfigured && (
            <div className="mt-4 grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
              <button
                type="button"
                className={`py-2 rounded-lg transition-all ${
                  mode !== "clerk"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                onClick={() => setMode("login")}
              >
                🎓 Campus Credentials
              </button>
              <button
                type="button"
                className={`py-2 rounded-lg transition-all ${
                  mode === "clerk"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                onClick={() => setMode("clerk")}
              >
                ⚡ Clerk SSO / Social
              </button>
            </div>
          )}

          {mode === "clerk" ? (
            <div className="mt-6 flex justify-center">
              <SignIn
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "rounded-2xl shadow-none border-0 p-0",
                    formButtonPrimary:
                      "bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold",
                  },
                }}
                routing="path"
                path="/login"
                signUpUrl="/signup"
              />
            </div>
          ) : (
            <>
              {/* Role tabs */}
              {mode === "login" && (
                <div className="mt-6 flex flex-wrap gap-1.5 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
                  {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`flex-1 rounded-lg px-3 py-2 transition ${
                        role === r
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                      onClick={() => setRole(r)}
                    >
                      {ROLE_LABELS[r]}
                    </button>
                  ))}
                </div>
              )}

              {mode === "login" ? (
                <form onSubmit={submitLogin} className="mt-6 space-y-4">
                  <Field
                    label={
                      role === "student"
                        ? "USN"
                        : role === "admin" || role === "security"
                          ? "Username"
                          : "Employee ID"
                    }
                    value={identifier}
                    onChange={setIdentifier}
                    placeholder={
                      role === "student"
                        ? "SBJ23CSE001"
                        : role === "hod"
                          ? "hod_cse"
                          : role === "mentor"
                            ? "mentor_cse_5_a"
                            : role === "admin"
                              ? "admin"
                              : "guard1"
                    }
                    autoComplete="username"
                  />
                  <Field
                    label="Password"
                    value={password}
                    onChange={setPassword}
                    type="password"
                    placeholder="Enter your password"
                  />
                  {error && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      {error}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary w-full"
                  >
                    {submitting ? "Signing in…" : `Sign in as ${ROLE_LABELS[role]}`}
                  </button>
                  {role === "student" && (
                    <div className="text-center text-sm text-slate-600">
                      First time?{" "}
                      <button
                        type="button"
                        className="font-semibold text-indigo-700 hover:underline"
                        onClick={() => {
                          setMode("signup");
                          setError(null);
                        }}
                      >
                        Sign up with your USN
                      </button>
                    </div>
                  )}
                </form>
              ) : (
            <form onSubmit={submitSignup} className="mt-6 space-y-4">
              <Field
                label="SBJITMR USN"
                value={usn}
                onChange={(v) => setUsn(v.toUpperCase())}
                placeholder="SBJ23CSE001"
                hint={
                  looking
                    ? "Checking roll list…"
                    : rollHint?.exists
                      ? `✓ ${rollHint.student?.department} · Sem ${rollHint.student?.semester} · Sec ${rollHint.student?.section}`
                      : rollHint && !rollHint.exists
                        ? rollHint.error || "USN not in roll list"
                        : "We will auto-fill your details from the SBJITMR roll list"
                }
                hintTone={
                  rollHint?.exists
                    ? "emerald"
                    : rollHint && !rollHint.exists
                      ? "rose"
                      : "slate"
                }
              />
              <Field
                label="Full Name"
                value={name}
                onChange={setName}
                placeholder="As printed on roll list"
                disabled={!!rollHint?.exists}
              />
              <Field
                label="Parent Phone Number"
                value={parentPhone}
                onChange={setParentPhone}
                placeholder="+91XXXXXXXXXX"
                disabled={!!rollHint?.exists}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  type="password"
                  placeholder="At least 6 characters"
                />
                <Field
                  label="Confirm"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  type="password"
                  placeholder="Re-type password"
                />
              </div>
              {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary w-full"
              >
                {submitting ? "Creating account…" : "Create my account"}
              </button>
              <div className="text-center text-sm text-slate-600">
                Already have an account?{" "}
                <button
                  type="button"
                  className="font-semibold text-indigo-700 hover:underline"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                  }}
                >
                  Sign in instead
                </button>
              </div>
            </form>
          )}
          </>
          )}
        </div>

        {/* Side panel */}
        <div className="space-y-6">
          <div className="card overflow-hidden">
            <div className="border-b border-slate-200 bg-gradient-to-br from-emerald-50 to-indigo-50 p-6">
              <RotatingLogo size="lg" showLabel={false} />
              <div className="mt-4 text-lg font-bold text-slate-900">
                Welcome to the official SBJITMR Gate Pass
              </div>
              <p className="mt-1 text-sm text-slate-600">
                One platform for students, mentors, HODs, and security. Every pass
                is validated against the live master timetable.
              </p>
            </div>
            <div className="space-y-3 p-6 text-sm">
              <Hint
                title="Auto-routing"
                desc="Academic-hour requests go Mentor → HOD. Free-period requests skip directly to HOD."
              />
              <Hint
                title="Parent SMS on approval"
                desc="Approval instantly fires a simulated SMS to the parent phone on file."
              />
              <Hint
                title="Signed QR at the gate"
                desc="Approved passes become HMAC-signed QR codes with a 6-hour validity."
              />
            </div>
          </div>

          <div className="card p-6">
            <div className="section-title">Demo accounts</div>
            <table className="mt-3 w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-1">Role</th>
                  <th className="py-1">ID</th>
                  <th className="py-1">Password</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                <tr>
                  <td className="py-1">Admin</td>
                  <td>
                    <code className="font-mono">admin</code>
                  </td>
                  <td>
                    <code className="font-mono">admin123</code>
                  </td>
                </tr>
                <tr>
                  <td className="py-1">HOD</td>
                  <td>
                    <code className="font-mono">hod_cse</code>
                  </td>
                  <td>
                    <code className="font-mono">hod123</code>
                  </td>
                </tr>
                <tr>
                  <td className="py-1">Mentor</td>
                  <td>
                    <code className="font-mono">mentor_cse_5_a</code>
                  </td>
                  <td>
                    <code className="font-mono">mentor123</code>
                  </td>
                </tr>
                <tr>
                  <td className="py-1">Security</td>
                  <td>
                    <code className="font-mono">guard1</code>
                  </td>
                  <td>
                    <code className="font-mono">security123</code>
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="mt-4 text-xs text-slate-500">
              For students, sign up first using a USN from the roll list (e.g.{" "}
              <code className="rounded bg-slate-100 px-1">SBJ23CSE001</code>).
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
  hint,
  hintTone = "slate",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  hint?: string;
  hintTone?: "slate" | "emerald" | "rose";
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-slate-800">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        className="input mt-1.5 disabled:bg-slate-50 disabled:text-slate-500"
      />
      {hint && (
        <span
          className={`mt-1.5 block text-xs ${
            hintTone === "emerald"
              ? "text-emerald-700"
              : hintTone === "rose"
                ? "text-rose-700"
                : "text-slate-500"
          }`}
        >
          {hint}
        </span>
      )}
    </label>
  );
}

function Hint({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex gap-3">
      <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-emerald-500" />
      <div>
        <div className="font-semibold text-slate-900">{title}</div>
        <div className="text-slate-600">{desc}</div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center text-slate-500">
          Loading…
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
