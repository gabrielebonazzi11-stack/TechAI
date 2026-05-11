export type Role = "utente" | "AI";
export type IssueSeverity = "errore" | "attenzione" | "info";

export type Theme = {
  name: string;
  primary: string;
  bg: string;
  surface: string;
  text: string;
  border: string;
};

export type FileAttachment = {
  name: string;
  type: string;
  size: number;
};

export type PendingFile = {
  file: File;
  fileAttachment: FileAttachment;
};

export type Message = {
  role: Role;
  text: string;
  fileAttachment?: FileAttachment;
};

export type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
};

export type UserProfile = {
  name: string;
  email: string;
};
