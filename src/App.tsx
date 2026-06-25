import React, { useEffect, useMemo, useRef, useState } from "react";
import { MATERIALS_DB, MaterialInfo } from "./data/materials";
import MaterialsLibrary from "./components/MaterialsLibrary";
import ProjectsModal from "./components/projects/ProjectsModal";
import ComponentCalculatorModal from "./components/ComponentCalculatorModal";
import { Modal, Field, ResultCard, QuickCalcCard, FileCard, DrawingResultCard, DrawingPreview } from "./components/common/AppUiComponents";
import { isImageFile, isPdfFile, isDrawingUpload, makeDrawingImagesFromImageFile, pdfPageToImageFile, compressImageForVision, extractPdfText } from "./utils/technicalDrawingUtils";
import { supabase, isSupabaseConfigured } from "./lib/supabaseClient";
import { THEMES, STORAGE_KEY_BASE, GUEST_ID_KEY, GUEST_USED_KEY, GUEST_LIMIT, GUEST_FILE_LIMIT, DEFAULT_USER } from "./constants/appConstants";
import { createId, makeAttachment, projectMemoryBucketFromType, normalizeProjectRecord, normalizeProjectRecords, safeParseJson, renderInlineMarkdown } from "./utils/appHelpers";
import { makeUserStorageKey, makeGuestStorageKey } from "./utils/storage";
import { toNumber } from "./utils/numberUtils";
import { globalCss } from "./styles/globalCss";
import { s } from "./styles/appStyles";
import katex from "katex";
import type {

  
  
  UserProfile,
  PendingFile,
  Message,
  ChatSession,
  ChecklistForm,
  ChecklistResult,
  QuickCalcForm,
  QuickCalcResult,
  DrawingUpload,
  DrawingIssue,
  DrawingResult,
  DrawingForm,
  ProjectSavedItem,
  ProjectMemoryTab,
  ProjectRecord,
  ProjectFileMeta,
  BomIssue,
  SectionData

} from "./types/appTypes";

  export default function App() {
  const [query, setQuery] = useState("");
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);

  const [showLoginPanel, setShowLoginPanel] = useState(false);
  const [loginDismissed, setLoginDismissed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [showQuickCalc, setShowQuickCalc] = useState(false);
  const [showComponentCalculator, setShowComponentCalculator] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);
  const [showDrawingGenerator, setShowDrawingGenerator] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [projectToolView, setProjectToolView] = useState<"memory" | "revisions" | "bom">("memory");
  const [projectSearch, setProjectSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("Aspetto");

  const [user, setUser] = useState<UserProfile>(DEFAULT_USER);
  const [loginEmail, setLoginEmail] = useState(DEFAULT_USER.email);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginName, setLoginName] = useState("");
  const [loginError, setLoginError] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [guestUsed, setGuestUsed] = useState(0);
  const [activeStorageKey, setActiveStorageKey] = useState("");
  const [storageReady, setStorageReady] = useState(false);

  const [theme, setTheme] = useState(THEMES[1]);
  const [interest, setInterest] = useState("Ingegneria Meccanica");

  const [customMaterials, setCustomMaterials] = useState<MaterialInfo[]>([]);

  const [checklistForm, setChecklistForm] = useState<ChecklistForm>({
    componentType: "",
    material: "",
    load: "",
    environment: "",
    machining: "",
    safetyFactor: "",
    tolerances: "",
    roughness: "",
    notes: "",
  });
  const [checklistResults, setChecklistResults] = useState<ChecklistResult[]>([]);

  const [quickCalcForm, setQuickCalcForm] = useState<QuickCalcForm>({
    componentType: "albero",
    verificationType: "flessione_torsione",
    sectionType: "circolare_piena",
    material: "C45",

    axialLoad: "0",
    shearLoad: "2500",
    bendingMoment: "",
    torque: "80000",
    distance: "120",

    diameter: "25",
    outerDiameter: "40",
    innerDiameter: "25",

    base: "30",
    height: "50",
    outerBase: "60",
    outerHeight: "80",
    innerBase: "40",
    innerHeight: "60",

    pressure: "30",
    radius: "150",
    thickness: "4",

    sigmaX: "80",
    sigmaY: "20",
    tauXY: "30",

    sigmaMax: "180",
    sigmaMin: "20",
    fatigueLimit: "",

    safetyFactorRequired: "2",
  });
  const [quickCalcResult, setQuickCalcResult] = useState<QuickCalcResult | null>(null);
  const [quickCalcSaveTitle, setQuickCalcSaveTitle] = useState("");
  const [quickCalcTargetProjectId, setQuickCalcTargetProjectId] = useState("");
  const [quickCalcVerificationSearch, setQuickCalcVerificationSearch] = useState("Flessione + torsione");

  const [drawingReviewFile, setDrawingReviewFile] = useState<DrawingUpload | null>(null);
  const [drawingAiLoading, setDrawingAiLoading] = useState(false);
  const [drawingResults, setDrawingResults] = useState<DrawingResult[]>([]);
  const [drawingIssues, setDrawingIssues] = useState<DrawingIssue[]>([]);
  const [drawingForm, setDrawingForm] = useState<DrawingForm>({
    partName: "",
    partType: "",
    material: "",
    manufacturing: "",
    mainFeatures: "",
    functionalSurfaces: "",
    holesThreads: "",
    fits: "",
    tolerances: "",
    roughness: "",
    assemblyFunction: "",
    productionQuantity: "",
    sheetFormat: "",
  });
  const [drawingExtraNotes, setDrawingExtraNotes] = useState("");
  const [drawingCustomQuery, setDrawingCustomQuery] = useState("");
  const [lastDrawingAnalysisText, setLastDrawingAnalysisText] = useState("");
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [projectSmartFile, setProjectSmartFile] = useState<ProjectFileMeta | null>(null);
  const [projectMemoryTab, setProjectMemoryTab] = useState<ProjectMemoryTab>("Panoramica");
  const [projectDecisionTitle, setProjectDecisionTitle] = useState("");
  const [projectDecisionText, setProjectDecisionText] = useState("");
  const [projectDecisionReason, setProjectDecisionReason] = useState("");
  const [projectNoteText, setProjectNoteText] = useState("");
  const [projectRevisionCode, setProjectRevisionCode] = useState("A");
  const [projectRevisionDate, setProjectRevisionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [projectRevisionAuthor, setProjectRevisionAuthor] = useState("");
  const [projectRevisionChanges, setProjectRevisionChanges] = useState("");
  const [projectRevisionNotes, setProjectRevisionNotes] = useState("");

  const [bomText, setBomText] = useState("");
  const [bomFileName, setBomFileName] = useState("");
  const [bomIssues, setBomIssues] = useState<BomIssue[]>([]);

  const [showSaveChatModal, setShowSaveChatModal] = useState(false);
  const [isSelectingProjectMessages, setIsSelectingProjectMessages] = useState(false);
  const [selectedProjectMessageIndexes, setSelectedProjectMessageIndexes] = useState<number[]>([]);


  const fileInputRef = useRef<HTMLInputElement>(null);
  const drawingReviewInputRef = useRef<HTMLInputElement>(null);
  const projectFileInputRef = useRef<HTMLInputElement>(null);
  const bomFileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isDark = theme.bg === "#050505";
  const activeChat = chats.find(chat => chat.id === activeChatId);
  const currentMessages = activeChat?.messages || [];
  const allMaterials = useMemo(() => [...MATERIALS_DB, ...customMaterials], [customMaterials]);

  const quickCalcVerificationOptions = useMemo(
    () => [
      {
        value: "assiale",
        label: "Trazione / compressione",
        description: "Barre, tiranti, aste, bulloni caricati assialmente.",
        keywords: "assiale trazione compressione barra tirante asta bullone vite forza normale carico assiale",
      },
      {
        value: "taglio",
        label: "Taglio",
        description: "Perni, spine, bulloni, viti, collegamenti a taglio.",
        keywords: "taglio perno spina bullone vite cesoiamento collegamento forza trasversale",
      },
      {
        value: "flessione",
        label: "Flessione",
        description: "Bracci, mensole, staffe, alberi e travi con momento flettente.",
        keywords: "flessione braccio mensola staffa trave albero momento flettente forza distanza",
      },
      {
        value: "torsione",
        label: "Torsione",
        description: "Alberi, perni e organi rotanti soggetti a momento torcente.",
        keywords: "torsione momento torcente coppia albero rotazione trasmissione",
      },
      {
        value: "flessione_torsione",
        label: "Flessione + torsione",
        description: "Caso tipico degli alberi con momento flettente e torcente.",
        keywords: "flessione torsione albero braccio puleggia ruota dentata momento flettente torcente",
      },
      {
        value: "flessione_taglio",
        label: "Flessione + taglio",
        description: "Staffe, bracci, perni e supporti con forza trasversale.",
        keywords: "flessione taglio braccio staffa perno supporto forza trasversale",
      },
      {
        value: "trazione_flessione",
        label: "Trazione/compressione + flessione",
        description: "Componenti con carico assiale e momento flettente.",
        keywords: "trazione compressione flessione barra tirante montante staffa braccio",
      },
      {
        value: "trazione_torsione",
        label: "Trazione/compressione + torsione",
        description: "Componenti con carico assiale e momento torcente.",
        keywords: "trazione compressione torsione bullone vite albero coppia carico assiale",
      },
      {
        value: "generale",
        label: "Flessione + torsione + taglio + assiale",
        description: "Verifica completa quando hai più sollecitazioni insieme.",
        keywords: "generale completa assiale flessione torsione taglio albero staffa braccio bullone vite perno",
      },
      {
        value: "pressione_interna",
        label: "Pressione interna recipiente cilindrico",
        description: "Tubi, serbatoi, cilindri e recipienti in pressione.",
        keywords: "pressione interna recipiente tubo serbatoio cilindro spessore parete pressione bar",
      },
      {
        value: "stato_piano",
        label: "Stato piano di tensione",
        description: "Calcolo da sigma x, sigma y e tau xy.",
        keywords: "stato piano tensione sigma tau von mises tresca principale mohr",
      },
      {
        value: "fatica",
        label: "Fatica con σmax e σmin",
        description: "Verifica semplificata a fatica tipo Goodman.",
        keywords: "fatica goodman alternata media ciclica sigma max min durata",
      },
    ],
    []
  );

  const filteredQuickCalcVerificationOptions = useMemo(() => {
    const q = quickCalcVerificationSearch.trim().toLowerCase();
    if (!q) return quickCalcVerificationOptions;

    return quickCalcVerificationOptions.filter((option) =>
      `${option.label} ${option.description} ${option.keywords}`.toLowerCase().includes(q)
    );
  }, [quickCalcVerificationOptions, quickCalcVerificationSearch]);

  const activeProject = useMemo(
    () => projects.find(project => project.id === activeProjectId) || projects[0] || null,
    [projects, activeProjectId]
  );

  const filteredProjects = useMemo(() => {
  const q = projectSearch.trim().toLowerCase();
       if (!q) return projects;

  return projects.filter(project => {
    const itemsText = (project.items || [])
        .map(item => `${item.title} ${item.summary} ${item.type}`)
         .join(" ");

    const memoryText = [
        ...(project.chats || []).map(item => `${item.title} ${item.messages?.map(message => message.text).join(" ") || ""}`),
        ...(project.documents || []).map(item => `${item.name} ${item.category} ${item.note}`),
        ...(project.drawings || []).map(item => `${item.title} ${item.fileName || ""} ${item.partName || ""} ${item.material || ""}`),
        ...(project.materials || []).map(item => `${item.name} ${item.reason || ""}`),
        ...(project.verifications || []).map(item => `${item.title} ${item.summary} ${item.type}`),
        ...(project.decisions || []).map(item => `${item.title} ${item.description} ${item.reason} ${item.alternatives || ""}`),
        ...(project.notes || []).map(item => `${item.title} ${item.text}`),
      ].join(" ");

 return `${project.name} ${project.description} ${itemsText} ${memoryText}`
        .toLowerCase()
        .includes(q);
    });
  }, [projects, projectSearch]);


  const resetWorkspace = () => {
    setChats([]);
    setActiveChatId(null);
    setPendingFile(null);
    setQuery("");
    setChecklistResults([]);
    setQuickCalcResult(null);
    setDrawingReviewFile(null);
    setDrawingResults([]);
    setDrawingIssues([]);
    setLastDrawingAnalysisText("");
    setProjects([]);
    setActiveProjectId(null);
    setProjectSmartFile(null);
    setBomIssues([]);
    setBomText("");
    setBomFileName("");
  };

  const loadWorkspaceFromStorage = (storageKey: string) => {
    setStorageReady(false);
    setActiveStorageKey(storageKey);

  const saved = localStorage.getItem(storageKey);

    if (!saved) {
      resetWorkspace();
      setTheme(THEMES[1]);
      setInterest("Ingegneria Meccanica");
      setSidebarOpen(true);
      setCustomMaterials([]);
      setProjects([]);
      setActiveProjectId(null);
      setStorageReady(true);
      return;
    }

    const data = safeParseJson<any>(saved, null);

    if (!data) {
      resetWorkspace();
      setStorageReady(true);
      return;
    }

    setTheme(THEMES.find(t => t.name === data.themeName) || THEMES[1]);
    setInterest(data.interest || "Ingegneria Meccanica");
    setChats(Array.isArray(data.chats) ? data.chats : []);
    setActiveChatId(data.activeChatId || null);
    setSidebarOpen(data.sidebarOpen ?? true);
    setCustomMaterials(Array.isArray(data.customMaterials) ? data.customMaterials : []);
    setProjects(normalizeProjectRecords(data.projects));
    setActiveProjectId(data.activeProjectId || null);
    setLastDrawingAnalysisText(String(data.lastDrawingAnalysisText || ""));
    setPendingFile(null);
    setQuery("");
    setStorageReady(true);
  };

  useEffect(() => {
    const savedGuestUsed = Number(localStorage.getItem(GUEST_USED_KEY) || "0");
    setGuestUsed(Number.isFinite(savedGuestUsed) ? savedGuestUsed : 0);

    const applySession = (session: any) => {
      if (session?.user) {
        const name = session.user.user_metadata?.name || session.user.email?.split("@")[0] || "Utente";
        const email = session.user.email || "";
        const profile = { name, email };

        setUser(profile);
        setLoginEmail(email);
        setIsLoggedIn(true);
        setIsGuest(false);
        setShowLoginPanel(false);
        setLoginDismissed(false);
        setLoginError("");

        loadWorkspaceFromStorage(makeUserStorageKey(email));
      } else {
        setUser(DEFAULT_USER);
        setIsLoggedIn(false);
        setIsGuest(false);
        setStorageReady(false);
        setActiveStorageKey("");
        resetWorkspace();
      }
    };

    if (!isSupabaseConfigured || !supabase) {
      setIsLoggedIn(true);
      setIsGuest(false);
      loadWorkspaceFromStorage(`${STORAGE_KEY_BASE}:local`);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!storageReady || !activeStorageKey) return;

    const safeChats = chats.map(chat => ({
      ...chat,
      messages: chat.messages.map(message => ({
        role: message.role,
        text: message.text,
        fileAttachment: message.fileAttachment,
      })),
    }));

    localStorage.setItem(
      activeStorageKey,
      JSON.stringify({
        themeName: theme.name,
        user,
        interest,
        chats: safeChats,
        activeChatId,
        sidebarOpen,
        isLoggedIn,
        isGuest,
        customMaterials,
        projects,
        activeProjectId,
        lastDrawingAnalysisText,
      })
    );
  }, [theme, user, interest, chats, activeChatId, sidebarOpen, isLoggedIn, isGuest, customMaterials, projects, activeProjectId, lastDrawingAnalysisText, storageReady, activeStorageKey]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages, loading]);

  useEffect(() => {
    return () => {
      if (drawingReviewFile?.previewUrl) URL.revokeObjectURL(drawingReviewFile.previewUrl);
    };
  }, [drawingReviewFile?.previewUrl]);

  const createChatObject = (title = "Nuova chat"): ChatSession => ({
    id: createId(),
    title,
    messages: [],
    createdAt: new Date().toISOString(),
  });

  const createNewChat = () => {
    const newChat = createChatObject();
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setPendingFile(null);
    setQuery("");
  };

  const ensureActiveChat = (title = "Nuova chat") => {
    if (activeChatId) return activeChatId;

    const newChat = createChatObject(title);
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    return newChat.id;
  };

  const replaceMessagesInChat = (chatId: string, messages: Message[]) => {
    setChats(prev =>
      prev.map(chat => {
        if (chat.id !== chatId) return chat;
        const first = messages.find(m => m.role === "utente")?.text || chat.title;
        return {
          ...chat,
          messages,
          title: first.slice(0, 32) + (first.length > 32 ? "..." : ""),
        };
      })
    );
  };

  const deleteChat = (id: string) => {
    setChats(prev => prev.filter(chat => chat.id !== id));
    if (activeChatId === id) setActiveChatId(null);
  };

  const clearAllChats = () => {
    setChats([]);
    setActiveChatId(null);
    setPendingFile(null);
    setQuery("");
  };

  const updateChecklistField = (field: keyof ChecklistForm, value: string) => {
    setChecklistForm(prev => ({ ...prev, [field]: value }));
  };

  const resetChecklist = () => {
    setChecklistForm({
      componentType: "",
      material: "",
      load: "",
      environment: "",
      machining: "",
      safetyFactor: "",
      tolerances: "",
      roughness: "",
      notes: "",
    });

    setChecklistResults([]);
  };

  const updateQuickCalcField = (field: keyof QuickCalcForm, value: string) => {
    setQuickCalcForm(prev => ({ ...prev, [field]: value }));
  };

  const resetQuickCalc = () => {
    setQuickCalcForm(prev => ({
      ...prev,

      axialLoad: "0",
      shearLoad: "2500",
      bendingMoment: "",
      torque: "80000",
      distance: "120",

      diameter: "25",
      outerDiameter: "40",
      innerDiameter: "25",

      base: "30",
      height: "50",
      outerBase: "60",
      outerHeight: "80",
      innerBase: "40",
      innerHeight: "60",

      pressure: "30",
      radius: "150",
      thickness: "4",

      sigmaX: "80",
      sigmaY: "20",
      tauXY: "30",

      sigmaMax: "180",
      sigmaMin: "20",
      fatigueLimit: "",

      safetyFactorRequired: "2",
    }));

    setQuickCalcResult(null);
  };

  const updateDrawingField = (field: keyof DrawingForm, value: string) => {
    setDrawingForm(prev => ({ ...prev, [field]: value }));
  };

  const resetDrawingGenerator = () => {
    if (drawingReviewFile?.previewUrl) URL.revokeObjectURL(drawingReviewFile.previewUrl);

    setDrawingReviewFile(null);
    setDrawingResults([]);
    setDrawingIssues([]);
    setDrawingAiLoading(false);

    setDrawingForm({
      partName: "",
      partType: "",
      material: "",
      manufacturing: "",
      mainFeatures: "",
      functionalSurfaces: "",
      holesThreads: "",
      fits: "",
      tolerances: "",
      roughness: "",
      assemblyFunction: "",
      productionQuantity: "",
      sheetFormat: "",
    });

    setDrawingExtraNotes("");
    setLastDrawingAnalysisText("");

    if (drawingReviewInputRef.current) drawingReviewInputRef.current.value = "";
  };

  const createProject = (name?: string, description?: string) => {
    const projectName = String(name || newProjectName || "Nuovo progetto").trim();
    const now = new Date().toISOString();
    const project: ProjectRecord = {
      id: createId(),
      name: projectName || "Nuovo progetto",
      description: String(description || newProjectDescription || "").trim(),
      createdAt: now,
      updatedAt: now,
      items: [],
      chats: [],
      documents: [],
      drawings: [],
      materials: [],
      verifications: [],
      decisions: [],
      revisions: [],
      notes: [],
    };

    setProjects(prev => [project, ...prev]);
    setActiveProjectId(project.id);
    setNewProjectName("");
    setNewProjectDescription("");
    return project.id;
  };

  const deleteProject = (projectId: string) => {
    setProjects(prev => prev.filter(project => project.id !== projectId));
    if (activeProjectId === projectId) setActiveProjectId(null);
  };

  const updateProject = (projectId: string, name: string, description: string) => {
    const cleanName = String(name || "").trim();

    if (!cleanName) {
      alert("Inserisci un nome progetto valido.");
      return;
    }

    const now = new Date().toISOString();

    setProjects(prev =>
      prev.map(project =>
        project.id === projectId
          ? {
              ...normalizeProjectRecord(project),
              name: cleanName,
              description: String(description || "").trim(),
              updatedAt: now,
            }
          : project
      )
    );
  };

  const addProjectItem = (item: Omit<ProjectSavedItem, "id" | "createdAt">, preferredProjectId?: string) => {
    const targetId = preferredProjectId || activeProject?.id || createProject("Progetto automatico", "Creato automaticamente da TechAI.");
    const now = new Date().toISOString();
    const completeItem: ProjectSavedItem = {
      id: createId(),
      createdAt: now,
      ...item,
    };

    const bucket = projectMemoryBucketFromType(completeItem.type);

    setProjects(prev =>
      prev.map(project => {
        if (project.id !== targetId) return project;

        const normalizedProject = normalizeProjectRecord(project);

        return {
          ...normalizedProject,
          updatedAt: now,
          items: [completeItem, ...normalizedProject.items],
          [bucket]: [completeItem, ...(normalizedProject as any)[bucket]],
        };
      })
    );

    setActiveProjectId(targetId);
  };

  const deleteProjectSavedItem = (itemId: string) => {
    if (!activeProject) return;

    const confirmed = window.confirm("Vuoi eliminare questo elemento dalla memoria del progetto?");
    if (!confirmed) return;

    const now = new Date().toISOString();

    setProjects(prev =>
      prev.map(project => {
        if (project.id !== activeProject.id) return project;

        const normalizedProject = normalizeProjectRecord(project);
        const removeItem = (items: ProjectSavedItem[]) =>
          (items || []).filter(savedItem => savedItem.id !== itemId);

        return {
          ...normalizedProject,
          updatedAt: now,
          items: removeItem(normalizedProject.items),
          chats: removeItem(normalizedProject.chats),
          documents: removeItem(normalizedProject.documents),
          drawings: removeItem(normalizedProject.drawings),
          materials: removeItem(normalizedProject.materials),
          verifications: removeItem(normalizedProject.verifications),
          decisions: removeItem(normalizedProject.decisions),
          revisions: removeItem(normalizedProject.revisions),
          notes: removeItem(normalizedProject.notes),
        };
      })
    );
  };

  const openSaveChatModal = () => {
    if (!activeChat || activeChat.messages.length === 0) {
      alert("Apri una chat con almeno un messaggio prima di salvarla nel progetto.");
      return;
    }

    setShowProjects(false);
    setShowSaveChatModal(true);
  };

  const saveChatMessagesToProject = (messagesToSave: Message[], mode: "full" | "selected") => {
    if (!activeChat || messagesToSave.length === 0) {
      alert("Non ci sono messaggi da salvare.");
      return;
    }

    const nowLabel = new Date().toLocaleString("it-IT");
    const isFull = mode === "full";

    addProjectItem({
      type: "chat",
      title: isFull
        ? `Chat completa - ${activeChat.title || "senza titolo"}`
        : `Messaggi selezionati - ${activeChat.title || "senza titolo"}`,
      summary: isFull
        ? `${messagesToSave.length} messaggi salvati come chat completa del progetto.`
        : `${messagesToSave.length} messaggi selezionati e salvati nella memoria del progetto.`,
      payload: {
        chatId: activeChat.id,
        title: activeChat.title,
        savedAtLabel: nowLabel,
        saveMode: mode,
        messages: messagesToSave,
      },
    });

    setProjectMemoryTab("Chat");
  };

  const saveFullCurrentChatToProject = () => {
    if (!activeChat || activeChat.messages.length === 0) {
      alert("Apri una chat con almeno un messaggio prima di salvarla nel progetto.");
      return;
    }

    saveChatMessagesToProject(activeChat.messages, "full");
    setShowSaveChatModal(false);
    setShowProjects(true);
  };

  const startSelectiveChatSave = () => {
    if (!activeChat || activeChat.messages.length === 0) {
      alert("Apri una chat con almeno un messaggio prima di salvarla nel progetto.");
      return;
    }

    setShowSaveChatModal(false);
    setShowProjects(false);
    setIsSelectingProjectMessages(true);
    setSelectedProjectMessageIndexes([]);
  };

  const toggleProjectMessageSelection = (messageIndex: number) => {
    setSelectedProjectMessageIndexes(prev =>
      prev.includes(messageIndex)
        ? prev.filter(index => index !== messageIndex)
        : [...prev, messageIndex]
    );
  };

  const cancelProjectMessageSelection = () => {
    setIsSelectingProjectMessages(false);
    setSelectedProjectMessageIndexes([]);
  };

  const saveSelectedMessagesToProject = () => {
    if (!activeChat || activeChat.messages.length === 0) {
      alert("Apri una chat con almeno un messaggio prima di salvarla nel progetto.");
      return;
    }

    const selectedMessages = activeChat.messages.filter((_, index) =>
      selectedProjectMessageIndexes.includes(index)
    );

    if (selectedMessages.length === 0) {
      alert("Seleziona almeno un messaggio da salvare.");
      return;
    }

    saveChatMessagesToProject(selectedMessages, "selected");
    setIsSelectingProjectMessages(false);
    setSelectedProjectMessageIndexes([]);
    setShowProjects(true);
  };

  const saveCurrentChatToProject = openSaveChatModal;


  const saveDecisionToProject = () => {
    if (!projectDecisionTitle.trim() && !projectDecisionText.trim()) {
      alert("Scrivi almeno una decisione o un titolo.");
      return;
    }

    addProjectItem({
      type: "decision",
      title: projectDecisionTitle.trim() || "Decisione progettuale",
      summary: projectDecisionText.trim() || "Decisione salvata nel progetto.",
      payload: {
        title: projectDecisionTitle.trim(),
        description: projectDecisionText.trim(),
        reason: projectDecisionReason.trim(),
      },
    });

    setProjectDecisionTitle("");
    setProjectDecisionText("");
    setProjectDecisionReason("");
    setProjectMemoryTab("Decisioni");
  };

  const saveProjectNote = () => {
    if (!projectNoteText.trim()) {
      alert("Scrivi una nota tecnica prima di salvarla.");
      return;
    }

    addProjectItem({
      type: "note",
      title: "Nota tecnica",
      summary: projectNoteText.trim(),
      payload: {
        text: projectNoteText.trim(),
      },
    });

    setProjectNoteText("");
    setProjectMemoryTab("Note");
  };

  const saveProjectRevision = () => {
    const code = projectRevisionCode.trim();
    const date = projectRevisionDate.trim() || new Date().toISOString().slice(0, 10);
    const author = projectRevisionAuthor.trim() || user.name || "Utente";
    const changes = projectRevisionChanges.trim();
    const notes = projectRevisionNotes.trim();

    if (!code) {
      alert("Inserisci il codice revisione, ad esempio A, B, C, 00 o 01.");
      return;
    }

    if (!changes) {
      alert("Scrivi le modifiche effettuate nella revisione.");
      return;
    }

    addProjectItem({
      type: "revision",
      title: `Rev. ${code}`,
      summary: `${date} · ${author} · ${changes}`,
      payload: {
        code,
        date,
        author,
        changes,
        notes,
      },
    });

    setProjectRevisionCode("");
    setProjectRevisionDate(new Date().toISOString().slice(0, 10));
    setProjectRevisionAuthor("");
    setProjectRevisionChanges("");
    setProjectRevisionNotes("");
    setProjectMemoryTab("Revisioni");
  };


  const saveChecklistToProject = () => {
    if (checklistResults.length === 0) {
      alert("Prima esegui la checklist, poi salvala nel progetto.");
      return;
    }

    addProjectItem({
      type: "checklist",
      title: `Checklist - ${checklistForm.componentType || "Componente"}`,
      summary: `${checklistResults.length} controlli salvati. Materiale: ${checklistForm.material || "non indicato"}.`,
      payload: { checklistForm, checklistResults },
    });
  };

  const saveQuickCalcToProject = () => {
    if (!quickCalcResult) {
      alert("Prima esegui una verifica, poi salvala nel progetto.");
      return;
    }

    const targetProjectId = quickCalcTargetProjectId || activeProject?.id || undefined;
    const savedTitle = quickCalcSaveTitle.trim() || `Verifica - ${quickCalcResult.title}`;

    addProjectItem(
      {
        type: "quickcalc",
        title: savedTitle,
        summary: `Esito ${quickCalcResult.outcome}. σeq = ${quickCalcResult.equivalentStress.toFixed(2)} MPa, n = ${quickCalcResult.safetyFactor.toFixed(2)}.`,
        payload: {
          quickCalcForm,
          quickCalcResult,
          savedTitle,
          targetProjectId: targetProjectId || "automatico",
        },
      },
      targetProjectId
    );

    setQuickCalcSaveTitle("");
    setQuickCalcTargetProjectId("");
    setProjectMemoryTab("Verifiche");
  };

  const saveDrawingToProject = () => {
    if (drawingResults.length === 0 && !drawingReviewFile) {
      alert("Prima carica/analizza una tavola oppure compila il controllo base.");
      return;
    }

    addProjectItem({
      type: "drawing",
      title: `Tavola - ${drawingForm.partName || drawingReviewFile?.fileAttachment.name || "senza nome"}`,
      summary: drawingResults.length > 0 ? `${drawingResults.length} risultati/controlli salvati.` : "File tavola salvato come riferimento.",
      payload: { drawingForm, drawingExtraNotes, lastDrawingAnalysisText, drawingResults, drawingIssues, file: drawingReviewFile?.fileAttachment },
    });
  };

  const parseBomRows = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      const parsed = JSON.parse(trimmed);
      const array = Array.isArray(parsed) ? parsed : Array.isArray(parsed.items) ? parsed.items : [];
      return array.map((row: any, index: number) => ({ index: index + 1, data: row }));
    }

    const lines = trimmed.split(/\r?\n/).filter(Boolean);
    const separator = lines[0].includes(";") ? ";" : ",";
    const headers = lines[0].split(separator).map(h => h.trim().toLowerCase());
    return lines.slice(1).map((line, index) => {
      const cells = line.split(separator).map(c => c.trim());
      const data: Record<string, string> = {};
      headers.forEach((header, i) => { data[header] = cells[i] || ""; });
      return { index: index + 2, data };
    });
  };

  const getBomValue = (row: any, keys: string[]) => {
    for (const key of keys) {
      const foundKey = Object.keys(row || {}).find(k => k.toLowerCase().replaceAll(" ", "") === key.toLowerCase().replaceAll(" ", ""));
      if (foundKey && String(row[foundKey] || "").trim()) return String(row[foundKey]).trim();
    }
    return "";
  };

  const runBomCheck = () => {
    try {
      const rows = parseBomRows(bomText);
      const issues: BomIssue[] = [];
      const codes = new Map<string, number[]>();

      rows.forEach(({ index, data }) => {
        const code = getBomValue(data, ["codice", "code", "partnumber", "part number", "codiceparticolare"]);
        const description = getBomValue(data, ["descrizione", "description", "desc", "nome"]);
        const material = getBomValue(data, ["materiale", "material", "mat"]);
        const qtyRaw = getBomValue(data, ["quantita", "quantità", "qty", "qta", "quantity"]);
        const standard = getBomValue(data, ["norma", "standard", "normativa", "uni", "iso", "din"]);
        const joined = `${code} ${description} ${material} ${standard}`.toLowerCase();
        const qty = Number(qtyRaw.replace(",", "."));

        if (code) codes.set(code, [...(codes.get(code) || []), index]);
        if (!code) issues.push({ row: index, severity: "errore", message: "Codice mancante", suggestion: "Aggiungere un codice univoco componente." });
        if (!description) issues.push({ row: index, severity: "errore", message: "Descrizione incompleta", suggestion: "Inserire descrizione tecnica chiara del componente." });
        if (!qtyRaw || !Number.isFinite(qty) || qty <= 0) issues.push({ row: index, severity: "errore", message: "Quantità mancante o incoerente", suggestion: "Inserire quantità numerica maggiore di zero." });
        if (!material && !/(vite|bullone|dado|rondella|cuscinetto|oring|o-ring|commerciale|motore|valvola)/i.test(joined)) issues.push({ row: index, severity: "attenzione", message: "Materiale mancante", suggestion: "Inserire materiale o indicare che il componente è commerciale." });
        if (/(vite|bullone)/i.test(joined) && !/(4\.6|5\.8|8\.8|10\.9|12\.9|a2|a4)/i.test(joined)) issues.push({ row: index, severity: "errore", message: "Vite/bullone senza classe di resistenza", suggestion: "Aggiungere classe, esempio 8.8 / 10.9 / A2-70." });
        if (/cuscinetto|bearing/i.test(joined) && !/(6|7|2|3|nu|nj|nup|na|hk)\d{2,}[a-z0-9-]*/i.test(joined)) issues.push({ row: index, severity: "attenzione", message: "Cuscinetto senza sigla completa", suggestion: "Inserire sigla completa, gioco, schermatura e marca se richiesto." });
        if (/(vite|bullone|dado|rondella|cuscinetto|oring|o-ring|seeger|spina)/i.test(joined) && !standard) issues.push({ row: index, severity: "attenzione", message: "Componente commerciale senza norma", suggestion: "Aggiungere norma UNI/ISO/DIN o codice fornitore." });
      });

      codes.forEach((indexes, code) => {
        if (indexes.length > 1) {
          indexes.forEach(index => issues.push({ row: index, severity: "errore", message: `Codice duplicato: ${code}`, suggestion: "Usare codici univoci oppure verificare se è davvero lo stesso componente." }));
        }
      });

      setBomIssues(issues);
      addProjectItem({ type: "bom", title: `Controllo distinta ${bomFileName || "manuale"}`, summary: `${issues.length} anomalie trovate su ${rows.length} righe.`, payload: { bomText, bomFileName, issues } });
    } catch (error: any) {
      setBomIssues([{ row: 0, severity: "errore", message: "File distinta non leggibile", suggestion: error?.message || "Controlla formato CSV/JSON." }]);
    }
  };

  const handleBomFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setBomText(text);
    setBomFileName(file.name);
    setBomIssues([]);
    event.target.value = "";
  };

  const handleProjectSmartFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const extension = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
    const category = extension === "step" || extension === "stp" ? "STEP 3D" : file.type.includes("pdf") ? "PDF" : file.type.startsWith("image/") ? "Immagine" : "File tecnico";
    const note =
      category === "STEP 3D"
        ? "Metadata STEP acquisiti. Per ora non viene ricostruita la geometria, ma il file viene salvato nel progetto come riferimento."
        : category === "PDF"
          ? "PDF acquisito. Se contiene testo, può essere analizzato dalla chat/tavole."
          : category === "Immagine"
            ? "Immagine acquisita. In futuro potrà ricevere annotazioni tecniche."
            : "File acquisito come riferimento progetto.";

    const meta: ProjectFileMeta = {
      name: file.name,
      type: file.type || "sconosciuto",
      sizeKb: (file.size / 1024).toFixed(1),
      extension,
      category,
      note,
    };

    setProjectSmartFile(meta);
    const projectId = activeProject?.id || createProject(file.name.replace(/\.[^.]+$/, ""), "Creato automaticamente da upload file tecnico.");
    addProjectItem({ type: "file", title: `File caricato - ${file.name}`, summary: `${category} · ${meta.sizeKb} KB. ${note}`, payload: meta }, projectId);
    event.target.value = "";
  };

  const normalizeMaterialKey = (value?: string) => {
    return String(value || "").toLowerCase().replaceAll(" ", "").replaceAll("-", "").replaceAll("_", "");
  };

  const findMaterial = (value: string) => {
    const key = normalizeMaterialKey(value);
    return allMaterials.find((m: MaterialInfo) =>
      normalizeMaterialKey(m.key) === key ||
      normalizeMaterialKey(m.name) === key ||
      normalizeMaterialKey(m.en) === key ||
      normalizeMaterialKey(m.din) === key ||
      normalizeMaterialKey(m.aisi) === key ||
      normalizeMaterialKey(m.jis) === key
    );
  };

  const getSectionData = (): SectionData => {
    const sectionType = quickCalcForm.sectionType;

    const d = toNumber(quickCalcForm.diameter);
    const D = toNumber(quickCalcForm.outerDiameter);
    const di = toNumber(quickCalcForm.innerDiameter);

    const b = toNumber(quickCalcForm.base);
    const h = toNumber(quickCalcForm.height);

    const B = toNumber(quickCalcForm.outerBase);
    const H = toNumber(quickCalcForm.outerHeight);
    const bi = toNumber(quickCalcForm.innerBase);
    const hi = toNumber(quickCalcForm.innerHeight);

    if (sectionType === "circolare_piena") {
      if (d <= 0) throw new Error("Inserisci un diametro d valido per la sezione circolare piena.");

      const A = Math.PI * d ** 2 / 4;
      const Jf = Math.PI * d ** 4 / 64;
      const Wf = Math.PI * d ** 3 / 32;
      const Jp = Math.PI * d ** 4 / 32;
      const Wt = Math.PI * d ** 3 / 16;

      return {
        name: `Circolare piena Ø${d} mm`,
        A,
        Jf,
        Wf,
        Jp,
        Wt,
        shearFactor: 4 / 3,
        values: [
          `Sezione: circolare piena`,
          `Diametro: d = ${d.toFixed(2)} mm`,
          `Area: A = ${A.toFixed(2)} mm²`,
          `Momento d'inerzia flessionale: Jf = ${Jf.toFixed(2)} mm⁴`,
          `Modulo resistente a flessione: Wf = ${Wf.toFixed(2)} mm³`,
          `Momento polare: Jp = ${Jp.toFixed(2)} mm⁴`,
          `Modulo resistente a torsione: Wt = ${Wt.toFixed(2)} mm³`,
        ],
        notes: [],
      };
    }

    if (sectionType === "circolare_cava") {
      if (D <= 0 || di <= 0 || di >= D) {
        throw new Error("Per la sezione circolare cava inserisci D esterno > d interno > 0.");
      }

      const A = Math.PI * (D ** 2 - di ** 2) / 4;
      const Jf = Math.PI * (D ** 4 - di ** 4) / 64;
      const Wf = Jf / (D / 2);
      const Jp = Math.PI * (D ** 4 - di ** 4) / 32;
      const Wt = Jp / (D / 2);

      return {
        name: `Circolare cava Ø${D}/${di} mm`,
        A,
        Jf,
        Wf,
        Jp,
        Wt,
        shearFactor: 1.35,
        values: [
          `Sezione: circolare cava`,
          `Diametro esterno: D = ${D.toFixed(2)} mm`,
          `Diametro interno: d = ${di.toFixed(2)} mm`,
          `Area: A = ${A.toFixed(2)} mm²`,
          `Momento d'inerzia flessionale: Jf = ${Jf.toFixed(2)} mm⁴`,
          `Modulo resistente a flessione: Wf = ${Wf.toFixed(2)} mm³`,
          `Momento polare: Jp = ${Jp.toFixed(2)} mm⁴`,
          `Modulo resistente a torsione: Wt = ${Wt.toFixed(2)} mm³`,
        ],
        notes: ["Per il taglio su sezione cava il coefficiente è indicativo."],
      };
    }

    if (sectionType === "rettangolare_piena") {
      if (b <= 0 || h <= 0) {
        throw new Error("Per la sezione rettangolare piena inserisci base b e altezza h valide.");
      }

      const A = b * h;
      const Jf = b * h ** 3 / 12;
      const Wf = b * h ** 2 / 6;

      const longSide = Math.max(b, h);
      const shortSide = Math.min(b, h);
      const Jt = longSide * shortSide ** 3 * (1 / 3 - 0.21 * (shortSide / longSide) * (1 - shortSide ** 4 / (12 * longSide ** 4)));
      const Wt = Jt / (shortSide / 2);

      return {
        name: `Rettangolare piena ${b}×${h} mm`,
        A,
        Jf,
        Wf,
        Jp: Jt,
        Wt,
        shearFactor: 1.5,
        values: [
          `Sezione: rettangolare piena`,
          `Base: b = ${b.toFixed(2)} mm`,
          `Altezza: h = ${h.toFixed(2)} mm`,
          `Area: A = ${A.toFixed(2)} mm²`,
          `Momento d'inerzia flessionale: Jf = ${Jf.toFixed(2)} mm⁴`,
          `Modulo resistente a flessione: Wf = ${Wf.toFixed(2)} mm³`,
          `Modulo resistente torsionale indicativo: Wt ≈ ${Wt.toFixed(2)} mm³`,
        ],
        notes: ["La torsione su sezione rettangolare è una stima preliminare."],
      };
    }

    if (sectionType === "rettangolare_cava") {
      if (B <= 0 || H <= 0 || bi <= 0 || hi <= 0 || bi >= B || hi >= H) {
        throw new Error("Per la sezione rettangolare cava inserisci dimensioni esterne maggiori di quelle interne.");
      }

      const A = B * H - bi * hi;
      const Jf = (B * H ** 3 - bi * hi ** 3) / 12;
      const Wf = Jf / (H / 2);

      const JpIndicativo = ((B * H ** 3 + H * B ** 3) - (bi * hi ** 3 + hi * bi ** 3)) / 12;
      const Wt = JpIndicativo / (Math.min(B, H) / 2);

      return {
        name: `Rettangolare cava ${B}×${H} / ${bi}×${hi} mm`,
        A,
        Jf,
        Wf,
        Jp: JpIndicativo,
        Wt,
        shearFactor: 1.5,
        values: [
          `Sezione: rettangolare cava`,
          `Base esterna: B = ${B.toFixed(2)} mm`,
          `Altezza esterna: H = ${H.toFixed(2)} mm`,
          `Base interna: b = ${bi.toFixed(2)} mm`,
          `Altezza interna: h = ${hi.toFixed(2)} mm`,
          `Area: A = ${A.toFixed(2)} mm²`,
          `Momento d'inerzia flessionale: Jf = ${Jf.toFixed(2)} mm⁴`,
          `Modulo resistente a flessione: Wf = ${Wf.toFixed(2)} mm³`,
          `Modulo torsionale indicativo: Wt ≈ ${Wt.toFixed(2)} mm³`,
        ],
        notes: ["La torsione su sezione rettangolare cava è molto semplificata: per progetto reale usare formule da manuale o FEM."],
      };
    }

    throw new Error("Tipo di sezione non riconosciuto.");
  };


  const getYoungModulus = (material?: MaterialInfo) => {
    if (!material) return 210000;
    const name = material.name.toLowerCase();
    if (name.includes("alluminio")) return 70000;
    if (name.includes("rame") || name.includes("ottone") || name.includes("bronzo")) return 110000;
    if (name.includes("ghisa")) return 100000;
    if (
      name.includes("ptfe") ||
      name.includes("nylon") ||
      name.includes("gomma") ||
      name.includes("pvc") ||
      name.includes("pom") ||
      name.includes("abs") ||
      name.includes("pla") ||
      name.includes("petg")
    ) return 3000;
    return 210000;
  };

  const getOrCreateGuestId = () => {
    let guestId = localStorage.getItem(GUEST_ID_KEY);
    if (!guestId) {
      guestId = `guest_${createId()}`;
      localStorage.setItem(GUEST_ID_KEY, guestId);
    }
    return guestId;
  };

  const markGuestRequestUsed = () => {
    const newUsed = guestUsed + 1;
    setGuestUsed(newUsed);
    localStorage.setItem(GUEST_USED_KEY, String(newUsed));
  };

  const syncGuestUsageFromBackend = (data: any) => {
    if (!isGuest) return;
    if (data?.usage?.used !== undefined) {
      const backendUsed = Number(data.usage.used || 0);
      setGuestUsed(backendUsed);
      localStorage.setItem(GUEST_USED_KEY, String(backendUsed));
    } else {
      markGuestRequestUsed();
    }
  };

  const getAuthToken = async (): Promise<string | null> => {
    if (isGuest) return null;
    if (!supabase) return null;

    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session?.access_token) {
      setIsLoggedIn(false);
      setIsGuest(false);
      setLoginDismissed(false);
      setShowLoginPanel(true);
      setLoginError("Sessione scaduta. Effettua di nuovo il login.");
      return null;
    }

    return session.access_token;
  };

  const buildApiHeaders = async (): Promise<Record<string, string> | null> => {
    const headers: Record<string, string> = {};
    const token = await getAuthToken();

    if (token) {
      headers.Authorization = `Bearer ${token}`;
      return headers;
    }

    if (isGuest) {
      headers["X-Guest-Id"] = getOrCreateGuestId();
      return headers;
    }

    return null;
  };

  const handleGuestAccess = () => {
    const used = Number(localStorage.getItem(GUEST_USED_KEY) || "0");
    const guestId = getOrCreateGuestId();

    setUser({ name: "Ospite", email: "ospite@techai.local" });
    setIsGuest(true);
    setIsLoggedIn(true);
    setGuestUsed(Number.isFinite(used) ? used : 0);
    setShowLoginPanel(false);
    setLoginDismissed(true);
    setLoginError("");

    loadWorkspaceFromStorage(makeGuestStorageKey(guestId));
  };

  const handleLogin = async () => {
    if (!loginEmail.includes("@")) { setLoginError("Inserisci una email valida."); return; }
    if (!loginPassword.trim()) { setLoginError("Inserisci la password."); return; }
    if (!supabase) { setLoginError("Supabase non configurato."); return; }

    setAuthLoading(true);
    setLoginError("");
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail.trim(), password: loginPassword });
    setAuthLoading(false);

    if (error) { setLoginError(error.message); return; }
    setIsGuest(false);
    setLoginPassword("");
  };

  const handleRegister = async () => {
    if (!loginName.trim()) { setLoginError("Inserisci il tuo nome."); return; }
    if (!loginEmail.includes("@")) { setLoginError("Inserisci una email valida."); return; }
    if (loginPassword.length < 6) { setLoginError("La password deve essere di almeno 6 caratteri."); return; }
    if (!supabase) { setLoginError("Supabase non configurato."); return; }

    setAuthLoading(true);
    setLoginError("");
    const { error } = await supabase.auth.signUp({
      email: loginEmail.trim(),
      password: loginPassword,
      options: { data: { name: loginName.trim() } },
    });
    setAuthLoading(false);

    if (error) { setLoginError(error.message); return; }
    setLoginError("Registrazione completata! Controlla la tua email per confermare l'account.");
    setAuthMode("login");
    setLoginPassword("");
  };

  const handleLogout = async () => {
    setStorageReady(false);
    setActiveStorageKey("");
    resetWorkspace();

    if (supabase && !isGuest) await supabase.auth.signOut();

    setUser(DEFAULT_USER);
    setIsLoggedIn(false);
    setIsGuest(false);
    setLoginDismissed(false);
    setShowLoginPanel(true);
    setShowSettings(false);
    setLoginPassword("");
    setAuthMode("login");
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPendingFile({ file, fileAttachment: makeAttachment(file) });
    event.target.value = "";
  };

  const removePendingFile = () => {
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const buildActiveProjectContext = (project: ProjectRecord | null): string => {
    if (!project) return "";
    const p = normalizeProjectRecord(project);
    const lines: string[] = [];
    lines.push(`[PROGETTO ATTIVO: ${p.name}${p.description ? " — " + p.description : ""}]`);

    if (p.materials?.length) {
      lines.push("Materiali salvati:");
      p.materials.slice(0, 5).forEach(m => lines.push(`  • ${m.title}${m.summary ? ": " + m.summary : ""}`));
    }
    const verifiche = (p.verifications || []).filter(v => !["calculation","solidworks","advanced"].includes(v.type));
    const calcoli = (p.verifications || []).filter(v => ["calculation","solidworks","advanced"].includes(v.type));
    if (verifiche.length) {
      lines.push("Verifiche salvate:");
      verifiche.slice(0, 5).forEach(v => lines.push(`  • ${v.title}${v.summary ? ": " + v.summary : ""}`));
    }
    if (calcoli.length) {
      lines.push("Calcoli salvati:");
      calcoli.slice(0, 5).forEach(v => lines.push(`  • ${v.title}${v.summary ? ": " + v.summary : ""}`));
    }
    if (p.drawings?.length) {
      lines.push("Tavole analizzate:");
      p.drawings.slice(0, 3).forEach(d => lines.push(`  • ${d.title}${d.summary ? ": " + d.summary : ""}`));
    }
    if (p.decisions?.length) {
      lines.push("Decisioni di progetto:");
      p.decisions.slice(0, 3).forEach(d => lines.push(`  • ${d.title}${d.summary ? ": " + d.summary : ""}`));
    }
    if (p.notes?.length) {
      lines.push("Note:");
      p.notes.slice(0, 3).forEach(n => lines.push(`  • ${n.title}${n.summary ? ": " + n.summary : ""}`));
    }
    if (p.documents?.length) {
      lines.push("Documenti:");
      p.documents.slice(0, 3).forEach(d => lines.push(`  • ${d.title}`));
    }

    return lines.length > 1
      ? "\n\n[CONTESTO PROGETTO ATTIVO — usa queste informazioni per rispondere in modo contestualizzato]\n" +
        lines.join("\n") +
        "\n[FINE CONTESTO PROGETTO]\n"
      : "";
  };

  const callAI = async () => {
    if ((!query.trim() && !pendingFile) || loading) return;

    const text = query.trim() || `Analizza il file "${pendingFile?.fileAttachment.name}".`;
    const chatId = ensureActiveChat(pendingFile ? `File: ${pendingFile.fileAttachment.name}` : text);

    const userMessage: Message = pendingFile
      ? { role: "utente", text, fileAttachment: pendingFile.fileAttachment }
      : { role: "utente", text };

    const fileToSend = pendingFile;
    const oldMessages = chats.find(chat => chat.id === chatId)?.messages || [];
    const updatedMessages = [...oldMessages, userMessage];

    setQuery("");
    setPendingFile(null);
    setLoading(true);
    replaceMessagesInChat(chatId, updatedMessages);

    try {
      const formData = new FormData();

      const materialNamesForContext = allMaterials
        .slice(0, 160)
        .map((m) => [m.name, m.en, m.uni, m.din, m.aisi, m.iso].filter(Boolean).join(" / "))
        .join("; ");

      const techAiSoftwareContext =
        "\n\n[CONTESTO INTERNO SOFTWARE TECHAI - NON MOSTRARE COME BLOCCO SEPARATO]\n" +
        "Stai rispondendo dentro TechAI, un software tecnico per aziende metalmeccaniche. " +
        "Quando l'utente dice 'questo software', 'qui', 'nella tua app', 'le tue funzioni', 'strumenti tecnici' o frasi simili, devi riferirti a TechAI e alle sue funzioni interne, non a un software generico.\n\n" +
        "Funzioni principali visibili in TechAI:\n" +
        "- Checklist: controllo preliminare di componente, materiale, carichi, ambiente, tolleranze, rugosità e note tecniche.\n" +
        "- Verifica: calcoli meccanici rapidi su trazione/compressione, taglio, flessione, torsione, sollecitazioni combinate, pressione interna, stato piano e fatica.\n" +
        "- Calcoli: calcolatore tecnico geometrico/dimensionale per sezioni, aree, inerzie, massa, perni, linguette, viti, saldature e recipienti in pressione.\n" +
        "- Materiali: libreria materiali interna con acciai, inox, allumini, ottoni, ghise, polimeri, elastomeri, compositi, ceramici e materiali speciali.\n" +
        "- Tavole: analisi di tavole tecniche PDF/immagine con controllo di cartiglio, viste, quote, tolleranze dimensionali/geometriche, rugosità, filetti, fori, materiale e trattamenti.\n" +
        "- Progetti: memoria progetto con chat, documenti, tavole, materiali, verifiche, decisioni, revisioni e note.\n\n" +
        "Materiali presenti o previsti nella libreria interna, elenco sintetico: " +
        materialNamesForContext +
        "\n\nRegola importante: se l'utente chiede quali materiali o funzioni sono disponibili nel software, rispondi usando questo contesto interno. Se non hai l'elenco completo, dillo, ma non rispondere come se non sapessi nulla del software.\n" +
        "[FINE CONTESTO INTERNO]\n";

      const lastDrawingAnalysisContext = lastDrawingAnalysisText.trim()
        ? "\n\n[ULTIMA ANALISI TAVOLA DISPONIBILE - USARE SE L'UTENTE CHIEDE COSA È STATO SCRITTO, RILEVATO O RISPOSTO NELLA FUNZIONE TAVOLE]\n" +
          "Questa è la risposta reale generata dall'ultima analisi della funzione Tavole. " +
          "Se l'utente chiede di ripetere, riassumere, spiegare o confrontare il contenuto della funzione Tavole, devi usare questo testo e non descrivere genericamente la funzione.\n\n" +
          lastDrawingAnalysisText.slice(0, 12000) +
          "\n[FINE ULTIMA ANALISI TAVOLA]\n"
        : "";

      const activeProjectContext = buildActiveProjectContext(activeProject);
      formData.append("message", text + techAiSoftwareContext + activeProjectContext + lastDrawingAnalysisContext);
      formData.append("messages", JSON.stringify(updatedMessages.map(m => ({ role: m.role, text: m.text }))));
      formData.append("profile", JSON.stringify({ userName: user.name, focus: interest }));
      formData.append("analysisMode", "chat");

      if (fileToSend?.file) {
        formData.append("file", fileToSend.file);
        const ext = fileToSend.file.name.split(".").pop()?.toLowerCase();
        if (ext === "pdf") {
          try {
            const pdfText = await extractPdfText(fileToSend.file);
            if (pdfText.trim()) formData.append("fileText", pdfText);
          } catch {
            // fallback backend
          }
        }
      }

      const headers = await buildApiHeaders();

      if (!headers) {
        replaceMessagesInChat(chatId, [...updatedMessages, { role: "AI", text: "⚠️ Sessione scaduta. Effettua di nuovo il login oppure entra come ospite." }]);
        return;
      }

      const res = await fetch("/api/chat", { method: "POST", headers, body: formData });
      const raw = await res.text();
      const data = safeParseJson<any>(raw, null);

      if (!res.ok) {
        const errMsg = data?.error || raw || `Errore HTTP ${res.status}`;

        if (res.status === 403 && data?.error === "Limite file ospite raggiunto") {
          replaceMessagesInChat(chatId, [
            ...updatedMessages,
            {
              role: "AI",
              text:
                `⚠️ **Limite caricamento file raggiunto** (${data.fileUsed}/${data.fileLimit} file usati).\n\n` +
                `Come ospite puoi caricare massimo **${data.fileLimit || GUEST_FILE_LIMIT} file ogni 24 ore**.\n\n` +
                `Puoi comunque continuare con domande testuali se hai ancora richieste disponibili.`,
            },
          ]);
          return;
        }

        if (res.status === 403 && data?.error === "Limite AI raggiunto") {
          replaceMessagesInChat(chatId, [
            ...updatedMessages,
            { role: "AI", text: `⚠️ **Limite AI raggiunto** (${data.used}/${data.limit} richieste usate).\n\nUpgrada al piano Pro per continuare a usare l'assistente.` },
          ]);
          return;
        }

        if (res.status === 403 && data?.error === "Limite ospite raggiunto") {
          replaceMessagesInChat(chatId, [
            ...updatedMessages,
            {
              role: "AI",
              text:
                `⚠️ **Limite ospite raggiunto** (${data.used}/${data.limit} richieste usate).\n\n` +
                `Come ospite puoi fare massimo **10 richieste ogni 24 ore**.\n\n` +
                `Accedi o registrati per continuare a usare TechAI.`,
            },
          ]);
          return;
        }

        if (res.status === 401) {
          replaceMessagesInChat(chatId, [...updatedMessages, { role: "AI", text: `⚠️ **Sessione scaduta.** Effettua di nuovo il login oppure entra come ospite.` }]);
          return;
        }

        throw new Error(errMsg);
      }

      const answer = data?.answer || data?.message || raw;
      if (!answer) throw new Error("Il backend non ha restituito una risposta valida.");

      syncGuestUsageFromBackend(data);
      replaceMessagesInChat(chatId, [...updatedMessages, { role: "AI", text: answer }]);
    } catch (error: any) {
      replaceMessagesInChat(chatId, [
        ...updatedMessages,
        {
          role: "AI",
          text:
            `⚠️ Backend non collegato correttamente.\n\n` +
            `Controlla che la rotta \`/api/chat\` esista su Vercel e che le variabili ambiente siano configurate.\n\n` +
            `Dettaglio tecnico: ${error?.message || "errore sconosciuto"}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const runProjectChecklist = () => {
    const f = checklistForm;
    const material = f.material.trim().toLowerCase();
    const loadValue = Number(String(f.load).replace(",", "."));
    const safetyValue = Number(String(f.safetyFactor).replace(",", "."));
    const environment = f.environment.trim().toLowerCase();
    const tolerances = f.tolerances.trim().toLowerCase();
    const roughness = f.roughness.trim().toLowerCase();
    const machining = f.machining.trim().toLowerCase();

    const results: ChecklistResult[] = [];

    results.push({
      area: "Materiale selezionato",
      status: material ? "⚠️ Da verificare" : "❌ Errore critico",
      detail: material ? `Materiale indicato: ${f.material}. Va confrontato con carico, ambiente e lavorazione.` : "Materiale non indicato: non è possibile valutare resistenza, trattamenti e lavorabilità.",
      suggestion: material ? "Controlla Rm, Re/Rp0.2, durezza, saldabilità e disponibilità commerciale." : "Inserisci una sigla materiale, ad esempio C45, S235JR, 42CrMo4, AISI 304.",
    });

    results.push({
      area: "Coerenza carico/materiale",
      status: !f.load.trim() || Number.isNaN(loadValue) || loadValue <= 0 ? "❌ Errore critico" : material ? "⚠️ Da verificare" : "❌ Errore critico",
      detail: !f.load.trim() || Number.isNaN(loadValue) || loadValue <= 0 ? "Carico non indicato o non numerico." : `Carico indicativo inserito: ${f.load} N. La sola checklist non sostituisce la verifica tensionale.`,
      suggestion: "Esegui almeno una verifica rapida a trazione/flessione/taglio/torsione in base al componente.",
    });

    results.push({
      area: "Ambiente d'uso",
      status: "⚠️ Da verificare",
      detail: environment ? `Ambiente indicato: ${f.environment}.` : "Ambiente non specificato: corrosione, temperatura, umidità e polveri possono cambiare la scelta del materiale.",
      suggestion: environment.includes("corros") || environment.includes("umid") || environment.includes("esterno") ? "Valuta inox, zincatura, verniciatura o altro trattamento superficiale." : "Specifica se il pezzo lavora a secco, in esterno, in olio, in ambiente corrosivo o ad alta temperatura.",
    });

    results.push({
      area: "Trattamenti termici/superficiali",
      status: material ? "⚠️ Da verificare" : "❌ Errore critico",
      detail: material ? "La necessità di trattamenti dipende da usura, fatica, durezza superficiale e accoppiamenti." : "Senza materiale non si possono proporre trattamenti compatibili.",
      suggestion: material.includes("c45") ? "Per C45 valuta bonifica o tempra superficiale se servono resistenza e durezza." : material.includes("42crmo4") ? "Per 42CrMo4 valuta bonifica se servono alte prestazioni meccaniche." : "Aggiungi una nota se sono richiesti bonifica, cementazione, nitrurazione, tempra, zincatura o anodizzazione.",
    });

    results.push({
      area: "Coefficiente di sicurezza",
      status: !f.safetyFactor.trim() || Number.isNaN(safetyValue) ? "❌ Errore critico" : safetyValue < 1.5 ? "❌ Errore critico" : safetyValue < 2 ? "⚠️ Da verificare" : "✅ Conforme",
      detail: !f.safetyFactor.trim() || Number.isNaN(safetyValue) ? "Coefficiente di sicurezza non indicato." : `Coefficiente di sicurezza indicato: n = ${f.safetyFactor}.`,
      suggestion: !f.safetyFactor.trim() || Number.isNaN(safetyValue) ? "Inserisci n. Per componenti statici spesso si parte da valori indicativi ≥ 2." : safetyValue < 1.5 ? "Valore molto basso: giustificalo con norma, prove o calcolo accurato." : "Verifica che il coefficiente sia coerente con incertezza del carico e conseguenze del cedimento.",
    });

    results.push({ area: "Tolleranze dimensionali", status: tolerances ? "✅ Conforme" : "⚠️ Da verificare", detail: tolerances ? `Tolleranze indicate: ${f.tolerances}.` : "Non risultano tolleranze o accoppiamenti indicati.", suggestion: tolerances ? "Controlla che siano presenti sulle quote funzionali." : "Aggiungi tolleranze sulle quote funzionali. Esempi: Ø10 H7, Ø20 h6, posizione fori, planarità appoggi." });
    results.push({ area: "Rugosità", status: roughness ? "✅ Conforme" : "⚠️ Da verificare", detail: roughness ? `Rugosità indicata: ${f.roughness}.` : "Rugosità non indicata.", suggestion: roughness ? "Verifica che la rugosità sia assegnata alle superfici funzionali e non solo come valore generale." : "Aggiungi rugosità generale e rugosità specifiche per sedi, scorrimenti, appoggi, tenute e accoppiamenti." });
    results.push({ area: "Note di lavorazione", status: machining || f.notes.trim() ? "⚠️ Da verificare" : "⚠️ Da verificare", detail: machining ? `Lavorazione indicata: ${f.machining}.` : "Lavorazione non specificata.", suggestion: "Indica se il pezzo è tornito, fresato, saldato, piegato, tagliato laser, rettificato o trattato. Aggiungi note per sbavatura e protezione superficiale." });

    setChecklistResults(results);
  };

  const runQuickCalc = () => {
    try {
      const material = findMaterial(quickCalcForm.material);
      const Re = material?.re || 300;
      const Rm = material?.rm || Math.max(Re * 1.4, 400);
      const E = getYoungModulus(material);
      const nRequired = toNumber(quickCalcForm.safetyFactorRequired, 2) || 2;
      const type = quickCalcForm.verificationType;

      const section = getSectionData();

      const N = toNumber(quickCalcForm.axialLoad);
      const T = toNumber(quickCalcForm.shearLoad);
      const L = toNumber(quickCalcForm.distance);
      const Mt = toNumber(quickCalcForm.torque);
      const MfInput = toNumber(quickCalcForm.bendingMoment);
      const Mf = MfInput > 0 ? MfInput : T * L;

      let title = "";
      let scheme = "";
      let formulas: string[] = [];
      let values: string[] = [];
      let notes: string[] = [...section.notes];

      let sigmaN = 0;
      let sigmaF = 0;
      let tauT = 0;
      let tauV = 0;
      let tauTot = 0;
      let sigmaTot = 0;
      let sigmaVM = 0;
      let sigmaTresca = 0;
      let safetyFactor = 0;

      if (type === "assiale") {
        sigmaN = N / section.A;
        sigmaVM = Math.abs(sigmaN);
        sigmaTresca = Math.abs(sigmaN);
        safetyFactor = Re / sigmaVM;
        title = "Verifica a trazione / compressione";
        scheme = "Barra o componente con carico assiale centrato.";
        formulas = ["A = area sezione", "σ = N / A", "n = Re / |σ|"];
        values = [
          `Carico assiale: N = ${N.toFixed(2)} N`,
          `Tensione normale: σ = ${sigmaN.toFixed(2)} MPa`,
          `Modulo elastico indicativo: E = ${E.toFixed(0)} MPa`,
        ];
        notes.push("Se il carico è di compressione e il pezzo è snello, controllare anche l'instabilità di punta.");
      }

      if (type === "taglio") {
        tauV = section.shearFactor * T / section.A;
        sigmaVM = Math.sqrt(3) * Math.abs(tauV);
        sigmaTresca = 2 * Math.abs(tauV);
        safetyFactor = Re / sigmaVM;
        title = "Verifica a taglio";
        scheme = "Sezione sollecitata da forza tagliante.";
        formulas = ["τmedio = T / A", "τmax = k · T / A", "σVM = √3 · τmax", "n = Re / σVM"];
        values = [
          `Forza tagliante: T = ${T.toFixed(2)} N`,
          `Coefficiente forma taglio: k = ${section.shearFactor.toFixed(2)}`,
          `Tensione tangenziale massima indicativa: τ = ${tauV.toFixed(2)} MPa`,
          `Tensione equivalente Von Mises: σVM = ${sigmaVM.toFixed(2)} MPa`,
        ];
        notes.push("Per spine/perni controllare se il taglio è singolo o doppio.");
      }

      if (type === "flessione") {
        sigmaF = Mf / section.Wf;
        sigmaVM = Math.abs(sigmaF);
        sigmaTresca = Math.abs(sigmaF);
        safetyFactor = Re / sigmaVM;
        title = "Verifica a flessione";
        scheme = MfInput > 0 ? "Momento flettente inserito direttamente." : "Momento flettente calcolato da forza tagliante e braccio: Mf = T · L.";
        formulas = ["Mf = T · L oppure valore inserito", "Wf = modulo resistente a flessione", "σf = Mf / Wf", "n = Re / |σf|"];
        values = [
          `Forza tagliante: T = ${T.toFixed(2)} N`,
          `Braccio: L = ${L.toFixed(2)} mm`,
          `Momento flettente: Mf = ${Mf.toFixed(2)} Nmm`,
          `Tensione di flessione: σf = ${sigmaF.toFixed(2)} MPa`,
        ];
      }

      if (type === "torsione") {
        tauT = Mt / section.Wt;
        sigmaVM = Math.sqrt(3) * Math.abs(tauT);
        sigmaTresca = 2 * Math.abs(tauT);
        safetyFactor = Re / sigmaVM;
        title = "Verifica a torsione";
        scheme = "Sezione sollecitata da momento torcente.";
        formulas = ["Wt = modulo resistente a torsione", "τt = Mt / Wt", "σVM = √3 · τt", "n = Re / σVM"];
        values = [
          `Momento torcente: Mt = ${Mt.toFixed(2)} Nmm`,
          `Tensione tangenziale di torsione: τt = ${tauT.toFixed(2)} MPa`,
          `Tensione equivalente Von Mises: σVM = ${sigmaVM.toFixed(2)} MPa`,
        ];
        notes.push("Per alberi con cave linguetta o spallamenti applicare coefficienti di intaglio.");
      }

      if (
        type === "flessione_torsione" ||
        type === "flessione_taglio" ||
        type === "trazione_flessione" ||
        type === "trazione_torsione" ||
        type === "generale"
      ) {
        sigmaN = N / section.A;
        sigmaF = Mf / section.Wf;
        tauT = Mt / section.Wt;
        tauV = section.shearFactor * T / section.A;

        const useAxial = type === "trazione_flessione" || type === "trazione_torsione" || type === "generale";
        const useBending = type === "flessione_torsione" || type === "flessione_taglio" || type === "trazione_flessione" || type === "generale";
        const useTorsion = type === "flessione_torsione" || type === "trazione_torsione" || type === "generale";
        const useShear = type === "flessione_taglio" || type === "generale";

        sigmaTot = (useAxial ? sigmaN : 0) + (useBending ? sigmaF : 0);
        tauTot = Math.sqrt((useTorsion ? tauT : 0) ** 2 + (useShear ? tauV : 0) ** 2);

        sigmaVM = Math.sqrt(sigmaTot ** 2 + 3 * tauTot ** 2);
        sigmaTresca = Math.sqrt(sigmaTot ** 2 + 4 * tauTot ** 2);
        safetyFactor = Re / sigmaVM;

        const titles: Record<string, string> = {
          flessione_torsione: "Verifica composta: flessione + torsione",
          flessione_taglio: "Verifica composta: flessione + taglio",
          trazione_flessione: "Verifica composta: trazione/compressione + flessione",
          trazione_torsione: "Verifica composta: trazione/compressione + torsione",
          generale: "Verifica generale: assiale + flessione + torsione + taglio",
        };

        title = titles[type];
        scheme = "Sollecitazioni combinate sulla stessa sezione. Verifica equivalente con Von Mises e confronto indicativo con Tresca.";
        formulas = [
          "σN = N / A",
          "σf = Mf / Wf",
          "τt = Mt / Wt",
          "τV = k · T / A",
          "σtot = σN + σf",
          "τtot = √(τt² + τV²)",
          "σVM = √(σtot² + 3τtot²)",
          "σTresca ≈ √(σtot² + 4τtot²)",
          "n = Re / σVM",
        ];
        values = [
          `Carico assiale: N = ${N.toFixed(2)} N`,
          `Forza tagliante: T = ${T.toFixed(2)} N`,
          `Braccio: L = ${L.toFixed(2)} mm`,
          `Momento flettente usato: Mf = ${Mf.toFixed(2)} Nmm`,
          `Momento torcente: Mt = ${Mt.toFixed(2)} Nmm`,
          `σN = ${sigmaN.toFixed(2)} MPa`,
          `σf = ${sigmaF.toFixed(2)} MPa`,
          `τt = ${tauT.toFixed(2)} MPa`,
          `τV = ${tauV.toFixed(2)} MPa`,
          `σtot usata = ${sigmaTot.toFixed(2)} MPa`,
          `τtot usata = ${tauTot.toFixed(2)} MPa`,
          `Von Mises: σVM = ${sigmaVM.toFixed(2)} MPa`,
          `Tresca indicativo: σTresca = ${sigmaTresca.toFixed(2)} MPa`,
        ];
        notes.push("Per alberi reali considera anche intagli, cava linguetta, fatica e diametri normalizzati.");
      }

      if (type === "pressione_interna") {
        const pBar = toNumber(quickCalcForm.pressure);
        const p = pBar * 0.1;
        const r = toNumber(quickCalcForm.radius);
        const sp = toNumber(quickCalcForm.thickness);

        if (pBar <= 0 || r <= 0 || sp <= 0) {
          throw new Error("Per la pressione interna inserisci p [bar], raggio medio r [mm] e spessore s [mm].");
        }

        const sigmaCirc = p * r / sp;
        const sigmaLong = p * r / (2 * sp);

        sigmaVM = Math.sqrt(sigmaCirc ** 2 - sigmaCirc * sigmaLong + sigmaLong ** 2);
        sigmaTresca = Math.max(Math.abs(sigmaCirc - sigmaLong), Math.abs(sigmaCirc), Math.abs(sigmaLong));
        safetyFactor = Re / sigmaVM;

        title = "Verifica recipiente cilindrico in pressione";
        scheme = "Guscio cilindrico sottile con pressione interna. Formula valida come stima se s << r.";
        formulas = [
          "p[MPa] = p[bar] · 0,1",
          "σcirconferenziale = p · r / s",
          "σlongitudinale = p · r / (2s)",
          "σVM = √(σc² - σcσl + σl²)",
          "n = Re / σVM",
        ];
        values = [
          `Pressione: p = ${pBar.toFixed(2)} bar = ${p.toFixed(2)} MPa`,
          `Raggio medio: r = ${r.toFixed(2)} mm`,
          `Spessore: s = ${sp.toFixed(2)} mm`,
          `σ circonferenziale = ${sigmaCirc.toFixed(2)} MPa`,
          `σ longitudinale = ${sigmaLong.toFixed(2)} MPa`,
          `Von Mises: σVM = ${sigmaVM.toFixed(2)} MPa`,
          `Tresca indicativo: σTresca = ${sigmaTresca.toFixed(2)} MPa`,
        ];
        notes.push("Per recipienti reali considera saldature, fondi, aperture, normative e coefficienti di sicurezza specifici.");
      }

      if (type === "stato_piano") {
        const sx = toNumber(quickCalcForm.sigmaX);
        const sy = toNumber(quickCalcForm.sigmaY);
        const txy = toNumber(quickCalcForm.tauXY);

        const center = (sx + sy) / 2;
        const radius = Math.sqrt(((sx - sy) / 2) ** 2 + txy ** 2);
        const s1 = center + radius;
        const s2 = center - radius;
        const s3 = 0;

        sigmaVM = Math.sqrt(sx ** 2 - sx * sy + sy ** 2 + 3 * txy ** 2);
        sigmaTresca = Math.max(Math.abs(s1 - s2), Math.abs(s1 - s3), Math.abs(s2 - s3));
        safetyFactor = Re / sigmaVM;

        title = "Stato piano di tensione";
        scheme = "Calcolo tensioni principali, taglio massimo, Von Mises e Tresca da σx, σy, τxy.";
        formulas = [
          "σ1,2 = (σx+σy)/2 ± √[((σx-σy)/2)² + τxy²]",
          "τmax = √[((σx-σy)/2)² + τxy²]",
          "σVM = √(σx² - σxσy + σy² + 3τxy²)",
          "σTresca = max(|σ1-σ2|, |σ1|, |σ2|)",
          "n = Re / σVM",
        ];
        values = [
          `σx = ${sx.toFixed(2)} MPa`,
          `σy = ${sy.toFixed(2)} MPa`,
          `τxy = ${txy.toFixed(2)} MPa`,
          `σ1 = ${s1.toFixed(2)} MPa`,
          `σ2 = ${s2.toFixed(2)} MPa`,
          `τmax = ${radius.toFixed(2)} MPa`,
          `Von Mises: σVM = ${sigmaVM.toFixed(2)} MPa`,
          `Tresca: σTresca = ${sigmaTresca.toFixed(2)} MPa`,
        ];
      }

      if (type === "fatica") {
        const sMax = toNumber(quickCalcForm.sigmaMax);
        const sMin = toNumber(quickCalcForm.sigmaMin);
        const SnInput = toNumber(quickCalcForm.fatigueLimit);
        const Sn = SnInput > 0 ? SnInput : 0.5 * Rm;

        const sm = (sMax + sMin) / 2;
        const sa = Math.abs(sMax - sMin) / 2;

        const denominator = sa / Sn + Math.max(sm, 0) / Rm;
        safetyFactor = denominator > 0 ? 1 / denominator : 999;
        sigmaVM = sa;
        sigmaTresca = undefined;

        title = "Verifica a fatica semplificata";
        scheme = "Verifica tipo Goodman con tensione media e alternata. Valida come controllo preliminare.";
        formulas = [
          "σm = (σmax + σmin) / 2",
          "σa = |σmax - σmin| / 2",
          "Sn ≈ 0,5 · Rm se non inserito",
          "1/n = σa/Sn + σm/Rm",
        ];
        values = [
          `σmax = ${sMax.toFixed(2)} MPa`,
          `σmin = ${sMin.toFixed(2)} MPa`,
          `σm = ${sm.toFixed(2)} MPa`,
          `σa = ${sa.toFixed(2)} MPa`,
          `Rm = ${Rm.toFixed(2)} MPa`,
          `Sn usato = ${Sn.toFixed(2)} MPa`,
          `Coefficiente a fatica: n = ${safetyFactor.toFixed(2)}`,
        ];
        notes.push("Per fatica reale correggere Sn con rugosità, dimensione, affidabilità, tipo di sollecitazione e intaglio.");
      }

      if (!Number.isFinite(sigmaVM) || sigmaVM <= 0) {
        throw new Error("La tensione calcolata è nulla o non valida. Inserisci carichi/momenti coerenti con il tipo di verifica scelto.");
      }

      const outcome = safetyFactor >= nRequired ? "OK" : "NON OK";

      const materialText = material
        ? `${material.name} (${material.en})`
        : `${quickCalcForm.material} non trovato: usati valori indicativi Re = ${Re} MPa, Rm = ${Rm} MPa`;

      setQuickCalcResult({
        title,
        scheme,
        section: section.name,
        formulas,
        sectionValues: [
          `Materiale usato: ${materialText}`,
          `Re/Rp0.2 usato: ${Re.toFixed(2)} MPa`,
          `Rm usato: ${Rm.toFixed(2)} MPa`,
          ...section.values,
        ],
        values: [
          ...values,
          `Tensione equivalente finale: ${sigmaVM.toFixed(2)} MPa`,
          `Coefficiente di sicurezza richiesto: n_req = ${nRequired.toFixed(2)}`,
          `Coefficiente di sicurezza calcolato: n = ${safetyFactor.toFixed(2)}`,
        ],
        equivalentStress: sigmaVM,
        trescaStress: sigmaTresca,
        safetyFactor,
        outcome,
        notes,
      });
    } catch (error: any) {
      setQuickCalcResult({
        title: "Errore nei dati inseriti",
        scheme: "Il modulo non riesce a completare la verifica perché uno o più dati non sono coerenti.",
        section: "Non calcolata",
        formulas: [],
        sectionValues: [],
        values: [],
        equivalentStress: 0,
        safetyFactor: 0,
        outcome: "NON OK",
        notes: [error?.message || "Controlla i dati inseriti e riprova."],
      });
    }
  };

  const handleDrawingReviewUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isImg = isImageFile(file);
    const isPdf = isPdfFile(file);

    if (!isImg && !isPdf) {
      alert("Carica un'immagine (PNG, JPG, JPEG, WebP) oppure un PDF della tavola.");
      event.target.value = "";
      return;
    }

    if (drawingReviewFile?.previewUrl) URL.revokeObjectURL(drawingReviewFile.previewUrl);

    setDrawingResults([]);
    setDrawingIssues([]);

    if (isPdf) {
      setDrawingAiLoading(true);
      try {
        const { dataUrl, jpegFile, totalPages, drawingImages, extractedText } = await pdfPageToImageFile(file);
        setDrawingReviewFile({
          file,
          fileAttachment: makeAttachment(file),
          previewUrl: dataUrl,
          convertedFile: jpegFile,
          drawingImages,
          extractedText,
          isPdf: true,
          totalPages,
        });
      } catch {
        alert("Errore nella conversione del PDF. Prova con un altro file.");
      } finally {
        setDrawingAiLoading(false);
      }
    } else {
      setDrawingAiLoading(true);
      try {
        const drawingImages = await makeDrawingImagesFromImageFile(file);
        setDrawingReviewFile({ file, fileAttachment: makeAttachment(file), previewUrl: URL.createObjectURL(file), drawingImages });
      } catch {
        setDrawingReviewFile({ file, fileAttachment: makeAttachment(file), previewUrl: URL.createObjectURL(file) });
      } finally {
        setDrawingAiLoading(false);
      }
    }

    event.target.value = "";
  };

  const removeDrawingReviewFile = () => {
    if (drawingReviewFile?.previewUrl) URL.revokeObjectURL(drawingReviewFile.previewUrl);
    setDrawingReviewFile(null);
    setDrawingResults([]);
    setDrawingIssues([]);
    if (drawingReviewInputRef.current) drawingReviewInputRef.current.value = "";
  };

  const askTechAIFromDrawing = (customMessage?: string) => {
    const analysisContext = lastDrawingAnalysisText.trim();
    const message = customMessage ||
      (analysisContext
        ? "Sulla base dell'analisi della tavola appena eseguita, puoi spiegarmi le criticità trovate e come correggerle?"
        : "Ho una domanda sulla tavola tecnica che sto analizzando.");
    setQuery(message);
    setShowDrawingGenerator(false);
  };

  const runDrawingGenerator = async () => {
    const f = drawingForm;

    if (isDrawingUpload(drawingReviewFile)) {
      setDrawingAiLoading(true);
      setDrawingResults([]);
      setDrawingIssues([]);

      try {
        const sourceFileToSend = drawingReviewFile!.convertedFile ?? drawingReviewFile!.file;
        const fileToSend = await compressImageForVision(sourceFileToSend, 1800, 0.86);
        const drawingImages = drawingReviewFile!.drawingImages?.length
          ? drawingReviewFile!.drawingImages
          : await makeDrawingImagesFromImageFile(fileToSend);
        const formData = new FormData();

        formData.append(
          "message",
          `Sei un esperto di disegno tecnico meccanico secondo le norme ISO 128, ISO 1101 e ISO 286.
Analizza con MASSIMA PRECISIONE questa tavola tecnica. Le immagini inviate sono crop automatici dinamici preparati da src/utils/technicalDrawingUtils.ts: alcuni vengono da parole chiave del PDF, altri da aree grafiche dense, più alcuni crop di sicurezza. Sono tutte porzioni della stessa tavola, non tavole diverse. Leggi ogni quota, simbolo e annotazione visibile.

DATI DEL PEZZO FORNITI DALL'UTENTE:
- Nome pezzo: ${f.partName || "non indicato"}
- Tipo pezzo: ${f.partType || "non indicato"}
- Materiale: ${f.material || "non indicato"}
- Quantità/lotto: ${f.productionQuantity || "non indicato"}
- Lavorazione prevista: ${f.manufacturing || "non indicata"}
- Geometrie principali: ${f.mainFeatures || "non indicate"}
- Funzione nell'assieme: ${f.assemblyFunction || "non indicata"}
- Superfici funzionali: ${f.functionalSurfaces || "non indicate"}
- Fori/filetti/lamature: ${f.holesThreads || "non indicati"}
- Accoppiamenti/tolleranze: ${f.fits || f.tolerances || "non indicati"}
- Rugosità: ${f.roughness || "non indicate"}
- Indicazioni aggiuntive / ALTRO: ${drawingExtraNotes.trim() || "nessuna indicazione aggiuntiva"}

SEZIONE ALTRO / INDICAZIONI AGGIUNTIVE:
Se l'utente ha compilato il campo ALTRO, usa quelle indicazioni come priorità dell'analisi.
Esempi: se chiede quote funzionali, crea una sezione dedicata alle quote funzionali e critiche; se chiede rugosità, concentrati sulle superfici funzionali; se chiede cartiglio, controlla soprattutto dati cartiglio.
Non ignorare il campo ALTRO, ma non inventare dati non leggibili dalla tavola.

COSA DEVI CONTROLLARE:
1. CARTIGLIO: nome pezzo, numero disegno, materiale, scala, data, revisione, autore.
2. VISTE E SEZIONI: viste sufficienti, sezioni A-A/B-B, linee di taglio.
3. QUOTATURA: cita quote leggibili, quote mancanti, duplicate o in conflitto.
4. TOLLERANZE DIMENSIONALI: ISO visibili, coerenza con funzione.
5. TOLLERANZE GEOMETRICHE: simboli GD&T e datum.
6. RUGOSITÀ: simboli Ra/Rz visibili.
7. FILETTI E FORI: designazioni, profondità, lamature.
8. TRATTAMENTI E MATERIALE.
9. ERRORI CRITICI.
10. VERIFICHE SPIEGABILI: per ogni criticità o quota funzionale indica motivazione tecnica, confidenza, riferimento tecnico ISO/UNI o principio tecnico e suggerimento correttivo.

Rispondi SOLO con quanto vedi realmente. Se non è leggibile, dillo.
Se nel testo estratto dal PDF trovi un dato ma non riesci a collegarlo chiaramente alla zona della tavola, scrivilo come dato da confermare e non usarlo per conclusioni definitive.

Struttura:
## 1. Cartiglio
## 2. Viste e sezioni
## 3. Quotatura
## 4. Tolleranze dimensionali
## 5. Tolleranze geometriche
## 6. Rugosità
## 7. Filetti e fori
## 8. Materiale e trattamenti
## 9. Errori critici e correzioni prioritarie
## 10. Verifiche spiegabili
Per ogni criticità usa sempre: Descrizione, Motivazione tecnica, Confidenza, Riferimento tecnico, Suggerimento correttivo.
## 11. Giudizio finale (Approvata / Da correggere / Non producibile)`
        );
        formData.append("file", fileToSend);
        formData.append(
          "drawingImages",
          JSON.stringify(
            drawingImages.slice(0, 12).map((img, index) => ({
              label: img.label || `Crop tavola ${index + 1}`,
              dataUrl: img.dataUrl,
            }))
          )
        );
        if (drawingReviewFile!.extractedText?.trim()) {
          formData.append("fileText", drawingReviewFile!.extractedText.slice(0, 26000));
        }
        formData.append("profile", JSON.stringify({ userName: user.name, focus: interest }));
        formData.append("messages", JSON.stringify([]));
        formData.append("analysisMode", "drawing");

        const headers = await buildApiHeaders();
        if (!headers) throw new Error("Sessione scaduta. Effettua di nuovo il login oppure entra come ospite.");

        const res = await fetch("/api/chat", { method: "POST", headers, body: formData });
        const raw = await res.text();
        const data = safeParseJson<any>(raw, null);

        if (res.status === 403 && data?.error === "Limite AI raggiunto") {
          throw new Error(`Limite AI raggiunto (${data.used}/${data.limit} richieste). Upgrada al piano Pro per continuare.`);
        }

        if (res.status === 403 && data?.error === "Limite file ospite raggiunto") {
          throw new Error(`Limite caricamento file ospite raggiunto (${data.fileUsed}/${data.fileLimit} file usati). Come ospite puoi caricare massimo ${data.fileLimit || GUEST_FILE_LIMIT} file ogni 24 ore.`);
        }

        if (res.status === 403 && data?.error === "Limite ospite raggiunto") {
          throw new Error(`Limite ospite raggiunto (${data.used}/${data.limit} richieste). Come ospite puoi fare massimo 10 richieste ogni 24 ore. Accedi o registrati per continuare.`);
        }

        if (!res.ok) throw new Error(data?.error || raw || `Errore HTTP ${res.status}`);

        const answer = data?.answer || data?.message || raw || "Nessuna risposta ricevuta dall'analisi immagine.";
        setLastDrawingAnalysisText(String(answer));
        syncGuestUsageFromBackend(data);

        // ── Lookup zone semantiche → coordinate per formato foglio ──
        const ZONE_COORDS: Record<string, Record<string, {x: number, y: number}>> = {
          A4:{ cartiglio:{x:82,y:90},vista_principale:{x:35,y:40},sezione_aa:{x:68,y:38},sezione_bb:{x:68,y:65},quotatura:{x:50,y:22},rugosita:{x:72,y:18},tolleranze:{x:45,y:30},fori_filetti:{x:38,y:55},note_generali:{x:20,y:85},cartiglio_materiale:{x:75,y:93},cartiglio_scala:{x:88,y:93},vista_destra:{x:65,y:42},vista_alto:{x:35,y:18} },
          A3:{ cartiglio:{x:84,y:91},vista_principale:{x:32,y:42},sezione_aa:{x:65,y:36},sezione_bb:{x:65,y:62},quotatura:{x:50,y:20},rugosita:{x:75,y:16},tolleranze:{x:45,y:28},fori_filetti:{x:35,y:55},note_generali:{x:18,y:87},cartiglio_materiale:{x:77,y:94},cartiglio_scala:{x:89,y:94},vista_destra:{x:63,y:40},vista_alto:{x:32,y:16} },
          A2:{ cartiglio:{x:85,y:92},vista_principale:{x:28,y:44},sezione_aa:{x:62,y:35},sezione_bb:{x:62,y:60},quotatura:{x:48,y:18},rugosita:{x:76,y:14},tolleranze:{x:42,y:26},fori_filetti:{x:32,y:55},note_generali:{x:15,y:88},cartiglio_materiale:{x:78,y:95},cartiglio_scala:{x:90,y:95},vista_destra:{x:60,y:38},vista_alto:{x:28,y:14} },
          A1:{ cartiglio:{x:86,y:92},vista_principale:{x:25,y:45},sezione_aa:{x:58,y:34},sezione_bb:{x:58,y:60},quotatura:{x:45,y:16},rugosita:{x:78,y:12},tolleranze:{x:40,y:24},fori_filetti:{x:28,y:55},note_generali:{x:12,y:88},cartiglio_materiale:{x:80,y:95},cartiglio_scala:{x:91,y:95},vista_destra:{x:56,y:37},vista_alto:{x:25,y:12} },
          A0:{ cartiglio:{x:87,y:93},vista_principale:{x:22,y:46},sezione_aa:{x:55,y:33},sezione_bb:{x:55,y:58},quotatura:{x:42,y:14},rugosita:{x:80,y:10},tolleranze:{x:38,y:22},fori_filetti:{x:25,y:55},note_generali:{x:10,y:89},cartiglio_materiale:{x:82,y:96},cartiglio_scala:{x:92,y:96},vista_destra:{x:52,y:36},vista_alto:{x:22,y:10} },
        };
        const sheetFmt = (drawingForm.sheetFormat || "A3").toUpperCase();
        const zoneMap = ZONE_COORDS[sheetFmt] || ZONE_COORDS["A3"];

        // ── Parsa PINS_JSON dalla risposta AI ──
        const answerText = String(answer);
        const pinsMatch = answerText.match(/<PINS>\s*([\s\S]*?)\s*<\/PINS>/i);
        let parsedIssues: DrawingIssue[] = [];
        if (pinsMatch) {
          try {
            const pinsData = JSON.parse(pinsMatch[1].trim());
            if (Array.isArray(pinsData)) {
              parsedIssues = pinsData.map((p: any, i: number) => {
                const zona = String(p.zona || "").toLowerCase().replace(/[\s\-]/g, "_");
                const coords = zona && zoneMap[zona] ? zoneMap[zona] : { x: Number(p.x) || 50, y: Number(p.y) || 50 };
                return {
                  id: String(p.id || `pin-${i}`),
                  label: String(p.label || 'Criticità'),
                  severity: ['errore','attenzione','info'].includes(p.severity) ? p.severity : 'attenzione',
                  x: Math.min(100, Math.max(0, coords.x)),
                  y: Math.min(100, Math.max(0, coords.y)),
                  detail: String(p.detail || ''),
                };
              });
            }
          } catch { parsedIssues = []; }
        }
        //if (parsedIssues.length === 0) {
          //parsedIssues = [{ id: 'ai-ok', label: 'Analisi completata', severity: 'info', x: 50, y: 50, detail: 'Nessuna criticità rilevata con evidenza chiara.' }];
        
        // Rimuovi il blocco PINS dal testo mostrato all'utente
        const cleanAnswer = answerText.replace(/<PINS>[\s\S]*?<\/PINS>/gi, '').trim();

        // ── Allinea status card al giudizio finale nel testo ──
        // NON forziamo pin singolo: l'AI mette già tutti i pin necessari con le zone corrette
        const isNotApproved = /non approvata|da correggere|non producibile/i.test(cleanAnswer);
        const isApproved = /approvata(?! con riserva)|giudizio finale[^\n]*approvata/i.test(cleanAnswer);

        // Se l'AI ha messo solo pin info ma il giudizio è NON APPROVATA,
        // aggiunge un pin errore AGGIUNTIVO (non sostituisce gli altri)
        if (isNotApproved && parsedIssues.every(p => p.severity === 'info')) {
          const motivoMatch = cleanAnswer.match(/(?:motivo principale|motivo)[^:]*:\s*([^\n.]+)/i);
          const motivo = motivoMatch ? motivoMatch[1].trim() : 'Tavola non approvata: vedere analisi completa.';
          parsedIssues.push({ id: 'ai-notapproved', label: 'Non approvata', severity: 'errore', x: 50, y: 88, detail: motivo });
        }

        // Status card allineato al giudizio
        const cardStatus = isNotApproved ? '❌ Non approvata' : isApproved ? '✅ Approvata' : '⚠️ Da verificare';

        setDrawingIssues(parsedIssues);
        setDrawingResults([
          {
            category: "Analisi AI immagine",
            status: cardStatus,
            item: drawingReviewFile!.fileAttachment.name,
            reason: cleanAnswer,
            suggestion: "Usa questa analisi come revisione preliminare: controlla manualmente la tavola originale.",
          },
        ]);
        setLastDrawingAnalysisText(cleanAnswer);
      } catch (error: any) {
        setDrawingIssues([{ id: "ai-error", label: "Errore analisi", severity: "errore", x: 50, y: 50, detail: error?.message || "Errore durante l'analisi immagine." }]);
        setDrawingResults([
          {
            category: "Errore analisi immagine",
            status: "❌ Errore",
            item: drawingReviewFile?.fileAttachment.name || "immagine",
            reason: error?.message || "Non sono riuscito ad analizzare l'immagine.",
            suggestion: "Controlla OPENAI_DRAWING_READER_API_KEY, OPENAI_DRAWING_READER_MODEL e fai redeploy su Vercel.",
          },
        ]);
      } finally {
        setDrawingAiLoading(false);
      }

      return;
    }

    const issues: DrawingIssue[] = [];
    const results: DrawingResult[] = [];
    const text = `${f.partType} ${f.mainFeatures} ${f.holesThreads} ${f.fits} ${drawingExtraNotes}`.toLowerCase();

    if (!f.functionalSurfaces.trim()) issues.push({ id: "funzionali", label: "Superfici funzionali", severity: "errore", x: 24, y: 28, detail: "Mancano superfici funzionali: indica sedi, appoggi, scorrimenti, battute o riferimenti." });
    if (!f.tolerances.trim() && !f.fits.trim()) issues.push({ id: "tolleranze", label: "Tolleranze", severity: "errore", x: 66, y: 35, detail: "Mancano tolleranze o accoppiamenti sulle quote importanti." });
    if (!f.roughness.trim()) issues.push({ id: "rugosita", label: "Rugosità", severity: "attenzione", x: 44, y: 62, detail: "Manca rugosità generale o specifica sulle superfici funzionali." });
    if (!f.material.trim() || !f.manufacturing.trim()) issues.push({ id: "cartiglio", label: "Cartiglio", severity: "attenzione", x: 78, y: 78, detail: "Controlla materiale, lavorazione, trattamento, scala, unità e note generali nel cartiglio." });
    if (text.includes("foro") || text.includes("filett") || text.includes("lamatura")) issues.push({ id: "fori", label: "Fori/filetti", severity: "info", x: 58, y: 22, detail: "Verifica diametri, profondità, posizioni, lamature/svasature e tolleranze dei fori." });
    if (issues.length === 0) issues.push({ id: "ok", label: "Controllo base OK", severity: "info", x: 50, y: 50, detail: "Non emergono mancanze principali dai dati inseriti." });

    results.push(
      { category: "Viste", status: "✅ Necessaria", item: "Vista principale", reason: "Serve per mostrare la forma più riconoscibile e le quote principali.", suggestion: "Scegli la vista più rappresentativa del pezzo." },
      { category: "Sezioni", status: "🟦 Consigliata", item: "Sezione A-A", reason: "Utile se ci sono fori, cave, lamature o geometrie interne.", suggestion: "Aggiungi sezioni solo dove chiariscono dettagli nascosti." },
      { category: "Quote", status: "⚠️ Da verificare", item: "Quote funzionali", reason: "Le quote devono descrivere funzione e producibilità, non solo ingombri.", suggestion: "Evita catene chiuse e quota da riferimenti funzionali." },
      { category: "Cartiglio", status: f.material.trim() ? "⚠️ Da verificare" : "❌ Mancante", item: "Materiale/note", reason: f.material.trim() ? `Materiale indicato: ${f.material}.` : "Materiale non indicato.", suggestion: "Riporta materiale, trattamento, scala, unità, tolleranze generali e note." }
    );

    setDrawingIssues(issues);
    setDrawingResults(results);
  };

  // ── KaTeX: renderizza LaTeX \[...\] e \(...\) ──
  const renderLatex = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    const regex = /\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
      const raw = match[0];
      const isDisplay = raw.startsWith("\\[") || raw.startsWith("$$");
      const inner = raw
        .replace(/^\\\[/, "").replace(/\\\]$/, "")
        .replace(/^\\\(/, "").replace(/\\\)$/, "")
        .replace(/^\$\$/, "").replace(/\$\$$/, "")
        .replace(/^\$/, "").replace(/\$$/, "");
      try {
        const html = katex.renderToString(inner.trim(), {
          displayMode: isDisplay,
          throwOnError: false,
          output: "html",
        });
        parts.push(
          <span
            key={`katex-${match.index}`}
            dangerouslySetInnerHTML={{ __html: html }}
            style={{
              display: isDisplay ? "block" : "inline",
              margin: isDisplay ? "8px 0" : undefined,
              overflowX: isDisplay ? "auto" : undefined,
            }}
          />
        );
      } catch { parts.push(raw); }
      lastIndex = match.index + raw.length;
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex));
    return parts;
  };

  const renderFormattedText = (text: string) => {
    const blocks = text.split(/(```[\s\S]*?```)/g);

    return blocks.map((block, index) => {
      if (!block) return null;

      if (block.startsWith("```") && block.endsWith("```")) {
        return (
          <pre key={index} style={s.codeBlock}>
            <code>{block.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").replace(/\*\*/g, "")}</code>
          </pre>
        );
      }

      // Collassa blocchi \[...\] e \(...\) spezzati su più righe
      const collapseLatexBlocks = (s: string): string => {
        const result: string[] = [];
        const rawLines = s.split("\n");
        let i = 0;
        while (i < rawLines.length) {
          const trimmed = rawLines[i].trim();
          if (trimmed === "\\[") {
            const collected: string[] = [];
            i++;
            while (i < rawLines.length && rawLines[i].trim() !== "\\]") {
              collected.push(rawLines[i]);
              i++;
            }
            result.push("\\[" + collected.join(" ").trim() + "\\]");
            i++; // skip the \]
          } else if (trimmed === "\\(") {
            const collected: string[] = [];
            i++;
            while (i < rawLines.length && rawLines[i].trim() !== "\\)") {
              collected.push(rawLines[i]);
              i++;
            }
            result.push("\\(" + collected.join(" ").trim() + "\\)");
            i++;
          } else {
            result.push(rawLines[i]);
            i++;
          }
        }
        return result.join("\n");
      };
      const collapsedBlock = collapseLatexBlocks(block);
      return collapsedBlock.split("\n").map((line, lineIndex) => {
        const trimmed = line.trim();
        const key = `${index}-${lineIndex}`;

        if (!trimmed) return <div key={key} style={{ height: 8 }} />;

        if (trimmed.startsWith("### ")) {
          return <h3 key={key} style={{ color: theme.primary }}>{renderLatex(trimmed.slice(4))}</h3>;
        }

        if (trimmed.startsWith("## ")) {
          return <h2 key={key} style={{ color: theme.primary }}>{renderLatex(trimmed.slice(3))}</h2>;
        }

        const numberedMatch = trimmed.match(/^(\d+\.\s+)(.*)$/);
        if (numberedMatch) {
          return (
            <div key={key} style={s.numberedLine}>
              <span>{numberedMatch[1]}</span>
              {renderLatex(numberedMatch[2])}
            </div>
          );
        }

        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return <div key={key} style={s.bulletLine}>• {renderLatex(trimmed.slice(2))}</div>;
        }

        if (trimmed.startsWith("• ")) {
          return <div key={key} style={s.bulletLine}>• {renderLatex(trimmed.slice(2))}</div>;
        }

        return <div key={key} style={s.messageLine}>{renderLatex(line)}</div>;
      });
    });
  };

  const iconBtn = (icon: string, label: string, onClick: () => void) => (
    <button
      style={{
        ...s.iconBtn,
        color: theme.text,
        justifyContent: sidebarOpen ? "flex-start" : "center",
        width: sidebarOpen ? "100%" : 44,
      }}
      onClick={onClick}
      title={label}
      type="button"
    >
      <span style={s.icon}>{icon}</span>
      {sidebarOpen && <span>{label}</span>}
    </button>
  );

  const renderInputBar = (placeholder: string) => (
    <div style={{ ...s.inputComposer, background: theme.surface, border: `1px solid ${theme.border}` }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.csv,.json,.xml,.html,.css,.js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.h,.sql,.yaml,.yml,.pdf,.docx,.xlsx,image/*"
        style={{ display: "none" }}
        onChange={handleFileUpload}
      />

      {pendingFile && (
        <div style={{ ...s.pendingFileChip, border: `1px solid ${theme.border}` }}>
          <div style={{ ...s.fileIcon, background: theme.primary }}>📄</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong>{pendingFile.fileAttachment.name}</strong>
            <div style={s.muted}>{(pendingFile.fileAttachment.size / 1024).toFixed(1)} KB · pronto da inviare al backend</div>
          </div>
          <button style={s.roundBtn} onClick={removePendingFile} type="button">×</button>
        </div>
      )}

      <div style={s.searchBarInner}>
        <button style={{ ...s.fileBtn, color: theme.primary }} onClick={() => fileInputRef.current?.click()} type="button">📎</button>
        <textarea
          style={{ ...s.textarea, color: theme.text }}
          rows={1}
          value={query}
          placeholder={placeholder}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              callAI();
            }
          }}
        />
        <button style={{ ...s.sendBtn, color: theme.primary }} onClick={callAI} disabled={loading || (!query.trim() && !pendingFile)} type="button">➤</button>
      </div>
    </div>
  );

  const renderLoginCard = () => {
    const isRegister = authMode === "register";
    const inputStyle = { ...s.input, background: isDark ? "#050505" : "#fff", color: theme.text, border: `1px solid ${theme.border}` };
    const tabBase: React.CSSProperties = { flex: 1, padding: "8px 0", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 15, borderRadius: 10, transition: "background 0.2s" };

    return (
      <div className="slide-in" style={{ ...s.loginCard, position: "relative", background: isDark ? "#111" : "#fff", color: theme.text, border: `1px solid ${theme.border}` }}>
        <button
          type="button"
          onClick={() => showLoginPanel ? setShowLoginPanel(false) : setLoginDismissed(true)}
          style={{ position: "absolute", top: 14, right: 14, background: "transparent", border: "none", cursor: "pointer", fontSize: 22, lineHeight: 1, color: theme.text, opacity: 0.5, padding: 4 }}
        >✕</button>

        <h1>TECH<span style={{ color: theme.primary }}>AI</span></h1>

        <div style={{ display: "flex", gap: 6, marginBottom: 22, background: isDark ? "#1a1a1a" : "#f2f2f2", borderRadius: 12, padding: 4 }}>
          <button style={{ ...tabBase, background: !isRegister ? theme.primary : "transparent", color: !isRegister ? "#fff" : theme.text }} onClick={() => { setAuthMode("login"); setLoginError(""); }} type="button">Accedi</button>
          <button style={{ ...tabBase, background: isRegister ? theme.primary : "transparent", color: isRegister ? "#fff" : theme.text }} onClick={() => { setAuthMode("register"); setLoginError(""); }} type="button">Registrati</button>
        </div>

        {isRegister && <Field label="Nome" value={loginName} onChange={setLoginName} placeholder="Il tuo nome" theme={theme} isDark={isDark} />}
        <Field label="Email" value={loginEmail} onChange={setLoginEmail} placeholder="email@esempio.com" theme={theme} isDark={isDark} />

        <label style={s.label}>Password</label>
        <input style={inputStyle} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} type="password" placeholder={isRegister ? "Minimo 6 caratteri" : ""} />

        {loginError && <div style={{ ...s.errorBox, color: loginError.startsWith("Registrazione") ? "#22c55e" : undefined }}>{loginError}</div>}

        <button style={{ ...s.primaryBtn, background: theme.primary, opacity: authLoading ? 0.7 : 1 }} onClick={isRegister ? handleRegister : handleLogin} disabled={authLoading} type="button">
          {authLoading ? "Attendere..." : isRegister ? "Crea account" : "Accedi"}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0 2px" }}>
          <div style={{ flex: 1, height: 1, background: theme.border }} />
          <span style={{ fontSize: 12, color: theme.text, opacity: 0.4, whiteSpace: "nowrap" }}>oppure</span>
          <div style={{ flex: 1, height: 1, background: theme.border }} />
        </div>

        <button style={{ ...s.secondaryBtn, color: theme.text, border: `1px solid ${theme.border}`, fontSize: 14, opacity: 0.75 }} onClick={handleGuestAccess} type="button">
          Continua come ospite · {Math.max(GUEST_LIMIT - guestUsed, 0)}/{GUEST_LIMIT} richieste rimaste nelle 24h
        </button>
      </div>
    );
  };

  const renderQuickCalcLoadInputs = () => {
    const type = quickCalcForm.verificationType;

    if (type === "pressione_interna") {
      return (
        <div style={s.checklistGrid}>
          <Field label="Pressione p [bar]" value={quickCalcForm.pressure} onChange={v => updateQuickCalcField("pressure", v)} placeholder="30" theme={theme} isDark={isDark} />
          <Field label="Raggio medio r [mm]" value={quickCalcForm.radius} onChange={v => updateQuickCalcField("radius", v)} placeholder="150" theme={theme} isDark={isDark} />
          <Field label="Spessore s [mm]" value={quickCalcForm.thickness} onChange={v => updateQuickCalcField("thickness", v)} placeholder="4" theme={theme} isDark={isDark} />
        </div>
      );
    }

    if (type === "stato_piano") {
      return (
        <div style={s.checklistGrid}>
          <Field label="σx [MPa]" value={quickCalcForm.sigmaX} onChange={v => updateQuickCalcField("sigmaX", v)} placeholder="80" theme={theme} isDark={isDark} />
          <Field label="σy [MPa]" value={quickCalcForm.sigmaY} onChange={v => updateQuickCalcField("sigmaY", v)} placeholder="20" theme={theme} isDark={isDark} />
          <Field label="τxy [MPa]" value={quickCalcForm.tauXY} onChange={v => updateQuickCalcField("tauXY", v)} placeholder="30" theme={theme} isDark={isDark} />
        </div>
      );
    }

    if (type === "fatica") {
      return (
        <div style={s.checklistGrid}>
          <Field label="σmax [MPa]" value={quickCalcForm.sigmaMax} onChange={v => updateQuickCalcField("sigmaMax", v)} placeholder="180" theme={theme} isDark={isDark} />
          <Field label="σmin [MPa]" value={quickCalcForm.sigmaMin} onChange={v => updateQuickCalcField("sigmaMin", v)} placeholder="20" theme={theme} isDark={isDark} />
          <Field label="Sn limite fatica [MPa]" value={quickCalcForm.fatigueLimit} onChange={v => updateQuickCalcField("fatigueLimit", v)} placeholder="Lascia vuoto per 0,5 Rm" theme={theme} isDark={isDark} />
        </div>
      );
    }

    return (
      <div style={s.checklistGrid}>
        <Field label="Carico assiale N [N]" value={quickCalcForm.axialLoad} onChange={v => updateQuickCalcField("axialLoad", v)} placeholder="0" theme={theme} isDark={isDark} />
        <Field label="Forza tagliante T [N]" value={quickCalcForm.shearLoad} onChange={v => updateQuickCalcField("shearLoad", v)} placeholder="2500" theme={theme} isDark={isDark} />
        <Field label="Braccio L [mm]" value={quickCalcForm.distance} onChange={v => updateQuickCalcField("distance", v)} placeholder="120" theme={theme} isDark={isDark} />
        <Field label="Momento flettente Mf [Nmm]" value={quickCalcForm.bendingMoment} onChange={v => updateQuickCalcField("bendingMoment", v)} placeholder="Vuoto = T·L" theme={theme} isDark={isDark} />
        <Field label="Momento torcente Mt [Nmm]" value={quickCalcForm.torque} onChange={v => updateQuickCalcField("torque", v)} placeholder="80000" theme={theme} isDark={isDark} />
      </div>
    );
  };

  const renderQuickCalcSectionInputs = () => {
    if (quickCalcForm.sectionType === "circolare_piena") {
      return (
        <div style={s.checklistGrid}>
          <Field label="Diametro d [mm]" value={quickCalcForm.diameter} onChange={v => updateQuickCalcField("diameter", v)} placeholder="25" theme={theme} isDark={isDark} />
        </div>
      );
    }

    if (quickCalcForm.sectionType === "circolare_cava") {
      return (
        <div style={s.checklistGrid}>
          <Field label="Diametro esterno D [mm]" value={quickCalcForm.outerDiameter} onChange={v => updateQuickCalcField("outerDiameter", v)} placeholder="40" theme={theme} isDark={isDark} />
          <Field label="Diametro interno d [mm]" value={quickCalcForm.innerDiameter} onChange={v => updateQuickCalcField("innerDiameter", v)} placeholder="25" theme={theme} isDark={isDark} />
        </div>
      );
    }

    if (quickCalcForm.sectionType === "rettangolare_piena") {
      return (
        <div style={s.checklistGrid}>
          <Field label="Base b [mm]" value={quickCalcForm.base} onChange={v => updateQuickCalcField("base", v)} placeholder="30" theme={theme} isDark={isDark} />
          <Field label="Altezza h [mm]" value={quickCalcForm.height} onChange={v => updateQuickCalcField("height", v)} placeholder="50" theme={theme} isDark={isDark} />
        </div>
      );
    }

    return (
      <div style={s.checklistGrid}>
        <Field label="Base esterna B [mm]" value={quickCalcForm.outerBase} onChange={v => updateQuickCalcField("outerBase", v)} placeholder="60" theme={theme} isDark={isDark} />
        <Field label="Altezza esterna H [mm]" value={quickCalcForm.outerHeight} onChange={v => updateQuickCalcField("outerHeight", v)} placeholder="80" theme={theme} isDark={isDark} />
        <Field label="Base interna b [mm]" value={quickCalcForm.innerBase} onChange={v => updateQuickCalcField("innerBase", v)} placeholder="40" theme={theme} isDark={isDark} />
        <Field label="Altezza interna h [mm]" value={quickCalcForm.innerHeight} onChange={v => updateQuickCalcField("innerHeight", v)} placeholder="60" theme={theme} isDark={isDark} />
      </div>
    );
  };


  const projectTabs: ProjectMemoryTab[] = [
    "Panoramica",
    "Chat",
    "Documenti",
    "Tavole",
    "Materiali",
    "Verifiche",
    "Calcoli",
    "Decisioni",
    "Revisioni",
    "Note",
  ];

  const getProjectMemorySections = (project: ProjectRecord | null) => {
    const p = project ? normalizeProjectRecord(project) : null;

    const allVerifications = p?.verifications || [];
    return {
      chat: p?.chats || [],
      documenti: p?.documents || [],
      tavole: p?.drawings || [],
      materiali: p?.materials || [],
      verifiche: allVerifications.filter(v => !["calculation", "solidworks", "advanced"].includes(v.type)),
      calcoli: allVerifications.filter(v => ["calculation", "solidworks", "advanced"].includes(v.type)),
      decisioni: p?.decisions || [],
      revisioni: p?.revisions || [],
      note: p?.notes || [],
      tutti: p?.items || [],
    };
  };

  const getProjectItemsForTab = (project: ProjectRecord | null, tab: ProjectMemoryTab) => {
    const sections = getProjectMemorySections(project);

    if (tab === "Chat") return sections.chat;
    if (tab === "Documenti") return sections.documenti;
    if (tab === "Tavole") return sections.tavole;
    if (tab === "Materiali") return sections.materiali;
    if (tab === "Verifiche") return sections.verifiche;
    if (tab === "Calcoli") return sections.calcoli;
    if (tab === "Decisioni") return sections.decisioni;
    if (tab === "Revisioni") return sections.revisioni;
    if (tab === "Note") return sections.note;

    return sections.tutti;
  };

  const openItemInTool = (item: ProjectSavedItem) => {
    setShowProjects(false);

    if (item.type === "chat") {
      // Apre la chat salvata come nuova chat
      const messages: Message[] = Array.isArray(item.payload?.messages) ? item.payload.messages : [];
      const newChat = {
        id: createId(),
        title: item.title.slice(0, 40),
        messages,
        createdAt: new Date().toISOString(),
      };
      setChats(prev => [newChat, ...prev]);
      setActiveChatId(newChat.id);
      return;
    }

    if (item.type === "checklist" && item.payload?.checklistForm) {
      setChecklistForm(item.payload.checklistForm);
      setChecklistResults(item.payload.checklistResults || []);
      setShowChecklist(true);
      return;
    }

    if ((item.type === "quickcalc" || item.type === "verification") && item.payload?.quickCalcForm) {
      setQuickCalcForm(item.payload.quickCalcForm);
      if (item.payload.quickCalcResult) setQuickCalcResult(item.payload.quickCalcResult);
      setShowQuickCalc(true);
      return;
    }

    if (item.type === "drawing" && item.payload?.drawingForm) {
      setDrawingForm(item.payload.drawingForm);
      if (item.payload.drawingResults) setDrawingResults(item.payload.drawingResults);
      if (item.payload.drawingIssues) setDrawingIssues(item.payload.drawingIssues);
      if (item.payload.lastDrawingAnalysisText) setLastDrawingAnalysisText(item.payload.lastDrawingAnalysisText);
      setShowDrawingGenerator(true);
      return;
    }

    if (item.type === "material" && item.payload?.material) {
      setShowMaterials(true);
      return;
    }

    // Fallback: apre comunque il pannello più adatto
    if (item.type === "bom") { setShowProjects(true); return; }
    setShowProjects(true);
  };

  const renderProjectItemCard = (item: ProjectSavedItem) => {
    const typeLabels: Record<string, string> = {
      chat: "Chat",
      document: "Documento",
      file: "Documento",
      drawing: "Tavola",
      material: "Materiale",
      verification: "Verifica",
      checklist: "Verifica",
      quickcalc: "Verifica",
      calculation: "Calcolo",
      bom: "Distinta",
      solidworks: "SolidWorks",
      advanced: "Verifica avanzata",
      decision: "Decisione",
      revision: "Revisione",
      note: "Nota",
    };

    const savedChatMessages = Array.isArray(item.payload?.messages)
      ? item.payload.messages
      : [];

    return (
      <div
        key={item.id}
        style={{
          ...s.projectSavedItem,
          border: `1px solid ${theme.border}`,
          background: isDark ? "#0b0b0b" : "#ffffff",
        }}
      >
        <div style={{ ...s.resultTop, alignItems: "flex-start", gap: 10 }}>
          <strong style={{ flex: 1, minWidth: 0 }}>{item.title}</strong>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <span>{typeLabels[item.type] || item.type}</span>

            {["chat", "checklist", "quickcalc", "verification", "drawing", "material"].includes(item.type) && (
              <button
                type="button"
                onClick={() => openItemInTool(item)}
                style={{
                  border: `1px solid ${theme.primary}`,
                  background: "transparent",
                  color: theme.primary,
                  borderRadius: 999,
                  padding: "5px 10px",
                  fontSize: 12,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {item.type === "chat" ? "Apri in chat" :
                 item.type === "drawing" ? "Apri in tavole" :
                 item.type === "material" ? "Apri in materiali" :
                 "Apri in verifica"}
              </button>
            )}

            <button
              type="button"
              onClick={() => deleteProjectSavedItem(item.id)}
              style={{
                border: `1px solid ${isDark ? "rgba(248,113,113,0.45)" : "#fecaca"}`,
                background: isDark ? "rgba(127,29,29,0.22)" : "#fff1f2",
                color: isDark ? "#fecaca" : "#b91c1c",
                borderRadius: 999,
                padding: "5px 10px",
                fontSize: 12,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Elimina
            </button>
          </div>
        </div>

        <p style={s.resultDetail}>{item.summary}</p>
        <p style={s.muted}>{new Date(item.createdAt).toLocaleString("it-IT")}</p>



        {item.type === "decision" && item.payload?.reason && (
          <p style={{ ...s.resultSuggestion, borderLeft: `3px solid ${theme.primary}` }}>
            Motivo: {item.payload.reason}
          </p>
        )}

        {item.type === "revision" && item.payload && (
          <div style={s.projectInlineDataGrid}>
            <span>Data: {item.payload.date || "—"}</span>
            <span>Autore: {item.payload.author || "—"}</span>
            <span>Rev.: {item.payload.code || "—"}</span>
          </div>
        )}

        {item.type === "revision" && item.payload?.notes && (
          <p style={{ ...s.resultSuggestion, borderLeft: `3px solid ${theme.primary}` }}>
            Note: {item.payload.notes}
          </p>
        )}

        {item.type === "material" && item.payload?.material && (
          <div style={s.projectInlineDataGrid}>
            <span>Rm: {item.payload.material.rm || "—"} MPa</span>
            <span>Re: {item.payload.material.re || "—"} MPa</span>
            <span>Norma: {item.payload.material.en || item.payload.material.uni || "—"}</span>
          </div>
        )}
      </div>
    );
  };

  const renderProjectMemory = () => {
    if (!activeProject) {
      return (
        <div style={s.emptyChecklist}>
          Seleziona o crea un progetto per rivedere chat, documenti, tavole, materiali, verifiche, decisioni e revisioni.
        </div>
      );
    }

    const normalizedProject = normalizeProjectRecord(activeProject);
    const sections = getProjectMemorySections(normalizedProject);
    const visibleItems = getProjectItemsForTab(normalizedProject, projectMemoryTab);

    const stats = [
      { label: "Chat", value: sections.chat.length },
      { label: "Documenti", value: sections.documenti.length },
      { label: "Tavole", value: sections.tavole.length },
      { label: "Materiali", value: sections.materiali.length },
      { label: "Verifiche", value: sections.verifiche.length },
      { label: "Calcoli", value: sections.calcoli.length },
      { label: "Decisioni", value: sections.decisioni.length },
      { label: "Revisioni", value: sections.revisioni.length },
    ];

    return (
      <>
        <div style={s.projectHeaderCard}>
          <strong>{normalizedProject.name}</strong>
          <span>{normalizedProject.description || "Nessuna descrizione"}</span>
          <span style={s.muted}>
            Aggiornato: {new Date(normalizedProject.updatedAt).toLocaleString("it-IT")}
          </span>
        </div>

        <div style={s.projectStatsGrid}>
          {stats.map((stat) => (
            <div
              key={stat.label}
              style={{
                ...s.projectStatCard,
                background: isDark ? "#0b0b0b" : "#ffffff",
                border: `1px solid ${theme.border}`,
              }}
            >
              <strong style={{ color: theme.primary }}>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>

        <div style={s.projectActionGrid}>
          <button
            type="button"
            style={{ ...s.secondaryBtn, color: theme.text, border: `1px solid ${theme.border}` }}
            onClick={saveCurrentChatToProject}
          >
            Salva chat attuale
          </button>

          <button
            type="button"
            style={{ ...s.secondaryBtn, color: theme.primary, border: `1px solid ${theme.border}` }}
            onClick={() => setProjectMemoryTab("Decisioni")}
          >
            Nuova decisione
          </button>

          <button
            type="button"
            style={{ ...s.secondaryBtn, color: theme.primary, border: `1px solid ${theme.border}` }}
            onClick={() => setProjectMemoryTab("Revisioni")}
          >
            Nuova revisione
          </button>
        </div>

        {projectMemoryTab === "Panoramica" && (
          <div
            style={{
              ...s.projectMemoryIntro,
              background: isDark ? "rgba(96,165,250,0.08)" : "#eff6ff",
              border: `1px solid ${theme.border}`,
            }}
          >
            <strong>Memoria progetto</strong>
            <span>
              Qui trovi tutto quello che serve per riaprire il lavoro anche dopo mesi: chat, documenti, tavole,
              materiali, verifiche, decisioni prese, storico revisioni e note tecniche.
            </span>
          </div>
        )}

        <div style={s.projectTabs}>
          {projectTabs.map((tab) => {
            const selected = projectMemoryTab === tab;
            const count =
              tab === "Panoramica"
                ? normalizedProject.items.length
                : getProjectItemsForTab(normalizedProject, tab).length;

            return (
              <button
                key={tab}
                type="button"
                style={{
                  ...s.projectTabBtn,
                  background: selected ? theme.primary : isDark ? "#050505" : "#ffffff",
                  color: selected ? "#ffffff" : theme.text,
                  border: `1px solid ${selected ? theme.primary : theme.border}`,
                }}
                onClick={() => setProjectMemoryTab(tab)}
              >
                {tab} <span>{count}</span>
              </button>
            );
          })}
        </div>

        {projectMemoryTab === "Decisioni" && (
          <div
            style={{
              ...s.projectDecisionBox,
              background: isDark ? "#050505" : "#f8fafc",
              border: `1px solid ${theme.border}`,
            }}
          >
            <Field
              label="Titolo decisione"
              value={projectDecisionTitle}
              onChange={setProjectDecisionTitle}
              placeholder="Es. Scelto C45 invece di S235JR"
              theme={theme}
              isDark={isDark}
            />

            <label style={s.label}>Decisione presa</label>
            <textarea
              style={{
                ...s.projectMiniTextarea,
                background: isDark ? "#050505" : "#fff",
                color: theme.text,
                border: `1px solid ${theme.border}`,
              }}
              value={projectDecisionText}
              onChange={(e) => setProjectDecisionText(e.target.value)}
              placeholder="Scrivi cosa è stato deciso..."
            />

            <Field
              label="Motivo / alternativa valutata"
              value={projectDecisionReason}
              onChange={setProjectDecisionReason}
              placeholder="Es. compromesso tra resistenza, costo e lavorabilità"
              theme={theme}
              isDark={isDark}
            />

            <button type="button" style={{ ...s.primaryBtn, background: theme.primary }} onClick={saveDecisionToProject}>
              Salva decisione
            </button>
          </div>
        )}

        {projectMemoryTab === "Revisioni" && (
          <div
            style={{
              ...s.projectDecisionBox,
              background: isDark ? "#050505" : "#f8fafc",
              border: `1px solid ${theme.border}`,
            }}
          >
            <div style={s.checklistGrid}>
              <Field
                label="Codice revisione"
                value={projectRevisionCode}
                onChange={setProjectRevisionCode}
                placeholder="A, B, C, 00, 01..."
                theme={theme}
                isDark={isDark}
              />

              <Field
                label="Data revisione"
                value={projectRevisionDate}
                onChange={setProjectRevisionDate}
                placeholder="AAAA-MM-GG"
                theme={theme}
                isDark={isDark}
              />

              <Field
                label="Autore"
                value={projectRevisionAuthor}
                onChange={setProjectRevisionAuthor}
                placeholder={user.name || "Autore"}
                theme={theme}
                isDark={isDark}
              />
            </div>

            <label style={s.label}>Modifiche effettuate</label>
            <textarea
              style={{
                ...s.projectMiniTextarea,
                background: isDark ? "#050505" : "#fff",
                color: theme.text,
                border: `1px solid ${theme.border}`,
              }}
              value={projectRevisionChanges}
              onChange={(e) => setProjectRevisionChanges(e.target.value)}
              placeholder="Es. Aggiunta tolleranza Ø20 H7, aggiornata rugosità Ra 1.6, modificato materiale..."
            />

            <label style={s.label}>Note revisione</label>
            <textarea
              style={{
                ...s.projectMiniTextarea,
                background: isDark ? "#050505" : "#fff",
                color: theme.text,
                border: `1px solid ${theme.border}`,
              }}
              value={projectRevisionNotes}
              onChange={(e) => setProjectRevisionNotes(e.target.value)}
              placeholder="Motivo della revisione, file/tavola collegata, cliente, approvazione..."
            />

            <button type="button" style={{ ...s.primaryBtn, background: theme.primary }} onClick={saveProjectRevision}>
              Salva revisione
            </button>
          </div>
        )}

        {projectMemoryTab === "Note" && (
          <div
            style={{
              ...s.projectDecisionBox,
              background: isDark ? "#050505" : "#f8fafc",
              border: `1px solid ${theme.border}`,
            }}
          >
            <label style={s.label}>Nota tecnica</label>
            <textarea
              style={{
                ...s.projectMiniTextarea,
                background: isDark ? "#050505" : "#fff",
                color: theme.text,
                border: `1px solid ${theme.border}`,
              }}
              value={projectNoteText}
              onChange={(e) => setProjectNoteText(e.target.value)}
              placeholder="Scrivi una nota tecnica da ricordare..."
            />

            <button type="button" style={{ ...s.primaryBtn, background: theme.primary }} onClick={saveProjectNote}>
              Salva nota
            </button>
          </div>
        )}

        {visibleItems.length === 0 ? (
          <div style={s.emptyText}>
            Nessun elemento in questa sezione. Salva chat, file, tavole, materiali, verifiche, decisioni, revisioni o note nel progetto.
          </div>
        ) : (
          visibleItems.map(renderProjectItemCard)
        )}
      </>
    );
  };

  return (
    <div style={{ ...s.app, background: theme.bg, color: theme.text }}>
      <style>{globalCss}</style>
      <style>{`
        textarea::-webkit-scrollbar { display: none; }
        textarea { scrollbar-width: none; -ms-overflow-style: none; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      {!isLoggedIn && !showLoginPanel && !loginDismissed && <div style={s.loginScreen}>{renderLoginCard()}</div>}

      <aside style={{ ...s.sidebar, width: sidebarOpen ? 280 : 74, minWidth: sidebarOpen ? 280 : 74, background: isDark ? "#050505" : theme.bg, borderRight: `1px solid ${theme.border}` }}>
        <div style={s.sidebarTop}>
          {sidebarOpen && (
            <div style={s.logoWrap}>
              <div style={{ ...s.logoMark, background: theme.primary }}>T</div>
              <div style={s.logoText}>TECH<span style={{ color: theme.primary }}>AI</span></div>
            </div>
          )}
          <button style={{ ...s.collapseBtn, color: theme.text, border: `1px solid ${theme.border}` }} onClick={() => setSidebarOpen(prev => !prev)} type="button">☰</button>
        </div>

        <div style={s.iconNav}>
          {iconBtn("＋", "Nuova", createNewChat)}
          <div style={{ ...s.toolsGroup, background: theme.surface, border: `1px solid ${theme.border}` }}>
            {sidebarOpen && <div style={{ ...s.toolsTitle, color: theme.primary }}>Strumenti tecnici</div>}
            {/* {iconBtn("✓", "Checklist", () => setShowChecklist(true))} */}
            {iconBtn("∑", "Verifica", () => setShowQuickCalc(true))}
            {iconBtn("📐", "Calcoli", () => setShowComponentCalculator(true))}
            {iconBtn("▦", "Materiali", () => setShowMaterials(true))}
            {iconBtn("▣", "Tavole", () => setShowDrawingGenerator(true))}
            {iconBtn("⌘", "Progetti", () => setShowProjects(true))}
          </div>
        </div>

        {sidebarOpen && (
          <div style={s.chatHistory}>
            <div style={s.historyHeaderRow}>
              <span style={s.historyHeader}>Cronologia</span>
              {chats.length > 0 && <button style={{ ...s.clearChatsBtn, color: theme.primary, border: `1px solid ${theme.border}` }} onClick={clearAllChats} type="button">Svuota</button>}
            </div>

            {chats.length === 0 && <div style={s.emptyText}>Nessuna chat salvata</div>}

            {chats.map(chat => (
              <div key={chat.id} style={{ ...s.historyItem, background: chat.id === activeChatId ? theme.surface : "transparent", border: `1px solid ${chat.id === activeChatId ? theme.border : "transparent"}` }}>
                <div style={s.historyTitle} onClick={() => setActiveChatId(chat.id)}>{chat.title}</div>
                <button style={{ ...s.deleteBtn, color: theme.text, border: `1px solid ${theme.border}` }} onClick={() => deleteChat(chat.id)} type="button">×</button>
              </div>
            ))}
          </div>
        )}

        <div style={s.sidebarBottomActions}>
          {iconBtn("⚙", "Impostazioni", () => { setActiveTab("Aspetto"); setShowSettings(true); })}
        </div>
      </aside>

      <main style={s.main}>
        <button style={{ ...s.floatingAccountBtn, background: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }} onClick={() => { setActiveTab("Account"); setShowSettings(true); }} type="button">👤</button>

        <section style={{ ...s.content, justifyContent: currentMessages.length === 0 ? "center" : "flex-start" }}>
          {currentMessages.length === 0 ? (
            <div style={s.homeWrapper}>
              <h1 style={s.welcomeText}>Benvenuto {user.name.split(" ")[0]}, come posso aiutarti?</h1>
              {isGuest && <p style={{ ...s.fileHint, color: theme.primary, fontWeight: 800 }}>Modalità ospite attiva · {Math.max(GUEST_LIMIT - guestUsed, 0)}/{GUEST_LIMIT} richieste rimaste nelle 24h · {GUEST_FILE_LIMIT} file ogni 24h</p>}
              {renderInputBar("Chiedi a TechAI o carica un file...")}
            </div>
          ) : (
            <div style={s.chatView}>
              <div style={s.msgList}>
                {isSelectingProjectMessages && (
                  <div
                    style={{
                      position: "sticky",
                      top: 0,
                      zIndex: 5,
                      marginBottom: 14,
                      padding: "12px 14px",
                      borderRadius: 16,
                      background: isDark ? "#111827" : "#eff6ff",
                      border: `1px solid ${theme.border}`,
                      color: theme.text,
                    }}
                  >
                    <strong style={{ color: theme.primary }}>Modalità selezione attiva</strong>
                    <div style={{ ...s.muted, marginTop: 4 }}>
                      Clicca sui messaggi che vuoi salvare nella memoria del progetto.
                    </div>
                  </div>
                )}

                {currentMessages.map((message, index) => {
                  const isSelectedForProject = selectedProjectMessageIndexes.includes(index);

                  return (
                    <div
                      key={index}
                      style={{
                        ...(message.role === "utente" ? s.uRow : s.aRow),
                        cursor: isSelectingProjectMessages ? "pointer" : "default",
                        opacity: isSelectingProjectMessages && !isSelectedForProject ? 0.86 : 1,
                      }}
                      onClick={() => {
                        if (isSelectingProjectMessages) toggleProjectMessageSelection(index);
                      }}
                    >
                      {message.role === "AI" && <div style={{ ...s.aiAvatar, background: theme.primary }}>T</div>}

                      {isSelectingProjectMessages && (
                        <button
                          type="button"
                          aria-label={isSelectedForProject ? "Deseleziona messaggio" : "Seleziona messaggio"}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleProjectMessageSelection(index);
                          }}
                          style={{
                            width: 28,
                            height: 28,
                            minWidth: 28,
                            borderRadius: "999px",
                            border: `2px solid ${isSelectedForProject ? theme.primary : theme.border}`,
                            background: isSelectedForProject ? theme.primary : isDark ? "#050505" : "#ffffff",
                            color: "#ffffff",
                            fontWeight: 900,
                            display: "grid",
                            placeItems: "center",
                            marginTop: 8,
                            cursor: "pointer",
                          }}
                        >
                          {isSelectedForProject ? "✓" : ""}
                        </button>
                      )}

                      <div
                        style={{
                          ...(message.role === "utente"
                            ? { ...s.uBox, background: theme.surface, border: `1px solid ${theme.border}` }
                            : { ...s.aBox, background: isDark ? "#0b0b0b" : "#fff", border: `1px solid ${theme.border}` }),
                          boxShadow: isSelectedForProject ? `0 0 0 2px ${theme.primary}` : undefined,
                        }}
                      >
                        {renderFormattedText(message.text)}
                        {message.fileAttachment && <div style={s.attachmentBox}>📄 {message.fileAttachment.name} · {(message.fileAttachment.size / 1024).toFixed(1)} KB</div>}
                      </div>
                    </div>
                  );
                })}
                {loading && <div style={{ textAlign: "center", color: theme.primary }}>✨ TechAI sta elaborando...</div>}
                <div ref={chatEndRef} />
              </div>
              <div style={s.bottomInput}>{renderInputBar("Scrivi qui o carica un file...")}</div>
            </div>
          )}
        </section>
      </main>

      {isSelectingProjectMessages && (
        <div
          style={{
            position: "fixed",
            left: sidebarOpen ? 300 : 94,
            right: 24,
            bottom: 24,
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "14px 16px",
            borderRadius: 18,
            background: isDark ? "#111" : "#ffffff",
            border: `1px solid ${theme.border}`,
            boxShadow: "0 18px 50px rgba(0,0,0,0.28)",
            color: theme.text,
          }}
        >
          <strong>{selectedProjectMessageIndexes.length} messaggi selezionati</strong>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              style={{ ...s.secondaryBtn, color: theme.text, border: `1px solid ${theme.border}`, marginTop: 0 }}
              onClick={cancelProjectMessageSelection}
            >
              Annulla
            </button>

            <button
              type="button"
              style={{
                ...s.primaryBtn,
                background: theme.primary,
                marginTop: 0,
                opacity: selectedProjectMessageIndexes.length === 0 ? 0.55 : 1,
              }}
              disabled={selectedProjectMessageIndexes.length === 0}
              onClick={saveSelectedMessagesToProject}
            >
              Salva selezionati
            </button>
          </div>
        </div>
      )}

      {showSaveChatModal && (
        <div style={s.overlay}>
          <div
            style={{
              width: "min(520px, calc(100vw - 32px))",
              background: isDark ? "#111" : "#ffffff",
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: 24,
              padding: 22,
              boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
            }}
          >
            <div style={s.modalHeader}>
              <div>
                <h2 style={{ margin: 0 }}>Salva chat nel progetto</h2>
                <p style={s.muted}>Scegli se salvare tutta la conversazione o solo alcuni messaggi.</p>
              </div>

              <button
                style={{ ...s.backBtn, color: theme.text, border: `1px solid ${theme.border}` }}
                onClick={() => setShowSaveChatModal(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <button
                type="button"
                style={{ ...s.primaryBtn, background: theme.primary }}
                onClick={saveFullCurrentChatToProject}
              >
                Salva tutta la chat
              </button>

              <button
                type="button"
                style={{ ...s.secondaryBtn, color: theme.primary, border: `1px solid ${theme.border}` }}
                onClick={startSelectiveChatSave}
              >
                Seleziona messaggi da salvare
              </button>

              <button
                type="button"
                style={{ ...s.secondaryBtn, color: theme.text, border: `1px solid ${theme.border}` }}
                onClick={() => setShowSaveChatModal(false)}
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {showLoginPanel && <div className="fade-in" style={s.overlay}><div style={s.loginModalWrap}>{renderLoginCard()}</div></div>}

      {showChecklist && (
        <Modal title="Checklist tecnica progetto" subtitle="Controllo preliminare automatico per componenti meccanici." theme={theme} isDark={isDark} onClose={() => setShowChecklist(false)} wide>
          <div style={s.checklistLayout}>
            <div style={s.checklistFormArea}>
              <div style={s.checklistGrid}>
                <Field label="Tipo componente" value={checklistForm.componentType} onChange={v => updateChecklistField("componentType", v)} placeholder="Albero, perno, staffa, flangia..." theme={theme} isDark={isDark} />
                <Field label="Materiale" value={checklistForm.material} onChange={v => updateChecklistField("material", v)} placeholder="C45, S235JR, 42CrMo4..." theme={theme} isDark={isDark} />
                <Field label="Carico indicativo [N]" value={checklistForm.load} onChange={v => updateChecklistField("load", v)} placeholder="2500" theme={theme} isDark={isDark} />
                <Field label="Coefficiente sicurezza" value={checklistForm.safetyFactor} onChange={v => updateChecklistField("safetyFactor", v)} placeholder="2" theme={theme} isDark={isDark} />
              </div>
              <Field label="Ambiente d'uso" value={checklistForm.environment} onChange={v => updateChecklistField("environment", v)} placeholder="Interno, esterno, umido, corrosivo, olio..." theme={theme} isDark={isDark} />
              <Field label="Lavorazione prevista" value={checklistForm.machining} onChange={v => updateChecklistField("machining", v)} placeholder="Tornitura, fresatura, saldatura, rettifica..." theme={theme} isDark={isDark} />
              <Field label="Tolleranze / accoppiamenti presenti" value={checklistForm.tolerances} onChange={v => updateChecklistField("tolerances", v)} placeholder="Ø20 h6, foro Ø10 H7..." theme={theme} isDark={isDark} />
              <Field label="Rugosità" value={checklistForm.roughness} onChange={v => updateChecklistField("roughness", v)} placeholder="Ra 3.2 generale, Ra 1.6 sedi..." theme={theme} isDark={isDark} />
              <label style={s.label}>Note tecniche</label>
              <textarea style={{ ...s.checklistTextarea, background: isDark ? "#050505" : "#fff", color: theme.text, border: `1px solid ${theme.border}` }} value={checklistForm.notes} onChange={e => updateChecklistField("notes", e.target.value)} placeholder="Smussi, raggi, filetti, trattamenti..." />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button
                  style={{ ...s.primaryBtn, background: theme.primary }}
                  onClick={runProjectChecklist}
                  type="button"
                >
                  Esegui checklist
                </button>

                <button
                  style={{
                    ...s.secondaryBtn,
                    color: theme.text,
                    border: `1px solid ${theme.border}`,
                    marginTop: 8,
                  }}
                  onClick={resetChecklist}
                  type="button"
                >
                  Reset
                </button>
              </div>

              <button
                style={{ ...s.secondaryBtn, color: theme.primary, border: `1px solid ${theme.border}` }}
                onClick={saveChecklistToProject}
                type="button"
              >
                Salva checklist nel progetto
              </button>
            </div>

            <div style={s.checklistResultsArea}>
              {checklistResults.length === 0 ? <div style={{ ...s.emptyChecklist, border: `1px dashed ${theme.border}` }}>Inserisci i dati del pezzo e premi “Esegui checklist”.</div> : checklistResults.map((item, index) => <ResultCard key={index} item={item} theme={theme} isDark={isDark} />)}
            </div>
          </div>
        </Modal>
      )}

      {showQuickCalc && (
        <Modal title="Verifica dimensionale rapida" subtitle="Sollecitazioni semplici, composte, pressione interna, stato piano e fatica." theme={theme} isDark={isDark} onClose={() => setShowQuickCalc(false)} wide>
          <div style={s.quickCalcLayout}>
            <div style={s.checklistFormArea}>
              <div style={s.checklistGrid}>
                <Field
                  label="Tipo componente"
                  value={quickCalcForm.componentType}
                  onChange={v => updateQuickCalcField("componentType", v)}
                  placeholder="Perno, albero, staffa..."
                  theme={theme}
                  isDark={isDark}
                />

                <div>
                  <label style={s.label}>Tipo verifica</label>

                  <input
                    style={{
                      ...s.input,
                      marginBottom: 8,
                      background: isDark ? "#050505" : "#fff",
                      color: theme.text,
                      border: `1px solid ${theme.border}`,
                    }}
                    value={quickCalcVerificationSearch}
                    onChange={(e) => {
                      const value = e.target.value;
                      setQuickCalcVerificationSearch(value);

                      const exact = quickCalcVerificationOptions.find(
                        (option) => option.label.toLowerCase() === value.trim().toLowerCase()
                      );

                      if (exact) updateQuickCalcField("verificationType", exact.value);
                    }}
                    placeholder="Scrivi: bullone, braccio, torsione, fatica..."
                  />

                  <div
                    style={{
                      display: "grid",
                      gap: 6,
                      maxHeight: 220,
                      overflowY: "auto",
                      overflowX: "hidden",
                      paddingRight: 4,
                      marginBottom: 14,
                      width: "100%",
                      maxWidth: "100%",
                      minWidth: 0,
                    }}
                  >
                    {filteredQuickCalcVerificationOptions.length === 0 ? (
                      <div
                        style={{
                          ...s.emptyText,
                          border: `1px dashed ${theme.border}`,
                          borderRadius: 12,
                        }}
                      >
                        Nessun tipo verifica trovato.
                      </div>
                    ) : (
                      filteredQuickCalcVerificationOptions.map((option) => {
                        const selected = quickCalcForm.verificationType === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              updateQuickCalcField("verificationType", option.value);
                              setQuickCalcVerificationSearch(option.label);
                            }}
                            style={{
                              textAlign: "left",
                              borderRadius: 14,
                              padding: "10px 12px",
                              width: "100%",
                              maxWidth: "100%",
                              minWidth: 0,
                              overflow: "hidden",
                              whiteSpace: "normal",
                              overflowWrap: "break-word",
                              cursor: "pointer",
                              border: `1px solid ${selected ? theme.primary : theme.border}`,
                              background: selected
                                ? isDark
                                  ? `${theme.primary}24`
                                  : `${theme.primary}14`
                                : isDark
                                  ? "#050505"
                                  : "#fff",
                              color: theme.text,
                              fontWeight: 850,
                            }}
                          >
                            <div
                              style={{
                                whiteSpace: "normal",
                                overflowWrap: "break-word",
                                wordBreak: "break-word",
                              }}
                            >
                              {option.label}
                            </div>
                            <small
                              style={{
                                opacity: 0.62,
                                lineHeight: 1.35,
                                display: "block",
                                whiteSpace: "normal",
                                overflowWrap: "break-word",
                                wordBreak: "break-word",
                              }}
                            >
                              {option.description}
                            </small>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <Field
                  label="Materiale"
                  value={quickCalcForm.material}
                  onChange={v => updateQuickCalcField("material", v)}
                  placeholder="C45"
                  theme={theme}
                  isDark={isDark}
                />

                <div>
                  <label style={s.label}>Tipo sezione</label>
                  <select
                    style={{
                      ...s.input,
                      background: isDark ? "#050505" : "#fff",
                      color: theme.text,
                      border: `1px solid ${theme.border}`,
                    }}
                    value={quickCalcForm.sectionType}
                    onChange={e => updateQuickCalcField("sectionType", e.target.value)}
                  >
                    <option value="circolare_piena">Circolare piena</option>
                    <option value="circolare_cava">Circolare cava</option>
                    <option value="rettangolare_piena">Rettangolare piena</option>
                    <option value="rettangolare_cava">Rettangolare cava</option>
                  </select>
                </div>
              </div>

              <h3 style={{ margin: "12px 0", color: theme.primary }}>Dati sezione</h3>
              {renderQuickCalcSectionInputs()}

              <h3 style={{ margin: "12px 0", color: theme.primary }}>Dati carico / tensioni</h3>
              {renderQuickCalcLoadInputs()}

              <Field label="Coefficiente sicurezza richiesto" value={quickCalcForm.safetyFactorRequired} onChange={v => updateQuickCalcField("safetyFactorRequired", v)} placeholder="2" theme={theme} isDark={isDark} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button
                  style={{ ...s.primaryBtn, background: theme.primary }}
                  onClick={runQuickCalc}
                  type="button"
                >
                  Calcola verifica
                </button>

                <button
                  style={{
                    ...s.secondaryBtn,
                    color: theme.text,
                    border: `1px solid ${theme.border}`,
                    marginTop: 8,
                  }}
                  onClick={resetQuickCalc}
                  type="button"
                >
                  Reset
                </button>
              </div>

              {quickCalcResult && (
                <div
                  style={{
                    ...s.projectDecisionBox,
                    background: isDark ? "#050505" : "#f8fafc",
                    border: `1px solid ${theme.border}`,
                    marginTop: 10,
                  }}
                >
                  <h3 style={{ ...s.projectTitle, marginTop: 0 }}>Salvataggio verifica</h3>

                  <Field
                    label="Nome salvataggio"
                    value={quickCalcSaveTitle}
                    onChange={setQuickCalcSaveTitle}
                    placeholder={`Es. ${quickCalcResult.title} - albero principale`}
                    theme={theme}
                    isDark={isDark}
                  />

                  <div>
                    <label style={s.label}>Progetto destinazione</label>
                    <select
                      style={{
                        ...s.input,
                        background: isDark ? "#050505" : "#fff",
                        color: theme.text,
                        border: `1px solid ${theme.border}`,
                      }}
                      value={quickCalcTargetProjectId || activeProject?.id || ""}
                      onChange={(e) => setQuickCalcTargetProjectId(e.target.value)}
                    >
                      {projects.length === 0 ? (
                        <option value="">Crea progetto automatico</option>
                      ) : (
                        projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <button
                    style={{ ...s.secondaryBtn, color: theme.primary, border: `1px solid ${theme.border}` }}
                    onClick={saveQuickCalcToProject}
                    type="button"
                  >
                    Salva verifica nel progetto scelto
                  </button>
                </div>
              )}

              <div style={{ ...s.warningBox, border: `1px solid ${theme.border}` }}>
                Calcolo preliminare. Per progetto reale controllare norme, intagli, fatica, saldature, vincoli, frecce, instabilità, coefficienti correttivi e dati certificati del materiale.
              </div>
            </div>

            <div style={s.checklistResultsArea}>
              {!quickCalcResult ? <div style={{ ...s.emptyChecklist, border: `1px dashed ${theme.border}` }}>Inserisci i dati e premi “Calcola verifica”.</div> : <QuickCalcCard result={quickCalcResult} theme={theme} isDark={isDark} />}
            </div>
          </div>
        </Modal>
      )}

      {showComponentCalculator && (
        <ComponentCalculatorModal
          theme={theme}
          isDark={isDark}
          onClose={() => setShowComponentCalculator(false)}
          projects={projects}
          activeProject={activeProject}
          addProjectItem={addProjectItem}
          setProjectMemoryTab={(tab: any) => setProjectMemoryTab(tab === "Verifiche" ? "Calcoli" : tab)}
        />
      )}

      {showMaterials && (
        <Modal
          title="Libreria materiali"
          subtitle="Catalogo tecnico materiali con ricerca, filtri, schede e confronto."
          theme={theme}
          isDark={isDark}
          onClose={() => setShowMaterials(false)}
          wide
        >
          <div
            style={{
              flex: 1,
              minHeight: 0,
              height: "100%",
              overflow: "hidden",
              borderRadius: 20,
              display: "flex",
            }}
          >
            <MaterialsLibrary
              theme={theme}
              isDark={isDark}
              onUseMaterial={(material) => {

                setChecklistForm((prev) => ({
                  ...prev,
                  material: material.name,
                }));

                setQuickCalcForm((prev) => ({
                  ...prev,
                  material: material.name,
                }));

                setDrawingForm((prev) => ({
                  ...prev,
                  material: material.name,
                }));

                addProjectItem({
                  type: "material",
                  title: `Materiale scelto - ${material.name}`,
                  summary: `Materiale collegato al progetto. Rm ${material.rm || "—"} MPa · Re ${material.re || "—"} MPa.`,
                  payload: {
                    material,
                    reason: "Selezionato dalla libreria materiali.",
                  },
                });

                setShowMaterials(false);
              }}
            />
          </div>
        </Modal>
      )}

      {showDrawingGenerator && (
        <Modal title="Generatore tavole tecniche controllate" subtitle="Carica un'immagine della tavola per analisi AI o compila i dati per controllo base." theme={theme} isDark={isDark} onClose={() => setShowDrawingGenerator(false)} wide>
          <div style={s.drawingLayout}>
            <div style={s.checklistFormArea}>
              <input
                ref={drawingReviewInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.pdf,image/*,application/pdf"
                data-techai-pdf-drawing="1"
                style={{ display: "none" }}
                onChange={handleDrawingReviewUpload}
              />
              <div style={{ ...s.drawingUploadPanel, background: isDark ? "#050505" : "#f8fafc", border: `1px solid ${theme.border}` }}>
                <strong>Revisione tavola</strong>
                <p style={s.muted}>Carica un'immagine o PDF della tavola. I PDF vengono convertiti automaticamente in vista completa + crop leggibili di cartiglio, viste, sezioni e dettagli.</p>
                <div style={s.drawingUploadGridSingle}>
                  <button style={{ ...s.drawingUploadBtn, color: theme.text, border: `1px solid ${theme.border}` }} onClick={() => drawingReviewInputRef.current?.click()} type="button">📐 Carica tavola tecnica<small>PNG, JPG, JPEG, WebP, PDF</small></button>
                </div>
                {drawingReviewFile && <FileCard upload={drawingReviewFile} icon={drawingReviewFile.isPdf ? "📄" : "🖼️"} theme={theme} isDark={isDark} onRemove={removeDrawingReviewFile} />}
                {drawingReviewFile?.isPdf && drawingReviewFile.totalPages && <p style={{ ...s.muted, marginTop: 4 }}>PDF · {drawingReviewFile.totalPages} {drawingReviewFile.totalPages === 1 ? "pagina" : "pagine"} · analisi pagina 1 con crop automatici</p>}
              </div>

              <div style={s.checklistGrid}>
                <Field label="Nome pezzo" value={drawingForm.partName} onChange={v => updateDrawingField("partName", v)} placeholder="Es. Albero intermedio" theme={theme} isDark={isDark} />
                <Field label="Tipo pezzo" value={drawingForm.partType} onChange={v => updateDrawingField("partType", v)} placeholder="Albero, perno, staffa..." theme={theme} isDark={isDark} />
                <Field label="Materiale" value={drawingForm.material} onChange={v => updateDrawingField("material", v)} placeholder="C45, S235..." theme={theme} isDark={isDark} />
                <Field label="Quantità / lotto" value={drawingForm.productionQuantity} onChange={v => updateDrawingField("productionQuantity", v)} placeholder="1 pezzo, 100 pezzi..." theme={theme} isDark={isDark} />
                <div>
                  <label style={s.label}>Formato foglio <span style={{ color: "#ef4444", fontWeight: 900 }}>*</span></label>
                  <select
                    style={{ ...s.input, background: isDark ? "#050505" : "#fff", color: theme.text, border: `1px solid ${!drawingForm.sheetFormat ? "#ef4444" : theme.border}` }}
                    value={drawingForm.sheetFormat}
                    onChange={e => updateDrawingField("sheetFormat", e.target.value)}
                  >
                    <option value="">— Seleziona formato —</option>
                    <option value="A4">A4 (210×297 mm)</option>
                    <option value="A3">A3 (297×420 mm)</option>
                    <option value="A2">A2 (420×594 mm)</option>
                    <option value="A1">A1 (594×841 mm)</option>
                    <option value="A0">A0 (841×1189 mm)</option>
                  </select>
                </div>
              </div>
              <Field label="Lavorazione prevista" value={drawingForm.manufacturing} onChange={v => updateDrawingField("manufacturing", v)} placeholder="Tornitura, fresatura..." theme={theme} isDark={isDark} />
              <Field label="Geometrie principali" value={drawingForm.mainFeatures} onChange={v => updateDrawingField("mainFeatures", v)} placeholder="Fori, cave, asole..." theme={theme} isDark={isDark} />
              <Field label="Funzione del pezzo nell'assieme" value={drawingForm.assemblyFunction} onChange={v => updateDrawingField("assemblyFunction", v)} placeholder="Cosa fa il pezzo?" theme={theme} isDark={isDark} />
              <Field label="Superfici funzionali" value={drawingForm.functionalSurfaces} onChange={v => updateDrawingField("functionalSurfaces", v)} placeholder="Sedi, appoggi, scorrimenti..." theme={theme} isDark={isDark} />
              <Field label="Fori / filetti / lamature" value={drawingForm.holesThreads} onChange={v => updateDrawingField("holesThreads", v)} placeholder="M8, Ø10 H7, lamature..." theme={theme} isDark={isDark} />
              <Field label="Accoppiamenti" value={drawingForm.fits} onChange={v => updateDrawingField("fits", v)} placeholder="H7/g6, sede cuscinetto..." theme={theme} isDark={isDark} />
              <Field label="Tolleranze già previste" value={drawingForm.tolerances} onChange={v => updateDrawingField("tolerances", v)} placeholder="ISO 2768, geometriche..." theme={theme} isDark={isDark} />
              <Field label="Rugosità già previste" value={drawingForm.roughness} onChange={v => updateDrawingField("roughness", v)} placeholder="Ra 3.2, Ra 1.6..." theme={theme} isDark={isDark} />

              <label style={s.label}>Altro / indicazioni aggiuntive</label>
              <textarea
                style={{
                  ...s.checklistTextarea,
                  background: isDark ? "#050505" : "#fff",
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                  minHeight: 120,
                }}
                value={drawingExtraNotes}
                onChange={(e) => setDrawingExtraNotes(e.target.value)}
                placeholder={"Scrivi qui richieste specifiche per l'analisi:\nEs. controlla quote funzionali e critiche, verifica rugosità, controlla tolleranze H7, guarda solo cartiglio, analizza fori/filetti/lamature..."}
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <button
                  type="button"
                  style={{ ...s.secondaryBtn, color: theme.primary, border: `1px solid ${theme.border}`, marginTop: 0 }}
                  onClick={() =>
                    setDrawingExtraNotes(
                      "Analizza questa tavola e individua le quote funzionali, critiche, descrittive e non valutabili. Per ogni quota usa schema fisso con classificazione, motivazione tecnica, confidenza, riferimento tecnico e controllo consigliato."
                    )
                  }
                >
                  Quote funzionali
                </button>

                <button
                  type="button"
                  style={{ ...s.secondaryBtn, color: theme.primary, border: `1px solid ${theme.border}`, marginTop: 0 }}
                  onClick={() =>
                    setDrawingExtraNotes(
                      "Controlla soprattutto tolleranze dimensionali, tolleranze geometriche, rugosità e coerenza con superfici funzionali, sedi, fori, filetti e accoppiamenti. Per ogni criticità aggiungi motivazione, confidenza, riferimento tecnico e correzione consigliata."
                    )
                  }
                >
                  Tolleranze/Rugosità
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button
                  style={{ ...s.primaryBtn, background: theme.primary }}
                  onClick={runDrawingGenerator}
                  disabled={drawingAiLoading}
                  type="button"
                >
                  {drawingAiLoading ? "Analisi in corso..." : isDrawingUpload(drawingReviewFile) ? "Analizza tavola con AI" : "Genera controllo tavola"}
                </button>

                <button
                  style={{
                    ...s.secondaryBtn,
                    color: theme.text,
                    border: `1px solid ${theme.border}`,
                    marginTop: 8,
                  }}
                  onClick={resetDrawingGenerator}
                  disabled={drawingAiLoading}
                  type="button"
                >
                  Reset
                </button>
              </div>

              <button
                style={{ ...s.secondaryBtn, color: theme.primary, border: `1px solid ${theme.border}` }}
                onClick={saveDrawingToProject}
                type="button"
              >
                Salva tavola nel progetto
              </button>
            </div>

            <div style={s.checklistResultsArea}>
              <DrawingPreview issues={drawingIssues} previewUrl={drawingReviewFile?.previewUrl} fileName={drawingReviewFile?.fileAttachment.name} theme={theme} isDark={isDark} />
              {drawingResults.length === 0 ? <div style={{ ...s.emptyChecklist, border: `1px dashed ${theme.border}` }}>Carica una tavola e premi il pulsante di analisi, oppure compila i dati per il controllo base.</div> : drawingResults.map((item, index) => <DrawingResultCard key={index} item={item} theme={theme} isDark={isDark} renderFormattedText={renderFormattedText} />)}

              {drawingResults.length > 0 && (
                <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 12, background: isDark ? "#111" : "#f1f5f9", border: `1px solid ${theme.border}` }}>
                  <p style={{ fontSize: 12, color: isDark ? "#94a3b8" : "#64748b", margin: "0 0 10px 0", fontWeight: 600, letterSpacing: "0.03em" }}>CHIEDI A TECHAI</p>
                  <button
                    style={{ width: "100%", padding: "10px 16px", borderRadius: 8, background: theme.primary, color: "#fff", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14, marginBottom: 8 }}
                    onClick={() => askTechAIFromDrawing()}
                    type="button"
                  >
                    💬 Approfondisci le criticità
                  </button>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", overflow: "hidden" }}>
                    <input
                      style={{ flex: 1, minWidth: 0, padding: "9px 12px", borderRadius: 8, border: `1px solid ${theme.border}`, background: isDark ? "#1a1a1a" : "#fff", color: isDark ? "#f1f5f9" : "#1e293b", fontSize: 13, outline: "none" }}
                      placeholder="Scrivi una domanda specifica..."
                      value={drawingCustomQuery}
                      onChange={e => setDrawingCustomQuery(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && drawingCustomQuery.trim()) { askTechAIFromDrawing(drawingCustomQuery.trim()); setDrawingCustomQuery(""); } }}
                    />
                    <button
                      style={{ flexShrink: 0, padding: "9px 14px", borderRadius: 8, background: drawingCustomQuery.trim() ? theme.primary : (isDark ? "#222" : "#e2e8f0"), color: drawingCustomQuery.trim() ? "#fff" : (isDark ? "#555" : "#94a3b8"), border: "none", cursor: drawingCustomQuery.trim() ? "pointer" : "default", fontWeight: 700, fontSize: 14, transition: "all 0.15s" }}
                      onClick={() => { if (drawingCustomQuery.trim()) { askTechAIFromDrawing(drawingCustomQuery.trim()); setDrawingCustomQuery(""); } }}
                      type="button"
                    >
                      ➤
                    </button>
                  </div>
                </div>
              )}

              </div>
          </div>
        </Modal>
      )}

    {showProjects && (
        <ProjectsModal
          s={s}
          theme={theme}
          isDark={isDark}
          onClose={() => setShowProjects(false)}
          projectToolView={projectToolView}
          setProjectToolView={setProjectToolView}
          projectMemoryTab={projectMemoryTab}
          setProjectMemoryTab={setProjectMemoryTab}
          projectSearch={projectSearch}
          setProjectSearch={setProjectSearch}
          projects={projects}
          filteredProjects={filteredProjects}
          activeProject={activeProject}
          setActiveProjectId={setActiveProjectId}
          deleteProject={deleteProject}
          updateProject={updateProject}
          projectFileInputRef={projectFileInputRef}
          handleProjectSmartFileUpload={handleProjectSmartFileUpload}
          projectSmartFile={projectSmartFile}
          newProjectName={newProjectName}
          setNewProjectName={setNewProjectName}
          newProjectDescription={newProjectDescription}
          setNewProjectDescription={setNewProjectDescription}
          createProject={createProject}
          renderProjectMemory={renderProjectMemory}
          bomFileInputRef={bomFileInputRef}
          handleBomFileUpload={handleBomFileUpload}
          bomText={bomText}
          setBomText={setBomText}
          runBomCheck={runBomCheck}
          bomIssues={bomIssues}
        />
      )}

      {showSettings && (
        <div style={{ ...s.settingsOverlay, background: `radial-gradient(circle at 30% 20%, ${theme.primary}2E, transparent 30%), rgba(15,23,42,0.72)` }}>
          <div style={{ ...s.settingsModal, color: isDark ? "#f8fafc" : "#0f172a" }}>
            <div style={s.settingsSidePanel}>
              <div style={s.settingsTabsArea}>
                {[
                  { key: "Account", icon: "♙", subtitle: "Profilo" },
                  { key: "Aspetto", icon: "◒", subtitle: "Tema" },
                  { key: "AI Focus", icon: "◎", subtitle: "Preferenze" },
                ].map(tab => {
                  const selected = activeTab === tab.key;

                  return (
                    <button
                      key={tab.key}
                      style={{
                        ...s.settingsTabBtn,
                        background: selected ? `${theme.primary}29` : "transparent",
                        color: selected ? theme.primary : "rgba(226,232,240,0.78)",
                        boxShadow: selected ? `inset 3px 0 0 ${theme.primary}` : "none",
                      }}
                      onClick={() => setActiveTab(tab.key)}
                      type="button"
                    >
                      <span
                        style={{
                          ...s.settingsTabIcon,
                          borderColor: selected ? `${theme.primary}9E` : "rgba(148,163,184,0.22)",
                          color: selected ? theme.primary : "rgba(226,232,240,0.72)",
                        }}
                      >
                        {tab.icon}
                      </span>

                      <span style={s.settingsTabText}>
                        <strong>{tab.key}</strong>
                        <small>{tab.subtitle}</small>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div style={s.settingsSideFooter}>
                <div style={s.settingsFooterLine} />
                <div style={s.settingsInfoRow}>
                  <span style={s.settingsInfoIcon}>ⓘ</span>
                  <div>
                    <strong>Impostazioni</strong>
                    <small>Gestisci le tue preferenze</small>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ ...s.settingsMainPanel, background: isDark ? "#101010" : "#f8fbff" }}>
              <button
                style={{ ...s.settingsCloseBtn, color: isDark ? "#e2e8f0" : "#334155" }}
                onClick={() => setShowSettings(false)}
                type="button"
                aria-label="Chiudi impostazioni"
              >
                ×
              </button>

              <div style={s.settingsHeader}>
                <h2 style={s.settingsTitle}>{activeTab}</h2>
                <p style={s.settingsSubtitle}>
                  {activeTab === "Account"
                    ? "Gestisci le informazioni del tuo account."
                    : activeTab === "Aspetto"
                      ? "Scegli il tema grafico dell'interfaccia."
                      : "Imposta l'ambito principale delle risposte AI."}
                </p>
              </div>

              {activeTab === "Account" && (
                <div style={s.settingsContentStack}>
                  <div>
                    <label style={s.settingsLabel}>Nome</label>
                    <div
                      style={{
                        ...s.settingsInputCard,
                        background: isDark ? "#050505" : "rgba(255,255,255,0.9)",
                        border: `1px solid ${isDark ? "#262626" : "#dbe3ee"}`,
                      }}
                    >
                      <span style={s.settingsInputIcon}>♙</span>
                      <input
                        style={{ ...s.settingsInlineInput, color: isDark ? "#f8fafc" : "#1e293b" }}
                        value={user.name}
                        onChange={e => setUser(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Nome utente"
                      />
                    </div>
                  </div>

                  <div>
                    <label style={s.settingsLabel}>Email</label>
                    <div
                      style={{
                        ...s.settingsInputCard,
                        background: isDark ? "#050505" : "rgba(255,255,255,0.9)",
                        border: `1px solid ${isDark ? "#262626" : "#dbe3ee"}`,
                      }}
                    >
                      <span style={s.settingsInputIcon}>✉</span>
                      <input
                        style={{ ...s.settingsInlineInput, color: isDark ? "#f8fafc" : "#1e293b", cursor: "default" }}
                        value={user.email}
                        readOnly
                      />
                    </div>
                  </div>

                  {isGuest && (
                    <div
                      style={{
                        ...s.settingsGuestNotice,
                        background: isDark ? "rgba(245,158,11,0.08)" : "#fffbeb",
                        border: `1px solid ${isDark ? "rgba(245,158,11,0.26)" : "#fde68a"}`,
                      }}
                    >
                      <strong>Modalità ospite attiva</strong>
                      <span>
                        Richieste rimaste: {Math.max(GUEST_LIMIT - guestUsed, 0)}/{GUEST_LIMIT} nelle 24h · massimo {GUEST_FILE_LIMIT} file ogni 24h.
                      </span>
                    </div>
                  )}

                  <button style={s.settingsLogoutBtn} onClick={handleLogout} type="button">
                    <span style={s.settingsLogoutIcon}>↪</span>
                    <strong>{isGuest ? "Esci dalla modalità ospite" : "Logout"}</strong>
                  </button>
                </div>
              )}

              {activeTab === "Aspetto" && (
                <div style={s.settingsThemeGrid}>
                  {THEMES.map(t => {
                    const selected = theme.name === t.name;
                    const optionTextColor = isDark ? "#f8fafc" : "#1e293b";

                    const optionDotBackground =
                      t.name === "Dark Black" ? "#050505" : t.primary;

                    const optionDotBorder =
                      t.name === "Dark Black" ? "1px solid #cbd5e1" : "none";

                    return (
                      <button
                        key={t.name}
                        style={{
                          ...s.settingsThemeOption,
                          background: isDark ? "#050505" : "rgba(255,255,255,0.9)",
                          color: optionTextColor,
                          border: `1px solid ${selected ? t.primary : isDark ? "#262626" : "#dbe3ee"}`,
                          boxShadow: selected ? `0 18px 35px ${t.primary}24` : "none",
                        }}
                        onClick={() => setTheme(t)}
                        type="button"
                      >
                        <span
                          style={{
                            ...s.themeDot,
                            background: optionDotBackground,
                            border: optionDotBorder,
                          }}
                        />
                        <span>{t.name}</span>
                        {selected && <span style={{ marginLeft: "auto", color: t.primary, fontWeight: 950 }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}

              {activeTab === "AI Focus" && (
                <div style={s.settingsContentStack}>
                  <div>
                    <label style={s.settingsLabel}>Ambito tecnico principale</label>
                    <div
                      style={{
                        ...s.settingsInputCard,
                        background: isDark ? "#050505" : "rgba(255,255,255,0.9)",
                        border: `1px solid ${isDark ? "#262626" : "#dbe3ee"}`,
                      }}
                    >
                      <span style={s.settingsInputIcon}>◎</span>
                      <input
                        style={{ ...s.settingsInlineInput, color: isDark ? "#f8fafc" : "#1e293b" }}
                        value={interest}
                        onChange={e => setInterest(e.target.value)}
                        placeholder="Ingegneria Meccanica"
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      ...s.settingsGuestNotice,
                      background: isDark ? `${theme.primary}14` : `${theme.primary}14`,
                      border: `1px solid ${theme.primary}42`,
                    }}
                  >
                    <strong>Consiglio</strong>
                    <span>Scrivi un ambito specifico, ad esempio: Costruzione di Macchine, Oleodinamica, React/TypeScript, Disegno tecnico.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
