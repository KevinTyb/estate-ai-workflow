import Link from "next/link";
import {
  CalendarCheckIcon,
  CheckCheckIcon,
  InboxIcon,
  SendIcon,
} from "lucide-react";
import { PageHeader } from "@/components/pageHeader";
import { StatCard as Stat } from "@/components/statCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadMetrics } from "@/lib/analytics/loadMetrics";
import type { DurationStats } from "@/lib/analytics/metrics";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const RANGES = {
  all: { label: "All time", days: null },
  "30d": { label: "Last 30 days", days: 30 },
  "7d": { label: "Last 7 days", days: 7 },
} as const;

type RangeKey = keyof typeof RANGES;

function rangeStart(days: number | null) {
  return days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : undefined;
}

function percent(value: number | null) {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

function duration(minutes: number | null) {
  if (minutes === null) return "—";
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 60 * 24) return `${(minutes / 60).toFixed(1)} h`;
  return `${(minutes / 60 / 24).toFixed(1)} days`;
}

function durationDetail(stats: DurationStats, noun: string) {
  return stats.count === 0
    ? `No ${noun} yet`
    : `Median of ${stats.count} · average ${duration(stats.averageMinutes)}`;
}

function Breakdown({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, number]>;
}) {
  const total = rows.reduce((sum, [, n]) => sum + n, 0);
  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-3">
          {rows.map(([label, count]) => (
            <div key={label} className="space-y-1">
              <div className="flex justify-between text-sm">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium tabular-nums text-foreground">
                  {count}
                </dd>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-muted"
                aria-hidden
              >
                <div
                  className="h-1.5 rounded-full bg-brand"
                  style={{ width: total ? `${(count / total) * 100}%` : 0 }}
                />
              </div>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rawRange } = await searchParams;
  const range: RangeKey =
    rawRange && rawRange in RANGES ? (rawRange as RangeKey) : "all";
  const m = await loadMetrics({ since: rangeStart(RANGES[range].days) });

  return (
    <main className="px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Analytics"
          description="Calculated from recorded replies, bookings and their timestamps, for enquiries received in the selected period."
          actions={
            <nav
              aria-label="Date range"
              className="flex gap-1 rounded-lg border border-border bg-card p-1 shadow-xs"
            >
              {(Object.keys(RANGES) as RangeKey[]).map((key) => (
                <Link
                  key={key}
                  href={
                    key === "all" ? "/analytics" : `/analytics?range=${key}`
                  }
                  aria-current={range === key ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
                    range === key &&
                      "bg-primary text-primary-foreground hover:bg-primary",
                  )}
                >
                  {RANGES[key].label}
                </Link>
              ))}
            </nav>
          }
        />

        <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Stat
            label="Total enquiries"
            icon={InboxIcon}
            value={m.totals.enquiries}
            detail={`${percent(m.rates.triageCoverage)} triaged`}
          />
          <Stat
            label="Drafts approved"
            icon={CheckCheckIcon}
            value={m.totals.draftsApproved}
            detail={`${percent(m.rates.draftsApprovedUnedited)} approved without edits`}
          />
          <Stat
            label="Replies sent"
            icon={SendIcon}
            value={m.totals.replied}
            detail={`${percent(m.rates.replyRate)} of non-spam enquiries`}
          />
          <Stat
            label="Viewings booked"
            icon={CalendarCheckIcon}
            value={m.totals.viewingsBooked}
            detail={`${m.totals.bookingsCancelled} cancelled`}
          />
        </section>

        <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Stat
            label="Median first response"
            value={duration(m.firstResponse.medianMinutes)}
            detail={durationDetail(m.firstResponse, "replies")}
          />
          <Stat
            label="Answered within 1 hour"
            value={percent(m.rates.respondedWithinHour)}
            detail="Of enquiries that received a reply"
          />
          <Stat
            label="Viewing conversion"
            value={percent(m.rates.viewingConversion)}
            detail="Viewing enquiries with a confirmed viewing"
          />
          <Stat
            label="Median time to booking"
            value={duration(m.timeToBooking.medianMinutes)}
            detail={durationDetail(m.timeToBooking, "bookings")}
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Breakdown
            title="Enquiries by intent"
            rows={[
              ["Viewing", m.byIntent.VIEWING],
              ["Valuation", m.byIntent.VALUATION],
              ["Maintenance", m.byIntent.MAINTENANCE],
              ["General", m.byIntent.GENERAL],
              ["Spam", m.byIntent.SPAM],
              ["Not triaged", m.byIntent.UNTRIAGED],
            ]}
          />
          <Breakdown
            title="Enquiries by status"
            rows={[
              ["Pending", m.byStatus.PENDING],
              ["Drafted", m.byStatus.DRAFTED],
              ["Sent", m.byStatus.SENT],
              ["Scheduled", m.byStatus.SCHEDULED],
              ["Closed", m.byStatus.CLOSED],
            ]}
          />
        </section>
      </div>
    </main>
  );
}
