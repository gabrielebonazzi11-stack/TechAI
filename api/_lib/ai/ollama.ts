// FILE: api/_lib/ai/ollama.ts
// Provider Ollama tramite API nativa /api/chat.
// Si usa l'API nativa (non /v1) per poter impostare num_ctx a ogni richiesta:
// Ollama altrimenti usa una finestra di contesto piccola e taglia il prompt in silenzio.

import type { AIChatRequest, AIChatResult, AIMessage, AIProvider, AIPurpose } from "./provider";
import { fetchWithTimeout, safeJsonParse } from "./http";
import { readEnv, readNumberEnv } from "../config";

type OllamaMessage = {
  role: "system" | "user" | "assistant";
  content: string;
  images?: string[];
};

function stripDataUrlPrefix(url: string): string | null {
  const match = /^data:[^;]+;base64,(.+)$/s.exec(url);
  return match ? match[1] : null;
}

function toOllamaMessage(message: AIMessage): OllamaMessage {
  if (typeof message.content === "string") {
    return { role: message.role, content: message.content };
  }

  const texts: string[] = [];
  const images: string[] = [];

  for (const part of message.content) {
    if (part.type === "text") {
      texts.push(part.text);
    } else if (part.type === "image_url") {
      const base64 = stripDataUrlPrefix(part.image_url.url);
      // Solo immagini inline: in on-premise non si scaricano URL esterni.
      if (base64) images.push(base64);
    }
  }

  return images.length > 0
    ? { role: message.role, content: texts.join("\n"), images }
    : { role: message.role, content: texts.join("\n") };
}

export class OllamaProvider implements AIProvider {
  readonly name = "ollama";

  private get baseUrl() {
    return readEnv("OLLAMA_BASE_URL").replace(/\/+$/, "");
  }

  private modelFor(purpose: AIPurpose) {
    return purpose === "vision"
      ? readEnv("OLLAMA_VISION_MODEL") || readEnv("OLLAMA_MODEL")
      : readEnv("OLLAMA_MODEL");
  }

  isConfigured(purpose: AIPurpose): boolean {
    return Boolean(this.baseUrl && this.modelFor(purpose));
  }

  resolveModel(_requestedModel: string, purpose: AIPurpose): string {
    return this.modelFor(purpose);
  }

  async chat(request: AIChatRequest): Promise<AIChatResult> {
    const options: Record<string, number> = {
      num_ctx: readNumberEnv("OLLAMA_NUM_CTX", 16384),
    };
    if (request.temperature !== undefined) options.temperature = request.temperature;
    if (request.maxTokens !== undefined) options.num_predict = request.maxTokens;

    const body: Record<string, unknown> = {
      model: this.modelFor(request.purpose),
      messages: request.messages.map(toOllamaMessage),
      stream: false,
      options,
    };
    const keepAlive = readEnv("OLLAMA_KEEP_ALIVE");
    if (keepAlive) body.keep_alive = keepAlive;

    const response = await fetchWithTimeout(
      `${this.baseUrl}/api/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      Math.max(request.timeoutMs, readNumberEnv("AI_TIMEOUT_MS", 180000))
    );

    const raw = await response.text();
    const data = safeJsonParse<any>(raw, null);

    return {
      ok: response.ok,
      status: response.status,
      raw,
      content: String(data?.message?.content || ""),
    };
  }
}
