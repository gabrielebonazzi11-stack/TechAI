import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).href;

function isPdf(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, y, 360, 34);
  ctx.strokeStyle = "#111827";
  ctx.strokeRect(x, y, 360, 34);
  ctx.fillStyle = "#111827";
  ctx.font = "bold 20px Arial";
  ctx.fillText(text, x + 10, y + 23);
}

function cropToCanvas(source: HTMLCanvasElement, sx: number, sy: number, sw: number, sh: number, label: string) {
  const out = document.createElement("canvas");
  out.width = 1400;
  out.height = 1000;

  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Canvas non disponibile");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, out.width, out.height);
  drawLabel(ctx, label, 18, 18);

  return out;
}

function fitDraw(ctx: CanvasRenderingContext2D, source: HTMLCanvasElement, x: number, y: number, w: number, h: number, label: string) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, y, w, h);

  const scale = Math.min(w / source.width, h / source.height);
  const dw = source.width * scale;
  const dh = source.height * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;

  ctx.drawImage(source, dx, dy, dw, dh);
  drawLabel(ctx, label, x + 14, y + 14);
}

async function renderPage(file: File) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const page = await pdf.getPage(1);
  const baseViewport = page.getViewport({ scale: 1 });

  const targetWidth = 4200;
  const scale = Math.max(4, targetWidth / baseViewport.width);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non disponibile");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx as any, viewport }).promise;

  return canvas;
}

async function renderFirstPageAsHumanReviewSheet(file: File) {
  const pageCanvas = await renderPage(file);
  const w = pageCanvas.width;
  const h = pageCanvas.height;

  const full = cropToCanvas(pageCanvas, 0, 0, w, h, "TAVOLA INTERA - contesto generale");
  const titleBlock = cropToCanvas(pageCanvas, Math.floor(w * 0.55), Math.floor(h * 0.62), Math.floor(w * 0.45), Math.floor(h * 0.38), "CARTIGLIO / MATERIALE / SCALA");
  const bottomNotes = cropToCanvas(pageCanvas, 0, Math.floor(h * 0.72), w, Math.floor(h * 0.28), "NOTE INFERIORI / TOLLERANZE GENERALI");
  const centerDetail = cropToCanvas(pageCanvas, Math.floor(w * 0.18), Math.floor(h * 0.16), Math.floor(w * 0.64), Math.floor(h * 0.58), "VISTE PRINCIPALI / QUOTE");
  const leftDetail = cropToCanvas(pageCanvas, 0, 0, Math.floor(w * 0.5), Math.floor(h * 0.55), "DETTAGLIO SINISTRA / SEZIONI");
  const rightDetail = cropToCanvas(pageCanvas, Math.floor(w * 0.5), 0, Math.floor(w * 0.5), Math.floor(h * 0.55), "DETTAGLIO DESTRA / FORI / RICHIAMI");

  const sheet = document.createElement("canvas");
  sheet.width = 3000;
  sheet.height = 3200;

  const ctx = sheet.getContext("2d");
  if (!ctx) throw new Error("Canvas non disponibile");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, sheet.width, sheet.height);

  fitDraw(ctx, full, 40, 40, 1420, 920, "1. Tavola completa");
  fitDraw(ctx, centerDetail, 1540, 40, 1420, 920, "2. Area quote principali");
  fitDraw(ctx, titleBlock, 40, 1060, 1420, 920, "3. Cartiglio ingrandito");
  fitDraw(ctx, bottomNotes, 1540, 1060, 1420, 920, "4. Note e tolleranze");
  fitDraw(ctx, leftDetail, 40, 2120, 1420, 920, "5. Dettaglio sinistro");
  fitDraw(ctx, rightDetail, 1540, 2120, 1420, 920, "6. Dettaglio destro");

  const blob = await new Promise<Blob>((resolve) => {
    sheet.toBlob((result) => resolve(result as Blob), "image/jpeg", 0.96);
  });

  return new File([blob], file.name.replace(/\.pdf$/i, "_lettura_umano_tavola.jpg"), {
    type: "image/jpeg",
  });
}

function replaceInputFile(input: HTMLInputElement, file: File) {
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  input.files = dataTransfer.files;
}

export function installPdfDrawingUploadEnhancer() {
  if (typeof window === "undefined") return;

  document.addEventListener(
    "change",
    async (event) => {
      const input = event.target as HTMLInputElement | null;
      if (!input || input.type !== "file" || !input.files?.length) return;

      const file = input.files[0];
      if (!file || !isPdf(file)) return;
      if (input.dataset.pdfEnhanced === "1") return;

      input.dataset.pdfEnhanced = "1";
      event.preventDefault();
      event.stopPropagation();

      try {
        const imageFile = await renderFirstPageAsHumanReviewSheet(file);
        replaceInputFile(input, imageFile);
        input.dispatchEvent(new Event("change", { bubbles: true }));
      } catch (error) {
        input.dataset.pdfEnhanced = "0";
        console.error("PDF drawing enhancement failed", error);
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    },
    true
  );
}

installPdfDrawingUploadEnhancer();
