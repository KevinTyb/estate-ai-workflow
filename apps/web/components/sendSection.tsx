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
import { apiFetch } from "@/lib/api/client";
import type { InboxEnquiry } from "@/lib/enquiries/types";
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
  const [error, setError] = useState<string | null>(null);

  const lastSent = enquiry.outboundEmails[0] ?? null;
  const draftAlreadySent =
    !!lastSent &&
    !!enquiry.draftReply &&
    new Date(lastSent.sentAt) >= new Date(enquiry.draftReply.updatedAt);

  const canPreview =
    !!enquiry.draftReply &&
    isDraftSaved &&
    !!enquiry.email &&
    !draftAlreadySent;

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

  async function send() {
    setError(null);
    setIsSending(true);
    try {
      await apiFetch(`/api/enquiries/${enquiry.id}/send`, { method: "POST" });
      toast.success(
        preview?.transport === "smtp"
          ? "Reply sent to the MailDev inbox"
          : "Reply sent (simulated)",
      );
      setPreview(null);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Send failed";
      setError(message);
      toast.error(message);
    } finally {
      setIsSending(false);
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
        {hint ? <p className="text-sm text-slate-500">{hint}</p> : null}

        <Button
          type="button"
          size="sm"
          onClick={() => void openPreview()}
          disabled={!canPreview || isLoading}
        >
          {isLoading ? "Loading preview..." : "Preview and send"}
        </Button>

        {enquiry.outboundEmails.length > 0 ? (
          <ul className="space-y-2">
            {enquiry.outboundEmails.map((email) => (
              <li
                key={email.id}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-900">
                    {email.subject}
                  </span>
                  <Badge variant="outline">
                    {email.transport === "smtp" ? "MailDev" : "Simulated"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  To {email.toEmail} · {formatSentAt(email.sentAt)}
                </p>
              </li>
            ))}
          </ul>
        ) : null}

        {error && !preview ? (
          <p role="alert" className="text-xs text-red-600">
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
            <div className="space-y-3 rounded-lg border border-slate-200 p-4">
              <p className="text-xs text-slate-500">
                <span className="font-medium text-slate-700">To:</span>{" "}
                {preview.to}
              </p>
              <p className="text-xs text-slate-500">
                <span className="font-medium text-slate-700">Subject:</span>{" "}
                {preview.subject}
              </p>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-slate-800">
                {preview.body}
              </pre>
            </div>
          ) : null}

          {preview?.alreadySent ? (
            <p className="text-sm text-amber-700">
              This draft has already been sent. Edit and accept it again to send
              another reply.
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-xs text-red-600">
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
