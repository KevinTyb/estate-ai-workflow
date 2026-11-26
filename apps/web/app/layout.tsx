import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AppHeader } from "@/components/appHeader";
import { ThemeProvider } from "@/components/themeProvider";
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const aiEnabled = getAiConfig().enabled;
  return (
    <html
      lang="en-GB"
      className={cn("font-sans", geist.variable)}
      // next-themes sets the theme class before React hydrates.
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background">
        <ThemeProvider>
          <AppHeader
            aiEnabled={aiEnabled}
            aiStatus={aiEnabled ? "AI + rules" : "Rules engine (AI off)"}
          />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
