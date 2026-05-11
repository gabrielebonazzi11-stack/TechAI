function normalizeText(text: string) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function isRealVerificationResult(text: string) {
  const lower = normalizeText(text).toLowerCase();

  if (!lower.includes("verifica composta:")) return false;
  if (!lower.includes("esito")) return false;
  if (!lower.includes("σeq") && !lower.includes("seq") && !lower.includes("n =")) return false;

  if (lower.includes("strumenti tecnici")) return false;
  if (lower.includes("cronologia")) return false;
  if (lower.includes("tipo componente")) return false;
  if (lower.includes("benvenuto")) return false;
  if (lower.includes("chiedi a techai")) return false;

  return lower.length >= 45 && lower.length <= 900;
}

function isCalculationLine(text: string) {
  const lower = text.toLowerCase();
  return text.includes("=") || lower.includes("mpa") || lower.includes("n =") || lower.includes("σ") || lower.includes("tau") || lower.includes("tensione");
}

function cleanLines(text: string) {
  return String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.toLowerCase().includes("salva pdf"));
}

function escapeHtml(text: string) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function openPdfReport(text: string) {
  const rows = cleanLines(text);
  const title = rows.find((row) => row.toLowerCase().includes("verifica composta")) || "Verifica tecnica";
  const summary = rows.find((row) => row.toLowerCase().includes("esito")) || "";

  const body = rows
    .filter((row) => row !== title)
    .map((row) => {
      const safe = escapeHtml(row);
      return isCalculationLine(row) ? `<div class="calc">${safe}</div>` : `<p>${safe}</p>`;
    })
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111;line-height:1.55}h1{margin:0 0 8px}.summary{color:#555;margin-bottom:20px}.card{border:1px solid #ddd;border-radius:18px;padding:24px}.calc{border:1px solid #ddd;border-radius:12px;padding:12px;margin:10px 0;background:#f6f6f6;font-family:monospace;white-space:pre-wrap}.btn{padding:10px 14px;border:0;border-radius:10px;font-weight:800;cursor:pointer;margin-bottom:16px}@media print{.btn{display:none}}</style></head><body><button class="btn" onclick="window.print()">Salva come PDF</button><div class="card"><h1>${escapeHtml(title)}</h1><div class="summary">${escapeHtml(summary)}</div>${body}</div></body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;

  win.document.write(html);
  win.document.close();
  window.setTimeout(() => win.print(), 300);
}

function styleResultCard(card: HTMLElement, text: string) {
  if (card.dataset.techaiVerificationEnhanced === "1") return;

  card.dataset.techaiVerificationEnhanced = "1";
  card.style.border = "1px solid rgba(255,255,255,0.14)";
  card.style.borderRadius = "18px";
  card.style.padding = "18px";
  card.style.background = "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02))";

  const toolbar = document.createElement("div");
  toolbar.style.display = "flex";
  toolbar.style.justifyContent = "flex-end";
  toolbar.style.alignItems = "center";
  toolbar.style.marginBottom = "10px";

  const button = document.createElement("button");
  button.textContent = "Salva PDF";
  button.style.border = "0";
  button.style.borderRadius = "12px";
  button.style.padding = "9px 13px";
  button.style.fontWeight = "900";
  button.style.cursor = "pointer";
  button.style.background = "#2563eb";
  button.style.color = "white";
  button.onclick = () => openPdfReport(text);

  toolbar.appendChild(button);
  card.prepend(toolbar);

  const children = Array.from(card.querySelectorAll("p, li")) as HTMLElement[];
  children.forEach((child) => {
    const line = child.innerText || "";
    if (!isCalculationLine(line)) return;
    child.style.border = "1px solid rgba(96,165,250,0.22)";
    child.style.borderRadius = "12px";
    child.style.padding = "10px";
    child.style.margin = "8px 0";
    child.style.background = "rgba(96,165,250,0.06)";
    child.style.fontFamily = "monospace";
  });
}

function scanVerificationResults() {
  const candidates = Array.from(document.querySelectorAll("div, article, section")) as HTMLElement[];

  const valid = candidates
    .map((element) => ({ element, text: element.innerText || "" }))
    .filter(({ element, text }) => !element.dataset.techaiVerificationEnhanced && isRealVerificationResult(text))
    .sort((a, b) => normalizeText(a.text).length - normalizeText(b.text).length);

  const target = valid[0];
  if (!target) return;

  styleResultCard(target.element, target.text);
}

export function installVerificationEnhancer() {
  if (typeof window === "undefined") return;

  window.setTimeout(scanVerificationResults, 600);

  const observer = new MutationObserver(() => {
    window.setTimeout(scanVerificationResults, 200);
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

installVerificationEnhancer();
