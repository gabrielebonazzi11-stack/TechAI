import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).href;

function isPdf(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

async function renderFirstPageAsImage(file: File) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const page = await pdf.getPage(1);

  const baseViewport = page.getViewport({ scale: 1 });
  const targetWidth = 2800;
  const scale = Math.max(3, targetWidth / baseViewport.width);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non disponibile");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx as any, viewport }).promise;

  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((result) => resolve(result as Blob), "image/jpeg", 0.98);
  });

  return new File([blob], file.name.replace(/\.pdf$/i, "_lettura_tavola.jpg"), {
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
        const imageFile = await renderFirstPageAsImage(file);
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
