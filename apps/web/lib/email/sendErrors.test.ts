import { describe, expect, it } from "vitest";
import { classifySendError } from "./sendErrors";

const smtpError = (fields: Record<string, unknown>) =>
  Object.assign(new Error("SMTP error"), fields);

describe("classifySendError", () => {
  it.each([
    [
      "a 5xx rejection of the message",
      { code: "EMESSAGE", command: "DATA", responseCode: 554 },
    ],
    [
      "a 4xx deferral",
      { code: "EENVELOPE", command: "RCPT TO", responseCode: 451 },
    ],
    ["an authentication failure", { code: "EAUTH", command: "AUTH PLAIN" }],
    ["an invalid recipient", { code: "EENVELOPE", command: "API" }],
    ["a message too large to send", { code: "EMESSAGE", command: "MAIL FROM" }],
    [
      "a refused connection",
      { code: "ECONNECTION", command: "CONN", syscall: "connect" },
    ],
    ["an unresolvable host", { code: "EDNS", command: "CONN" }],
  ])("treats %s as a definite failure", (_label, fields) => {
    expect(classifySendError(smtpError(fields))).toBe("FAILED");
  });

  it.each([
    ["a socket timeout", { code: "ETIMEDOUT", command: "CONN" }],
    ["a connection reset", { code: "ESOCKET", command: "CONN" }],
    ["a connection closed mid-send", { code: "ECONNECTION", command: "CONN" }],
    ["a stream error while sending the body", { code: "ESTREAM" }],
  ])("treats %s as uncertain", (_label, fields) => {
    expect(classifySendError(smtpError(fields))).toBe("UNKNOWN");
  });

  it("treats unrecognised errors as uncertain", () => {
    expect(classifySendError(new Error("boom"))).toBe("UNKNOWN");
    expect(classifySendError("boom")).toBe("UNKNOWN");
    expect(classifySendError(null)).toBe("UNKNOWN");
  });
});
