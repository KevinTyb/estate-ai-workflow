import { z } from "zod";

/** Optional body of POST /api/enquiries/:id/send. */
export const sendReplySchema = z
  .object({
    /** The agent checked an interrupted attempt and chose to send again. */
    confirmResend: z.boolean().default(false),
  })
  .default({ confirmResend: false });

export type SendReplyInput = z.infer<typeof sendReplySchema>;
