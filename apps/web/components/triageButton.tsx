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
  const [isPending, startTransition] = useTransition();

  async function handleTriage() {
    setError(null);

    try {
      const res = await fetch(`/api/enquiries/${enquiryId}/triage`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to triage enquiry");
      }

      startTransition(() => {
        router.refresh();
      });
      toast.success("Triage successful");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      toast.error("Triage unsuccessful");
    }
  }

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
        disabled={isPending}
      >
        {isPending ? "Triaged" : triaged ? "Re-triage" : "Triage"}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
