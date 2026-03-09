import { atom, selector } from "recoil";

export type InboxFilter = "ALL" | "PENDING" | "VIEWING" | "MAINTENANCE";

export const selectedEnquiryIdAtom = atom<string | null>({
  key: "selectedEnquiryIdAtom",
  default: null,
});

export const InboxFilterAtom = atom<InboxFilter>({
  key: "InboxFilter",
  default: "ALL",
});

export const draftReplyAtom = atom<string>({
  key: "draftReply",
  default: "",
});

export const hasSelectedEnquirySelector = selector<boolean>({
  key: "hasSelectedEnquirySelector",
  get: ({ get }) => {
    const selectedId = get(selectedEnquiryIdAtom);
    return selectedId !== null;
  },
});
