import React, { useEffect, useRef, useState } from "react";
import type { AuthError, Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";
import {
  RESET_PASSWORD_PATH,
  MIN_PASSWORD_LENGTH,
  initialRecoveryUrl,
  markRecoverySessionVerified,
  isVerifiedRecoverySession,
  clearRecoveryMarker,
} from "../../lib/passwordRecovery";
import { THEMES } from "../../constants/appConstants";
import { globalCss } from "../../styles/globalCss";
import { s } from "../../styles/appStyles";

type ScreenStatus = "verifying" | "ready" | "invalid" | "expired" | "success";

const theme = THEMES[1];
const isDark = theme.bg === "#050505";

const WEAK_PASSWORD_REASONS: Record<string, string> = {
  length: "è troppo corta",
  characters: "non contiene tutti i tipi di carattere richiesti (es. maiuscole, minuscole, numeri, simboli)",
  pwned: "risulta tra le password compromesse note",
};

function describeUpdateError(error: AuthError): { message: string; linkExpired: boolean } {
  const code = (error as AuthError & { code?: string }).code;
  const reasons = (error as AuthError & { reasons?: string[] }).reasons;

  if (code === "same_password") {
    return { message: "La nuova password deve essere diversa da quella attuale.", linkExpired: false };
  }
  if (code === "weak_password") {
    const details = (reasons || []).map(r => WEAK_PASSWORD_REASONS[r]).filter(Boolean);
    return {
      message: details.length
        ? `La password non rispetta i requisiti di sicurezza: ${details.join("; ")}.`
        : "La password non rispetta i requisiti di sicurezza configurati.",
      linkExpired: false,
    };
  }
  if (code === "session_not_found" || code === "session_expired" || code === "bad_jwt" || error.status === 401 || error.status === 403) {
    return { message: "La sessione di recupero è scaduta. Richiedi un nuovo link.", linkExpired: true };
  }
  if (code === "over_request_rate_limit" || error.status === 429) {
    return { message: "Troppi tentativi. Attendi qualche minuto e riprova.", linkExpired: false };
  }
  return { message: error.message || "Impossibile aggiornare la password. Riprova.", linkExpired: false };
}

// Rimuove token, codici ed errori dalla barra degli indirizzi e dalla cronologia.
function cleanAddressBar() {
  try {
    window.history.replaceState(window.history.state, "", RESET_PASSWORD_PATH);
  } catch {
    // ignorato
  }
}

async function verifyRecoveryLink(): Promise<{ status: ScreenStatus; error?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return { status: "invalid", error: "Servizio di autenticazione non configurato." };
  }

  const info = initialRecoveryUrl;

  // getSession() attende la fine dell'inizializzazione del client, che per il
  // flusso implicito ha già letto l'hash ed emesso PASSWORD_RECOVERY.
  const { data: initial } = await supabase.auth.getSession();
  let session: Session | null = initial.session;

  if (info.errorCode) {
    const expired = /expired|otp_expired|access_denied/i.test(`${info.errorCode} ${info.errorDescription || ""}`);
    return expired ? { status: "expired" } : { status: "invalid" };
  }

  // 1) Template email con token_hash (consigliato): verifica esplicita.
  if (info.tokenHash) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: info.tokenHash, type: "recovery" });
    if (error || !data.session) return { status: "expired" };
    markRecoverySessionVerified(data.session);
    return { status: "ready" };
  }

  // 2) Flusso PKCE: se il client ha già scambiato il codice durante l'init ha
  //    emesso PASSWORD_RECOVERY (marcatore presente); altrimenti lo scambiamo noi.
  if (info.code) {
    if (isVerifiedRecoverySession(session)) return { status: "ready" };
    const { data, error } = await supabase.auth.exchangeCodeForSession(info.code);
    if (error || !data.session) return { status: "expired" };
    session = data.session;
    markRecoverySessionVerified(session);
    return { status: "ready" };
  }

  // 3) Flusso implicito (default del progetto): #access_token=...&type=recovery.
  //    supabase-js valida i token ed emette PASSWORD_RECOVERY: ci fidiamo solo
  //    di quell'evento, non della semplice presenza di una sessione.
  if (info.hasImplicitTokens && info.hasRecoveryType) {
    return isVerifiedRecoverySession(session) ? { status: "ready" } : { status: "expired" };
  }

  // 4) Pagina ricaricata dopo una verifica valida in questa stessa scheda.
  if (isVerifiedRecoverySession(session)) return { status: "ready" };

  // Nessun link valido: una sessione ordinaria non autorizza il cambio password.
  return { status: "invalid" };
}

export default function ResetPasswordPage() {
  const [status, setStatus] = useState<ScreenStatus>("verifying");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    // Evita la doppia verifica in StrictMode (verifyOtp è monouso).
    if (startedRef.current) return;
    startedRef.current = true;

    verifyRecoveryLink()
      .then(result => {
        setStatus(result.status);
        if (result.error) setError(result.error);
      })
      .catch(() => setStatus("invalid"))
      .finally(cleanAddressBar);
  }, []);

  const goToLogin = () => {
    window.location.assign("/");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!supabase) { setError("Servizio di autenticazione non configurato."); return; }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`La password deve essere di almeno ${MIN_PASSWORD_LENGTH} caratteri.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Le due password non coincidono.");
      return;
    }

    setSubmitting(true);
    try {
      // Ricontrollo al momento dell'invio: la sessione deve essere quella di recupero.
      const { data: { session } } = await supabase.auth.getSession();
      if (!isVerifiedRecoverySession(session)) {
        setStatus("expired");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        const { message, linkExpired } = describeUpdateError(updateError);
        if (linkExpired) { clearRecoveryMarker(); setStatus("expired"); }
        setError(message);
        return;
      }

      clearRecoveryMarker();
      setPassword("");
      setConfirmPassword("");
      // Chiude la sessione di recupero su questo dispositivo: l'utente accederà
      // con la nuova password dalla normale schermata di login.
      await supabase.auth.signOut({ scope: "local" });
      setStatus("success");
    } catch {
      setError("Errore di rete. Controlla la connessione e riprova.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    ...s.input,
    background: isDark ? "#050505" : "#fff",
    color: theme.text,
    border: `1px solid ${theme.border}`,
    paddingRight: 84,
    marginBottom: 0,
  };

  const toggleStyle: React.CSSProperties = {
    position: "absolute",
    right: 8,
    top: "50%",
    transform: "translateY(-50%)",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: theme.primary,
    fontSize: 12,
    fontWeight: 700,
    padding: "6px 8px",
  };

  const successBox: React.CSSProperties = { ...s.errorBox, color: "#15803d", background: "#dcfce7" };
  const mutedText: React.CSSProperties = { fontSize: 14, lineHeight: 1.5, opacity: 0.75, margin: "0 0 18px" };

  const renderPasswordField = (label: string, value: string, onChange: (v: string) => void, autoComplete: string) => (
    <div style={{ marginBottom: 14 }}>
      <label style={s.label}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          style={inputStyle}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete={autoComplete}
          minLength={MIN_PASSWORD_LENGTH}
          required
          disabled={submitting}
        />
        <button
          type="button"
          style={toggleStyle}
          onClick={() => setShowPassword(v => !v)}
          aria-label={showPassword ? "Nascondi password" : "Mostra password"}
        >
          {showPassword ? "Nascondi" : "Mostra"}
        </button>
      </div>
    </div>
  );

  const renderBody = () => {
    if (status === "verifying") {
      return <p style={mutedText}>Verifica del link di recupero in corso...</p>;
    }

    if (status === "invalid" || status === "expired") {
      return (
        <>
          <div style={s.errorBox}>
            {status === "expired"
              ? "Il link di recupero è scaduto o è già stato utilizzato."
              : error || "Il link di recupero non è valido."}
          </div>
          <p style={{ ...mutedText, marginTop: 14 }}>
            Richiedi un nuovo link dalla schermata di accesso con «Password dimenticata?».
          </p>
          <button type="button" style={{ ...s.primaryBtn, background: theme.primary }} onClick={goToLogin}>
            Torna al login
          </button>
        </>
      );
    }

    if (status === "success") {
      return (
        <>
          <div style={successBox}>Password aggiornata correttamente.</div>
          <p style={{ ...mutedText, marginTop: 14 }}>Ora puoi accedere a TechAI con la nuova password.</p>
          <button type="button" style={{ ...s.primaryBtn, background: theme.primary }} onClick={goToLogin}>
            Vai al login
          </button>
        </>
      );
    }

    return (
      <form onSubmit={handleSubmit} noValidate>
        <p style={mutedText}>Scegli una nuova password (minimo {MIN_PASSWORD_LENGTH} caratteri).</p>
        {renderPasswordField("Nuova password", password, setPassword, "new-password")}
        {renderPasswordField("Conferma nuova password", confirmPassword, setConfirmPassword, "new-password")}

        {error && <div style={s.errorBox}>{error}</div>}

        <button
          type="submit"
          style={{ ...s.primaryBtn, background: theme.primary, opacity: submitting ? 0.7 : 1 }}
          disabled={submitting}
        >
          {submitting ? "Attendere..." : "Aggiorna password"}
        </button>
        <button
          type="button"
          style={{ ...s.secondaryBtn, color: theme.text, border: `1px solid ${theme.border}`, fontSize: 14, opacity: 0.75 }}
          onClick={goToLogin}
          disabled={submitting}
        >
          Annulla e torna al login
        </button>
      </form>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, color: theme.text }}>
      <style>{globalCss}</style>
      <div style={{ ...s.loginScreen, background: theme.bg }}>
        <div
          className="slide-in"
          style={{ ...s.loginCard, background: isDark ? "#111" : "#fff", color: theme.text, border: `1px solid ${theme.border}` }}
        >
          <div style={{ ...s.logoWrap, marginBottom: 18 }}>
            <div style={{ ...s.logoMark, background: theme.primary }}>T</div>
            <div style={s.logoText}>TECH<span style={{ color: theme.primary }}>AI</span></div>
          </div>
          <h1 style={{ fontSize: 24, margin: "0 0 10px" }}>Imposta una nuova password</h1>
          {renderBody()}
        </div>
      </div>
    </div>
  );
}
