"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import type { DraftResponse } from "@/components/draftTypes";

type DraftButtonProps = {
  enquiryId: string;
  hasDraft?: boolean;
  disabled?: boolean;
  onDraftGenerated: (draft: DraftResponse) => void;
};

export function DraftButton({
  enquiryId,
  hasDraft,
  disabled,
  onDraftGenerated,
}: DraftButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleDraft() {
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/enquiries/${enquiryId}/draft`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to generate draft");

      onDraftGenerated((await res.json()) as DraftResponse);
      toast.success(hasDraft ? "Draft regenerated" : "Draft generated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      toast.error("Draft unsuccessful");
    } finally {
      setIsLoading(false);
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
        disabled={isLoading || disabled}
      >
        {isLoading ? "Generating..." : hasDraft ? "Regenerate" : "Draft"}
      </Button>

      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
