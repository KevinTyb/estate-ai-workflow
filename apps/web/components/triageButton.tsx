"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

type TriageButtonProps = {
  enquiryId: string;
  triaged?: boolean;
};

export function TriageButton({ enquiryId, triaged }: TriageButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, startTransition] = useTransition();

  async function handleTriage() {
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/enquiries/${enquiryId}/triage`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to triage enquiry");

      startTransition(() => router.refresh());
      toast.success("Triage complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      toast.error("Triage unsuccessful");
    } finally {
      setIsLoading(false);
    }
  }

  const busy = isLoading || isRefreshing;

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={(e) => {
          e.stopPropagation();
          void handleTriage();
        }}
        disabled={busy}
      >
        {busy ? "Triaging..." : triaged ? "Re-triage" : "Triage"}
      </Button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
