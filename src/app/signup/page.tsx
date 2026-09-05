"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RotatingLogo } from "@/components/RotatingLogo";

export default function SignUpPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login?signup=true");
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="card p-8 text-center max-w-md w-full space-y-4 shadow-sm">
        <RotatingLogo />
        <h1 className="text-xl font-bold text-slate-900 mt-4">
          Redirecting to Student Registration…
        </h1>
        <p className="text-xs text-slate-600">
          Loading the SBJITMR roll list registration form.
        </p>
        <Link
          href="/login?signup=true"
          className="btn btn-primary w-full"
        >
          Click here if not redirected
        </Link>
      </div>
    </div>
  );
}
