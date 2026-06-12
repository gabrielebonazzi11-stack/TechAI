import type { Theme, UserProfile } from "../types/appTypes";

export const THEMES: Theme[] = [
  {
    name: "Industrial Blue",
    primary: "#3b82f6",
    bg: "#f8fafc",
    surface: "#eff6ff",
    text: "#1e293b",
    border: "#dbeafe",
  },
  {
    name: "Dark Black",
    primary: "#60a5fa",
    bg: "#050505",
    surface: "#111111",
    text: "#f8fafc",
    border: "#262626",
  },
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
