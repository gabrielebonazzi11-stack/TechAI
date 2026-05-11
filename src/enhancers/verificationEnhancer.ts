function isVerificationText(text: string) {
  const lower = text.toLowerCase();
  return lower.includes("verifica") && (lower.includes("mpa") || lower.includes("tensione") || lower.includes("goodman") || lower.includes("soderberg"));
}

function isCalcText(text: string) {
  const lower = text.toLowerCase();
  return text.includes("=") || lower.includes("mpa") || lower.includes("goodman") || lower.includes("soderberg") || lower.includes("tensione");
}

function safeRows(text: string) {
  return text
    .split("\n")
    .map((row) => row.trim())
    .filter(Boolean)
    .filter((row) => !row.toLowerCase().includes("report verifica tecnica"))
    .filter((row) => !row.toLowerCase().includes("output calcoli ordinato"))
    .filter((row) => !row.toLowerCase().includes("salva pdf"));
}

function openPrintableReport(text: string) {
  const win = window.open("", "_blank");
  if (!win) return;

  const rows = safeRows(text);
  const body = rows
    .map((row) => {
      const safe = row.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
      return isCalcText(row) ? `<div class="calc">${safe}</div>` : `<p>${safe}</p>`;
    })
    .join("");

  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Verifica tecnica</title><style>body{font-family:Arial,sans-serif;padding:32px;line-height:1.55;color:#111}h1{margin-bottom:20px}.calc{border:1px solid #ddd;border-radius:12px;padding:12px;margin:10px 0;background:#f6f6f6;font-family:monospace;white-space:pre-wrap}@media print{button{display:none}}</style></head><body><button onclick="window.print()" style="padding:10px 14px;border-radius:10px;border:0;font-weight:700;margin-bottom:18px;cursor:pointer">Salva come PDF</button><h1>Verifica tecnica</h1>${body}</body></html>`);
  win.document.close();
  window.setTimeout(() => win.print(), 350);
}

function enhance(element: HTMLElement) {
  if (element.dataset.techaiVerification === "1") return;

  const text = element.innerText || "";
  if (!isVerificationText(text)) return;

  element.dataset.techaiVerification = "1";
  element.style.border = "1px solid rgba(96,165,250,0.35)";
  element.style.borderRadius = "18px";
  element.style.padding = "16px";
  element.style.background = "rgba(96,165,250,0.06)";

  const bar = document.createElement("div");
  bar.style.display = "flex";
  bar.style.justifyContent = "flex-end";
  bar.style.alignItems = "center";
  bar.style.marginBottom = "12px";

  const btn = document.createElement("button");
  btn.textContent = "Salva PDF";
  btn.style.border = "0";
  btn.style.borderRadius = "12px";
  btn.style.padding = "9px 12px";
  btn.style.fontWeight = "800";
  btn.style.cursor = "pointer";
  btn.onclick = () => openPrintableReport(text);

  bar.appendChild(btn);
  element.prepend(bar);

  const nodes = Array.from(element.querySelectorAll("p, li, div")) as HTMLElement[];
  nodes.forEach((node) => {
    if (!isCalcText(node.innerText || "")) return;
    node.style.border = "1px solid rgba(255,255,255,0.12)";
    node.style.borderRadius = "14px";
    node.style.padding = "10px";
    node.style.margin = "8px 0";
    node.style.fontFamily = "monospace";
    node.style.whiteSpace = "pre-wrap";
  });
}

export function installVerificationEnhancer() {
  if (typeof window === "undefined") return;

  const scan = () => {
    const items = Array.from(document.querySelectorAll("div, section, article")) as HTMLElement[];
    items.forEach(enhance);
  };

  const observer = new MutationObserver(() => window.setTimeout(scan, 150));
  observer.observe(document.body, { childList: true, subtree: true });
  window.setTimeout(scan, 500);
}

installVerificationEnhancer();
