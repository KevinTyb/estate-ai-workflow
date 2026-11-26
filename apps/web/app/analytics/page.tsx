import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight text-slate-900">
          {value}
        </p>
        {detail ? (
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        ) : null}
      </CardContent>
    </Card>
  );
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
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-3">
          {rows.map(([label, count]) => (
            <div key={label} className="space-y-1">
              <div className="flex justify-between text-sm">
                <dt className="text-slate-600">{label}</dt>
                <dd className="font-medium tabular-nums text-slate-900">
                  {count}
                </dd>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100" aria-hidden>
                <div
                  className="h-1.5 rounded-full bg-sky-500"
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
    <main className="px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Analytics
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Calculated from recorded replies, bookings and their timestamps,
              for enquiries received in the selected period.
            </p>
          </div>
          <nav
            aria-label="Date range"
            className="flex gap-1 rounded-lg bg-white p-1 shadow-sm"
          >
            {(Object.keys(RANGES) as RangeKey[]).map((key) => (
              <Link
                key={key}
                href={key === "all" ? "/analytics" : `/analytics?range=${key}`}
                aria-current={range === key ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100",
                  range === key && "bg-slate-900 text-white hover:bg-slate-900",
                )}
              >
                {RANGES[key].label}
              </Link>
            ))}
          </nav>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Total enquiries"
            value={m.totals.enquiries}
            detail={`${percent(m.rates.triageCoverage)} triaged`}
          />
          <Stat
            label="Drafts approved"
            value={m.totals.draftsApproved}
            detail={`${percent(m.rates.draftsApprovedUnedited)} approved without edits`}
          />
          <Stat
            label="Replies sent"
            value={m.totals.replied}
            detail={`${percent(m.rates.replyRate)} of non-spam enquiries`}
          />
          <Stat
            label="Viewings booked"
            value={m.totals.viewingsBooked}
            detail={`${m.totals.bookingsCancelled} cancelled`}
          />
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
