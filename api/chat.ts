// FILE: api/chat.ts

import { createClient } from "@supabase/supabase-js";

export const config = {
  runtime: "edge",
};

type ChatMessage = {
  role?: string;
  text?: string;
};

type AnalysisMode =
  | "chat"
  | "project"
  | "bom"
  | "solidworks"
  | "advanced_check"
  | "drawing"
  | "step"
  | "file";

type DrawingImageInput = {
  label: string;
  dataUrl: string;
};

type RequestBodyData = {
  message: string;
  messages: ChatMessage[];
  profile: any;
  fileText: string;
  imageDataUrl: string;
  drawingImages: DrawingImageInput[];
  fileMeta: string;
  hasFile: boolean;
  analysisMode: AnalysisMode;
};

type GuestUsageInfo = {
  used: number;
  limit: number;
  fileUsed: number;
  fileLimit: number;
  windowStartedAt: string;
};

type AuthResult =
  | { ok: true; mode: "user"; userId: string; supabase: any }
  | { ok: true; mode: "guest"; guestId: string; supabase: any; usage: GuestUsageInfo }
  | { ok: false; response: Response };

type ModelRoute = {
  level: "fast" | "medium" | "hard";
  model: string;
  maxTokens: number;
  timeoutMs: number;
  reason: string;
};

const GUEST_TEXT_LIMIT_24H = 10;
const GUEST_FILE_LIMIT_24H = 2;
const GUEST_WINDOW_HOURS = 24;
const GUEST_WINDOW_MS = GUEST_WINDOW_HOURS * 60 * 60 * 1000;

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeAnalysisMode(value: string | null | undefined): AnalysisMode {
  const mode = String(value || "chat").trim().toLowerCase();

  if (
    mode === "project" ||
    mode === "bom" ||
    mode === "solidworks" ||
    mode === "advanced_check" ||
    mode === "drawing" ||
    mode === "step" ||
    mode === "file"
  ) {
    return mode;
  }

  return "chat";
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function isOlderThan24Hours(dateValue: string | null | undefined) {
  if (!dateValue) return true;

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return true;

  return Date.now() - date.getTime() >= GUEST_WINDOW_MS;
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 18000) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function buildStepMetadata(file: File) {
  const name = file.name || "file STEP";
  const lowerName = name.toLowerCase();
  const ext = lowerName.endsWith(".stp") ? "STP" : lowerName.endsWith(".step") ? "STEP" : "STEP/STP";
  const sizeKb = (file.size / 1024).toFixed(1);

  return (
    `\n\nMetadata file CAD:\n` +
    `Nome: ${name}\n` +
    `Formato stimato: ${ext}\n` +
    `Dimensione: ${sizeKb} KB\n` +
    `Nota: in ambiente Edge non viene ricostruita la geometria 3D, ma posso analizzare metadata, intestazione STEP, nomi entità e testo tecnico se leggibile.\n`
  );
}

async function readRequestBody(req: Request): Promise<RequestBodyData> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();

    const message = String(formData.get("message") || "");
    const messagesRaw = String(formData.get("messages") || "[]");
    const profileRaw = String(formData.get("profile") || "{}");
    const file = formData.get("file");
    const preExtractedText = formData.get("fileText");
    const drawingImagesRaw = String(formData.get("drawingImages") || "[]");
    const analysisMode = normalizeAnalysisMode(String(formData.get("analysisMode") || "chat"));

    const messages = safeJsonParse<ChatMessage[]>(messagesRaw, []);
    const profile = safeJsonParse<any>(profileRaw, {});
    const drawingImagesParsed = safeJsonParse<DrawingImageInput[]>(drawingImagesRaw, []);

    let fileText = "";
    let imageDataUrl = "";
    let drawingImages: DrawingImageInput[] = [];
    let fileMeta = "";
    let hasFile = false;

    if (file instanceof File && file.size > 0) {
      hasFile = true;

      const fileName = file.name || "file caricato";
      const fileType = file.type || "sconosciuto";
      const fileSizeKb = (file.size / 1024).toFixed(1);
      const lowerName = fileName.toLowerCase();

      fileMeta =
        `File caricato:\n` +
        `Nome: ${fileName}\n` +
        `Tipo: ${fileType}\n` +
        `Dimensione: ${fileSizeKb} KB\n` +
        `Modalità analisi: ${analysisMode}\n`;

      if (file.type.startsWith("image/")) {
        const buffer = await file.arrayBuffer();
        const base64 = arrayBufferToBase64(buffer);
        imageDataUrl = `data:${file.type};base64,${base64}`;
      } else if (lowerName.endsWith(".step") || lowerName.endsWith(".stp")) {
        fileText = buildStepMetadata(file);

        try {
          const text = await file.text();
          if (text.trim()) {
            fileText += `\n\nEstratto iniziale STEP/STP:\n${text.slice(0, 16000)}`;
          }
        } catch {
          fileText += "\n\nNon sono riuscito a leggere il contenuto testuale del file STEP/STP.";
        }
      } else if (typeof preExtractedText === "string" && preExtractedText.trim()) {
        fileText = `\n\nContenuto del file:\n${preExtractedText.slice(0, 22000)}`;
      } else {
        try {
          const text = await file.text();
          fileText = text?.trim()
            ? `\n\nContenuto del file:\n${text.slice(0, 16000)}`
            : "\n\nIl file non contiene testo leggibile direttamente.";
        } catch {
          fileText = "\n\nNon sono riuscito a leggere il contenuto testuale del file.";
        }
      }
    }

    if (Array.isArray(drawingImagesParsed) && drawingImagesParsed.length > 0) {
      drawingImages = drawingImagesParsed
        .filter((img) => img?.dataUrl && String(img.dataUrl).startsWith("data:image/"))
        .map((img) => ({
          label: String(img.label || "Crop tavola"),
          dataUrl: String(img.dataUrl),
        }))
        .slice(0, 12);
    }

    return {
      message,
      messages,
      profile,
      fileText,
      imageDataUrl,
      drawingImages,
      fileMeta,
      hasFile,
      analysisMode,
    };
  }

  const body = await req.json().catch(() => ({}));

  return {
    message: body.message || "",
    messages: body.messages || [],
    profile: body.profile || {},
    fileText: body.fileText || "",
    imageDataUrl: "",
    drawingImages: Array.isArray(body.drawingImages) ? body.drawingImages : [],
    fileMeta: body.fileMeta || "",
    hasFile: Boolean(body.hasFile),
    analysisMode: normalizeAnalysisMode(body.analysisMode),
  };
}

function chooseOpenAITextModel(params: {
  message: string;
  fileText: string;
  analysisMode: AnalysisMode;
}): ModelRoute {
  const message = String(params.message || "");
  const fileText = String(params.fileText || "");
  const analysisMode = params.analysisMode || "chat";

  const routingText = `${message}\n${fileText}\n${analysisMode}`.toLowerCase();

  const fastModel =
    process.env.OPENAI_MODEL_FAST ||
    process.env.OPENAI_TEXT_MODEL ||
    process.env.OPENAI_MODEL ||
    "gpt-4o-mini";

  const mediumModel =
    process.env.OPENAI_MODEL_MEDIUM ||
    process.env.OPENAI_TEXT_MODEL ||
    process.env.OPENAI_MODEL ||
    fastModel;

  const hardModel =
    process.env.OPENAI_MODEL_HARD ||
    process.env.OPENAI_TEXT_MODEL ||
    process.env.OPENAI_MODEL ||
    "gpt-4o";

  let score = 0;
  const reasons: string[] = [];

  if (analysisMode !== "chat") {
    score += 3;
    reasons.push(`modalità ${analysisMode}`);
  }

  if (analysisMode === "bom" || analysisMode === "advanced_check" || analysisMode === "project") {
    score += 3;
    reasons.push("analisi strutturata progetto/distinta/verifica");
  }

  if (analysisMode === "solidworks") {
    score += 2;
    reasons.push("procedura guidata SolidWorks");
  }

  if (analysisMode === "step") {
    score += 3;
    reasons.push("metadata STEP/STP");
  }

  if (fileText.trim().length > 0) {
    score += 4;
    reasons.push("file allegato");
  }

  if (message.length > 1000) {
    score += 2;
    reasons.push("prompt lungo");
  }

  if (routingText.length > 6000) {
    score += 3;
    reasons.push("contesto lungo nel prompt");
  }

  if (
    /errore|error|build|typescript|react|vite|vercel|supabase|api\/chat|codice|script|tsx|ts|javascript|funzione|debug|console|runtime|deploy|backend|frontend/i.test(routingText)
  ) {
    score += 3;
    reasons.push("codice/debug");
  }

  if (
    /calcola|verifica|dimensiona|flessione|torsione|taglio|von mises|tresca|fatica|goodman|soderberg|precarico|bullone|bulloni|contatto|pressione specifica|coefficiente|momento|tensione|formula|meccanica|albero|perno|cuscinetto|linguetta/i.test(routingText)
  ) {
    score += 3;
    reasons.push("calcolo tecnico avanzato");
  }

  if (
    /tavola|disegno tecnico|rugosità|rugosita|tolleranza|gd&t|quota|sezione|cartiglio|materiale|acciaio|c45|42crmo4|aisi|inventor|solidworks|step|stp|distinta|bom|csv|json/i.test(routingText)
  ) {
    score += 3;
    reasons.push("argomento tecnico CAD/progetto");
  }

  if (
    /riassumi|spiega|confronta|analizza|migliora|riscrivi|ottimizza|progetta|scrivimi completo|copia e incolla/i.test(routingText)
  ) {
    score += 1;
    reasons.push("richiesta articolata");
  }

  if (message.length < 220 && score <= 1) {
    return {
      level: "fast",
      model: fastModel,
      maxTokens: 650,
      timeoutMs: 16000,
      reason: "domanda breve/semplice",
    };
  }

  if (score >= 6) {
    return {
      level: "hard",
      model: hardModel,
      maxTokens: 2200,
      timeoutMs: 30000,
      reason: reasons.join(", ") || "richiesta complessa",
    };
  }

  return {
    level: "medium",
    model: mediumModel,
    maxTokens: 1400,
    timeoutMs: 24000,
    reason: reasons.join(", ") || "richiesta media",
  };
}

function buildLightSystemPrompt(params: {
  userName: string;
  focus: string;
  route: ModelRoute;
  analysisMode: AnalysisMode;
}) {
  const { userName, focus, route, analysisMode } = params;

  return (
    `Sei TechAI, assistente tecnico per meccanica industriale e sviluppo React/TypeScript.\n` +
    `Utente: ${userName}. Focus: ${focus}. Modalità: ${analysisMode}. Livello: ${route.level}. Motivo: ${route.reason}.\n` +
    `Rispondi nella stessa lingua dell'utente. Sii diretto, pratico e ordinato. ` +
    `Non inventare dati. Se mancano dati, chiedili. ` +
    `Per codice, dai modifiche complete e copiabili.`
  );
}

function buildModeInstructions(analysisMode: AnalysisMode) {
  if (analysisMode === "project") {
    return (
      `\n\n## MODALITÀ PROGETTO\n` +
      `Devi aiutare l'utente a gestire un progetto tecnico meccanico.\n` +
      `Quando possibile struttura la risposta così:\n` +
      `1. Stato progetto\n` +
      `2. Verifiche salvabili\n` +
      `3. File caricati e cosa rappresentano\n` +
      `4. Criticità tecniche\n` +
      `5. Prossime azioni consigliate\n` +
      `Se l'utente carica un file, crea una prima analisi iniziale e suggerisci in quale sezione del progetto salvarlo.\n`
    );
  }

  if (analysisMode === "bom") {
    return (
      `\n\n## MODALITÀ CONTROLLO DISTINTA BASE / BOM\n` +
      `Analizza CSV/JSON o testo di distinta componenti.\n` +
      `Controlla in modo concreto: codici duplicati, materiali mancanti, quantità incoerenti, descrizioni incomplete, componenti commerciali senza norma, viti senza classe, cuscinetti senza sigla completa, trattamenti mancanti e unità mancanti.\n` +
      `Output richiesto: tabella con Riga / Problema / Gravità / Correzione consigliata e riepilogo finale. Non inventare righe non presenti.\n`
    );
  }

  if (analysisMode === "solidworks") {
    return (
      `\n\n## MODALITÀ ASSISTENTE SOLIDWORKS PRATICO\n` +
      `Usa questa struttura: Metodo consigliato, Comandi SolidWorks in italiano, Passaggi operativi numerati, Errori comuni, Quando NON usare questo metodo, Controllo finale prima della messa in tavola.\n`
    );
  }

  if (analysisMode === "advanced_check") {
    return (
      `\n\n## MODALITÀ VERIFICHE SERIE\n` +
      `Considera statica, Von Mises, Tresca, fatica Goodman/Soderberg, contatti, bulloni, linguette, cuscinetti, tolleranze e rugosità. Struttura: dati usati, formule, calcoli con unità, esito, dati mancanti.\n`
    );
  }

  if (analysisMode === "step") {
    return (
      `\n\n## MODALITÀ STEP/STP\n` +
      `Analizza metadata e testo STEP/STP quando disponibili. Non dire che vedi perfettamente il 3D. Dai anche indicazioni per importarlo in SolidWorks e renderlo modificabile.\n`
    );
  }

 if (analysisMode === "drawing") {
  return (
    `\n\n## MODALITÀ PRE-LETTURA TAVOLA TECNICA - STRICT MODE\n` +
    `Devi analizzare la tavola tecnica in modo accurato` +

    `REGOLE ANTI-ERRORE OBBLIGATORIE:\n` +
    `- Non inventare quote, tolleranze, materiali, rugosità, filetti, fori, trattamenti o note.\n` +
    `- Se un dato non è chiaramente leggibile, scrivi esattamente: "non rilevabile dalla tavola".\n` +
    `- Non dichiarare un errore tecnico se non hai evidenza chiara dalla tavola.\n` +
    `- Non dedurre materiale, scala, unità o trattamento se non sono visibili nel cartiglio o nelle note.\n` +
    `- Non trasformare una mancanza di leggibilità in un errore di progettazione.\n` +
    `- Se l'immagine/PDF è poco leggibile, segnala prima il limite di qualità.\n` +
    `- Distingui sempre tra "rilevato", "incerto" e "non rilevabile".\n\n` +

    `FORMATO RISPOSTA OBBLIGATORIO:\n` +
    `1. Qualità lettura tavola: buona / media / bassa, con motivo.\n` +
    `2. Dati rilevati con alta confidenza: cartiglio, materiale, scala, formato, unità, viste, sezioni, quote principali, tolleranze, rugosità, filetti, fori, note.\n` +
    `3. Dati incerti o parzialmente leggibili: elenco con motivo dell'incertezza.\n` +
    `4. Dati non rilevabili dalla tavola: elenco se assenti o non leggibili.\n` +
    `5. Controlli consigliati al progettista: solo checklist, non conclusioni definitive.\n` +
    `6. Possibili criticità: inserisci solo criticità supportate da evidenza chiara. Per ogni criticità scrivi: evidenza osservata, rischio, verifica consigliata.\n\n` +

    `SOGLIA DI CONFIDENZA:\n` +
    `- Alta confidenza: dato chiaramente leggibile.\n` +
    `- Media confidenza: dato parzialmente leggibile; va confermato.\n` +
    `- Bassa confidenza: non usare il dato per conclusioni.\n\n` +

    `ESEMPI DI COMPORTAMENTO CORRETTO:\n` +
    `- Se vedi "C45" chiaramente nel cartiglio, puoi scrivere materiale rilevato: C45.\n` +
    `- Se il materiale sembra "C4..." ma non è chiaro, scrivi: materiale incerto, possibile C45 ma da confermare.\n` +
    `- Se non leggi la rugosità, scrivi: rugosità non rilevabile dall'immagine.\n` +
    `- Se non vedi tolleranze, non dire che sono sbagliate: scrivi tolleranze non rilevabili o non presenti nella porzione leggibile.\n`
  );
}

  if (analysisMode === "file") {
    return (
      `\n\n## MODALITÀ FILE TECNICO\n` +
      `Analizza il file caricato e produci riepilogo tecnico, problemi rilevati, dati utili e azioni consigliate.\n`
    );
  }

  return "";
}

function buildCompactTechAiSystemPrompt(params: {
  userName: string;
  focus: string;
  route: ModelRoute;
  analysisMode: AnalysisMode;
}) {
  const { userName, focus, route, analysisMode } = params;

  return (
    `Sei TechAI, copilot tecnico per ingegneria meccanica industriale.\n` +
    `Utente: ${userName}. Focus: ${focus}.\n` +
    `Livello selezionato automaticamente: ${route.level}. Motivo: ${route.reason}. Modalità: ${analysisMode}.\n\n` +
    `REGOLE RISPOSTA:\n` +
    `- Rispondi nella stessa lingua dell'utente.\n` +
    `- Sii diretto, ordinato, tecnico e pratico.\n` +
    `- Usa Markdown e formule leggibili.\n` +
    `- Cita sempre le unità di misura.\n` +
    `- Se mancano dati, chiedili e non inventare.\n` +
    `- Se la richiesta riguarda codice, dai modifiche precise e copiabili.\n` +
    `- Se l'utente chiede un file completo, riscrivi il file completo.\n` +
    `- Se si parla di componenti o disegni tecnici, quando opportuno scrivi: "fare riferimento a normativa: ...".\n\n` +
    `PROMEMORIA TECNICO COMPATTO:\n` +
    `Meccanica: equilibrio ΣF=0, ΣM=0; F=ma; P=Fv=Mω; Mt[Nm]=9550P[kW]/n[rpm]. Trazione σ=F/A; flessione σ=Mf/Wf; torsione τ=Mt/Wt. Von Mises σid=√(σ²+3τ²). Fatica: Goodman/Soderberg. Bulloni: precarico, taglio, trazione, classe 8.8/10.9. Tolleranze: H7, k6, m6, H7/f7. Rugosità: Ra 3,2÷6,3 generica; Ra 0,8÷1,6 sedi/tenute.\n` +
    buildModeInstructions(analysisMode)
  );
}

function buildFullTechAiSystemPrompt(params: {
  userName: string;
  focus: string;
  route: ModelRoute;
  analysisMode: AnalysisMode;
}) {
  const { userName, focus, route, analysisMode } = params;

  return (
    `Sei TechAI, copilot tecnico per ingegneria meccanica industriale. Utente: ${userName}. Focus: ${focus}.\n` +
    `Livello selezionato automaticamente: ${route.level}. Motivo scelta: ${route.reason}. Modalità: ${analysisMode}.\n` +
    `Rispondi in italiano, tecnico e preciso. Usa Markdown e notazione chiara per formule. Cita sempre le unità. Se mancano dati, chiedi.\n` +
    `Se la richiesta riguarda codice, dai modifiche precise, copiabili e complete. Se chiede un file completo, riscrivi il file completo.\n` +
    buildModeInstructions(analysisMode) +
    `\n\n` +
    `## PROMEMORIA TECNICO\n` +
    `Newton F=ma. Equilibrio ΣF=0, ΣM=0. Potenza P=Fv=Mω. Mt[Nm]=9550P[kW]/n[rpm].\n` +
    `Trazione σ=F/A; ΔL=FL/(EA). Flessione σ=Mf/Wf. Torsione τ=Mt/Wt. Sezione circolare: Jf=πd⁴/64, Wf=πd³/32, Jp=πd⁴/32, Wt=πd³/16.\n` +
    `Von Mises σid=√(σ²+3τ²). Tresca piano σid=√(σ²+4τ²). Alberi Mid=√(Mf²+0,75Mt²), d≥∛(32Mid/(πσamm)).\n` +
    `Fatica: σm=(σmax+σmin)/2; σa=(σmax-σmin)/2; Se≈0,5Rm corretto; Goodman σa/Se+σm/Rm≤1/n; Soderberg σa/Se+σm/Re≤1/n.\n` +
    `Materiali: S235/S275/S355 carpenteria; C45 alberi/perni medi; 42CrMo4 e 39NiCrMo3 carichi alti; 16MnCr5 cementazione; 100Cr6 rulli/cuscinetti.\n` +
    `Tolleranze ISO 286: sede cuscinetto foro H7; albero rotante k6/m6; scorrevole H7/f7; fisso H7/s6. Rugosità: generiche Ra 3,2÷6,3 µm; sedi/tenute Ra 0,8÷1,6 µm; superfici molto funzionali Ra 0,4÷0,8 µm.\n` +
    `Bulloni: classi 8.8, 10.9; precarico Fp≈0,8fyAres; taglio Fv,R≈0,6fuAres/1,25; trazione FT,R≈0,9fuAres/1,25. Linguette: τ=2T/(wLDn), p=4T/(hLDn).\n` +
    `Oleoidraulica: F=pA; v=Q/A; centro aperto P→T; centro chiuso vie bloccate.\n`
  );
}

function isOpenAIRateLimit(status: number, raw: string) {
  const text = String(raw || "").toLowerCase();

  return (
    status === 429 ||
    text.includes("rate_limit") ||
    text.includes("rate limit") ||
    text.includes("too many requests") ||
    text.includes("tokens per minute") ||
    text.includes("requests per minute")
  );
}

function sanitizeOpenAIFailureMessage() {
  return (
    "⚠️ In questo momento il modello OpenAI principale è al limite o non disponibile.\n\n" +
    "Ho provato automaticamente una modalità più leggera, ma non è disponibile. " +
    "Riprova tra qualche minuto oppure riduci la lunghezza del messaggio."
  );
}

function extractOpenAIResponseText(data: any) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }

  const output = Array.isArray(data?.output) ? data.output : [];

  const parts: string[] = [];

  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];

    for (const block of content) {
      if (typeof block?.text === "string") parts.push(block.text);
      if (typeof block?.content === "string") parts.push(block.content);
    }
  }

  return parts.join("\n").trim();
}

async function callOpenAIText(params: {
  message: string;
  messages: ChatMessage[];
  profile: any;
  fileText: string;
  fileMeta: string;
  analysisMode: AnalysisMode;
}) {
  const openAiApiKey =
    process.env.OPENAI_API_KEY ||
    process.env.OPENAI_TEXT_API_KEY ||
    process.env.OPENAI_DRAWING_READER_API_KEY;

  const route = chooseOpenAITextModel({
    message: params.message,
    fileText: `${params.fileMeta}\n${params.fileText}`,
    analysisMode: params.analysisMode,
  });

  if (!openAiApiKey) {
    return (
      "⚠️ Backend collegato, ma manca la chiave OpenAI per la chat testuale.\n\n" +
      "Su Vercel aggiungi:\n\n" +
      "```env\n" +
      "OPENAI_API_KEY=sk-...\n" +
      "OPENAI_TEXT_MODEL=gpt-4o-mini\n" +
      "OPENAI_MODEL_FAST=gpt-4o-mini\n" +
      "OPENAI_MODEL_MEDIUM=gpt-4o-mini\n" +
      "OPENAI_MODEL_HARD=gpt-4o\n" +
      "```\n\n" +
      "Poi fai Redeploy del progetto."
    );
  }

  const userName = params.profile?.userName || "Utente";
  const focus = params.profile?.focus || "Ingegneria Meccanica";

  const fastModel =
    process.env.OPENAI_MODEL_FAST ||
    process.env.OPENAI_TEXT_MODEL ||
    process.env.OPENAI_MODEL ||
    "gpt-4o-mini";

  const fallbackRoutes: ModelRoute[] = [
    route,
    {
      level: "fast",
      model: fastModel,
      maxTokens: 900,
      timeoutMs: 18000,
      reason: "fallback automatico economico dopo errore o limite",
    },
    {
      level: "fast",
      model: "gpt-4o-mini",
      maxTokens: 700,
      timeoutMs: 18000,
      reason: "fallback finale economico",
    },
  ];

  const uniqueRoutes = fallbackRoutes.filter((item, index, arr) => {
    return arr.findIndex((x) => x.model === item.model && x.level === item.level) === index;
  });

  let lastWasRateLimit = false;

  for (let i = 0; i < uniqueRoutes.length; i++) {
    const currentRoute = uniqueRoutes[i];
    const isFallback = i > 0 || currentRoute.level === "fast";

    const cleanHistory = Array.isArray(params.messages)
      ? params.messages
          .slice(isFallback ? -3 : -6)
          .filter((m: ChatMessage) => String(m.text || "").trim())
          .map((m: ChatMessage) => ({
            role: m.role === "AI" || m.role === "assistant" ? "assistant" : "user",
            content: String(m.text || "").slice(0, isFallback ? 900 : 2200),
          }))
      : [];

    const fileTextLimit = isFallback ? 3500 : currentRoute.level === "hard" ? 14000 : 9000;

    const finalUserContent =
      `${params.message || "Rispondi all'utente."}` +
      `${params.fileMeta ? `\n\n${params.fileMeta}` : ""}` +
      `${params.fileText ? `\n\n${String(params.fileText).slice(0, fileTextLimit)}` : ""}`;

    const systemPrompt = isFallback
      ? buildLightSystemPrompt({
          userName,
          focus,
          route: currentRoute,
          analysisMode: params.analysisMode,
        })
      : currentRoute.level === "fast"
        ? buildCompactTechAiSystemPrompt({
            userName,
            focus,
            route: currentRoute,
            analysisMode: params.analysisMode,
          })
        : buildFullTechAiSystemPrompt({
            userName,
            focus,
            route: currentRoute,
            analysisMode: params.analysisMode,
          });

    const input = [
      ...cleanHistory,
      {
        role: "user",
        content: finalUserContent,
      },
    ];

    let response: Response;

    try {
      response = await fetchWithTimeout(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openAiApiKey}`,
          },
          body: JSON.stringify({
            model: currentRoute.model,
            instructions: systemPrompt,
            input,
            temperature:
              currentRoute.level === "fast"
                ? 0.3
                : currentRoute.level === "medium"
                  ? 0.35
                  : 0.25,
            max_output_tokens: currentRoute.maxTokens,
            store: false,
          }),
        },
        currentRoute.timeoutMs
      );
    } catch (error: any) {
      if (error?.name === "AbortError") {
        lastWasRateLimit = false;
        continue;
      }

      throw error;
    }

    const raw = await response.text();
    const data = safeJsonParse<any>(raw, null);

    if (response.ok) {
      const content =
        extractOpenAIResponseText(data) ||
        "Ho ricevuto la richiesta, ma OpenAI non ha restituito una risposta testuale valida.";

      if (isFallback && i > 0) {
        return (
          content +
          "\n\n---\n" +
          "Nota: ho usato automaticamente una modalità OpenAI più leggera perché il modello principale era al limite."
        );
      }

      return content;
    }

    if (isOpenAIRateLimit(response.status, raw)) {
      lastWasRateLimit = true;
      continue;
    }

    if (response.status >= 500) {
      lastWasRateLimit = false;
      continue;
    }

    return (
      "⚠️ Non sono riuscito a completare la risposta con OpenAI.\n\n" +
      `Modello usato: ${currentRoute.model}\n` +
      `Codice: ${response.status}\n\n` +
      `Dettaglio: ${raw || "nessun dettaglio ricevuto"}`
    );
  }

  if (lastWasRateLimit) {
    return sanitizeOpenAIFailureMessage();
  }

  return (
    "⚠️ OpenAI non ha risposto correttamente.\n\n" +
    "Riprova tra poco oppure riduci la lunghezza del messaggio."
  );
}

async function callOpenAIVision(params: {
  message: string;
  messages: ChatMessage[];
  profile: any;
  imageDataUrl: string;
  drawingImages: DrawingImageInput[];
  fileText: string;
  fileMeta: string;
  analysisMode: AnalysisMode;
}) {
  const openAiDrawingKey = process.env.OPENAI_DRAWING_READER_API_KEY;

  const model = process.env.OPENAI_DRAWING_READER_MODEL || "gpt-4o-mini";
  const openAiTimeoutMs = Number(process.env.OPENAI_DRAWING_TIMEOUT_MS || "45000");

  if (!openAiDrawingKey) {
    return (
      "⚠️ Backend collegato, ma manca la chiave OpenAI per il lettore tavole.\n\n" +
      "Su Vercel aggiungi almeno una di queste variabili:\n\n" +
      "```env\n" +
      "OPENAI_DRAWING_READER_API_KEY=sk-...\n" +
      "# oppure\n" +
      "OPENAI_API_KEY=sk-...\n\n" +
      "OPENAI_DRAWING_READER_MODEL=gpt-4o-mini\n" +
      "```\n\n" +
      "Poi fai Redeploy del progetto."
    );
  }

  const userName = params.profile?.userName || "Utente";
  const focus = params.profile?.focus || "Ingegneria Meccanica";

  const extractedPdfText = String(params.fileText || "").trim();

  const prompt =
    `${params.message || "Analizza questa immagine tecnica con la massima precisione."}

` +
    `${params.fileMeta ? `${params.fileMeta}
` : ""}` +
    `Modalità analisi: ${params.analysisMode}
` +
    (extractedPdfText
      ? `

TESTO ESTRATTO DAL PDF, DA USARE COME SUPPORTO E NON COME UNICA FONTE:
${extractedPdfText.slice(0, 26000)}
`
      : "");

  const imageInputs =
    params.drawingImages && params.drawingImages.length > 0
      ? params.drawingImages
      : params.imageDataUrl
        ? [{ label: "Immagine tecnica caricata", dataUrl: params.imageDataUrl }]
        : [];

  const visionContent: any[] = [
    {
      type: "text",
      text:
        prompt +
        "\n\nIMPORTANTE LETTURA TAVOLA PDF/A1/A0:\n" +
        "Le immagini allegate sono crop della stessa tavola tecnica: alcuni automatici da testo PDF, alcuni da aree grafiche dense, più crop di sicurezza. Non trattarle come tavole separate.\n" +
        "Usa la vista completa solo per orientarti.\n" +
        "Usa i crop dinamici per leggere cartiglio, note, viste, sezioni, quote, fori, filetti, lamature e lavorazioni.\n" +
        "Il testo estratto dal PDF serve come aiuto per riconoscere dati e parole, ma le conclusioni devono restare collegate alla tavola/crop visibili.\n" +
        "Distingui chiaramente: rilevato / incerto / non leggibile. Non inventare dati mancanti e non trasformare la scarsa leggibilità in errore tecnico.\n",    },
  ];

  for (const img of imageInputs.slice(0, 12)) {
    visionContent.push({ type: "text", text: `Immagine/crop: ${img.label}` });
    visionContent.push({
      type: "image_url",
      image_url: {
        url: img.dataUrl,
        detail: "high",
      },
    });
  }

  let response: Response;

  try {
    response = await fetchWithTimeout(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiDrawingKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                `Sei TechAI Vision, un ingegnere meccanico senior specializzato in disegno tecnico secondo norme ISO 128, ISO 1101, ISO 286 e ISO 1302. ` +
                `Utente: ${userName}. Settore: ${focus}. Modalità: ${params.analysisMode}. ` +
                "Il tuo compito è analizzare tavole tecniche meccaniche, immagini CAD, screenshot SolidWorks, componenti meccanici e distinte visive con la massima precisione. " +
                "Leggi quote, tolleranze, rugosità, filetti, fori, lamature, scale, materiale, trattamento e cartiglio quando visibili. " +
                "Non inventare valori: se un dato non è leggibile o non è presente, scrivi chiaramente 'non leggibile' oppure 'non indicato'. " +
                "Quando la qualità dell'immagine è bassa, segnala il limite prima di giudicare la tavola. " +
                "Rispondi in italiano tecnico preciso. " +
                "\n\nREGOLE DI FORMATTAZIONE OBBLIGATORIE:\n" +
                "Usa sempre emoji di stato all'inizio delle righe di controllo:\n" +
                "✅ = elemento presente, leggibile, coerente o verificato.\n" +
                "⚠️ = dato non rilevabile, dubbio, incompleto, da confermare o possibile incoerenza.\n" +
                "❌ = errore certo o mancanza critica solo quando hai evidenza chiara che impedisce produzione, controllo o montaggio.\n" +
                "Non usare giudizi secchi tipo giusto/sbagliato quando manca la funzione del pezzo: usa 'coerente', 'da verificare', 'possibile incoerenza', 'mancanza critica'.\n" +
                "Non usare asterischi Markdown tipo **Materiale** quando scrivi gli esiti tecnici. Scrivi invece frasi pulite.\n" +
                "Esempio corretto: ✅ Materiale: 11SMnPb37 - UNI EN 10087.\n" +
                "Esempio corretto: ⚠️ Rugosità specifica: non rilevata sulle superfici funzionali visibili; da verificare in base alla funzione.\n" +
                "Esempio corretto: ⚠️ Tolleranze geometriche: non rilevate; non è automaticamente un errore se non ci sono superfici funzionali critiche.\n" +
                "Esempio corretto: ❌ Mancanza critica: sede cuscinetto chiaramente identificabile senza tolleranza dimensionale o riferimento funzionale.\n" +
                "\n\nMETODO TECNICO PER TOLLERANZE E RUGOSITÀ:\n" +
                "Non limitarti a dire se tolleranze e rugosità sono presenti. Devi valutare la coerenza con la funzione osservabile della superficie.\n" +
                "Per ogni tolleranza, accoppiamento, datum o rugosità importante indica sempre: elemento osservato, funzione presunta, valore rilevato, valutazione, motivo tecnico, verifica/correzione consigliata.\n" +
                "Se la funzione non è chiara, non concludere che è sbagliato: scrivi 'da verificare'.\n" +
                "Se il valore non è leggibile, scrivi 'non rilevabile dalla tavola/crop analizzato'.\n" +
                "\n\nREGOLE DI VALUTAZIONE TOLLERANZE DIMENSIONALI:\n" +
                "- Quote di ingombro o superfici non funzionali: può bastare tolleranza generale, ad esempio ISO 2768, se indicata nel cartiglio/note.\n" +
                "- Fori generici di passaggio: non segnalare errore se non hanno tolleranza specifica, salvo interassi/funzione di montaggio critica.\n" +
                "- Fori o diametri di centraggio, sedi, guide, spine, cuscinetti, alberi, boccole: richiedono normalmente tolleranza specifica o accoppiamento.\n" +
                "- Accoppiamenti tipo H7, h6, g6, k6, m6 sono potenzialmente coerenti solo se collegati a funzione di sede, scorrimento, centraggio o montaggio.\n" +
                "- Se vedi una sede cuscinetto su albero, valuta come possibili k6/m6/n6 in base a carico e rotazione; se vedi alloggiamento foro, valuta H7/J7/K7 come riferimento indicativo. Non imporli come obbligatori senza contesto.\n" +
                "- Se una quota funzionale sembra priva di tolleranza specifica e non c'è tolleranza generale, segnala ⚠️ possibile mancanza. Usa ❌ solo se la produzione/montaggio è chiaramente non controllabile.\n" +
                "\n\nREGOLE DI VALUTAZIONE TOLLERANZE GEOMETRICHE GD&T:\n" +
                "- Non dire che i GD&T sono sbagliati solo perché non sono visibili. Scrivi: ⚠️ GD&T non rilevati, da verificare se necessari.\n" +
                "- Datum A/B/C sono necessari quando ci sono quote di posizione, coassialità, parallelismo, perpendicolarità, superfici di riferimento o controlli funzionali.\n" +
                "- Superfici di appoggio o montaggio possono richiedere planarità, parallelismo o perpendicolarità.\n" +
                "- Fori in pattern funzionali possono richiedere tolleranza di posizione con datum.\n" +
                "- Diametri coassiali o sedi rotanti possono richiedere coassialità, concentricità, oscillazione/runout o riferimenti equivalenti.\n" +
                "- Se non identifichi chiaramente superfici funzionali, usa ⚠️ da verificare, non ❌.\n" +
                "\n\nREGOLE DI VALUTAZIONE RUGOSITÀ:\n" +
                "- Superfici non funzionali o estetiche: può bastare rugosità generale nel cartiglio, spesso indicativa Ra 3.2-6.3 µm in lavorazioni comuni.\n" +
                "- Superfici di appoggio lavorate: valori indicativi spesso Ra 1.6-3.2 µm, da confermare in base a funzione e processo.\n" +
                "- Sedi cuscinetto, sedi precise, superfici di centraggio o accoppiamento: valori indicativi spesso Ra 0.8-1.6 µm.\n" +
                "- Superfici di scorrimento, tenuta, guida o usura: valori indicativi spesso Ra 0.4-1.6 µm, ma dipende da lubrificazione, materiale e funzione.\n" +
                "- Filetti e smussi normalmente non richiedono sempre rugosità specifica, salvo funzione particolare.\n" +
                "- Se manca rugosità generale e ci sono superfici funzionali visibili, segnala ⚠️ possibile mancanza. Usa ❌ solo se la rugosità è chiaramente indispensabile e assente.\n" +
                "- Se leggi un valore molto grossolano su una superficie di scorrimento/sede, segnala ⚠️ possibile incoerenza e proponi verifica, non bocciare automaticamente.\n" +
                "\n\nSTRUTTURA RISPOSTA OBBLIGATORIA PER TAVOLE TECNICHE:\n" +
                "## 1. Cartiglio\n" +
                "Per ogni voce usa ✅ / ❌ / ⚠️. Controlla nome pezzo, numero disegno, materiale, scala, autore, data, revisione, unità.\n\n" +
                "## 2. Viste e sezioni\n" +
                "Controlla se le viste sono sufficienti, se servono sezioni A-A/B-B, dettagli, viste ausiliarie o ingrandimenti.\n\n" +
                "## 3. Quotatura\n" +
                "Cita le quote leggibili. Segnala quote mancanti, ridondanti, catene chiuse, riferimenti poco chiari o quote funzionali assenti.\n\n" +
                "## 4. Tolleranze dimensionali e accoppiamenti\n" +
                "Dividi la risposta in: valori rilevati, superfici/quote funzionali presunte, valutazione tecnica, possibili incoerenze, correzioni consigliate.\n\n" +
                "## 5. Tolleranze geometriche e datum\n" +
                "Indica GD&T rilevati, datum rilevati, superfici che potrebbero richiederli, valutazione tecnica e verifiche consigliate. Non trasformare 'non rilevato' in errore automatico.\n\n" +
                "## 6. Rugosità\n" +
                "Indica rugosità generale, rugosità specifiche, superfici funzionali interessate, coerenza del valore e verifica consigliata.\n\n" +
                "## 7. Filetti, fori e lamature\n" +
                "Controlla designazioni filetti, profondità, lamature, svasature, fori passanti/ciechi, interassi e quantità fori.\n\n" +
                "## 8. Materiale e trattamenti\n" +
                "Controlla materiale, norma, trattamenti termici, trattamenti superficiali, durezza e note produttive.\n\n" +
                "## 9. Errori critici e correzioni prioritarie\n" +
                "Elenca solo problemi concreti supportati dalla tavola. Per ogni punto scrivi: evidenza osservata, rischio, verifica/correzione consigliata. Se non hai evidenze, scrivi: ✅ Errori critici: nessuno riscontrato.\n\n" +
                "## 10. Giudizio finale\n" +
                "Usa obbligatoriamente uno solo di questi tre esiti:\n" +
                "✅ APPROVATA\n" +
                "⚠️ APPROVATA CON NOTE / DA RIVEDERE\n" +
                "❌ NON APPROVATA\n" +
                "Poi aggiungi una frase breve con il motivo principale.\n\n" +
                "CRITERIO GIUDIZIO:\n" +
                "Se i dati critici non sono leggibili, non dare giudizio definitivo: usa ⚠️ APPROVATA CON NOTE / DA RIVEDERE. " +
                "Se mancano dati fondamentali come materiale, quote principali o tolleranze funzionali chiaramente necessarie, non dare ✅ APPROVATA piena. Usa ⚠️ o ❌. " +
                "Se la tavola è leggibile e completa per produzione, usa ✅ APPROVATA. " +
                "Se ci sono errori gravi che impediscono la produzione o il controllo, usa ❌ NON APPROVATA. " +
                "\n\nSE NON È UNA TAVOLA TECNICA:\n" +
                "Mantieni comunque gli emoji ✅ / ❌ / ⚠️, ma adatta le sezioni al contenuto dell'immagine. " +
                "Se è uno screenshot CAD/SolidWorks, aggiungi: Metodo consigliato, Comandi SolidWorks in italiano, Errori comuni e Quando NON usare questo metodo.",
            },
            {
              role: "user",
              content: visionContent,
            },
          ],
          temperature: 0.15,
          max_tokens: 4000,
        }),
      },
      openAiTimeoutMs
    );
  } catch (error: any) {
    if (error?.name === "AbortError") {
      return (
        "⚠️ Timeout OpenAI durante l'analisi immagine.\n\n" +
        `Modello usato: ${model}\n\n` +
        "La funzione ha interrotto la chiamata prima della risposta del modello.\n\n" +
        "Prova con un'immagine più leggera oppure imposta in Vercel:\n\n" +
        "```env\n" +
        "OPENAI_DRAWING_READER_MODEL=gpt-4o-mini\n" +
        "```"
      );
    }

    throw error;
  }

  const raw = await response.text();
  const data = safeJsonParse<any>(raw, null);

  if (!response.ok) {
    return (
      "⚠️ OpenAI ha restituito un errore durante l'analisi immagine.\n\n" +
      `Modello usato: ${model}\n` +
      `Codice: ${response.status}\n\n` +
      `Dettaglio: ${raw || "nessun dettaglio ricevuto"}\n\n` +
      "Controlla che la chiave OpenAI sia valida e che il modello scelto supporti immagini. " +
      "Variabili richieste: OPENAI_DRAWING_READER_API_KEY e OPENAI_DRAWING_READER_MODEL."
    );
  }

  return (
    data?.choices?.[0]?.message?.content ||
    "Ho ricevuto l'immagine, ma OpenAI non ha restituito una risposta valida."
  );
}

async function checkAuthAndRateLimit(
  req: Request,
  usageRequest: { hasFile: boolean }
): Promise<AuthResult> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      ok: false,
      response: jsonResponse({ error: "Supabase server non configurato." }, 500),
    };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const authHeader = req.headers.get("authorization");
  const guestId = req.headers.get("x-guest-id");

  if (!authHeader && guestId) {
    const cleanGuestId = guestId.trim();

    if (!cleanGuestId || cleanGuestId.length < 8 || cleanGuestId.length > 120) {
      return {
        ok: false,
        response: jsonResponse({ error: "Guest ID non valido." }, 400),
      };
    }

    const { data: existingGuest, error: selectError } = await supabase
      .from("guest_usage")
      .select("guest_id, ai_requests_used, ai_requests_limit, file_uploads_used, file_uploads_limit, window_started_at")
      .eq("guest_id", cleanGuestId)
      .maybeSingle();

    if (selectError) {
      return {
        ok: false,
        response: jsonResponse(
          {
            error: "Errore controllo limite ospite.",
            detail: selectError.message,
          },
          500
        ),
      };
    }

    const nowIso = new Date().toISOString();

    if (!existingGuest) {
      const { error: insertError } = await supabase
        .from("guest_usage")
        .insert({
          guest_id: cleanGuestId,
          ai_requests_used: 0,
          ai_requests_limit: GUEST_TEXT_LIMIT_24H,
          file_uploads_used: 0,
          file_uploads_limit: GUEST_FILE_LIMIT_24H,
          window_started_at: nowIso,
          updated_at: nowIso,
        });

      if (insertError) {
        return {
          ok: false,
          response: jsonResponse(
            {
              error: "Errore creazione profilo ospite.",
              detail: insertError.message,
            },
            500
          ),
        };
      }

      return {
        ok: true,
        mode: "guest",
        guestId: cleanGuestId,
        supabase,
        usage: {
          used: 0,
          limit: GUEST_TEXT_LIMIT_24H,
          fileUsed: 0,
          fileLimit: GUEST_FILE_LIMIT_24H,
          windowStartedAt: nowIso,
        },
      };
    }

    let used = Number(existingGuest.ai_requests_used || 0);
    let limit = Number(existingGuest.ai_requests_limit || GUEST_TEXT_LIMIT_24H);
    let fileUsed = Number(existingGuest.file_uploads_used || 0);
    let fileLimit = Number(existingGuest.file_uploads_limit || GUEST_FILE_LIMIT_24H);
    let windowStartedAt = String(existingGuest.window_started_at || nowIso);

    if (isOlderThan24Hours(windowStartedAt)) {
      used = 0;
      limit = GUEST_TEXT_LIMIT_24H;
      fileUsed = 0;
      fileLimit = GUEST_FILE_LIMIT_24H;
      windowStartedAt = nowIso;

      const { error: resetError } = await supabase
        .from("guest_usage")
        .update({
          ai_requests_used: 0,
          ai_requests_limit: GUEST_TEXT_LIMIT_24H,
          file_uploads_used: 0,
          file_uploads_limit: GUEST_FILE_LIMIT_24H,
          window_started_at: nowIso,
          updated_at: nowIso,
        })
        .eq("guest_id", cleanGuestId);

      if (resetError) {
        return {
          ok: false,
          response: jsonResponse(
            {
              error: "Errore reset limite ospite.",
              detail: resetError.message,
            },
            500
          ),
        };
      }
    } else if (limit !== GUEST_TEXT_LIMIT_24H || fileLimit !== GUEST_FILE_LIMIT_24H) {
      limit = GUEST_TEXT_LIMIT_24H;
      fileLimit = GUEST_FILE_LIMIT_24H;

      await supabase
        .from("guest_usage")
        .update({
          ai_requests_limit: GUEST_TEXT_LIMIT_24H,
          file_uploads_limit: GUEST_FILE_LIMIT_24H,
          updated_at: nowIso,
        })
        .eq("guest_id", cleanGuestId);
    }

    if (used >= limit) {
      return {
        ok: false,
        response: jsonResponse(
          {
            error: "Limite ospite raggiunto",
            used,
            limit,
            fileUsed,
            fileLimit,
            resetAfterHours: GUEST_WINDOW_HOURS,
          },
          403
        ),
      };
    }

    if (usageRequest.hasFile && fileUsed >= fileLimit) {
      return {
        ok: false,
        response: jsonResponse(
          {
            error: "Limite file ospite raggiunto",
            used,
            limit,
            fileUsed,
            fileLimit,
            resetAfterHours: GUEST_WINDOW_HOURS,
          },
          403
        ),
      };
    }

    return {
      ok: true,
      mode: "guest",
      guestId: cleanGuestId,
      supabase,
      usage: {
        used,
        limit,
        fileUsed,
        fileLimit,
        windowStartedAt,
      },
    };
  }

  if (!authHeader) {
    return {
      ok: false,
      response: jsonResponse({ error: "Token mancante. Effettua il login oppure entra come ospite." }, 401),
    };
  }

  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    return {
      ok: false,
      response: jsonResponse({ error: "Token non valido." }, 401),
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return {
      ok: false,
      response: jsonResponse({ error: "Sessione non valida. Effettua di nuovo il login." }, 401),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, plan, ai_requests_used, ai_requests_limit")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return {
      ok: false,
      response: jsonResponse({ error: "Profilo utente non trovato." }, 404),
    };
  }

  if (profile.ai_requests_used >= profile.ai_requests_limit) {
    return {
      ok: false,
      response: jsonResponse(
        {
          error: "Limite AI raggiunto",
          plan: profile.plan,
          used: profile.ai_requests_used,
          limit: profile.ai_requests_limit,
        },
        403
      ),
    };
  }

  return {
    ok: true,
    mode: "user",
    userId: user.id,
    supabase,
  };
}

async function incrementUserUsage(supabase: any, userId: string) {
  if (!userId || !supabase) return;

  const { data, error: readError } = await supabase
    .from("profiles")
    .select("ai_requests_used, ai_requests_limit")
    .eq("id", userId)
    .single();

  if (readError || !data) {
    console.error("Errore lettura usage utente:", readError);
    return;
  }

  const profile = data as { ai_requests_used: number; ai_requests_limit: number };

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ ai_requests_used: profile.ai_requests_used + 1 })
    .eq("id", userId);

  if (updateError) {
    console.error("Errore update usage utente:", updateError);
  }
}

async function incrementGuestUsage(supabase: any, guestId: string, hasFile: boolean) {
  if (!guestId || !supabase) {
    return {
      used: 0,
      limit: GUEST_TEXT_LIMIT_24H,
      fileUsed: 0,
      fileLimit: GUEST_FILE_LIMIT_24H,
      windowStartedAt: new Date().toISOString(),
    };
  }

  const { data, error: readError } = await supabase
    .from("guest_usage")
    .select("ai_requests_used, ai_requests_limit, file_uploads_used, file_uploads_limit, window_started_at")
    .eq("guest_id", guestId)
    .single();

  if (readError || !data) {
    console.error("Errore lettura usage ospite:", readError);
    return {
      used: 0,
      limit: GUEST_TEXT_LIMIT_24H,
      fileUsed: 0,
      fileLimit: GUEST_FILE_LIMIT_24H,
      windowStartedAt: new Date().toISOString(),
    };
  }

  const used = Number(data.ai_requests_used || 0) + 1;
  const fileUsed = Number(data.file_uploads_used || 0) + (hasFile ? 1 : 0);
  const limit = Number(data.ai_requests_limit || GUEST_TEXT_LIMIT_24H);
  const fileLimit = Number(data.file_uploads_limit || GUEST_FILE_LIMIT_24H);
  const windowStartedAt = String(data.window_started_at || new Date().toISOString());

  const { error: updateError } = await supabase
    .from("guest_usage")
    .update({
      ai_requests_used: used,
      file_uploads_used: fileUsed,
      updated_at: new Date().toISOString(),
    })
    .eq("guest_id", guestId);

  if (updateError) {
    console.error("Errore update usage ospite:", updateError);
  }

  return {
    used,
    limit,
    fileUsed,
    fileLimit,
    windowStartedAt,
  };
}

export default async function handler(req: Request) {
  if (req.method === "GET") {
    return jsonResponse({
      ok: true,
      message: "API /api/chat funzionante",
      env: {
        hasOpenAITextKey: Boolean(
          process.env.OPENAI_API_KEY ||
          process.env.OPENAI_TEXT_API_KEY ||
          process.env.OPENAI_DRAWING_READER_API_KEY
        ),
        openAITextKeyPreview:
          (process.env.OPENAI_API_KEY ||
            process.env.OPENAI_TEXT_API_KEY ||
            process.env.OPENAI_DRAWING_READER_API_KEY)?.slice(0, 8) || "MISSING",
        openAITextModelFallback:
          process.env.OPENAI_TEXT_MODEL ||
          process.env.OPENAI_MODEL ||
          "gpt-4o-mini",
        openAIModelFast:
          process.env.OPENAI_MODEL_FAST ||
          process.env.OPENAI_TEXT_MODEL ||
          process.env.OPENAI_MODEL ||
          "gpt-4o-mini",
        openAIModelMedium:
          process.env.OPENAI_MODEL_MEDIUM ||
          process.env.OPENAI_TEXT_MODEL ||
          process.env.OPENAI_MODEL ||
          "gpt-4o-mini",
        openAIModelHard:
          process.env.OPENAI_MODEL_HARD ||
          process.env.OPENAI_TEXT_MODEL ||
          process.env.OPENAI_MODEL ||
          "gpt-4o",
        hasOpenAIDrawingKey: Boolean(process.env.OPENAI_DRAWING_READER_API_KEY),
        openAIDrawingKeyPreview:
          process.env.OPENAI_DRAWING_READER_API_KEY?.slice(0, 8) || "MISSING",
        openAIDrawingModel:
          process.env.OPENAI_DRAWING_READER_MODEL || "gpt-4o-mini",
        hasSupabase: Boolean(
          process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
        ),
        guestTextLimit24h: GUEST_TEXT_LIMIT_24H,
        guestFileLimit24h: GUEST_FILE_LIMIT_24H,
        guestWindowHours: GUEST_WINDOW_HOURS,
      },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Metodo non consentito. Usa POST." }, 405);
  }

  try {
    const body = await readRequestBody(req);

    const auth = await checkAuthAndRateLimit(req, {
      hasFile: body.hasFile,
    });

    if (!auth.ok) {
      return auth.response;
    }

    const hasVisionInput =
      Boolean(body.imageDataUrl) ||
      Boolean(body.drawingImages && body.drawingImages.length > 0);

    const answer = hasVisionInput
      ? await callOpenAIVision({
          message: body.message,
          messages: body.messages,
          profile: body.profile,
          imageDataUrl: body.imageDataUrl,
          drawingImages: body.drawingImages,
          fileText: body.fileText,
          fileMeta: body.fileMeta,
          analysisMode: body.analysisMode,
        })
      : await callOpenAIText({
          message: body.message,
          messages: body.messages,
          profile: body.profile,
          fileText: body.fileText,
          fileMeta: body.fileMeta,
          analysisMode: body.analysisMode,
        });

    let usage: any = null;

    if (auth.mode === "user") {
      await incrementUserUsage(auth.supabase, auth.userId);
    } else {
      usage = await incrementGuestUsage(auth.supabase, auth.guestId, body.hasFile);
    }

    return jsonResponse({
      answer,
      mode: auth.mode,
      usage,
    });
  } catch (error: any) {
    return jsonResponse(
      {
        answer:
          "⚠️ Errore interno nella rotta `/api/chat`.\n\n" +
          `Dettaglio tecnico: ${error?.message || "errore sconosciuto"}`,
      },
      500
    );
  }
}
