import React, { useEffect, useMemo, useState } from "react";
import { Modal, Field } from "./common/AppUiComponents";
import type {
  ComponentCalcForm,
  ComponentCalcMode,
  ComponentCalcResult,
  ProjectMemoryTab,
  ProjectRecord,
  ProjectSavedItem,
  Theme,
} from "../types/appTypes";
import {
  calculateComponent,
  COMPONENT_CALC_MODES,
  DEFAULT_COMPONENT_CALC_FORM,
} from "../utils/componentCalcUtils";

type Props = {
  theme: Theme;
  isDark: boolean;
  onClose: () => void;
  projects: ProjectRecord[];
  activeProject: ProjectRecord | null;
  addProjectItem: (item: Omit<ProjectSavedItem, "id" | "createdAt">, preferredProjectId?: string) => void;
  setProjectMemoryTab?: (tab: ProjectMemoryTab) => void;
};

const boxShadow = "0 18px 45px rgba(0,0,0,0.18)";

const localStyles: Record<string, React.CSSProperties> = {
  layout: {
    flex: 1,
    minHeight: 0,
    display: "grid",
    gridTemplateColumns: "minmax(390px, 0.95fr) minmax(430px, 1.05fr)",
    gap: 22,
    overflow: "hidden",
  },
  formArea: {
    overflowY: "auto",
    paddingRight: 6,
  },
  resultArea: {
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    paddingRight: 6,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: 800,
    color: "#94a3b8",
    textTransform: "uppercase",
    marginBottom: 8,
    display: "block",
  },
  select: {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    outline: "none",
    fontSize: 14,
  },
  comboWrap: {
    position: "relative",
    marginBottom: 14,
  },
  comboInput: {
    width: "100%",
    padding: "12px 42px 12px 12px",
    borderRadius: 12,
    outline: "none",
    fontSize: 14,
    fontWeight: 750,
  },
  comboArrow: {
    position: "absolute",
    right: 12,
    top: 12,
    pointerEvents: "none",
    fontSize: 16,
    opacity: 0.7,
  },
  comboDropdown: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "calc(100% + 6px)",
    zIndex: 40,
    borderRadius: 14,
    padding: 6,
    maxHeight: 260,
    overflowY: "auto",
    boxShadow: "0 18px 45px rgba(0,0,0,0.35)",
  },
  comboOption: {
    width: "100%",
    border: "none",
    borderRadius: 11,
    padding: "10px 11px",
    cursor: "pointer",
    textAlign: "left",
    display: "flex",
    flexDirection: "column",
    gap: 3,
    fontSize: 13,
    fontWeight: 850,
  },
  comboOptionDesc: {
    fontSize: 11,
    lineHeight: 1.35,
    opacity: 0.62,
    fontWeight: 650,
  },
  primaryBtn: {
    width: "100%",
    padding: 15,
    border: "none",
    borderRadius: 14,
    color: "white",
    fontWeight: 850,
    cursor: "pointer",
    fontSize: 15,
    marginTop: 8,
  },
  secondaryBtn: {
    width: "100%",
    padding: 13,
    borderRadius: 14,
    background: "transparent",
    fontWeight: 850,
    cursor: "pointer",
    marginTop: 10,
  },
  warningBox: {
    marginTop: 14,
    borderRadius: 14,
    padding: 12,
    fontSize: 12,
    lineHeight: 1.5,
    opacity: 0.78,
  },
  empty: {
    borderRadius: 18,
    minHeight: 160,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    opacity: 0.68,
    padding: 18,
    fontSize: 14,
  },
  resultShell: {
    borderRadius: 22,
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 16,
    boxShadow,
  },
  hero: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    paddingBottom: 14,
    borderBottom: "1px solid rgba(120,120,120,0.18)",
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: 950,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    opacity: 0.55,
    marginBottom: 6,
  },
  title: {
    margin: 0,
    fontSize: 20,
    lineHeight: 1.2,
    fontWeight: 950,
    letterSpacing: -0.4,
  },
  subtitle: {
    margin: "8px 0 0",
    fontSize: 13,
    lineHeight: 1.55,
    opacity: 0.72,
  },
  badge: {
    flexShrink: 0,
    minWidth: 92,
    minHeight: 38,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 950,
    letterSpacing: 0.4,
    padding: "8px 13px",
  },
  section: {
    borderRadius: 18,
    padding: 15,
  },
  sectionTitle: {
    margin: "0 0 12px",
    fontSize: 14,
    fontWeight: 950,
    letterSpacing: -0.2,
  },
  row: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    fontSize: 13,
    lineHeight: 1.45,
    fontWeight: 650,
    margin: "7px 0",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    marginTop: 7,
    flexShrink: 0,
  },
  formulaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 8,
  },
  formulaChip: {
    borderRadius: 13,
    padding: "10px 12px",
    fontSize: 13,
    lineHeight: 1.35,
    fontWeight: 800,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
};

function normalizeSearchText(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

const MODE_SEARCH_ALIASES: Record<ComponentCalcMode, string> = {
  solid_circular_section: "area diametro tondo cilindro pieno albero barra sezione modulo resistente inerzia volume massa",
  hollow_circular_section: "tubo boccola bronzina cava anello diametro interno esterno spessore area inerzia volume massa",
  solid_rectangular_section: "rettangolo piastra barra piatta braccio staffa base altezza area inerzia modulo resistente volume massa",
  hollow_rectangular_section: "tubolare quadro rettangolare scatolato profilo cavo base altezza area inerzia volume massa",
  pin: "perno spina cerniera braccio taglio doppio singolo pressione foro flessione",
  key: "linguetta chiavetta cava albero mozzo momento torcente taglio schiacciamento",
  bolt: "bullone vite viti dado tirante trazione taglio area resistente classe",
  weld: "saldatura cordone gola saldato angolo tensione normale tangenziale",
  pressure_vessel: "recipiente pressione spessore serbatoio tubo cilindro parete sottile circonferenziale longitudinale",
  mass_from_volume: "massa peso volume densita materiale kg grammi",
};

function SearchableModeSelect({
  value,
  onChange,
  theme,
  isDark,
}: {
  value: ComponentCalcMode;
  onChange: (value: ComponentCalcMode) => void;
  theme: Theme;
  isDark: boolean;
}) {
  const selected = COMPONENT_CALC_MODES.find((mode) => mode.value === value) || COMPONENT_CALC_MODES[0];
  const [search, setSearch] = useState(selected.label);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setSearch(selected.label);
  }, [selected.label]);

  const filteredModes = useMemo(() => {
    const q = normalizeSearchText(search);
    if (!q) return COMPONENT_CALC_MODES;

    return COMPONENT_CALC_MODES.filter((mode) => {
      const haystack = normalizeSearchText(`${mode.label} ${mode.description} ${MODE_SEARCH_ALIASES[mode.value] || ""}`);
      return haystack.includes(q);
    });
  }, [search]);

  const selectMode = (mode: (typeof COMPONENT_CALC_MODES)[number]) => {
    onChange(mode.value);
    setSearch(mode.label);
    setOpen(false);
  };

  return (
    <div style={localStyles.comboWrap}>
      <input
        style={{
          ...localStyles.comboInput,
          background: isDark ? "#050505" : "#fff",
          color: theme.text,
          border: `1px solid ${theme.border}`,
        }}
        value={search}
        placeholder="Scrivi: bullone, braccio, perno, area..."
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setSearch(event.target.value);
          setOpen(true);
        }}
        onBlur={() => {
          window.setTimeout(() => {
            setOpen(false);
            const exact = COMPONENT_CALC_MODES.find(
              (mode) => normalizeSearchText(mode.label) === normalizeSearchText(search)
            );
            if (!exact) setSearch(selected.label);
          }, 120);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && filteredModes[0]) {
            event.preventDefault();
            selectMode(filteredModes[0]);
          }
          if (event.key === "Escape") {
            setOpen(false);
            setSearch(selected.label);
          }
        }}
      />

      <span style={localStyles.comboArrow}>
        <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1L6 7L11 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>

      {open && (
        <div
          style={{
            ...localStyles.comboDropdown,
            background: isDark ? "#050505" : "#ffffff",
            border: `1px solid ${theme.border}`,
          }}
        >
          {filteredModes.length === 0 ? (
            <div style={{ padding: 12, fontSize: 12, opacity: 0.65 }}>
              Nessun calcolo trovato.
            </div>
          ) : (
            filteredModes.map((mode) => {
              const selectedOption = mode.value === value;

              return (
                <button
                  key={mode.value}
                  type="button"
                  style={{
                    ...localStyles.comboOption,
                    background: selectedOption ? `${theme.primary}22` : "transparent",
                    color: selectedOption ? theme.primary : theme.text,
                  }}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectMode(mode)}
                >
                  <span>{mode.label}</span>
                  <small style={localStyles.comboOptionDesc}>{mode.description}</small>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function ResultSection({ title, rows, theme, isDark }: { title: string; rows: string[]; theme: Theme; isDark: boolean }) {
  if (!rows.length) return null;

  return (
    <div
      style={{
        ...localStyles.section,
        background: isDark ? "#080808" : "#f8fafc",
        border: `1px solid ${theme.border}`,
      }}
    >
      <h4 style={{ ...localStyles.sectionTitle, color: theme.primary }}>{title}</h4>
      {rows.map((row, index) => (
        <div key={index} style={localStyles.row}>
          <span style={{ ...localStyles.dot, background: theme.primary }} />
          <span>{row}</span>
        </div>
      ))}
    </div>
  );
}

function ComponentCalcResultCard({ result, theme, isDark }: { result: ComponentCalcResult; theme: Theme; isDark: boolean }) {
  const outcomeColor =
    result.outcome === "OK"
      ? "#22c55e"
      : result.outcome === "NON OK"
        ? "#ef4444"
        : "#f59e0b";

  const outcomeBg =
    result.outcome === "OK"
      ? "rgba(34,197,94,0.12)"
      : result.outcome === "NON OK"
        ? "rgba(239,68,68,0.12)"
        : "rgba(245,158,11,0.12)";

  return (
    <div
      style={{
        ...localStyles.resultShell,
        background: isDark ? "#050505" : "#ffffff",
        border: `1px solid ${theme.border}`,
      }}
    >
      <div style={localStyles.hero}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={localStyles.eyebrow}>Risultato calcolo</div>
          <h3 style={localStyles.title}>{result.title}</h3>
          <p style={localStyles.subtitle}>{result.component}</p>
        </div>

        <div
          style={{
            ...localStyles.badge,
            background: outcomeBg,
            color: outcomeColor,
            border: `1px solid ${outcomeColor}`,
          }}
        >
          {result.outcome}
        </div>
      </div>

      <ResultSection title="Dati inseriti" rows={result.inputs} theme={theme} isDark={isDark} />
      <ResultSection title="Risultati" rows={result.results} theme={theme} isDark={isDark} />

      {result.formulas.length > 0 && (
        <div
          style={{
            ...localStyles.section,
            background: isDark ? "#0b0b0b" : "#f8fafc",
            border: `1px solid ${theme.border}`,
          }}
        >
          <h4 style={{ ...localStyles.sectionTitle, color: theme.primary }}>Formule usate</h4>
          <div style={localStyles.formulaGrid}>
            {result.formulas.map((formula, index) => (
              <div
                key={index}
                style={{
                  ...localStyles.formulaChip,
                  background: isDark ? "#050505" : "#ffffff",
                  border: `1px solid ${theme.border}`,
                }}
              >
                {formula}
              </div>
            ))}
          </div>
        </div>
      )}

      <ResultSection title="Note tecniche" rows={result.notes} theme={theme} isDark={isDark} />
    </div>
  );
}

export default function ComponentCalculatorModal({
  theme,
  isDark,
  onClose,
  projects,
  activeProject,
  addProjectItem,
  setProjectMemoryTab,
}: Props) {
  const [form, setForm] = useState<ComponentCalcForm>(DEFAULT_COMPONENT_CALC_FORM);
  const [result, setResult] = useState<ComponentCalcResult | null>(null);
  const [saveTitle, setSaveTitle] = useState("");
  const [targetProjectId, setTargetProjectId] = useState("");
  const [savedNotice, setSavedNotice] = useState("");

  const selectedModeInfo = useMemo(
    () => COMPONENT_CALC_MODES.find((mode) => mode.value === form.mode),
    [form.mode]
  );

  const inputStyle = {
    ...localStyles.select,
    background: isDark ? "#050505" : "#fff",
    color: theme.text,
    border: `1px solid ${theme.border}`,
  };

  const setField = (field: keyof ComponentCalcForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSavedNotice("");
  };

  const setMode = (mode: ComponentCalcMode) => {
    setForm((prev) => ({ ...prev, mode }));
    setResult(null);
    setSavedNotice("");
  };

  const runCalculation = () => {
    try {
      setResult(calculateComponent(form));
      setSavedNotice("");
    } catch (error: any) {
      setResult({
        title: "Errore nei dati inseriti",
        mode: form.mode,
        component: "Controlla i valori",
        formulas: [],
        inputs: [],
        results: [],
        notes: [error?.message || "Controlla i dati inseriti e riprova."],
        outcome: "NON OK",
      });
    }
  };

  const resetForm = () => {
    setForm(DEFAULT_COMPONENT_CALC_FORM);
    setResult(null);
    setSaveTitle("");
    setTargetProjectId("");
    setSavedNotice("");
  };

  const saveCalculationToProject = () => {
    if (!result) {
      alert("Prima esegui un calcolo, poi salvalo nel progetto.");
      return;
    }

    const destinationId = targetProjectId || activeProject?.id || undefined;
    const finalTitle = saveTitle.trim() || `Calcolo - ${result.title}`;

    addProjectItem(
      {
        type: "calculation",
        title: finalTitle,
        summary: `${result.component}. ${result.results.slice(0, 3).join(" · ")}`,
        payload: {
          form,
          result,
          savedTitle: finalTitle,
        },
      },
      destinationId
    );

    setProjectMemoryTab?.("Verifiche");
    setSavedNotice("Calcolo salvato nella sezione Verifiche del progetto.");
  };

  const showSectionGeometry = [
    "solid_circular_section",
    "hollow_circular_section",
    "solid_rectangular_section",
    "hollow_rectangular_section",
  ].includes(form.mode);

  const showLengthDensity = showSectionGeometry;

  return (
    <Modal
      title="Calcoli tecnici"
      subtitle="Area, spessori, sezioni, perni, linguette, viti, saldature, recipienti e massa."
      theme={theme}
      isDark={isDark}
      onClose={onClose}
      wide
    >
      <div style={localStyles.layout}>
        <div style={localStyles.formArea}>
          <div style={localStyles.grid}>
            <div>
              <label style={localStyles.label}>Tipo calcolo</label>
              <SearchableModeSelect
                value={form.mode}
                onChange={setMode}
                theme={theme}
                isDark={isDark}
              />
            </div>

            <Field label="Titolo calcolo" value={form.title} onChange={(value) => setField("title", value)} placeholder="Es. Perno cerniera superiore" theme={theme} isDark={isDark} />
          </div>

          {selectedModeInfo && (
            <div
              style={{
                ...localStyles.warningBox,
                background: isDark ? "rgba(96,165,250,0.08)" : "#eff6ff",
                border: `1px solid ${theme.border}`,
              }}
            >
              <strong style={{ color: theme.primary }}>{selectedModeInfo.label}</strong>
              <div style={{ marginTop: 4 }}>{selectedModeInfo.description}</div>
            </div>
          )}

          <h3 style={{ margin: "16px 0 12px", color: theme.primary }}>Dati generali</h3>
          <div style={localStyles.grid}>
            <Field label="Materiale / nota" value={form.material} onChange={(value) => setField("material", value)} placeholder="C45, S235JR..." theme={theme} isDark={isDark} />
            <Field label="Re / limite indicativo [MPa]" value={form.yieldStrength} onChange={(value) => setField("yieldStrength", value)} placeholder="300" theme={theme} isDark={isDark} />
            <Field label="n richiesto" value={form.safetyFactorRequired} onChange={(value) => setField("safetyFactorRequired", value)} placeholder="2" theme={theme} isDark={isDark} />
            {(showLengthDensity || form.mode === "mass_from_volume") && (
              <Field label="Densità ρ [g/cm³]" value={form.density} onChange={(value) => setField("density", value)} placeholder="7.85" theme={theme} isDark={isDark} />
            )}
          </div>

          {showLengthDensity && (
            <Field label="Lunghezza L [mm]" value={form.length} onChange={(value) => setField("length", value)} placeholder="100" theme={theme} isDark={isDark} />
          )}

          {(form.mode === "solid_circular_section" || form.mode === "pin" || form.mode === "key") && (
            <div style={localStyles.grid}>
              <Field label="Diametro d [mm]" value={form.diameter} onChange={(value) => setField("diameter", value)} placeholder="25" theme={theme} isDark={isDark} />
              {form.mode === "pin" && <Field label="Lunghezza contatto L [mm]" value={form.contactLength} onChange={(value) => setField("contactLength", value)} placeholder="30" theme={theme} isDark={isDark} />}
            </div>
          )}

          {form.mode === "hollow_circular_section" && (
            <div style={localStyles.grid}>
              <Field label="Diametro esterno D [mm]" value={form.outerDiameter} onChange={(value) => setField("outerDiameter", value)} placeholder="40" theme={theme} isDark={isDark} />
              <Field label="Diametro interno d [mm]" value={form.innerDiameter} onChange={(value) => setField("innerDiameter", value)} placeholder="25" theme={theme} isDark={isDark} />
            </div>
          )}

          {form.mode === "solid_rectangular_section" && (
            <div style={localStyles.grid}>
              <Field label="Base b [mm]" value={form.base} onChange={(value) => setField("base", value)} placeholder="30" theme={theme} isDark={isDark} />
              <Field label="Altezza h [mm]" value={form.height} onChange={(value) => setField("height", value)} placeholder="50" theme={theme} isDark={isDark} />
            </div>
          )}

          {form.mode === "hollow_rectangular_section" && (
            <div style={localStyles.grid}>
              <Field label="Base esterna B [mm]" value={form.outerBase} onChange={(value) => setField("outerBase", value)} placeholder="60" theme={theme} isDark={isDark} />
              <Field label="Altezza esterna H [mm]" value={form.outerHeight} onChange={(value) => setField("outerHeight", value)} placeholder="80" theme={theme} isDark={isDark} />
              <Field label="Base interna b [mm]" value={form.innerBase} onChange={(value) => setField("innerBase", value)} placeholder="40" theme={theme} isDark={isDark} />
              <Field label="Altezza interna h [mm]" value={form.innerHeight} onChange={(value) => setField("innerHeight", value)} placeholder="60" theme={theme} isDark={isDark} />
            </div>
          )}

          {form.mode === "pin" && (
            <>
              <h3 style={{ margin: "16px 0 12px", color: theme.primary }}>Dati perno</h3>
              <div style={localStyles.grid}>
                <Field label="Forza F [N]" value={form.force} onChange={(value) => setField("force", value)} placeholder="2500" theme={theme} isDark={isDark} />
                <Field label="Piani di taglio z" value={form.shearPlanes} onChange={(value) => setField("shearPlanes", value)} placeholder="1 oppure 2" theme={theme} isDark={isDark} />
              </div>
            </>
          )}

          {form.mode === "key" && (
            <>
              <h3 style={{ margin: "16px 0 12px", color: theme.primary }}>Dati linguetta</h3>
              <div style={localStyles.grid}>
                <Field label="Momento torcente Mt [Nmm]" value={form.torque} onChange={(value) => setField("torque", value)} placeholder="80000" theme={theme} isDark={isDark} />
                <Field label="Larghezza b [mm]" value={form.keyWidth} onChange={(value) => setField("keyWidth", value)} placeholder="8" theme={theme} isDark={isDark} />
                <Field label="Altezza h [mm]" value={form.keyHeight} onChange={(value) => setField("keyHeight", value)} placeholder="7" theme={theme} isDark={isDark} />
                <Field label="Lunghezza L [mm]" value={form.keyLength} onChange={(value) => setField("keyLength", value)} placeholder="40" theme={theme} isDark={isDark} />
              </div>
            </>
          )}

          {form.mode === "bolt" && (
            <>
              <h3 style={{ margin: "16px 0 12px", color: theme.primary }}>Dati vite / bullone</h3>
              <div style={localStyles.grid}>
                <Field label="Forza trazione totale F [N]" value={form.force} onChange={(value) => setField("force", value)} placeholder="2500" theme={theme} isDark={isDark} />
                <Field label="Forza taglio totale T [N]" value={form.shearForce} onChange={(value) => setField("shearForce", value)} placeholder="1500" theme={theme} isDark={isDark} />
                <Field label="Numero viti" value={form.boltCount} onChange={(value) => setField("boltCount", value)} placeholder="4" theme={theme} isDark={isDark} />
                <Field label="Area resistente Ares [mm²]" value={form.boltArea} onChange={(value) => setField("boltArea", value)} placeholder="58" theme={theme} isDark={isDark} />
              </div>
            </>
          )}

          {form.mode === "weld" && (
            <>
              <h3 style={{ margin: "16px 0 12px", color: theme.primary }}>Dati saldatura</h3>
              <div style={localStyles.grid}>
                <Field label="Forza normale F [N]" value={form.force} onChange={(value) => setField("force", value)} placeholder="2500" theme={theme} isDark={isDark} />
                <Field label="Forza tangenziale T [N]" value={form.shearForce} onChange={(value) => setField("shearForce", value)} placeholder="1500" theme={theme} isDark={isDark} />
                <Field label="Lunghezza cordone L [mm]" value={form.weldLength} onChange={(value) => setField("weldLength", value)} placeholder="80" theme={theme} isDark={isDark} />
                <Field label="Gola efficace a [mm]" value={form.weldThroat} onChange={(value) => setField("weldThroat", value)} placeholder="3" theme={theme} isDark={isDark} />
              </div>
            </>
          )}

          {form.mode === "pressure_vessel" && (
            <>
              <h3 style={{ margin: "16px 0 12px", color: theme.primary }}>Dati pressione</h3>
              <div style={localStyles.grid}>
                <Field label="Pressione p [bar]" value={form.pressure} onChange={(value) => setField("pressure", value)} placeholder="30" theme={theme} isDark={isDark} />
                <Field label="Raggio medio r [mm]" value={form.radius} onChange={(value) => setField("radius", value)} placeholder="150" theme={theme} isDark={isDark} />
                <Field label="Spessore s [mm]" value={form.thickness} onChange={(value) => setField("thickness", value)} placeholder="4" theme={theme} isDark={isDark} />
              </div>
            </>
          )}

          {form.mode === "mass_from_volume" && (
            <>
              <h3 style={{ margin: "16px 0 12px", color: theme.primary }}>Dati volume</h3>
              <Field label="Volume V [cm³]" value={form.volumeCm3} onChange={(value) => setField("volumeCm3", value)} placeholder="100" theme={theme} isDark={isDark} />
            </>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button type="button" style={{ ...localStyles.primaryBtn, background: theme.primary }} onClick={runCalculation}>
              Calcola
            </button>
            <button type="button" style={{ ...localStyles.secondaryBtn, color: theme.text, border: `1px solid ${theme.border}` }} onClick={resetForm}>
              Reset
            </button>
          </div>

          {result && (
            <div
              style={{
                ...localStyles.warningBox,
                background: isDark ? "#050505" : "#f8fafc",
                border: `1px solid ${theme.border}`,
              }}
            >
              <h3 style={{ margin: "0 0 12px", color: theme.primary }}>Salvataggio calcolo</h3>
              <Field label="Nome salvataggio" value={saveTitle} onChange={setSaveTitle} placeholder={`Es. ${result.title} - componente principale`} theme={theme} isDark={isDark} />

              <label style={localStyles.label}>Progetto destinazione</label>
              <select
                style={inputStyle}
                value={targetProjectId || activeProject?.id || ""}
                onChange={(event) => setTargetProjectId(event.target.value)}
              >
                {projects.length === 0 ? (
                  <option value="">Crea progetto automatico</option>
                ) : (
                  projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))
                )}
              </select>

              <button type="button" style={{ ...localStyles.secondaryBtn, color: theme.primary, border: `1px solid ${theme.border}` }} onClick={saveCalculationToProject}>
                Salva calcolo nel progetto
              </button>

              {savedNotice && <p style={{ margin: "10px 0 0", color: theme.primary, fontWeight: 800 }}>{savedNotice}</p>}
            </div>
          )}

          <div style={{ ...localStyles.warningBox, border: `1px solid ${theme.border}` }}>
            Calcolo preliminare. Per progetto reale controllare norme, coefficienti correttivi, intagli, fatica, saldature, vincoli e dati certificati del materiale.
          </div>
        </div>

        <div style={localStyles.resultArea}>
          {!result ? (
            <div style={{ ...localStyles.empty, border: `1px dashed ${theme.border}` }}>
              Scegli il componente, inserisci i dati e premi “Calcola”.
            </div>
          ) : (
            <ComponentCalcResultCard result={result} theme={theme} isDark={isDark} />
          )}
        </div>
      </div>
    </Modal>
  );
}
