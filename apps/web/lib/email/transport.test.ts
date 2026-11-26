import { afterEach, describe, expect, it, vi } from "vitest";
import { getEmailTransport, messageIdFor } from "./transport";

afterEach(() => vi.unstubAllEnvs());

describe("getEmailTransport", () => {
  it("defaults to the outbox, which sends nothing", async () => {
    vi.stubEnv("EMAIL_TRANSPORT", "");
    const transport = getEmailTransport();
    expect(transport.name).toBe("outbox");
    await expect(
      transport.send({
        to: "a@b.com",
        subject: "s",
        body: "b",
        messageId: "<id@x>",
      }),
    ).resolves.toEqual({ messageId: "<id@x>" });
  });

  it("uses SMTP for the local MailDev inbox", () => {
    vi.stubEnv("EMAIL_TRANSPORT", "smtp");
    vi.stubEnv("SMTP_HOST", "localhost");
    expect(getEmailTransport().name).toBe("smtp");
  });

  it("refuses a remote SMTP host unless explicitly allowed", () => {
    vi.stubEnv("EMAIL_TRANSPORT", "smtp");
    vi.stubEnv("SMTP_HOST", "smtp.example.com");
    expect(() => getEmailTransport()).toThrow(/non-local SMTP host/);

    vi.stubEnv("EMAIL_ALLOW_REMOTE_SMTP", "true");
    expect(getEmailTransport().name).toBe("smtp");
  });
});

describe("messageIdFor", () => {
  it("is stable for a key and differs between keys", () => {
    const from = "Agency <hello@agency.co.uk>";
    expect(messageIdFor("reply:a:1", from)).toBe(
      messageIdFor("reply:a:1", from),
    );
    expect(messageIdFor("reply:a:1", from)).not.toBe(
      messageIdFor("reply:a:2", from),
    );
  });

  it("uses the sender's domain and RFC 5322 angle brackets", () => {
    expect(messageIdFor("k", "Agency <hello@Agency.co.uk>")).toMatch(
      /^<[0-9a-f]{32}@agency\.co\.uk>$/,
    );
    expect(messageIdFor("k", "no-reply@estate.test")).toMatch(
      /@estate\.test>$/,
    );
    expect(messageIdFor("k", "not an address")).toMatch(/@estate-ai\.local>$/);
  });
});
