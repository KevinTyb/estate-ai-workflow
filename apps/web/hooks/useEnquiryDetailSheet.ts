"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { DraftResponse } from "@/components/draftTypes";

type EnquiryWithTriage = {
  id: string;
  contactName: string | null;
  email: string | null;
  source: string;
  status: string;
  intent: string | null;
  propertyRef: string | null;
  rawText: string;
  createdAt: Date;
  triageResult: {
    id: string;
    intent: string | null;
    confidence: number | null;
    entities: unknown;
    method: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
};

type UseEnquiryDetailSheetParams = {
  selectedEnquiry: EnquiryWithTriage | null;
};

export function useEnquiryDetailSheet({
  selectedEnquiry,
}: UseEnquiryDetailSheetParams) {
  const [draftReply, setDraftReply] = useState<DraftResponse | null>(null);
  const [isDraftExpanded, setIsDraftExpanded] = useState(false);
  const [isAcceptingDraft, setIsAcceptingDraft] = useState(false);
  const [draftAcceptError, setDraftAcceptError] = useState<string | null>(null);

  const sheetContentRef = useRef<HTMLDivElement | null>(null);
  const draftSectionRef = useRef<HTMLElement | null>(null);

  const router = useRouter();

  async function handleAcceptDraft() {
    if (!selectedEnquiry || !draftReply?.replyRecommended || !draftReply.body) {
      return;
    }

    setDraftAcceptError(null);
    setIsAcceptingDraft(true);

    try {
      const res = await fetch(
        `/api/enquiries/${selectedEnquiry.id}/draft/accept`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subject: draftReply.subject,
            body: draftReply.body,
            method: draftReply.method,
          }),
        },
      );

      if (!res.ok) {
        throw new Error("Failed to accept draft");
      }

      toast.success("Draft saved successfully");
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
    setDraftReply((current) =>
      current
        ? {
            ...current,
            body,
          }
        : current,
    );
  }

  function handleDraftGenerated(draft: DraftResponse) {
    setDraftReply(draft);
    setDraftAcceptError(null);
  }

  function toggleDraftExpanded() {
    setIsDraftExpanded((current) => !current);
  }

  function resetDraftState() {
    setDraftReply(null);
    setIsDraftExpanded(false);
    setIsAcceptingDraft(false);
    setDraftAcceptError(null);
  }

  // Scroll draft section into view when expanded
  useEffect(() => {
    const container = sheetContentRef.current;
    const draftSection = draftSectionRef.current;

    if (!container || !draftSection) return;

    requestAnimationFrame(() => {
      const containerRect = container.getBoundingClientRect();
      const sectionRect = draftSection.getBoundingClientRect();

      const offsetTop =
        sectionRect.top - containerRect.top + container.scrollTop - 16;

      container.scrollTo({
        top: offsetTop,
        behavior: "smooth",
      });
    });
  }, [isDraftExpanded]);

  useEffect(() => {
    setDraftReply(null);
    setIsDraftExpanded(false);
    setIsAcceptingDraft(false);
    setDraftAcceptError(null);
  }, [selectedEnquiry?.id]);

  return {
    draftReply,
    isDraftExpanded,
    isAcceptingDraft,
    draftAcceptError,
    sheetContentRef,
    draftSectionRef,
    setDraftReply,
    handleAcceptDraft,
    handleDraftBodyChange,
    handleDraftGenerated,
    toggleDraftExpanded,
    resetDraftState,
  };
}
