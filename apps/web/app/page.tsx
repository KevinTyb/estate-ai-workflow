import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { EnquiryInboxTable } from "@/components/enquiryInboxTable";

export default async function Home() {
  const enquiries = await prisma.enquiry.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      triageResult: true,
    },
  });

  const totalEnquiries = enquiries.length;
  const pendingCount = enquiries.filter((e) => e.status === "PENDING").length;
  const viewingCount = enquiries.filter(
    (e) => (e.triageResult?.intent ?? e.intent) === "VIEWING",
  ).length;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Estate AI Workflow
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Seeded enquiry inbox for the MVP.
          </p>
        </div>

        <section className="grid gap-4 sm:grid-cols-3">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription>Total enquiries</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight text-slate-900">
                {totalEnquiries}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription>Pending</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight text-slate-900">
                {pendingCount}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription>Viewing requests</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight text-slate-900">
                {viewingCount}
              </p>
            </CardContent>
          </Card>
        </section>

        <Card className="overflow-hidden rounded-2xl shadow-sm">
          <CardHeader className="border-b bg-white">
            <CardTitle className="text-lg font-semibold text-slate-900">
              Inbox
            </CardTitle>
            <CardDescription>
              Review and triage incoming enquiries.
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
