"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import {
  formatConfidence,
  getEntityEntries,
  getEntityPills,
  sourceLabel,
} from "@/lib/enquiries/helper";
import { DetailSection } from "./detailSection";

import { toast } from "sonner";
import { DraftSection } from "./draftSection";
import { useEnquiryDetailSheet } from "@/hooks/useEnquiryDetailSheet";
import { useMemo } from "react";

type EnquiryWithTriage = {
  id: string;
  contactName: string | null;
  email: string | null;
  source: string;
  status: string;
  intent: string | null;
  propertyRef: string | null;
  rawText: string;
  createdAt: Date;
  triageResult: {
    id: string;
    intent: string | null;
    confidence: number | null;
    entities: unknown;
    method: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
};

type EnquiryDetailSheetProps = {
  selectedEnquiry: EnquiryWithTriage | null;
  onOpenChange: (open: boolean) => void;
};

function formatLabel(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

function DetailItem({
  label,
  value,
  emptyLabel = "Not Available",
}: {
  label: string;
  value: string | null | undefined;
  emptyLabel?: string;
}) {
  const hasValue = value != null && value !== "";
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="text-sm text-slate-900">{hasValue ? value : emptyLabel}</p>
    </div>
  );
}

function formatDateTime(value: Date | null | undefined) {
  if (!value) return "Not triaged yet";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export function EnquiryDetailSheet({
  selectedEnquiry,
  onOpenChange,
}: EnquiryDetailSheetProps) {
  const {
    draftReply,
    isDraftExpanded,
    isAcceptingDraft,
    draftAcceptError,
    sheetContentRef,

    handleAcceptDraft,
    handleDraftBodyChange,
    handleDraftGenerated,
    toggleDraftExpanded,
    resetDraftState,
  } = useEnquiryDetailSheet({ selectedEnquiry });
  const selectedEntityEntries = useMemo(() => {
    return getEntityEntries(selectedEnquiry?.triageResult?.entities);
  }, [selectedEnquiry]);

  const selectedEntityPills = useMemo(() => {
    return getEntityPills(selectedEnquiry?.triageResult?.entities);
  }, [selectedEnquiry]);

  const resolvedIntent =
    selectedEnquiry?.triageResult?.intent ?? selectedEnquiry?.intent ?? null;
  return (
    <Sheet
      open={!!selectedEnquiry}
      onOpenChange={(open: boolean) => {
        if (!open) {
          resetDraftState();
        }
        onOpenChange(open);
      }}
    >
      <SheetContent
        ref={sheetContentRef}
        className="w-full overflow-y-auto p-2 sm:max-w-xl"
      >
        {selectedEnquiry ? (
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
                  value={selectedEnquiry.contactName}
                  emptyLabel="Not Provided"
                />
                <DetailItem
                  label="Email"
                  value={selectedEnquiry.email}
                  emptyLabel="No Email"
                />
                <DetailItem
                  label="Source"
                  value={sourceLabel(selectedEnquiry.source)}
                  emptyLabel="Not Provided"
                />
                <DetailItem label="Status" value={selectedEnquiry.status} />
                <DetailItem
                  label="Property ref"
                  value={selectedEnquiry.propertyRef}
                  emptyLabel="Not Provided"
                />
                <DetailItem
                  label="Intent"
                  value={resolvedIntent}
                  emptyLabel="Not Provided"
                />
              </div>
            </DetailSection>

            <DetailSection title="Raw message" defaultOpen>
              <div className="rounded-lg p-3 text-sm leading-6 text-slate-700">
                {selectedEnquiry.rawText}
              </div>
            </DetailSection>

            <DetailSection title="Triage result" defaultOpen>
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailItem
                  label="Classified intent"
                  value={resolvedIntent ?? "Not triaged yet"}
                />
                <DetailItem
                  label="Confidence"
                  value={
                    formatConfidence(
                      selectedEnquiry.triageResult?.confidence,
                    ) ?? "Not triaged yet"
                  }
                />
                <DetailItem
                  label="Method"
                  value={
                    selectedEnquiry.triageResult?.method ?? "Not triaged yet"
                  }
                />
                <DetailItem
                  label="Triaged at"
                  value={formatDateTime(
                    selectedEnquiry.triageResult?.updatedAt,
                  )}
                />
              </div>
            </DetailSection>

            <DetailSection
              title="Extracted entities"
              defaultOpen={selectedEntityPills.length > 0}
            >
              {selectedEntityPills.length > 0 ? (
                <>
                  <div className="space-y-3 pt-2">
                    {selectedEntityEntries.map((entry) => (
                      <div
                        key={entry.key}
                        className="rounded-lg border border-slate-200 px-3 py-2"
                      >
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          {formatLabel(entry.key)}
                        </p>
                        <p className="mt-1 text-sm text-slate-900">
                          {entry.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500">
                  No extracted entities yet.
                </p>
              )}
            </DetailSection>

            <DraftSection
              enquiryId={selectedEnquiry.id}
              hasTriageResult={!!selectedEnquiry.triageResult}
              draftReply={draftReply}
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
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
