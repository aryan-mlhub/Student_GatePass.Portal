"use client";

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { RotatingLogo } from "@/components/RotatingLogo";

export default function SignUpPage() {
  const isClerkKeyPresent =
    typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "string" &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith("pk_") &&
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("your_clerk") &&
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("mock");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center">
            <RotatingLogo />
          </Link>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-500">Already have an account?</span>
            <Link
              href="/login"
              className="rounded-lg bg-slate-100 px-3 py-1.5 font-semibold text-slate-800 hover:bg-slate-200 transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {isClerkKeyPresent ? (
            <div className="flex justify-center">
              <SignUp
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "rounded-2xl shadow-sm border border-slate-200",
                    headerTitle: "text-xl font-bold text-slate-900",
                    headerSubtitle: "text-xs text-slate-500",
                    formButtonPrimary:
                      "bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold",
                  },
                }}
                routing="path"
                path="/signup"
                signInUrl="/login"
              />
            </div>
          ) : (
            <div className="card p-8 text-center space-y-4">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold">
                🎓
              </div>
              <h1 className="text-xl font-bold text-slate-900">
                Student Registration
              </h1>
              <p className="text-xs text-slate-600 leading-relaxed">
                To sign up with your SBJITMR USN or institutional credentials, visit the login portal.
              </p>
              <Link
                href="/login?signup=true"
                className="btn btn-primary w-full"
              >
                Continue to Student Roll Signup →
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
