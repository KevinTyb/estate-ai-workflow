import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

/** Default model; override with ANTHROPIC_MODEL. */
export const DEFAULT_MODEL = "claude-opus-5-5";

export type AiConfig =
  | { enabled: true; model: string }
  | { enabled: false; reason: "disabled" | "no-credentials" };

/**
 * The AI path is used only when credentials exist and AI_MODE is not
 * "rules". Without a key the app runs entirely on the deterministic engine.
 */
export function getAiConfig(env: NodeJS.ProcessEnv = process.env): AiConfig {
  if (env.AI_MODE === "rules") return { enabled: false, reason: "disabled" };
  if (!env.ANTHROPIC_API_KEY && !env.ANTHROPIC_AUTH_TOKEN) {
    return { enabled: false, reason: "no-credentials" };
  }
  return { enabled: true, model: env.ANTHROPIC_MODEL || DEFAULT_MODEL };
}

export type AiFailureKind =
  | "refusal"
  | "invalid_output"
  | "api_error"
  | "truncated";

/** Any reason the model's answer cannot be used; callers fall back to rules. */
export class AiFailure extends Error {
  constructor(
    public readonly kind: AiFailureKind,
    message: string,
  ) {
    super(message);
    this.name = "AiFailure";
  }
}

let client: Anthropic | null = null;
function getClient() {
  // Short timeout and a single retry: a slow model must not stall the inbox,
  // because the rule-based engine is always there to fall back on.
  client ??= new Anthropic({ timeout: 20_000, maxRetries: 1 });
  return client;
}

export type StructuredRequest<T extends z.ZodType> = {
  model: string;
  system: string;
  prompt: string;
  schema: T;
  effort: "low" | "medium" | "high";
  maxTokens?: number;
};

export type StructuredResult<T> = {
  data: T;
  model: string;
  latencyMs: number;
};

/**
 * One structured-output call. The response is parsed and validated against
 * the Zod schema; anything else becomes an AiFailure.
 */
export async function callStructured<T extends z.ZodType>(
  request: StructuredRequest<T>,
): Promise<StructuredResult<z.infer<T>>> {
  const started = Date.now();
  let response;
  try {
    response = await getClient().beta.messages.parse({
      model: request.model,
      max_tokens: request.maxTokens ?? 4096,
      system: request.system,
      messages: [{ role: "user", content: request.prompt }],
      output_config: {
        effort: request.effort,
        format: betaZodOutputFormat(request.schema),
      },
      // If a safety classifier declines, let the API retry on a fallback
      // model inside the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      throw new AiFailure(
        "api_error",
        `${error.status ?? ""} ${error.message}`.trim(),
      );
    }
    if (error instanceof Error && /parse|schema|json/i.test(error.message)) {
      throw new AiFailure("invalid_output", error.message);
    }
    throw new AiFailure(
      "api_error",
      error instanceof Error ? error.message : String(error),
    );
  }

  if (response.stop_reason === "refusal") {
    throw new AiFailure("refusal", "The model declined this request");
  }
  if (response.stop_reason === "max_tokens") {
    throw new AiFailure("truncated", "The model's answer was cut off");
  }
  if (response.parsed_output == null) {
    throw new AiFailure("invalid_output", "No valid structured output");
  }

  return {
    data: response.parsed_output as z.infer<T>,
    model: response.model,
    latencyMs: Date.now() - started,
  };
}
