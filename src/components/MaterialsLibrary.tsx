import React, { useMemo, useState } from "react";
import { MATERIALS_DB, MaterialInfo } from "../data/materials";

type Theme = {
  name: string;
  primary: string;
  bg: string;
  surface: string;
  text: string;
  border: string;
};

type MaterialCategory =
  | "Tutti"
  | "Acciai"
  | "Inox"
  | "Alluminio"
  | "Ghise"
  | "Rame / Ottone / Bronzo"
  | "Polimeri"
  | "Gomme"
  | "Compositi / Ceramici"
  | "Speciali";

type MaterialsLibraryProps = {
  theme?: Theme;
  isDark?: boolean;
  onUseMaterial?: (material: MaterialInfo) => void;
};

const CUSTOM_MATERIALS_KEY = "techai_custom_materials_library_v1";

const EMPTY_MATERIAL: MaterialInfo = {
  key: "",
  name: "",
  en: "",
  uni: "",
  din: "",
  aisi: "",
  jis: "",
  iso: "",
  rm: 0,
  re: 0,
  hardness: "",
  treatments: "",
  weldability: "",
  machinability: "",
  uses: "",
  notes: "Materiale aggiunto dall'utente. Verificare sempre i dati prima di usarlo in calcoli reali.",
};

function loadCustomMaterials(): MaterialInfo[] {
  try {
    const saved = localStorage.getItem(CUSTOM_MATERIALS_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCustomMaterials(materials: MaterialInfo[]) {
  try {
    localStorage.setItem(CUSTOM_MATERIALS_KEY, JSON.stringify(materials));
  } catch {
    // localStorage non disponibile
  }
}

function normalizeMaterialKey(value?: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "")
    .replaceAll("-", "")
    .replaceAll("_", "")
    .replace(/[^a-z0-9]/g, "");
}

function getMaterialCategory(material: MaterialInfo): MaterialCategory {
  const text = `${material.name} ${material.en} ${material.uni} ${material.din} ${material.aisi} ${material.iso} ${material.notes} ${material.uses}`.toLowerCase();

  if (
    text.includes("aisi 304") ||
    text.includes("aisi 316") ||
    text.includes("inox") ||
    text.includes("stainless") ||
    text.includes("aisi 303") ||
    text.includes("aisi 420") ||
    text.includes("440c")
  ) {
    return "Inox";
  }

  if (
    text.includes("alluminio") ||
    text.includes("aluminium") ||
    text.includes("aluminum") ||
    text.includes("6082") ||
    text.includes("6061") ||
    text.includes("7075") ||
    text.includes("2011") ||
    text.includes("7020") ||
    text.includes("en aw")
  ) {
    return "Alluminio";
  }

  if (
    text.includes("ghisa") ||
    text.includes("gjl") ||
    text.includes("gjs") ||
    text.includes("cast iron")
  ) {
    return "Ghise";
  }

  if (
    text.includes("ottone") ||
    text.includes("bronzo") ||
    text.includes("rame") ||
    text.includes("cw614n") ||
    text.includes("brass") ||
    text.includes("copper")
  ) {
    return "Rame / Ottone / Bronzo";
  }

  if (
    text.includes("ptfe") ||
    text.includes("pom") ||
    text.includes("nylon") ||
    text.includes("pvc") ||
    text.includes("pmma") ||
    text.includes("policarbonato") ||
    text.includes("abs") ||
    text.includes("uhmw") ||
    text.includes("poliuretano")
  ) {
    return "Polimeri";
  }

  if (
    text.includes("gomma") ||
    text.includes("viton") ||
    text.includes("hnbr") ||
    text.includes("elastomero") ||
    text.includes("rubber")
  ) {
    return "Gomme";
  }

  if (
    text.includes("cfrp") ||
    text.includes("carbonio") ||
    text.includes("vetro") ||
    text.includes("ceram") ||
    text.includes("nitruro")
  ) {
    return "Compositi / Ceramici";
  }

  if (
    text.includes("titanio") ||
    text.includes("argento") ||
    text.includes("oro") ||
    text.includes("piombo") ||
    text.includes("monel") ||
    text.includes("nichel") ||
    text.includes("11smnpb37") ||
    text.includes("36smnpb14")
  ) {
    return "Speciali";
  }

  return "Acciai";
}

function getStrengthLabel(material: MaterialInfo) {
  const rm = Number(material.rm || 0);
  const re = Number(material.re || 0);

  if (!rm && !re) return "Dati indicativi";
  if (rm >= 900 || re >= 700) return "Alta resistenza";
  if (rm >= 600 || re >= 350) return "Media resistenza";
  return "Bassa / media resistenza";
}

function getStrengthPercent(material: MaterialInfo) {
  const rm = Number(material.rm || 0);
  if (!rm) return 12;

  return Math.min(Math.max((rm / 1200) * 100, 10), 100);
}

function safeValue(value: any) {
  if (value === undefined || value === null || value === "") return "—";
  return value;
}

export default function MaterialsLibrary({
  theme,
  isDark = false,
  onUseMaterial,
}: MaterialsLibraryProps) {
  const primary = theme?.primary || "#2563eb";

  const c = {
    primary,
    pageBg: isDark
      ? "radial-gradient(circle at top left, rgba(96,165,250,0.08), transparent 30%), #050505"
      : "radial-gradient(circle at top left, rgba(59,130,246,0.12), transparent 30%), #f8fafc",
    cardBg: isDark ? "#0b0b0b" : "#ffffff",
    cardBg2: isDark ? "#111111" : "#f8fafc",
    toolbarBg: isDark ? "rgba(17,17,17,0.92)" : "rgba(255,255,255,0.85)",
    text: isDark ? "#f8fafc" : "#0f172a",
    muted: isDark ? "#94a3b8" : "#64748b",
    border: theme?.border || (isDark ? "#262626" : "#e2e8f0"),
    inputBg: isDark ? "#050505" : "#f8fafc",
    chipBg: isDark ? "rgba(96,165,250,0.10)" : "#eff6ff",
    warningBg: isDark ? "rgba(245,158,11,0.10)" : "#fffbeb",
    warningBorder: isDark ? "rgba(245,158,11,0.30)" : "#fde68a",
    warningText: isDark ? "#fbbf24" : "#92400e",
  };

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<MaterialCategory>("Tutti");
  const [customMaterials, setCustomMaterials] = useState<MaterialInfo[]>(() => loadCustomMaterials());
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialInfo | null>(
    MATERIALS_DB[0] ?? null
  );
  const [compareA, setCompareA] = useState<MaterialInfo | null>(null);
  const [compareB, setCompareB] = useState<MaterialInfo | null>(null);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [newMaterial, setNewMaterial] = useState<MaterialInfo>(EMPTY_MATERIAL);

  const allMaterials = useMemo(
    () => [...MATERIALS_DB, ...customMaterials],
    [customMaterials]
  );

  const categories: MaterialCategory[] = [
    "Tutti",
    "Acciai",
    "Inox",
    "Alluminio",
    "Ghise",
    "Rame / Ottone / Bronzo",
    "Polimeri",
    "Gomme",
    "Compositi / Ceramici",
    "Speciali",
  ];

  const filteredMaterials = useMemo(() => {
    const q = search.trim().toLowerCase();

    return allMaterials.filter((material) => {
      const materialCategory = getMaterialCategory(material);

      const text = `
        ${material.name}
        ${material.en}
        ${material.uni}
        ${material.din}
        ${material.aisi}
        ${material.jis}
        ${material.iso}
        ${material.rm}
        ${material.re}
        ${material.hardness}
        ${material.treatments}
        ${material.weldability}
        ${material.machinability}
        ${material.uses}
        ${material.notes}
      `.toLowerCase();

      const matchesSearch = !q || text.includes(q);
      const matchesCategory = category === "Tutti" || materialCategory === category;

      return matchesSearch && matchesCategory;
    });
  }, [search, category, allMaterials]);

  function updateNewMaterialField(field: keyof MaterialInfo, value: string) {
    setNewMaterial((prev) => ({
      ...prev,
      [field]: field === "rm" || field === "re" ? Number(value.replace(",", ".")) || 0 : value,
    }));
  }

  function addCustomMaterial() {
    const materialName = newMaterial.name.trim();

    if (!materialName) {
      alert("Inserisci almeno il nome del materiale.");
      return;
    }

    const generatedKey = normalizeMaterialKey(newMaterial.key || materialName);

    const exists = allMaterials.some(
      (m) =>
        normalizeMaterialKey(m.key) === generatedKey ||
        normalizeMaterialKey(m.name) === normalizeMaterialKey(materialName)
    );

    if (exists) {
      alert("Questo materiale sembra già presente nella libreria.");
      return;
    }

    const materialToSave: MaterialInfo = {
      ...newMaterial,
      key: generatedKey,
      name: materialName,
      en: newMaterial.en || "Non specificato",
      uni: newMaterial.uni || "Non specificato",
      din: newMaterial.din || "Non specificato",
      aisi: newMaterial.aisi || "Non specificato",
      jis: newMaterial.jis || "Non specificato",
      iso: newMaterial.iso || "Non specificato",
      rm: newMaterial.rm || 0,
      re: newMaterial.re || 0,
      hardness: newMaterial.hardness || "Non specificato",
      treatments: newMaterial.treatments || "Non specificato",
      weldability: newMaterial.weldability || "Non specificato",
      machinability: newMaterial.machinability || "Non specificato",
      uses: newMaterial.uses || "Non specificato",
      notes:
        newMaterial.notes ||
        "Materiale aggiunto dall'utente. Verificare sempre i dati prima di usarlo in calcoli reali.",
    };

    const updated = [...customMaterials, materialToSave];
    setCustomMaterials(updated);
    saveCustomMaterials(updated);

    setSelectedMaterial(materialToSave);
    setNewMaterial(EMPTY_MATERIAL);
    setShowAddMaterial(false);
    setSearch(materialName);
  }

  function deleteCustomMaterial(key: string) {
    const updated = customMaterials.filter((material) => material.key !== key);
    setCustomMaterials(updated);
    saveCustomMaterials(updated);

    if (selectedMaterial?.key === key) {
      setSelectedMaterial(MATERIALS_DB[0] ?? null);
    }

    if (compareA?.key === key) setCompareA(null);
    if (compareB?.key === key) setCompareB(null);
  }

  return (
    <div style={{ ...styles.page, background: c.pageBg, color: c.text }}>
      <div style={styles.header}>
        <div>
          <p style={{ ...styles.kicker, color: c.primary }}>Database tecnico</p>
          <h1 style={{ ...styles.title, color: c.text }}>Libreria materiali</h1>
          <p style={{ ...styles.subtitle, color: c.muted }}>
            Cerca, confronta e seleziona materiali per componenti meccanici,
            tavole, relazioni e progetti.
          </p>
        </div>

        <button
          type="button"
          style={{ ...styles.addTopButton, background: c.primary }}
          onClick={() => setShowAddMaterial((prev) => !prev)}
        >
          {showAddMaterial ? "Chiudi inserimento" : "+ Aggiungi materiale"}
        </button>
      </div>

      {showAddMaterial && (
        <div style={{ ...styles.addPanel, background: c.cardBg, border: `1px solid ${c.border}` }}>
          <div style={styles.addPanelHeader}>
            <div>
              <p style={{ ...styles.kicker, color: c.primary }}>Materiale personalizzato</p>
              <h2 style={{ ...styles.addPanelTitle, color: c.text }}>Nuovo materiale</h2>
            </div>
            <button
              type="button"
              style={{
                ...styles.smallCloseButton,
                background: c.cardBg2,
                border: `1px solid ${c.border}`,
                color: c.text,
              }}
              onClick={() => setShowAddMaterial(false)}
            >
              ×
            </button>
          </div>

          <div style={styles.addGrid}>
            {(["name", "key", "en", "uni", "din", "aisi", "jis", "iso", "rm", "re"] as (keyof MaterialInfo)[]).map((field) => (
              <div key={String(field)}>
                <label style={{ ...styles.formLabel, color: c.muted }}>{String(field).toUpperCase()}</label>
                <input
                  style={{
                    ...styles.formInput,
                    background: c.inputBg,
                    border: `1px solid ${c.border}`,
                    color: c.text,
                  }}
                  value={(newMaterial as any)[field] || ""}
                  onChange={(e) => updateNewMaterialField(field, e.target.value)}
                  placeholder={
                    field === "name"
                      ? "Es. 36SMnPb14"
                      : field === "rm"
                        ? "Es. 510"
                        : field === "re"
                          ? "Es. 390"
                          : ""
                  }
                />
              </div>
            ))}
          </div>

          <div style={styles.addGrid}>
            {(["hardness", "treatments", "weldability", "machinability", "uses"] as (keyof MaterialInfo)[]).map((field) => (
              <div key={String(field)}>
                <label style={{ ...styles.formLabel, color: c.muted }}>{String(field)}</label>
                <input
                  style={{
                    ...styles.formInput,
                    background: c.inputBg,
                    border: `1px solid ${c.border}`,
                    color: c.text,
                  }}
                  value={(newMaterial as any)[field] || ""}
                  onChange={(e) => updateNewMaterialField(field, e.target.value)}
                />
              </div>
            ))}
          </div>

          <label style={{ ...styles.formLabel, color: c.muted }}>Note</label>
          <textarea
            style={{
              ...styles.formTextarea,
              background: c.inputBg,
              border: `1px solid ${c.border}`,
              color: c.text,
            }}
            value={newMaterial.notes}
            onChange={(e) => updateNewMaterialField("notes", e.target.value)}
          />

          <button type="button" style={{ ...styles.saveMaterialButton, background: c.primary }} onClick={addCustomMaterial}>
            Salva materiale
          </button>
        </div>
      )}

      <div style={{ ...styles.toolbar, background: c.toolbarBg, border: `1px solid ${c.border}` }}>
        <div style={{ ...styles.searchBox, background: c.inputBg, border: `1px solid ${c.border}` }}>
          <span style={{ ...styles.searchIcon, color: c.primary }}>⌕</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca materiale, norma, uso, trattamento..."
            style={{ ...styles.searchInput, color: c.text }}
          />
        </div>

        <div style={styles.filters}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                ...styles.filterButton,
                background: category === cat ? c.primary : c.cardBg,
                border: `1px solid ${category === cat ? c.primary : c.border}`,
                color: category === cat ? "#ffffff" : c.text,
                boxShadow: category === cat ? `0 10px 24px ${c.primary}33` : "none",
              }}
              type="button"
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.layout}>
        <div style={styles.materialList}>
          <div style={styles.sectionHeader}>
            <h2 style={{ ...styles.sectionTitle, color: c.text }}>Materiali trovati</h2>
            <span style={{ ...styles.resultCount, color: c.muted }}>{filteredMaterials.length} risultati</span>
          </div>

          <div style={styles.cardsGrid}>
            {filteredMaterials.map((material) => {
              const materialCategory = getMaterialCategory(material);
              const isSelected = selectedMaterial?.key === material.key;
              const isCustom = customMaterials.some((item) => item.key === material.key);

              return (
                <button
                  key={material.key}
                  onClick={() => setSelectedMaterial(material)}
                  style={{
                    ...styles.materialCard,
                    background: c.cardBg,
                    border: `1px solid ${isSelected ? c.primary : c.border}`,
                    boxShadow: isSelected ? `0 18px 46px ${c.primary}24` : "0 10px 28px rgba(0,0,0,0.14)",
                    transform: isSelected ? "translateY(-2px)" : "none",
                  }}
                  type="button"
                >
                  <div style={styles.cardTop}>
                    <div>
                      <h3 style={{ ...styles.materialName, color: c.text }}>{material.name}</h3>
                      <p style={{ ...styles.materialCode, color: c.muted }}>{safeValue(material.en)}</p>
                    </div>

                    <span
                      style={{
                        ...styles.categoryBadge,
                        background: c.chipBg,
                        color: c.primary,
                      }}
                    >
                      {isCustom ? "Custom" : materialCategory}
                    </span>
                  </div>

                  <div style={styles.miniDataGrid}>
                    <div style={{ ...styles.miniData, background: c.cardBg2, border: `1px solid ${c.border}` }}>
                      <span style={{ ...styles.miniLabel, color: c.muted }}>Rm</span>
                      <strong style={{ ...styles.miniValue, color: c.text }}>{safeValue(material.rm)} MPa</strong>
                    </div>

                    <div style={{ ...styles.miniData, background: c.cardBg2, border: `1px solid ${c.border}` }}>
                      <span style={{ ...styles.miniLabel, color: c.muted }}>Re</span>
                      <strong style={{ ...styles.miniValue, color: c.text }}>{safeValue(material.re)} MPa</strong>
                    </div>
                  </div>

                  <div style={{ ...styles.strengthBarOuter, background: isDark ? "#262626" : "#e2e8f0" }}>
                    <div
                      style={{
                        ...styles.strengthBarInner,
                        background: `linear-gradient(90deg, ${c.primary}88, ${c.primary})`,
                        width: `${getStrengthPercent(material)}%`,
                      }}
                    />
                  </div>

                  <p style={{ ...styles.cardNote, color: c.muted }}>
                    {material.uses || material.notes || "Materiale tecnico per progettazione."}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <aside style={{ ...styles.detailPanel, background: c.cardBg, border: `1px solid ${c.border}` }}>
          {selectedMaterial ? (
            <>
              <div style={styles.detailHeader}>
                <div>
                  <p style={{ ...styles.kicker, color: c.primary }}>Scheda materiale</p>
                  <h2 style={{ ...styles.detailTitle, color: c.text }}>{selectedMaterial.name}</h2>
                  <p style={{ ...styles.detailSubtitle, color: c.muted }}>
                    {getStrengthLabel(selectedMaterial)}
                  </p>
                </div>

                <span
                  style={{
                    ...styles.detailCategory,
                    background: c.chipBg,
                    color: c.primary,
                  }}
                >
                  {customMaterials.some((item) => item.key === selectedMaterial.key)
                    ? "Custom"
                    : getMaterialCategory(selectedMaterial)}
                </span>
              </div>

              <div style={styles.actionRow}>
                <button
                  style={{ ...styles.primaryButton, background: c.primary }}
                  onClick={() => onUseMaterial?.(selectedMaterial)}
                  type="button"
                >
                  Usa questo materiale
                </button>

                <button
                  style={{
                    ...styles.secondaryButton,
                    background: c.cardBg2,
                    border: `1px solid ${c.border}`,
                    color: c.text,
                  }}
                  onClick={() => setCompareA(selectedMaterial)}
                  type="button"
                >
                  Confronta A
                </button>

                <button
                  style={{
                    ...styles.secondaryButton,
                    background: c.cardBg2,
                    border: `1px solid ${c.border}`,
                    color: c.text,
                  }}
                  onClick={() => setCompareB(selectedMaterial)}
                  type="button"
                >
                  Confronta B
                </button>
              </div>

              {customMaterials.some((item) => item.key === selectedMaterial.key) && (
                <button
                  type="button"
                  style={styles.deleteMaterialButton}
                  onClick={() => deleteCustomMaterial(selectedMaterial.key)}
                >
                  Elimina materiale personalizzato
                </button>
              )}

              <div style={styles.detailGrid}>
                <Info c={c} label="EN" value={selectedMaterial.en} />
                <Info c={c} label="UNI" value={selectedMaterial.uni} />
                <Info c={c} label="DIN" value={selectedMaterial.din} />
                <Info c={c} label="AISI / SAE" value={selectedMaterial.aisi} />
                <Info c={c} label="JIS" value={selectedMaterial.jis} />
                <Info c={c} label="ISO" value={selectedMaterial.iso} />
                <Info c={c} label="Rm" value={`${safeValue(selectedMaterial.rm)} MPa`} />
                <Info c={c} label="Re" value={`${safeValue(selectedMaterial.re)} MPa`} />
              </div>

              <Block c={c} title="Durezza" value={selectedMaterial.hardness} />
              <Block c={c} title="Trattamenti" value={selectedMaterial.treatments} />
              <Block c={c} title="Saldabilità" value={selectedMaterial.weldability} />
              <Block c={c} title="Lavorabilità" value={selectedMaterial.machinability} />
              <Block c={c} title="Impieghi tipici" value={selectedMaterial.uses} />
              <Block c={c} title="Note" value={selectedMaterial.notes} />

              <div
                style={{
                  ...styles.warningBox,
                  background: c.warningBg,
                  border: `1px solid ${c.warningBorder}`,
                  color: c.warningText,
                }}
              >
                I valori sono indicativi: per calcoli definitivi verifica sempre
                scheda tecnica, certificato materiale e stato di fornitura.
              </div>
            </>
          ) : (
            <div style={{ ...styles.emptyState, color: c.muted }}>
              Seleziona un materiale per vedere la scheda tecnica.
            </div>
          )}
        </aside>
      </div>

      <div style={{ ...styles.comparePanel, background: c.cardBg, border: `1px solid ${c.border}` }}>
        <div style={styles.sectionHeader}>
          <h2 style={{ ...styles.sectionTitle, color: c.text }}>Confronto materiali</h2>
          <span style={{ ...styles.resultCount, color: c.muted }}>
            Seleziona “Confronta A” e “Confronta B”
          </span>
        </div>

        <div style={styles.compareGrid}>
          <CompareColumn c={c} title="Materiale A" material={compareA} />
          <CompareColumn c={c} title="Materiale B" material={compareB} />
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, c }: { label: string; value: any; c: any }) {
  return (
    <div style={{ ...styles.infoBox, background: c.cardBg2, border: `1px solid ${c.border}` }}>
      <span style={{ ...styles.infoLabel, color: c.muted }}>{label}</span>
      <strong style={{ ...styles.infoValue, color: c.text }}>{safeValue(value)}</strong>
    </div>
  );
}

function Block({ title, value, c }: { title: string; value: any; c: any }) {
  return (
    <div style={{ ...styles.block, background: c.cardBg2, border: `1px solid ${c.border}` }}>
      <h4 style={{ ...styles.blockTitle, color: c.text }}>{title}</h4>
      <p style={{ ...styles.blockText, color: c.muted }}>{safeValue(value)}</p>
    </div>
  );
}

function CompareColumn({
  title,
  material,
  c,
}: {
  title: string;
  material: MaterialInfo | null;
  c: any;
}) {
  if (!material) {
    return (
      <div style={{ ...styles.compareColumn, background: c.cardBg2, border: `1px solid ${c.border}` }}>
        <h3 style={{ ...styles.compareTitle, color: c.text }}>{title}</h3>
        <p style={{ ...styles.emptyCompare, color: c.muted }}>Nessun materiale selezionato.</p>
      </div>
    );
  }

  return (
    <div style={{ ...styles.compareColumn, background: c.cardBg2, border: `1px solid ${c.border}` }}>
      <h3 style={{ ...styles.compareTitle, color: c.text }}>{title}</h3>

      <div style={{ ...styles.compareMaterialHeader, background: c.cardBg, border: `1px solid ${c.border}`, color: c.text }}>
        <strong>{material.name}</strong>
        <span>{getMaterialCategory(material)}</span>
      </div>

      <Info c={c} label="EN" value={material.en} />
      <Info c={c} label="UNI" value={material.uni} />
      <Info c={c} label="Rm" value={`${safeValue(material.rm)} MPa`} />
      <Info c={c} label="Re" value={`${safeValue(material.re)} MPa`} />
      <Info c={c} label="Durezza" value={material.hardness} />
      <Info c={c} label="Lavorabilità" value={material.machinability} />
      <Info c={c} label="Saldabilità" value={material.weldability} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    width: "100%",
    minHeight: "100%",
    padding: 24,
    boxSizing: "border-box",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 24,
    alignItems: "flex-start",
    marginBottom: 22,
  },

  kicker: {
    margin: 0,
    marginBottom: 6,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.6,
    fontWeight: 900,
  },

  title: {
    margin: 0,
    fontSize: 34,
    lineHeight: 1.1,
    fontWeight: 900,
  },

  subtitle: {
    margin: "10px 0 0",
    maxWidth: 720,
    fontSize: 15,
    lineHeight: 1.6,
  },

  addTopButton: {
    flexShrink: 0,
    border: "none",
    color: "#ffffff",
    borderRadius: 16,
    padding: "13px 18px",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 12px 28px rgba(37,99,235,0.25)",
  },

  addPanel: {
    padding: 18,
    borderRadius: 24,
    boxShadow: "0 14px 40px rgba(0,0,0,0.12)",
    marginBottom: 22,
  },

  addPanelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 14,
  },

  addPanelTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 900,
  },

  smallCloseButton: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: 22,
    fontWeight: 900,
  },

  addGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
    marginBottom: 12,
  },

  formLabel: {
    display: "block",
    marginBottom: 6,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    fontWeight: 900,
  },

  formInput: {
    width: "100%",
    borderRadius: 14,
    padding: "11px 12px",
    outline: "none",
    fontSize: 14,
  },

  formTextarea: {
    width: "100%",
    minHeight: 84,
    borderRadius: 14,
    padding: "11px 12px",
    outline: "none",
    resize: "vertical",
    fontSize: 14,
  },

  saveMaterialButton: {
    marginTop: 12,
    border: "none",
    color: "#ffffff",
    borderRadius: 14,
    padding: "12px 16px",
    fontWeight: 900,
    cursor: "pointer",
  },

  toolbar: {
    padding: 16,
    borderRadius: 24,
    boxShadow: "0 14px 40px rgba(0,0,0,0.10)",
    marginBottom: 22,
  },

  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "0 14px",
    height: 48,
    borderRadius: 16,
    marginBottom: 14,
  },

  searchIcon: {
    fontSize: 22,
    fontWeight: 900,
  },

  searchInput: {
    width: "100%",
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 15,
  },

  filters: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },

  filterButton: {
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
  },

  layout: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 420px",
    gap: 22,
    alignItems: "start",
  },

  materialList: {
    minWidth: 0,
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "center",
    marginBottom: 14,
  },

  sectionTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 900,
  },

  resultCount: {
    fontSize: 13,
    fontWeight: 800,
  },

  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 14,
  },

  materialCard: {
    textAlign: "left",
    borderRadius: 22,
    padding: 16,
    cursor: "pointer",
    transition: "transform 0.15s ease, box-shadow 0.15s ease, border 0.15s ease",
  },

  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 12,
  },

  materialName: {
    margin: 0,
    fontSize: 18,
    fontWeight: 900,
  },

  materialCode: {
    margin: "4px 0 0",
    fontSize: 13,
    fontWeight: 800,
  },

  categoryBadge: {
    flexShrink: 0,
    padding: "5px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 900,
  },

  miniDataGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginBottom: 12,
  },

  miniData: {
    padding: 10,
    borderRadius: 14,
  },

  miniLabel: {
    display: "block",
    fontSize: 11,
    fontWeight: 900,
    marginBottom: 4,
  },

  miniValue: {
    display: "block",
    fontSize: 14,
  },

  strengthBarOuter: {
    width: "100%",
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 12,
  },

  strengthBarInner: {
    height: "100%",
    borderRadius: 999,
  },

  cardNote: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.45,
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },

  detailPanel: {
    position: "sticky",
    top: 20,
    padding: 18,
    borderRadius: 26,
    boxShadow: "0 18px 50px rgba(0,0,0,0.14)",
  },

  detailHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 14,
  },

  detailTitle: {
    margin: 0,
    fontSize: 26,
    lineHeight: 1.1,
    fontWeight: 900,
  },

  detailSubtitle: {
    margin: "8px 0 0",
    fontSize: 14,
    fontWeight: 800,
  },

  detailCategory: {
    padding: "7px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  actionRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 8,
    marginBottom: 12,
  },

  primaryButton: {
    border: "none",
    color: "#ffffff",
    borderRadius: 14,
    padding: "11px 12px",
    fontWeight: 900,
    cursor: "pointer",
  },

  secondaryButton: {
    borderRadius: 14,
    padding: "11px 12px",
    fontWeight: 900,
    cursor: "pointer",
  },

  deleteMaterialButton: {
    width: "100%",
    border: "1px solid #fecaca",
    background: "#fef2f2",
    color: "#dc2626",
    borderRadius: 14,
    padding: "10px 12px",
    fontWeight: 900,
    cursor: "pointer",
    marginBottom: 14,
  },

  detailGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    marginBottom: 12,
  },

  infoBox: {
    padding: 10,
    borderRadius: 14,
    minWidth: 0,
  },

  infoLabel: {
    display: "block",
    fontSize: 11,
    fontWeight: 900,
    marginBottom: 4,
  },

  infoValue: {
    display: "block",
    fontSize: 13,
    lineHeight: 1.35,
    wordBreak: "break-word",
  },

  block: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },

  blockTitle: {
    margin: "0 0 6px",
    fontSize: 13,
    fontWeight: 900,
  },

  blockText: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.5,
  },

  warningBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    fontSize: 13,
    lineHeight: 1.5,
    fontWeight: 800,
  },

  emptyState: {
    padding: 24,
    textAlign: "center",
    fontWeight: 800,
  },

  comparePanel: {
    marginTop: 22,
    padding: 18,
    borderRadius: 26,
    boxShadow: "0 14px 40px rgba(0,0,0,0.10)",
  },

  compareGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
  },

  compareColumn: {
    padding: 14,
    borderRadius: 20,
  },

  compareTitle: {
    margin: "0 0 12px",
    fontSize: 16,
    fontWeight: 900,
  },

  compareMaterialHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
  },

  emptyCompare: {
    margin: 0,
    fontSize: 14,
  },
};
