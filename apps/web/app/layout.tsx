import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AppHeader } from "@/components/appHeader";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Estate AI Workflow",
  description:
    "Triage enquiries, draft replies and book viewings for estate and letting agencies.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB" className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen bg-slate-50">
        <AppHeader />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
