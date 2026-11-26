export type DraftSlot = {
  id: string;
  propertyId: string;
  startsAt: string;
  endAt: string;
};

export type DraftResponse = {
  subject: string | null;
  body: string | null;
  method: string;
  replyRecommended: boolean;
  slots: DraftSlot[];
  /** Why an AI draft was replaced by the template, if it was. */
  fallbackReason?: string | null;
};

type SavedDraft = {
  subject: string | null;
  body: string;
  method: string;
};

/** Rebuild the editable draft from the copy saved when it was approved. */
export function draftFromSaved(saved: SavedDraft | null): DraftResponse | null {
  if (!saved) return null;
  return {
    subject: saved.subject,
    body: saved.body,
    method: saved.method,
    replyRecommended: true,
    slots: [],
  };
}
