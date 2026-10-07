// FILE: api/_lib/ai/index.ts
// Scelta del provider AI tramite variabili d'ambiente.
//
//   AI_PROVIDER=openai  → OpenAI cloud (default in DEPLOYMENT_MODE=cloud, comportamento attuale)
//   AI_PROVIDER=ollama  → Ollama locale (default in DEPLOYMENT_MODE=onprem)
//   AI_PROVIDER=vllm    → vLLM o altro server OpenAI-compatibile locale

import type { AIProvider } from "./provider";
import { OpenAICompatibleProvider } from "./openaiCompatible";
import { OllamaProvider } from "./ollama";
import { getDeploymentMode, readEnv, readNumberEnv } from "../config";

export type { AIProvider, AIMessage, AIContentPart, AIChatResult, AIPurpose } from "./provider";

function createProvider(name: string): AIProvider {
  switch (name) {
    case "ollama":
      return new OllamaProvider();

    case "vllm":
      return new OpenAICompatibleProvider({
        name: "vllm",
        baseUrl: readEnv("VLLM_BASE_URL").replace(/\/+$/, ""),
        apiKey: () => readEnv("VLLM_API_KEY"),
        apiKeyOptional: true,
        modelOverride: (purpose) =>
          purpose === "vision"
            ? readEnv("VLLM_VISION_MODEL") || readEnv("VLLM_MODEL")
            : readEnv("VLLM_MODEL"),
        minTimeoutMs: readNumberEnv("AI_TIMEOUT_MS", 180000),
      });

    case "openai":
      return new OpenAICompatibleProvider({
        name: "openai",
        baseUrl: (readEnv("OPENAI_BASE_URL") || "https://api.openai.com/v1").replace(/\/+$/, ""),
        apiKey: (purpose) =>
          purpose === "vision"
            ? readEnv("OPENAI_DRAWING_READER_API_KEY") || readEnv("OPENAI_API_KEY")
            : readEnv("OPENAI_TEXT_API_KEY") || readEnv("OPENAI_API_KEY"),
      });

    default:
      throw new Error(`AI_PROVIDER non supportato: ${name}`);
  }
}

let cached: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (cached) return cached;

  const configured = readEnv("AI_PROVIDER").toLowerCase();
  const name = configured || (getDeploymentMode() === "onprem" ? "ollama" : "openai");

  cached = createProvider(name);
  return cached;
}
