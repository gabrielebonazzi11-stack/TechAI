import React from "react";

type ProjectsModalProps = {
  s: Record<string, React.CSSProperties>;
  theme: any;
  isDark: boolean;
  onClose: () => void;

  projectToolView: "memory" | "serious" | "solidworks" | "bom";
  setProjectToolView: React.Dispatch<React.SetStateAction<"memory" | "serious" | "solidworks" | "bom">>;

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

  seriousForm: any;
  updateSeriousField: (field: any, value: string) => void;
  runSeriousVerification: () => void;
  resetSeriousVerification: () => void;
  seriousResult: any;

  solidWorksTask: string;
  setSolidWorksTask: React.Dispatch<React.SetStateAction<string>>;
  solidWorksNotes: string;
  setSolidWorksNotes: React.Dispatch<React.SetStateAction<string>>;
  solidWorksGuide: any;
  saveSolidWorksGuideToProject: () => void;

  bomFileInputRef: React.RefObject<HTMLInputElement>;
  handleBomFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  bomText: string;
  setBomText: React.Dispatch<React.SetStateAction<string>>;
  runBomCheck: () => void;
  bomIssues: any[];
};

export default function ProjectsModal({
  s,
  theme,
  isDark,
  onClose,
  projectToolView,
  setProjectToolView,
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
  seriousForm,
  updateSeriousField,
  runSeriousVerification,
  resetSeriousVerification,
  seriousResult,
  bomFileInputRef,
  handleBomFileUpload,
  bomText,
  setBomText,
  runBomCheck,
  bomIssues,
}: ProjectsModalProps) {
  function Field({
    label,
    value,
    onChange,
    placeholder = "",
  }: {
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
              Raccogli verifiche, tavole, file, distinte e storico revisioni in un unico progetto.
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
              <div style={{ ...s.projectPanel, background: isDark ? "#050505" : "#f8fafc", border: `1px solid ${theme.border}` }}>
                <h3 style={s.projectTitle}>Strumenti progetto</h3>
                <p style={s.muted}>Scegli cosa visualizzare nella parte destra.</p>

                <button
                  style={{ ...s.projectToolButton, background: projectToolView === "memory" ? `${theme.primary}22` : "transparent", border: `1px solid ${projectToolView === "memory" ? theme.primary : theme.border}`, color: theme.text }}
                  onClick={() => setProjectToolView("memory")}
                  type="button"
                >
                  <strong>Memoria progetti</strong>
                  <span>Chat, documenti, tavole, materiali, verifiche, decisioni, revisioni e note.</span>
                </button>

                <button
                  style={{ ...s.projectToolButton, background: projectToolView === "serious" ? `${theme.primary}22` : "transparent", border: `1px solid ${projectToolView === "serious" ? theme.primary : theme.border}`, color: theme.text }}
                  onClick={() => setProjectToolView("serious")}
                  type="button"
                >
                  <strong>Verifiche tecniche</strong>
                  <span>Fatica, bulloni, alberi, perni, saldature, cuscinetti e accoppiamenti.</span>
                </button>

                <button
                  style={{ ...s.projectToolButton, background: projectToolView === "bom" ? `${theme.primary}22` : "transparent", border: `1px solid ${projectToolView === "bom" ? theme.primary : theme.border}`, color: theme.text }}
                  onClick={() => setProjectToolView("bom")}
                  type="button"
                >
                  <strong>Controllo distinta</strong>
                  <span>CSV/JSON, codici duplicati, materiali, quantità e norme.</span>
                </button>
              </div>

              <div style={{ ...s.projectPanel, background: isDark ? "#050505" : "#f8fafc", border: `1px solid ${theme.border}` }}>
                <h3 style={s.projectTitle}>Progetti salvati</h3>

                <div style={{ marginBottom: 12 }}>
                  <label style={s.label}>Cerca progetto</label>
                  <input
                    style={{ ...s.input, background: isDark ? "#050505" : "#fff", color: theme.text, border: `1px solid ${theme.border}` }}
                    value={projectSearch}
                    onChange={e => setProjectSearch(e.target.value)}
                    placeholder="Cerca per nome, descrizione, materiale, verifica, decisione..."
                  />
                </div>

                {projects.length === 0 ? (
                  <div style={s.emptyText}>Nessun progetto creato. Carica un file o premi “Crea progetto”.</div>
                ) : filteredProjects.length === 0 ? (
                  <div style={s.emptyText}>Nessun progetto trovato con questa ricerca.</div>
                ) : filteredProjects.map(project => {
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
                          <Field
                            label="Nome progetto"
                            value={editingProjectName}
                            onChange={setEditingProjectName}
                            placeholder="Nome progetto"
                          />

                          <Field
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
                            <span>{project.items.length} elementi · {new Date(project.updatedAt).toLocaleDateString("it-IT")}</span>
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
                })}
              </div>

              <div style={{ ...s.projectPanel, background: isDark ? "#050505" : "#f8fafc", border: `1px solid ${theme.border}` }}>
                <h3 style={s.projectTitle}>Upload intelligente</h3>
                <p style={s.muted}>Carica PDF, STEP/STP, immagini o file tecnici. TechAI crea automaticamente un progetto se non esiste e salva metadata iniziali.</p>
                <input ref={projectFileInputRef} type="file" accept=".pdf,.step,.stp,.txt,.csv,.json,image/*" style={{ display: "none" }} onChange={handleProjectSmartFileUpload} />
                <button style={{ ...s.secondaryBtn, color: theme.text, border: `1px solid ${theme.border}` }} onClick={() => projectFileInputRef.current?.click()} type="button">Carica file progetto</button>
                {projectSmartFile && (
                  <div style={{ ...s.projectMiniCard, border: `1px solid ${theme.border}` }}>
                    <strong>{projectSmartFile.category}</strong>
                    <span>{projectSmartFile.name} · {projectSmartFile.sizeKb} KB</span>
                    <p>{projectSmartFile.note}</p>
                  </div>
                )}
              </div>
            </div>

            <div style={s.projectRight}>
              <div style={{ ...s.projectPanel, ...s.projectCreateFixedPanel, background: isDark ? "#050505" : "#f8fafc", border: `1px solid ${theme.border}` }}>
                <div style={s.projectCreateCompactHeader}>
                  <div>
                    <h3 style={s.projectTitle}>Crea progetto</h3>
                    <p style={s.muted}>Crea o aggiorna subito il contenitore di lavoro.</p>
                  </div>
                  <button style={{ ...s.primaryBtn, ...s.projectCreateCompactButton, background: theme.primary }} onClick={() => createProject()} type="button">Crea progetto</button>
                </div>

                <div style={s.projectCreateCompactGrid}>
                  <Field label="Nome progetto" value={newProjectName} onChange={setNewProjectName} placeholder="Es. Rullatrice risana filetti" theme={theme} isDark={isDark} />
                  <Field label="Descrizione" value={newProjectDescription} onChange={setNewProjectDescription} placeholder="Cliente, assieme, revisione, obiettivo..." theme={theme} isDark={isDark} />
                </div>
              </div>

              <div style={{ ...s.projectPanel, display: projectToolView === "memory" ? "block" : "none", background: isDark ? "#050505" : "#f8fafc", border: `1px solid ${theme.border}` }}>
                <h3 style={s.projectTitle}>Memoria progetto</h3>
                {renderProjectMemory()}
              </div>

              <div style={{ ...s.projectPanel, display: projectToolView === "serious" ? "block" : "none", background: isDark ? "#050505" : "#f8fafc", border: `1px solid ${theme.border}` }}>
                <h3 style={s.projectTitle}>Verifiche tecniche</h3>
                <div style={s.checklistGrid}>
                  <div>
                    <label style={s.label}>Tipo verifica</label>
                    <select style={{ ...s.input, background: isDark ? "#050505" : "#fff", color: theme.text, border: `1px solid ${theme.border}` }} value={seriousForm.mode} onChange={e => updateSeriousField("mode", e.target.value as any)}>
                      <option value="fatigue">Fatica Goodman/Soderberg</option>
                      <option value="contact">Contatto pressione specifica</option>
                      <option value="bolts">Bulloni precarico/taglio</option>
                      <option value="shaft">Albero flessione + torsione</option>
                      <option value="pin">Perno taglio/flessione</option>
                      <option value="pressure">Pressione interna recipiente</option>
                      <option value="weld">Saldatura cordone d'angolo</option>
                      <option value="key">Linguetta taglio/schiacciamento</option>
                      <option value="bearing">Cuscinetto durata L10h</option>
                      <option value="interference">Forzamento albero-mozzo</option>
                    </select>
                  </div>
                  <Field label="Materiale" value={seriousForm.material} onChange={v => updateSeriousField("material", v)} placeholder="C45" theme={theme} isDark={isDark} />
                  <Field label="Rm [MPa]" value={seriousForm.rm} onChange={v => updateSeriousField("rm", v)} placeholder="650" theme={theme} isDark={isDark} />
                  <Field label="Re/Rp0.2 [MPa]" value={seriousForm.re} onChange={v => updateSeriousField("re", v)} placeholder="370" theme={theme} isDark={isDark} />
                </div>

                {seriousForm.mode === "fatigue" && (
                  <div style={s.checklistGrid}>
                    <Field label="Sn [MPa]" value={seriousForm.sn} onChange={v => updateSeriousField("sn", v)} placeholder="260" theme={theme} isDark={isDark} />
                    <Field label="σmax [MPa]" value={seriousForm.sigmaMax} onChange={v => updateSeriousField("sigmaMax", v)} placeholder="180" theme={theme} isDark={isDark} />
                    <Field label="σmin [MPa]" value={seriousForm.sigmaMin} onChange={v => updateSeriousField("sigmaMin", v)} placeholder="20" theme={theme} isDark={isDark} />
                  </div>
                )}

                {seriousForm.mode === "contact" && (
                  <div style={s.checklistGrid}>
                    <Field label="Carico normale F [N]" value={seriousForm.normalLoad} onChange={v => updateSeriousField("normalLoad", v)} placeholder="2500" theme={theme} isDark={isDark} />
                    <Field label="Area contatto [mm²]" value={seriousForm.contactArea} onChange={v => updateSeriousField("contactArea", v)} placeholder="120" theme={theme} isDark={isDark} />
                    <Field label="Diametro d [mm]" value={seriousForm.contactDiameter} onChange={v => updateSeriousField("contactDiameter", v)} placeholder="20" theme={theme} isDark={isDark} />
                    <Field label="Lunghezza L [mm]" value={seriousForm.contactLength} onChange={v => updateSeriousField("contactLength", v)} placeholder="15" theme={theme} isDark={isDark} />
                  </div>
                )}

                {seriousForm.mode === "bolts" && (
                  <div style={s.checklistGrid}>
                    <Field label="Classe vite" value={seriousForm.boltClass} onChange={v => updateSeriousField("boltClass", v)} placeholder="8.8" theme={theme} isDark={isDark} />
                    <Field label="Vite" value={seriousForm.boltSize} onChange={v => updateSeriousField("boltSize", v)} placeholder="M8" theme={theme} isDark={isDark} />
                    <Field label="Ares [mm²]" value={seriousForm.boltArea} onChange={v => updateSeriousField("boltArea", v)} placeholder="36.6" theme={theme} isDark={isDark} />
                    <Field label="Numero viti" value={seriousForm.boltCount} onChange={v => updateSeriousField("boltCount", v)} placeholder="4" theme={theme} isDark={isDark} />
                    <Field label="Forza taglio totale [N]" value={seriousForm.shearForce} onChange={v => updateSeriousField("shearForce", v)} placeholder="4000" theme={theme} isDark={isDark} />
                    <Field label="Forza trazione totale [N]" value={seriousForm.tensileForce} onChange={v => updateSeriousField("tensileForce", v)} placeholder="2000" theme={theme} isDark={isDark} />
                  </div>
                )}

                {seriousForm.mode === "shaft" && (
                  <div style={s.checklistGrid}>
                    <Field label="Diametro albero d [mm]" value={seriousForm.diameter} onChange={v => updateSeriousField("diameter", v)} placeholder="25" theme={theme} isDark={isDark} />
                    <Field label="Forza radiale F [N]" value={seriousForm.shearForce} onChange={v => updateSeriousField("shearForce", v)} placeholder="2500" theme={theme} isDark={isDark} />
                    <Field label="Braccio L [mm]" value={seriousForm.distance} onChange={v => updateSeriousField("distance", v)} placeholder="120" theme={theme} isDark={isDark} />
                    <Field label="Momento flettente M [Nmm]" value={seriousForm.bendingMoment} onChange={v => updateSeriousField("bendingMoment", v)} placeholder="0 = F·L" theme={theme} isDark={isDark} />
                    <Field label="Momento torcente Mt [Nmm]" value={seriousForm.torque} onChange={v => updateSeriousField("torque", v)} placeholder="80000" theme={theme} isDark={isDark} />
                  </div>
                )}

                {seriousForm.mode === "pin" && (
                  <div style={s.checklistGrid}>
                    <Field label="Diametro perno d [mm]" value={seriousForm.diameter} onChange={v => updateSeriousField("diameter", v)} placeholder="20" theme={theme} isDark={isDark} />
                    <Field label="Forza F [N]" value={seriousForm.shearForce} onChange={v => updateSeriousField("shearForce", v)} placeholder="4000" theme={theme} isDark={isDark} />
                    <Field label="Lunghezza contatto L [mm]" value={seriousForm.contactLength} onChange={v => updateSeriousField("contactLength", v)} placeholder="15" theme={theme} isDark={isDark} />
                  </div>
                )}

                {seriousForm.mode === "pressure" && (
                  <div style={s.checklistGrid}>
                    <Field label="Pressione p [bar]" value={seriousForm.pressure} onChange={v => updateSeriousField("pressure", v)} placeholder="30" theme={theme} isDark={isDark} />
                    <Field label="Raggio medio r [mm]" value={seriousForm.radius} onChange={v => updateSeriousField("radius", v)} placeholder="150" theme={theme} isDark={isDark} />
                    <Field label="Spessore s [mm]" value={seriousForm.thickness} onChange={v => updateSeriousField("thickness", v)} placeholder="4" theme={theme} isDark={isDark} />
                  </div>
                )}

                {seriousForm.mode === "weld" && (
                  <div style={s.checklistGrid}>
                    <Field label="Trazione Ft [N]" value={seriousForm.tensileForce} onChange={v => updateSeriousField("tensileForce", v)} placeholder="2000" theme={theme} isDark={isDark} />
                    <Field label="Taglio Fs [N]" value={seriousForm.shearForce} onChange={v => updateSeriousField("shearForce", v)} placeholder="4000" theme={theme} isDark={isDark} />
                    <Field label="Lunghezza cordone L [mm]" value={seriousForm.weldLength} onChange={v => updateSeriousField("weldLength", v)} placeholder="80" theme={theme} isDark={isDark} />
                    <Field label="Gola efficace a [mm]" value={seriousForm.weldThroat} onChange={v => updateSeriousField("weldThroat", v)} placeholder="3" theme={theme} isDark={isDark} />
                  </div>
                )}

                {seriousForm.mode === "key" && (
                  <div style={s.checklistGrid}>
                    <Field label="Momento torcente Mt [Nmm]" value={seriousForm.torque} onChange={v => updateSeriousField("torque", v)} placeholder="80000" theme={theme} isDark={isDark} />
                    <Field label="Diametro albero d [mm]" value={seriousForm.diameter} onChange={v => updateSeriousField("diameter", v)} placeholder="25" theme={theme} isDark={isDark} />
                    <Field label="Larghezza linguetta b [mm]" value={seriousForm.keyWidth} onChange={v => updateSeriousField("keyWidth", v)} placeholder="8" theme={theme} isDark={isDark} />
                    <Field label="Altezza linguetta h [mm]" value={seriousForm.keyHeight} onChange={v => updateSeriousField("keyHeight", v)} placeholder="7" theme={theme} isDark={isDark} />
                    <Field label="Lunghezza linguetta L [mm]" value={seriousForm.keyLength} onChange={v => updateSeriousField("keyLength", v)} placeholder="40" theme={theme} isDark={isDark} />
                  </div>
                )}

                {seriousForm.mode === "bearing" && (
                  <div style={s.checklistGrid}>
                    <Field label="Carico equivalente P [N]" value={seriousForm.normalLoad} onChange={v => updateSeriousField("normalLoad", v)} placeholder="2500" theme={theme} isDark={isDark} />
                    <Field label="Velocità n [rpm]" value={seriousForm.rpm} onChange={v => updateSeriousField("rpm", v)} placeholder="500" theme={theme} isDark={isDark} />
                    <Field label="Vita richiesta [h]" value={seriousForm.lifeHours} onChange={v => updateSeriousField("lifeHours", v)} placeholder="10000" theme={theme} isDark={isDark} />
                    <Field label="Carico dinamico C [N]" value={seriousForm.dynamicLoadRating} onChange={v => updateSeriousField("dynamicLoadRating", v)} placeholder="12000" theme={theme} isDark={isDark} />
                  </div>
                )}

                {seriousForm.mode === "interference" && (
                  <div style={s.checklistGrid}>
                    <Field label="Diametro d [mm]" value={seriousForm.diameter} onChange={v => updateSeriousField("diameter", v)} placeholder="25" theme={theme} isDark={isDark} />
                    <Field label="Lunghezza accoppiamento L [mm]" value={seriousForm.contactLength} onChange={v => updateSeriousField("contactLength", v)} placeholder="30" theme={theme} isDark={isDark} />
                    <Field label="Pressione contatto p [MPa]" value={seriousForm.interferencePressure} onChange={v => updateSeriousField("interferencePressure", v)} placeholder="30" theme={theme} isDark={isDark} />
                    <Field label="Attrito μ" value={seriousForm.frictionCoeff} onChange={v => updateSeriousField("frictionCoeff", v)} placeholder="0.15" theme={theme} isDark={isDark} />
                    <Field label="Coppia richiesta Mt [Nmm]" value={seriousForm.torque} onChange={v => updateSeriousField("torque", v)} placeholder="80000" theme={theme} isDark={isDark} />
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button style={{ ...s.primaryBtn, background: theme.primary }} onClick={runSeriousVerification} type="button">Calcola e salva</button>
                  <button style={{ ...s.secondaryBtn, color: theme.text, border: `1px solid ${theme.border}`, marginTop: 8 }} onClick={resetSeriousVerification} type="button">Reset</button>
                </div>

                {seriousResult && (
                  <div style={{ ...s.resultCard, background: isDark ? "#0b0b0b" : "#fff", border: `1px solid ${theme.border}` }}>
                    <div style={s.resultTop}><strong>{seriousResult.title}</strong><span>{seriousResult.status}</span></div>
                    {seriousResult.rows.map((row, index) => <p key={index} style={s.valueRow}>{row}</p>)}
                    {seriousResult.suggestions.map((row, index) => <p key={index} style={{ ...s.resultSuggestion, borderLeft: `3px solid ${theme.primary}` }}>{row}</p>)}
                  </div>
                )}
              </div>

              <div style={{ ...s.projectPanel, display: projectToolView === "bom" ? "block" : "none", background: isDark ? "#050505" : "#f8fafc", border: `1px solid ${theme.border}` }}>
                <h3 style={s.projectTitle}>Controllo distinta CSV/JSON</h3>
                <p style={s.muted}>Controlla codici duplicati, materiali mancanti, quantità incoerenti, norme, viti senza classe e cuscinetti senza sigla.</p>
                <input ref={bomFileInputRef} type="file" accept=".csv,.json,.txt" style={{ display: "none" }} onChange={handleBomFileUpload} />
                <button style={{ ...s.secondaryBtn, color: theme.text, border: `1px solid ${theme.border}` }} onClick={() => bomFileInputRef.current?.click()} type="button">Carica distinta CSV/JSON</button>
                <textarea style={{ ...s.checklistTextarea, minHeight: 130, background: isDark ? "#050505" : "#fff", color: theme.text, border: `1px solid ${theme.border}` }} value={bomText} onChange={e => setBomText(e.target.value)} placeholder={'codice;descrizione;materiale;quantita;norma\nP001;vite M8x20;;4;UNI ...'} />
                <button style={{ ...s.primaryBtn, background: theme.primary }} onClick={runBomCheck} type="button">Controlla distinta e salva</button>
                {bomIssues.length > 0 && bomIssues.map((issue, index) => (
                  <div key={index} style={{ ...s.resultCard, background: isDark ? "#0b0b0b" : "#fff", border: `1px solid ${theme.border}` }}>
                    <div style={s.resultTop}><strong>Riga {issue.row}</strong><span>{issue.severity}</span></div>
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
