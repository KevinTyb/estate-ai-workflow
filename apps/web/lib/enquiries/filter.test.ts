import { describe, expect, it } from "vitest";
import { EMPTY_FILTER, filterEnquiries, isFilterActive } from "./filter";

const base = {
  rawText: "",
  contactName: null,
  email: null,
  propertyRef: null,
  property: null,
  triageResult: null,
};

const enquiries = [
  {
    ...base,
    id: "a",
    rawText: "Can I view 12A Baker St?",
    contactName: "Sam Carter",
    status: "PENDING" as const,
    property: { ref: "BST-12A", address: "12A Baker Street, London" },
    triageResult: { intent: "VIEWING" as const, needsReview: false },
  },
  {
    ...base,
    id: "b",
    rawText: "Boiler is broken",
    email: "akhan@example.com",
    status: "DRAFTED" as const,
    triageResult: { intent: "MAINTENANCE" as const, needsReview: true },
  },
  { ...base, id: "c", rawText: "Hello there", status: "PENDING" as const },
];

const ids = (filter: Partial<typeof EMPTY_FILTER>) =>
  filterEnquiries(enquiries, { ...EMPTY_FILTER, ...filter }).map((e) => e.id);

describe("filterEnquiries", () => {
  it("returns everything with the empty filter", () => {
    expect(ids({})).toEqual(["a", "b", "c"]);
    expect(isFilterActive(EMPTY_FILTER)).toBe(false);
  });

  it("filters by status and intent", () => {
    expect(ids({ status: "PENDING" })).toEqual(["a", "c"]);
    expect(ids({ intent: "MAINTENANCE" })).toEqual(["b"]);
    expect(ids({ intent: "UNTRIAGED" })).toEqual(["c"]);
  });

  it("filters to enquiries that need review", () => {
    expect(ids({ needsReviewOnly: true })).toEqual(["b"]);
  });

  it("searches contact, message and property case-insensitively", () => {
    expect(ids({ query: "baker street" })).toEqual(["a"]);
    expect(ids({ query: "AKHAN" })).toEqual(["b"]);
    expect(ids({ query: "bst-12a" })).toEqual(["a"]);
    expect(ids({ query: "nothing matches" })).toEqual([]);
    expect(isFilterActive({ ...EMPTY_FILTER, query: " x " })).toBe(true);
  });
});
