import React, { useMemo, useState } from "react";
import { MATERIALS_DB, MaterialInfo } from "../data/materials";

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

export default function MaterialsLibrary({ onUseMaterial }: MaterialsLibraryProps) {
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
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <p style={styles.kicker}>Database tecnico</p>
          <h1 style={styles.title}>Libreria materiali</h1>
          <p style={styles.subtitle}>
            Cerca, confronta e seleziona materiali per componenti meccanici,
            tavole, relazioni e progetti.
          </p>
        </div>

        <button
          type="button"
          style={styles.addTopButton}
          onClick={() => setShowAddMaterial((prev) => !prev)}
        >
          {showAddMaterial ? "Chiudi inserimento" : "+ Aggiungi materiale"}
        </button>
      </div>

      {showAddMaterial && (
        <div style={styles.addPanel}>
          <div style={styles.addPanelHeader}>
            <div>
              <p style={styles.kicker}>Materiale personalizzato</p>
              <h2 style={styles.addPanelTitle}>Nuovo materiale</h2>
            </div>
            <button
              type="button"
              style={styles.smallCloseButton}
              onClick={() => setShowAddMaterial(false)}
            >
              ×
            </button>
          </div>

          <div style={styles.addGrid}>
            {(["name", "key", "en", "uni", "din", "aisi", "jis", "iso", "rm", "re"] as (keyof MaterialInfo)[]).map((field) => (
              <div key={String(field)}>
                <label style={styles.formLabel}>{String(field).toUpperCase()}</label>
                <input
                  style={styles.formInput}
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
                <label style={styles.formLabel}>{String(field)}</label>
                <input
                  style={styles.formInput}
                  value={(newMaterial as any)[field] || ""}
                  onChange={(e) => updateNewMaterialField(field, e.target.value)}
                />
              </div>
            ))}
          </div>

          <label style={styles.formLabel}>Note</label>
          <textarea
            style={styles.formTextarea}
            value={newMaterial.notes}
            onChange={(e) => updateNewMaterialField("notes", e.target.value)}
          />

          <button type="button" style={styles.saveMaterialButton} onClick={addCustomMaterial}>
            Salva materiale
          </button>
        </div>
      )}

      <div style={styles.toolbar}>
        <div style={styles.searchBox}>
          <span style={styles.searchIcon}>⌕</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca materiale, norma, uso, trattamento..."
            style={styles.searchInput}
          />
        </div>

        <div style={styles.filters}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                ...styles.filterButton,
                ...(category === cat ? styles.filterButtonActive : {}),
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
            <h2 style={styles.sectionTitle}>Materiali trovati</h2>
            <span style={styles.resultCount}>{filteredMaterials.length} risultati</span>
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
                    ...(isSelected ? styles.materialCardSelected : {}),
                  }}
                  type="button"
                >
                  <div style={styles.cardTop}>
                    <div>
                      <h3 style={styles.materialName}>{material.name}</h3>
                      <p style={styles.materialCode}>{safeValue(material.en)}</p>
                    </div>

                    <span style={styles.categoryBadge}>
                      {isCustom ? "Custom" : materialCategory}
                    </span>
                  </div>

                  <div style={styles.miniDataGrid}>
                    <div style={styles.miniData}>
                      <span style={styles.miniLabel}>Rm</span>
                      <strong style={styles.miniValue}>{safeValue(material.rm)} MPa</strong>
                    </div>

                    <div style={styles.miniData}>
                      <span style={styles.miniLabel}>Re</span>
                      <strong style={styles.miniValue}>{safeValue(material.re)} MPa</strong>
                    </div>
                  </div>

                  <div style={styles.strengthBarOuter}>
                    <div
                      style={{
                        ...styles.strengthBarInner,
                        width: `${getStrengthPercent(material)}%`,
                      }}
                    />
                  </div>

                  <p style={styles.cardNote}>
                    {material.uses || material.notes || "Materiale tecnico per progettazione."}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <aside style={styles.detailPanel}>
          {selectedMaterial ? (
            <>
              <div style={styles.detailHeader}>
                <div>
                  <p style={styles.kicker}>Scheda materiale</p>
                  <h2 style={styles.detailTitle}>{selectedMaterial.name}</h2>
                  <p style={styles.detailSubtitle}>
                    {getStrengthLabel(selectedMaterial)}
                  </p>
                </div>

                <span style={styles.detailCategory}>
                  {customMaterials.some((item) => item.key === selectedMaterial.key)
                    ? "Custom"
                    : getMaterialCategory(selectedMaterial)}
                </span>
              </div>

              <div style={styles.actionRow}>
                <button
                  style={styles.primaryButton}
                  onClick={() => onUseMaterial?.(selectedMaterial)}
                  type="button"
                >
                  Usa questo materiale
                </button>

                <button
                  style={styles.secondaryButton}
                  onClick={() => setCompareA(selectedMaterial)}
                  type="button"
                >
                  Confronta A
                </button>

                <button
                  style={styles.secondaryButton}
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
                <Info label="EN" value={selectedMaterial.en} />
                <Info label="UNI" value={selectedMaterial.uni} />
                <Info label="DIN" value={selectedMaterial.din} />
                <Info label="AISI / SAE" value={selectedMaterial.aisi} />
                <Info label="JIS" value={selectedMaterial.jis} />
                <Info label="ISO" value={selectedMaterial.iso} />
                <Info label="Rm" value={`${safeValue(selectedMaterial.rm)} MPa`} />
                <Info label="Re" value={`${safeValue(selectedMaterial.re)} MPa`} />
              </div>

              <Block title="Durezza" value={selectedMaterial.hardness} />
              <Block title="Trattamenti" value={selectedMaterial.treatments} />
              <Block title="Saldabilità" value={selectedMaterial.weldability} />
              <Block title="Lavorabilità" value={selectedMaterial.machinability} />
              <Block title="Impieghi tipici" value={selectedMaterial.uses} />
              <Block title="Note" value={selectedMaterial.notes} />

              <div style={styles.warningBox}>
                I valori sono indicativi: per calcoli definitivi verifica sempre
                scheda tecnica, certificato materiale e stato di fornitura.
              </div>
            </>
          ) : (
            <div style={styles.emptyState}>
              Seleziona un materiale per vedere la scheda tecnica.
            </div>
          )}
        </aside>
      </div>

      <div style={styles.comparePanel}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Confronto materiali</h2>
          <span style={styles.resultCount}>
            Seleziona “Confronta A” e “Confronta B”
          </span>
        </div>

        <div style={styles.compareGrid}>
          <CompareColumn title="Materiale A" material={compareA} />
          <CompareColumn title="Materiale B" material={compareB} />
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div style={styles.infoBox}>
      <span style={styles.infoLabel}>{label}</span>
      <strong style={styles.infoValue}>{safeValue(value)}</strong>
    </div>
  );
}

function Block({ title, value }: { title: string; value: any }) {
  return (
    <div style={styles.block}>
      <h4 style={styles.blockTitle}>{title}</h4>
      <p style={styles.blockText}>{safeValue(value)}</p>
    </div>
  );
}

function CompareColumn({
  title,
  material,
}: {
  title: string;
  material: MaterialInfo | null;
}) {
  if (!material) {
    return (
      <div style={styles.compareColumn}>
        <h3 style={styles.compareTitle}>{title}</h3>
        <p style={styles.emptyCompare}>Nessun materiale selezionato.</p>
      </div>
    );
  }

  return (
    <div style={styles.compareColumn}>
      <h3 style={styles.compareTitle}>{title}</h3>

      <div style={styles.compareMaterialHeader}>
        <strong>{material.name}</strong>
        <span>{getMaterialCategory(material)}</span>
      </div>

      <Info label="EN" value={material.en} />
      <Info label="UNI" value={material.uni} />
      <Info label="Rm" value={`${safeValue(material.rm)} MPa`} />
      <Info label="Re" value={`${safeValue(material.re)} MPa`} />
      <Info label="Durezza" value={material.hardness} />
      <Info label="Lavorabilità" value={material.machinability} />
      <Info label="Saldabilità" value={material.weldability} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    width: "100%",
    minHeight: "100%",
    padding: 24,
    boxSizing: "border-box",
    color: "#0f172a",
    background:
      "radial-gradient(circle at top left, rgba(59,130,246,0.12), transparent 30%), #f8fafc",
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
    color: "#2563eb",
  },

  title: {
    margin: 0,
    fontSize: 34,
    lineHeight: 1.1,
    fontWeight: 900,
    color: "#0f172a",
  },

  subtitle: {
    margin: "10px 0 0",
    maxWidth: 720,
    fontSize: 15,
    lineHeight: 1.6,
    color: "#475569",
  },

  addTopButton: {
    flexShrink: 0,
    border: "none",
    background: "#2563eb",
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
    background: "#ffffff",
    border: "1px solid #dbe3ee",
    boxShadow: "0 14px 40px rgba(15,23,42,0.08)",
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
    color: "#0f172a",
  },

  smallCloseButton: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    cursor: "pointer",
    fontSize: 22,
    fontWeight: 900,
    color: "#0f172a",
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
    color: "#64748b",
  },

  formInput: {
    width: "100%",
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    color: "#0f172a",
    borderRadius: 14,
    padding: "11px 12px",
    outline: "none",
    fontSize: 14,
  },

  formTextarea: {
    width: "100%",
    minHeight: 84,
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    color: "#0f172a",
    borderRadius: 14,
    padding: "11px 12px",
    outline: "none",
    resize: "vertical",
    fontSize: 14,
  },

  saveMaterialButton: {
    marginTop: 12,
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    borderRadius: 14,
    padding: "12px 16px",
    fontWeight: 900,
    cursor: "pointer",
  },

  toolbar: {
    padding: 16,
    background: "rgba(255,255,255,0.85)",
    border: "1px solid #e2e8f0",
    borderRadius: 24,
    boxShadow: "0 14px 40px rgba(15,23,42,0.06)",
    marginBottom: 22,
  },

  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "0 14px",
    height: 48,
    borderRadius: 16,
    background: "#f8fafc",
    border: "1px solid #cbd5e1",
    marginBottom: 14,
  },

  searchIcon: {
    fontSize: 22,
    fontWeight: 900,
    color: "#2563eb",
  },

  searchInput: {
    width: "100%",
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 15,
    color: "#0f172a",
  },

  filters: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },

  filterButton: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
  },

  filterButtonActive: {
    background: "#2563eb",
    borderColor: "#2563eb",
    color: "#ffffff",
    boxShadow: "0 10px 24px rgba(37,99,235,0.25)",
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
    color: "#0f172a",
  },

  resultCount: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: 800,
  },

  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 14,
  },

  materialCard: {
    textAlign: "left",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    borderRadius: 22,
    padding: 16,
    cursor: "pointer",
    boxShadow: "0 10px 28px rgba(15,23,42,0.05)",
    transition: "transform 0.15s ease, box-shadow 0.15s ease, border 0.15s ease",
  },

  materialCardSelected: {
    border: "1px solid #2563eb",
    boxShadow: "0 18px 46px rgba(37,99,235,0.16)",
    transform: "translateY(-2px)",
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
    color: "#0f172a",
  },

  materialCode: {
    margin: "4px 0 0",
    fontSize: 13,
    color: "#64748b",
    fontWeight: 800,
  },

  categoryBadge: {
    flexShrink: 0,
    padding: "5px 8px",
    borderRadius: 999,
    background: "#eff6ff",
    color: "#1d4ed8",
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
    background: "#f8fafc",
    borderRadius: 14,
    border: "1px solid #e2e8f0",
  },

  miniLabel: {
    display: "block",
    fontSize: 11,
    color: "#64748b",
    fontWeight: 900,
    marginBottom: 4,
  },

  miniValue: {
    display: "block",
    fontSize: 14,
    color: "#0f172a",
  },

  strengthBarOuter: {
    width: "100%",
    height: 8,
    background: "#e2e8f0",
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 12,
  },

  strengthBarInner: {
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg, #60a5fa, #2563eb)",
  },

  cardNote: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.45,
    color: "#475569",
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
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    boxShadow: "0 18px 50px rgba(15,23,42,0.08)",
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
    color: "#0f172a",
    fontWeight: 900,
  },

  detailSubtitle: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: 14,
    fontWeight: 800,
  },

  detailCategory: {
    padding: "7px 10px",
    borderRadius: 999,
    background: "#eff6ff",
    color: "#1d4ed8",
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
    background: "#2563eb",
    color: "#ffffff",
    borderRadius: 14,
    padding: "11px 12px",
    fontWeight: 900,
    cursor: "pointer",
  },

  secondaryButton: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
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
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    minWidth: 0,
  },

  infoLabel: {
    display: "block",
    fontSize: 11,
    color: "#64748b",
    fontWeight: 900,
    marginBottom: 4,
  },

  infoValue: {
    display: "block",
    color: "#0f172a",
    fontSize: 13,
    lineHeight: 1.35,
    wordBreak: "break-word",
  },

  block: {
    padding: 12,
    borderRadius: 16,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    marginBottom: 8,
  },

  blockTitle: {
    margin: "0 0 6px",
    fontSize: 13,
    color: "#0f172a",
    fontWeight: 900,
  },

  blockText: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.5,
    color: "#475569",
  },

  warningBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    background: "#fffbeb",
    border: "1px solid #fde68a",
    color: "#92400e",
    fontSize: 13,
    lineHeight: 1.5,
    fontWeight: 800,
  },

  emptyState: {
    padding: 24,
    textAlign: "center",
    color: "#64748b",
    fontWeight: 800,
  },

  comparePanel: {
    marginTop: 22,
    padding: 18,
    borderRadius: 26,
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    boxShadow: "0 14px 40px rgba(15,23,42,0.06)",
  },

  compareGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
  },

  compareColumn: {
    padding: 14,
    borderRadius: 20,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  },

  compareTitle: {
    margin: "0 0 12px",
    fontSize: 16,
    fontWeight: 900,
    color: "#0f172a",
  },

  compareMaterialHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    color: "#0f172a",
  },

  emptyCompare: {
    margin: 0,
    color: "#64748b",
    fontSize: 14,
  },
};
