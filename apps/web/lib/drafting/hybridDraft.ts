import { AiFailure, getAiConfig, type StructuredResult } from "@/lib/ai/client";
import { checkDraft, llmDraft, type LlmDraft } from "@/lib/ai/draft";
import {
  generateDraft,
  type DraftInput,
  type DraftOutput,
} from "./generateDraft";

export type LlmDraftFn = (
  input: DraftInput,
  intent: string,
) => Promise<StructuredResult<LlmDraft>>;

export type HybridDraftOutput = Omit<DraftOutput, "method"> & {
  method: "template" | "llm";
  /** Why the AI draft was not used, when AI was attempted. */
  fallbackReason: string | null;
  model: string | null;
};

function defaultLlm(): LlmDraftFn | null {
  const config = getAiConfig();
  return config.enabled
    ? (input, intent) => llmDraft(input, intent, config.model)
    : null;
}

/**
 * Personalised AI draft when available and safe; otherwise the template.
 * Spam never gets a reply, and nothing here sends or books anything: the
 * agent still reviews, approves and sends every draft.
 */
export async function hybridDraft(
  input: DraftInput,
  llm: LlmDraftFn | null = defaultLlm(),
): Promise<HybridDraftOutput> {
  const template = generateDraft(input);
  const intent = input.triageResult?.intent;
  const templateResult = (
    fallbackReason: string | null,
  ): HybridDraftOutput => ({
    ...template,
    fallbackReason,
    model: null,
  });

  if (!llm || !intent || !template.replyRecommended)
    return templateResult(null);

  try {
    const { data, model } = await llm(input, intent);
    const problems = checkDraft(data, input);
    if (problems.length) {
      return templateResult(`AI draft rejected: ${problems.join("; ")}`);
    }
    return {
      subject: data.subject.trim(),
      body: data.body.trim(),
      method: "llm",
      replyRecommended: true,
      fallbackReason: null,
      model,
    };
  } catch (error) {
    const reason =
      error instanceof AiFailure
        ? `${error.kind}: ${error.message}`
        : String(error);
    return templateResult(`AI unavailable (${reason})`);
  }
}
