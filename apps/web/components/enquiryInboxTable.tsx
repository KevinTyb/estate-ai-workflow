"use client";

import { useState } from "react";
import { TriageButton } from "@/components/triageButton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { EnquiryDetailSheet } from "./enquiryDetailSheet";
import { formatConfidence, sourceLabel } from "@/lib/enquiries/helper";
import { DraftResponse } from "./draftTypes";

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

export function EnquiryInboxTable({ enquiries }: EnquiryInboxTableProps) {
  const [selectedEnquiry, setSelectedEnquiry] =
    useState<EnquiryWithTriage | null>(null);

  const [, setDraftReply] = useState<DraftResponse | null>(null);

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
              <TableHead className="px-5 py-3 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {enquiries.map((enquiry) => {
              const resolvedIntent = enquiry.triageResult?.intent ?? null;

              const confidenceText = formatConfidence(
                enquiry.triageResult?.confidence,
              );

              return (
                <TableRow
                  key={enquiry.id}
                  onClick={() => {
                    setSelectedEnquiry(enquiry);
                    setDraftReply(null);
                  }}
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

      <EnquiryDetailSheet
        selectedEnquiry={selectedEnquiry}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEnquiry(null);
          }
        }}
      />
    </>
  );
}
