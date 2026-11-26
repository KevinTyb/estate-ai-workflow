import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { EnquiryInboxTable } from "@/components/enquiryInboxTable";
import { inboxEnquiryInclude } from "@/lib/enquiries/types";

// The inbox reads live data on every request. Without this, `next build`
// prerenders the page once and serves build-time enquiries forever.
export const dynamic = "force-dynamic";

export default async function Home() {
  const enquiries = await prisma.enquiry.findMany({
    orderBy: { createdAt: "desc" },
    include: inboxEnquiryInclude,
  });

  const awaitingReply = enquiries.filter(
    (e) =>
      (e.status === "PENDING" || e.status === "DRAFTED") &&
      e.triageResult?.intent !== "SPAM",
  ).length;
  const needsReview = enquiries.filter(
    (e) => e.triageResult?.needsReview,
  ).length;
  const viewingsBooked = enquiries.filter((e) => e.bookings.length > 0).length;

  const stats = [
    { label: "Total enquiries", value: enquiries.length },
    {
      label: "Awaiting reply",
      value: awaitingReply,
      hint: "Pending or drafted, excluding spam",
    },
    {
      label: "Needs review",
      value: needsReview,
      hint: "Low-confidence or disputed triage",
    },
    { label: "Viewings booked", value: viewingsBooked },
  ];

  return (
    <main className="px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Enquiry inbox
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Triage incoming enquiries, review suggested replies and book
            viewings. Nothing is sent or booked until an agent approves it.
          </p>
        </div>

        <section
          aria-label="Inbox summary"
          className="grid grid-cols-2 gap-4 lg:grid-cols-4"
        >
          {stats.map((stat) => (
            <Card key={stat.label} className="rounded-2xl shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>{stat.label}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tracking-tight text-slate-900">
                  {stat.value}
                </p>
                {stat.hint ? (
                  <p className="mt-1 text-xs text-slate-500">{stat.hint}</p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </section>

        <Card className="overflow-hidden rounded-2xl shadow-sm">
          <CardHeader className="border-b bg-white">
            <CardTitle className="text-lg font-semibold text-slate-900">
              Inbox
            </CardTitle>
            <CardDescription>
              Select an enquiry to see its triage, draft reply, sending and
              booking.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <EnquiryInboxTable enquiries={enquiries} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
