import React from "react";
import type { FileAttachment, ProjectRecord, ProjectSavedItem } from "../types/appTypes";

export function createId(prefix = "id"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function formatDate(value: string | number | Date): string {
  return new Date(value).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function bytesToKb(bytes: number): string {
  return (bytes / 1024).toFixed(1);
}

export function getFileExtension(fileName: string): string {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "unknown";
}

export function truncateText(text: string, max = 120): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

export function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function safeParseJson<T>(value: string | null, fallback: T): T {
  return safeJsonParse(value, fallback);
}

export function makeAttachment(file: File): FileAttachment {
  return {
    name: file.name || "file",
    type: file.type || "sconosciuto",
    size: file.size || 0,
  };
}

export function projectMemoryBucketFromType(type: ProjectSavedItem["type"]) {
  if (type === "chat") return "chats" as const;
  if (type === "file" || type === "document") return "documents" as const;
  if (type === "drawing") return "drawings" as const;
  if (type === "material") return "materials" as const;
  if (type === "decision") return "decisions" as const;
  if (type === "revision") return "revisions" as const;
  if (type === "note") return "notes" as const;

  return "verifications" as const;
}

export function normalizeProjectRecord(rawProject: any): ProjectRecord {
  const items: ProjectSavedItem[] = Array.isArray(rawProject?.items) ? rawProject.items : [];

  const byType = (types: ProjectSavedItem["type"][]) =>
    items.filter((item) => types.includes(item.type));

  return {
    id: String(rawProject?.id || createId("project")),
    name: String(rawProject?.name || "Nuovo progetto"),
    description: String(rawProject?.description || ""),
    createdAt: String(rawProject?.createdAt || new Date().toISOString()),
    updatedAt: String(rawProject?.updatedAt || rawProject?.createdAt || new Date().toISOString()),
    items,
    chats: Array.isArray(rawProject?.chats) ? rawProject.chats : byType(["chat"]),
    documents: Array.isArray(rawProject?.documents) ? rawProject.documents : byType(["file", "document"]),
    drawings: Array.isArray(rawProject?.drawings) ? rawProject.drawings : byType(["drawing"]),
    materials: Array.isArray(rawProject?.materials) ? rawProject.materials : byType(["material"]),
    verifications: Array.isArray(rawProject?.verifications)
      ? rawProject.verifications
      : byType(["checklist", "quickcalc", "calculation", "bom", "solidworks", "advanced", "verification"]),
    decisions: Array.isArray(rawProject?.decisions) ? rawProject.decisions : byType(["decision"]),
    revisions: Array.isArray(rawProject?.revisions) ? rawProject.revisions : byType(["revision"]),
    notes: Array.isArray(rawProject?.notes) ? rawProject.notes : byType(["note"]),
  };
}

export function normalizeProjectRecords(rawProjects: any): ProjectRecord[] {
  if (!Array.isArray(rawProjects)) return [];
  return rawProjects.map(normalizeProjectRecord);
}

export function renderInlineMarkdown(text: string): React.ReactNode {
  const parts = String(text || "").split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return React.createElement("strong", { key: index }, part.slice(2, -2));
    }

    return part.replace(/\*\*/g, "");
  });
}

