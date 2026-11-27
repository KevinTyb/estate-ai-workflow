import { createHash } from "node:crypto";
import nodemailer from "nodemailer";

export type OutgoingEmail = {
  to: string;
  subject: string;
  body: string;
  /**
   * RFC 5322 Message-ID, stable for a given send. Every retry of the same
   * reply carries the same ID, so mail clients and downstream systems can
   * recognise a duplicate delivery as the same message.
   */
  messageId: string;
};

export type EmailTransport = {
  name: "outbox" | "smtp";
  send(email: OutgoingEmail): Promise<{ messageId: string | null }>;
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "maildev"]);

const fromAddress = () =>
  process.env.EMAIL_FROM ?? "Estate AI Workflow <no-reply@estate-ai.local>";

/** The domain of the sender address, used on the right of a Message-ID. */
function senderDomain(from: string) {
  const match = from.match(/@([A-Za-z0-9.-]+)>?\s*$/);
  return match?.[1]?.toLowerCase() ?? "estate-ai.local";
}

/** Deterministic Message-ID for an idempotency key: same key, same ID. */
export function messageIdFor(key: string, from: string = fromAddress()) {
  const digest = createHash("sha256").update(key).digest("hex").slice(0, 32);
  return `<${digest}@${senderDomain(from)}>`;
}

/** Records the message only. Nothing leaves the system. */
const outboxTransport: EmailTransport = {
  name: "outbox",
  async send({ messageId }) {
    return { messageId };
  },
};

/**
 * Relays to an SMTP server, intended for the local MailDev inbox from
 * docker-compose (http://localhost:1080). Remote hosts are refused unless
 * EMAIL_ALLOW_REMOTE_SMTP=true, so a misconfigured environment cannot
 * email real customers by accident.
 */
function smtpTransport(): EmailTransport {
  const { host, port, local } = smtpTarget();

  if (!local && process.env.EMAIL_ALLOW_REMOTE_SMTP !== "true") {
    throw new Error(
      `Refusing to send through non-local SMTP host "${host}". Set EMAIL_ALLOW_REMOTE_SMTP=true to allow it.`,
    );
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: false,
    ignoreTLS: local,
  });

  return {
    name: "smtp",
    async send({ to, subject, body, messageId }) {
      const info = await transporter.sendMail({
        from: fromAddress(),
        to,
        subject,
        text: body,
        messageId,
      });
      return { messageId: info.messageId ?? messageId };
    },
  };
}

function smtpTarget() {
  const host = process.env.SMTP_HOST ?? "localhost";
  const port = Number(process.env.SMTP_PORT ?? 1025);
  return { host, port, local: LOCAL_HOSTS.has(host) };
}

/**
 * How the configured transport should be described to an agent, derived
 * from the real configuration rather than assumed.
 */
export function describeEmailTransport() {
  if (process.env.EMAIL_TRANSPORT !== "smtp") {
    return {
      name: "outbox" as const,
      label: "Simulated",
      description:
        "Simulated send: the reply is recorded but no email leaves the system.",
    };
  }
  const { host, port, local } = smtpTarget();
  return {
    name: "smtp" as const,
    label: local ? `Local SMTP (${host}:${port})` : `SMTP (${host})`,
    description: local
      ? `This will be delivered to the local SMTP server at ${host}:${port}.`
      : `This will be emailed to the customer through ${host}.`,
  };
}

export function getEmailTransport(): EmailTransport {
  return process.env.EMAIL_TRANSPORT === "smtp"
    ? smtpTransport()
    : outboxTransport;
}
