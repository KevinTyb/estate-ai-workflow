"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TONES } from "@/lib/ui/tones";

import { DraftButton } from "@/components/draftButton";
import type { Ref } from "react";
import { cn } from "@/lib/utils";
import { DetailItem } from "./detailItem";
import type { DraftResponse } from "./draftTypes";

type DraftSectionProps = {
  ref?: Ref<HTMLElement>;
  enquiryId: string;
  isDraftSaved: boolean;
  /** Why re-triage flagged the approved draft, if it did. */
  staleReason: string | null;
  hasTriageResult: boolean;
  draftReply: DraftResponse | null;
  isDraftExpanded: boolean;
  isAcceptingDraft: boolean;
  draftAcceptError: string | null;
  onToggleExpanded: () => void;
  onDraftGenerated: (draft: DraftResponse) => void;
  onDraftBodyChange: (body: string) => void;
  onCopy: () => void;
  onAccept: () => void | Promise<void>;
};

export function DraftSection({
  ref,
  enquiryId,
  isDraftSaved,
  staleReason,
  hasTriageResult,
  draftReply,
  isDraftExpanded,
  isAcceptingDraft,
  draftAcceptError,
  onToggleExpanded,
  onDraftGenerated,
  onDraftBodyChange,
  onCopy,
  onAccept,
}: DraftSectionProps) {
  return (
    <section
      ref={ref}
      className="scroll-mt-4 space-y-4 rounded-xl border border-border bg-card p-4 shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold whitespace-nowrap text-foreground">
            Draft reply
          </h3>
          {draftReply?.replyRecommended ? (
            <Badge
              variant="outline"
              title={draftReply.fallbackReason ?? undefined}
            >
              {draftReply.method === "llm" ? "AI draft" : "Template"}
            </Badge>
          ) : null}
          {isDraftSaved ? (
            <Badge variant="outline" className={TONES.emerald}>
              Saved
            </Badge>
          ) : staleReason ? (
            <Badge variant="outline" className={TONES.amber}>
              Needs re-approval
            </Badge>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {draftReply?.replyRecommended ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onToggleExpanded}
              aria-expanded={isDraftExpanded}
            >
              {isDraftExpanded ? "Show less" : "Show more"}
            </Button>
          ) : null}

          <DraftButton
            enquiryId={enquiryId}
            hasDraft={!!draftReply}
            disabled={!hasTriageResult}
            onDraftGenerated={onDraftGenerated}
          />
        </div>
      </div>

      {!hasTriageResult ? (
        <p className="text-sm text-muted-foreground">
          Run triage before generating a draft.
        </p>
      ) : !draftReply ? (
        <p className="text-sm text-muted-foreground">No draft generated yet.</p>
      ) : !draftReply.replyRecommended ? (
        <p className="text-sm text-muted-foreground">
          No reply recommended for this enquiry.
        </p>
      ) : (
        <div
          className={`space-y-4 overflow-hidden transition-all duration-300 ease-in-out ${
            isDraftExpanded ? "max-h-225" : "max-h-130"
          }`}
        >
          {draftReply.fallbackReason ? (
            <p className="text-xs text-muted-foreground">
              Using the template: {draftReply.fallbackReason}
            </p>
          ) : null}
          {draftReply.method === "llm" ? (
            <p className="text-xs text-muted-foreground">
              Written by the AI assistant. Check it before approving; nothing is
              sent until you do.
            </p>
          ) : null}
          <DetailItem
            label="Subject"
            value={draftReply.subject ?? "No subject"}
          />

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Message
            </p>

            <Textarea
              className={`resize-none transition-all duration-300 ease-in-out ${
                isDraftExpanded ? "min-h-105" : "min-h-55"
              }`}
              value={draftReply.body ?? ""}
              onChange={(e) => onDraftBodyChange(e.target.value)}
            />
          </div>

          {draftReply.slots.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Suggested slots
              </p>
              <p className="text-xs text-muted-foreground">
                Suggestions only. Nothing is booked until you confirm a slot
                under Viewing.
              </p>
              <div className="flex flex-wrap gap-2">
                {draftReply.slots.map((slot) => (
                  <Badge key={slot.id} variant="secondary">
                    {new Date(slot.startsAt).toLocaleString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Europe/London",
                    })}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          <div
            className={`flex gap-2 transition-all duration-300 ${
              isDraftExpanded
                ? "sticky bottom-0 border-t border-border bg-card pt-3"
                : ""
            }`}
          >
            <Button type="button" variant="secondary" onClick={onCopy}>
              Copy
            </Button>

            <Button
              type="button"
              onClick={() => void onAccept()}
              disabled={isAcceptingDraft || isDraftSaved}
            >
              {isAcceptingDraft
                ? "Saving..."
                : isDraftSaved
                  ? "Saved"
                  : "Accept"}
            </Button>
          </div>

          {staleReason ? (
            <p
              role="status"
              className={cn("rounded-lg border px-3 py-2 text-xs", TONES.amber)}
            >
              {staleReason} Check the draft still fits, then accept it again.
            </p>
          ) : null}
          {draftAcceptError ? (
            <p className="text-xs text-destructive">{draftAcceptError}</p>
          ) : null}
        </div>
      )}
    </section>
  );
}
