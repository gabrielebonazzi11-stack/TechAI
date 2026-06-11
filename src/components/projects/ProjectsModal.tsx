import React from "react";

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
