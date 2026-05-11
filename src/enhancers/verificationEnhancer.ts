function isVerificationText(text: string) {
  const lower = text.toLowerCase();
  return lower.includes("verifica") && (lower.includes("mpa") || lower.includes("tensione") || lower.includes("goodman") || lower.includes("soderberg") || lower.includes("non ok") || lower.includes("ok"));
}

function isCalcText(text: string) {
  const lower = text.toLowerCase();
  return text.includes("=") || lower.includes("mpa") || lower.includes("nmm") || lower.includes("goodman") || lower.includes("soderberg") || lower.includes("tensione") || lower.includes("sigma") || lower.includes("tau");
}

function sanitize(text: string) {
  return text.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function cleanRows(text: string) {
  return text
    .split("\n")
    .map((row) => row.trim())
    .filter(Boolean)
    .filter((row) => !row.toLowerCase().includes("report verifica tecnica"))
    .filter((row) => !row.toLowerCase().includes("output calcoli ordinato"))
    .filter((row) => !row.toLowerCase().includes("salva pdf"))
    .filter((row) => !row.toLowerCase().includes("scarica report"));
}

function buildPrintableHtml(text: string) {
  const rows = cleanRows(text);
  const title = rows.find((row) => row.toLowerCase().includes("verifica")) || "Verifica tecnica";
  const summary = rows.find((row) => row.toLowerCase().includes("esito")) || "";
  const body = rows
    .map((row) => {
      const safe = sanitize(row);
      return isCalcText(row) ? `<div class="calc">${safe}</div>` : `<p>${safe}</p>`;
    })
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>${sanitize(title)}</title><style>body{font-family:Arial,sans-serif;background:#0b0f14;color:#f8fafc;padding:32px;line-height:1.55}.card{border:1px solid #263445;border-radius:18px;padding:24px;background:#111827}h1{margin:0 0 8px}.summary{color:#9ca3af;margin-bottom:22px}.calc{border:1px solid #324154;border-radius:12px;padding:12px;margin:10px 0;background:#172033;font-family:monospace;white-space:pre-wrap}.btn{padding:10px 14px;border-radius:10px;border:0;font-weight:800;cursor:pointer;margin-bottom:18px}@media print{body{background:#fff;color:#111}.card{border:0;background:#fff}.btn{display:none}.calc{background:#f6f6f6;color:#111}}</style></head><body><button class="btn" onclick="window.print()">Salva come PDF</button><div class="card"><h1>${sanitize(title)}</h1><div class="summary">${sanitize(summary)}</div>${body}</div></body></html>`;
}

function openReport(text: string) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(buildPrintableHtml(text));
  win.document.close();
  window.setTimeout(() => win.print(), 350);
}

function enhance(element: HTMLElement) {
  if (element.dataset.techaiVerification === "1") return;

  const text = element.innerText || "";
  if (!isVerificationText(text)) return;

  element.dataset.techaiVerification = "1";
  element.style.border = "1px solid rgba(255,255,255,0.10)";
  element.style.borderRadius = "18px";
  element.style.padding = "18px";
  element.style.background = "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.025))";

  const bar = document.createElement("div");
  bar.style.display = "flex";
  bar.style.justifyContent = "flex-end";
  bar.style.alignItems = "center";
  bar.style.marginBottom = "12px";

  const btn = document.createElement("button");
  btn.textContent = "Salva PDF";
  btn.style.border = "0";
  btn.style.borderRadius = "12px";
  btn.style.padding = "10px 14px";
  btn.style.fontWeight = "900";
  btn.style.cursor = "pointer";
  btn.style.background = "linear-gradient(135deg, #22c55e, #16a34a)";
  btn.style.color = "white";
  btn.onclick = () => openReport(text);

  bar.appendChild(btn);
  element.prepend(bar);

  const nodes = Array.from(element.querySelectorAll("p, li, div")) as HTMLElement[];
  nodes.forEach((node) => {
    const rowText = node.innerText || "";
    if (!isCalcText(rowText)) return;
    if (rowText.includes("Salva PDF")) return;
    node.style.border = "1px solid rgba(34,197,94,0.25)";
    node.style.borderRadius = "14px";
    node.style.padding = "12px";
    node.style.margin = "8px 0";
    node.style.fontFamily = "monospace";
    node.style.whiteSpace = "pre-wrap";
    node.style.background = "rgba(34,197,94,0.06)";
  });
}

export function installVerificationEnhancer() {
  const scan = () => {
    const items = Array.from(document.querySelectorAll("div, section, article")) as HTMLElement[];
    items.forEach(enhance);
  };

  const observer = new MutationObserver(() => window.setTimeout(scan, 150));
  observer.observe(document.body, { childList: true, subtree: true });
  window.setTimeout(scan, 500);
}
