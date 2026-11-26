"use client";

import { useMemo, useState } from "react";
import { TriageButton } from "@/components/triageButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { formatConfidence, sourceLabel } from "@/lib/enquiries/helper";
import {
  EMPTY_FILTER,
  filterEnquiries,
  isFilterActive,
  type InboxFilter,
} from "@/lib/enquiries/filter";
import type { InboxEnquiry } from "@/lib/enquiries/types";
import { EnquiryDetailSheet } from "./enquiryDetailSheet";

type EnquiryInboxTableProps = {
  enquiries: InboxEnquiry[];
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

const STATUSES = ["PENDING", "DRAFTED", "SENT", "SCHEDULED", "CLOSED"] as const;
const INTENTS = [
  "VIEWING",
  "VALUATION",
  "MAINTENANCE",
  "GENERAL",
  "SPAM",
] as const;

const controlClasses =
  "h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus-visible:border-sky-400 focus-visible:ring-3 focus-visible:ring-sky-100";

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function InboxToolbar({
  filter,
  onChange,
  shown,
  total,
}: {
  filter: InboxFilter;
  onChange: (filter: InboxFilter) => void;
  shown: number;
  total: number;
}) {
  return (
    <div className="flex flex-col gap-3 border-b bg-white px-5 py-4 lg:flex-row lg:items-center">
      <input
        type="search"
        value={filter.query}
        onChange={(e) => onChange({ ...filter, query: e.target.value })}
        placeholder="Search name, email, message or property"
        aria-label="Search enquiries"
        className={`${controlClasses} w-full lg:max-w-xs`}
      />
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filter.status}
          onChange={(e) =>
            onChange({
              ...filter,
              status: e.target.value as InboxFilter["status"],
            })
          }
          aria-label="Filter by status"
          className={controlClasses}
        >
          <option value="ALL">All statuses</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {titleCase(status)}
            </option>
          ))}
        </select>
        <select
          value={filter.intent}
          onChange={(e) =>
            onChange({
              ...filter,
              intent: e.target.value as InboxFilter["intent"],
            })
          }
          aria-label="Filter by intent"
          className={controlClasses}
        >
          <option value="ALL">All intents</option>
          {INTENTS.map((intent) => (
            <option key={intent} value={intent}>
              {titleCase(intent)}
            </option>
          ))}
          <option value="UNTRIAGED">Not triaged</option>
        </select>
        <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={filter.needsReviewOnly}
            onChange={(e) =>
              onChange({ ...filter, needsReviewOnly: e.target.checked })
            }
            className="size-4 accent-sky-600"
          />
          Needs review
        </label>
        {isFilterActive(filter) ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(EMPTY_FILTER)}
          >
            Clear filters
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-slate-500 lg:ml-auto" aria-live="polite">
        Showing {shown} of {total}
      </p>
    </div>
  );
}

export function EnquiryInboxTable({ enquiries }: EnquiryInboxTableProps) {
  // Track the id, not the object, so the open panel shows fresh data after
  // router.refresh() re-renders the inbox with updated enquiries.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<InboxFilter>(EMPTY_FILTER);
  const selectedEnquiry =
    enquiries.find((enquiry) => enquiry.id === selectedId) ?? null;
  const visible = useMemo(
    () => filterEnquiries(enquiries, filter),
    [enquiries, filter],
  );

  if (enquiries.length === 0) {
    return (
      <div className="px-6 py-14 text-center">
        <p className="text-sm font-medium text-slate-900">No enquiries yet</p>
        <p className="mt-1 text-sm text-slate-500">
          New enquiries from email, web and phone will appear here. Run{" "}
          <code className="rounded bg-slate-100 px-1">pnpm db:seed</code> to
          load the demo data.
        </p>
      </div>
    );
  }

  return (
    <>
      <InboxToolbar
        filter={filter}
        onChange={setFilter}
        shown={visible.length}
        total={enquiries.length}
      />
      {visible.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <p className="text-sm font-medium text-slate-900">
            No enquiries match these filters
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setFilter(EMPTY_FILTER)}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="px-5 py-3">Contact</TableHead>
                <TableHead className="px-5 py-3">Intent</TableHead>
                <TableHead className="px-5 py-3">Status</TableHead>
                <TableHead className="px-5 py-3">Property</TableHead>
                <TableHead className="px-5 py-3">Message</TableHead>
                <TableHead className="px-5 py-3 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {visible.map((enquiry) => {
                const resolvedIntent = enquiry.triageResult?.intent ?? null;

                const confidenceText = formatConfidence(
                  enquiry.triageResult?.confidence,
                );

                return (
                  <TableRow
                    key={enquiry.id}
                    onClick={() => setSelectedId(enquiry.id)}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(enquiry.id);
                      }
                    }}
                    tabIndex={0}
                    aria-label={`Open enquiry from ${enquiry.contactName ?? "unknown contact"}`}
                    className={`cursor-pointer align-top transition-colors outline-none hover:bg-slate-50 focus-visible:bg-sky-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-300 ${
                      selectedId === enquiry.id
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
                        {resolvedIntent ? (
                          <Badge
                            variant="outline"
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClasses(
                              resolvedIntent,
                            )}`}
                          >
                            {resolvedIntent}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Not triaged yet
                          </span>
                        )}

                        <div className="text-xs text-slate-500">
                          {confidenceText ?? null}
                        </div>
                        {enquiry.triageResult?.needsReview ? (
                          <Badge
                            variant="outline"
                            className="rounded-full border-amber-200 bg-amber-50 text-amber-700"
                          >
                            Needs review
                          </Badge>
                        ) : null}
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
                      {enquiry.property?.ref ?? enquiry.propertyRef ?? "—"}
                    </TableCell>

                    <TableCell className="max-w-sm px-5 py-4 text-slate-700">
                      <p className="max-w-90 truncate text-sm">
                        {enquiry.rawText}
                      </p>
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
      )}

      <EnquiryDetailSheet
        selectedEnquiry={selectedEnquiry}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      />
    </>
  );
}
