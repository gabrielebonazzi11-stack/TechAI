import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).href;

export type DrawingCropImage = {
  label: string;
  dataUrl: string;
};

export function isImageFile(file: File | null | undefined) {
  return Boolean(file && file.type.startsWith("image/"));
}

export function isPdfFile(file: File | null | undefined) {
  return Boolean(file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")));
}

export function isDrawingUpload(upload: { file?: File | null } | null) {
  return Boolean(upload?.file && (isImageFile(upload.file) || isPdfFile(upload.file)));
}

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

type PdfTextBox = {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

const DRAWING_SAFE_CROP_DEFINITIONS: DrawingCropDefinition[] = [
  { id: "full", label: "Tavola completa - orientamento generale", x: 0, y: 0, w: 1, h: 1, maxSide: 1400, quality: 0.74, source: "safe" },
  { id: "bottom_band", label: "Fascia bassa - cartiglio, note, distinte", x: 0, y: 0.64, w: 1, h: 0.36, maxSide: 1500, quality: 0.78, source: "safe" },
  { id: "right_band", label: "Fascia destra - cartiglio e dettagli laterali", x: 0.62, y: 0, w: 0.38, h: 1, maxSide: 1500, quality: 0.78, source: "safe" },
];

const PDF_KEYWORD_GROUPS = [
  {
    id: "cartiglio",
    label: "Cartiglio / dati generali trovati automaticamente",
    keywords: ["denominazione", "codice rev", "codice", "rev", "scala", "massa", "foglio", "disegnatore", "data", "bozza", "validita", "validità"],
    expand: 0.055,
    maxLocal: 0,
  },
  {
    id: "materiale_distinta",
    label: "Materiale / distinta componenti trovati automaticamente",
    keywords: ["materiale", "grezzo", "componenti", "q.ta", "q.tà", "taglio", "en aw", "alsi", "6082", "estr", "pos."],
    expand: 0.06,
    maxLocal: 0,
  },
  {
    id: "tolleranze_note",
    label: "Tolleranze generali / note trovate automaticamente",
    keywords: ["tolleranze generali", "quote senza", "indicazione di tolleranza", "dimensioni lineari", "rug", "ra", "raccordi", "smussi", "norma"],
    expand: 0.06,
    maxLocal: 0,
  },
  {
    id: "fori_filetti_lamature",
    label: "Fori, filetti, lamature e tolleranze locali trovati automaticamente",
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

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function normalizeCrop(crop: DrawingCropDefinition): DrawingCropDefinition {
  const x = clamp01(crop.x);
  const y = clamp01(crop.y);
  const w = Math.max(0.04, Math.min(1 - x, crop.w));
  const h = Math.max(0.04, Math.min(1 - y, crop.h));
  return { ...crop, x, y, w, h };
}

function rectsOverlapEnough(a: DrawingCropDefinition, b: DrawingCropDefinition) {
  const ax2 = a.x + a.w;
  const ay2 = a.y + a.h;
  const bx2 = b.x + b.w;
  const by2 = b.y + b.h;
  const ix = Math.max(0, Math.min(ax2, bx2) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(ay2, by2) - Math.max(a.y, b.y));
  const inter = ix * iy;
  const smaller = Math.min(a.w * a.h, b.w * b.h);
  return smaller > 0 && inter / smaller > 0.72;
}

function addUniqueCrop(crops: DrawingCropDefinition[], crop: DrawingCropDefinition) {
  const normalized = normalizeCrop(crop);
  const tooSimilar = crops.some((existing) => rectsOverlapEnough(existing, normalized));
  if (!tooSimilar) crops.push(normalized);
}

async function canvasToDataUrlResized(
  sourceCanvas: HTMLCanvasElement,
  crop: DrawingCropDefinition
): Promise<string> {
  const normalized = normalizeCrop(crop);
  const sx = Math.max(0, Math.round(sourceCanvas.width * normalized.x));
  const sy = Math.max(0, Math.round(sourceCanvas.height * normalized.y));
  const sw = Math.max(1, Math.min(sourceCanvas.width - sx, Math.round(sourceCanvas.width * normalized.w)));
  const sh = Math.max(1, Math.min(sourceCanvas.height - sy, Math.round(sourceCanvas.height * normalized.h)));

  const longest = Math.max(sw, sh);
  const resizeScale = Math.min(1, normalized.maxSide / longest);
  const outW = Math.max(1, Math.round(sw * resizeScale));
  const outH = Math.max(1, Math.round(sh * resizeScale));

  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;

  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Impossibile creare il crop della tavola.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outW, outH);
  ctx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, outW, outH);

  return out.toDataURL("image/jpeg", normalized.quality);
}

async function imageFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Impossibile leggere l'immagine."));
    reader.readAsDataURL(file);
  });
}

function cropAroundBoxes(
  id: string,
  label: string,
  boxes: PdfTextBox[],
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

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }

  let x = minX / canvasWidth;
  let y = minY / canvasHeight;
  let w = (maxX - minX) / canvasWidth;
  let h = (maxY - minY) / canvasHeight;

  const minW = 0.16;
  const minH = 0.12;
  const cx = x + w / 2;
  const cy = y + h / 2;
  w = Math.max(w + expand * 2, minW);
  h = Math.max(h + expand * 2, minH);
  x = cx - w / 2;
  y = cy - h / 2;

  return normalizeCrop({ id, label, x, y, w, h, maxSide, quality, source: "text" });
}

function extractPdfTextBoxes(page: any, viewport: any): Promise<{ boxes: PdfTextBox[]; text: string }> {
  return page.getTextContent().then((content: any) => {
    const boxes: PdfTextBox[] = [];
    const strings: string[] = [];

    for (const item of content.items || []) {
      const text = String(item?.str || "").trim();
      if (!text) continue;

      strings.push(text);

      try {
        let x = 0;
        let baselineY = 0;
        let fontH = Math.max(6, Math.abs(Number(item.height) * viewport.scale || 10));

        if ((pdfjsLib as any).Util?.transform) {
          const tx = (pdfjsLib as any).Util.transform(viewport.transform, item.transform);
          x = Number(tx[4]) || 0;
          baselineY = Number(tx[5]) || 0;
          fontH = Math.max(6, Math.abs(Number(tx[3]) || fontH));
        } else if (typeof viewport.convertToViewportPoint === "function") {
          const point = viewport.convertToViewportPoint(Number(item.transform?.[4]) || 0, Number(item.transform?.[5]) || 0);
          x = Number(point?.[0]) || 0;
          baselineY = Number(point?.[1]) || 0;
        }

        const width = Math.max(8, Math.abs(Number(item.width || text.length * 4) * viewport.scale));
        const height = Math.max(8, fontH * 1.4);
        const y = baselineY - height;

        boxes.push({ text, x, y, w: width, h: height });
      } catch {
        // Il testo resta comunque disponibile nell'estrazione generale.
      }
    }

    return { boxes, text: strings.join(" ").slice(0, 9000) };
  });
}

function textMatchesKeyword(value: string, keyword: string) {
  return value.toLowerCase().includes(keyword.toLowerCase());
}

function buildDynamicTextCrops(boxes: PdfTextBox[], canvasWidth: number, canvasHeight: number): DrawingCropDefinition[] {
  const crops: DrawingCropDefinition[] = [];
  const allText = boxes.map((box) => ({ ...box, lower: box.text.toLowerCase() }));

  for (const group of PDF_KEYWORD_GROUPS) {
    const matches = allText.filter((box) => group.keywords.some((keyword) => textMatchesKeyword(box.lower, keyword)));
    if (matches.length === 0) continue;

    const aggregate = cropAroundBoxes(
      `auto_${group.id}`,
      `Auto · ${group.label}`,
      matches,
      canvasWidth,
      canvasHeight,
      group.expand,
      1500,
      0.78
    );

    if (aggregate && aggregate.w * aggregate.h < 0.72) {
      addUniqueCrop(crops, aggregate);
    }

    if (group.maxLocal > 0) {
      matches.slice(0, group.maxLocal).forEach((box, index) => {
        const nearBoxes = boxes.filter((other) => {
          const dx = Math.abs((other.x + other.w / 2) - (box.x + box.w / 2)) / canvasWidth;
          const dy = Math.abs((other.y + other.h / 2) - (box.y + box.h / 2)) / canvasHeight;
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

        if (localCrop && localCrop.w * localCrop.h < 0.42) {
          addUniqueCrop(crops, localCrop);
        }
      });
    }
  }

  return crops;
}

function buildDensityCrops(canvas: HTMLCanvasElement): DrawingCropDefinition[] {
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];

  const cols = 4;
  const rows = 3;
  const sampleStep = 16;
  const candidates: { crop: DrawingCropDefinition; score: number }[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x0 = Math.round((canvas.width * col) / cols);
      const y0 = Math.round((canvas.height * row) / rows);
      const w = Math.round(canvas.width / cols);
      const h = Math.round(canvas.height / rows);
      const image = ctx.getImageData(x0, y0, Math.max(1, w), Math.max(1, h));
      let dark = 0;
      let total = 0;

      for (let y = 0; y < h; y += sampleStep) {
        for (let x = 0; x < w; x += sampleStep) {
          const i = (y * w + x) * 4;
          const r = image.data[i];
          const g = image.data[i + 1];
          const b = image.data[i + 2];
          const avg = (r + g + b) / 3;
          if (avg < 215) dark++;
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

async function makeDrawingImagesFromCanvas(
  canvas: HTMLCanvasElement,
  dynamicCrops: DrawingCropDefinition[] = []
): Promise<DrawingCropImage[]> {
  const allCrops: DrawingCropDefinition[] = [];

  for (const crop of DRAWING_SAFE_CROP_DEFINITIONS) addUniqueCrop(allCrops, crop);
  for (const crop of dynamicCrops) addUniqueCrop(allCrops, crop);
  for (const crop of buildDensityCrops(canvas)) addUniqueCrop(allCrops, crop);

  const limited = allCrops.slice(0, 4);
  const images: DrawingCropImage[] = [];

  for (let i = 0; i < limited.length; i++) {
    const crop = limited[i];
    images.push({
      label: `${i + 1}. ${crop.label}`,
      dataUrl: await canvasToDataUrlResized(canvas, crop),
    });
  }

  return images;
}

export async function makeDrawingImagesFromImageFile(file: File): Promise<DrawingCropImage[]> {
  const dataUrl = await imageFileToDataUrl(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Impossibile caricare l'immagine della tavola."));
    image.src = dataUrl;
  });

  const longest = Math.max(img.width, img.height);
  const scale = Math.min(1, 1800 / longest);

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return [{ label: "Immagine tavola caricata", dataUrl }];

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
}> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;
  const page = await pdf.getPage(1);

  const scale = 2.2;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non disponibile per renderizzare il PDF.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx as any, viewport }).promise;

  const { boxes, text } = await extractPdfTextBoxes(page, viewport);
  const dynamicTextCrops = buildDynamicTextCrops(boxes, canvas.width, canvas.height);
  const drawingImages = await makeDrawingImagesFromCanvas(canvas, dynamicTextCrops);

  const dataUrl = await canvasToDataUrlResized(canvas, DRAWING_SAFE_CROP_DEFINITIONS[0]);
  const previewImg = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Impossibile creare anteprima PDF."));
    image.src = dataUrl;
  });

  const previewCanvas = document.createElement("canvas");
  previewCanvas.width = previewImg.width;
  previewCanvas.height = previewImg.height;
  previewCanvas.getContext("2d")?.drawImage(previewImg, 0, 0);
  const blob = await canvasToBlob(previewCanvas, 0.72);
  const jpegFile = new File([blob], file.name.replace(/\.pdf$/i, "_p1_preview.jpg"), { type: "image/jpeg" });

  return { dataUrl, jpegFile, totalPages, drawingImages, extractedText: text };
}

export async function compressImageForVision(file: File, maxSide = 1200, quality = 0.72): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Impossibile leggere l'immagine."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Impossibile caricare l'immagine."));
    image.src = dataUrl;
  });

  const longestSide = Math.max(img.width, img.height);
  if (longestSide <= maxSide && file.size <= 650_000 && file.type === "image/jpeg") {
    return file;
  }

  const scale = Math.min(1, maxSide / longestSide);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));

  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (!result) reject(new Error("Compressione immagine non riuscita."));
      else resolve(result);
    }, "image/jpeg", quality);
  });

  const baseName = file.name.replace(/\.[^.]+$/i, "");
  return new File([blob], `${baseName}_vision.jpg`, { type: "image/jpeg" });
}

export async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => ("str" in item ? item.str : "")).join(" ").slice(0, 5000);
    pages.push(pageText);
  }

  return pages.join("\n\n");
}
