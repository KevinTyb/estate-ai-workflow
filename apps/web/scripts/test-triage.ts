import { runRuleBasedTriage } from "../lib/triage";

const samples = [
  "Hi, can I view BST-12A this Friday? My budget is £1700pcm. Email me at sam@example.com",
  "Boiler making noises, need urgent help.",
  "Interested in a valuation for my flat in Enfield.",
  "Buy crypto now!!!",
];

for (const sample of samples) {
  const result = runRuleBasedTriage(sample);

  console.log("\n--------------------------------");
  console.log("INPUT:");
  console.log(sample);
  console.log("\nOUTPUT:");
  console.dir(result, { depth: null });
}
