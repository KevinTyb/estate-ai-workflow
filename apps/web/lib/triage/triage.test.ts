import { describe, expect, it } from "vitest";
import { classifyIntent } from "./classify";
import { extractEntities } from "./extract";
import { runRuleBasedTriage } from "./index";

describe("classifyIntent", () => {
  it.each([
    ["Hi, can I view 12A Baker St this Friday?", "VIEWING"],
    ["Can I view CLP-07 this Saturday? My budget is £2200pcm.", "VIEWING"],
    ["I'd like to book a viewing for the flat on Wood Lane", "VIEWING"],
    ["Boiler making noises, need urgent help.", "MAINTENANCE"],
    ["There is mould in the bathroom and the tap is dripping", "MAINTENANCE"],
    ["Interested in a valuation for my flat in Enfield.", "VALUATION"],
    ["How much is my 2 bed house worth? Thinking of selling.", "VALUATION"],
    ["Buy crypto now!!! Click here for guaranteed returns", "SPAM"],
    ["What are your office opening hours?", "GENERAL"],
  ])("classifies %j as %s", (text, expected) => {
    expect(classifyIntent(text).intent).toBe(expected);
  });

  // Regressions: substring matching used to misfire on these.
  it("does not treat 'review' as a viewing request", () => {
    expect(
      classifyIntent("Could you review my tenancy agreement?").intent,
    ).toBe("GENERAL");
  });

  it("does not treat a heating question as maintenance when booking a viewing", () => {
    expect(
      classifyIntent(
        "Does the flat have gas central heating? I'd like to book a viewing.",
      ).intent,
    ).toBe("VIEWING");
  });

  it("does not match 'tap' inside other words", () => {
    expect(
      classifyIntent("Is the flat near a good metaphorical park?").intent,
    ).toBe("GENERAL");
  });

  it("prefers maintenance over viewing when both score equally", () => {
    const result = classifyIntent(
      "Urgent: leak in the kitchen, can someone visit?",
    );
    expect(result.intent).toBe("MAINTENANCE");
  });
});

describe("extractEntities", () => {
  it.each([
    ["Boiler making noises at W12-33, need help", "W12-33"],
    ["Is BST-12A still available?", "BST-12A"],
    ["Interested in enf-88", "ENF-88"],
    ["Can I view CLP-07 this Saturday?", "CLP-07"],
    ["Ref SW1A-4 please", "SW1A-4"],
    ["Any news on HAC-04?", "HAC-04"],
  ])("finds the property reference in %j", (text, ref) => {
    expect(extractEntities(text).propertyRef).toBe(ref);
  });

  it.each([
    "Call me on 020-7946 0018",
    "My postcode is W12 8QT",
    "Flat 12-14 on the high street",
  ])("does not mistake %j for a property reference", (text) => {
    expect(extractEntities(text).propertyRef).toBeNull();
  });

  it("extracts a full set of entities", () => {
    const entities = extractEntities(
      "Hi, can I view BST-12A next Friday? Budget £1,700 pcm. Email sam@example.com or call 07700 900123. I live in NW1 6XE.",
    );
    expect(entities).toEqual({
      email: "sam@example.com",
      phone: "07700 900123",
      propertyRef: "BST-12A",
      postcode: "NW1 6XE",
      dates: ["next friday"],
      budgetPcm: 1700,
    });
  });

  it("does not read house numbers or phone numbers as a budget", () => {
    expect(extractEntities("Flat 1203, call 07700900123").budgetPcm).toBeNull();
  });

  it("converts weekly rent to monthly", () => {
    expect(extractEntities("Budget is £400 pw").budgetPcm).toBe(1733);
  });

  it("supports shorthand thousands", () => {
    expect(extractEntities("up to £1.8k per month").budgetPcm).toBe(1800);
  });

  it("ignores sale prices", () => {
    expect(extractEntities("Is my flat worth £450,000?").budgetPcm).toBeNull();
  });

  it("finds UK landline and +44 mobile numbers", () => {
    expect(extractEntities("Call 020 7946 0958").phone).toBe("020 7946 0958");
    expect(extractEntities("Call +44 7700 900123").phone).toBe(
      "+44 7700 900123",
    );
  });

  it("captures several date phrases without duplicates", () => {
    expect(
      extractEntities(
        "Free this weekend, tomorrow or on 12/03, maybe 14th March",
      ).dates,
    ).toEqual(["tomorrow", "this weekend", "12/03", "14th march"]);
  });

  it("returns empty values for plain text", () => {
    expect(extractEntities("hello")).toEqual({
      email: null,
      phone: null,
      propertyRef: null,
      postcode: null,
      dates: [],
      budgetPcm: null,
    });
  });
});

describe("runRuleBasedTriage confidence", () => {
  it("is low when nothing matched", () => {
    expect(runRuleBasedTriage("Hello there").confidence).toBeLessThan(0.5);
  });

  it("is high for a clear, single-intent message", () => {
    expect(
      runRuleBasedTriage("I'd like to book a viewing of BST-12A on Saturday")
        .confidence,
    ).toBeGreaterThanOrEqual(0.8);
  });

  it("drops when intents compete", () => {
    const clear = runRuleBasedTriage("The boiler is broken").confidence;
    const mixed = runRuleBasedTriage(
      "The boiler is broken, can I also view the other flat?",
    ).confidence;
    expect(mixed).toBeLessThan(clear);
  });

  it("does not inflate confidence just because contact details exist", () => {
    const withDetails = runRuleBasedTriage(
      "Hello, sam@example.com 07700 900123",
    ).confidence;
    expect(withDetails).toBeLessThan(0.5);
  });
});
