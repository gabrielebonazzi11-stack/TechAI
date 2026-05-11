function isVerificationText(text: string) {
  const lower = text.toLowerCase();
  return lower.includes("verifica") && (lower.includes("mpa") || lower.includes("tensione") || lower.includes("goodman") || lower.includes("soderberg"));
}

function isCalcText(text: string) {
  const lower = text.toLowerCase();
  return text.includes("=") || lower.includes("mpa") || lower.includes("goodman") || lower.includes("soderberg") || lower.includes("tensione");
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
  bar.style.justifyContent = "space-between";
  bar.style.alignItems = "center";
  bar.style.marginBottom = "12px";

  const title = document.createElement("strong");
  title.textContent = "Report verifica tecnica";

  const hint = document.createElement("span");
  hint.textContent = "Output calcoli ordinato";
  hint.style.opacity = "0.7";
  hint.style.fontSize = "12px";

  bar.appendChild(title);
  bar.appendChild(hint);
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
  const scan = () => {
    const items = Array.from(document.querySelectorAll("div, section, article")) as HTMLElement[];
    items.forEach(enhance);
  };

  const observer = new MutationObserver(() => window.setTimeout(scan, 150));
  observer.observe(document.body, { childList: true, subtree: true });
  window.setTimeout(scan, 500);
}
