import { useEffect, useState } from "react";
import type { Update } from "@tauri-apps/plugin-updater";

type Stato = "nascosto" | "disponibile" | "download" | "errore";

export default function UpdateChecker() {
  const [stato, setStato] = useState<Stato>("nascosto");
  const [versione, setVersione] = useState("");
  const [progresso, setProgresso] = useState(0);
  const [update, setUpdate] = useState<Update | null>(null);

  useEffect(() => {
    // Solo nell'app desktop Tauri, mai nella versione web
    if (!("__TAURI_INTERNALS__" in window)) return;

    const timer = setTimeout(async () => {
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const trovato = await check();
        if (trovato) {
          setUpdate(trovato);
          setVersione(trovato.version);
          setStato("disponibile");
        }
      } catch (e) {
        console.error("Controllo aggiornamenti fallito:", e);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const installa = async () => {
    if (!update) return;
    try {
      setStato("download");
      let totale = 0;
      let scaricato = 0;
      await update.downloadAndInstall((evento) => {
        if (evento.event === "Started") {
          totale = evento.data.contentLength ?? 0;
        } else if (evento.event === "Progress") {
          scaricato += evento.data.chunkLength;
          if (totale > 0) setProgresso(Math.round((scaricato / totale) * 100));
        }
      });
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch (e) {
      console.error("Aggiornamento fallito:", e);
      setStato("errore");
    }
  };

  if (stato === "nascosto") return null;

  const box: React.CSSProperties = {
    position: "fixed",
    right: 16,
    bottom: 16,
    zIndex: 9999,
    background: "#ffffff",
    color: "#1a1a1a",
    border: "1px solid #d0d0d0",
    borderRadius: 10,
    padding: "12px 16px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
    fontSize: 14,
    maxWidth: 320,
  };

  const bottone: React.CSSProperties = {
    marginTop: 8,
    marginRight: 8,
    padding: "6px 12px",
    borderRadius: 6,
    border: "1px solid #999",
    background: "#f5f5f5",
    color: "#1a1a1a",
    cursor: "pointer",
  };

  return (
    <div style={box}>
      {stato === "disponibile" && (
        <>
          <div>🔄 È disponibile la versione {versione} di TechAI.</div>
          <button style={bottone} onClick={installa}>Aggiorna ora</button>
          <button style={bottone} onClick={() => setStato("nascosto")}>Più tardi</button>
        </>
      )}
      {stato === "download" && (
        <div>⬇️ Aggiornamento in corso… {progresso}%</div>
      )}
      {stato === "errore" && (
        <>
          <div>⚠️ Aggiornamento non riuscito. Riprova più tardi.</div>
          <button style={bottone} onClick={() => setStato("nascosto")}>Chiudi</button>
        </>
      )}
    </div>
  );
}