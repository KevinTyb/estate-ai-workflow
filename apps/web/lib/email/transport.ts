import nodemailer from "nodemailer";

export type OutgoingEmail = {
  to: string;
  subject: string;
  body: string;
};

export type EmailTransport = {
  name: "outbox" | "smtp";
  send(email: OutgoingEmail): Promise<{ messageId: string | null }>;
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "maildev"]);

const fromAddress = () =>
  process.env.EMAIL_FROM ?? "Estate AI Workflow <no-reply@estate-ai.local>";

/** Records the message only. Nothing leaves the system. */
const outboxTransport: EmailTransport = {
  name: "outbox",
  async send() {
    return { messageId: null };
  },
};

/**
 * Relays to an SMTP server, intended for the local MailDev inbox from
 * docker-compose (http://localhost:1080). Remote hosts are refused unless
 * EMAIL_ALLOW_REMOTE_SMTP=true, so a misconfigured environment cannot
 * email real customers by accident.
 */
function smtpTransport(): EmailTransport {
  const host = process.env.SMTP_HOST ?? "localhost";
  const port = Number(process.env.SMTP_PORT ?? 1025);

  if (
    !LOCAL_HOSTS.has(host) &&
    process.env.EMAIL_ALLOW_REMOTE_SMTP !== "true"
  ) {
    throw new Error(
      `Refusing to send through non-local SMTP host "${host}". Set EMAIL_ALLOW_REMOTE_SMTP=true to allow it.`,
    );
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: false,
    ignoreTLS: LOCAL_HOSTS.has(host),
  });

  return {
    name: "smtp",
    async send({ to, subject, body }) {
      const info = await transporter.sendMail({
        from: fromAddress(),
        to,
        subject,
        text: body,
      });
      return { messageId: info.messageId ?? null };
    },
  };
}

export function getEmailTransport(): EmailTransport {
  return process.env.EMAIL_TRANSPORT === "smtp"
    ? smtpTransport()
    : outboxTransport;
}
