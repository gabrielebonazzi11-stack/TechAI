// FILE: api/drawing-fast.ts

export const config = {
  runtime: "edge",
};

type DrawingImageInput = {
  label: string;
  dataUrl: string;
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

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 52000) {
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

async function fileToDataUrl(file: File) {
  const buffer = await file.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);
  return `data:${file.type || "image/jpeg"};base64,${base64}`;
}

function cleanAnswer(value: string) {
  return String(value || "")
    .replace(/```markdown/gi, "```")
    .replace(/\*\*/g, "")
    .trim();
}

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Metodo non consentito." }, 405);
  }

  const openAiDrawingKey = process.env.OPENAI_DRAWING_READER_API_KEY || process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_DRAWING_READER_MODEL || "gpt-4o-mini";

  if (!openAiDrawingKey) {
    return jsonResponse({ error: "OPENAI_DRAWING_READER_API_KEY non configurata." }, 500);
  }

  try {
    const formData = await req.formData();
    const message = String(formData.get("message") || "Analizza questa tavola tecnica.");
    const file = formData.get("file");
    const fileText = String(formData.get("fileText") || "").slice(0, 6000);
    const drawingImagesRaw = String(formData.get("drawingImages") || "[]");
    const drawingImages = safeJsonParse<DrawingImageInput[]>(drawingImagesRaw, [])
      .filter((img) => img?.dataUrl && String(img.dataUrl).startsWith("data:image/"))
      .slice(0, 2);

    const imageInputs: DrawingImageInput[] = [];

    if (file instanceof File && file.size > 0 && file.type.startsWith("image/")) {
      imageInputs.push({ label: "Tavola completa", dataUrl: await fileToDataUrl(file) });
    }

    for (const img of drawingImages) {
      if (!imageInputs.some((item) => item.dataUrl === img.dataUrl)) {
        imageInputs.push(img);
      }
    }

    const limitedImages = imageInputs.slice(0, 3);

    if (limitedImages.length === 0) {
      return jsonResponse({ error: "Nessuna immagine valida ricevuta per l'analisi tavola." }, 400);
    }

    const prompt = `${message}\n\nTESTO PDF DI SUPPORTO, SE PRESENTE:\n${fileText}\n\nRispondi in modo tecnico ma sintetico. Massimo 10 controlli totali. Concentrati su errori, dati mancanti, dati incerti e giudizio finale.`;

    const visionContent: any[] = [
      {
        type: "text",
        text: prompt,
      },
    ];

    limitedImages.forEach((img, index) => {
      visionContent.push({ type: "text", text: `Immagine ${index + 1}: ${img.label || "Tavola"}` });
      visionContent.push({
        type: "image_url",
        image_url: {
          url: img.dataUrl,
          detail: index === 0 ? "high" : "low",
        },
      });
    });

    const response = await fetchWithTimeout(
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
                "Sei TechAI Vision. Analizza tavole tecniche meccaniche in italiano. Non inventare dati. Usa ✅, ⚠️ e ❌. Se richiesto, restituisci anche il blocco JSON dei marker. Sii sintetico per evitare timeout.",
            },
            {
              role: "user",
              content: visionContent,
            },
          ],
          temperature: 0.1,
          max_tokens: 1800,
        }),
      },
      52000
    );

    const raw = await response.text();
    const data = safeJsonParse<any>(raw, null);

    if (!response.ok) {
      return jsonResponse({ error: data?.error?.message || raw || `Errore OpenAI ${response.status}` }, response.status);
    }

    const answer = data?.choices?.[0]?.message?.content || "OpenAI non ha restituito una risposta valida.";

    return jsonResponse({ answer: cleanAnswer(answer), usage: data?.usage || null });
  } catch (error: any) {
    if (error?.name === "AbortError") {
      return jsonResponse({ error: "Timeout OpenAI durante l'analisi tavola veloce." }, 504);
    }

    return jsonResponse({ error: error?.message || "Errore durante l'analisi tavola veloce." }, 500);
  }
}
