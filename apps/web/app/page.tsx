import { prisma } from "@/lib/prisma";

function badgeClasses(value: string | null) {
  const base = "inline-flex rounded-full px-2 py-1 text-xs font-medium";

  switch (value) {
    case "PENDING":
      return `${base} bg-yellow-100 text-yellow-800`;
    case "DRAFTED":
      return `${base} bg-blue-100 text-blue-800`;
    case "SENT":
      return `${base} bg-green-100 text-green-800`;
    case "SCHEDULED":
      return `${base} bg-purple-100 text-purple-800`;
    case "CLOSED":
      return `${base} bg-gray-200 text-gray-800`;
    case "VIEWING":
      return `${base} bg-sky-100 text-sky-800`;
    case "VALUATION":
      return `${base} bg-indigo-100 text-indigo-800`;
    case "MAINTENANCE":
      return `${base} bg-red-100 text-red-800`;
    case "GENERAL":
      return `${base} bg-gray-100 text-gray-700`;
    case "SPAM":
      return `${base} bg-pink-100 text-pink-800`;
    default:
      return `${base} bg-gray-100 text-gray-700`;
  }
}

export default async function Home() {
  const enquiries = await prisma.enquiry.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-gray-900">
            Estate AI Workflow
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Seeded enquiry inbox for the MVP.
          </p>
        </div>

        <div className="mb-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Total enquiries</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {enquiries.length}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {enquiries.filter((e) => e.status === "PENDING").length}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Viewing requests</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {enquiries.filter((e) => e.intent === "VIEWING").length}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="text-lg font-medium text-gray-900">Inbox</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-gray-50 text-sm text-gray-600">
                <tr>
                  <th className="px-5 py-3 font-medium">Contact</th>
                  <th className="px-5 py-3 font-medium">Intent</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Source</th>
                  <th className="px-5 py-3 font-medium">Property Ref</th>
                  <th className="px-5 py-3 font-medium">Message</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 text-sm">
                {enquiries.map((enquiry) => (
                  <tr key={enquiry.id} className="align-top hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-900">
                        {enquiry.contactName ?? "Unknown"}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {enquiry.email ?? "No email"}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className={badgeClasses(enquiry.intent)}>
                        {enquiry.intent ?? "—"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className={badgeClasses(enquiry.status)}>
                        {enquiry.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 capitalize text-gray-700">
                      {enquiry.source}
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      {enquiry.propertyRef ?? "—"}
                    </td>

                    <td className="max-w-md px-5 py-4 text-gray-700">
                      {enquiry.rawText}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {enquiries.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-gray-500">
              No enquiries found.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
