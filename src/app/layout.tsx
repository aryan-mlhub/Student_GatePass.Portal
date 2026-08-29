import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { IntroSplashScreen } from "@/components/IntroSplashScreen";

export const metadata: Metadata = {
  title: "SBJITMR Gate Pass System",
  description:
    "Timetable-Aware Campus Gate Pass Engine for SB Jain Institute of Technology, Management and Research.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <IntroSplashScreen />
        {children}
      </body>
    </html>
  );
}
