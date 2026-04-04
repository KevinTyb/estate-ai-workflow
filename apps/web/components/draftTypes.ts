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
};
