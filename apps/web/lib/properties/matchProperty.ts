export type PropertyCandidate = {
  id: string;
  ref: string;
  address: string;
  postcode: string | null;
};

export type PropertyMatch<T extends PropertyCandidate = PropertyCandidate> = {
  property: T;
  matchedBy: "ref" | "address" | "postcode";
};

const ABBREVIATIONS: Array<[RegExp, string]> = [
  [/\bstreet\b/g, "st"],
  [/\broad\b/g, "rd"],
  [/\bavenue\b/g, "ave"],
  [/\blane\b/g, "ln"],
  [/\bcommon\b/g, "cmn"],
  [/\bplace\b/g, "pl"],
  [/\bsquare\b/g, "sq"],
  [/\bcrescent\b/g, "cres"],
  [/\bdrive\b/g, "dr"],
];

function normalise(text: string): string {
  let value = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  for (const [pattern, replacement] of ABBREVIATIONS) {
    value = value.replace(pattern, replacement);
  }
  return value.replace(/\s+/g, " ").trim();
}

function normalisePostcode(postcode: string): string {
  return postcode.replace(/\s+/g, "").toUpperCase();
}

/** "12A Baker Street, London" -> "12a baker st" */
function streetLine(address: string): string {
  return normalise(address.split(",")[0] ?? address);
}

/**
 * Resolve which property an enquiry is about. Tries, in order of
 * reliability: an explicit property reference, the first line of the
 * address (house number + street), then a postcode that matches exactly
 * one property. Returns null rather than guessing when it is ambiguous.
 */
export function matchProperty<T extends PropertyCandidate>(
  rawText: string,
  entities: { propertyRef: string | null; postcode: string | null },
  properties: T[],
): PropertyMatch<T> | null {
  if (entities.propertyRef) {
    const ref = entities.propertyRef.toUpperCase();
    const byRef = properties.find((p) => p.ref.toUpperCase() === ref);
    if (byRef) return { property: byRef, matchedBy: "ref" };
  }

  const text = ` ${normalise(rawText)} `;
  const byAddress = properties.filter((p) => {
    const line = streetLine(p.address);
    return line.length > 0 && text.includes(` ${line} `);
  });
  if (byAddress.length === 1) {
    return { property: byAddress[0], matchedBy: "address" };
  }

  if (entities.postcode) {
    const postcode = normalisePostcode(entities.postcode);
    const byPostcode = properties.filter(
      (p) => p.postcode && normalisePostcode(p.postcode) === postcode,
    );
    if (byPostcode.length === 1) {
      return { property: byPostcode[0], matchedBy: "postcode" };
    }
  }

  return null;
}
