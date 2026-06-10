

import type { Theme, UserProfile } from "../types/appTypes";

export const THEMES: Theme[] = [
  { name: "Industrial Blue", primary: "#3b82f6", bg: "#f8fafc", surface: "#eff6ff", text: "#1e293b", border: "#dbeafe" },
  { name: "Slate Grey", primary: "#475569", bg: "#f1f5f9", surface: "#e2e8f0", text: "#1e293b", border: "#cbd5e1" },
  { name: "Forest Green", primary: "#22c55e", bg: "#f0fdf4", surface: "#dcfce7", text: "#14532d", border: "#bbf7d0" },
  { name: "Deep Burgundy", primary: "#dc2626", bg: "#fef2f2", surface: "#fee2e2", text: "#7f1d1d", border: "#fecaca" },
  { name: "Sandstone", primary: "#a8a29e", bg: "#fafaf9", surface: "#f5f5f4", text: "#44403c", border: "#e7e5e4" },
  { name: "Dark Black", primary: "#60a5fa", bg: "#050505", surface: "#111111", text: "#f8fafc", border: "#262626" },
  { name: "Black Red", primary: "#ef4444", bg: "#050505", surface: "#111111", text: "#ef4444", border: "#262626" },
  { name: "Black Green", primary: "#22c55e", bg: "#050505", surface: "#111111", text: "#22c55e", border: "#262626" },
];

export const STORAGE_KEY_BASE = "techai_stable_app_v7_scoped";
export const GUEST_ID_KEY = "techai_guest_id";
export const GUEST_USED_KEY = "techai_guest_used";
export const GUEST_LIMIT = 10;
export const GUEST_FILE_LIMIT = 1;

export const DEFAULT_USER: UserProfile = {
  name: "Utente",
  email: "utente@techai.local",
};

