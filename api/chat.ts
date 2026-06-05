type ChatMessage = {
  role?: string;
  text?: string;
};

type DrawingImageInput = {
  label?: string;
  dataUrl?: string;
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
  analysisMode: string;
};

export const config = {
  runtime: "edge",
};

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

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function cleanAiOutput(text: string) {
  return String(text || "")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function getOpenAIKey(mode: "text" | "vision") {
  if (mode === "vision") {
    return (
      process.env.OPENAI_DRAWING_READER_API_KEY ||
      process.env.OPENAI_TEXT_API_KEY ||
      process.env.OPENAI_API_KEY ||
      ""
    );
  }

  return (
    process.env.OPENAI_TEXT_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.OPENAI_DRAWING_READER_API_KEY ||
    ""
  );
}

function getTextModel() {
  return (
    process.env.OPENAI_TEXT_MODEL_FAST ||
    process.env.OPENAI_TEXT_MODEL ||
    process.env.OPENAI_API_MODEL ||
    "gpt-4o-mini"
  );
}

function getVisionModel() {
  return process.env.OPENAI_DRAWING_READER_MODEL || "gpt-4o-mini";
}

async function readRequestBody(req: Request): Promise<RequestBodyData> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const message = String(formData.get("message") || "");
    const messages = safeJsonParse<ChatMessage[]>(String(formData.get("messages") || "[]"), []);
    const profile = safeJsonParse<any>(String(formData.get("profile") || "{}"), {});
    const analysisMode = String(formData.get("analysisMode") || "chat");
    const drawingImages = safeJsonParse<DrawingImageInput[]>(String(formData.get("drawingImages") || "[]"), []);
    const preExtractedText = String(formData.get("fileText") || "");
    const file = formData.get("file");

    let fileText = preExtractedText ? `Contenuto file:\n${preExtractedText.slice(0, 8000)}` : "";
    let imageDataUrl = "";
    let fileMeta = "";
    let hasFile = false;

    if (file instanceof File && file.size > 0) {
      hasFile = true;
      const fileName = file.name || "file caricato";
      const fileType = file.type || "sconosciuto";
      const fileSizeKb = (file.size / 1024).toFixed(1);

      fileMeta =
        `File caricato:\n` +
        `Nome: ${fileName}\n` +
        `Tipo: ${fileType}\n` +
        `Dimensione: ${fileSizeKb} KB\n` +
        `Modalità analisi: ${analysisMode}\n`;

      if (file.type.startsWith("image/")) {
        const buffer = await file.arrayBuffer();
        imageDataUrl = `data:${file.type};base64,${arrayBufferToBase64(buffer)}`;
      } else if (!fileText) {
        try {
          const text = await file.text();
          fileText = text.trim()
            ? `Contenuto file:\n${text.slice(0, 8000)}`
            : "Il file non contiene testo leggibile direttamente.";
        } catch {
          fileText = "Non sono riuscito a leggere il file come testo.";
        }
      }
    }

    return {
      message,
      messages,
      profile,
      fileText,
      imageDataUrl,
      drawingImages: Array.isArray(drawingImages) ? drawingImages : [],
      fileMeta,
      hasFile,
      analysisMode,
    };
  }

  const body = await req.json().catch(() => ({}));

  return {
    message: String(body.message || ""),
    messages: Array.isArray(body.messages) ? body.messages : [],
    profile: body.profile || {},
    fileText: String(body.fileText || ""),
    imageDataUrl: String(body.imageDataUrl || ""),
    drawingImages: Array.isArray(body.drawingImages) ? body.drawingImages : [],
    fileMeta: String(body.fileMeta || ""),
    hasFile: Boolean(body.hasFile),
    analysisMode: String(body.analysisMode || "chat"),
  };
}

async function callOpenAIText(body: RequestBodyData): Promise<string> {
  const apiKey = getOpenAIKey("text");
  const model = getTextModel();

  if (!apiKey) {
    return (
      "⚠️ Backend collegato, ma chiave OpenAI mancante.\n\n" +
      "Controlla su Vercel una di queste variabili: OPENAI_API_KEY oppure OPENAI_TEXT_API_KEY."
    );
  }

  const history = Array.isArray(body.messages)
    ? body.messages
        .slice(-4)
        .filter((m) => String(m.text || "").trim())
        .map((m) => ({
          role: m.role === "AI" || m.role === "assistant" ? "assistant" : "user",
          content: String(m.text || "").slice(0, 1200),
        }))
    : [];

  const userContent =
    `${body.message || "Rispondi all'utente."}` +
    `${body.fileMeta ? `\n\n${body.fileMeta}` : ""}` +
    `${body.fileText ? `\n\n${String(body.fileText).slice(0, 8000)}` : ""}`;

  const response = await fetchWithTimeout(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "Sei TechAI, assistente tecnico per progettazione meccanica, SolidWorks, materiali, tavole tecniche e sviluppo software. Rispondi in italiano, in modo diretto, pratico e ordinato. Non inventare dati non presenti.",
          },
          ...history,
          {
            role: "user",
            content: userContent,
          },
        ],
        temperature: 0.25,
        max_tokens: 900,
      }),
    },
    18000
  );

  const raw = await response.text();
  const data = safeJsonParse<any>(raw, null);

  if (!response.ok) {
    return (
      "⚠️ OpenAI ha restituito un errore sulla chat.\n\n" +
      `Modello usato: ${model}\n` +
      `Codice: ${response.status}\n\n` +
      `Dettaglio: ${raw.slice(0, 1200)}`
    );
  }

  return cleanAiOutput(
    data?.choices?.[0]?.message?.content ||
      "Ho ricevuto la richiesta, ma il modello non ha restituito una risposta valida."
  );
}

async function callOpenAIVision(body: RequestBodyData): Promise<string> {
  const apiKey = getOpenAIKey("vision");
  const model = getVisionModel();

  if (!apiKey) {
    return (
      "⚠️ Backend collegato, ma chiave OpenAI per analisi tavole mancante.\n\n" +
      "Controlla su Vercel OPENAI_API_KEY oppure OPENAI_DRAWING_READER_API_KEY."
    );
  }

  const imageInputs =
    body.drawingImages && body.drawingImages.length > 0
      ? body.drawingImages
      : body.imageDataUrl
        ? [{ label: "Immagine caricata", dataUrl: body.imageDataUrl }]
        : [];

  const safeImages = imageInputs
    .filter((img) => String(img?.dataUrl || "").startsWith("data:image/"))
    .slice(0, 3);

  if (safeImages.length === 0) {
    return "⚠️ Nessuna immagine valida ricevuta per l'analisi visiva.";
  }

  const prompt =
    `${body.message || "Analizza questa tavola tecnica."}\n\n` +
    `${body.fileMeta ? `${body.fileMeta}\n` : ""}` +
    `${body.fileText ? `Testo estratto dal PDF:\n${String(body.fileText).slice(0, 6000)}\n` : ""}` +
    "Analizza solo ciò che è leggibile. Non inventare quote, materiali, tolleranze o rugosità. Distingui sempre tra rilevato, incerto e non leggibile. Usa un report tecnico sintetico con sezioni: cartiglio, viste, quote, tolleranze, rugosità, fori/filetti, materiale/trattamenti, criticità, giudizio finale.";

  const visionContent: any[] = [
    {
      type: "text",
      text: prompt,
    },
  ];

  for (const img of safeImages) {
    visionContent.push({ type: "text", text: `Immagine/crop: ${img.label || "crop tavola"}` });
    visionContent.push({
      type: "image_url",
      image_url: {
        url: img.dataUrl,
        detail: "low",
      },
    });
  }

  const response = await fetchWithTimeout(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "Sei TechAI Vision, assistente tecnico per tavole meccaniche. Rispondi in italiano. Non inventare dati non leggibili. Evidenzia errori reali, dubbi e dati mancanti.",
          },
          {
            role: "user",
            content: visionContent,
          },
        ],
        temperature: 0.15,
        max_tokens: 1000,
      }),
    },
    22000
  );

  const raw = await response.text();
  const data = safeJsonParse<any>(raw, null);

  if (!response.ok) {
    return (
      "⚠️ OpenAI ha restituito un errore durante l'analisi immagine.\n\n" +
      `Modello usato: ${model}\n` +
      `Codice: ${response.status}\n\n` +
      `Dettaglio: ${raw.slice(0, 1200)}`
    );
  }

  return cleanAiOutput(
    data?.choices?.[0]?.message?.content ||
      "Ho ricevuto l'immagine, ma il modello non ha restituito una risposta valida."
  );
}

export default async function handler(req: Request) {
  if (req.method === "GET") {
    return jsonResponse({
      ok: true,
      message: "API /api/chat funzionante",
      env: {
        hasOpenAITextKey: Boolean(process.env.OPENAI_TEXT_API_KEY || process.env.OPENAI_API_KEY),
        hasOpenAIDrawingKey: Boolean(process.env.OPENAI_DRAWING_READER_API_KEY || process.env.OPENAI_API_KEY),
        textModel: getTextModel(),
        drawingModel: getVisionModel(),
      },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Metodo non consentito. Usa POST." }, 405);
  }

  try {
    const body = await readRequestBody(req);
    const hasVisionInput = Boolean(body.imageDataUrl) || Boolean(body.drawingImages?.length);

    const answer = hasVisionInput
      ? await callOpenAIVision(body)
      : await callOpenAIText(body);

    return jsonResponse({
      answer,
      mode: "user",
      usage: null,
    });
  } catch (error: any) {
    if (error?.name === "AbortError") {
      return jsonResponse(
        {
          answer:
            "⚠️ Timeout durante la chiamata AI.\n\n" +
            "La richiesta è stata interrotta prima del limite Vercel per evitare FUNCTION_INVOCATION_TIMEOUT. Prova con un messaggio più breve o con un file immagine/PDF più leggero.",
        },
        504
      );
    }

    return jsonResponse(
      {
        answer:
          "⚠️ Errore interno nella rotta /api/chat.\n\n" +
          `Dettaglio tecnico: ${error?.message || "errore sconosciuto"}`,
      },
      500
    );
  }
}
