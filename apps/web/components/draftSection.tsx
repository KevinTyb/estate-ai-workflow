"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { DraftButton } from "@/components/draftButton";
import type { Ref } from "react";
import { DetailItem } from "./detailItem";
import type { DraftResponse } from "./draftTypes";

type DraftSectionProps = {
  ref?: Ref<HTMLElement>;
  enquiryId: string;
  isDraftSaved: boolean;
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
      className="scroll-mt-4 space-y-4 rounded-xl border border-slate-200 bg-white p-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900">Draft reply</h3>
          {isDraftSaved ? (
            <Badge
              variant="outline"
              className="border-emerald-200 bg-emerald-50 text-emerald-700"
            >
              Saved
            </Badge>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {draftReply?.replyRecommended ? (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={onToggleExpanded}
            >
              {isDraftExpanded ? "Collapse" : "Expand"}
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
        <p className="text-sm text-slate-500">
          Run triage before generating a draft.
        </p>
      ) : !draftReply ? (
        <p className="text-sm text-slate-500">No draft generated yet.</p>
      ) : !draftReply.replyRecommended ? (
        <p className="text-sm text-slate-500">
          No reply recommended for this enquiry.
        </p>
      ) : (
        <div
          className={`space-y-4 overflow-hidden transition-all duration-300 ease-in-out ${
            isDraftExpanded ? "max-h-225" : "max-h-130"
          }`}
        >
          <DetailItem
            label="Subject"
            value={draftReply.subject ?? "No subject"}
          />

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
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
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Suggested slots
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
                ? "sticky bottom-0 border-t border-slate-200 bg-white pt-3"
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

          {draftAcceptError ? (
            <p className="text-xs text-red-600">{draftAcceptError}</p>
          ) : null}
        </div>
      )}
    </section>
  );
}
