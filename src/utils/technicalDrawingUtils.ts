// pdf.js (~1 MB) viene caricato solo al primo PDF: non pesa più sull'avvio dell'app.
let pdfjsPromise: Promise<any> | null = null;

function loadPdfJs(): Promise<any> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist")
      .then((pdfjsLib) => {
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).href;
        return pdfjsLib;
      })
      .catch((error) => {
        pdfjsPromise = null;
        throw error;
      });
  }
  return pdfjsPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tipi pubblici
// ─────────────────────────────────────────────────────────────────────────────

/** Rettangolo normalizzato sul foglio intero: x, y, w, h tra 0 e 1. */
export type NormRect = { x: number; y: number; w: number; h: number };

/** Griglia di riferimento disegnata sulla vista completa inviata all'AI. */
export type DrawingGrid = { cols: number; rows: number };

export type DrawingCropImage = {
  label: string;
  dataUrl: string;
  /** Porzione del foglio rappresentata dal crop (coordinate normalizzate). */
  rect?: NormRect;
  /** Presente solo sulla vista completa: griglia disegnata sull'immagine. */
  grid?: DrawingGrid;
};

/** Testo vettoriale del PDF con posizione normalizzata sul foglio. */
export type DrawingTextBox = { text: string; x: number; y: number; w: number; h: number };

export type DrawingLocationSource = "testo" | "griglia" | "zona";

export type DrawingPinInput = {
  celle?: unknown;
  cells?: unknown;
  testo?: unknown;
  text?: unknown;
  zona?: unknown;
  x?: unknown;
  y?: unknown;
};

export type DrawingPinLocation = { box: NormRect; source: DrawingLocationSource };

// ─────────────────────────────────────────────────────────────────────────────
// Utility file
// ─────────────────────────────────────────────────────────────────────────────

export function isImageFile(file: File | null | undefined) {
  return Boolean(file && file.type.startsWith("image/"));
}

export function isPdfFile(file: File | null | undefined) {
  return Boolean(file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")));
}

export function isDrawingUpload(upload: { file?: File | null } | null) {
  return Boolean(upload?.file && (isImageFile(upload.file) || isPdfFile(upload.file)));
}

// ─────────────────────────────────────────────────────────────────────────────
// Griglia di riferimento
// Righe con lettere (senza I e O per non confonderle con 1 e 0), colonne con
// numeri, come le zone del riquadro ISO 5457.
// ─────────────────────────────────────────────────────────────────────────────

const GRID_ROW_LETTERS = "ABCDEFGHJKLMNPQR";

export function chooseDrawingGrid(width: number, height: number): DrawingGrid {
  return width >= height ? { cols: 12, rows: 8 } : { cols: 8, rows: 12 };
}

export function describeDrawingGrid(grid: DrawingGrid) {
  const lastRow = GRID_ROW_LETTERS[grid.rows - 1];
  return `colonne 1-${grid.cols} da sinistra a destra, righe A-${lastRow} dall'alto in basso (lettere I e O non usate); cella = lettera riga + numero colonna, es. C5`;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function clampRect(rect: NormRect): NormRect {
  const x = clamp01(rect.x);
  const y = clamp01(rect.y);
  return { x, y, w: Math.max(0.001, Math.min(1 - x, rect.w)), h: Math.max(0.001, Math.min(1 - y, rect.h)) };
}

function unionRects(rects: NormRect[]): NormRect | null {
  if (!rects.length) return null;
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  for (const r of rects) {
    x1 = Math.min(x1, r.x);
    y1 = Math.min(y1, r.y);
    x2 = Math.max(x2, r.x + r.w);
    y2 = Math.max(y2, r.y + r.h);
  }
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

/** Converte celle tipo ["C4","C5"], "C4-D6" o "C4:D6" nel rettangolo normalizzato che le contiene. */
export function gridCellsToRect(cells: unknown, grid: DrawingGrid): NormRect | null {
  const raw = Array.isArray(cells) ? cells.map(String).join(" ") : typeof cells === "string" ? cells : "";
  if (!raw.trim()) return null;

  const rects: NormRect[] = [];
  const pushCell = (rowLetter: string, colText: string) => {
    const row = GRID_ROW_LETTERS.indexOf(rowLetter.toUpperCase());
    const col = Number(colText) - 1;
    if (row < 0 || row >= grid.rows || !Number.isInteger(col) || col < 0 || col >= grid.cols) return;
    rects.push({ x: col / grid.cols, y: row / grid.rows, w: 1 / grid.cols, h: 1 / grid.rows });
  };

  const letterFirst = /\b([A-Z])\s*-?\s*(\d{1,2})\b/gi;
  let match: RegExpExecArray | null;
  while ((match = letterFirst.exec(raw)) !== null) pushCell(match[1], match[2]);

  if (!rects.length) {
    const numberFirst = /\b(\d{1,2})\s*-?\s*([A-Z])\b/gi;
    while ((match = numberFirst.exec(raw)) !== null) pushCell(match[2], match[1]);
  }

  return unionRects(rects);
}

function drawGridOverlay(ctx: CanvasRenderingContext2D, margin: number, width: number, height: number, grid: DrawingGrid) {
  ctx.save();
  ctx.strokeStyle = "rgba(37, 99, 235, 0.45)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 0; c <= grid.cols; c++) {
    const x = Math.round(margin + (c * width) / grid.cols) + 0.5;
    ctx.moveTo(x, margin);
    ctx.lineTo(x, margin + height);
  }
  for (let r = 0; r <= grid.rows; r++) {
    const y = Math.round(margin + (r * height) / grid.rows) + 0.5;
    ctx.moveTo(margin, y);
    ctx.lineTo(margin + width, y);
  }
  ctx.stroke();

  const fontSize = Math.max(11, Math.round(margin * 0.62));
  ctx.fillStyle = "#1d4ed8";
  ctx.font = `bold ${fontSize}px Arial, Helvetica, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let c = 0; c < grid.cols; c++) {
    const x = margin + ((c + 0.5) * width) / grid.cols;
    ctx.fillText(String(c + 1), x, margin / 2);
    ctx.fillText(String(c + 1), x, margin + height + margin / 2);
  }
  for (let r = 0; r < grid.rows; r++) {
    const y = margin + ((r + 0.5) * height) / grid.rows;
    ctx.fillText(GRID_ROW_LETTERS[r], margin / 2, y);
    ctx.fillText(GRID_ROW_LETTERS[r], margin + width + margin / 2, y);
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// Crop della tavola
// ─────────────────────────────────────────────────────────────────────────────

type DrawingCropDefinition = {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  maxSide: number;
  quality: number;
  source?: "safe" | "text" | "density";
};

type PdfTextBoxPx = {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

const MAX_DRAWING_CROPS = 4;
const MAX_PDF_RENDER_SIDE = 4200;
const MAX_IMAGE_RENDER_SIDE = 2400;
const MAX_TEXT_BOXES = 3000;

const FULL_SHEET_CROP: DrawingCropDefinition = {
  id: "full",
  label: "Tavola completa con griglia di riferimento",
  x: 0,
  y: 0,
  w: 1,
  h: 1,
  maxSide: 1400,
  quality: 0.8,
  source: "safe",
};

// Crop di riserva, usati quando testo PDF e densità non ne generano abbastanza.
// Sono porzioni abbastanza piccole da offrire un vero ingrandimento rispetto alla vista completa
// (le vecchie fasce a tutta larghezza, ridotte a 1500 px, non aggiungevano risoluzione).
const FALLBACK_CROP_DEFINITIONS: DrawingCropDefinition[] = [
  { id: "title_block", label: "Angolo in basso a destra - cartiglio (ISO 7200)", x: 0.55, y: 0.68, w: 0.45, h: 0.32, maxSide: 1500, quality: 0.8, source: "safe" },
  { id: "quadrant_tl", label: "Quadrante in alto a sinistra", x: 0, y: 0, w: 0.55, h: 0.6, maxSide: 1500, quality: 0.78, source: "safe" },
  { id: "quadrant_tr", label: "Quadrante in alto a destra", x: 0.45, y: 0, w: 0.55, h: 0.6, maxSide: 1500, quality: 0.78, source: "safe" },
  { id: "quadrant_bl", label: "Quadrante in basso a sinistra", x: 0, y: 0.45, w: 0.55, h: 0.55, maxSide: 1500, quality: 0.78, source: "safe" },
];

const PDF_KEYWORD_GROUPS = [
  {
    id: "cartiglio",
    label: "Cartiglio / dati generali",
    keywords: ["denominazione", "codice rev", "codice", "rev", "scala", "massa", "foglio", "disegnatore", "data", "bozza", "validita", "validità"],
    expand: 0.055,
    maxLocal: 0,
  },
  {
    id: "materiale_distinta",
    label: "Materiale / distinta componenti",
    keywords: ["materiale", "grezzo", "componenti", "q.ta", "q.tà", "taglio", "en aw", "alsi", "6082", "estr", "pos."],
    expand: 0.06,
    maxLocal: 0,
  },
  {
    id: "tolleranze_note",
    label: "Tolleranze generali / note",
    keywords: ["tolleranze generali", "quote senza", "indicazione di tolleranza", "dimensioni lineari", "rug", "ra", "raccordi", "smussi", "norma"],
    expand: 0.06,
    maxLocal: 0,
  },
  {
    id: "fori_filetti_lamature",
    label: "Fori, filetti, lamature e tolleranze locali",
    keywords: ["fori", "foro", "lam", "lam.", "svas", "m4", "m5", "m6", "n7", "toll.", "prima t.s", "dopo t.s"],
    expand: 0.085,
    maxLocal: 2,
  },
];

function canvasToBlob(canvas: HTMLCanvasElement, quality = 0.72): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error("Conversione canvas non riuscita."));
      else resolve(blob);
    }, "image/jpeg", quality);
  });
}

function normalizeCrop(crop: DrawingCropDefinition): DrawingCropDefinition {
  const x = clamp01(crop.x);
  const y = clamp01(crop.y);
  const w = Math.max(0.04, Math.min(1 - x, crop.w));
  const h = Math.max(0.04, Math.min(1 - y, crop.h));
  return { ...crop, x, y, w, h };
}

function rectsOverlapEnough(a: DrawingCropDefinition, b: DrawingCropDefinition) {
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const inter = ix * iy;
  const union = a.w * a.h + b.w * b.h - inter;
  // Intersection-over-union: prima si usava inter/area minore, e siccome ogni crop è contenuto
  // nella tavola completa, TUTTI i crop venivano scartati come "duplicati" e l'AI riceveva solo la vista intera.
  return union > 0 && inter / union > 0.55;
}

function addUniqueCrop(crops: DrawingCropDefinition[], crop: DrawingCropDefinition) {
  const normalized = normalizeCrop(crop);
  if (!crops.some((existing) => rectsOverlapEnough(existing, normalized))) crops.push(normalized);
}

function renderCropCanvas(sourceCanvas: HTMLCanvasElement, crop: DrawingCropDefinition, grid?: DrawingGrid): HTMLCanvasElement {
  const normalized = normalizeCrop(crop);
  const sx = Math.max(0, Math.round(sourceCanvas.width * normalized.x));
  const sy = Math.max(0, Math.round(sourceCanvas.height * normalized.y));
  const sw = Math.max(1, Math.min(sourceCanvas.width - sx, Math.round(sourceCanvas.width * normalized.w)));
  const sh = Math.max(1, Math.min(sourceCanvas.height - sy, Math.round(sourceCanvas.height * normalized.h)));

  const resizeScale = Math.min(1, normalized.maxSide / Math.max(sw, sh));
  const outW = Math.max(1, Math.round(sw * resizeScale));
  const outH = Math.max(1, Math.round(sh * resizeScale));
  const margin = grid ? Math.max(22, Math.round(Math.max(outW, outH) * 0.022)) : 0;

  const out = document.createElement("canvas");
  out.width = outW + margin * 2;
  out.height = outH + margin * 2;

  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Impossibile creare il crop della tavola.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(sourceCanvas, sx, sy, sw, sh, margin, margin, outW, outH);

  if (grid) drawGridOverlay(ctx, margin, outW, outH, grid);
  return out;
}

function cropAroundBoxes(
  id: string,
  label: string,
  boxes: PdfTextBoxPx[],
  canvasWidth: number,
  canvasHeight: number,
  expand = 0.06,
  maxSide = 1500,
  quality = 0.78
): DrawingCropDefinition | null {
  if (!boxes.length) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const box of boxes) {
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.w);
    maxY = Math.max(maxY, box.y + box.h);
  }

  if (![minX, minY, maxX, maxY].every(Number.isFinite)) return null;

  let w = (maxX - minX) / canvasWidth;
  let h = (maxY - minY) / canvasHeight;
  const cx = minX / canvasWidth + w / 2;
  const cy = minY / canvasHeight + h / 2;
  w = Math.max(w + expand * 2, 0.16);
  h = Math.max(h + expand * 2, 0.12);

  return normalizeCrop({ id, label, x: cx - w / 2, y: cy - h / 2, w, h, maxSide, quality, source: "text" });
}

/**
 * Estrae il testo vettoriale del PDF con il relativo riquadro in pixel del canvas.
 * Gestisce anche il testo ruotato (quote verticali), frequente nelle tavole.
 */
async function extractPdfTextBoxes(pdfjsLib: any, page: any, viewport: any): Promise<{ boxes: PdfTextBoxPx[]; text: string }> {
  const content = await page.getTextContent();
  const boxes: PdfTextBoxPx[] = [];
  const strings: string[] = [];
  const transform = pdfjsLib.Util?.transform;

  for (const item of content.items || []) {
    const text = String(item?.str || "").trim();
    if (!text) continue;
    strings.push(text);

    try {
      const runLength = Math.max(4, Math.abs(Number(item.width || text.length * 4) * viewport.scale));

      if (typeof transform === "function") {
        const tx = transform(viewport.transform, item.transform);
        const [a, b, c, d, e, f] = tx.map((v: unknown) => Number(v) || 0);
        const runNorm = Math.hypot(a, b) || 1;
        const runX = (a / runNorm) * runLength;
        const runY = (b / runNorm) * runLength;
        // (c, d) è la direzione "verso l'alto" del glifo, lunga quanto il corpo carattere.
        const upX = c * 1.1;
        const upY = d * 1.1;
        const downX = -c * 0.25;
        const downY = -d * 0.25;

        const xs = [e + downX, e + upX, e + runX + downX, e + runX + upX];
        const ys = [f + downY, f + upY, f + runY + downY, f + runY + upY];
        const x1 = Math.min(...xs);
        const y1 = Math.min(...ys);
        boxes.push({ text, x: x1, y: y1, w: Math.max(4, Math.max(...xs) - x1), h: Math.max(4, Math.max(...ys) - y1) });
      } else if (typeof viewport.convertToViewportPoint === "function") {
        const point = viewport.convertToViewportPoint(Number(item.transform?.[4]) || 0, Number(item.transform?.[5]) || 0);
        const fontH = Math.max(6, Math.abs(Number(item.height) * viewport.scale || 10));
        boxes.push({ text, x: Number(point?.[0]) || 0, y: (Number(point?.[1]) || 0) - fontH * 1.2, w: runLength, h: fontH * 1.4 });
      }
    } catch {
      // Il testo resta comunque disponibile nell'estrazione generale.
    }

    if (boxes.length >= MAX_TEXT_BOXES) break;
  }

  return { boxes, text: strings.join(" ").slice(0, 9000) };
}

const keywordRegexCache = new Map<string, RegExp>();

function textMatchesKeyword(value: string, keyword: string) {
  const key = keyword.toLowerCase();
  // Parole chiave corte ("ra", "rev", "m6") solo come parola intera: prima "ra" trovava anche "generali", "materiale"...
  if (key.length > 3) return value.includes(key);
  let regex = keywordRegexCache.get(key);
  if (!regex) {
    regex = new RegExp(`(^|[^\\p{L}\\p{N}])${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}\\p{N}])`, "u");
    keywordRegexCache.set(key, regex);
  }
  return regex.test(value);
}

function buildDynamicTextCrops(boxes: PdfTextBoxPx[], canvasWidth: number, canvasHeight: number): DrawingCropDefinition[] {
  const crops: DrawingCropDefinition[] = [];
  const allText = boxes.map((box) => ({ ...box, lower: box.text.toLowerCase() }));

  for (const group of PDF_KEYWORD_GROUPS) {
    const matches = allText.filter((box) => group.keywords.some((keyword) => textMatchesKeyword(box.lower, keyword)));
    if (matches.length === 0) continue;

    const aggregate = cropAroundBoxes(`auto_${group.id}`, `Auto · ${group.label}`, matches, canvasWidth, canvasHeight, group.expand, 1500, 0.78);
    // Un crop che copre mezza tavola non ingrandisce nulla rispetto alla vista completa.
    if (aggregate && aggregate.w * aggregate.h < 0.35) addUniqueCrop(crops, aggregate);

    if (group.maxLocal > 0) {
      matches.slice(0, group.maxLocal).forEach((box, index) => {
        const nearBoxes = boxes.filter((other) => {
          const dx = Math.abs(other.x + other.w / 2 - (box.x + box.w / 2)) / canvasWidth;
          const dy = Math.abs(other.y + other.h / 2 - (box.y + box.h / 2)) / canvasHeight;
          return dx < 0.13 && dy < 0.11;
        });

        const localCrop = cropAroundBoxes(
          `auto_${group.id}_${index + 1}`,
          `Auto · ${group.label} · zona ${index + 1}`,
          nearBoxes.length ? nearBoxes : [box],
          canvasWidth,
          canvasHeight,
          group.expand,
          1400,
          0.76
        );

        if (localCrop && localCrop.w * localCrop.h < 0.42) addUniqueCrop(crops, localCrop);
      });
    }
  }

  return crops;
}

function buildDensityCrops(canvas: HTMLCanvasElement): DrawingCropDefinition[] {
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];

  // Campionamento su una miniatura: stesso risultato, frazione del costo di getImageData sull'intero canvas.
  const thumbW = Math.min(480, canvas.width);
  const thumbH = Math.max(1, Math.round((canvas.height * thumbW) / canvas.width));
  const thumb = document.createElement("canvas");
  thumb.width = thumbW;
  thumb.height = thumbH;
  const tctx = thumb.getContext("2d", { willReadFrequently: true } as CanvasRenderingContext2DSettings);
  if (!tctx) return [];
  tctx.drawImage(canvas, 0, 0, thumbW, thumbH);
  const data = tctx.getImageData(0, 0, thumbW, thumbH).data;

  const cols = 4;
  const rows = 3;
  const step = 3;
  const candidates: { crop: DrawingCropDefinition; score: number }[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x0 = Math.floor((thumbW * col) / cols);
      const y0 = Math.floor((thumbH * row) / rows);
      const x1 = Math.floor((thumbW * (col + 1)) / cols);
      const y1 = Math.floor((thumbH * (row + 1)) / rows);
      let dark = 0;
      let total = 0;

      for (let y = y0; y < y1; y += step) {
        for (let x = x0; x < x1; x += step) {
          const i = (y * thumbW + x) * 4;
          if ((data[i] + data[i + 1] + data[i + 2]) / 3 < 215) dark++;
          total++;
        }
      }

      const density = total > 0 ? dark / total : 0;
      if (density < 0.022) continue;

      candidates.push({
        score: density,
        crop: normalizeCrop({
          id: `dense_${row}_${col}`,
          label: `Auto · area grafica densa ${row + 1}-${col + 1}`,
          x: Math.max(0, col / cols - 0.035),
          y: Math.max(0, row / rows - 0.035),
          w: Math.min(1, 1 / cols + 0.07),
          h: Math.min(1, 1 / rows + 0.07),
          maxSide: 1300,
          quality: 0.74,
          source: "density",
        }),
      });
    }
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 1)
    .map((item) => item.crop);
}

function makeDrawingImagesFromCanvas(canvas: HTMLCanvasElement, dynamicCrops: DrawingCropDefinition[] = []): DrawingCropImage[] {
  // Priorità: crop dal testo PDF (cartiglio, note, fori), area grafica più densa, poi crop di riserva.
  const details: DrawingCropDefinition[] = [];
  for (const crop of dynamicCrops) addUniqueCrop(details, crop);
  for (const crop of buildDensityCrops(canvas)) addUniqueCrop(details, crop);
  for (const crop of FALLBACK_CROP_DEFINITIONS) addUniqueCrop(details, crop);

  const allCrops = [FULL_SHEET_CROP, ...details.slice(0, MAX_DRAWING_CROPS - 1)];
  const grid = chooseDrawingGrid(canvas.width, canvas.height);

  return allCrops.map((crop, i) => {
    const isFull = crop.id === "full";
    const out = renderCropCanvas(canvas, crop, isFull ? grid : undefined);
    return {
      label: `${i + 1}. ${crop.label}`,
      dataUrl: out.toDataURL("image/jpeg", crop.quality),
      rect: { x: crop.x, y: crop.y, w: crop.w, h: crop.h },
      grid: isFull ? grid : undefined,
    };
  });
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Impossibile caricare l'immagine della tavola."));
    };
    image.src = url;
  });
}

export async function makeDrawingImagesFromImageFile(file: File): Promise<DrawingCropImage[]> {
  const img = await loadImageFromFile(file);
  const scale = Math.min(1, MAX_IMAGE_RENDER_SIDE / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
  canvas.height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non disponibile per preparare la tavola.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return makeDrawingImagesFromCanvas(canvas, []);
}

export async function pdfPageToImageFile(file: File): Promise<{
  dataUrl: string;
  jpegFile: File;
  totalPages: number;
  drawingImages: DrawingCropImage[];
  extractedText: string;
  textBoxes: DrawingTextBox[];
}> {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  try {
    const totalPages = pdf.numPages;
    const page = await pdf.getPage(1);

    // Scala limitata: un A0 a scala fissa supererebbe i limiti canvas dei browser (soprattutto Safari/iOS).
    const base = page.getViewport({ scale: 1 });
    const scale = Math.max(1, Math.min(2.2, MAX_PDF_RENDER_SIDE / Math.max(base.width, base.height)));
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas non disponibile per renderizzare il PDF.");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx as any, viewport }).promise;

    const { boxes, text } = await extractPdfTextBoxes(pdfjsLib, page, viewport);
    const dynamicTextCrops = buildDynamicTextCrops(boxes, canvas.width, canvas.height);
    const drawingImages = makeDrawingImagesFromCanvas(canvas, dynamicTextCrops);

    // Anteprima pulita (senza griglia): stessa geometria del foglio, quindi stesse coordinate normalizzate.
    // Anteprima a risoluzione più alta della vista per l'AI: resta nitida quando si ingrandisce un riquadro.
    const previewCanvas = renderCropCanvas(canvas, { ...FULL_SHEET_CROP, maxSide: 2200 });
    const dataUrl = previewCanvas.toDataURL("image/jpeg", 0.8);
    const blob = await canvasToBlob(previewCanvas, 0.72);
    const jpegFile = new File([blob], file.name.replace(/\.pdf$/i, "_p1_preview.jpg"), { type: "image/jpeg" });

    const textBoxes: DrawingTextBox[] = boxes.map((box) => ({
      text: box.text,
      x: box.x / canvas.width,
      y: box.y / canvas.height,
      w: box.w / canvas.width,
      h: box.h / canvas.height,
    }));

    // Libera subito la memoria del canvas ad alta risoluzione.
    canvas.width = 0;
    canvas.height = 0;

    return { dataUrl, jpegFile, totalPages, drawingImages, extractedText: text, textBoxes };
  } finally {
    try {
      await pdf.destroy();
    } catch {
      // ignore
    }
  }
}

export async function compressImageForVision(file: File, maxSide = 1200, quality = 0.72): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const img = await loadImageFromFile(file);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  const longestSide = Math.max(width, height);
  if (longestSide <= maxSide && file.size <= 650_000 && file.type === "image/jpeg") return file;

  const scale = Math.min(1, maxSide / longestSide);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));

  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob = await canvasToBlob(canvas, quality);
  const baseName = file.name.replace(/\.[^.]+$/i, "");
  return new File([blob], `${baseName}_vision.jpg`, { type: "image/jpeg" });
}

export async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  try {
    for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map((item: any) => ("str" in item ? item.str : "")).join(" ").slice(0, 5000));
    }
  } finally {
    try {
      await pdf.destroy();
    } catch {
      // ignore
    }
  }

  return pages.join("\n\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Localizzazione delle criticità sulla tavola
// Priorità: 1) testo vettoriale del PDF  2) celle della griglia  3) zona generica
// ─────────────────────────────────────────────────────────────────────────────

// Punti indicativi per zona semantica (fallback quando l'AI non dà celle/testo).
const ZONE_POINTS: Record<string, Record<string, { x: number; y: number }>> = {
  A4: { cartiglio: { x: 82, y: 90 }, vista_principale: { x: 35, y: 40 }, sezione_aa: { x: 68, y: 38 }, sezione_bb: { x: 68, y: 65 }, quotatura: { x: 50, y: 22 }, rugosita: { x: 72, y: 18 }, tolleranze: { x: 45, y: 30 }, fori_filetti: { x: 38, y: 55 }, note_generali: { x: 20, y: 85 }, cartiglio_materiale: { x: 75, y: 93 }, cartiglio_scala: { x: 88, y: 93 }, vista_destra: { x: 65, y: 42 }, vista_alto: { x: 35, y: 18 } },
  A3: { cartiglio: { x: 84, y: 91 }, vista_principale: { x: 32, y: 42 }, sezione_aa: { x: 65, y: 36 }, sezione_bb: { x: 65, y: 62 }, quotatura: { x: 50, y: 20 }, rugosita: { x: 75, y: 16 }, tolleranze: { x: 45, y: 28 }, fori_filetti: { x: 35, y: 55 }, note_generali: { x: 18, y: 87 }, cartiglio_materiale: { x: 77, y: 94 }, cartiglio_scala: { x: 89, y: 94 }, vista_destra: { x: 63, y: 40 }, vista_alto: { x: 32, y: 16 } },
  A2: { cartiglio: { x: 85, y: 92 }, vista_principale: { x: 28, y: 44 }, sezione_aa: { x: 62, y: 35 }, sezione_bb: { x: 62, y: 60 }, quotatura: { x: 48, y: 18 }, rugosita: { x: 76, y: 14 }, tolleranze: { x: 42, y: 26 }, fori_filetti: { x: 32, y: 55 }, note_generali: { x: 15, y: 88 }, cartiglio_materiale: { x: 78, y: 95 }, cartiglio_scala: { x: 90, y: 95 }, vista_destra: { x: 60, y: 38 }, vista_alto: { x: 28, y: 14 } },
  A1: { cartiglio: { x: 86, y: 92 }, vista_principale: { x: 25, y: 45 }, sezione_aa: { x: 58, y: 34 }, sezione_bb: { x: 58, y: 60 }, quotatura: { x: 45, y: 16 }, rugosita: { x: 78, y: 12 }, tolleranze: { x: 40, y: 24 }, fori_filetti: { x: 28, y: 55 }, note_generali: { x: 12, y: 88 }, cartiglio_materiale: { x: 80, y: 95 }, cartiglio_scala: { x: 91, y: 95 }, vista_destra: { x: 56, y: 37 }, vista_alto: { x: 25, y: 12 } },
  A0: { cartiglio: { x: 87, y: 93 }, vista_principale: { x: 22, y: 46 }, sezione_aa: { x: 55, y: 33 }, sezione_bb: { x: 55, y: 58 }, quotatura: { x: 42, y: 14 }, rugosita: { x: 80, y: 10 }, tolleranze: { x: 38, y: 22 }, fori_filetti: { x: 25, y: 55 }, note_generali: { x: 10, y: 89 }, cartiglio_materiale: { x: 82, y: 96 }, cartiglio_scala: { x: 92, y: 96 }, vista_destra: { x: 52, y: 36 }, vista_alto: { x: 22, y: 10 } },
};

function normalizeAnchorText(value: string) {
  return value
    .toLowerCase()
    .replace(/[⌀∅Ø]/g, "ø")
    .replace(/,/g, ".")
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}.øx×±+\-/°]/gu, "");
}

function rectCenterDistance(rect: NormRect, region: NormRect) {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const dx = Math.max(region.x - cx, 0, cx - (region.x + region.w));
  const dy = Math.max(region.y - cy, 0, cy - (region.y + region.h));
  return Math.hypot(dx, dy);
}

function padRect(rect: NormRect, pad = 0.012, minW = 0.04, minH = 0.032): NormRect {
  const w = Math.max(minW, rect.w + pad * 2);
  const h = Math.max(minH, rect.h + pad * 2);
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  return clampRect({ x: cx - w / 2, y: cy - h / 2, w, h });
}

function findTextAnchor(anchor: string, textBoxes: DrawingTextBox[], region: NormRect | null): NormRect | null {
  const needle = normalizeAnchorText(anchor);
  if (needle.length < 2 || !textBoxes.length) return null;

  const indexed = textBoxes.map((box) => ({ box, norm: normalizeAnchorText(box.text) }));

  // 1) Testo completo dentro un singolo elemento di testo del PDF.
  let candidates = indexed.filter((item) => item.norm.length > 0 && item.norm.includes(needle)).map((item) => item.box as NormRect);

  // 2) Testo spezzato in più elementi (es. "Ø20" + "H7"): cerca i pezzi più distintivi.
  if (!candidates.length) {
    candidates = indexed
      .filter((item) => item.norm.length >= 2 && /\d/.test(item.norm) && needle.includes(item.norm))
      .map((item) => item.box as NormRect);
  }

  if (!candidates.length) return null;

  let best = candidates[0];
  if (region) {
    best = candidates.reduce((acc, item) => (rectCenterDistance(item, region) < rectCenterDistance(acc, region) ? item : acc), candidates[0]);
    // Il testo trovato è lontano dalla zona indicata dall'AI: probabilmente è un'altra occorrenza.
    if (rectCenterDistance(best, region) > 0.12) return null;
  }

  // Unisce i pezzi vicini dello stesso testo (quota + tolleranza su elementi separati).
  const cluster = candidates.filter((item) => Math.abs(item.x - best.x) < 0.04 && Math.abs(item.y - best.y) < 0.03);
  return padRect(unionRects(cluster) || best);
}

/**
 * Restituisce il riquadro della criticità sul foglio (coordinate normalizzate 0-1).
 * null = posizione non determinabile: la criticità resta solo nell'elenco.
 */
export function locateDrawingPin(
  pin: DrawingPinInput,
  ctx: { grid?: DrawingGrid | null; textBoxes?: DrawingTextBox[] | null; sheetFormat?: string }
): DrawingPinLocation | null {
  const region = ctx.grid ? gridCellsToRect(pin.celle ?? pin.cells, ctx.grid) : null;
  const anchor = String(pin.testo ?? pin.text ?? "").trim();

  if (anchor && ctx.textBoxes?.length) {
    const textBox = findTextAnchor(anchor, ctx.textBoxes, region);
    if (textBox) return { box: textBox, source: "testo" };
  }

  if (region && region.w * region.h <= 0.5) {
    return { box: clampRect(region), source: "griglia" };
  }

  const zoneKey = String(pin.zona || "").toLowerCase().replace(/[\s-]/g, "_");
  const zoneMap = ZONE_POINTS[String(ctx.sheetFormat || "A3").toUpperCase()] || ZONE_POINTS.A3;
  const zonePoint = zoneKey ? zoneMap[zoneKey] : undefined;
  const px = zonePoint ? zonePoint.x / 100 : Number(pin.x) / 100;
  const py = zonePoint ? zonePoint.y / 100 : Number(pin.y) / 100;

  if (Number.isFinite(px) && Number.isFinite(py) && (zonePoint || (Number(pin.x) > 0 && Number(pin.y) > 0))) {
    return { box: clampRect({ x: px - 0.07, y: py - 0.05, w: 0.14, h: 0.1 }), source: "zona" };
  }

  return null;
}
