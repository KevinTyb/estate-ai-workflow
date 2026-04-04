"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import type { DraftResponse } from "@/components/draftTypes";

type DraftButtonProps = {
  enquiryId: string;
  disabled?: boolean;
  onDraftGenerated: (draft: DraftResponse) => void;
};

export function DraftButton({
  enquiryId,
  disabled,
  onDraftGenerated,
}: DraftButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleDraft() {
    setError(null);

    try {
      const res = await fetch(`/api/enquiries/${enquiryId}/draft`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to generate draft");
      }

      const data: DraftResponse = await res.json();

      startTransition(() => {
        onDraftGenerated(data);
      });

      toast.success("Draft Generated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      toast.error("Draft unsuccessful");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={(e) => {
          e.stopPropagation();
          void handleDraft();
        }}
        disabled={isPending || disabled}
      >
        {isPending ? "Generating..." : "Draft"}
      </Button>

      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
