/**
 * Compare the rule engine with the hybrid (rules + LLM) engine on the
 * labelled cases:  pnpm eval:triage
 *
 * The hybrid run calls the LLM API for every case the rules are
 * unsure about, so it needs credentials and costs a little each run.
 */
import { getAiConfig } from "@/lib/ai/client";
import { llmTriage } from "@/lib/ai/triage";
import { runRuleBasedTriage } from "@/lib/triage";
import { hybridTriage } from "@/lib/triage/hybrid";
import { scoreTriage, type EvalReport } from "./triageEval";

function print(name: string, report: EvalReport) {
  console.log(
    `\n${name}: ${report.correct}/${report.total} (${(report.accuracy * 100).toFixed(1)}%)`,
  );
  for (const miss of report.misses) {
    console.log(`  expected ${miss.expected}, got ${miss.got}: ${miss.text}`);
  }
}

async function main() {
  print("Rules", await scoreTriage((text) => runRuleBasedTriage(text).intent));

  const config = getAiConfig();
  if (!config.enabled) {
    console.log(
      `\nHybrid: skipped (AI ${config.reason}). Set ANTHROPIC_API_KEY to compare.`,
    );
    return;
  }

  let llmCalls = 0;
  const report = await scoreTriage(async (text) => {
    const result = await hybridTriage(text, (t) => {
      llmCalls += 1;
      return llmTriage(t, config.model);
    });
    return result.intent;
  });
  print(`Hybrid (${config.model})`, report);
  console.log(`  The LLM was consulted for ${llmCalls}/${report.total} cases.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
