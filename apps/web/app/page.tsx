import {
  CalendarCheckIcon,
  FlagIcon,
  InboxIcon,
  MailQuestionIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/pageHeader";
import { StatCard } from "@/components/statCard";
import { prisma } from "@/lib/prisma";
import { EnquiryInboxTable } from "@/components/enquiryInboxTable";
import { NewEnquiryDialog } from "@/components/newEnquiryDialog";
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
    { label: "Total enquiries", value: enquiries.length, icon: InboxIcon },
    {
      label: "Awaiting reply",
      value: awaitingReply,
      detail: "Pending or drafted, excluding spam",
      icon: MailQuestionIcon,
    },
    {
      label: "Needs review",
      value: needsReview,
      detail: "Low-confidence or disputed triage",
      icon: FlagIcon,
    },
    {
      label: "Viewings booked",
      value: viewingsBooked,
      icon: CalendarCheckIcon,
    },
  ];

  return (
    <main className="px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Enquiry inbox"
          description="Triage incoming enquiries, review suggested replies and book viewings. Nothing is sent or booked until an agent approves it."
          actions={<NewEnquiryDialog />}
        />

        <section
          aria-label="Inbox summary"
          className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
        >
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </section>

        <Card className="gap-0 py-0 shadow-xs">
          <EnquiryInboxTable enquiries={enquiries} />
        </Card>
      </div>
    </main>
  );
}
