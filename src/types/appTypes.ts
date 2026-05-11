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

export type ChecklistStatus = "✅ Conforme" | "⚠️ Da verificare" | "❌ Errore critico";

export type ChecklistForm = {
  componentType: string;
  material: string;
  load: string;
  environment: string;
  machining: string;
  safetyFactor: string;
  tolerances: string;
  roughness: string;
  notes: string;
};

export type ChecklistResult = {
  area: string;
  status: ChecklistStatus;
  detail: string;
  suggestion: string;
};

export type QuickCalcForm = {
  componentType: string;
  verificationType: string;
  sectionType: string;
  material: string;
  axialLoad: string;
  shearLoad: string;
  bendingMoment: string;
  torque: string;
  distance: string;
  diameter: string;
  outerDiameter: string;
  innerDiameter: string;
  base: string;
  height: string;
  outerBase: string;
  outerHeight: string;
  innerBase: string;
  innerHeight: string;
  pressure: string;
  radius: string;
  thickness: string;
  sigmaX: string;
  sigmaY: string;
  tauXY: string;
  sigmaMax: string;
  sigmaMin: string;
  fatigueLimit: string;
  safetyFactorRequired: string;
};

export type QuickCalcResult = {
  title: string;
  scheme: string;
  section: string;
  formulas: string[];
  sectionValues: string[];
  values: string[];
  equivalentStress: number;
  trescaStress?: number;
  safetyFactor: number;
  outcome: "OK" | "NON OK";
  notes: string[];
};

export type DrawingUpload = {
  file: File;
  fileAttachment: FileAttachment;
  previewUrl?: string;
  convertedFile?: File;
  isPdf?: boolean;
  totalPages?: number;
};

export type DrawingIssue = {
  id: string;
  label: string;
  severity: IssueSeverity;
  x: number;
  y: number;
  detail: string;
};

export type DrawingResult = {
  category: string;
  status: string;
  item: string;
  reason: string;
  suggestion: string;
};

export type DrawingForm = {
  partName: string;
  partType: string;
  material: string;
  manufacturing: string;
  mainFeatures: string;
  functionalSurfaces: string;
  holesThreads: string;
  fits: string;
  tolerances: string;
  roughness: string;
  assemblyFunction: string;
  productionQuantity: string;
};

export type ProjectItemType = "checklist" | "quickcalc" | "drawing" | "file" | "bom" | "solidworks" | "advanced";

export type ProjectSavedItem = {
  id: string;
  type: ProjectItemType;
  title: string;
  createdAt: string;
  summary: string;
  payload?: unknown;
};

export type ProjectRecord = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  items: ProjectSavedItem[];
};

export type ProjectFileMeta = {
  name: string;
  type: string;
  sizeKb: string;
  extension: string;
  category: string;
  note: string;
};

export type SeriousVerificationForm = {
  mode: "fatigue" | "contact" | "bolts";
  material: string;
  rm: string;
  re: string;
  sn: string;
  sigmaMax: string;
  sigmaMin: string;
  normalLoad: string;
  contactArea: string;
  contactDiameter: string;
  contactLength: string;
  boltClass: string;
  boltSize: string;
  boltArea: string;
  boltCount: string;
  shearForce: string;
  tensileForce: string;
};

export type SeriousVerificationResult = {
  title: string;
  status: "OK" | "NON OK" | "DA VERIFICARE";
  rows: string[];
  suggestions: string[];
};

export type BomIssue = {
  row: number;
  severity: IssueSeverity;
  message: string;
  suggestion: string;
};

export type SectionData = {
  name: string;
  A: number;
  Jf: number;
  Wf: number;
  Jp: number;
  Wt: number;
  shearFactor: number;
  values: string[];
  notes: string[];
};
