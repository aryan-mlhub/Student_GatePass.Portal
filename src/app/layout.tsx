import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "SBJITMR Gate Pass System",
  description:
    "Timetable-Aware Campus Gate Pass Engine for SB Jain Institute of Technology, Management and Research.",
};

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const isClerkEnabled =
  typeof publishableKey === "string" &&
  publishableKey.startsWith("pk_") &&
  !publishableKey.includes("your_clerk") &&
  !publishableKey.includes("mock");

export default function RootLayout({ children }: { children: ReactNode }) {
  if (isClerkEnabled) {
    return (
      <ClerkProvider publishableKey={publishableKey}>
        <html lang="en">
          <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
            {children}
          </body>
        </html>
      </ClerkProvider>
    );
  }

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}


