// Deve restare il PRIMO import: fotografa l'URL del link di recupero password
// prima che il client Supabase legga e ripulisca l'hash.
import { markRecoverySessionVerified } from "./passwordRecovery";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

// Registrato subito dopo la creazione del client, così l'evento PASSWORD_RECOVERY
// emesso durante l'inizializzazione (lettura del link) non viene perso.
// Il callback è sincrono: nessuna chiamata a Supabase al suo interno.
supabase?.auth.onAuthStateChange((event, session) => {
  if (event === "PASSWORD_RECOVERY") markRecoverySessionVerified(session);
});
