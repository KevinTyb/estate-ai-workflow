import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/enquiries/route";
import { prisma } from "@/lib/prisma";
import { createProperty, resetDb } from "./fixtures";

// Keep intake tests deterministic: rule engine only, no network.
vi.stubEnv("AI_MODE", "rules");

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/enquiries", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );

describe("POST /api/enquiries", () => {
  it("saves a new enquiry and triages it straight away", async () => {
    const property = await createProperty("BST-12A");

    const res = await post({
      contactName: "Sam Carter",
      email: "sam@example.com",
      source: "email",
      rawText: "Hi, can I book a viewing of BST-12A on Saturday?",
    });

    expect(res.status).toBe(201);
    const { id, triaged } = await res.json();
    expect(triaged).toBe(true);
    expect(
      await prisma.enquiry.findUnique({
        where: { id },
        include: { triageResult: true },
      }),
    ).toMatchObject({
      status: "PENDING",
      intent: "VIEWING",
      propertyId: property.id,
      triageResult: { intent: "VIEWING", method: "rules" },
    });
  });

  it("rejects invalid input without saving anything", async () => {
    const res = await post({ contactName: "Sam", rawText: "Hello there" });

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      code: "VALIDATION_FAILED",
      error: "Enter an email address or phone number",
    });
    expect(await prisma.enquiry.count()).toBe(0);
  });
});
