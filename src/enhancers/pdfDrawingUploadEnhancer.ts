import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).href;

function isPdf(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function drawWrappedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const words = text.replace(/\s+/g, " ").split(" ");
  let line = "";
  let lines = 0;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
      lines += 1;
      line = word;
      if (lines >= maxLines) return;
    } else {
      line = testLine;
    }
  }

  if (line && lines < maxLines) ctx.fillText(line, x, y);
}

function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  ctx.fillStyle = "#111827";
  ctx.fillRect(x, y, 520, 42);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px Arial";
  ctx.fillText(text, x + 14, y + 28);
}

function cropToCanvas(source: HTMLCanvasElement, sx: number, sy: number, sw: number, sh: number, label: string) {
  const out = document.createElement("canvas");
  out.width = 1500;
  out.height = 1050;

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

async function loadPdf(file: File) {
  const buffer = await file.arrayBuffer();
  return pdfjsLib.getDocument({ data: buffer }).promise;
}

async function extractVectorText(pdf: any) {
  const chunks: string[] = [];
  const pageCount = Math.min(pdf.numPages, 3);

  for (let i = 1; i <= pageCount; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => ("str" in item ? String(item.str).trim() : ""))
      .filter(Boolean)
      .join(" | ");

    if (pageText) chunks.push(`PAGINA ${i}: ${pageText}`);
  }

  return chunks.join("\n").slice(0, 7000);
}

async function renderPage(pdf: any) {
  const page = await pdf.getPage(1);
  const baseViewport = page.getViewport({ scale: 1 });
  const targetWidth = 4800;
  const scale = Math.max(4.5, targetWidth / baseViewport.width);
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

function buildHybridSheet(pageCanvas: HTMLCanvasElement, extractedText: string) {
  const w = pageCanvas.width;
  const h = pageCanvas.height;

  const full = cropToCanvas(pageCanvas, 0, 0, w, h, "TAVOLA COMPLETA");
  const titleBlock = cropToCanvas(pageCanvas, Math.floor(w * 0.55), Math.floor(h * 0.60), Math.floor(w * 0.45), Math.floor(h * 0.40), "CARTIGLIO / MATERIALE / SCALA");
  const centerDetail = cropToCanvas(pageCanvas, Math.floor(w * 0.15), Math.floor(h * 0.12), Math.floor(w * 0.70), Math.floor(h * 0.62), "QUOTE / VISTE PRINCIPALI");
  const notes = cropToCanvas(pageCanvas, 0, Math.floor(h * 0.72), w, Math.floor(h * 0.28), "NOTE / TOLLERANZE GENERALI");

  const sheet = document.createElement("canvas");
  sheet.width = 3200;
  sheet.height = 3600;

  const ctx = sheet.getContext("2d");
  if (!ctx) throw new Error("Canvas non disponibile");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, sheet.width, sheet.height);

  ctx.fillStyle = "#111827";
  ctx.font = "bold 38px Arial";
  ctx.fillText("TECHAI PDF DRAWING READER - analisi tavola", 50, 60);

  ctx.font = "24px Arial";
  ctx.fillText("Il riquadro testo sotto contiene il testo vettoriale estratto dal PDF. Usarlo insieme agli zoom grafici.", 50, 105);

  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 3;
  ctx.strokeRect(50, 135, 3100, 430);
  ctx.fillStyle = "#111827";
  ctx.font = "bold 26px Arial";
  ctx.fillText("TESTO PDF ESTRATTO", 70, 175);
  ctx.font = "22px Arial";
  drawWrappedText(ctx, extractedText || "Nessun testo vettoriale estratto: trattare la tavola come immagine.", 70, 215, 3040, 30, 12);

  fitDraw(ctx, full, 50, 620, 1500, 850, "1. Tavola completa");
  fitDraw(ctx, centerDetail, 1650, 620, 1500, 850, "2. Quote e viste principali");
  fitDraw(ctx, titleBlock, 50, 1560, 1500, 850, "3. Cartiglio ingrandito");
  fitDraw(ctx, notes, 1650, 1560, 1500, 850, "4. Note e tolleranze");

  fitDraw(ctx, cropToCanvas(pageCanvas, 0, 0, Math.floor(w * 0.5), Math.floor(h * 0.55), "ZONA SINISTRA"), 50, 2500, 1500, 850, "5. Dettaglio sinistro");
  fitDraw(ctx, cropToCanvas(pageCanvas, Math.floor(w * 0.5), 0, Math.floor(w * 0.5), Math.floor(h * 0.55), "ZONA DESTRA"), 1650, 2500, 1500, 850, "6. Dettaglio destro");

  return sheet;
}

async function renderPdfAsHybridReader(file: File) {
  const pdf = await loadPdf(file);
  const extractedText = await extractVectorText(pdf);
  const pageCanvas = await renderPage(pdf);
  const sheet = buildHybridSheet(pageCanvas, extractedText);

  const blob = await new Promise<Blob>((resolve) => {
    sheet.toBlob((result) => resolve(result as Blob), "image/jpeg", 0.9);
  });

  return new File([blob], file.name.replace(/\.pdf$/i, "_reader_ibrido_tavola.jpg"), {
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

      // Importante: l'enhancer deve lavorare solo sull'upload della funzione "Tavole".
      // Senza questo controllo convertirebbe anche i PDF caricati nella chat normale,
      // impedendo l'estrazione del testo PDF per Groq.
      if (input.dataset.techaiPdfDrawing !== "1") return;
      if (input.dataset.pdfEnhanced === "1") return;

      input.dataset.pdfEnhanced = "1";
      event.preventDefault();
      event.stopPropagation();

      try {
        const imageFile = await renderPdfAsHybridReader(file);
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
