import { STORAGE_KEY_BASE } from "../constants/appConstants";
import { safeJsonParse } from "./appHelpers";

export function buildScopedStorageKey(userId?: string | null): string {
  return `${STORAGE_KEY_BASE}_${userId || "guest"}`;
}

export function loadScopedData<T>(userId: string | null | undefined, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  const key = buildScopedStorageKey(userId);
  return safeJsonParse<T>(localStorage.getItem(key), fallback);
}

export function saveScopedData<T>(userId: string | null | undefined, data: T): void {
  if (typeof window === "undefined") return;

  const key = buildScopedStorageKey(userId);
  localStorage.setItem(key, JSON.stringify(data));
}

export function removeScopedData(userId?: string | null): void {
  if (typeof window === "undefined") return;

  const key = buildScopedStorageKey(userId);
  localStorage.removeItem(key);
}

export function makeUserStorageKey(email: string): string {
  const cleanEmail = String(email || "utente")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._-]/g, "_");

  return `${STORAGE_KEY_BASE}:user:${cleanEmail}`;
}

export function makeGuestStorageKey(guestId: string): string {
  const cleanGuestId = String(guestId || "guest")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_");

  return `${STORAGE_KEY_BASE}:guest:${cleanGuestId}`;
}


