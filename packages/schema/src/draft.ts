import { z } from "zod";

export const draftMethodSchema = z.enum(["template", "llm", "manual"]);

/** Payload an agent submits when approving (saving) a reply draft. */
export const acceptDraftSchema = z.object({
  subject: z.string().trim().max(200).nullable().default(null),
  body: z.string().trim().min(1, "Draft body cannot be empty").max(10_000),
  method: draftMethodSchema.default("template"),
  /** True when the agent changed the generated text before approving. */
  edited: z.boolean().default(false),
});

export type AcceptDraftInput = z.infer<typeof acceptDraftSchema>;
export type DraftMethod = z.infer<typeof draftMethodSchema>;
