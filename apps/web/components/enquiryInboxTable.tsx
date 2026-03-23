"use client";

import { useMemo, useState } from "react";
import { TriageButton } from "@/components/triageButton";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

type EnquiryInboxTableProps = {
  enquiries: EnquiryWithTriage[];
};

function badgeClasses(value: string | null) {
  switch (value) {
    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50";
    case "DRAFTED":
      return "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50";
    case "SENT":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
    case "SCHEDULED":
      return "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-50";
    case "CLOSED":
      return "border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-100";
    case "VIEWING":
      return "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-50";
    case "VALUATION":
      return "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-50";
    case "MAINTENANCE":
      return "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-50";
    case "GENERAL":
      return "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-100";
    case "SPAM":
      return "border-pink-200 bg-pink-50 text-pink-700 hover:bg-pink-50";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-100";
  }
}

function sourceLabel(source: string) {
  return source.charAt(0).toUpperCase() + source.slice(1).toLowerCase();
}

function getEntityPills(entities: unknown): string[] {
  if (!entities || typeof entities !== "object") return [];

  const record = entities as Record<string, unknown>;
  const pills: string[] = [];

  if (typeof record.propertyRef === "string" && record.propertyRef) {
    pills.push(record.propertyRef);
  }

  if (typeof record.budgetPcm === "number") {
    pills.push(`£${record.budgetPcm} pcm`);
  }

  if (typeof record.email === "string" && record.email) {
    pills.push(record.email);
  }

  if (typeof record.phone === "string" && record.phone) {
    pills.push(record.phone);
  }

  if (Array.isArray(record.dates)) {
    for (const date of record.dates) {
      if (typeof date === "string" && date) {
        pills.push(date);
      }
    }
  }

  return pills;
}

function getVisibleEntityPills(pills: string[], max = 2) {
  return {
    visible: pills.slice(0, max),
    remaining: Math.max(pills.length - max, 0),
  };
}

function formatConfidence(confidence: number | null | undefined) {
  if (confidence == null) return null;
  return `${Math.round(confidence * 100)}% confidence`;
}

function formatLabel(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

function getEntityEntries(
  entities: unknown,
): Array<{ key: string; value: string }> {
  if (!entities || typeof entities !== "object") return [];

  const record = entities as Record<string, unknown>;
  const entries: Array<{ key: string; value: string }> = [];

  for (const [key, value] of Object.entries(record)) {
    if (value == null) continue;

    if (Array.isArray(value)) {
      const cleaned = value.filter(Boolean).map(String);
      if (cleaned.length > 0) {
        entries.push({
          key,
          value: cleaned.join(", "),
        });
      }
      continue;
    }

    if (typeof value === "number" && key === "budgetPcm") {
      entries.push({
        key,
        value: `£${value} pcm`,
      });
      continue;
    }

    if (typeof value === "string" || typeof value === "number") {
      entries.push({
        key,
        value: String(value),
      });
    }
  }

  return entries;
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
  if (!value) return "Not Available";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export function EnquiryInboxTable({ enquiries }: EnquiryInboxTableProps) {
  const [selectedEnquiry, setSelectedEnquiry] =
    useState<EnquiryWithTriage | null>(null);

  const selectedEntityEntries = useMemo(() => {
    return getEntityEntries(selectedEnquiry?.triageResult?.entities);
  }, [selectedEnquiry]);

  const selectedEntityPills = useMemo(() => {
    return getEntityPills(selectedEnquiry?.triageResult?.entities);
  }, [selectedEnquiry]);

  if (enquiries.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-slate-500">
        No enquiries found.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="px-5 py-3">Contact</TableHead>
              <TableHead className="px-5 py-3">Intent</TableHead>
              <TableHead className="px-5 py-3">Status</TableHead>
              <TableHead className="px-5 py-3">Property</TableHead>
              <TableHead className="px-5 py-3">Message</TableHead>
              <TableHead className="px-5 py-3">Extracted</TableHead>
              <TableHead className="px-5 py-3 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {enquiries.map((enquiry) => {
              const resolvedIntent =
                enquiry.triageResult?.intent ?? enquiry.intent;

              const confidenceText = formatConfidence(
                enquiry.triageResult?.confidence,
              );

              const pills = getEntityPills(enquiry.triageResult?.entities);
              const { visible, remaining } = getVisibleEntityPills(pills, 2);

              return (
                <TableRow
                  key={enquiry.id}
                  onClick={() => setSelectedEnquiry(enquiry)}
                  className={`cursor-pointer align-top transition-colors hover:bg-slate-50 ${
                    selectedEnquiry?.id === enquiry.id
                      ? "bg-sky-50/70 ring-1 ring-inset ring-sky-200"
                      : ""
                  }`}
                >
                  <TableCell className="px-5 py-4">
                    <div className="min-w-55 space-y-1">
                      <div className="font-medium text-slate-900">
                        {enquiry.contactName ?? "Unknown"}
                      </div>
                      <div className="text-xs text-slate-500">
                        <span>{enquiry.email ?? "No email"}</span>
                        <span className="mx-1">·</span>
                        <span>{sourceLabel(enquiry.source)}</span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="px-5 py-4">
                    <div className="min-w-35 space-y-1">
                      <Badge
                        variant="outline"
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClasses(
                          resolvedIntent,
                        )}`}
                      >
                        {resolvedIntent ?? "—"}
                      </Badge>

                      <div className="text-xs text-slate-500">
                        {confidenceText ?? "Not triaged yet"}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="px-5 py-4">
                    <Badge
                      variant="outline"
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClasses(
                        enquiry.status,
                      )}`}
                    >
                      {enquiry.status}
                    </Badge>
                  </TableCell>

                  <TableCell className="px-5 py-4 text-sm text-slate-700">
                    {enquiry.propertyRef ?? "—"}
                  </TableCell>

                  <TableCell className="max-w-sm px-5 py-4 text-slate-700">
                    <p className="max-w-90 truncate text-sm">
                      {enquiry.rawText}
                    </p>
                  </TableCell>

                  <TableCell className="px-5 py-4">
                    {visible.length > 0 ? (
                      <div className="flex max-w-55 flex-wrap gap-2">
                        {visible.map((pill) => (
                          <Badge
                            key={pill}
                            variant="secondary"
                            className="rounded-full px-2 py-0.5 text-xs"
                          >
                            {pill}
                          </Badge>
                        ))}

                        {remaining > 0 ? (
                          <span className="self-center text-xs font-medium text-slate-500">
                            +{remaining} more
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">—</span>
                    )}
                  </TableCell>

                  <TableCell className="px-5 py-4 text-right">
                    <TriageButton
                      enquiryId={enquiry.id}
                      triaged={!!enquiry.triageResult}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Sheet
        open={!!selectedEnquiry}
        onOpenChange={(open) => {
          if (!open) setSelectedEnquiry(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl p-2">
          {selectedEnquiry ? (
            <div className="space-y-6">
              <SheetHeader className="text-left">
                <SheetTitle>Enquiry details</SheetTitle>
                <SheetDescription>
                  Review the full enquiry and triage result.
                </SheetDescription>
              </SheetHeader>

              <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  Enquiry
                </h3>

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
                    value={
                      selectedEnquiry.triageResult?.intent ??
                      selectedEnquiry.intent
                    }
                    emptyLabel="Not Provided"
                  />
                </div>
              </section>

              <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  Raw message
                </h3>
                <div className="rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                  {selectedEnquiry.rawText}
                </div>
              </section>

              <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  Triage result
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailItem
                    label="Classified intent"
                    value={
                      selectedEnquiry.triageResult?.intent ??
                      selectedEnquiry.intent ??
                      "—"
                    }
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
                    value={selectedEnquiry.triageResult?.method ?? "—"}
                  />
                  <DetailItem
                    label="Triaged at"
                    value={formatDateTime(
                      selectedEnquiry.triageResult?.updatedAt,
                    )}
                  />
                </div>
              </section>

              <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  No Extracted Entities Yet.
                </h3>

                {selectedEntityPills.length > 0 ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {selectedEntityPills.map((pill) => (
                        <Badge
                          key={pill}
                          variant="secondary"
                          className="rounded-full px-2.5 py-1 text-xs"
                        >
                          {pill}
                        </Badge>
                      ))}
                    </div>
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
                    No extracted Entities yet.
                  </p>
                )}
              </section>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
