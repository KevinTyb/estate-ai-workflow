"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError, apiFetch } from "@/lib/api/client";
import { isOutcomeUnknown, replyIdempotencyKey } from "@/lib/email/sendState";
import type { InboxEnquiry } from "@/lib/enquiries/types";
import { TONES } from "@/lib/ui/tones";
import { cn } from "@/lib/utils";
import { DetailSection } from "./detailSection";

type Preview = {
  to: string;
  subject: string;
  body: string;
  transport: "outbox" | "smtp";
  alreadySent: boolean;
};

const formatSentAt = (value: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(new Date(value));

type SendSectionProps = {
  enquiry: InboxEnquiry;
  /** False while the editor holds changes that have not been approved. */
  isDraftSaved: boolean;
};

/**
 * Preview and send the approved reply. Only the saved (approved) draft can
 * be sent; with the default outbox transport nothing leaves the system.
 */
export function SendSection({ enquiry, isDraftSaved }: SendSectionProps) {
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sentEmails = enquiry.outboundEmails.filter((e) => e.status === "SENT");
  const lastSent = sentEmails[0] ?? null;
  const currentKey = enquiry.draftReply
    ? replyIdempotencyKey(enquiry.draftReply)
    : null;
  const interrupted =
    enquiry.outboundEmails.find(
      (e) => e.idempotencyKey === currentKey && isOutcomeUnknown(e),
    ) ?? null;
  const draftAlreadySent =
    !!lastSent &&
    !!enquiry.draftReply &&
    new Date(lastSent.sentAt) >= new Date(enquiry.draftReply.updatedAt);

  const canPreview =
    !!enquiry.draftReply &&
    isDraftSaved &&
    !!enquiry.email &&
    !draftAlreadySent &&
    !interrupted;

  async function openPreview() {
    setError(null);
    setIsLoading(true);
    try {
      setPreview(await apiFetch<Preview>(`/api/enquiries/${enquiry.id}/send`));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Preview failed";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function send(confirmResend = false) {
    setError(null);
    setIsSending(true);
    try {
      await apiFetch(`/api/enquiries/${enquiry.id}/send`, {
        method: "POST",
        body: JSON.stringify({ confirmResend }),
      });
      toast.success(
        preview?.transport === "smtp"
          ? "Reply sent to the MailDev inbox"
          : "Reply sent (simulated)",
      );
      setPreview(null);
      router.refresh();
    } catch (err) {
      // A newer attempt owns this reply now: not an error, not a success.
      if (err instanceof ApiError && err.code === "SEND_SUPERSEDED") {
        toast.info("A newer send attempt is in progress.");
        setPreview(null);
        router.refresh();
        return;
      }
      const message = err instanceof Error ? err.message : "Send failed";
      setError(message);
      toast.error(message);
      // An interrupted attempt was found: show the agent the choice.
      if (err instanceof ApiError && err.code === "SEND_OUTCOME_UNKNOWN") {
        setPreview(null);
        router.refresh();
      }
    } finally {
      setIsSending(false);
    }
  }

  async function markSent() {
    setError(null);
    setIsResolving(true);
    try {
      await apiFetch(`/api/enquiries/${enquiry.id}/send/mark-sent`, {
        method: "POST",
      });
      toast.success("Reply marked as sent");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update failed";
      setError(message);
      toast.error(message);
    } finally {
      setIsResolving(false);
    }
  }

  const hint = !enquiry.email
    ? "This enquiry has no email address to reply to."
    : !enquiry.draftReply
      ? "Approve a draft reply to send it."
      : !isDraftSaved
        ? "You have unapproved edits. Accept the draft before sending."
        : draftAlreadySent
          ? "This reply has been sent. Edit and accept the draft to send a follow-up."
          : null;

  return (
    <DetailSection title="Send reply" defaultOpen>
      <div className="space-y-3">
        {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}

        {interrupted && !draftAlreadySent ? (
          <div
            role="status"
            className={cn("space-y-3 rounded-lg border p-3", TONES.amber)}
          >
            <div className="space-y-1">
              <p className="text-sm font-medium">Send outcome unknown</p>
              <p className="text-xs leading-5">
                An attempt to send this reply was interrupted, so it may already
                have reached {interrupted.toEmail}. Check the sent folder before
                choosing. It will not be retried automatically.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void markSent()}
                disabled={isResolving || isSending}
              >
                {isResolving ? "Saving..." : "Mark as sent"}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void send(true)}
                disabled={isResolving || isSending}
              >
                {isSending ? "Sending..." : "Send again"}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={() => void openPreview()}
            disabled={!canPreview || isLoading}
          >
            {isLoading ? "Loading preview..." : "Preview and send"}
          </Button>
        )}

        {sentEmails.length > 0 ? (
          <ul className="space-y-2">
            {sentEmails.map((email) => (
              <li
                key={email.id}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">
                    {email.subject}
                  </span>
                  <Badge variant="outline">
                    {email.transport === "smtp" ? "MailDev" : "Simulated"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  To {email.toEmail} · {formatSentAt(email.sentAt)}
                </p>
              </li>
            ))}
          </ul>
        ) : null}

        {error && !preview ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>

      <Dialog
        open={!!preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preview reply</DialogTitle>
            <DialogDescription>
              {preview?.transport === "smtp"
                ? "This will be delivered to the local MailDev inbox."
                : "Simulated send: the reply is recorded but no email leaves the system."}
            </DialogDescription>
          </DialogHeader>

          {preview ? (
            <div className="space-y-3 rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">To:</span>{" "}
                {preview.to}
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">Subject:</span>{" "}
                {preview.subject}
              </p>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-foreground">
                {preview.body}
              </pre>
            </div>
          ) : null}

          {preview?.alreadySent ? (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              This draft has already been sent. Edit and accept it again to send
              another reply.
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreview(null)}
            >
              Back to editing
            </Button>
            <Button
              type="button"
              onClick={() => void send()}
              disabled={isSending || !!preview?.alreadySent}
            >
              {isSending
                ? "Sending..."
                : preview?.transport === "smtp"
                  ? "Send to MailDev"
                  : "Send (simulated)"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DetailSection>
  );
}
