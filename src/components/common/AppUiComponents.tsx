import React from "react";

type Theme = {
  name?: string;
  primary: string;
  bg?: string;
  surface?: string;
  text: string;
  border: string;
};

type ChecklistResult = any;
type QuickCalcResult = any;
type DrawingUpload = any;
type DrawingResult = any;
type DrawingIssue = any;

export function Modal({ title, subtitle, children, theme, isDark, onClose, wide = false }: { title: string; subtitle?: string; children: React.ReactNode; theme: Theme; isDark: boolean; onClose: () => void; wide?: boolean }) {
  return (
    <div style={s.overlay}>
      <div style={{ ...s.checklistModal, width: wide ? "min(1360px, calc(100vw - 32px))" : "min(760px, calc(100vw - 32px))", background: isDark ? "#111" : "#fff", color: theme.text, border: `1px solid ${theme.border}` }}>
        <div style={s.modalHeader}>
          <div>
            <h2 style={{ margin: 0 }}>{title}</h2>
            {subtitle && <p style={s.muted}>{subtitle}</p>}
          </div>
          <button style={{ ...s.backBtn, color: theme.text, border: `1px solid ${theme.border}` }} onClick={onClose} type="button">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, value, onChange, placeholder = "", theme, isDark }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; theme: Theme; isDark: boolean }) {
  return (
    <div>
      <label style={s.label}>{label}</label>
      <input style={{ ...s.input, background: isDark ? "#050505" : "#fff", color: theme.text, border: `1px solid ${theme.border}` }} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export function ResultCard({ item, theme, isDark }: { item: ChecklistResult; theme: Theme; isDark: boolean }) {
  return (
    <div style={{ ...s.resultCard, background: isDark ? "#050505" : "#f8fafc", border: `1px solid ${theme.border}` }}>
      <div style={s.resultTop}><strong>{item.area}</strong><span>{item.status}</span></div>
      <p style={s.resultDetail}>{item.detail}</p>
      <p style={{ ...s.resultSuggestion, borderLeft: `3px solid ${theme.primary}` }}>{item.suggestion}</p>
    </div>
  );
}

export function QuickCalcCard({ result, theme, isDark }: { result: QuickCalcResult; theme: Theme; isDark: boolean }) {
  const isOk = result.outcome === "OK";
  const outcomeColor = isOk ? "#22c55e" : "#ef4444";
  const softOutcomeBg = isOk ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)";

  const getNumberFromText = (text: string) => {
    const matches = text.match(/-?\d+(?:[.,]\d+)?/g);
    if (!matches || matches.length === 0) return null;
    const value = Number(matches[matches.length - 1].replace(",", "."));
    return Number.isFinite(value) ? value : null;
  };

  const findNumberInRows = (rows: string[], patterns: RegExp[]) => {
    const row = rows.find(value => patterns.some(pattern => pattern.test(value)));
    return row ? getNumberFromText(row) : null;
  };

  const diameterValue =
    findNumberInRows(result.sectionValues || [], [/diametro/i, /\bd\b/i]) ??
    findNumberInRows(result.values || [], [/diametro/i, /\bd\b/i]);

  const requiredSafety =
    findNumberInRows(result.values || [], [/n richiesto/i, /n_req/i, /coefficiente.*richiesto/i]) ?? 2;

  const suggestedDiameter =
    !isOk && diameterValue && result.safetyFactor > 0
      ? diameterValue * Math.pow(requiredSafety / result.safetyFactor, 1 / 3)
      : null;

  const normalizedSuggestedDiameter =
    suggestedDiameter !== null
      ? Math.ceil(suggestedDiameter / 2) * 2
      : null;

  const loadRows = result.values.filter(value =>
    /carico|forza|braccio|momento/i.test(value)
  );

  const stressRows = result.values.filter(value =>
    /σ|sigma|τ|tau|von mises|tresca|tensione equivalente|mpa/i.test(value)
  );

  const safetyRows = result.values.filter(value =>
    /coefficiente|sicurezza|n_req|n =|n richiesto/i.test(value)
  );

  const otherRows = result.values.filter(value =>
    !loadRows.includes(value) &&
    !stressRows.includes(value) &&
    !safetyRows.includes(value)
  );

  const beautifyFormula = (formula: string) => {
    return formula
      .replaceAll("sigma", "σ")
      .replaceAll("tau", "τ")
      .replaceAll("sqrt", "√")
      .replaceAll("pi", "π")
      .replaceAll("*", "·")
      .replaceAll("sigmaN", "σN")
      .replaceAll("sigmaf", "σf")
      .replaceAll("sigmaVM", "σVM")
      .replaceAll("taut", "τt")
      .replaceAll("tauV", "τV")
      .replaceAll("sigma_tot", "σtot")
      .replaceAll("tau_tot", "τtot");
  };

  const detailSection = (title: string, rows: string[]) => {
    if (!rows || rows.length === 0) return null;

    return (
      <div
        style={{
          ...s.quickDetailSection,
          background: isDark ? "#080808" : "#f8fafc",
          border: `1px solid ${theme.border}`,
        }}
      >
        <h4 style={{ ...s.quickDetailTitle, color: theme.primary }}>{title}</h4>

        <div style={s.quickDetailList}>
          {rows.map((value, index) => (
            <div key={index} style={s.quickDetailRow}>
              <span style={{ ...s.quickDot, background: theme.primary }} />
              <span>{value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        ...s.quickResultShell,
        background: isDark ? "#050505" : "#ffffff",
        border: `1px solid ${theme.border}`,
      }}
    >
      <div style={s.quickHero}>
        <div style={s.quickHeroText}>
          <div style={s.quickEyebrow}>Risultato verifica</div>
          <h3 style={s.quickHeroTitle}>{result.title}</h3>
          <p style={s.quickHeroSubtitle}>{result.scheme}</p>
        </div>

        <div
          style={{
            ...s.quickOutcomeBadge,
            background: softOutcomeBg,
            color: outcomeColor,
            border: `1px solid ${outcomeColor}`,
          }}
        >
          {result.outcome}
        </div>
      </div>

      <div style={s.quickMetricsGrid}>
        <div
          style={{
            ...s.quickMetricCard,
            background: softOutcomeBg,
            border: `1px solid ${outcomeColor}`,
          }}
        >
          <span style={s.quickMetricLabel}>Tensione equivalente</span>
          <strong style={{ ...s.quickMetricValue, color: outcomeColor }}>
            {result.equivalentStress.toFixed(2)} MPa
          </strong>
          <span style={s.quickMetricSub}>Valore usato per il confronto</span>
        </div>

        <div
          style={{
            ...s.quickMetricCard,
            background: softOutcomeBg,
            border: `1px solid ${outcomeColor}`,
          }}
        >
          <span style={s.quickMetricLabel}>n calcolato</span>
          <strong style={{ ...s.quickMetricValue, color: outcomeColor }}>
            {result.safetyFactor.toFixed(2)}
          </strong>
          <span style={s.quickMetricSub}>Coefficiente ottenuto</span>
        </div>

        <div
          style={{
            ...s.quickMetricCard,
            background: isDark ? "#0b0b0b" : "#ffffff",
            border: `1px solid ${theme.border}`,
          }}
        >
          <span style={s.quickMetricLabel}>n richiesto</span>
          <strong style={s.quickMetricValue}>
            {requiredSafety.toFixed(2)}
          </strong>
          <span style={s.quickMetricSub}>Valore minimo impostato</span>
        </div>
      </div>

      <div
        style={{
          ...s.quickFinalBanner,
          background: softOutcomeBg,
          border: `1px solid ${outcomeColor}`,
          borderLeft: `6px solid ${outcomeColor}`,
        }}
      >
        <div style={{ ...s.quickFinalIcon, background: outcomeColor }}>
          {isOk ? "✓" : "!"}
        </div>

        <div>
          <h3 style={{ ...s.quickFinalTitle, color: outcomeColor }}>
            Esito finale: {result.outcome}
          </h3>

          <p style={s.quickFinalText}>
            Tensione equivalente = <strong>{result.equivalentStress.toFixed(2)} MPa</strong>.{" "}
            Coefficiente calcolato n = <strong>{result.safetyFactor.toFixed(2)}</strong>.
            {result.trescaStress !== undefined && result.trescaStress > 0 && (
              <>
                {" "}Tresca indicativo = <strong>{result.trescaStress.toFixed(2)} MPa</strong>.
              </>
            )}
          </p>

          {!isOk && (
            <p style={s.quickFinalWarning}>
              La verifica non è soddisfatta: aumenta il diametro, cambia materiale oppure riduci carico e momenti applicati.
            </p>
          )}

          {isOk && (
            <p style={s.quickFinalOk}>
              La verifica preliminare risulta soddisfatta rispetto al coefficiente di sicurezza richiesto.
            </p>
          )}
        </div>
      </div>

          {!isOk && suggestedDiameter !== null && normalizedSuggestedDiameter !== null && (
        <div
          style={{
            ...s.quickSuggestionBox,
            background: isDark ? "#0b0b0b" : "#fff7ed",
            border: `1px solid ${theme.border}`,
            borderLeft: "5px solid #f97316",
          }}
        >
          <div style={s.quickSuggestionHeader}>
            <div>
              <span style={s.quickSuggestionKicker}>Suggerimento automatico</span>
              <h4 style={s.quickSuggestionTitle}>Diametro consigliato</h4>
            </div>

            <span style={s.quickSuggestionBadge}>
              Ø {normalizedSuggestedDiameter.toFixed(0)} mm
            </span>
          </div>

          <div style={s.quickSuggestionGrid}>
            <div style={s.quickSuggestionMiniCard}>
              <span style={s.quickSuggestionMiniLabel}>Attuale</span>
              <strong style={s.quickSuggestionMiniValue}>{diameterValue?.toFixed(2)} mm</strong>
            </div>

            <div style={s.quickSuggestionMiniCard}>
              <span style={s.quickSuggestionMiniLabel}>Minimo stimato</span>
              <strong style={s.quickSuggestionMiniValue}>{suggestedDiameter.toFixed(2)} mm</strong>
            </div>

            <div style={s.quickSuggestionMiniCard}>
              <span style={s.quickSuggestionMiniLabel}>Normalizzato</span>
              <strong style={s.quickSuggestionMiniValue}>{normalizedSuggestedDiameter.toFixed(0)} mm</strong>
            </div>
          </div>

          <p style={s.quickSuggestionNote}>
            Stima preliminare. Riverificare considerando intagli, cave, fatica e diametri normalizzati reali.
          </p>
        </div>
      )}
      
      <div
        style={{
          ...s.quickSectionBadge,
          background: isDark ? "#0b0b0b" : "#f8fafc",
          border: `1px solid ${theme.border}`,
          borderLeft: `5px solid ${theme.primary}`,
        }}
      >
        <span style={s.quickSectionLabel}>Sezione</span>
        <strong style={s.quickSectionValue}>{result.section}</strong>
      </div>
          <div
        style={{
          ...s.quickStepsBox,
          background: isDark ? "#080808" : "#f8fafc",
          border: `1px solid ${theme.border}`,
        }}
      >
        <h4 style={{ ...s.quickDetailTitle, color: theme.primary }}>
          Passaggi di calcolo
        </h4>

        <div style={s.quickStepsList}>
          <div style={s.quickStepItem}>
            <span style={{ ...s.quickStepNumber, background: theme.primary }}>1</span>
            <div>
              <strong>Materiale</strong>
              <p style={s.quickStepText}>
                Vengono letti i dati del materiale selezionato, in particolare Re/Rp0.2 e Rm.
              </p>
            </div>
          </div>

          <div style={s.quickStepItem}>
            <span style={{ ...s.quickStepNumber, background: theme.primary }}>2</span>
            <div>
              <strong>Sezione</strong>
              <p style={s.quickStepText}>
                In base alla sezione scelta vengono calcolati area A, momento d’inerzia Jf, modulo resistente Wf e modulo torsionale Wt.
              </p>
            </div>
          </div>

          <div style={s.quickStepItem}>
            <span style={{ ...s.quickStepNumber, background: theme.primary }}>3</span>
            <div>
              <strong>Sollecitazioni</strong>
              <p style={s.quickStepText}>
                Dai carichi inseriti vengono calcolate le tensioni normali e tangenziali.
              </p>
            </div>
          </div>

          <div style={s.quickStepItem}>
            <span style={{ ...s.quickStepNumber, background: theme.primary }}>4</span>
            <div>
              <strong>Tensione equivalente</strong>
              <p style={s.quickStepText}>
                Le tensioni vengono combinate con Von Mises. Se previsto viene mostrato anche Tresca.
              </p>
            </div>
          </div>

          <div style={s.quickStepItem}>
            <span style={{ ...s.quickStepNumber, background: theme.primary }}>5</span>
            <div>
              <strong>Esito</strong>
              <p style={s.quickStepText}>
                Il coefficiente calcolato viene confrontato con quello richiesto per stabilire OK o NON OK.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {detailSection("Dati sezione / materiale", result.sectionValues)}
  
      {result.formulas.length > 0 && (
        <div
          style={{
            ...s.quickFormulaSection,
            background: isDark ? "#0b0b0b" : "#f8fafc",
            border: `1px solid ${theme.border}`,
          }}
        >
          <h4 style={{ ...s.quickDetailTitle, color: theme.primary }}>Formule usate</h4>

          <div style={s.quickFormulaGrid}>
            {result.formulas.map((formula, index) => (
              <div
                key={index}
                style={{
                  ...s.quickFormulaChip,
                  background: isDark ? "#050505" : "#ffffff",
                  border: `1px solid ${theme.border}`,
                }}
              >
                {beautifyFormula(formula)}
              </div>
            ))}
          </div>
        </div>
      )}

      {detailSection("Carichi e momenti applicati", loadRows)}
      {detailSection("Risultati tensioni / deformazioni", stressRows)}
      {detailSection("Coefficienti di sicurezza", safetyRows)}
      {detailSection("Altri risultati", otherRows)}

      {result.notes.length > 0 && (
        <div
          style={{
            ...s.quickNotesBox,
            background: isDark ? "#080808" : "#f8fafc",
            border: `1px solid ${theme.border}`,
          }}
        >
          <h4 style={{ ...s.quickDetailTitle, color: theme.primary }}>Note progettuali</h4>

          {result.notes.map((note, index) => (
            <p key={index} style={s.quickNoteText}>
              {note}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}


export function FileCard({ upload, icon, theme, isDark, onRemove }: { upload: DrawingUpload; icon: string; theme: Theme; isDark: boolean; onRemove: () => void }) {
  return (
    <div style={{ ...s.drawingFileCard, background: isDark ? "#111" : "#fff", border: `1px solid ${theme.border}` }}>
      <div style={{ ...s.fileIcon, background: theme.primary }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong>{upload.fileAttachment.name}</strong>
        <div style={s.muted}>{(upload.fileAttachment.size / 1024).toFixed(1)} KB</div>
        {upload.previewUrl && <img src={upload.previewUrl} alt="Anteprima tavola" style={s.drawingPreviewImage} />}
      </div>
      <button style={s.roundBtn} onClick={onRemove} type="button">×</button>
    </div>
  );
}

export function DrawingResultCard({ item, theme, isDark, renderFormattedText }: { item: DrawingResult; theme: Theme; isDark: boolean; renderFormattedText: (text: string) => React.ReactNode }) {
  return (
    <div style={{ ...s.resultCard, background: isDark ? "#050505" : "#f8fafc", border: `1px solid ${theme.border}` }}>
      <div style={s.resultTop}><strong>{item.category}: {item.item}</strong><span>{item.status}</span></div>
      <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{renderFormattedText(item.reason)}</div>
      <p style={{ ...s.resultSuggestion, borderLeft: `3px solid ${theme.primary}` }}>{item.suggestion}</p>
    </div>
  );
}

export function DrawingPreview({ issues, previewUrl, fileName, theme, isDark }: { issues: DrawingIssue[]; previewUrl?: string; fileName?: string; theme: Theme; isDark: boolean }) {
  const badgeColor = issues.length === 0 ? "#64748b" : issues.some(i => i.severity === "errore") ? "#dc2626" : issues.some(i => i.severity === "attenzione") ? "#f59e0b" : "#16a34a";

  return (
    <div style={{ ...s.drawingPreviewPanel, background: isDark ? "#050505" : "#f8fafc", border: `1px solid ${theme.border}` }}>
      <div style={s.drawingPreviewTop}>
        <div>
          <strong>Anteprima controllo tavola</strong>
          <p style={s.muted}>{previewUrl ? `Anteprima reale: ${fileName || "tavola caricata"}` : "Carica un'immagine PNG/JPG/WebP per vedere la tavola a destra."}</p>
        </div>
        <span style={{ ...s.previewBadge, background: badgeColor, display: "flex", gap: 6, alignItems: "center" }}>
          {issues.filter(i => i.severity === "errore").length > 0 && <span>❌ {issues.filter(i => i.severity === "errore").length}</span>}
          {issues.filter(i => i.severity === "attenzione").length > 0 && <span>⚠️ {issues.filter(i => i.severity === "attenzione").length}</span>}
          {issues.filter(i => i.severity === "info").length > 0 && <span>✅ {issues.filter(i => i.severity === "info").length}</span>}
        </span>
      </div>

      <div style={{ ...s.realDrawingPreviewBox, background: isDark ? "#0b0b0b" : "#ffffff", border: `1px solid ${theme.border}` }}>
        {previewUrl ? <img src={previewUrl} alt={fileName || "Anteprima tavola"} style={s.realDrawingPreviewImage} /> : <div style={s.noIssuesOverlay}>Nessuna anteprima immagine disponibile</div>}
        {previewUrl && issues.map(issue => (
          <div
            key={issue.id}
            title={`${issue.label}: ${issue.detail}`}
            style={{
              position: "absolute",
              left: `${issue.x}%`,
              top: `${issue.y}%`,
              transform: "translate(-50%, -50%)",
              fontSize: 22,
              lineHeight: 1,
              cursor: "pointer",
              filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.7))",
              zIndex: 10,
              userSelect: "none",
            }}
          >
            {issue.severity === "errore" ? "❌" : issue.severity === "attenzione" ? "⚠️" : "✅"}
          </div>
        ))}
      </div>

      <div style={s.issueList}>
        {issues.length === 0 ? <div style={s.emptyText}>Esegui il controllo per vedere gli errori evidenziati.</div> : issues.map(issue => (
          <div key={issue.id} style={s.issueRow}>
            <span style={{ fontSize: 16, lineHeight: 1, marginRight: 2 }}>{issue.severity === "errore" ? "❌" : issue.severity === "attenzione" ? "⚠️" : "✅"}</span>
            <div><strong>{issue.label}</strong><p>{issue.detail}</p></div>
          </div>
        ))}
      </div>
    </div>
  );
}


const s: Record<string, React.CSSProperties> = {
  app: { display: "flex", height: "100dvh", width: "100vw", overflow: "hidden" },
  loginScreen: { position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,0.45)" },
  loginCard: { borderRadius: 28, padding: 34, width: "min(520px, calc(100vw - 32px))", boxShadow: "0 30px 90px rgba(0,0,0,0.25)" },
  loginModalWrap: { position: "relative" },
  sidebar: { height: "100dvh", padding: 10, display: "flex", flexDirection: "column", gap: 12, overflow: "hidden", flexShrink: 0 },
  sidebarTop: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minHeight: 50 },
  logoWrap: { display: "flex", alignItems: "center", gap: 10, minWidth: 0 },
  logoMark: { width: 34, height: 34, borderRadius: 12, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 },
  logoText: { fontSize: 21, fontWeight: 900, letterSpacing: -1, whiteSpace: "nowrap" },
  collapseBtn: { width: 44, height: 44, borderRadius: 14, cursor: "pointer", fontSize: 22, background: "transparent" },
  iconNav: { display: "flex", flexDirection: "column", gap: 10 },
  iconBtn: { minHeight: 44, borderRadius: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 800, background: "transparent", border: "1px solid transparent" },
  icon: { width: 22, textAlign: "center" },
  toolsGroup: { display: "flex", flexDirection: "column", gap: 6, borderRadius: 18, padding: 8, margin: "8px 0" },
  toolsTitle: { fontSize: 11, textTransform: "uppercase", fontWeight: 950, padding: "5px 8px 7px", borderBottom: "1px solid rgba(120,120,120,0.18)" },
  chatHistory: { flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 },
  historyHeaderRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "2px 4px" },
  historyHeader: { fontSize: 11, textTransform: "uppercase", fontWeight: 800, opacity: 0.5 },
  clearChatsBtn: { borderRadius: 999, background: "transparent", cursor: "pointer", fontSize: 11, fontWeight: 850, padding: "5px 8px" },
  historyItem: { minHeight: 38, display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: 12, padding: "8px 8px 8px 10px", fontSize: 13, gap: 8 },
  historyTitle: { overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", flex: 1, cursor: "pointer" },
  deleteBtn: { width: 24, height: 24, borderRadius: "50%", background: "rgba(120,120,120,0.10)", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" },
  sidebarBottomActions: { marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 },
  main: { flex: 1, minWidth: 0, height: "100dvh", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" },
  collapsedBrand: { position: "absolute", top: 22, left: 28, zIndex: 20, fontSize: 24, fontWeight: 950, letterSpacing: 2, pointerEvents: "none" },
  floatingAccountBtn: { position: "absolute", top: 18, right: 28, zIndex: 30, width: 44, height: 44, borderRadius: 14, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" },
  content: { flex: 1, minHeight: 0, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", overflow: "hidden" },
  homeWrapper: { width: "100%", maxWidth: 720, textAlign: "center", padding: "0 22px" },
  welcomeText: { fontSize: "clamp(25px, 4vw, 38px)", fontWeight: 700, marginBottom: 30, letterSpacing: -1 },
  inputComposer: { display: "flex", flexDirection: "column", gap: 8, borderRadius: 28, padding: "8px 12px", width: "100%", minHeight: 56, boxShadow: "0 8px 24px rgba(0,0,0,0.05)" },
  searchBarInner: { display: "flex", alignItems: "center", width: "100%" },
  fileBtn: { width: 34, height: 34, background: "none", border: "none", cursor: "pointer", fontSize: 18 },
  textarea: { flex: 1, minWidth: 0, maxHeight: 140, background: "none", border: "none", outline: "none", textAlign: "center", fontSize: 16, resize: "none", padding: "10px 0" },
  sendBtn: { width: 34, height: 34, background: "none", border: "none", cursor: "pointer", fontSize: 20 },
  fileHint: { fontSize: 12, opacity: 0.58, marginTop: 12 },
  pendingFileChip: { display: "flex", alignItems: "center", gap: 10, borderRadius: 18, padding: "10px 12px", width: "100%" },
  fileIcon: { width: 36, height: 44, borderRadius: 10, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, flexShrink: 0 },
  roundBtn: { width: 30, height: 30, borderRadius: "50%", border: "none", background: "rgba(120,120,120,0.16)", cursor: "pointer", fontSize: 18, lineHeight: 1 },
  muted: { fontSize: 12, opacity: 0.65, margin: "4px 0 0", lineHeight: 1.45 },
  chatView: { width: "100%", maxWidth: 940, flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "14px 22px", overflow: "hidden" },
  msgList: { flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 18, padding: "10px 0" },
  uRow: { display: "flex", justifyContent: "flex-end", width: "100%" },
  aRow: { display: "flex", justifyContent: "flex-start", alignItems: "flex-start", gap: 12, width: "100%" },
  uBox: { padding: "13px 18px", borderRadius: "22px 22px 6px 22px", maxWidth: "78%", fontSize: 15, whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.55 },
  aBox: { padding: "18px 20px", borderRadius: "8px 22px 22px 22px", lineHeight: 1.72, fontSize: 16, whiteSpace: "pre-wrap", maxWidth: "86%", overflowWrap: "anywhere" },
  aiAvatar: { width: 34, height: 34, borderRadius: "50%", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 950, flexShrink: 0, marginTop: 10 },
  aiHeader: { display: "flex", flexDirection: "column", gap: 2, marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid rgba(120,120,120,0.18)" },
  bottomInput: { padding: "10px 0 8px", flexShrink: 0 },
  messageLine: { lineHeight: 1.7, margin: "2px 0" },
  numberedLine: { margin: "8px 0", lineHeight: 1.65, fontWeight: 650 },
  bulletLine: { margin: "6px 0", lineHeight: 1.65 },
  codeBlock: { borderRadius: 16, padding: "16px 18px", margin: "14px 0", overflowX: "auto", fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap", background: "#0f172a", color: "#e5e7eb" },
  attachmentBox: { marginTop: 10, padding: "10px 12px", borderRadius: 12, background: "rgba(120,120,120,0.10)", fontSize: 13 },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: 16 },
  checklistModal: { borderRadius: 24, height: "min(860px, calc(100dvh - 32px))", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 30px 70px rgba(0,0,0,0.28)", padding: 28 },
  modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexShrink: 0 },
  backBtn: { width: 38, height: 38, minWidth: 38, padding: 0, background: "transparent", borderRadius: "50%", cursor: "pointer", fontWeight: 900, fontSize: 24, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" },
  modal: { borderRadius: 24, width: "min(620px, 100%)", height: "min(450px, calc(100dvh - 32px))", display: "flex", overflow: "hidden", boxShadow: "0 30px 60px rgba(0,0,0,0.25)" },
  modalSide: { width: 170, padding: 24, display: "flex", flexDirection: "column", gap: 15, flexShrink: 0 },
  modalMain: { flex: 1, minWidth: 0, padding: 32, display: "flex", flexDirection: "column", overflowY: "auto" },
  tabBtn: { textAlign: "left", border: "none", background: "transparent", cursor: "pointer", fontSize: 14, fontWeight: 850, padding: "8px 0" },
  settingsOverlay: {
    position: "fixed",
    inset: 0,
    background: "radial-gradient(circle at 30% 20%, rgba(96,165,250,0.18), transparent 30%), rgba(15,23,42,0.72)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    padding: 18,
  },
  settingsModal: {
    width: "min(1180px, calc(100vw - 44px))",
    height: "min(760px, calc(100dvh - 44px))",
    minHeight: 520,
    display: "grid",
    gridTemplateColumns: "310px minmax(0, 1fr)",
    overflow: "hidden",
    borderRadius: 34,
    border: "1px solid rgba(226,232,240,0.38)",
    boxShadow: "0 34px 110px rgba(0,0,0,0.42)",
    background: "rgba(255,255,255,0.92)",
  },
  settingsSidePanel: {
    background: "linear-gradient(180deg, rgba(15,23,42,0.96), rgba(15,23,42,0.985))",
    padding: "38px 28px 30px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: 28,
    borderRight: "1px solid rgba(255,255,255,0.12)",
  },
  settingsTabsArea: { display: "flex", flexDirection: "column", gap: 16 },
  settingsTabBtn: {
    width: "100%",
    minHeight: 74,
    border: "1px solid transparent",
    borderRadius: 16,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "13px 14px",
    textAlign: "left",
  },
  settingsTabIcon: {
    width: 42,
    height: 42,
    minWidth: 42,
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.28)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 26,
    lineHeight: 1,
    fontWeight: 900,
  },
  settingsTabText: { display: "flex", flexDirection: "column", gap: 3, fontSize: 17, fontWeight: 900 },
  settingsSideFooter: { marginTop: "auto" },
  settingsFooterLine: { height: 1, background: "rgba(148,163,184,0.2)", marginBottom: 24 },
  settingsInfoRow: { display: "flex", alignItems: "center", gap: 12, color: "rgba(226,232,240,0.76)", fontSize: 13, lineHeight: 1.35 },
  settingsInfoIcon: { width: 26, height: 26, minWidth: 26, borderRadius: "50%", border: "1px solid rgba(148,163,184,0.42)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 },
  settingsMainPanel: {
    position: "relative",
    padding: "58px 68px",
    overflowY: "auto",
    background: "#f8fbff",
  },
  settingsCloseBtn: {
    position: "absolute",
    top: 36,
    right: 38,
    width: 54,
    height: 54,
    borderRadius: "50%",
    border: "1px solid rgba(148,163,184,0.24)",
    background: "rgba(255,255,255,0.72)",
    boxShadow: "0 12px 30px rgba(15,23,42,0.10)",
    cursor: "pointer",
    fontSize: 34,
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  settingsHeader: { marginBottom: 54, paddingRight: 72 },
  settingsTitle: { margin: 0, fontSize: "clamp(34px, 4vw, 46px)", lineHeight: 1, fontWeight: 950, letterSpacing: -1.4 },
  settingsSubtitle: { margin: "12px 0 0", fontSize: 16, lineHeight: 1.45, color: "#64748b", fontWeight: 650 },
  settingsContentStack: { display: "flex", flexDirection: "column", gap: 26, maxWidth: 720 },
  settingsLabel: { fontSize: 12, fontWeight: 950, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 12, display: "block" },
  settingsInputCard: {
    minHeight: 74,
    borderRadius: 16,
    display: "flex",
    alignItems: "center",
    gap: 18,
    padding: "0 22px",
    boxShadow: "0 14px 32px rgba(15,23,42,0.06)",
  },
  settingsInputIcon: { width: 28, minWidth: 28, color: "#94a3b8", fontSize: 28, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" },
  settingsInlineInput: {
    width: "100%",
    minWidth: 0,
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 18,
    fontWeight: 700,
    padding: "14px 0",
  },
  settingsLogoutBtn: {
    position: "relative",
    minHeight: 78,
    width: "100%",
    borderRadius: 16,
    border: "1px solid rgba(239,68,68,0.24)",
    background: "rgba(254,226,226,0.64)",
    color: "#ef4444",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    fontSize: 17,
    fontWeight: 950,
    marginTop: 8,
  },
  settingsLogoutIcon: { position: "absolute", left: 28, fontSize: 31, lineHeight: 1 },
  settingsGuestNotice: { borderRadius: 18, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 5, fontSize: 13, lineHeight: 1.45, color: "#92400e" },
  settingsThemeGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, maxWidth: 800 },
  settingsThemeOption: { padding: "15px 16px", minHeight: 60, borderRadius: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 13, fontSize: 14, fontWeight: 900 },
  label: { fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginBottom: 8, display: "block" },
  input: { width: "100%", padding: 12, borderRadius: 12, marginBottom: 14, outline: "none", fontSize: 14 },
  primaryBtn: { width: "100%", padding: 15, border: "none", borderRadius: 14, color: "white", fontWeight: 850, cursor: "pointer", fontSize: 15, marginTop: 8 },
  secondaryBtn: { width: "100%", padding: 13, borderRadius: 14, background: "transparent", fontWeight: 850, cursor: "pointer", marginTop: 10 },
  errorBox: { marginTop: 12, padding: "10px 12px", borderRadius: 12, color: "#b91c1c", background: "#fee2e2", fontSize: 13, fontWeight: 700 },
  checklistLayout: { flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(340px, 0.9fr) minmax(360px, 1.1fr)", gap: 22, overflow: "hidden" },
  quickCalcLayout: { flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(390px, 0.95fr) minmax(430px, 1.05fr)", gap: 22, overflow: "hidden" },
  checklistFormArea: { overflowY: "auto", paddingRight: 6 },
  checklistResultsArea: { overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingRight: 6 },
  checklistGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  checklistTextarea: { width: "100%", minHeight: 92, padding: 12, borderRadius: 12, marginBottom: 14, outline: "none", fontSize: 14, resize: "vertical" },
  emptyChecklist: { borderRadius: 18, minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", opacity: 0.68, padding: 18, fontSize: 14 },
  resultCard: { borderRadius: 18, padding: 16, marginTop: 12 },
  resultTop: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8, fontSize: 14 },
  resultDetail: { margin: "0 0 10px", lineHeight: 1.5, fontSize: 13, opacity: 0.82 },
  resultSuggestion: { marginTop: 12, paddingLeft: 10, lineHeight: 1.5, fontSize: 13, fontWeight: 650 },
  warningBox: { marginTop: 14, borderRadius: 14, padding: 12, fontSize: 12, lineHeight: 1.5, opacity: 0.74 },
  formulaBlock: { borderRadius: 16, padding: 14, background: "rgba(120,120,120,0.08)", margin: "14px 0", overflowX: "auto", fontSize: 14, lineHeight: 1.6 },
  valueRow: { fontSize: 13, lineHeight: 1.45, margin: "6px 0" },
  finalBox: { marginTop: 16, padding: "12px 14px", borderRadius: 14, background: "rgba(120,120,120,0.08)", fontWeight: 850 },
  materialToolbar: { display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center", marginBottom: 18 },
  addMaterialBtn: { border: "none", color: "white", borderRadius: 14, padding: "14px 16px", cursor: "pointer", fontWeight: 850, whiteSpace: "nowrap" },
  addMaterialPanel: { borderRadius: 18, padding: 18, marginBottom: 18, overflowY: "auto", maxHeight: 390 },
  addMaterialGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 },
  addMaterialTextarea: { width: "100%", minHeight: 70, borderRadius: 12, padding: 12, outline: "none", resize: "vertical", marginBottom: 14 },
  materialGrid: { flex: 1, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: 14, paddingRight: 4 },
  materialCard: { borderRadius: 18, padding: 18, lineHeight: 1.45, fontSize: 13 },
  materialHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 },
  customTag: { display: "inline-flex", fontSize: 11, fontWeight: 850, opacity: 0.68 },
  smallDeleteMaterialBtn: { border: "none", color: "#991b1b", background: "#fee2e2", borderRadius: 999, padding: "8px 12px", cursor: "pointer", fontWeight: 850, fontSize: 12, whiteSpace: "nowrap" },
  materialCodes: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12, marginBottom: 12, opacity: 0.82 },
  materialProps: { padding: 10, borderRadius: 12, background: "rgba(120,120,120,0.08)", marginBottom: 10, lineHeight: 1.5 },
  themeGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 },
  themeOption: { padding: 12, borderRadius: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, fontSize: 13, fontWeight: 800, background: "transparent" },
  themeDot: { width: 12, height: 12, borderRadius: "50%" },
  drawingLayout: { flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(380px, 0.95fr) minmax(430px, 1.05fr)", gap: 22, overflow: "hidden" },
  drawingUploadPanel: { borderRadius: 18, padding: 16, marginBottom: 18 },
  drawingUploadGridSingle: { display: "grid", gridTemplateColumns: "1fr", gap: 10, marginTop: 12 },
  drawingUploadBtn: { minHeight: 72, borderRadius: 16, background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, fontWeight: 850, fontSize: 14 },
  drawingFileCard: { display: "flex", alignItems: "flex-start", gap: 10, borderRadius: 16, padding: 12, marginTop: 12 },
  drawingPreviewImage: { width: "100%", maxHeight: 180, objectFit: "contain", borderRadius: 12, marginTop: 10, background: "rgba(120,120,120,0.08)" },
  drawingPreviewPanel: { borderRadius: 18, padding: 16, marginBottom: 12 },
  drawingPreviewTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 },
  previewBadge: { minWidth: 28, height: 28, borderRadius: 999, color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900 },
  realDrawingPreviewBox: { position: "relative", width: "100%", minHeight: 360, maxHeight: 520, borderRadius: 14, overflow: "hidden", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center" },
  realDrawingPreviewImage: { width: "100%", height: "100%", maxHeight: 520, objectFit: "contain", display: "block" },
  noIssuesOverlay: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, opacity: 0.55, pointerEvents: "none", textAlign: "center", padding: 20 },
  issueMarker: { position: "absolute", transform: "translate(-50%, -50%)", width: 26, height: 26, borderRadius: "50%", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 950, fontSize: 15, boxShadow: "0 8px 22px rgba(0,0,0,0.28)", border: "2px solid rgba(255,255,255,0.85)" },
  issueList: { display: "flex", flexDirection: "column", gap: 8 },
  issueRow: { display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, lineHeight: 1.35 },
  issueDot: { width: 9, height: 9, borderRadius: "50%", marginTop: 5, flexShrink: 0 },
  emptyText: { fontSize: 12, opacity: 0.6, padding: 8 },
  quickResultShell: {
  borderRadius: 22,
  padding: 18,
  display: "flex",
  flexDirection: "column",
  gap: 16,
  boxShadow: "0 18px 50px rgba(0,0,0,0.22)",
},

quickHero: {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
  paddingBottom: 14,
  borderBottom: "1px solid rgba(120,120,120,0.18)",
},

quickHeroText: {
  minWidth: 0,
  flex: 1,
},

quickEyebrow: {
  fontSize: 11,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: 0.8,
  opacity: 0.55,
  marginBottom: 6,
},

quickHeroTitle: {
  margin: 0,
  fontSize: 19,
  lineHeight: 1.2,
  fontWeight: 950,
  letterSpacing: -0.4,
},

quickHeroSubtitle: {
  margin: "8px 0 0",
  fontSize: 13,
  lineHeight: 1.55,
  opacity: 0.72,
},

quickOutcomeBadge: {
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

quickMetricsGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 10,
},

quickMetricCard: {
  borderRadius: 18,
  padding: "14px 14px 13px",
  minHeight: 98,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  gap: 8,
},

quickMetricLabel: {
  fontSize: 11,
  fontWeight: 900,
  textTransform: "uppercase",
  opacity: 0.58,
  lineHeight: 1.25,
},

quickMetricValue: {
  fontSize: 22,
  lineHeight: 1.05,
  fontWeight: 950,
  letterSpacing: -0.6,
},

quickMetricSub: {
  fontSize: 11,
  lineHeight: 1.3,
  opacity: 0.55,
},

quickFinalBanner: {
  borderRadius: 20,
  padding: 16,
  display: "flex",
  alignItems: "flex-start",
  gap: 13,
},

quickFinalIcon: {
  width: 32,
  height: 32,
  minWidth: 32,
  borderRadius: "50%",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 950,
  fontSize: 18,
  marginTop: 2,
},

quickFinalTitle: {
  margin: 0,
  fontSize: 18,
  lineHeight: 1.2,
  fontWeight: 950,
},

quickFinalText: {
  margin: "7px 0 0",
  fontSize: 14,
  lineHeight: 1.55,
  fontWeight: 700,
},

quickFinalWarning: {
  margin: "9px 0 0",
  fontSize: 13,
  lineHeight: 1.45,
  fontWeight: 750,
  opacity: 0.86,
},

quickFinalOk: {
  margin: "9px 0 0",
  fontSize: 13,
  lineHeight: 1.45,
  fontWeight: 750,
  opacity: 0.86,
},

quickSectionBadge: {
  borderRadius: 18,
  padding: "13px 15px",
  display: "flex",
  flexDirection: "column",
  gap: 4,
},

quickDetailSection: {
  borderRadius: 18,
  padding: 15,
},

quickDetailTitle: {
  margin: "0 0 12px",
  fontSize: 14,
  fontWeight: 950,
  letterSpacing: -0.2,
},

quickDetailList: {
  display: "flex",
  flexDirection: "column",
  gap: 8,
},

quickStepsBox: {
  borderRadius: 18,
  padding: 15,
},

quickStepsList: {
  display: "flex",
  flexDirection: "column",
  gap: 12,
},

quickStepItem: {
  display: "grid",
  gridTemplateColumns: "28px 1fr",
  gap: 10,
  alignItems: "flex-start",
  fontSize: 13,
  lineHeight: 1.45,
},

quickStepNumber: {
  width: 24,
  height: 24,
  borderRadius: "50%",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  fontWeight: 950,
  marginTop: 2,
},

quickStepText: {
  margin: "4px 0 0",
  fontSize: 13,
  lineHeight: 1.45,
  opacity: 0.78,
},
  
quickDetailRow: {
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
  fontSize: 13,
  lineHeight: 1.45,
  fontWeight: 650,
},

quickDot: {
  width: 7,
  height: 7,
  borderRadius: "50%",
  marginTop: 7,
  flexShrink: 0,
},

quickFormulaSection: {
  borderRadius: 18,
  padding: 15,
},

quickFormulaGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 8,
},

quickFormulaChip: {
  borderRadius: 13,
  padding: "10px 12px",
  fontSize: 13,
  lineHeight: 1.35,
  fontWeight: 800,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
},

  quickSuggestionBox: {
  borderRadius: 18,
  padding: 14,
  display: "flex",
  flexDirection: "column",
  gap: 12,
},

quickSuggestionHeader: {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
},

quickSuggestionKicker: {
  display: "block",
  fontSize: 10,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: 0.7,
  color: "#f97316",
  marginBottom: 4,
},

quickSuggestionTitle: {
  margin: 0,
  fontSize: 16,
  lineHeight: 1.2,
  fontWeight: 950,
},

quickSuggestionBadge: {
  flexShrink: 0,
  borderRadius: 999,
  padding: "7px 11px",
  background: "rgba(249,115,22,0.14)",
  color: "#f97316",
  border: "1px solid rgba(249,115,22,0.55)",
  fontSize: 13,
  fontWeight: 950,
},

quickSuggestionGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 8,
},

quickSuggestionMiniCard: {
  borderRadius: 14,
  padding: "10px 11px",
  background: "rgba(120,120,120,0.08)",
  display: "flex",
  flexDirection: "column",
  gap: 5,
},

quickSuggestionMiniLabel: {
  fontSize: 10,
  fontWeight: 950,
  textTransform: "uppercase",
  opacity: 0.55,
},

quickSuggestionMiniValue: {
  fontSize: 14,
  fontWeight: 950,
  lineHeight: 1.2,
},

quickSuggestionNote: {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.45,
  opacity: 0.68,
},
  

quickNotesBox: {
  borderRadius: 18,
  padding: 15,
},

quickNoteText: {
  margin: "8px 0 0",
  fontSize: 13,
  lineHeight: 1.5,
  fontWeight: 700,
  opacity: 0.82,
},
  projectCreateFixedPanel: { position: "sticky", top: 0, zIndex: 5 },
  projectCreateCompactHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 10 },
  projectCreateCompactGrid: { display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 12, alignItems: "end" },
  projectCreateCompactButton: { width: 190, marginTop: 0, flexShrink: 0 },
  projectLayout: { flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(300px, 0.72fr) minmax(520px, 1.28fr)", gap: 18, overflow: "hidden" },
  projectLeft: { overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, paddingRight: 4 },
  projectRight: { overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, paddingRight: 6 },
  projectPanel: { borderRadius: 20, padding: 16, boxShadow: "0 12px 34px rgba(0,0,0,0.10)" },
  projectToolButton: { width: "100%", textAlign: "left", borderRadius: 16, padding: 14, marginTop: 10, cursor: "pointer", display: "flex", flexDirection: "column", gap: 5, fontWeight: 800 },
  projectTitle: { margin: "0 0 12px", fontSize: 16, fontWeight: 950, letterSpacing: -0.3 },
  projectListItem: { borderRadius: 16, padding: 10, display: "flex", alignItems: "center", gap: 10, marginBottom: 8 },
  projectListMain: { flex: 1, minWidth: 0, background: "transparent", border: "none", textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: 3, color: "inherit" },
  projectHeaderCard: { borderRadius: 16, padding: 14, background: "rgba(120,120,120,0.10)", display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 },
  projectSavedItem: { borderRadius: 16, padding: 14, marginBottom: 10 },
  projectMiniCard: { borderRadius: 16, padding: 12, marginTop: 10, display: "flex", flexDirection: "column", gap: 4, fontSize: 13 },
  projectStatsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
    gap: 8,
    marginBottom: 12,
  },
  projectStatCard: {
    borderRadius: 14,
    padding: "10px 8px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    textAlign: "center",
    fontSize: 12,
    fontWeight: 850,
  },
  projectActionGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginBottom: 12,
  },
  projectTabs: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    margin: "12px 0",
  },
  projectTabBtn: {
    borderRadius: 999,
    padding: "8px 11px",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  projectMemoryIntro: {
    borderRadius: 16,
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 5,
    fontSize: 13,
    lineHeight: 1.45,
    marginBottom: 12,
  },
  projectDecisionBox: {
    borderRadius: 18,
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginBottom: 12,
  },
  projectMiniTextarea: {
    width: "100%",
    minHeight: 90,
    borderRadius: 14,
    padding: "11px 12px",
    outline: "none",
    resize: "vertical",
    fontSize: 14,
    lineHeight: 1.5,
  },
  projectInlineDataGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: 8,
    marginTop: 10,
    fontSize: 12,
    fontWeight: 850,
    opacity: 0.82,
  },


};
