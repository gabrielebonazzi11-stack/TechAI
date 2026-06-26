import React, { useState, useMemo } from "react";

type ProjectToolView = "memory" | "revisions" | "bom";

type ProjectsModalProps = {
  s: Record<string, React.CSSProperties>;
  theme: any;
  isDark: boolean;
  onClose: () => void;

  projectToolView: ProjectToolView;
  setProjectToolView: React.Dispatch<React.SetStateAction<ProjectToolView>>;
  projectMemoryTab: string;
  setProjectMemoryTab: React.Dispatch<React.SetStateAction<any>>;

  projectSearch: string;
  setProjectSearch: React.Dispatch<React.SetStateAction<string>>;

  projects: any[];
  filteredProjects: any[];
  activeProject: any;
  setActiveProjectId: React.Dispatch<React.SetStateAction<string | null>>;
  deleteProject: (projectId: string) => void;
  updateProject: (projectId: string, name: string, description: string) => void;

  projectFileInputRef: React.RefObject<HTMLInputElement>;
  handleProjectSmartFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  projectSmartFile: any;

  newProjectName: string;
  setNewProjectName: React.Dispatch<React.SetStateAction<string>>;
  newProjectDescription: string;
  setNewProjectDescription: React.Dispatch<React.SetStateAction<string>>;
  createProject: (name?: string, description?: string) => string;

  renderProjectMemory: () => React.ReactNode;

  bomFileInputRef: React.RefObject<HTMLInputElement>;
  handleBomFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  bomText: string;
  setBomText: React.Dispatch<React.SetStateAction<string>>;
  runBomCheck: () => void;
  bomIssues: any[];
};

function ProjectField({
  s,
  theme,
  isDark,
  label,
  value,
  onChange,
  placeholder = "",
}: {
  s: Record<string, React.CSSProperties>;
  theme: any;
  isDark: boolean;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label style={s.label}>{label}</label>
      <input
        style={{
          ...s.input,
          background: isDark ? "#050505" : "#fff",
          color: theme.text,
          border: `1px solid ${theme.border}`,
        }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}


// ── Diff word-level ──────────────────────────────────────────────────────
function wordDiff(a: string, b: string): { text: string; type: "same" | "add" | "remove" }[] {
  const wordsA = a.split(/(\s+)/);
  const wordsB = b.split(/(\s+)/);
  const result: { text: string; type: "same" | "add" | "remove" }[] = [];

  // LCS semplice
  const m = wordsA.length, n = wordsB.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = wordsA[i-1] === wordsB[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);

  const path: [number, number][] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && wordsA[i-1] === wordsB[j-1]) { path.unshift([i-1, j-1]); i--; j--; }
    else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) { path.unshift([-1, j-1]); j--; }
    else { path.unshift([i-1, -1]); i--; }
  }

  for (const [ai, bi] of path) {
    if (ai >= 0 && bi >= 0) result.push({ text: wordsA[ai], type: "same" });
    else if (ai >= 0) result.push({ text: wordsA[ai], type: "remove" });
    else result.push({ text: wordsB[bi], type: "add" });
  }
  return result;
}

// ── Componente comparatore ────────────────────────────────────────────────
function RevisionComparator({ revisions, theme, isDark }: {
  revisions: any[];
  theme: any;
  isDark: boolean;
}) {
  const [idxA, setIdxA] = useState(0);
  const [idxB, setIdxB] = useState(Math.min(1, revisions.length - 1));

  const revA = revisions[idxA]?.payload;
  const revB = revisions[idxB]?.payload;

  const inputStyle: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    background: isDark ? "#0b0b0b" : "#fff",
    color: isDark ? "#f1f5f9" : "#1e293b",
    fontSize: 13,
    flex: 1,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.05em",
    color: isDark ? "#64748b" : "#94a3b8",
    marginBottom: 6,
    display: "block",
  };

  const fieldDiff = (a: string = "", b: string = "", highlight = false) => {
    if (!highlight || a === b) {
      return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{ padding: "8px 10px", borderRadius: 8, background: isDark ? "#0b0b0b" : "#f8fafc", border: `1px solid ${theme.border}`, fontSize: 13, minHeight: 36 }}>
            {a || <span style={{ opacity: 0.4 }}>—</span>}
          </div>
          <div style={{ padding: "8px 10px", borderRadius: 8, background: isDark ? "#0b0b0b" : "#f8fafc", border: `1px solid ${a !== b ? theme.primary : theme.border}`, fontSize: 13, minHeight: 36, color: a !== b ? theme.primary : undefined, fontWeight: a !== b ? 700 : undefined }}>
            {b || <span style={{ opacity: 0.4 }}>—</span>}
          </div>
        </div>
      );
    }

    // Word diff
    const diff = wordDiff(a, b);
    const renderA = diff.filter(d => d.type !== "add");
    const renderB = diff.filter(d => d.type !== "remove");

    const renderSide = (tokens: typeof diff, added: boolean) => (
      <div style={{ padding: "8px 10px", borderRadius: 8, background: isDark ? "#0b0b0b" : "#f8fafc", border: `1px solid ${theme.border}`, fontSize: 13, lineHeight: 1.6, minHeight: 36 }}>
        {tokens.map((t, i) => {
          if (t.type === "same") return <span key={i}>{t.text}</span>;
          const bg = added ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)";
          const color = added ? "#16a34a" : "#dc2626";
          return <span key={i} style={{ background: bg, color, borderRadius: 3, padding: "1px 2px", fontWeight: 700 }}>{t.text}</span>;
        })}
      </div>
    );

    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {renderSide(renderA, false)}
        {renderSide(renderB, true)}
      </div>
    );
  };

  if (revisions.length < 2) {
    return (
      <div style={{ padding: 16, textAlign: "center", color: isDark ? "#64748b" : "#94a3b8", fontSize: 13 }}>
        Servono almeno 2 revisioni per effettuare un confronto.
      </div>
    );
  }

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ padding: "14px 16px", borderRadius: 12, background: isDark ? "#0b0b0b" : "#f8fafc", border: `1px solid ${theme.border}` }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: theme.primary, marginBottom: 12, letterSpacing: "0.05em" }}>COMPARAZIONE REVISIONI</div>

        {/* Selezione revisioni */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          <div>
            <span style={labelStyle}>REVISIONE A</span>
            <select value={idxA} onChange={e => setIdxA(Number(e.target.value))} style={inputStyle}>
              {revisions.map((r, i) => <option key={i} value={i}>{r.payload?.code || `Rev ${i+1}`} — {r.payload?.date || ""}</option>)}
            </select>
          </div>
          <div>
            <span style={labelStyle}>REVISIONE B</span>
            <select value={idxB} onChange={e => setIdxB(Number(e.target.value))} style={inputStyle}>
              {revisions.map((r, i) => <option key={i} value={i}>{r.payload?.code || `Rev ${i+1}`} — {r.payload?.date || ""}</option>)}
            </select>
          </div>
        </div>

        {revA && revB && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Header colonne */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div style={{ textAlign: "center", fontWeight: 800, fontSize: 13, color: "#ef4444", padding: "6px 10px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                Rev. {revA.code} — {revA.date}
              </div>
              <div style={{ textAlign: "center", fontWeight: 800, fontSize: 13, color: "#22c55e", padding: "6px 10px", borderRadius: 8, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
                Rev. {revB.code} — {revB.date}
              </div>
            </div>

            {/* Autore */}
            <div>
              <span style={labelStyle}>AUTORE</span>
              {fieldDiff(revA.author, revB.author, false)}
            </div>

            {/* Modifiche — con diff */}
            <div>
              <span style={labelStyle}>MODIFICHE EFFETTUATE</span>
              {fieldDiff(revA.changes, revB.changes, true)}
            </div>

            {/* Note */}
            <div>
              <span style={labelStyle}>NOTE</span>
              {fieldDiff(revA.notes, revB.notes, true)}
            </div>

            {/* Badge identiche/diverse */}
            {revA.changes === revB.changes && revA.notes === revB.notes ? (
              <div style={{ textAlign: "center", fontSize: 12, color: "#22c55e", padding: 8, background: "rgba(34,197,94,0.1)", borderRadius: 8 }}>
                ✓ Le due revisioni hanno modifiche e note identiche
              </div>
            ) : (
              <div style={{ textAlign: "center", fontSize: 12, color: theme.primary, padding: 8, background: `${theme.primary}15`, borderRadius: 8 }}>
                Le revisioni presentano differenze evidenziate in rosso (rimosso) e verde (aggiunto)
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProjectsModal({
  s,
  theme,
  isDark,
  onClose,
  projectToolView,
  setProjectToolView,
  projectMemoryTab,
  setProjectMemoryTab,
  projectSearch,
  setProjectSearch,
  projects,
  filteredProjects,
  activeProject,
  setActiveProjectId,
  deleteProject,
  updateProject,
  projectFileInputRef,
  handleProjectSmartFileUpload,
  projectSmartFile,
  newProjectName,
  setNewProjectName,
  newProjectDescription,
  setNewProjectDescription,
  createProject,
  renderProjectMemory,
  bomFileInputRef,
  handleBomFileUpload,
  bomText,
  setBomText,
  runBomCheck,
  bomIssues,
}: ProjectsModalProps) {
  const [editingProjectId, setEditingProjectId] = React.useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = React.useState("");
  const [editingProjectDescription, setEditingProjectDescription] = React.useState("");

  const startEditProject = (project: any) => {
    setEditingProjectId(project.id);
    setEditingProjectName(project.name || "");
    setEditingProjectDescription(project.description || "");
  };

  const cancelEditProject = () => {
    setEditingProjectId(null);
    setEditingProjectName("");
    setEditingProjectDescription("");
  };

  const saveEditProject = () => {
    if (!editingProjectId) return;

    const cleanName = editingProjectName.trim();
    if (!cleanName) {
      alert("Inserisci un nome progetto valido.");
      return;
    }

    updateProject(editingProjectId, cleanName, editingProjectDescription.trim());
    cancelEditProject();
  };

  return (
    <div style={s.overlay}>
      <div
        style={{
          ...s.checklistModal,
          width: "min(1360px, calc(100vw - 32px))",
          background: isDark ? "#111" : "#fff",
          color: theme.text,
          border: `1px solid ${theme.border}`,
        }}
      >
        <div style={s.modalHeader}>
          <div>
            <h2 style={{ margin: 0 }}>Progetti e controlli avanzati</h2>
            <p style={s.muted}>
              Raccogli tavole, file, distinte, verifiche salvate dalla funzione Verifica e storico revisioni in un unico progetto.
            </p>
          </div>

          <button
            style={{ ...s.backBtn, color: theme.text, border: `1px solid ${theme.border}` }}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div style={s.projectLayout}>
          <div style={s.projectLeft}>
            <div
              style={{
                ...s.projectPanel,
                background: isDark ? "#050505" : "#f8fafc",
                border: `1px solid ${theme.border}`,
              }}
            >
              <h3 style={s.projectTitle}>Strumenti progetto</h3>
              <p style={s.muted}>Scegli cosa visualizzare nella parte destra.</p>

              <button
                style={{
                  ...s.projectToolButton,
                  background: projectToolView === "memory" ? `${theme.primary}22` : "transparent",
                  border: `1px solid ${projectToolView === "memory" ? theme.primary : theme.border}`,
                  color: theme.text,
                }}
                onClick={() => {
                  setProjectToolView("memory");
                  setProjectMemoryTab("Panoramica");
                }}
                type="button"
              >
                <strong>Memoria progetti</strong>
                <span>Chat, documenti, tavole, materiali, verifiche, decisioni e note.</span>
              </button>

              <button
                style={{
                  ...s.projectToolButton,
                  background: projectToolView === "revisions" ? `${theme.primary}22` : "transparent",
                  border: `1px solid ${projectToolView === "revisions" ? theme.primary : theme.border}`,
                  color: theme.text,
                }}
                onClick={() => {
                  setProjectToolView("revisions");
                  setProjectMemoryTab("Revisioni");
                }}
                type="button"
              >
                <strong>Storico revisioni</strong>
                <span>Revisioni con codice, data, autore, modifiche effettuate e note.</span>
              </button>

              <button
                style={{
                  ...s.projectToolButton,
                  background: projectToolView === "bom" ? `${theme.primary}22` : "transparent",
                  border: `1px solid ${projectToolView === "bom" ? theme.primary : theme.border}`,
                  color: theme.text,
                }}
                onClick={() => setProjectToolView("bom")}
                type="button"
              >
                <strong>Controllo distinta</strong>
                <span>CSV/JSON, codici duplicati, materiali, quantità e norme.</span>
              </button>
            </div>

            <div
              style={{
                ...s.projectPanel,
                background: isDark ? "#050505" : "#f8fafc",
                border: `1px solid ${theme.border}`,
              }}
            >
              <h3 style={s.projectTitle}>Progetti salvati</h3>

              <div style={{ marginBottom: 12 }}>
                <label style={s.label}>Cerca progetto</label>
                <input
                  style={{
                    ...s.input,
                    background: isDark ? "#050505" : "#fff",
                    color: theme.text,
                    border: `1px solid ${theme.border}`,
                  }}
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  placeholder="Cerca per nome, descrizione, materiale, verifica, decisione..."
                />
              </div>

              {projects.length === 0 ? (
                <div style={s.emptyText}>Nessun progetto creato. Carica un file o premi “Crea progetto”.</div>
              ) : filteredProjects.length === 0 ? (
                <div style={s.emptyText}>Nessun progetto trovato con questa ricerca.</div>
              ) : (
                filteredProjects.map((project) => {
                  const isEditing = editingProjectId === project.id;

                  return (
                    <div
                      key={project.id}
                      style={{
                        ...s.projectListItem,
                        alignItems: isEditing ? "stretch" : "center",
                        border: `1px solid ${project.id === activeProject?.id ? theme.primary : theme.border}`,
                        background: project.id === activeProject?.id ? `${theme.primary}1A` : "transparent",
                      }}
                    >
                      {isEditing ? (
                        <div style={{ display: "grid", gap: 8, width: "100%" }}>
                          <ProjectField
                            s={s}
                            theme={theme}
                            isDark={isDark}
                            label="Nome progetto"
                            value={editingProjectName}
                            onChange={setEditingProjectName}
                            placeholder="Nome progetto"
                          />

                          <ProjectField
                            s={s}
                            theme={theme}
                            isDark={isDark}
                            label="Descrizione"
                            value={editingProjectDescription}
                            onChange={setEditingProjectDescription}
                            placeholder="Descrizione progetto"
                          />

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <button
                              style={{ ...s.secondaryBtn, color: theme.primary, border: `1px solid ${theme.border}`, marginTop: 0 }}
                              onClick={saveEditProject}
                              type="button"
                            >
                              Salva
                            </button>

                            <button
                              style={{ ...s.secondaryBtn, color: theme.text, border: `1px solid ${theme.border}`, marginTop: 0 }}
                              onClick={cancelEditProject}
                              type="button"
                            >
                              Annulla
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button style={s.projectListMain} onClick={() => setActiveProjectId(project.id)} type="button">
                            <strong>{project.name}</strong>
                            <span>
                              {project.items.length} elementi · {new Date(project.updatedAt).toLocaleDateString("it-IT")}
                            </span>
                          </button>

                          <div style={{ display: "grid", gap: 6 }}>
                            <button
                              style={{ ...s.smallDeleteMaterialBtn, color: theme.primary }}
                              onClick={() => startEditProject(project)}
                              type="button"
                            >
                              Modifica
                            </button>

                            <button style={s.smallDeleteMaterialBtn} onClick={() => deleteProject(project.id)} type="button">
                              Elimina
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div
              style={{
                ...s.projectPanel,
                background: isDark ? "#050505" : "#f8fafc",
                border: `1px solid ${theme.border}`,
              }}
            >
              <h3 style={s.projectTitle}>Upload intelligente</h3>
              <p style={s.muted}>
                Carica PDF, STEP/STP, immagini o file tecnici. TechAI crea automaticamente un progetto se non esiste e salva metadata iniziali.
              </p>
              <input
                ref={projectFileInputRef}
                type="file"
                accept=".pdf,.step,.stp,.txt,.csv,.json,image/*"
                style={{ display: "none" }}
                onChange={handleProjectSmartFileUpload}
              />
              <button
                style={{ ...s.secondaryBtn, color: theme.text, border: `1px solid ${theme.border}` }}
                onClick={() => projectFileInputRef.current?.click()}
                type="button"
              >
                Carica file progetto
              </button>
              {projectSmartFile && (
                <div style={{ ...s.projectMiniCard, border: `1px solid ${theme.border}` }}>
                  <strong>{projectSmartFile.category}</strong>
                  <span>
                    {projectSmartFile.name} · {projectSmartFile.sizeKb} KB
                  </span>
                  <p>{projectSmartFile.note}</p>
                </div>
              )}
            </div>
          </div>

          <div style={s.projectRight}>
            <div
              style={{
                ...s.projectPanel,
                ...s.projectCreateFixedPanel,
                background: isDark ? "#050505" : "#f8fafc",
                border: `1px solid ${theme.border}`,
              }}
            >
              <div style={s.projectCreateCompactHeader}>
                <div>
                  <h3 style={s.projectTitle}>Crea progetto</h3>
                  <p style={s.muted}>Crea o aggiorna subito il contenitore di lavoro.</p>
                </div>
                <button
                  style={{ ...s.primaryBtn, ...s.projectCreateCompactButton, background: theme.primary }}
                  onClick={() => createProject()}
                  type="button"
                >
                  Crea progetto
                </button>
              </div>

              <div style={s.projectCreateCompactGrid}>
                <ProjectField
                  s={s}
                  theme={theme}
                  isDark={isDark}
                  label="Nome progetto"
                  value={newProjectName}
                  onChange={setNewProjectName}
                  placeholder="Es. Rullatrice risana filetti"
                />
                <ProjectField
                  s={s}
                  theme={theme}
                  isDark={isDark}
                  label="Descrizione"
                  value={newProjectDescription}
                  onChange={setNewProjectDescription}
                  placeholder="Cliente, assieme, revisione, obiettivo..."
                />
              </div>
            </div>

            <div
              style={{
                ...s.projectPanel,
                display: projectToolView === "memory" ? "block" : "none",
                background: isDark ? "#050505" : "#f8fafc",
                border: `1px solid ${theme.border}`,
              }}
            >
              <h3 style={s.projectTitle}>Memoria progetto</h3>
              {renderProjectMemory()}
            </div>

            <div
              style={{
                ...s.projectPanel,
                display: projectToolView === "revisions" ? "block" : "none",
                background: isDark ? "#050505" : "#f8fafc",
                border: `1px solid ${theme.border}`,
              }}
            >
              <h3 style={s.projectTitle}>Storico revisioni</h3>
              {renderProjectMemory()}
              <RevisionComparator
                revisions={(activeProject?.revisions || activeProject?.items?.filter((i: any) => i.type === "revision") || []).filter((r: any) => r.payload?.code)}
                theme={theme}
                isDark={isDark}
              />
            </div>

            <div
              style={{
                ...s.projectPanel,
                display: projectToolView === "bom" ? "block" : "none",
                background: isDark ? "#050505" : "#f8fafc",
                border: `1px solid ${theme.border}`,
              }}
            >
              <h3 style={s.projectTitle}>Controllo distinta CSV/JSON</h3>
              <p style={s.muted}>
                Controlla codici duplicati, materiali mancanti, quantità incoerenti, norme, viti senza classe e cuscinetti senza sigla.
              </p>
              <input
                ref={bomFileInputRef}
                type="file"
                accept=".csv,.json,.txt"
                style={{ display: "none" }}
                onChange={handleBomFileUpload}
              />
              <button
                style={{ ...s.secondaryBtn, color: theme.text, border: `1px solid ${theme.border}` }}
                onClick={() => bomFileInputRef.current?.click()}
                type="button"
              >
                Carica distinta CSV/JSON
              </button>
              <textarea
                style={{
                  ...s.checklistTextarea,
                  minHeight: 130,
                  background: isDark ? "#050505" : "#fff",
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                }}
                value={bomText}
                onChange={(e) => setBomText(e.target.value)}
                placeholder={"codice;descrizione;materiale;quantita;norma\nP001;vite M8x20;;4;UNI ..."}
              />
              <button style={{ ...s.primaryBtn, background: theme.primary }} onClick={runBomCheck} type="button">
                Controlla distinta e salva
              </button>
              {bomIssues.length > 0 &&
                bomIssues.map((issue, index) => (
                  <div
                    key={index}
                    style={{
                      ...s.resultCard,
                      background: isDark ? "#0b0b0b" : "#fff",
                      border: `1px solid ${theme.border}`,
                    }}
                  >
                    <div style={s.resultTop}>
                      <strong>Riga {issue.row}</strong>
                      <span>{issue.severity}</span>
                    </div>
                    <p style={s.resultDetail}>{issue.message}</p>
                    <p style={{ ...s.resultSuggestion, borderLeft: `3px solid ${theme.primary}` }}>{issue.suggestion}</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
