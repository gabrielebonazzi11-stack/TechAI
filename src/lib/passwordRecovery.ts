// Supporto al flusso di recupero password (Supabase Auth).
//
// IMPORTANTE: questo modulo viene importato da supabaseClient.ts PRIMA che il
// client Supabase venga creato. In questo modo fotografiamo l'URL con cui è
// stata aperta la pagina prima che supabase-js legga e ripulisca l'hash
// (#access_token=...&type=recovery). Nessun token viene mai scritto nei log.

import type { Session } from "@supabase/supabase-js";

export const RESET_PASSWORD_PATH = "/reset-password";

// Dominio web di produzione: usato quando la richiesta parte dall'app desktop
// (Tauri), dove window.location.origin non è un indirizzo raggiungibile dal
// browser in cui l'utente aprirà l'email.
export const PRODUCTION_WEB_ORIGIN = "https://www.onegearai.com";

// Requisito minimo lato client, allineato alla registrazione esistente.
// I requisiti aggiuntivi configurati su Supabase vengono comunque applicati
// dal server (errore "weak_password").
export const MIN_PASSWORD_LENGTH = 6;

const RECOVERY_MARKER_KEY = "techai_password_recovery";
const RECOVERY_MARKER_MAX_AGE_MS = 60 * 60 * 1000; // 1 ora

export type RecoveryUrlInfo = {
  isRecoveryPath: boolean;
  hasRecoveryType: boolean;
  hasImplicitTokens: boolean;
  tokenHash: string | null;
  code: string | null;
  errorCode: string | null;
  errorDescription: string | null;
};

const isBrowser = typeof window !== "undefined";

export const IS_DESKTOP_RUNTIME = isBrowser && "__TAURI_INTERNALS__" in window;

function captureRecoveryUrl(): RecoveryUrlInfo {
  const empty: RecoveryUrlInfo = {
    isRecoveryPath: false,
    hasRecoveryType: false,
    hasImplicitTokens: false,
    tokenHash: null,
    code: null,
    errorCode: null,
    errorDescription: null,
  };

  if (!isBrowser) return empty;

  try {
    const url = new URL(window.location.href);
    const query = url.searchParams;
    const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
    const pick = (key: string) => hash.get(key) ?? query.get(key);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    return {
      isRecoveryPath: path === RESET_PASSWORD_PATH,
      hasRecoveryType: pick("type") === "recovery",
      hasImplicitTokens: hash.has("access_token") && hash.has("refresh_token"),
      tokenHash: query.get("token_hash"),
      code: query.get("code"),
      errorCode: pick("error_code") ?? pick("error"),
      errorDescription: pick("error_description"),
    };
  } catch {
    return empty;
  }
}

// Fotografia dell'URL iniziale (valutata una sola volta, al caricamento).
export const initialRecoveryUrl: RecoveryUrlInfo = captureRecoveryUrl();

// La schermata di reset va mostrata sul percorso dedicato oppure quando un
// link di recupero atterra comunque sul sito (es. fallback alla Site URL).
export const shouldShowResetPasswordScreen =
  initialRecoveryUrl.isRecoveryPath || initialRecoveryUrl.hasRecoveryType;

export function getPasswordResetRedirectUrl(): string {
  if (!isBrowser || IS_DESKTOP_RUNTIME || !/^https?:$/.test(window.location.protocol)) {
    return `${PRODUCTION_WEB_ORIGIN}${RESET_PASSWORD_PATH}`;
  }
  return `${window.location.origin}${RESET_PASSWORD_PATH}`;
}

// ---------------------------------------------------------------------------
// Marcatore della sessione di recupero verificata.
// Una sessione ordinaria NON basta per cambiare password da questa schermata:
// serve che la sessione corrente sia proprio quella nata dalla verifica del
// link (evento PASSWORD_RECOVERY, verifyOtp o scambio del codice PKCE).
// Il marcatore contiene solo identificativi non segreti (user id e session id).
// ---------------------------------------------------------------------------

type RecoveryMarker = { uid: string; sid: string | null; at: number };

let inMemoryMarker: RecoveryMarker | null = null;

function readSessionId(session: Session): string | null {
  try {
    const payload = session.access_token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const claims = JSON.parse(atob(padded)) as { session_id?: unknown };
    return typeof claims.session_id === "string" ? claims.session_id : null;
  } catch {
    return null;
  }
}

export function markRecoverySessionVerified(session: Session | null) {
  if (!session?.user?.id) return;
  const marker: RecoveryMarker = { uid: session.user.id, sid: readSessionId(session), at: Date.now() };
  inMemoryMarker = marker;
  try {
    sessionStorage.setItem(RECOVERY_MARKER_KEY, JSON.stringify(marker));
  } catch {
    // sessionStorage non disponibile: resta valido il marcatore in memoria.
  }
}

export function isVerifiedRecoverySession(session: Session | null): boolean {
  if (!session?.user?.id) return false;

  let marker = inMemoryMarker;
  if (!marker) {
    try {
      const raw = sessionStorage.getItem(RECOVERY_MARKER_KEY);
      marker = raw ? (JSON.parse(raw) as RecoveryMarker) : null;
    } catch {
      marker = null;
    }
  }

  if (!marker) return false;
  if (Date.now() - marker.at > RECOVERY_MARKER_MAX_AGE_MS) return false;
  if (marker.uid !== session.user.id) return false;

  const currentSid = readSessionId(session);
  if (marker.sid && currentSid && marker.sid !== currentSid) return false;

  return true;
}

export function clearRecoveryMarker() {
  inMemoryMarker = null;
  try {
    sessionStorage.removeItem(RECOVERY_MARKER_KEY);
  } catch {
    // ignorato
  }
}
