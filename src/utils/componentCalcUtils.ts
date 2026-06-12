import type { ComponentCalcForm, ComponentCalcMode, ComponentCalcResult } from "../types/appTypes";

export const COMPONENT_CALC_MODES: Array<{
  value: ComponentCalcMode;
  label: string;
  description: string;
}> = [
  {
    value: "solid_circular_section",
    label: "Sezione circolare piena",
    description: "Area, inerzie, moduli resistenti, volume e massa indicativa.",
  },
  {
    value: "hollow_circular_section",
    label: "Sezione circolare cava / tubo / boccola",
    description: "Area anulare, inerzie, moduli resistenti, volume e massa indicativa.",
  },
  {
    value: "solid_rectangular_section",
    label: "Sezione rettangolare piena",
    description: "Area, momento d’inerzia, modulo resistente, volume e massa.",
  },
  {
    value: "hollow_rectangular_section",
    label: "Sezione rettangolare cava",
    description: "Area cava, inerzia, modulo resistente, volume e massa.",
  },
  {
    value: "pin",
    label: "Perno / spina",
    description: "Taglio singolo/doppio, pressione specifica, flessione indicativa e Von Mises.",
  },
  {
    value: "key",
    label: "Linguetta",
    description: "Forza tangenziale, taglio e schiacciamento della linguetta.",
  },
  {
    value: "bolt",
    label: "Bullone / vite",
    description: "Trazione, taglio, tensione equivalente e coefficiente di sicurezza.",
  },
  {
    value: "weld",
    label: "Saldatura a cordone",
    description: "Area gola, tensioni normali/tangenziali e Von Mises semplificato.",
  },
  {
    value: "pressure_vessel",
    label: "Recipiente cilindrico in pressione",
    description: "Tensioni circonferenziali/longitudinali, Von Mises e spessore indicativo.",
  },
  {
    value: "mass_from_volume",
    label: "Massa da volume",
    description: "Calcolo rapido massa partendo da volume e densità.",
  },
];

export const DEFAULT_COMPONENT_CALC_FORM: ComponentCalcForm = {
  mode: "solid_circular_section",
  title: "",
  material: "C45",
  density: "7.85",
  length: "100",

  diameter: "25",
  outerDiameter: "40",
  innerDiameter: "25",

  base: "30",
  height: "50",
  outerBase: "60",
  outerHeight: "80",
  innerBase: "40",
  innerHeight: "60",

  force: "2500",
  shearForce: "1500",
  shearPlanes: "1",
  contactLength: "30",
  torque: "80000",

  keyWidth: "8",
  keyHeight: "7",
  keyLength: "40",

  boltArea: "58",
  boltCount: "4",

  weldLength: "80",
  weldThroat: "3",

  pressure: "30",
  radius: "150",
  thickness: "4",

  volumeCm3: "100",
  yieldStrength: "300",
  safetyFactorRequired: "2",
};

export function toCalcNumber(value: string | number | undefined, fallback = 0): number {
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

export function formatCalcNumber(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("it-IT", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function requirePositive(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Inserisci un valore valido maggiore di zero per ${label}.`);
  }
}

function pushVolumeAndMass(rows: string[], formulas: string[], notes: string[], areaMm2: number, lengthMm: number, densityGcm3: number) {
  if (lengthMm > 0) {
    const volumeMm3 = areaMm2 * lengthMm;
    const volumeCm3 = volumeMm3 / 1000;
    rows.push(`Volume V = ${formatCalcNumber(volumeMm3)} mm³ = ${formatCalcNumber(volumeCm3)} cm³`);
    formulas.push("V = A · L");

    if (densityGcm3 > 0) {
      const massKg = volumeCm3 * densityGcm3 / 1000;
      rows.push(`Massa m = ${formatCalcNumber(massKg, 4)} kg`);
      formulas.push("m = V · ρ");
    } else {
      notes.push("Per calcolare la massa inserisci una densità valida in g/cm³.");
    }
  }
}

function makeOutcome(safetyFactor: number, required: number): ComponentCalcResult["outcome"] {
  if (!Number.isFinite(safetyFactor) || safetyFactor <= 0) return "DA VERIFICARE";
  return safetyFactor >= required ? "OK" : "NON OK";
}

export function calculateComponent(form: ComponentCalcForm): ComponentCalcResult {
  const mode = form.mode;
  const density = toCalcNumber(form.density);
  const length = toCalcNumber(form.length);
  const force = toCalcNumber(form.force);
  const shearForce = toCalcNumber(form.shearForce);
  const yieldStrength = toCalcNumber(form.yieldStrength);
  const requiredSafety = toCalcNumber(form.safetyFactorRequired, 2) || 2;

  const formulas: string[] = [];
  const inputs: string[] = [];
  const results: string[] = [];
  const notes: string[] = [];

  let title = "Calcolo tecnico";
  let component = "Componente";
  let mainValue = 0;
  let secondaryValue: number | undefined;
  let safetyFactor: number | undefined;
  let outcome: ComponentCalcResult["outcome"] = "DA VERIFICARE";

  if (mode === "solid_circular_section") {
    const d = toCalcNumber(form.diameter);
    requirePositive(d, "diametro d");

    const A = Math.PI * d ** 2 / 4;
    const Jf = Math.PI * d ** 4 / 64;
    const Wf = Math.PI * d ** 3 / 32;
    const Jp = Math.PI * d ** 4 / 32;
    const Wt = Math.PI * d ** 3 / 16;

    title = "Sezione circolare piena";
    component = `Ø${formatCalcNumber(d)} mm`;
    mainValue = A;
    formulas.push("A = π · d² / 4", "Jf = π · d⁴ / 64", "Wf = π · d³ / 32", "Jp = π · d⁴ / 32", "Wt = π · d³ / 16");
    inputs.push(`Diametro d = ${formatCalcNumber(d)} mm`, `Lunghezza L = ${formatCalcNumber(length)} mm`, `Densità ρ = ${formatCalcNumber(density)} g/cm³`);
    results.push(`Area A = ${formatCalcNumber(A)} mm²`, `Momento d’inerzia Jf = ${formatCalcNumber(Jf)} mm⁴`, `Modulo resistente Wf = ${formatCalcNumber(Wf)} mm³`, `Momento polare Jp = ${formatCalcNumber(Jp)} mm⁴`, `Modulo torsionale Wt = ${formatCalcNumber(Wt)} mm³`);
    pushVolumeAndMass(results, formulas, notes, A, length, density);
  }

  if (mode === "hollow_circular_section") {
    const D = toCalcNumber(form.outerDiameter);
    const d = toCalcNumber(form.innerDiameter);
    requirePositive(D, "diametro esterno D");
    requirePositive(d, "diametro interno d");
    if (d >= D) throw new Error("Il diametro interno deve essere minore del diametro esterno.");

    const A = Math.PI * (D ** 2 - d ** 2) / 4;
    const Jf = Math.PI * (D ** 4 - d ** 4) / 64;
    const Wf = Jf / (D / 2);
    const Jp = Math.PI * (D ** 4 - d ** 4) / 32;
    const Wt = Jp / (D / 2);

    title = "Sezione circolare cava / tubo / boccola";
    component = `Ø${formatCalcNumber(D)}/${formatCalcNumber(d)} mm`;
    mainValue = A;
    formulas.push("A = π · (D² - d²) / 4", "Jf = π · (D⁴ - d⁴) / 64", "Wf = Jf / (D/2)", "Jp = π · (D⁴ - d⁴) / 32", "Wt = Jp / (D/2)");
    inputs.push(`Diametro esterno D = ${formatCalcNumber(D)} mm`, `Diametro interno d = ${formatCalcNumber(d)} mm`, `Lunghezza L = ${formatCalcNumber(length)} mm`, `Densità ρ = ${formatCalcNumber(density)} g/cm³`);
    results.push(`Area anulare A = ${formatCalcNumber(A)} mm²`, `Momento d’inerzia Jf = ${formatCalcNumber(Jf)} mm⁴`, `Modulo resistente Wf = ${formatCalcNumber(Wf)} mm³`, `Momento polare Jp = ${formatCalcNumber(Jp)} mm⁴`, `Modulo torsionale Wt = ${formatCalcNumber(Wt)} mm³`);
    pushVolumeAndMass(results, formulas, notes, A, length, density);
  }

  if (mode === "solid_rectangular_section") {
    const b = toCalcNumber(form.base);
    const h = toCalcNumber(form.height);
    requirePositive(b, "base b");
    requirePositive(h, "altezza h");

    const A = b * h;
    const Jf = b * h ** 3 / 12;
    const Wf = b * h ** 2 / 6;

    title = "Sezione rettangolare piena";
    component = `${formatCalcNumber(b)} × ${formatCalcNumber(h)} mm`;
    mainValue = A;
    formulas.push("A = b · h", "Jf = b · h³ / 12", "Wf = b · h² / 6");
    inputs.push(`Base b = ${formatCalcNumber(b)} mm`, `Altezza h = ${formatCalcNumber(h)} mm`, `Lunghezza L = ${formatCalcNumber(length)} mm`);
    results.push(`Area A = ${formatCalcNumber(A)} mm²`, `Momento d’inerzia Jf = ${formatCalcNumber(Jf)} mm⁴`, `Modulo resistente Wf = ${formatCalcNumber(Wf)} mm³`);
    pushVolumeAndMass(results, formulas, notes, A, length, density);
  }

  if (mode === "hollow_rectangular_section") {
    const B = toCalcNumber(form.outerBase);
    const H = toCalcNumber(form.outerHeight);
    const b = toCalcNumber(form.innerBase);
    const h = toCalcNumber(form.innerHeight);
    requirePositive(B, "base esterna B");
    requirePositive(H, "altezza esterna H");
    requirePositive(b, "base interna b");
    requirePositive(h, "altezza interna h");
    if (b >= B || h >= H) throw new Error("Le dimensioni interne devono essere minori di quelle esterne.");

    const A = B * H - b * h;
    const Jf = (B * H ** 3 - b * h ** 3) / 12;
    const Wf = Jf / (H / 2);

    title = "Sezione rettangolare cava";
    component = `${formatCalcNumber(B)}×${formatCalcNumber(H)} / ${formatCalcNumber(b)}×${formatCalcNumber(h)} mm`;
    mainValue = A;
    formulas.push("A = B · H - b · h", "Jf = (B · H³ - b · h³) / 12", "Wf = Jf / (H/2)");
    inputs.push(`Dimensioni esterne B×H = ${formatCalcNumber(B)} × ${formatCalcNumber(H)} mm`, `Dimensioni interne b×h = ${formatCalcNumber(b)} × ${formatCalcNumber(h)} mm`, `Lunghezza L = ${formatCalcNumber(length)} mm`);
    results.push(`Area A = ${formatCalcNumber(A)} mm²`, `Momento d’inerzia Jf = ${formatCalcNumber(Jf)} mm⁴`, `Modulo resistente Wf = ${formatCalcNumber(Wf)} mm³`);
    pushVolumeAndMass(results, formulas, notes, A, length, density);
  }

  if (mode === "pin") {
    const d = toCalcNumber(form.diameter);
    const contactLength = toCalcNumber(form.contactLength);
    const shearPlanes = Math.max(1, Math.round(toCalcNumber(form.shearPlanes, 1)));
    requirePositive(force, "forza F");
    requirePositive(d, "diametro d");
    requirePositive(contactLength, "lunghezza di contatto L");

    const A = Math.PI * d ** 2 / 4;
    const tau = force / (shearPlanes * A);
    const pressure = force / (d * contactLength);
    const Mf = force * contactLength / 4;
    const sigmaF = 32 * Mf / (Math.PI * d ** 3);
    const sigmaVm = Math.sqrt(sigmaF ** 2 + 3 * tau ** 2);

    safetyFactor = yieldStrength > 0 ? yieldStrength / sigmaVm : undefined;
    outcome = safetyFactor ? makeOutcome(safetyFactor, requiredSafety) : "DA VERIFICARE";
    title = "Perno / spina";
    component = `Perno Ø${formatCalcNumber(d)} mm`;
    mainValue = sigmaVm;
    secondaryValue = safetyFactor;
    formulas.push("A = π · d² / 4", "τ = F / (z · A)", "p = F / (d · L)", "Mf ≈ F · L / 4", "σf = 32 · Mf / (π · d³)", "σVM = √(σf² + 3τ²)");
    inputs.push(`Forza F = ${formatCalcNumber(force)} N`, `Diametro d = ${formatCalcNumber(d)} mm`, `Piani di taglio z = ${shearPlanes}`, `Lunghezza contatto L = ${formatCalcNumber(contactLength)} mm`, `Re = ${formatCalcNumber(yieldStrength)} MPa`);
    results.push(`Area A = ${formatCalcNumber(A)} mm²`, `Tensione di taglio τ = ${formatCalcNumber(tau)} MPa`, `Pressione specifica p = ${formatCalcNumber(pressure)} MPa`, `Momento flettente indicativo Mf = ${formatCalcNumber(Mf)} Nmm`, `Tensione flessionale σf = ${formatCalcNumber(sigmaF)} MPa`, `Von Mises σVM = ${formatCalcNumber(sigmaVm)} MPa`);
    if (safetyFactor) results.push(`Coefficiente sicurezza n = ${formatCalcNumber(safetyFactor)}`);
    notes.push("La flessione del perno è stimata in modo semplificato. Per progetto reale controllare vincoli, giochi e distribuzione del carico.");
  }

  if (mode === "key") {
    const d = toCalcNumber(form.diameter);
    const Mt = toCalcNumber(form.torque);
    const b = toCalcNumber(form.keyWidth);
    const h = toCalcNumber(form.keyHeight);
    const L = toCalcNumber(form.keyLength);
    requirePositive(d, "diametro albero d");
    requirePositive(Mt, "momento torcente Mt");
    requirePositive(b, "larghezza linguetta b");
    requirePositive(h, "altezza linguetta h");
    requirePositive(L, "lunghezza linguetta L");

    const Ft = 2 * Mt / d;
    const tau = Ft / (b * L);
    const pressure = Ft / ((h / 2) * L);
    const tauAllow = yieldStrength > 0 ? 0.58 * yieldStrength : 0;
    const pressureAllow = yieldStrength;
    const nTau = tauAllow > 0 ? tauAllow / tau : undefined;
    const nPressure = pressureAllow > 0 ? pressureAllow / pressure : undefined;
    safetyFactor = Math.min(nTau || Infinity, nPressure || Infinity);
    if (!Number.isFinite(safetyFactor)) safetyFactor = undefined;
    outcome = safetyFactor ? makeOutcome(safetyFactor, requiredSafety) : "DA VERIFICARE";

    title = "Linguetta";
    component = `Linguetta ${formatCalcNumber(b)}×${formatCalcNumber(h)}×${formatCalcNumber(L)} mm`;
    mainValue = Math.max(tau, pressure);
    secondaryValue = safetyFactor;
    formulas.push("Ft = 2 · Mt / d", "τ = Ft / (b · L)", "p = Ft / ((h/2) · L)", "τamm ≈ 0,58 · Re");
    inputs.push(`Momento torcente Mt = ${formatCalcNumber(Mt)} Nmm`, `Diametro albero d = ${formatCalcNumber(d)} mm`, `b = ${formatCalcNumber(b)} mm`, `h = ${formatCalcNumber(h)} mm`, `L = ${formatCalcNumber(L)} mm`, `Re = ${formatCalcNumber(yieldStrength)} MPa`);
    results.push(`Forza tangenziale Ft = ${formatCalcNumber(Ft)} N`, `Taglio linguetta τ = ${formatCalcNumber(tau)} MPa`, `Schiacciamento p = ${formatCalcNumber(pressure)} MPa`);
    if (nTau) results.push(`n a taglio ≈ ${formatCalcNumber(nTau)}`);
    if (nPressure) results.push(`n a schiacciamento ≈ ${formatCalcNumber(nPressure)}`);
    notes.push("La verifica della linguetta è preliminare: controllare norma linguette, cava sull’albero e lunghezza utile reale.");
  }

  if (mode === "bolt") {
    const boltArea = toCalcNumber(form.boltArea);
    const boltCount = Math.max(1, Math.round(toCalcNumber(form.boltCount, 1)));
    requirePositive(boltArea, "area resistente vite Ares");

    const sigma = force / (boltCount * boltArea);
    const tau = shearForce / (boltCount * boltArea);
    const sigmaVm = Math.sqrt(sigma ** 2 + 3 * tau ** 2);

    safetyFactor = yieldStrength > 0 ? yieldStrength / sigmaVm : undefined;
    outcome = safetyFactor ? makeOutcome(safetyFactor, requiredSafety) : "DA VERIFICARE";
    title = "Bullone / vite";
    component = `${boltCount} viti, Ares ${formatCalcNumber(boltArea)} mm²`;
    mainValue = sigmaVm;
    secondaryValue = safetyFactor;
    formulas.push("Fvite = Ftot / n", "Tensione σ = Fvite / Ares", "τ = T / (n · Ares)", "σVM = √(σ² + 3τ²)", "n = Re / σVM");
    inputs.push(`Forza trazione totale F = ${formatCalcNumber(force)} N`, `Forza taglio totale T = ${formatCalcNumber(shearForce)} N`, `Numero viti = ${boltCount}`, `Area resistente Ares = ${formatCalcNumber(boltArea)} mm²`, `Re/classe usata = ${formatCalcNumber(yieldStrength)} MPa`);
    results.push(`Tensione normale σ = ${formatCalcNumber(sigma)} MPa`, `Tensione tangenziale τ = ${formatCalcNumber(tau)} MPa`, `Von Mises σVM = ${formatCalcNumber(sigmaVm)} MPa`);
    if (safetyFactor) results.push(`Coefficiente sicurezza n = ${formatCalcNumber(safetyFactor)}`);
    notes.push("Per viti reali considerare precarico, attrito, classe vite, filettatura impegnata e ripartizione non uniforme del carico.");
  }

  if (mode === "weld") {
    const weldLength = toCalcNumber(form.weldLength);
    const throat = toCalcNumber(form.weldThroat);
    requirePositive(weldLength, "lunghezza cordone L");
    requirePositive(throat, "gola efficace a");

    const A = weldLength * throat;
    const sigma = force / A;
    const tau = shearForce / A;
    const sigmaVm = Math.sqrt(sigma ** 2 + 3 * tau ** 2);
    const allow = yieldStrength > 0 ? 0.45 * yieldStrength : 0;

    safetyFactor = allow > 0 ? allow / sigmaVm : undefined;
    outcome = safetyFactor ? makeOutcome(safetyFactor, requiredSafety) : "DA VERIFICARE";
    title = "Saldatura a cordone";
    component = `Cordone L ${formatCalcNumber(weldLength)} mm, a ${formatCalcNumber(throat)} mm`;
    mainValue = sigmaVm;
    secondaryValue = safetyFactor;
    formulas.push("A = a · L", "σ = F / A", "τ = T / A", "σVM = √(σ² + 3τ²)", "σamm indicativa ≈ 0,45 · Re");
    inputs.push(`Lunghezza cordone L = ${formatCalcNumber(weldLength)} mm`, `Gola efficace a = ${formatCalcNumber(throat)} mm`, `Forza normale F = ${formatCalcNumber(force)} N`, `Forza tangenziale T = ${formatCalcNumber(shearForce)} N`, `Re/Rm indicativo = ${formatCalcNumber(yieldStrength)} MPa`);
    results.push(`Area gola efficace A = ${formatCalcNumber(A)} mm²`, `Tensione normale σ = ${formatCalcNumber(sigma)} MPa`, `Tensione tangenziale τ = ${formatCalcNumber(tau)} MPa`, `Von Mises σVM = ${formatCalcNumber(sigmaVm)} MPa`);
    if (safetyFactor) results.push(`Coefficiente sicurezza indicativo n = ${formatCalcNumber(safetyFactor)}`);
    notes.push("Verifica molto semplificata. Per saldature reali usare normativa, tipo giunto, direzione carico, qualità cordone e coefficienti adeguati.");
  }

  if (mode === "pressure_vessel") {
    const pBar = toCalcNumber(form.pressure);
    const r = toCalcNumber(form.radius);
    const s = toCalcNumber(form.thickness);
    requirePositive(pBar, "pressione p");
    requirePositive(r, "raggio medio r");
    requirePositive(s, "spessore s");

    const p = pBar * 0.1;
    const sigmaCirc = p * r / s;
    const sigmaLong = p * r / (2 * s);
    const sigmaVm = Math.sqrt(sigmaCirc ** 2 - sigmaCirc * sigmaLong + sigmaLong ** 2);
    const sMin = yieldStrength > 0 ? p * r * requiredSafety / yieldStrength : 0;

    safetyFactor = yieldStrength > 0 ? yieldStrength / sigmaVm : undefined;
    outcome = safetyFactor ? makeOutcome(safetyFactor, requiredSafety) : "DA VERIFICARE";
    title = "Recipiente cilindrico in pressione";
    component = `p ${formatCalcNumber(pBar)} bar, r ${formatCalcNumber(r)} mm, s ${formatCalcNumber(s)} mm`;
    mainValue = sigmaVm;
    secondaryValue = sMin || safetyFactor;
    formulas.push("p[MPa] = p[bar] · 0,1", "σc = p · r / s", "σl = p · r / (2s)", "σVM = √(σc² - σcσl + σl²)", "smin ≈ p · r · n / Re");
    inputs.push(`Pressione p = ${formatCalcNumber(pBar)} bar = ${formatCalcNumber(p)} MPa`, `Raggio medio r = ${formatCalcNumber(r)} mm`, `Spessore s = ${formatCalcNumber(s)} mm`, `Re = ${formatCalcNumber(yieldStrength)} MPa`, `n richiesto = ${formatCalcNumber(requiredSafety)}`);
    results.push(`Tensione circonferenziale σc = ${formatCalcNumber(sigmaCirc)} MPa`, `Tensione longitudinale σl = ${formatCalcNumber(sigmaLong)} MPa`, `Von Mises σVM = ${formatCalcNumber(sigmaVm)} MPa`);
    if (safetyFactor) results.push(`Coefficiente sicurezza n = ${formatCalcNumber(safetyFactor)}`);
    if (sMin > 0) results.push(`Spessore minimo indicativo smin = ${formatCalcNumber(sMin)} mm`);
    notes.push("Formula valida come stima per parete sottile. Per recipienti reali considerare fondi, saldature, aperture e normativa applicabile.");
  }

  if (mode === "mass_from_volume") {
    const volumeCm3 = toCalcNumber(form.volumeCm3);
    requirePositive(volumeCm3, "volume V");
    requirePositive(density, "densità ρ");

    const massKg = volumeCm3 * density / 1000;
    title = "Massa da volume";
    component = `Volume ${formatCalcNumber(volumeCm3)} cm³`;
    mainValue = massKg;
    formulas.push("m[kg] = V[cm³] · ρ[g/cm³] / 1000");
    inputs.push(`Volume V = ${formatCalcNumber(volumeCm3)} cm³`, `Densità ρ = ${formatCalcNumber(density)} g/cm³`);
    results.push(`Massa m = ${formatCalcNumber(massKg, 4)} kg`, `Massa m = ${formatCalcNumber(massKg * 1000)} g`);
    notes.push("Calcolo puramente geometrico: non considera lavorazioni, fori non modellati o sovrametalli.");
  }

  if (results.length === 0) {
    throw new Error("Tipo di calcolo non riconosciuto.");
  }

  return {
    title: form.title.trim() || title,
    mode,
    component,
    formulas,
    inputs,
    results,
    notes,
    mainValue,
    secondaryValue,
    safetyFactor,
    outcome,
  };
}
