type ErrorTrackingLevel = "error" | "warning" | "info";

type ErrorTrackingPayload = {
  level: ErrorTrackingLevel;
  message: string;
  source: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  url?: string;
  userAgent?: string;
  timestamp: string;
  extra?: Record<string, unknown>;
};

let installed = false;

function normalizeErrorMessage(value: unknown) {
  if (value instanceof Error) return value.message;
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeErrorStack(value: unknown) {
  if (value instanceof Error) return value.stack;
  if (typeof value === "object" && value && "stack" in value) {
    return String((value as { stack?: unknown }).stack || "");
  }

  return undefined;
}

async function sendError(payload: ErrorTrackingPayload) {
  try {
    await fetch("/api/error-track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Non bloccare mai l'app per un errore del tracking.
  }
}

export function trackError(
  error: unknown,
  source = "manual",
  extra?: Record<string, unknown>,
  level: ErrorTrackingLevel = "error"
) {
  const payload: ErrorTrackingPayload = {
    level,
    message: normalizeErrorMessage(error) || "Errore sconosciuto",
    source,
    stack: normalizeErrorStack(error),
    url: typeof window !== "undefined" ? window.location.href : undefined,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    timestamp: new Date().toISOString(),
    extra,
  };

  void sendError(payload);
}

export function initErrorTracking() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (event) => {
    const payload: ErrorTrackingPayload = {
      level: "error",
      message: event.message || normalizeErrorMessage(event.error),
      source: "window.error",
      stack: normalizeErrorStack(event.error),
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };

    void sendError(payload);
  });

  window.addEventListener("unhandledrejection", (event) => {
    const payload: ErrorTrackingPayload = {
      level: "error",
      message: normalizeErrorMessage(event.reason) || "Promise rejection non gestita",
      source: "window.unhandledrejection",
      stack: normalizeErrorStack(event.reason),
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };

    void sendError(payload);
  });
}
