"use client";

import { SearchIcon } from "lucide-react";
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

import {
  formatConfidence,
  formatEnumLabel,
  sourceLabel,
} from "@/lib/enquiries/helper";
import {
  EMPTY_FILTER,
  filterEnquiries,
  isFilterActive,
  type InboxFilter,
} from "@/lib/enquiries/filter";
import type { InboxEnquiry } from "@/lib/enquiries/types";
import { TONES, toneFor } from "@/lib/ui/tones";
import { EnquiryDetailSheet } from "./enquiryDetailSheet";

type EnquiryInboxTableProps = {
  enquiries: InboxEnquiry[];
};

const STATUSES = ["PENDING", "DRAFTED", "SENT", "SCHEDULED", "CLOSED"] as const;
const INTENTS = [
  "VIEWING",
  "VALUATION",
  "MAINTENANCE",
  "GENERAL",
  "SPAM",
] as const;

const controlClasses =
  "h-9 rounded-lg border border-input bg-transparent px-3 text-sm text-foreground shadow-xs outline-none dark:bg-input/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25";

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
    <div className="flex flex-col gap-3 border-b bg-card px-5 py-4 lg:flex-row lg:items-center">
      <div className="relative w-full lg:max-w-xs">
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          value={filter.query}
          onChange={(e) => onChange({ ...filter, query: e.target.value })}
          placeholder="Search enquiries"
          aria-label="Search enquiries"
          className={`${controlClasses} w-full pl-9`}
        />
      </div>
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
              {formatEnumLabel(status)}
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
              {formatEnumLabel(intent)}
            </option>
          ))}
          <option value="UNTRIAGED">Not triaged</option>
        </select>
        <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-input px-3 text-sm text-foreground shadow-xs dark:bg-input/30">
          <input
            type="checkbox"
            checked={filter.needsReviewOnly}
            onChange={(e) =>
              onChange({ ...filter, needsReviewOnly: e.target.checked })
            }
            className="size-4 accent-brand"
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
      <p
        className="text-xs text-muted-foreground lg:ml-auto"
        aria-live="polite"
      >
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
        <p className="text-sm font-medium text-foreground">No enquiries yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          New enquiries from email, web and phone will appear here. Run{" "}
          <code className="rounded bg-muted px-1">pnpm db:seed</code> to load
          the demo data.
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
          <p className="text-sm font-medium text-foreground">
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
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="h-10 px-5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Contact
                </TableHead>
                <TableHead className="h-10 px-5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Intent
                </TableHead>
                <TableHead className="h-10 px-5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Status
                </TableHead>
                <TableHead className="h-10 px-5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Property
                </TableHead>
                <TableHead className="h-10 px-5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Message
                </TableHead>
                <TableHead className="h-10 px-5 text-right text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Action
                </TableHead>
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
                    className={`cursor-pointer align-top transition-colors outline-none hover:bg-muted/50 focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50 ${
                      selectedId === enquiry.id
                        ? "bg-accent/70 ring-1 ring-inset ring-ring/30"
                        : ""
                    }`}
                  >
                    <TableCell className="px-5 py-4">
                      <div className="min-w-55 space-y-1">
                        <div className="font-medium text-foreground">
                          {enquiry.contactName ?? "Unknown"}
                        </div>
                        <div className="text-xs text-muted-foreground">
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
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${toneFor(
                              resolvedIntent,
                            )}`}
                          >
                            {formatEnumLabel(resolvedIntent)}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground/70">
                            Not triaged yet
                          </span>
                        )}

                        <div className="text-xs text-muted-foreground">
                          {confidenceText ?? null}
                        </div>
                        {enquiry.triageResult?.needsReview ? (
                          <Badge
                            variant="outline"
                            className={`rounded-full ${TONES.amber}`}
                          >
                            Needs review
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>

                    <TableCell className="px-5 py-4">
                      <Badge
                        variant="outline"
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${toneFor(
                          enquiry.status,
                        )}`}
                      >
                        {formatEnumLabel(enquiry.status)}
                      </Badge>
                    </TableCell>

                    <TableCell className="px-5 py-4 text-sm text-foreground/80">
                      {enquiry.property?.ref ?? enquiry.propertyRef ?? "—"}
                    </TableCell>

                    <TableCell className="max-w-sm px-5 py-4 text-foreground/80">
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
