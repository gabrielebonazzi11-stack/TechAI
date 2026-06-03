export type FunctionalDimensionInput = {
  partName?: string;
  partType?: string;
  material?: string;
  manufacturing?: string;
  mainFeatures?: string;
  functionalSurfaces?: string;
  holesThreads?: string;
  fits?: string;
  tolerances?: string;
  roughness?: string;
  assemblyFunction?: string;
  productionQuantity?: string;
};

export type FunctionalDimensionSeverity = "critica" | "controllo" | "informativa";

export type FunctionalDimensionCheck = {
  id: string;
  severity: FunctionalDimensionSeverity;
  title: string;
  expectedDimension: string;
  why: string;
  status: "presente" | "da_verificare" | "mancante";
  suggestion: string;
};

function textOf(input: FunctionalDimensionInput) {
  return [
    input.partName,
    input.partType,
    input.material,
    input.manufacturing,
    input.mainFeatures,
    input.functionalSurfaces,
    input.holesThreads,
    input.fits,
    input.tolerances,
    input.roughness,
    input.assemblyFunction,
    input.productionQuantity,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function hasAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function fieldHas(value: string | undefined, words: string[]) {
  const text = String(value || "").toLowerCase();
  return hasAny(text, words);
}

function makeCheck(
  id: string,
  severity: FunctionalDimensionSeverity,
  title: string,
  expectedDimension: string,
  why: string,
  status: FunctionalDimensionCheck["status"],
  suggestion: string
): FunctionalDimensionCheck {
  return { id, severity, title, expectedDimension, why, status, suggestion };
}

function inferStatus(input: FunctionalDimensionInput, primaryField: keyof FunctionalDimensionInput, keywords: string[]) {
  const fieldValue = String(input[primaryField] || "");
  if (fieldHas(fieldValue, keywords)) return "presente";

  const globalText = textOf(input);
  if (hasAny(globalText, keywords)) return "da_verificare";

  return "mancante";
}

export function analyzeFunctionalDimensions(input: FunctionalDimensionInput): FunctionalDimensionCheck[] {
  const text = textOf(input);
  const checks: FunctionalDimensionCheck[] = [];

  const hasFunctionalSurfaces = String(input.functionalSurfaces || "").trim().length > 0;
  const hasFits = String(input.fits || "").trim().length > 0;
  const hasTolerances = String(input.tolerances || "").trim().length > 0;
  const hasRoughness = String(input.roughness || "").trim().length > 0;

  checks.push(
    makeCheck(
      "functional-references",
      "critica",
      "Riferimenti funzionali principali",
      "Quote da datum/riferimenti funzionali, non solo da ingombri esterni.",
      "Le quote funzionali devono partire dalle superfici che definiscono montaggio, appoggio, centraggio o scorrimento.",
      hasFunctionalSurfaces ? "da_verificare" : "mancante",
      hasFunctionalSurfaces
        ? "Verifica che le quote principali partano dalle superfici funzionali indicate e non da riferimenti casuali."
        : "Indica superfici funzionali: sedi, battute, appoggi, fori di centraggio, piani di riferimento o superfici di accoppiamento."
    )
  );

  if (hasAny(text, ["foro", "fori", "filett", "lamatura", "svasatura", "m6", "m8", "m10", "m12"])) {
    checks.push(
      makeCheck(
        "holes-position",
        "critica",
        "Posizione fori/filetti",
        "Diametro, profondità, quantità, interassi e posizione rispetto ai datum.",
        "I fori funzionali devono essere posizionati da riferimenti coerenti con montaggio e lavorazione.",
        inferStatus(input, "holesThreads", ["diam", "prof", "interasse", "pos", "m6", "m8", "m10", "m12", "h7"]),
        "Per ogni foro funzionale riporta Ø, profondità, quantità, eventuale filetto, lamatura/svasatura e quote di posizione rispetto ai riferimenti funzionali."
      )
    );
  }

  if (hasAny(text, ["albero", "perno", "spina", "boccola", "cuscinetto", "sede", "mozzo"])) {
    checks.push(
      makeCheck(
        "diameter-fit",
        "critica",
        "Diametri di accoppiamento",
        "Ø funzionale con tolleranza ISO, ad esempio H7/g6, H7/h6, k6, m6.",
        "Sedi, alberi, perni e boccole non devono avere solo diametro nominale: serve tolleranza coerente con accoppiamento.",
        hasFits || fieldHas(input.tolerances, ["h7", "g6", "h6", "k6", "m6", "iso"]) ? "da_verificare" : "mancante",
        "Aggiungi tolleranza ISO sui diametri di accoppiamento e specifica il tipo di accoppiamento richiesto: gioco, transizione o interferenza."
      )
    );
  }

  if (hasAny(text, ["appoggio", "battuta", "flangia", "piano", "base", "supporto", "staffa", "scorrimento", "tenuta"])) {
    checks.push(
      makeCheck(
        "flatness-functional-plane",
        "controllo",
        "Piani di appoggio e battute",
        "Quota di posizione/spessore e, se necessario, planarità/perpendicolarità rispetto ai datum.",
        "Piani e battute controllano montaggio, contatto e allineamento: vanno quotati come superfici funzionali.",
        hasTolerances ? "da_verificare" : "mancante",
        "Valuta una tolleranza geometrica su planarità, parallelismo o perpendicolarità e collega le quote al piano funzionale."
      )
    );
  }

  if (hasAny(text, ["scorrimento", "tenuta", "cuscinetto", "guida", "sede", "appoggio", "battuta"])) {
    checks.push(
      makeCheck(
        "surface-roughness",
        "controllo",
        "Rugosità sulle superfici funzionali",
        "Ra/Rz specifico sulle superfici di contatto, scorrimento, tenuta o accoppiamento.",
        "La rugosità generale non basta sempre: le superfici funzionali possono richiedere valori dedicati.",
        hasRoughness ? "da_verificare" : "mancante",
        "Aggiungi rugosità specifica sulle superfici funzionali; non affidarti solo alla rugosità generale nel cartiglio."
      )
    );
  }

  if (hasAny(text, ["simmetrico", "centraggio", "asse", "coass", "concentric", "rotazione", "cuscinetto", "albero", "foro passante"])) {
    checks.push(
      makeCheck(
        "axis-datum",
        "controllo",
        "Assi e riferimenti di centraggio",
        "Quote rispetto ad asse/datum centrale e tolleranze geometriche se serve coassialità/posizione.",
        "Per componenti assialsimmetrici o fori centrati, il riferimento funzionale spesso è l'asse, non un bordo esterno.",
        hasTolerances || fieldHas(input.functionalSurfaces, ["asse", "datum", "centraggio"]) ? "da_verificare" : "mancante",
        "Definisci asse o datum principale e quota fori/sedi rispetto a quel riferimento. Se serve, aggiungi posizione/coassialità."
      )
    );
  }

  if (hasAny(text, ["cava", "linguetta", "chiavetta", "seeger", "gola", "scanalatura", "o-ring", "oring"])) {
    checks.push(
      makeCheck(
        "slots-grooves",
        "critica",
        "Cave, gole e sedi speciali",
        "Larghezza, profondità, raggio fondo, posizione assiale e tolleranza della sede.",
        "Cave e gole sono spesso funzionali al montaggio e possono bloccare la producibilità se quotate male.",
        inferStatus(input, "mainFeatures", ["cava", "gola", "prof", "larg", "raggio", "sede"]),
        "Completa la quotatura della cava/gola con larghezza, profondità, raggi e posizione rispetto alla battuta o al datum funzionale."
      )
    );
  }

  checks.push(
    makeCheck(
      "general-tolerances",
      "informativa",
      "Tolleranze generali",
      "Classe di tolleranza generale o richiamo normativo nel cartiglio.",
      "Le quote non funzionali possono usare tolleranze generali, ma devono essere presenti e coerenti con processo produttivo.",
      hasTolerances ? "presente" : "mancante",
      "Riporta tolleranze generali nel cartiglio; per quote funzionali usa invece tolleranze dedicate."
    )
  );

  return checks;
}

export function summarizeFunctionalDimensions(checks: FunctionalDimensionCheck[]) {
  const criticalMissing = checks.filter((item) => item.severity === "critica" && item.status === "mancante").length;
  const missing = checks.filter((item) => item.status === "mancante").length;
  const verify = checks.filter((item) => item.status === "da_verificare").length;

  if (criticalMissing > 0) {
    return {
      status: "❌ Incompleto",
      reason: `Mancano ${criticalMissing} quote/riferimenti funzionali critici.`,
    };
  }

  if (missing > 0 || verify > 0) {
    return {
      status: "⚠️ Da verificare",
      reason: `Ci sono ${missing} elementi mancanti e ${verify} elementi da verificare.`,
    };
  }

  return {
    status: "✅ Coerente",
    reason: "Le informazioni inserite coprono i principali riferimenti funzionali.",
  };
}
