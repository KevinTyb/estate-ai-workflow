/**
 * Decide what a transport error says about delivery.
 *
 * FAILED means the message was definitely not accepted, so retrying cannot
 * produce a duplicate. UNKNOWN means it may have been accepted (for example
 * a timeout or a dropped connection while the message was being sent), so
 * an agent must decide before it is sent again.
 *
 * The rules follow nodemailer's SMTP errors and err on the side of UNKNOWN:
 * anything not recognised as a definite failure is treated as uncertain.
 */
export type SendErrorOutcome = "FAILED" | "UNKNOWN";

type TransportError = {
  code?: unknown;
  command?: unknown;
  responseCode?: unknown;
  syscall?: unknown;
};

/** Raised before the message is handed over, so nothing can have gone out. */
const PRE_DELIVERY_CODES = new Set([
  "EAUTH", // authentication rejected, before MAIL FROM
  "EDNS", // the server's host name did not resolve
  "EENVELOPE", // sender or recipient refused, before the message body
  "EREQUIRETLS", // the server cannot meet the TLS requirement
]);

export function classifySendError(error: unknown): SendErrorOutcome {
  if (!error || typeof error !== "object") return "UNKNOWN";
  const { code, command, responseCode, syscall } = error as TransportError;

  // The server answered with a rejection (4xx or 5xx). Even in reply to the
  // message body, a rejection means it did not take responsibility for it.
  if (
    typeof responseCode === "number" &&
    responseCode >= 400 &&
    responseCode < 600
  ) {
    return "FAILED";
  }

  if (typeof code === "string" && PRE_DELIVERY_CODES.has(code)) {
    return "FAILED";
  }

  // Message checks nodemailer runs before talking to the server.
  if (code === "EMESSAGE" && command !== "DATA") return "FAILED";

  // The TCP connection was never established.
  if (syscall === "connect" || syscall === "getaddrinfo") return "FAILED";

  // Timeouts, resets, a connection closed mid-send, or anything unexpected.
  return "UNKNOWN";
}
