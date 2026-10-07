// FILE: api/_lib/ai/openaiCompatible.ts
// Provider per qualunque server che espone l'API OpenAI /v1/chat/completions:
// OpenAI cloud (comportamento attuale) e, in futuro, vLLM on-premise.

import type { AIChatRequest, AIChatResult, AIProvider, AIPurpose } from "./provider";
import { fetchWithTimeout, safeJsonParse } from "./http";

export type OpenAICompatibleConfig = {
  name: string;
  /** Base URL comprensiva di /v1, senza slash finale. */
  baseUrl: string;
  apiKey: (purpose: AIPurpose) => string;
  /** Se presente, sostituisce il modello scelto dal routing (provider locali). */
  modelOverride?: (purpose: AIPurpose) => string;
  /** Se true, la chiave API non è obbligatoria (es. vLLM in rete interna). */
  apiKeyOptional?: boolean;
  /** Timeout minimo per richiesta, utile per modelli locali più lenti. */
  minTimeoutMs?: number;
};

export class OpenAICompatibleProvider implements AIProvider {
  readonly name: string;

  constructor(private readonly config: OpenAICompatibleConfig) {
    this.name = config.name;
  }

  isConfigured(purpose: AIPurpose): boolean {
    if (!this.config.baseUrl) return false;
    if (this.config.modelOverride && !this.config.modelOverride(purpose)) return false;
    return this.config.apiKeyOptional ? true : Boolean(this.config.apiKey(purpose));
  }

  resolveModel(requestedModel: string, purpose: AIPurpose): string {
    return this.config.modelOverride?.(purpose) || requestedModel;
  }

  async chat(request: AIChatRequest): Promise<AIChatResult> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const apiKey = this.config.apiKey(request.purpose);
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    const body: Record<string, unknown> = {
      model: this.resolveModel(request.model, request.purpose),
      messages: request.messages,
    };
    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.maxTokens !== undefined) body.max_tokens = request.maxTokens;

    const response = await fetchWithTimeout(
      `${this.config.baseUrl}/chat/completions`,
      { method: "POST", headers, body: JSON.stringify(body) },
      Math.max(request.timeoutMs, this.config.minTimeoutMs || 0)
    );

    const raw = await response.text();
    const data = safeJsonParse<any>(raw, null);

    return {
      ok: response.ok,
      status: response.status,
      raw,
      content: String(data?.choices?.[0]?.message?.content || ""),
    };
  }
}
