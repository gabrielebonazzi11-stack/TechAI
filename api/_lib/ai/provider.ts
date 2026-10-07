// FILE: api/_lib/ai/provider.ts
// Interfaccia unica verso i modelli AI. Il resto del backend usa SOLO questi tipi:
// niente chiamate dirette a OpenAI, Ollama, vLLM o altri provider fuori da api/_lib/ai/.

export type AIPurpose = "text" | "vision";

export type AIContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: string } };

export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string | AIContentPart[];
};

export type AIChatRequest = {
  purpose: AIPurpose;
  model: string;
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs: number;
};

export type AIChatResult = {
  ok: boolean;
  /** Codice HTTP restituito dal provider. */
  status: number;
  /** Corpo grezzo della risposta, usato solo per riconoscere rate limit / errori. */
  raw: string;
  /** Testo della risposta del modello ("" se assente). */
  content: string;
};

export interface AIProvider {
  readonly name: string;

  /** true se il provider ha la configurazione minima per lo scopo richiesto. */
  isConfigured(purpose: AIPurpose): boolean;

  /**
   * Restituisce il modello effettivo da usare.
   * I provider cloud rispettano il modello scelto dal routing di chat.ts;
   * i provider locali lo sostituiscono con il modello configurato via env.
   */
  resolveModel(requestedModel: string, purpose: AIPurpose): string;

  /**
   * Esegue una chat completion non in streaming.
   * In caso di timeout lancia un errore con name === "AbortError" (stesso comportamento di prima).
   */
  chat(request: AIChatRequest): Promise<AIChatResult>;
}
