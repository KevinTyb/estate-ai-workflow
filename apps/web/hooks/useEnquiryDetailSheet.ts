"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { draftFromSaved, type DraftResponse } from "@/components/draftTypes";
import type { InboxEnquiry } from "@/lib/enquiries/types";

/**
 * Draft state for one enquiry. The owning component is keyed by enquiry id,
 * so state starts fresh from the saved draft whenever another enquiry opens.
 */
export function useEnquiryDetailSheet(enquiry: InboxEnquiry) {
  const savedDraft = enquiry.draftReply;

  const [draftReply, setDraftReply] = useState<DraftResponse | null>(() =>
    draftFromSaved(savedDraft),
  );
  // The text as generated, to tell whether the agent edited it.
  const [generatedText, setGeneratedText] = useState<{
    subject: string | null;
    body: string | null;
  } | null>(null);
  const [isDraftExpanded, setIsDraftExpanded] = useState(false);
  const [isAcceptingDraft, setIsAcceptingDraft] = useState(false);
  const [draftAcceptError, setDraftAcceptError] = useState<string | null>(null);

  const draftSectionRef = useRef<HTMLElement | null>(null);
  const router = useRouter();

  // A draft flagged by re-triage counts as unapproved until accepted again.
  const isDraftSaved =
    !!savedDraft &&
    !savedDraft.staleReason &&
    !!draftReply &&
    savedDraft.body === draftReply.body &&
    savedDraft.subject === draftReply.subject;

  /** Did the agent change the text the system generated? */
  function wasEdited() {
    if (!draftReply) return false;
    if (generatedText) {
      return (
        generatedText.body !== draftReply.body ||
        generatedText.subject !== draftReply.subject
      );
    }
    // Re-approving a restored draft: edited before, or edited since.
    return (
      !!savedDraft && (savedDraft.edited || savedDraft.body !== draftReply.body)
    );
  }

  async function handleAcceptDraft() {
    if (!draftReply?.replyRecommended || !draftReply.body) return;

    setDraftAcceptError(null);
    setIsAcceptingDraft(true);

    try {
      const res = await fetch(`/api/enquiries/${enquiry.id}/draft/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: draftReply.subject,
          body: draftReply.body,
          method: draftReply.method,
          edited: wasEdited(),
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Failed to accept draft");
      }

      toast.success("Draft saved");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong";
      setDraftAcceptError(message);
      toast.error("Failed to save draft");
    } finally {
      setIsAcceptingDraft(false);
    }
  }

  function handleDraftBodyChange(body: string) {
    setDraftReply((current) => (current ? { ...current, body } : current));
  }

  function handleDraftGenerated(draft: DraftResponse) {
    setDraftReply(draft);
    setGeneratedText({ subject: draft.subject, body: draft.body });
    setDraftAcceptError(null);
  }

  function toggleDraftExpanded() {
    setIsDraftExpanded((current) => !current);
  }

  useEffect(() => {
    if (!isDraftExpanded) return;
    draftSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [isDraftExpanded]);

  return {
    draftReply,
    isDraftSaved,
    isDraftExpanded,
    isAcceptingDraft,
    draftAcceptError,
    draftSectionRef,
    handleAcceptDraft,
    handleDraftBodyChange,
    handleDraftGenerated,
    toggleDraftExpanded,
  };
}
