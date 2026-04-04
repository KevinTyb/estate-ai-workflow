import { Intent } from "@prisma/client";
import { SuggestedSlot } from "../slots/getNextAvailableSlot";
import { formatSlot } from "../slots/formatSlots";

type DraftEnquiry = {
  contactName: string | null;
  rawText: string;
  propertyRef: string | null;
};

type DraftTriageResult = {
  intent: Intent | null;
  entities: unknown;
} | null;

type DraftProperty = {
  ref: string;
  address: string;
} | null;

export type DraftInput = {
  enquiry: DraftEnquiry;
  triageResult: DraftTriageResult;
  property?: DraftProperty;
  slots?: SuggestedSlot[];
};

export type DraftOutput = {
  subject: string | null;
  body: string | null;
  method: "template";
  replyRecommended: boolean;
};

function getGreetingName(name: string | null | undefined) {
  if (!name || !name.trim()) return "there";
  return name.trim();
}

function getPropertyLabel(input: DraftInput) {
  if (input.property?.ref) return input.property.ref;
  if (input.enquiry.propertyRef) return input.enquiry.propertyRef;
  if (input.property?.address) return input.property.address;
  return "the property";
}

function renderSlotList(slots: SuggestedSlot[]) {
  return slots.map((slot) => `- ${formatSlot(slot)}`).join("\n");
}

export function generateDraft(input: DraftInput): DraftOutput {
  const intent = input.triageResult?.intent;
  const name = getGreetingName(input.enquiry.contactName);
  const propertyLabel = getPropertyLabel(input);
  const slots = input.slots ?? [];

  if (intent === "SPAM") {
    return {
      subject: null,
      body: null,
      method: "template",
      replyRecommended: false,
    };
  }

  if (intent === "VIEWING") {
    if (slots.length > 0) {
      return {
        subject: `Viewing enquiry for ${propertyLabel}`,
        body: `Hi ${name},

Thank you for your enquiry regarding ${propertyLabel}.

We would be happy to arrange a viewing. The next available times are:

${renderSlotList(slots)}

Please let us know which option works best for you, and we will confirm the appointment.

Kind regards,
Estate AI Workflow Team`,
        method: "template",
        replyRecommended: true,
      };
    }

    return {
      subject: `Viewing enquiry for ${propertyLabel}`,
      body: `Hi ${name},

Thank you for your enquiry regarding ${propertyLabel}.

We would be happy to arrange a viewing and a member of our team will confirm availability shortly.

Kind regards,
Estate AI Workflow Team`,
      method: "template",
      replyRecommended: true,
    };
  }

  if (intent === "VALUATION") {
    return {
      subject: "Valuation enquiry received",
      body: `Hi ${name},

Thank you for your valuation enquiry.

A member of our team will be happy to arrange an appraisal and will be in touch shortly to discuss the next steps and availability.

Kind regards,
Estate AI Workflow Team`,
      method: "template",
      replyRecommended: true,
    };
  }

  return {
    subject: "Re: your enquiry",
    body: `Hi ${name},

Thank you for your enquiry.

A member of our team will review your message and get back to you shortly.

Kind regards,
Estate AI Workflow Team`,
    method: "template",
    replyRecommended: true,
  };
}
