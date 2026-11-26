import { afterEach, describe, expect, it, vi } from "vitest";
import { getEmailTransport } from "./transport";

afterEach(() => vi.unstubAllEnvs());

describe("getEmailTransport", () => {
  it("defaults to the outbox, which sends nothing", async () => {
    vi.stubEnv("EMAIL_TRANSPORT", "");
    const transport = getEmailTransport();
    expect(transport.name).toBe("outbox");
    await expect(
      transport.send({ to: "a@b.com", subject: "s", body: "b" }),
    ).resolves.toEqual({ messageId: null });
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
