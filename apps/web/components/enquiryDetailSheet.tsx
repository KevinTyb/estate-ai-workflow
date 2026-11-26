"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useEnquiryDetailSheet } from "@/hooks/useEnquiryDetailSheet";
import {
  formatConfidence,
  getEntityEntries,
  sourceLabel,
} from "@/lib/enquiries/helper";
import type { InboxEnquiry } from "@/lib/enquiries/types";
import { DetailItem } from "./detailItem";
import { DetailSection } from "./detailSection";
import { DraftSection } from "./draftSection";

type EnquiryDetailSheetProps = {
  selectedEnquiry: InboxEnquiry | null;
  onOpenChange: (open: boolean) => void;
};

function formatLabel(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

function formatDateTime(value: Date | null | undefined) {
  if (!value) return "Not triaged yet";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(value);
}

export function EnquiryDetailSheet({
  selectedEnquiry,
  onOpenChange,
}: EnquiryDetailSheetProps) {
  return (
    <Sheet open={!!selectedEnquiry} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto p-2 sm:max-w-xl">
        {selectedEnquiry ? (
          // Keyed so per-enquiry state (the draft) resets when switching.
          <EnquiryDetail key={selectedEnquiry.id} enquiry={selectedEnquiry} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function EnquiryDetail({ enquiry }: { enquiry: InboxEnquiry }) {
  const {
    draftReply,
    isDraftSaved,
    isDraftExpanded,
    isAcceptingDraft,
    draftAcceptError,
    draftSectionRef,
    handleAcceptDraft,
    handleDraftBodyChange,
    handleDraftGenerated,
    toggleDraftExpanded,
  } = useEnquiryDetailSheet(enquiry);

  const entityEntries = useMemo(
    () => getEntityEntries(enquiry.triageResult?.entities),
    [enquiry.triageResult?.entities],
  );

  const resolvedIntent = enquiry.triageResult?.intent ?? enquiry.intent;
  const propertyLabel = enquiry.property
    ? `${enquiry.property.ref} · ${enquiry.property.address}`
    : enquiry.propertyRef;

  return (
    <div className="space-y-6">
      <SheetHeader className="text-left">
        <SheetTitle>Enquiry details</SheetTitle>
        <SheetDescription>
          Review the full enquiry and triage result.
        </SheetDescription>
      </SheetHeader>

      <DetailSection title="Enquiry" defaultOpen>
        <div className="grid gap-4 sm:grid-cols-2">
          <DetailItem
            label="Contact"
            value={enquiry.contactName}
            emptyLabel="Not provided"
          />
          <DetailItem
            label="Email"
            value={enquiry.email}
            emptyLabel="No email"
          />
          <DetailItem label="Source" value={sourceLabel(enquiry.source)} />
          <DetailItem label="Status" value={enquiry.status} />
          <DetailItem
            label="Property"
            value={propertyLabel}
            emptyLabel="Not linked"
          />
          <DetailItem
            label="Intent"
            value={resolvedIntent}
            emptyLabel="Not triaged yet"
          />
        </div>
      </DetailSection>

      <DetailSection title="Raw message" defaultOpen>
        <div className="whitespace-pre-wrap rounded-lg p-3 text-sm leading-6 text-slate-700">
          {enquiry.rawText}
        </div>
      </DetailSection>

      <DetailSection title="Triage result" defaultOpen>
        <div className="grid gap-4 sm:grid-cols-2">
          <DetailItem
            label="Classified intent"
            value={enquiry.triageResult?.intent}
            emptyLabel="Not triaged yet"
          />
          <DetailItem
            label="Confidence"
            value={formatConfidence(enquiry.triageResult?.confidence)}
            emptyLabel="Not triaged yet"
          />
          <DetailItem
            label="Method"
            value={enquiry.triageResult?.method}
            emptyLabel="Not triaged yet"
          />
          <DetailItem
            label="Triaged at"
            value={formatDateTime(enquiry.triageResult?.updatedAt)}
          />
        </div>
      </DetailSection>

      <DetailSection
        title="Extracted entities"
        defaultOpen={entityEntries.length > 0}
      >
        {entityEntries.length > 0 ? (
          <div className="space-y-3 pt-2">
            {entityEntries.map((entry) => (
              <div
                key={entry.key}
                className="rounded-lg border border-slate-200 px-3 py-2"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {formatLabel(entry.key)}
                </p>
                <p className="mt-1 text-sm text-slate-900">{entry.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No extracted entities yet.</p>
        )}
      </DetailSection>

      <DraftSection
        ref={draftSectionRef}
        enquiryId={enquiry.id}
        hasTriageResult={!!enquiry.triageResult}
        draftReply={draftReply}
        isDraftSaved={isDraftSaved}
        isDraftExpanded={isDraftExpanded}
        isAcceptingDraft={isAcceptingDraft}
        draftAcceptError={draftAcceptError}
        onToggleExpanded={toggleDraftExpanded}
        onDraftGenerated={handleDraftGenerated}
        onDraftBodyChange={handleDraftBodyChange}
        onCopy={() => {
          if (draftReply?.body) {
            void navigator.clipboard.writeText(draftReply.body);
            toast.success("Draft copied to clipboard");
          }
        }}
        onAccept={handleAcceptDraft}
      />
    </div>
  );
}
