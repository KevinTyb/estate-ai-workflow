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
  const [isDraftExpanded, setIsDraftExpanded] = useState(false);
  const [isAcceptingDraft, setIsAcceptingDraft] = useState(false);
  const [draftAcceptError, setDraftAcceptError] = useState<string | null>(null);

  const draftSectionRef = useRef<HTMLElement | null>(null);
  const router = useRouter();

  const isDraftSaved =
    !!savedDraft &&
    !!draftReply &&
    savedDraft.body === draftReply.body &&
    savedDraft.subject === draftReply.subject;

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
