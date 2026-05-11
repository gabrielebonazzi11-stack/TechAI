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
