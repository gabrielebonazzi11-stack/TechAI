// FILE: api/_lib/config.ts
// Configurazione di deployment condivisa tra cloud (Vercel) e on-premise (server Node).
// Nessuna dipendenza Node-specifica: deve restare compatibile con il runtime Edge di Vercel.

export type DeploymentMode = "cloud" | "onprem";

export function getDeploymentMode(): DeploymentMode {
  return String(process.env.DEPLOYMENT_MODE || "").trim().toLowerCase() === "onprem"
    ? "onprem"
    : "cloud";
}

export function readEnv(name: string): string {
  return String(process.env[name] || "").trim();
}

export function readNumberEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
