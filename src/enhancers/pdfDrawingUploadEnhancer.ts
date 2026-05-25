import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).href;

function isPdf(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

async function loadPdf(file: File) {
  const buffer = await file.arrayBuffer();
  return pdfjsLib.getDocument({ data: buffer }).promise;
}

async function renderPage(pdf: any) {
  const page = await pdf.getPage(1);
  const baseViewport = page.getViewport({ scale: 1 });

  // Rendering ad alta risoluzione: mantiene la tavola intera e leggibile,
  // senza dividerla in riquadri o crop artificiali.
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

function buildCompleteDrawingImage(pageCanvas: HTMLCanvasElement) {
  const maxSide = 3200;
  const scale = Math.min(1, maxSide / Math.max(pageCanvas.width, pageCanvas.height));

  const out = document.createElement("canvas");
  out.width = Math.round(pageCanvas.width * scale);
  out.height = Math.round(pageCanvas.height * scale);

  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Canvas non disponibile");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(pageCanvas, 0, 0, out.width, out.height);

  return out;
}

async function renderPdfAsCompleteImage(file: File) {
  const pdf = await loadPdf(file);
  const pageCanvas = await renderPage(pdf);
  const completeImage = buildCompleteDrawingImage(pageCanvas);

  const blob = await new Promise<Blob>((resolve) => {
    completeImage.toBlob((result) => resolve(result as Blob), "image/jpeg", 0.92);
  });

  return new File([blob], file.name.replace(/\.pdf$/i, "_tavola_completa.jpg"), {
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

      // Lavora solo sull'upload della funzione "Tavole".
      // I PDF caricati nella chat normale devono rimanere PDF originali.
      if (input.dataset.techaiPdfDrawing !== "1") return;
      if (input.dataset.pdfEnhanced === "1") return;

      input.dataset.pdfEnhanced = "1";
      event.preventDefault();
      event.stopPropagation();

      try {
        const imageFile = await renderPdfAsCompleteImage(file);
        replaceInputFile(input, imageFile);
        input.dispatchEvent(new Event("change", { bubbles: true }));
      } catch (error) {
        input.dataset.pdfEnhanced = "0";
        console.error("PDF drawing conversion failed", error);
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    },
    true
  );
}

installPdfDrawingUploadEnhancer();
