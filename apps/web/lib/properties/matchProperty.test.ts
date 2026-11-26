import { describe, expect, it } from "vitest";
import { matchProperty, type PropertyCandidate } from "./matchProperty";

const properties: PropertyCandidate[] = [
  {
    id: "p1",
    ref: "BST-12A",
    address: "12A Baker Street, London",
    postcode: "NW1 6XE",
  },
  {
    id: "p2",
    ref: "W12-33",
    address: "33 Wood Lane, London",
    postcode: "W12 7DT",
  },
  {
    id: "p3",
    ref: "CLP-07",
    address: "7 Clapton Common, London",
    postcode: "E5 9AA",
  },
  {
    id: "p4",
    ref: "CLP-08",
    address: "8 Clapton Common, London",
    postcode: "E5 9AA",
  },
];

const none = { propertyRef: null, postcode: null };

describe("matchProperty", () => {
  it("matches by explicit reference, case-insensitively", () => {
    expect(
      matchProperty("", { propertyRef: "clp-07", postcode: null }, properties),
    ).toEqual({ property: properties[2], matchedBy: "ref" });
  });

  // Regression: the seeded enquiry "can I view 12A Baker St" never linked.
  it("matches an abbreviated street address", () => {
    expect(
      matchProperty(
        "Hi, can I view 12A Baker St this Friday?",
        none,
        properties,
      ),
    ).toEqual({ property: properties[0], matchedBy: "address" });
  });

  it("matches a full street name", () => {
    expect(
      matchProperty("Is 33 wood lane still free?", none, properties)?.property
        .id,
    ).toBe("p2");
  });

  it("does not match a different house number on the same street", () => {
    expect(
      matchProperty("Can I see 9 Clapton Common?", none, properties),
    ).toBeNull();
  });

  it("matches a postcode only when it is unique", () => {
    expect(
      matchProperty("", { propertyRef: null, postcode: "NW16XE" }, properties)
        ?.property.id,
    ).toBe("p1");
    expect(
      matchProperty("", { propertyRef: null, postcode: "E5 9AA" }, properties),
    ).toBeNull();
  });

  it("falls back to the address when the reference is unknown", () => {
    expect(
      matchProperty(
        "Re ZZZ-1: 12a baker street please",
        { propertyRef: "ZZZ-1", postcode: null },
        properties,
      )?.matchedBy,
    ).toBe("address");
  });
});
