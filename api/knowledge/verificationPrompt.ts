import { MECHANICAL_VERIFICATION_KNOWLEDGE } from "./mechanicalVerification";

type VerificationPromptParams = {
  basePrompt: string;
  analysisMode: string;
};

export function withMechanicalVerificationKnowledge(params: VerificationPromptParams): string {
  const text = `${params.analysisMode}\n${params.basePrompt}`.toLowerCase();
  const shouldInject =
    params.analysisMode === "advanced_check" ||
    text.includes("verifica") ||
    text.includes("dimensiona") ||
    text.includes("calcola") ||
    text.includes("fatica") ||
    text.includes("albero") ||
    text.includes("bullone") ||
    text.includes("perno") ||
    text.includes("linguetta") ||
    text.includes("torsione") ||
    text.includes("flessione") ||
    text.includes("taglio") ||
    text.includes("goodman") ||
    text.includes("soderberg");

  if (!shouldInject) return params.basePrompt;

  return `${params.basePrompt}\n\n${MECHANICAL_VERIFICATION_KNOWLEDGE}`;
}
