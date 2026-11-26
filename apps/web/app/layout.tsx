import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AppHeader } from "@/components/appHeader";
import { getAiConfig } from "@/lib/ai/client";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Estate AI Workflow",
  description:
    "Triage enquiries, draft replies and book viewings for estate and letting agencies.",
};

function aiStatusLabel() {
  const config = getAiConfig();
  return config.enabled
    ? `AI: ${config.model} + rules`
    : "Rules engine (AI off)";
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB" className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen bg-slate-50">
        <AppHeader aiStatus={aiStatusLabel()} />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
