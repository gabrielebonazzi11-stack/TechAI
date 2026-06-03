type DrawingMarkerSeverity = "errore" | "attenzione" | "incerto";

type DrawingMarker = {
  id?: string;
  label: string;
  severity: DrawingMarkerSeverity;
  x: number;
  y: number;
  detail?: string;
};

const STORAGE_KEY = "techai_drawing_issue_markers_v1";
const START_TAG = "[TECHAI_MARKERS_START]";
const END_TAG = "[TECHAI_MARKERS_END]";
const MAX_DRAWING_CROPS_FOR_MARKERS = 5;
const MAX_PDF_TEXT_FOR_MARKERS = 10000;
let installed = false;
let renderTimer: number | undefined;

function clampPercent(value: unknown, fallback = 50) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, n));
}

function normalizeSeverity(value: unknown): DrawingMarkerSeverity {
  const raw = String(value || "").toLowerCase();
  if (raw.includes("errore") || raw.includes("critico") || raw.includes("rosso")) return "errore";
  if (raw.includes("incerto") || raw.includes("leggibile") || raw.includes("giallo")) return "incerto";
  return "attenzione";
}

function sanitizeMarkers(markers: unknown): DrawingMarker[] {
  if (!Array.isArray(markers)) return [];

  return markers
    .map((item: any, index) => ({
      id: String(item?.id || `marker-${index + 1}`),
      label: String(item?.label || item?.title || `Problema ${index + 1}`).slice(0, 80),
      severity: normalizeSeverity(item?.severity),
      x: clampPercent(item?.x),
      y: clampPercent(item?.y),
      detail: String(item?.detail || item?.reason || "Zona da verificare sulla tavola.").slice(0, 220),
    }))
    .filter((item) => {
      const label = `${item.label} ${item.detail}`.toLowerCase();
      return !label.includes("conforme") && !label.includes("corretto") && !label.includes("approvata piena");
    })
    .slice(0, 12);
}

function extractMarkersFromAnswer(answer: string): DrawingMarker[] {
  const text = String(answer || "");
  const start = text.indexOf(START_TAG);
  const end = text.indexOf(END_TAG);

  if (start === -1 || end === -1 || end <= start) return [];

  const rawJson = text.slice(start + START_TAG.length, end).trim();

  try {
    const parsed = JSON.parse(rawJson);
    return sanitizeMarkers(parsed?.markers || parsed);
  } catch {
    return [];
  }
}

function stripMarkerBlock(answer: string) {
  const text = String(answer || "");
  const start = text.indexOf(START_TAG);
  const end = text.indexOf(END_TAG);

  if (start === -1 || end === -1 || end <= start) return text;

  return `${text.slice(0, start).trim()}\n\n${text.slice(end + END_TAG.length).trim()}`.trim();
}

function saveMarkers(markers: DrawingMarker[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(markers));
  } catch {
    // ignore
  }
}

function loadMarkers(): DrawingMarker[] {
  try {
    return sanitizeMarkers(JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]"));
  } catch {
    return [];
  }
}

function markerColor(severity: DrawingMarkerSeverity) {
  if (severity === "errore") return "#ef4444";
  if (severity === "incerto") return "#eab308";
  return "#f97316";
}

function markerLabel(severity: DrawingMarkerSeverity) {
  if (severity === "errore") return "Errore critico";
  if (severity === "incerto") return "Dato incerto/non leggibile";
  return "Da verificare";
}

function injectStyles() {
  if (document.getElementById("techai-drawing-marker-style")) return;

  const style = document.createElement("style");
  style.id = "techai-drawing-marker-style";
  style.textContent = `
    .techai-drawing-marker-layer { position: absolute; inset: 0; pointer-events: none; z-index: 8; }
    .techai-drawing-marker {
      position: absolute;
      width: 34px;
      height: 34px;
      border-radius: 999px;
      transform: translate(-50%, -50%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 13px;
      font-weight: 950;
      border: 3px solid rgba(255,255,255,0.95);
      box-shadow: 0 10px 28px rgba(0,0,0,0.38), 0 0 0 8px var(--marker-glow);
      cursor: help;
      pointer-events: auto;
    }
    .techai-drawing-marker:hover { transform: translate(-50%, -50%) scale(1.12); z-index: 12; }
    .techai-drawing-marker:hover::after {
      content: attr(data-title);
      position: absolute;
      left: 50%;
      bottom: calc(100% + 10px);
      transform: translateX(-50%);
      min-width: 210px;
      max-width: 310px;
      padding: 10px 12px;
      border-radius: 12px;
      background: rgba(15,23,42,0.96);
      color: #fff;
      font-size: 12px;
      line-height: 1.35;
      font-weight: 750;
      box-shadow: 0 16px 40px rgba(0,0,0,0.35);
      white-space: normal;
    }
    .techai-drawing-marker-legend {
      position: absolute;
      left: 12px;
      bottom: 12px;
      z-index: 9;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 8px 10px;
      border-radius: 999px;
      background: rgba(15,23,42,0.82);
      color: #fff;
      font-size: 11px;
      font-weight: 850;
      backdrop-filter: blur(8px);
      pointer-events: none;
    }
    .techai-drawing-marker-legend span { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
    .techai-drawing-marker-legend i { width: 9px; height: 9px; border-radius: 999px; display: inline-block; }
  `;

  document.head.appendChild(style);
}

function findMainDrawingImage(): HTMLImageElement | null {
  const images = Array.from(document.querySelectorAll("img")) as HTMLImageElement[];
  const candidates = images.filter((img) => {
    const alt = String(img.getAttribute("alt") || "").toLowerCase();
    const rect = img.getBoundingClientRect();
    return alt.includes("tavola") && rect.width > 260 && rect.height > 160;
  });

  if (candidates.length === 0) return null;

  return candidates.sort((a, b) => {
    const ar = a.getBoundingClientRect();
    const br = b.getBoundingClientRect();
    return br.width * br.height - ar.width * ar.height;
  })[0] || null;
}

function renderMarkers() {
  injectStyles();

  const img = findMainDrawingImage();
  const markers = loadMarkers();

  document.querySelectorAll(".techai-drawing-marker-layer, .techai-drawing-marker-legend").forEach((node) => node.remove());

  if (!img || markers.length === 0) return;

  const container = img.parentElement;
  if (!container) return;

  const computed = window.getComputedStyle(container);
  if (computed.position === "static") container.style.position = "relative";

  const layer = document.createElement("div");
  layer.className = "techai-drawing-marker-layer";

  markers.forEach((marker, index) => {
    const color = markerColor(marker.severity);
    const node = document.createElement("button");
    node.type = "button";
    node.className = "techai-drawing-marker";
    node.style.left = `${marker.x}%`;
    node.style.top = `${marker.y}%`;
    node.style.background = color;
    node.style.setProperty("--marker-glow", `${color}33`);
    node.textContent = String(index + 1);
    node.setAttribute("aria-label", `${markerLabel(marker.severity)}: ${marker.label}`);
    node.setAttribute("data-title", `${markerLabel(marker.severity)} — ${marker.label}: ${marker.detail || "zona da verificare"}`);
    layer.appendChild(node);
  });

  const legend = document.createElement("div");
  legend.className = "techai-drawing-marker-legend";
  legend.innerHTML = `
    <span><i style="background:#ef4444"></i>Errore critico</span>
    <span><i style="background:#f97316"></i>Da verificare</span>
    <span><i style="background:#eab308"></i>Incerto/non leggibile</span>
  `;

  container.appendChild(layer);
  container.appendChild(legend);
}

function scheduleRender() {
  if (renderTimer) window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(renderMarkers, 180);
}

function reduceDrawingPayload(body: FormData) {
  const rawImages = String(body.get("drawingImages") || "[]");
  const parsedImages = (() => {
    try {
      return JSON.parse(rawImages);
    } catch {
      return [];
    }
  })();

  if (Array.isArray(parsedImages) && parsedImages.length > MAX_DRAWING_CROPS_FOR_MARKERS) {
    const preferred = parsedImages.filter((img: any) => /completa|cartiglio|note|quote|dense|sicurezza/i.test(String(img?.label || "")));
    const reduced = [...preferred, ...parsedImages].filter((img, index, arr) => arr.findIndex((x) => x?.dataUrl === img?.dataUrl) === index).slice(0, MAX_DRAWING_CROPS_FOR_MARKERS);
    body.set("drawingImages", JSON.stringify(reduced));
  }

  const fileText = String(body.get("fileText") || "");
  if (fileText.length > MAX_PDF_TEXT_FOR_MARKERS) {
    body.set("fileText", fileText.slice(0, MAX_PDF_TEXT_FOR_MARKERS));
  }
}

function enhanceDrawingRequest(body: BodyInit | null | undefined) {
  if (!(body instanceof FormData)) return body;
  if (String(body.get("analysisMode") || "") !== "drawing") return body;

  reduceDrawingPayload(body);

  const currentMessage = String(body.get("message") || "");
  const markerInstructions = `

MARCATURA VISIVA:
Alla fine aggiungi SOLO questo blocco JSON, senza testo dentro al blocco.
Non marcare elementi corretti. Marca solo errori, dubbi o dati non leggibili.
Coordinate x/y in percentuale 0-100 sulla tavola completa.
${START_TAG}
{"markers":[{"label":"Materiale non leggibile","severity":"incerto","x":82,"y":88,"detail":"Cartiglio"}]}
${END_TAG}
severity: "errore", "attenzione", "incerto". Se nessun problema: {"markers":[]}.
`;

  body.set("message", `${currentMessage}${markerInstructions}`);
  return body;
}

async function processDrawingResponse(response: Response) {
  try {
    const cloned = response.clone();
    const raw = await cloned.text();
    const data = JSON.parse(raw);
    const answer = String(data?.answer || data?.message || "");
    const markers = extractMarkersFromAnswer(answer);

    saveMarkers(markers);
    window.dispatchEvent(new CustomEvent("techai:drawing-markers-updated"));

    if (answer.includes(START_TAG)) {
      const cleaned = {
        ...data,
        answer: stripMarkerBlock(answer),
      };

      return new Response(JSON.stringify(cleaned), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }
  } catch {
    // Lascia passare la risposta originale.
  }

  return response;
}

export function initDrawingIssueMarkersEnhancer() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  injectStyles();

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const isChatApi = url.includes("/api/chat");
    const isDrawingRequest = init?.body instanceof FormData && String(init.body.get("analysisMode") || "") === "drawing";

    if (isChatApi && isDrawingRequest) {
      saveMarkers([]);
      init.body = enhanceDrawingRequest(init.body);
      const response = await originalFetch(input, init);
      return processDrawingResponse(response);
    }

    return originalFetch(input, init);
  };

  window.addEventListener("techai:drawing-markers-updated", scheduleRender);
  window.addEventListener("resize", scheduleRender);

  const observer = new MutationObserver(scheduleRender);
  observer.observe(document.body, { childList: true, subtree: true });

  scheduleRender();
}
