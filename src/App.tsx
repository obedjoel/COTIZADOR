import { useState, useEffect } from "react";
import { 
  Trash2, Plus, Check, Edit2, History, RotateCcw, 
  Loader2, Download, Eye, AlertCircle, CheckCircle, RefreshCw, X,
  Palette, Sliders, ChevronDown, ChevronUp, Copy, ArrowUp, ArrowDown, Camera,
  Database, Wifi, WifiOff, Cloud, Server, Globe, Settings, Upload, Sparkles, FileText, CheckSquare,
  MessageCircle, Printer, Send, Mail, ExternalLink, Clock, Rocket, CheckCircle2,
  Users, Search
} from "lucide-react";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import { Cotizacion, CotizacionItem, ClientData } from "./types";
import logoOne from "./logoONEtransparente.png";
import { initAuth, googleSignIn, getAccessToken } from "./googleAuth";
import { createSpreadsheet, appendRow, getSpreadsheetData } from "./googleSheetsService";
import defaultFirebaseConfig from "../firebase-applet-config.json";

// Dynamic Client-side Firebase Firestore initialization helper
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, query, orderBy, limit, doc as firestoreDoc, getDoc as firestoreGetDoc } from "firebase/firestore";

let firebaseInstanceApp: any = null;
let firestoreInstanceDb: any = null;

function getActiveFirebaseDb() {
  if (firestoreInstanceDb) return firestoreInstanceDb;
  
  let config: any = defaultFirebaseConfig;
  const storedConfig = localStorage.getItem("one_firebase_config_keys");
  if (storedConfig) {
    try {
      const parsed = JSON.parse(storedConfig);
      if (parsed && parsed.apiKey) {
        config = parsed;
      }
    } catch (e) {
      console.warn("Using default Firebase configuration");
    }
  }
  
  try {
    if (config && config.apiKey) {
      if (getApps().length === 0) {
        firebaseInstanceApp = initializeApp(config);
      } else {
        firebaseInstanceApp = getApp();
      }
      firestoreInstanceDb = getFirestore(firebaseInstanceApp);
      return firestoreInstanceDb;
    }
    return null;
  } catch (err) {
    console.error("Error initializing Firebase Firestore db:", err);
    return null;
  }
}

const PRODUCT_SUGGESTIONS = [
  { nombre: 'Tarjetas de presentación couché 400 gr.', unidad: 'Millar' },
  { nombre: 'Fotochecks de PVC (impresión directa)', unidad: 'Unidad' },
  { nombre: 'Volantes A5', unidad: 'Millar' },
  { nombre: 'Volantes A6', unidad: 'Millar' },
  { nombre: 'Volantes A7', unidad: 'Millar' },
  { nombre: 'Folders Foldcote C14', unidad: 'Ciento' },
  { nombre: 'Folders Foldcote C16', unidad: 'Ciento' },
  { nombre: 'Afiches A3', unidad: 'Unidad' },
  { nombre: 'Afiches A2', unidad: 'Unidad' }
];

const POPULAR_CHIPS = [
  { label: "+ 💳 Tarjetas", desc: "Tarjetas de presentación couché 400 gr. con acabado plastificado mate", price: 0, unit: "Millar" },
  { label: "+ 🎨 Logo", desc: "Diseño de Logotipo e Identidad Corporativa (Propuestas gráficas + Paleta de colores + Tipografías + Entregables vectoriales)", price: 0, unit: "Unidad" },
  { label: "+ 📣 Volantes", desc: "Volantes publicitarios formato A5 en papel couché 115 gr. full color de alta calidad", price: 0, unit: "Millar" },
  { label: "+ 🛡️ Fotochecks", desc: "Fotochecks de PVC de alta duración con cinta sublimada de 20mm con mosquetón (impresión directa)", price: 0, unit: "Unidad" },
  { label: "+ 📱 Packs Redes", desc: "Diseño y maquetación de 12 plantillas digitales editables para publicaciones de Instagram/Facebook", price: 0, unit: "Unidad" },
  { label: "+ 📁 Folders", desc: "Folders institucionales en cartulina Foldcote C16 tintero, troquelado especial y plastificado mate", price: 0, unit: "Ciento" },
  { label: "+ 🪧 Afiches", desc: "Afiches A3 impresión láser full color en papel couché de 150gr", price: 0, unit: "Ciento" },
  { label: "+ 🖼️ Banners", desc: "Banner publicitario impreso en lona de 13oz con ollaos esquineros para colgar", price: 0, unit: "Unidad" }
];

// CLÁUSULAS POR CATEGORÍA CON LÓGICA DE REEMPLAZO INTELIGENTE (Sin contradicciones internas)
export const CONDICIONES_CLAUSULAS = [
  // FORMA DE PAGO (Mutuamente excluyentes)
  {
    categoria: "pago",
    catLabel: "Forma de Pago",
    label: "💳 50% Adelanto",
    text: "• Forma de pago: 50% de adelanto para inicio y 50% contra entrega conforme."
  },
  {
    categoria: "pago",
    catLabel: "Forma de Pago",
    label: "💰 100% Contado",
    text: "• Forma de pago: 100% al contado por adelantado para activación inmediata."
  },
  {
    categoria: "pago",
    catLabel: "Forma de Pago",
    label: "🏢 Crédito 15 Días",
    text: "• Forma de pago: Crédito comercial a 15 días calendario previa orden de compra."
  },
  {
    categoria: "pago",
    catLabel: "Forma de Pago",
    label: "💵 Contra Entrega",
    text: "• Forma de pago: Cancelación del 100% contra entrega conforme de los productos."
  },

  // TIEMPO DE ENTREGA (Mutuamente excluyentes)
  {
    categoria: "entrega",
    catLabel: "Tiempo de Entrega",
    label: "⚡ Express 24-48h",
    text: "• Tiempo de entrega: 24 a 48 horas hábiles tras aprobación del arte final."
  },
  {
    categoria: "entrega",
    catLabel: "Tiempo de Entrega",
    label: "⏳ Estándar 3-5 días",
    text: "• Tiempo de entrega: 3 a 5 días hábiles tras confirmación de diseño."
  },
  {
    categoria: "entrega",
    catLabel: "Tiempo de Entrega",
    label: "📦 Producción 7-10 días",
    text: "• Tiempo de entrega: 7 a 10 días hábiles según volumen de producción."
  },

  // VALIDEZ DE LA COTIZACIÓN (Mutuamente excluyentes)
  {
    categoria: "validez",
    catLabel: "Validez",
    label: "📅 Validez 7 días",
    text: "• Validez de la cotización: 7 días calendario."
  },
  {
    categoria: "validez",
    catLabel: "Validez",
    label: "📅 Validez 15 días",
    text: "• Validez de la cotización: 15 días calendario."
  },
  {
    categoria: "validez",
    catLabel: "Validez",
    label: "📅 Validez 30 días",
    text: "• Validez de la cotización: 30 días calendario."
  },

  // APROBACIÓN Y AJUSTES
  {
    categoria: "aprobacion",
    catLabel: "Aprobación",
    label: "✅ Visto Bueno Digital",
    text: "• Todo trabajo se inicia únicamente tras la aprobación por escrito del arte final o visto bueno digital."
  },
  {
    categoria: "ajustes",
    catLabel: "Ajustes",
    label: "📐 Hasta 2 Revisiones",
    text: "• Incluye hasta 2 rondas de correcciones o ajustes menores sobre la propuesta elegida."
  },

  // ENTREGA Y DESPACHO (Mutuamente excluyentes)
  {
    categoria: "envio",
    catLabel: "Envío / Recojo",
    label: "🛵 Delivery Incluido",
    text: "• Incluye entrega / delivery sin costo en zona urbana de Arequipa."
  },
  {
    categoria: "envio",
    catLabel: "Envío / Recojo",
    label: "🏭 Recojo en Taller",
    text: "• Entrega para recojo en nuestro taller de diseño y producción."
  },
  {
    categoria: "envio",
    catLabel: "Envío / Recojo",
    label: "🚚 Envío a Provincias",
    text: "• Envío a provincias por agencia de transporte (flete pago en destino por el cliente)."
  }
];

const getNextSuggestedInvoiceNumber = (prefix: string, list: Cotizacion[]) => {
  const prefixMatches = list.filter(q => q.prefix === prefix);
  if (prefixMatches.length === 0) {
    return "00001";
  }
  const numbers = prefixMatches.map(q => {
    const val = parseInt(q.numero, 10);
    return isNaN(val) ? 0 : val;
  });
  const maxNum = Math.max(...numbers);
  // Increment randomly between 1 and 3 to simulate higher activity
  const increment = Math.floor(Math.random() * 3) + 1;
  const nextNum = maxNum + increment;
  return String(nextNum).padStart(5, "0");
};

export default function App() {
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [historyList, setHistoryList] = useState<Cotizacion[]>([]);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);

  // Document states
  const [fechaActual, setFechaActual] = useState<string>("");
  const [cotizacionPrefix, setCotizacionPrefix] = useState<string>("2026-10-");
  const [cotizacionNumero, setCotizacionNumero] = useState<string>("00001");
  
  // Client & project state
  const [cliente, setCliente] = useState<ClientData>({
    nombre: "",
    ruc: "",
    contacto: "",
    telefono: ""
  });
  const [proyecto, setProyecto] = useState<string>("");
  
  // Table items state
  const [items, setItems] = useState<CotizacionItem[]>([]);

  const [observaciones, setObservaciones] = useState<string>("");
  const [igvActivo, setIgvActivo] = useState<boolean>(true);
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const isDocumentClean = previewMode || isExporting;

  // Advanced Configurations & Themes Support (With automatic offline-first persistence)
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [moneda, setMoneda] = useState<string>("S/");
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [themeColor, setThemeColor] = useState<string>("#2CB1C9");
  
  // Editable corporate bank details
  const [bancoSoles, setBancoSoles] = useState<string>("21579762413089");
  const [cciSoles, setCciSoles] = useState<string>("00221517976241308924");
  const [bancoDolares, setBancoDolares] = useState<string>("4320300629");
  const [cciDolares, setCciDolares] = useState<string>("00943220432030062969");
  const [detracciones, setDetracciones] = useState<string>("00101821358");

  // Emisor & Brand details (with custom profile autosave support)
  const [brandName, setBrandName] = useState<string>("ONE ESTUDIO GRÁFICO");
  const [brandSubtitle, setBrandSubtitle] = useState<string>("ESTUDIO GRÁFICO");
  const [emisorNombre, setEmisorNombre] = useState<string>("OBED GUEVARA");
  const [emisorRuc, setEmisorRuc] = useState<string>("10417585350");
  const [emisorTelefono, setEmisorTelefono] = useState<string>("+51 991 820 589");
  const [emisorEmail, setEmisorEmail] = useState<string>("obedjoel@gmail.com");
  const [emisorDireccion, setEmisorDireccion] = useState<string>("Leoncio Prado V7, Paucarpata");
  const [taxRate, setTaxRate] = useState<number>(18);
  const [contactos, setContactos] = useState<ClientData[]>([]);
  const [directoryModalOpen, setDirectoryModalOpen] = useState<boolean>(false);
  const [directorySearch, setDirectorySearch] = useState<string>("");
  const [newDirectorioFormOpen, setNewDirectorioFormOpen] = useState<boolean>(false);
  const [newDirectorioCliente, setNewDirectorioCliente] = useState<ClientData>({
    nombre: "",
    ruc: "",
    contacto: "",
    telefono: ""
  });
  
  // SUNAT-Style Pop-up Modal State for Items
  const [itemModalOpen, setItemModalOpen] = useState<boolean>(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [modalItemData, setModalItemData] = useState<{
    producto: string;
    cantidad: number;
    unidad: string;
    valorUnitario: number;
  }>({
    producto: "",
    cantidad: 1,
    unidad: "Unidad",
    valorUnitario: 0
  });

  // Advanced toggles
  const [showBankSettings, setShowBankSettings] = useState<boolean>(false);

  // 1. CIERRE DE VENTAS Y COMUNICACIÓN RÁPIDA (Modal, plantillas y pipeline de ventas)
  const [salesModalOpen, setSalesModalOpen] = useState<boolean>(false);
  const [salesTargetQuote, setSalesTargetQuote] = useState<Cotizacion | null>(null);
  const [salesTemplate, setSalesTemplate] = useState<"formal" | "aprobacion" | "vencimiento">("formal");
  const [salesCustomPhone, setSalesCustomPhone] = useState<string>("");
  const [salesCustomMessage, setSalesCustomMessage] = useState<string>("");
  const [currentQuoteStatus, setCurrentQuoteStatus] = useState<"pendiente" | "aprobada" | "rechazada">("pendiente");

  // Database Integration State (Cloud Firestore out-of-the-box + Local offline persistence)
  const [dbSource, setDbSource] = useState<"server" | "offline" | "firebase" | "gsheets">("firebase");
  const [firebaseConfigStr, setFirebaseConfigStr] = useState<string>("");
  const [showDbSettings, setShowDbSettings] = useState<boolean>(false);

  // Custom confirmation dialog (Bypasses iframe sandboxed window.confirm blocking)
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    description: "",
    confirmText: "Aceptar",
    cancelText: "Cancelar",
    isDanger: false,
    onConfirm: () => {}
  });

  const triggerConfirm = (params: {
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  }) => {
    setConfirmModal({
      open: true,
      title: params.title,
      description: params.description,
      confirmText: params.confirmText || "Aceptar",
      cancelText: params.cancelText || "Cancelar",
      isDanger: !!params.isDanger,
      onConfirm: () => {
        params.onConfirm();
        setConfirmModal(prev => ({ ...prev, open: false }));
      }
    });
  };

  // Notification helper
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "error" | null }>({
    message: "",
    type: null
  });

  // Totals calculations (Applying dynamic discount percentages on item subtotal sums)
  const subtotal = items.reduce((acc, curr) => {
    // Only count item subtotal if the item product description is not blank
    if (curr.producto.trim()) {
      return acc + (curr.cantidad * curr.valorUnitario || 0);
    }
    return acc;
  }, 0);
  const discountAmount = subtotal * (discountPercentage / 100);
  const taxableBase = subtotal - discountAmount;
  const igv = igvActivo ? taxableBase * (taxRate / 100) : 0;
  const total = taxableBase + igv;

  // Set default live dates & load configurations
  useEffect(() => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    const activeFecha = `${dd}/${mm}/${yyyy}`;
    const activePrefix = "2026-10-";
    
    setFechaActual(activeFecha);
    setCotizacionPrefix(activePrefix);

    const offlineHist = JSON.parse(localStorage.getItem("one_hist_checkpoint1") || "[]");

    const raw = localStorage.getItem("one_estudio_autosave_checkpoint1");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.cliente) setCliente(parsed.cliente);
        if (parsed.proyecto) setProyecto(parsed.proyecto);
        
        // Auto-upgrade if it's the old default "00195" or set draft
        let startNum = getNextSuggestedInvoiceNumber(activePrefix, offlineHist);
        if (parsed.numero && parsed.numero !== "00195" && parsed.numero !== "00001") {
          startNum = parsed.numero;
        }
        setCotizacionNumero(startNum);
        
        if (parsed.observaciones && parsed.observaciones !== "Adelanto 50%, tiempo de entrega...") {
          setObservaciones(parsed.observaciones);
        } else {
          setObservaciones("");
        }
        if (parsed.igvActivo !== undefined) setIgvActivo(parsed.igvActivo);
        if (parsed.items && parsed.items.length) {
          const cleanLoadedItems = parsed.items.filter((it: CotizacionItem) => it.producto && it.producto.trim() !== "");
          setItems(cleanLoadedItems);
        }
        
        // Advanced Customizer load configs
        if (parsed.moneda) setMoneda(parsed.moneda);
        if (parsed.discountPercentage !== undefined) setDiscountPercentage(parsed.discountPercentage);
        if (parsed.themeColor) setThemeColor(parsed.themeColor);
        if (parsed.bancoSoles) setBancoSoles(parsed.bancoSoles);
        if (parsed.cciSoles) setCciSoles(parsed.cciSoles);
        if (parsed.bancoDolares) setBancoDolares(parsed.bancoDolares);
        if (parsed.cciDolares) setCciDolares(parsed.cciDolares);
        if (parsed.detracciones) setDetracciones(parsed.detracciones);

        // Customizable brand, emisor profile and taxes load configs
        if (parsed.brandName) setBrandName(parsed.brandName === "ONE ESPACIO CREATIVO" ? "ONE ESTUDIO GRÁFICO" : parsed.brandName);
        if (parsed.brandSubtitle) setBrandSubtitle(parsed.brandSubtitle);
        if (parsed.emisorNombre) setEmisorNombre(parsed.emisorNombre);
        if (parsed.emisorRuc) setEmisorRuc(parsed.emisorRuc);
        if (parsed.emisorTelefono) setEmisorTelefono(parsed.emisorTelefono);
        if (parsed.emisorEmail) setEmisorEmail(parsed.emisorEmail);
        if (parsed.emisorDireccion) setEmisorDireccion(parsed.emisorDireccion);
        if (parsed.taxRate !== undefined) setTaxRate(parsed.taxRate);
      } catch (err) {
        console.error("Error al cargar autoguardado", err);
        setCotizacionNumero(getNextSuggestedInvoiceNumber(activePrefix, offlineHist));
      }
    } else {
      setCotizacionNumero(getNextSuggestedInvoiceNumber(activePrefix, offlineHist));
    }

    // Load saved client contacts directory and auto-merge any clients from offlineHist
    let loadedContactos: ClientData[] = [];
    const storedContactos = localStorage.getItem("one_estudio_contactos");
    if (storedContactos) {
      try {
        loadedContactos = JSON.parse(storedContactos);
      } catch (e) {
        console.error("Error loading contacts directory", e);
      }
    }
    if (offlineHist && Array.isArray(offlineHist)) {
      offlineHist.forEach((q: Cotizacion) => {
        if (q.cliente && q.cliente.nombre && q.cliente.nombre.trim()) {
          const exists = loadedContactos.some(c => c.nombre.toLowerCase().trim() === q.cliente.nombre.toLowerCase().trim());
          if (!exists) {
            loadedContactos.push(q.cliente);
          }
        }
      });
    }
    setContactos(loadedContactos);

    // Load custom database settings and selection
    const savedDbSource = localStorage.getItem("one_db_source");
    if (savedDbSource === "server" || savedDbSource === "offline" || savedDbSource === "firebase") {
      setDbSource(savedDbSource);
    } else {
      // Default to "firebase" Cloud so quotes can sync across devices without manual setup
      setDbSource("firebase");
      localStorage.setItem("one_db_source", "firebase");
    }

    const savedKeys = localStorage.getItem("one_firebase_config_keys");
    if (savedKeys) {
      setFirebaseConfigStr(savedKeys);
    }

    import("./googleAuth").then(({ initAuth }) => {
      initAuth();
    }).catch(e => console.error("Could not init google auth", e));

    setIsLoaded(true);

    // Initial silent history fetch to pre-populate quotes
    setTimeout(() => {
      const activeSource = savedDbSource || "firebase";
      if (activeSource === "firebase") {
        const db = getActiveFirebaseDb();
        if (db) {
          const colRef = collection(db, "cotizaciones");
          getDocs(colRef).then(snapshot => {
            const data = snapshot.docs.map(docVal => docVal.data() as Cotizacion);
            data.sort((a, b) => {
              const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return dateB - dateA;
            });
            if (data.length) {
              setHistoryList(data);
              localStorage.setItem("one_hist_checkpoint1", JSON.stringify(data));
            } else {
              const localH = JSON.parse(localStorage.getItem("one_hist_checkpoint1") || "[]");
              setHistoryList(localH);
            }
          }).catch(e => {
            console.warn("Background firestore fetch failed, using local history", e);
            const localH = JSON.parse(localStorage.getItem("one_hist_checkpoint1") || "[]");
            setHistoryList(localH);
          });
        } else {
          const localH = JSON.parse(localStorage.getItem("one_hist_checkpoint1") || "[]");
          setHistoryList(localH);
        }
      } else {
        const localH = JSON.parse(localStorage.getItem("one_hist_checkpoint1") || "[]");
        setHistoryList(localH);
      }
    }, 500);
  }, []);

  // Universal Autoflow Autosave Effect! Triggered automatically on state transitions
  useEffect(() => {
    if (!isLoaded) return;
    const draft = {
      cliente,
      proyecto,
      numero: cotizacionNumero,
      observaciones,
      igvActivo,
      items,
      moneda,
      discountPercentage,
      themeColor,
      bancoSoles,
      cciSoles,
      bancoDolares,
      cciDolares,
      detracciones,
      brandName,
      brandSubtitle,
      emisorNombre,
      emisorRuc,
      emisorTelefono,
      emisorEmail,
      emisorDireccion,
      taxRate
    };
    localStorage.setItem("one_estudio_autosave_checkpoint1", JSON.stringify(draft));
  }, [
    isLoaded, cliente, proyecto, cotizacionNumero, observaciones, igvActivo, 
    items, moneda, discountPercentage, themeColor, 
    bancoSoles, cciSoles, bancoDolares, cciDolares, detracciones,
    brandName, brandSubtitle, emisorNombre, emisorRuc, emisorTelefono, emisorEmail, emisorDireccion, taxRate
  ]);

  // Compatibility helper (prevents build errors from legacy event signatures)
  const saveLocalDraft = (
    _updatedCliente: ClientData, 
    _updatedProyecto: string, 
    _updatedNumero: string, 
    _updatedObservaciones: string, 
    _updatedIgv: boolean, 
    _updatedItems: CotizacionItem[]
  ) => {
    // Autosaved reactively in the effect above!
  };

  const updateItemsAndAutosave = (newItems: CotizacionItem[]) => {
    setItems(newItems);
  };

  const showNotification = (message: string, type: "success" | "info" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: "", type: null });
    }, 4500);
  };

  // Sync / REST backend calls & Dynamic Cloud Database (Option 3 Implementation)
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      if (dbSource === "firebase") {
        const db = getActiveFirebaseDb();
        if (!db) {
          showNotification("Firestore no configurado. Ingrese sus credenciales en 'Ajustes BD'.", "error");
          setHistoryList([]);
          return;
        }
        try {
          const colRef = collection(db, "cotizaciones");
          const snapshot = await getDocs(colRef);
          const data = snapshot.docs.map(docVal => docVal.data() as Cotizacion);
          // Sort by createdAt or reference descending
          data.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });
          setHistoryList(data);
          showNotification(`Cargadas ${data.length} cotizaciones desde Firestore Cloud.`, "success");
        } catch (dbErr: any) {
          console.error("Firestore read error:", dbErr);
          showNotification(`Error al leer de Firestore: ${dbErr.message}`, "error");
        }
      } else if (dbSource === "offline" || dbSource === "gsheets") {
        // Pure local persistence
        const offlineHist = JSON.parse(localStorage.getItem("one_hist_checkpoint1") || "[]");
        setHistoryList(offlineHist);
        showNotification(`Cargadas ${offlineHist.length} cotizaciones locales (Dispositivo).`, "success");
      } else {
        // Standard REST endpoint fallback
        const { getIdToken } = await import("./googleAuth");
        const token = await getIdToken();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        
        const res = await fetch("/api/cotizaciones", { headers });
        if (res.ok) {
          const data = await res.json();
          setHistoryList(data);
        } else {
          showNotification("No se pudo conectar al servidor local de historial.", "error");
        }
      }
    } catch (err) {
      console.error(err);
      showNotification("Error de red o conexión al consultar historial.", "error");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSaveToDatabase = async () => {
    const validItems = items.filter(i => i.producto.trim() !== "");
    if (!validItems.length) {
      showNotification("Por favor, agregue al menos un ítem o concepto de servicio.", "info");
      return;
    }

    setLoading(true);
    const quoteId = `${cotizacionPrefix}${cotizacionNumero}`;
    
    const payload: Cotizacion = {
      id: quoteId,
      numero: cotizacionNumero,
      prefix: cotizacionPrefix,
      fecha: fechaActual,
      cliente,
      proyecto,
      observaciones,
      igvActivo,
      items,
      subtotal,
      igv,
      total,
      
      // Injecting our advanced features for cloud sync persistence!
      moneda,
      discountPercentage,
      discountAmount,
      themeColor,
      bancoSoles,
      cciSoles,
      bancoDolares,
      cciDolares,
      detracciones,
      brandName,
      brandSubtitle,
      emisorNombre,
      emisorRuc,
      emisorTelefono,
      emisorEmail,
      emisorDireccion,
      taxRate,
      createdAt: new Date().toISOString()
    };

    try {
      if (dbSource === "firebase") {
        const db = getActiveFirebaseDb();
        if (!db) {
          showNotification("Firebase Firestore no configurado. Ingrese sus credenciales.", "error");
          setLoading(false);
          return;
        }
        const docRef = doc(db, "cotizaciones", quoteId);
        await setDoc(docRef, payload);
        
        // Also keep local history copy for instant sync
        let hist = JSON.parse(localStorage.getItem("one_hist_checkpoint1") || "[]");
        const idx = hist.findIndex((c: any) => c.id === payload.id);
        if (idx > -1) hist[idx] = payload;
        else hist.unshift(payload);
        localStorage.setItem("one_hist_checkpoint1", JSON.stringify(hist));

        // Auto-increment dynamically upon successful save
        const nextNum = getNextSuggestedInvoiceNumber(cotizacionPrefix, hist);
        setCotizacionNumero(nextNum);
        showNotification(`Cotización ${quoteId} guardada. El número de cotización cambió aleatoriamente a la N° ${nextNum}.`, "success");
      } else if (dbSource === "gsheets") {
        // Authenticate with Google
        let token = getAccessToken();
        if (!token) {
          try {
            const authRes = await googleSignIn();
            if (authRes) token = authRes.accessToken;
          } catch (e) {
            console.error(e);
            showNotification("Requiere iniciar sesión en Google para guardar en Sheets.", "error");
            setLoading(false);
            return;
          }
        }
        
        if (token) {
          let sheetId = localStorage.getItem("one_gsheets_id");
          if (!sheetId) {
            showNotification("Creando hoja de cálculo inicial...", "info");
            sheetId = await createSpreadsheet(token);
            localStorage.setItem("one_gsheets_id", sheetId);
          }
          
          await appendRow(sheetId, token, [
            payload.id,
            payload.fecha,
            payload.cliente.nombre,
            payload.cliente.ruc,
            payload.proyecto,
            payload.subtotal,
            payload.igv,
            payload.total,
            payload.moneda,
            "Guardado Exitosamente"
          ]);
          
          // Keep local history
          let hist = JSON.parse(localStorage.getItem("one_hist_checkpoint1") || "[]");
          const idx = hist.findIndex((c: any) => c.id === payload.id);
          if (idx > -1) hist[idx] = payload;
          else hist.unshift(payload);
          localStorage.setItem("one_hist_checkpoint1", JSON.stringify(hist));
          
          const nextNum = getNextSuggestedInvoiceNumber(cotizacionPrefix, hist);
          setCotizacionNumero(nextNum);
          
          showNotification(`Cotización ${quoteId} sincronizada. Vista disponible en Google Sheets.`, "success");
        }
      } else if (dbSource === "offline") {
        // Pure local offline directory saving
        let hist = JSON.parse(localStorage.getItem("one_hist_checkpoint1") || "[]");
        const idx = hist.findIndex((c: any) => c.id === payload.id);
        if (idx > -1) hist[idx] = payload;
        else hist.unshift(payload);
        localStorage.setItem("one_hist_checkpoint1", JSON.stringify(hist));

        // Auto-increment dynamically upon successful save
        const nextNum = getNextSuggestedInvoiceNumber(cotizacionPrefix, hist);
        setCotizacionNumero(nextNum);
        showNotification(`Cotización ${quoteId} guardada localmente. Nueva correlativa: N° ${nextNum}.`, "success");
      } else {
        // Standard REST endpoint
        const { getIdToken } = await import("./googleAuth");
        const token = await getIdToken();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetch("/api/cotizaciones", {
          method: "POST",
          headers,
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          // Update client local storage history list as well
          let hist = JSON.parse(localStorage.getItem("one_hist_checkpoint1") || "[]");
          const idx = hist.findIndex((c: any) => c.id === payload.id);
          if (idx > -1) hist[idx] = payload;
          else hist.unshift(payload);
          localStorage.setItem("one_hist_checkpoint1", JSON.stringify(hist));

          // Auto-increment dynamically upon successful save
          const nextNum = getNextSuggestedInvoiceNumber(cotizacionPrefix, hist);
          setCotizacionNumero(nextNum);
          showNotification(`Cotización ${quoteId} guardada en servidor. Próxima correlatividad: N° ${nextNum}.`, "success");
        } else {
          showNotification("Error de servidor al intentar guardar.", "error");
        }
      }
    } catch (err) {
      console.error(err);
      showNotification("Error de conexión al guardar los datos.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Cláusulas por categoría con lógica inteligente de no contradicción
  const handleApplyConditionClause = (categoria: string, clauseText: string) => {
    setObservaciones(prev => {
      const lines = prev.split("\n").map(l => l.trim()).filter(Boolean);
      
      const categoryKeywords: Record<string, string[]> = {
        pago: ["forma de pago", "adelanto", "saldo", "al contado", "crédito", "contra entrega", "cancelación"],
        entrega: ["tiempo de entrega", "días hábiles", "horas hábiles", "plazo de entrega"],
        validez: ["validez de la cotización", "validez:"],
        aprobacion: ["aprobación por escrito", "visto bueno", "confirmación escrita"],
        ajustes: ["rondas de correcciones", "revisiones", "ajustes menores"],
        envio: ["delivery", "recojo en taller", "envío a provincias", "agencia de transporte"]
      };

      const keywords = categoryKeywords[categoria] || [];
      const matchIndex = lines.findIndex(line => {
        const lower = line.toLowerCase();
        return keywords.some(kw => lower.includes(kw));
      });

      if (matchIndex !== -1) {
        // Si el usuario vuelve a presionar la misma cláusula activa, la desactiva/quita
        if (lines[matchIndex] === clauseText.trim()) {
          lines.splice(matchIndex, 1);
          return lines.join("\n");
        }
        // Reemplaza la cláusula incompatible existente en esa categoría
        lines[matchIndex] = clauseText.trim();
      } else {
        lines.push(clauseText.trim());
      }

      return lines.join("\n");
    });
  };

  // Sincronización bidireccional completa entre el Almacenamiento Local y la Nube Firestore
  const handleSyncCloudAndLocal = async () => {
    setLoading(true);
    try {
      const db = getActiveFirebaseDb();
      let localHist: Cotizacion[] = JSON.parse(localStorage.getItem("one_hist_checkpoint1") || "[]");

      if (db) {
        const colRef = collection(db, "cotizaciones");
        const snapshot = await getDocs(colRef);
        const cloudQuotes: Cotizacion[] = snapshot.docs.map(d => d.data() as Cotizacion);

        const cloudMap = new Map(cloudQuotes.map(q => [q.id, q]));
        const localMap = new Map(localHist.map(q => [q.id, q]));

        let uploaded = 0;
        // Subir a la nube cualquier cotización guardada localmente que falte en Firestore
        for (const [id, lq] of localMap.entries()) {
          if (!cloudMap.has(id)) {
            await setDoc(doc(db, "cotizaciones", id), lq);
            cloudMap.set(id, lq);
            uploaded++;
          }
        }

        const merged = Array.from(cloudMap.values());
        merged.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });

        localStorage.setItem("one_hist_checkpoint1", JSON.stringify(merged));
        setHistoryList(merged);
        showNotification(`¡Sincronización completada! ${merged.length} cotizaciones consolidadas (${uploaded} respaldadas en la nube).`, "success");
      } else {
        // Fallback vía API de servidor
        const res = await fetch("/api/cotizaciones");
        if (res.ok) {
          const serverQuotes: Cotizacion[] = await res.json();
          const mergedMap = new Map(localHist.map(q => [q.id, q]));
          serverQuotes.forEach(sq => mergedMap.set(sq.id, sq));
          const merged = Array.from(mergedMap.values());
          localStorage.setItem("one_hist_checkpoint1", JSON.stringify(merged));
          setHistoryList(merged);
          showNotification(`Sincronizado con el servidor: ${merged.length} cotizaciones.`, "success");
        }
      }
    } catch (err: any) {
      console.error("Sync error:", err);
      showNotification(`Error durante la sincronización: ${err.message || "Fallo de conexión"}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Exportar respaldo integral en JSON para guardar en Google Drive, USB o enviar
  const handleExportBackupJson = () => {
    const localHist = JSON.parse(localStorage.getItem("one_hist_checkpoint1") || "[]");
    const storedContactos = JSON.parse(localStorage.getItem("one_estudio_contactos") || "[]");
    const draft = localStorage.getItem("one_estudio_autosave_checkpoint1");

    const backupData = {
      version: "2.0",
      app: "ONE estudio gráfico - Cotizador",
      exportDate: new Date().toISOString(),
      cotizaciones: historyList.length ? historyList : localHist,
      contactos: storedContactos,
      draft: draft ? JSON.parse(draft) : null,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `respaldo_cotizaciones_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification("Respaldo completo exportado en archivo JSON.", "success");
  };

  // Importar y restaurar respaldo desde archivo JSON en cualquier dispositivo
  const handleImportBackupJson = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        const importedQuotes: Cotizacion[] = Array.isArray(parsed) ? parsed : (parsed.cotizaciones || []);

        if (!importedQuotes.length) {
          showNotification("El archivo JSON no contiene cotizaciones.", "error");
          return;
        }

        let currentHist = JSON.parse(localStorage.getItem("one_hist_checkpoint1") || "[]");
        const map = new Map(currentHist.map((q: any) => [q.id, q]));

        importedQuotes.forEach(q => {
          if (q && q.id) map.set(q.id, q);
        });

        const updatedList = Array.from(map.values()) as Cotizacion[];
        localStorage.setItem("one_hist_checkpoint1", JSON.stringify(updatedList));
        setHistoryList(updatedList);

        if (parsed.contactos && Array.isArray(parsed.contactos)) {
          setContactos(parsed.contactos);
          localStorage.setItem("one_estudio_contactos", JSON.stringify(parsed.contactos));
        }

        // Subir también a Firestore Cloud
        const db = getActiveFirebaseDb();
        if (db) {
          for (const q of importedQuotes) {
            if (q.id) await setDoc(doc(db, "cotizaciones", q.id), q);
          }
        }

        showNotification(`¡Restauradas ${importedQuotes.length} cotizaciones y sincronizadas con la nube!`, "success");
      } catch (err) {
        console.error(err);
        showNotification("Error al procesar el archivo JSON de respaldo.", "error");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  // Exportar todas las cotizaciones a formato CSV para Excel
  const handleExportCsv = () => {
    const list = historyList.length ? historyList : JSON.parse(localStorage.getItem("one_hist_checkpoint1") || "[]");
    if (!list.length) {
      showNotification("No hay cotizaciones registradas para exportar a CSV.", "info");
      return;
    }

    const headers = ["ID", "NUMERO", "FECHA", "CLIENTE", "RUC", "PROYECTO", "MONEDA", "SUBTOTAL", "IGV", "TOTAL"];
    const rows = list.map((q: Cotizacion) => [
      `"${q.id || ''}"`,
      `"${q.numero || ''}"`,
      `"${q.fecha || ''}"`,
      `"${(q.cliente?.nombre || '').replace(/"/g, '""')}"`,
      `"${q.cliente?.ruc || ''}"`,
      `"${(q.proyecto || '').replace(/"/g, '""')}"`,
      `"${q.moneda || 'S/'}"`,
      (q.subtotal || 0).toFixed(2),
      (q.igv || 0).toFixed(2),
      (q.total || 0).toFixed(2)
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte_cotizaciones_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification("Reporte CSV generado exitosamente para Excel.", "success");
  };

  const handleCargarQuote = (selected: Cotizacion) => {
    if (selected.cliente) setCliente(selected.cliente);
    if (selected.proyecto) setProyecto(selected.proyecto);
    if (selected.numero) setCotizacionNumero(selected.numero);
    if (selected.fecha) setFechaActual(selected.fecha);
    if (selected.prefix) setCotizacionPrefix(selected.prefix);
    if (selected.observaciones) setObservaciones(selected.observaciones);
    if (selected.igvActivo !== undefined) setIgvActivo(selected.igvActivo);
    if (selected.items) setItems(selected.items);
    
    // Load advanced customizer properties synced to this record
    setMoneda(selected.moneda || "S/");
    setDiscountPercentage(selected.discountPercentage !== undefined ? selected.discountPercentage : 0);
    setThemeColor(selected.themeColor || "#2CB1C9");
    setBancoSoles(selected.bancoSoles || "21579762413089");
    setCciSoles(selected.cciSoles || "00221517976241308924");
    setBancoDolares(selected.bancoDolares || "4320300629");
    setCciDolares(selected.cciDolares || "00943220432030062969");
    setDetracciones(selected.detracciones || "00101821358");

    // Load customizable brand and emisor details
    setBrandName(selected.brandName && selected.brandName !== "ONE ESPACIO CREATIVO" ? selected.brandName : "ONE ESTUDIO GRÁFICO");
    setBrandSubtitle(selected.brandSubtitle || "ESTUDIO GRÁFICO");
    setEmisorNombre(selected.emisorNombre || "OBED GUEVARA");
    setEmisorRuc(selected.emisorRuc || "10417585350");
    setEmisorTelefono(selected.emisorTelefono || "+51 991 820 589");
    setEmisorEmail(selected.emisorEmail || "obedjoel@gmail.com");
    setEmisorDireccion(selected.emisorDireccion || "Leoncio Prado V7, Paucarpata");
    setTaxRate(selected.taxRate !== undefined ? selected.taxRate : 18);

    setHistoryOpen(false);
    showNotification(`Cotización ${selected.id} cargada exitosamente.`, "success");
  };

  const handleDeleteQuote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerConfirm({
      title: "Confirmar Eliminación",
      description: `¿Está seguro de que desea eliminar permanentemente la cotización ${id}? Esta acción no se puede deshacer.`,
      isDanger: true,
      confirmText: "Eliminar",
      onConfirm: async () => {
        try {
          if (dbSource === "firebase") {
            const db = getActiveFirebaseDb();
            if (db) {
              const docRef = doc(db, "cotizaciones", id);
              await deleteDoc(docRef);
            }
            showNotification(`Cotización ${id} eliminada de Firestore Cloud.`, "info");
            setHistoryList(prev => prev.filter(q => q.id !== id));
            let offlineHist = JSON.parse(localStorage.getItem("one_hist_checkpoint1") || "[]");
            offlineHist = offlineHist.filter((q: any) => q.id !== id);
            localStorage.setItem("one_hist_checkpoint1", JSON.stringify(offlineHist));
          } else if (dbSource === "offline" || dbSource === "gsheets") {
            setHistoryList(prev => prev.filter(q => q.id !== id));
            let offlineHist = JSON.parse(localStorage.getItem("one_hist_checkpoint1") || "[]");
            offlineHist = offlineHist.filter((q: any) => q.id !== id);
            localStorage.setItem("one_hist_checkpoint1", JSON.stringify(offlineHist));
            showNotification(`Cotización ${id} eliminada del almacenamiento local.`, "info");
          } else {
            const { getIdToken } = await import("./googleAuth");
            const token = await getIdToken();
            const headers: Record<string, string> = {};
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetch(`/api/cotizaciones/${id}`, {
              method: "DELETE",
              headers
            });
            if (res.ok) {
              showNotification(`Cotización ${id} eliminada de la base de datos.`, "info");
              setHistoryList(prev => prev.filter(q => q.id !== id));
              
              let offlineHist = JSON.parse(localStorage.getItem("one_hist_checkpoint1") || "[]");
              offlineHist = offlineHist.filter((q: any) => q.id !== id);
              localStorage.setItem("one_hist_checkpoint1", JSON.stringify(offlineHist));
            } else {
              showNotification("No se pudo eliminar de la base de datos local.", "error");
            }
          }
        } catch (err) {
          console.error(err);
          showNotification("Error de conexión al intentar eliminar la cotización.", "error");
        }
      }
    });
  };

  const handleLimpiarTodo = () => {
    triggerConfirm({
      title: "Confirmar Limpieza",
      description: "¿Está seguro de que desea restablecer todo? Se borrarán los datos ingresados actualmente en el editor para iniciar una nueva propuesta.",
      confirmText: "Restablecer",
      isDanger: true,
      onConfirm: () => {
        const resetCliente = { nombre: "", ruc: "", contacto: "", telefono: "" };
        const resetProyecto = "";
        const offlineHist = JSON.parse(localStorage.getItem("one_hist_checkpoint1") || "[]");
        const resetNumero = getNextSuggestedInvoiceNumber(cotizacionPrefix, offlineHist);
        const resetObs = "";
        const resetItems: CotizacionItem[] = [];

        setCliente(resetCliente);
        setProyecto(resetProyecto);
        setCotizacionNumero(resetNumero);
        setObservaciones(resetObs);
        setItems(resetItems);
        setIgvActivo(true);
        setPreviewMode(false);
        
        // Reset advanced customizations
        setMoneda("S/");
        setDiscountPercentage(0);
        setThemeColor("#2CB1C9");
        setBancoSoles("21579762413089");
        setCciSoles("00221517976241308924");
        setBancoDolares("4320300629");
        setCciDolares("00943220432030062969");
        setDetracciones("00101821358");
        setShowBankSettings(false);

        // Reset brand details
        setBrandName("ONE ESTUDIO GRÁFICO");
        setBrandSubtitle("ESTUDIO GRÁFICO");
        setEmisorNombre("OBED GUEVARA");
        setEmisorRuc("10417585350");
        setEmisorTelefono("+51 991 820 589");
        setEmisorEmail("obedjoel@gmail.com");
        setEmisorDireccion("Leoncio Prado V7, Paucarpata");
        setTaxRate(18);

        localStorage.removeItem("one_estudio_autosave_checkpoint1");
        showNotification("Editor restablecido.", "info");
      }
    });
  };

  // Nomenclatura oficial exigida: ONE COTIZACIÓN 2026-10-(ingresar el número de cotización)
  const getFullQuotationFilename = (prefix = cotizacionPrefix, numero = cotizacionNumero) => {
    let cleanNum = String(numero || "00001").trim();
    if (cleanNum.startsWith("2026-10-")) {
      cleanNum = cleanNum.replace("2026-10-", "");
    }
    cleanNum = cleanNum.replace(/^[ -]+/, "").trim() || "00001";
    return `ONE COTIZACIÓN 2026-10-${cleanNum}`;
  };

  // Descarga directa de archivo PDF con la nomenclatura requerida: ONE COTIZACIÓN 2026-10-XXXXX.pdf
  const handleDownloadDirectPDF = async (targetQuote?: Cotizacion | null): Promise<boolean> => {
    // Si se pasa una cotización del historial que no está en el lienzo activo, se carga primero
    if (targetQuote && targetQuote.id !== `${cotizacionPrefix}${cotizacionNumero}`) {
      handleCargarQuote(targetQuote);
      await new Promise(resolve => setTimeout(resolve, 350));
    }

    const activeItems = targetQuote ? (targetQuote.items || []) : items;
    const validItems = activeItems.filter(i => i.producto && i.producto.trim() !== "");
    if (!validItems.length) {
      showNotification("Debe tener al menos un ítem con descripción para poder generar la cotización.", "info");
      return false;
    }

    setLoading(true);
    setIsExporting(true); // Activa modo limpio de documento para renderizar solo lo final
    const qNum = targetQuote ? targetQuote.numero : cotizacionNumero;
    const qPrefix = targetQuote ? targetQuote.prefix : cotizacionPrefix;
    const pdfFilename = `${getFullQuotationFilename(qPrefix, qNum)}.pdf`;
    showNotification(`Generando "${pdfFilename}"...`, "info");

    const previousDocTitle = document.title;
    document.title = getFullQuotationFilename(qPrefix, qNum);

    try {
      // Esperar brevemente para que React aplique el modo limpio sin controles auxiliares
      await new Promise(resolve => setTimeout(resolve, 300));

      const docElement = document.getElementById("main-cotizador-sheet");
      if (!docElement) throw new Error("Elemento de cotización no encontrado");

      // Aplicar clase temporal para que los inputs se muestren limpios sin bordes durante la captura
      docElement.classList.add("pdf-capture-mode");
      await new Promise(resolve => setTimeout(resolve, 150));

      const canvas = await html2canvas(docElement, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
        windowWidth: 920,
        ignoreElements: (element) => {
          return element.classList.contains("no-print") || 
                 element.classList.contains("no-pdf") ||
                 element.classList.contains("clause-builder") ||
                 element.tagName === "BUTTON";
        }
      });

      docElement.classList.remove("pdf-capture-mode");

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pdfPageWidth = 210;
      const pdfPageHeight = 297;
      // EXACTAMENTE DE CANTO A CANTO (0 márgenes para que ocupe todo el ancho)
      const contentWidth = pdfPageWidth;
      const contentHeight = (canvas.height * contentWidth) / canvas.width;

      if (contentHeight <= pdfPageHeight) {
        pdf.addImage(imgData, "JPEG", 0, 0, contentWidth, contentHeight, undefined, "FAST");
      } else {
        let heightLeft = contentHeight;
        let position = 0;

        pdf.addImage(imgData, "JPEG", 0, position, contentWidth, contentHeight, undefined, "FAST");
        heightLeft -= pdfPageHeight;

        while (heightLeft > 0) {
          position = heightLeft - contentHeight;
          pdf.addPage();
          pdf.addImage(imgData, "JPEG", 0, position, contentWidth, contentHeight, undefined, "FAST");
          heightLeft -= pdfPageHeight;
        }
      }

      // Descarga directa por Blob para máxima compatibilidad con el navegador y entornos iframe
      try {
        const pdfBlob = pdf.output("blob");
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const downloadLink = document.createElement("a");
        downloadLink.href = pdfUrl;
        downloadLink.download = pdfFilename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        setTimeout(() => {
          document.body.removeChild(downloadLink);
          URL.revokeObjectURL(pdfUrl);
        }, 3000);
      } catch (blobErr) {
        console.warn("Fallback to pdf.save:", blobErr);
        pdf.save(pdfFilename);
      }

      showNotification(`¡Archivo "${pdfFilename}" descargado exitosamente!`, "success");
      return true;
    } catch (err) {
      console.error("Error al generar PDF:", err);
      showNotification("Abriendo vista para impresión de alta calidad...", "info");
      window.print();
      return false;
    } finally {
      document.title = previousDocTitle;
      const docElement = document.getElementById("main-cotizador-sheet");
      if (docElement) docElement.classList.remove("pdf-capture-mode");
      setIsExporting(false);
      setLoading(false);
    }
  };

  // Diálogo nativo de impresión / Guardar como PDF del navegador
  const handleExportPDF = async () => {
    const validItems = items.filter(i => i.producto.trim() !== "");
    if (!validItems.length) {
      showNotification("Debe tener al menos un ítem con descripción para poder generar la cotización.", "info");
      return;
    }

    setLoading(true);
    setIsExporting(true);
    const pdfFilename = getFullQuotationFilename();
    showNotification(`Preparando impresión de "${pdfFilename}.pdf"...`, "info");

    const previousDocTitle = document.title;
    document.title = pdfFilename;

    try {
      await new Promise(resolve => setTimeout(resolve, 350));
      window.print();
    } catch (err) {
      console.error(err);
      showNotification("Error al intentar abrir el diálogo de impresión.", "error");
    } finally {
      document.title = previousDocTitle;
      setIsExporting(false);
      setLoading(false);
    }
  };

  // Captura de imagen corporativa en PNG de alta resolución
  const handleCaptureScreenshot = async () => {
    const validItems = items.filter(i => i.producto.trim() !== "");
    if (!validItems.length) {
      showNotification("Debe tener al menos un ítem con descripción para poder capturar la cotización.", "info");
      return;
    }

    setLoading(true);
    setIsExporting(true);
    const imgFilename = `${getFullQuotationFilename()}.png`;
    showNotification(`Generando captura "${imgFilename}"...`, "info");

    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const docElement = document.getElementById("main-cotizador-sheet");
      if (docElement) {
        docElement.classList.add("pdf-capture-mode");
        const canvas = await html2canvas(docElement, {
          scale: 3,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          ignoreElements: (element) => {
            return element.classList.contains("no-print") || 
                   element.classList.contains("no-pdf") ||
                   element.classList.contains("clause-builder") ||
                   element.tagName === "BUTTON";
          }
        });
        docElement.classList.remove("pdf-capture-mode");
        
        const imgData = canvas.toDataURL("image/png", 1.0);
        const link = document.createElement("a");
        link.href = imgData;
        link.download = imgFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification(`¡Captura descargada correctamente como "${imgFilename}"!`, "success");
      } else {
        showNotification("No se encontró el contenedor de la cotización para capturar.", "error");
      }
    } catch (err) {
      console.error(err);
      showNotification("Error de procesamiento al capturar la imagen.", "error");
    } finally {
      const docElement = document.getElementById("main-cotizador-sheet");
      if (docElement) docElement.classList.remove("pdf-capture-mode");
      setIsExporting(false);
      setLoading(false);
    }
  };

  // 1. CIERRE DE VENTAS Y COMUNICACIÓN RÁPIDA: Generador dinámico de mensajes por etapas comerciales
  const generateSalesMessage = (
    templateType: "formal" | "aprobacion" | "vencimiento",
    targetQuote?: Cotizacion | null
  ) => {
    const qItems = targetQuote ? (targetQuote.items || []) : items;
    const validItems = qItems.filter(i => i.producto && i.producto.trim() !== "");
    const qNum = targetQuote ? targetQuote.numero : cotizacionNumero;
    const qPrefix = targetQuote ? targetQuote.prefix : cotizacionPrefix;
    const fullNomenclature = getFullQuotationFilename(qPrefix, qNum);
    const qCliente = targetQuote ? targetQuote.cliente : cliente;
    const qProyecto = targetQuote ? targetQuote.proyecto : proyecto;
    const qFecha = targetQuote ? targetQuote.fecha : fechaActual;
    const qTotal = targetQuote ? targetQuote.total : total;
    const qMoneda = targetQuote ? (targetQuote.moneda || "S/") : moneda;
    const qIgv = targetQuote ? targetQuote.igvActivo : igvActivo;
    const qObs = targetQuote ? (targetQuote.observaciones || "") : observaciones;

    const clientGreeting = qCliente.contacto?.trim() 
      ? `Estimado(a) *${qCliente.contacto.trim()}*` 
      : qCliente.nombre?.trim() 
        ? `Estimado(a) *${qCliente.nombre.trim()}*` 
        : `Estimado(a) Cliente`;

    const clientSimpleName = qCliente.contacto?.trim() || qCliente.nombre?.trim() || "Cliente";

    const itemsSummary = validItems.map((item, idx) => {
      const sub = (item.cantidad * item.valorUnitario).toFixed(2);
      return `  ${idx + 1}. *${item.producto.trim()}*\n     └ Cant: ${item.cantidad} ${item.unidad} | Unit: ${qMoneda} ${(item.valorUnitario || 0).toFixed(2)} | Subtotal: ${qMoneda} ${sub}`;
    }).join("\n");

    const bankDetails = [
      bancoSoles ? `• *BCP Soles:* ${bancoSoles} (CCI: ${cciSoles || '00221517976241308924'})` : "",
      bancoDolares ? `• *ScotiaBank Dólares:* ${bancoDolares}` : "",
      "• *Titular:* OBED GUEVARA (RUC: 10417585350)",
      "• *Yape / Plin:* +51 991 820 589"
    ].filter(Boolean).join("\n");

    if (templateType === "formal") {
      return `Hola ${clientGreeting} 👋
Te saluda Obed Guevara de *ONE estudio gráfico* (Estudio Gráfico & Publicitario).

📄 *COTIZACIÓN FORMAL:*
*${fullNomenclature}*
📅 *Fecha:* ${qFecha}
${qProyecto ? `💼 *Proyecto:* ${qProyecto}\n` : ""}
📝 *Detalle de Servicios:*
${itemsSummary || "  1. Servicios de diseño e impresión publicitaria."}

💰 *TOTAL:* *${qMoneda} ${qTotal.toFixed(2)}* ${qIgv ? "(Incluye IGV)" : "(No incluye IGV)"}

💳 *Cuentas Bancarias para Inicio / Adelanto:*
${bankDetails}
${qObs.trim() ? `\n📌 *Condiciones:* \n${qObs.trim()}\n` : ""}
📎 *Adjunto el documento formal en PDF:*
*${fullNomenclature}.pdf*

Quedo atento a tus comentarios o visto bueno para iniciar la producción de inmediato. ¡Muchas gracias por tu preferencia! ✨`;
    }

    if (templateType === "aprobacion") {
      return `¡Excelente ${clientSimpleName}! 🎉
Confirmamos con mucho gusto la recepción de tu visto bueno para la cotización:
📄 *${fullNomenclature}*
${qProyecto ? `💼 *Proyecto:* ${qProyecto}\n` : ""}💰 *Total Acordado:* *${qMoneda} ${qTotal.toFixed(2)}*

Para activar la orden de trabajo en taller de inmediato:
1️⃣ Realiza el abono del adelanto del 50% (*${qMoneda} ${(qTotal * 0.5).toFixed(2)}*)
${bankDetails}
2️⃣ Envíanos la captura o constancia del depósito por este medio.

¡Inmediatamente preparamos el arte final para tu confirmación! Muchas gracias por confiar en ONE estudio gráfico 🚀`;
    }

    if (templateType === "vencimiento") {
      return `Hola ${clientSimpleName} 👋
Te saluda Obed de *ONE estudio gráfico*.

Te escribimos para recordarte que la cotización *${fullNomenclature}* por *${qMoneda} ${qTotal.toFixed(2)}* está próxima a cumplir su periodo de validez.

Para mantenerte los precios de materiales y los tiempos de entrega pactados, confírmanos si aprobamos el trabajo hoy.

📎 Documento: *${fullNomenclature}.pdf*
¡Cualquier duda adicional estamos para servirte! ✨`;
    }

    return "";
  };

  // 1. CIERRE DE VENTAS: Apertura del Modal Interactivo de Comunicación Rápida
  const handleOpenSalesModal = (target?: Cotizacion) => {
    const q = target || null;
    setSalesTargetQuote(q);
    const targetPhone = q ? (q.cliente?.telefono || "") : (cliente.telefono || "");
    setSalesCustomPhone(targetPhone);
    const initialMsg = generateSalesMessage("formal", q);
    setSalesCustomMessage(initialMsg);
    setSalesTemplate("formal");
    setCurrentQuoteStatus(q?.status || "pendiente");
    setSalesModalOpen(true);
  };

  const handleSelectSalesTemplate = (tmpl: "formal" | "aprobacion" | "vencimiento") => {
    setSalesTemplate(tmpl);
    setSalesCustomMessage(generateSalesMessage(tmpl, salesTargetQuote));
  };

  // 1. CIERRE DE VENTAS: Envío formal a WhatsApp
  const handleExecuteSendWhatsApp = (targetQuote?: Cotizacion | null, customMsg?: string, customPhone?: string) => {
    const qCliente = targetQuote ? targetQuote.cliente : cliente;
    const qNum = targetQuote ? targetQuote.numero : cotizacionNumero;
    const qPrefix = targetQuote ? targetQuote.prefix : cotizacionPrefix;
    const fullNomenclature = getFullQuotationFilename(qPrefix, qNum);

    const messageToSend = customMsg || salesCustomMessage || generateSalesMessage("formal", targetQuote);

    const rawPhone = customPhone !== undefined ? customPhone : (qCliente.telefono || "");
    let cleanPhone = rawPhone.replace(/\D/g, "");
    if (cleanPhone.length === 9 && cleanPhone.startsWith("9")) {
      cleanPhone = "51" + cleanPhone; // Código de Perú
    }

    const encodedText = encodeURIComponent(messageToSend);
    const waUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodedText}` 
      : `https://wa.me/?text=${encodedText}`;

    window.open(waUrl, "_blank");
    navigator.clipboard?.writeText(messageToSend).catch(() => {});
    showNotification(`¡WhatsApp preparado para ${fullNomenclature}! Adjunta el archivo "${fullNomenclature}.pdf" en el chat.`, "success");
  };

  // 1. CIERRE DE VENTAS: Descargar PDF oficial y abrir WhatsApp en 1 Clic
  const handleDownloadAndOpenWhatsApp = async (targetQuote?: Cotizacion | null, customMsg?: string, customPhone?: string) => {
    const qNum = targetQuote ? targetQuote.numero : cotizacionNumero;
    const qPrefix = targetQuote ? targetQuote.prefix : cotizacionPrefix;
    const fullNomenclature = getFullQuotationFilename(qPrefix, qNum);
    const pdfFilename = `${fullNomenclature}.pdf`;

    // 1. Descargar el archivo PDF con la nomenclatura requerida
    const success = await handleDownloadDirectPDF(targetQuote);
    if (!success) {
      return;
    }

    // 2. Abrir WhatsApp y copiar texto
    setTimeout(() => {
      handleExecuteSendWhatsApp(targetQuote, customMsg, customPhone);
    }, 450);
  };

  // 1. CIERRE DE VENTAS: Envío por correo electrónico
  const handleSendEmail = (targetQuote?: Cotizacion | null, customMsg?: string) => {
    const qNum = targetQuote ? targetQuote.numero : cotizacionNumero;
    const qPrefix = targetQuote ? targetQuote.prefix : cotizacionPrefix;
    const fullNomenclature = getFullQuotationFilename(qPrefix, qNum);

    const subject = encodeURIComponent(`Cotización: ${fullNomenclature} - ONE estudio gráfico`);
    const body = encodeURIComponent(customMsg || salesCustomMessage || generateSalesMessage("formal", targetQuote));
    
    const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
    showNotification(`Abriendo correo para ${fullNomenclature}. Adjunte el PDF: ${fullNomenclature}.pdf`, "info");
  };

  // 1. CIERRE DE VENTAS: Actualizar estado de cotización en el pipeline
  const handleUpdateQuoteStatus = async (quoteId: string, newStatus: "pendiente" | "aprobada" | "rechazada") => {
    try {
      setCurrentQuoteStatus(newStatus);
      setHistoryList(prev => prev.map(q => q.id === quoteId ? { ...q, status: newStatus } : q));
      
      let offlineHist = JSON.parse(localStorage.getItem("one_hist_checkpoint1") || "[]");
      offlineHist = offlineHist.map((q: any) => q.id === quoteId ? { ...q, status: newStatus } : q);
      localStorage.setItem("one_hist_checkpoint1", JSON.stringify(offlineHist));

      const db = getActiveFirebaseDb();
      if (db) {
        const docRef = doc(db, "cotizaciones", quoteId);
        await setDoc(docRef, { status: newStatus }, { merge: true });
      }

      showNotification(`Estado de cotización actualizado a: ${newStatus.toUpperCase()}`, "success");
    } catch (err) {
      console.error("Error updating quote status:", err);
    }
  };

  // Envío tradicional directo por WhatsApp (fallback rápido)
  const handleShareWhatsApp = (targetQuote?: Cotizacion) => {
    handleOpenSalesModal(targetQuote);
  };

  // 1. CIERRE DE VENTAS: Duplicar / Clonar Cotización existente con nuevo correlativo
  const handleCloneQuote = (sourceQuote?: Cotizacion) => {
    const offlineHist = JSON.parse(localStorage.getItem("one_hist_checkpoint1") || "[]");
    const nextNum = getNextSuggestedInvoiceNumber(cotizacionPrefix, offlineHist);

    if (sourceQuote) {
      if (sourceQuote.cliente) setCliente({ ...sourceQuote.cliente });
      if (sourceQuote.proyecto) setProyecto(`${sourceQuote.proyecto} (Copia)`);
      if (sourceQuote.items) {
        const cloned = sourceQuote.items.map(item => ({
          ...item,
          id: Math.random().toString(36).substring(7)
        }));
        setItems(cloned);
      }
      if (sourceQuote.observaciones) setObservaciones(sourceQuote.observaciones);
      if (sourceQuote.igvActivo !== undefined) setIgvActivo(sourceQuote.igvActivo);
      if (sourceQuote.moneda) setMoneda(sourceQuote.moneda);
      if (sourceQuote.discountPercentage !== undefined) setDiscountPercentage(sourceQuote.discountPercentage);
      if (sourceQuote.themeColor) setThemeColor(sourceQuote.themeColor);
    } else {
      if (proyecto) setProyecto(`${proyecto} (Copia)`);
      const cloned = items.map(item => ({
        ...item,
        id: Math.random().toString(36).substring(7)
      }));
      setItems(cloned);
    }

    setCotizacionNumero(nextNum);
    setHistoryOpen(false);
    showNotification(`¡Cotización clonada con éxito! Nuevo correlativo asignado: N° ${nextNum}.`, "success");
  };

  // Edit / Add / Remove row managers
  const handleItemPropertyChange = (itemId: string, field: keyof CotizacionItem, val: any) => {
    const updated = items.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: val };
        // Autocomplete default units if matched
        if (field === "producto") {
          const match = PRODUCT_SUGGESTIONS.find(p => p.nombre === val);
          if (match) {
            updatedItem.unidad = match.unidad;
          }
        }
        return updatedItem;
      }
      return item;
    });
    updateItemsAndAutosave(updated);
  };

  // SUNAT-Style Modal Handlers for Items
  const handleOpenAddItemModal = (initialData?: Partial<CotizacionItem>) => {
    setEditingItemId(null);
    setModalItemData({
      producto: initialData?.producto || "",
      cantidad: initialData?.cantidad !== undefined ? initialData.cantidad : 1,
      unidad: initialData?.unidad || "Unidad",
      valorUnitario: initialData?.valorUnitario !== undefined ? initialData.valorUnitario : 0
    });
    setItemModalOpen(true);
  };

  const handleOpenEditItemModal = (item: CotizacionItem) => {
    setEditingItemId(item.id);
    setModalItemData({
      producto: item.producto || "",
      cantidad: item.cantidad !== undefined ? item.cantidad : 1,
      unidad: item.unidad || "Unidad",
      valorUnitario: item.valorUnitario !== undefined ? item.valorUnitario : 0
    });
    setItemModalOpen(true);
  };

  const handleSaveItemModal = () => {
    const desc = modalItemData.producto.trim();
    if (!desc) {
      showNotification("Por favor, ingrese la descripción del producto o servicio.", "info");
      return;
    }
    const cant = Number(modalItemData.cantidad) > 0 ? Number(modalItemData.cantidad) : 1;
    const precio = Number(modalItemData.valorUnitario) >= 0 ? Number(modalItemData.valorUnitario) : 0;
    const unid = modalItemData.unidad || "Unidad";

    if (editingItemId) {
      // Modifying existing item
      const updated = items.map(it => {
        if (it.id === editingItemId) {
          return {
            ...it,
            producto: desc,
            cantidad: cant,
            unidad: unid,
            valorUnitario: precio,
            confirmed: true
          };
        }
        return it;
      });
      updateItemsAndAutosave(updated);
      showNotification("Ítem actualizado correctamente.", "success");
    } else {
      // Adding new item
      const nextId = String(Date.now());
      const newItem: CotizacionItem = {
        id: nextId,
        producto: desc,
        cantidad: cant,
        unidad: unid,
        valorUnitario: precio,
        confirmed: true
      };
      const cleanCurrent = items.filter(it => it.producto && it.producto.trim() !== "");
      const updated = [...cleanCurrent, newItem];
      updateItemsAndAutosave(updated);
      showNotification("Ítem adicionado a la cotización.", "success");
    }
    setItemModalOpen(false);
  };

  const handleRemoveItem = (itemId: string) => {
    const updated = items.filter(i => i.id !== itemId);
    updateItemsAndAutosave(updated);
    showNotification("Ítem eliminado.", "info");
  };

  const handleDuplicateItem = (itemId: string) => {
    const index = items.findIndex(i => i.id === itemId);
    if (index > -1) {
      const itemToDup = items[index];
      const newItem: CotizacionItem = {
        ...itemToDup,
        id: String(Date.now() + Math.random()),
        confirmed: true
      };
      const updated = [...items];
      updated.splice(index + 1, 0, newItem);
      updateItemsAndAutosave(updated);
      showNotification("Ítem duplicado con éxito.", "success");
    }
  };

  const handleMoveItem = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === items.length - 1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const updated = [...items];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    updateItemsAndAutosave(updated);
  };

  const handleQuickAddChip = (chip: typeof POPULAR_CHIPS[0]) => {
    handleOpenAddItemModal({
      producto: chip.desc,
      unidad: chip.unit,
      valorUnitario: chip.price,
      cantidad: 1
    });
  };

  const handleSaveContacto = () => {
    if (!cliente.nombre.trim()) {
      showNotification("Ingrese una Empresa / Razón Social para poder guardarlo en el directorio.", "info");
      return;
    }
    const existsIndex = contactos.findIndex(c => c.nombre.toLowerCase().trim() === cliente.nombre.toLowerCase().trim());
    let updated;
    if (existsIndex > -1) {
      updated = [...contactos];
      updated[existsIndex] = cliente;
    } else {
      updated = [cliente, ...contactos];
    }
    setContactos(updated);
    localStorage.setItem("one_estudio_contactos", JSON.stringify(updated));

    // Also sync to cloud firestore if available
    try {
      const db = getActiveFirebaseDb();
      if (db) {
        const cleanDocId = cliente.nombre.toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 60) || `cli_${Date.now()}`;
        setDoc(doc(db, "directorio_clientes", cleanDocId), cliente, { merge: true }).catch(() => {});
      }
    } catch (_) {}

    showNotification(`Cliente "${cliente.nombre}" guardado con éxito en el directorio.`, "success");
  };

  const handleAddNewDirectorioCliente = (loadIntoQuote: boolean = false) => {
    if (!newDirectorioCliente.nombre.trim()) {
      showNotification("Ingrese la Empresa / Razón Social para guardarlo.", "error");
      return;
    }
    const existsIndex = contactos.findIndex(c => c.nombre.toLowerCase().trim() === newDirectorioCliente.nombre.toLowerCase().trim());
    let updated;
    if (existsIndex > -1) {
      updated = [...contactos];
      updated[existsIndex] = newDirectorioCliente;
    } else {
      updated = [newDirectorioCliente, ...contactos];
    }
    setContactos(updated);
    localStorage.setItem("one_estudio_contactos", JSON.stringify(updated));

    try {
      const db = getActiveFirebaseDb();
      if (db) {
        const cleanDocId = newDirectorioCliente.nombre.toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 60) || `cli_${Date.now()}`;
        setDoc(doc(db, "directorio_clientes", cleanDocId), newDirectorioCliente, { merge: true }).catch(() => {});
      }
    } catch (_) {}

    showNotification(`Cliente "${newDirectorioCliente.nombre}" guardado en el directorio.`, "success");

    if (loadIntoQuote) {
      setCliente(newDirectorioCliente);
      setDirectoryModalOpen(false);
      showNotification(`Cliente "${newDirectorioCliente.nombre}" cargado en la cotización.`, "success");
    }
    setNewDirectorioCliente({ nombre: "", ruc: "", contacto: "", telefono: "" });
    setNewDirectorioFormOpen(false);
  };

  const handleLoadSampleContactos = () => {
    const samples: ClientData[] = [
      {
        nombre: "INVERSIONES Y SERVICIOS GRAFICOS S.A.C.",
        ruc: "20601234567",
        contacto: "Lic. Carlos Mendoza",
        telefono: "+51 984 123 456"
      },
      {
        nombre: "CONSTRUCTORA & INMOBILIARIA DEL SUR",
        ruc: "20459871234",
        contacto: "Arq. Patricia Delgado",
        telefono: "+51 958 654 321"
      },
      {
        nombre: "RESTAURANTE Y EVENTOS MISTURA S.R.L.",
        ruc: "20123498765",
        contacto: "Renato Flores",
        telefono: "+51 997 789 123"
      }
    ];
    const merged = [...contactos];
    samples.forEach(s => {
      if (!merged.some(c => c.nombre.toLowerCase().trim() === s.nombre.toLowerCase().trim())) {
        merged.push(s);
      }
    });
    setContactos(merged);
    localStorage.setItem("one_estudio_contactos", JSON.stringify(merged));
    showNotification("Clientes de ejemplo añadidos al directorio.", "success");
  };

  const handleClearContactos = () => {
    triggerConfirm({
      title: "Vaciar Directorio de Clientes",
      description: "¿Está seguro de que desea borrar de forma permanente todos los clientes de su directorio local? Esta acción no se puede deshacer.",
      isDanger: true,
      confirmText: "Vaciar directorios",
      onConfirm: () => {
        setContactos([]);
        localStorage.removeItem("one_estudio_contactos");
        showNotification("Directorio de clientes vaciado.", "info");
      }
    });
  };

  const handleSelectContacto = (cont: ClientData) => {
    setCliente(cont);
    setDirectoryModalOpen(false);
    showNotification(`Cliente "${cont.nombre}" cargado exitosamente en la cotización.`, "success");
  };

  const handleDeleteSingleContacto = (contNombre: string) => {
    const filtered = contactos.filter(c => c.nombre !== contNombre);
    setContactos(filtered);
    localStorage.setItem("one_estudio_contactos", JSON.stringify(filtered));
    showNotification(`Cliente "${contNombre}" eliminado del directorio.`, "info");
  };

  const filteredContactos = contactos.filter(c => {
    if (!directorySearch.trim()) return true;
    const term = directorySearch.toLowerCase().trim();
    return (
      (c.nombre && c.nombre.toLowerCase().includes(term)) ||
      (c.ruc && c.ruc.toLowerCase().includes(term)) ||
      (c.contacto && c.contacto.toLowerCase().includes(term)) ||
      (c.telefono && c.telefono.toLowerCase().includes(term))
    );
  });

  // Re-organize layout numbering safely inside render views
  const confirmedOrNotEmptyItems = items.filter(item => 
    item.producto && item.producto.trim() !== ""
  );

  return (
    <div className="min-h-screen font-['Poppins'] flex flex-col bg-slate-100 text-[#0F1829] p-2 sm:p-5">
      
      {/* Dynamic Toast System */}
      {toast.message && (
        <div className={`no-print print:hidden fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl transition-all duration-300 transform translate-y-0 scale-100 max-w-md ${
          toast.type === "success" ? "bg-emerald-600 text-white" :
          toast.type === "error" ? "bg-rose-600 text-white" : "bg-[#040d16] text-[#2CB1C9] border border-[#2CB1C9]/30"
        }`}>
          {toast.type === "success" && <CheckCircle className="w-5 h-5 shrink-0" />}
          {toast.type === "error" && <AlertCircle className="w-5 h-5 shrink-0" />}
          <span className="text-xs font-semibold leading-normal">{toast.message}</span>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="no-print print:hidden fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-sm transition-all text-center">
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 max-w-xs border border-slate-100">
            <Loader2 className="w-12 h-12 text-[#2CB1C9] animate-spin" />
            <p className="text-xs font-black uppercase tracking-wider text-slate-800">Generando Cotización...</p>
          </div>
        </div>
      )}

      {/* Preview header reminder */}
      {previewMode && (
        <div className="no-print print:hidden bg-[#2CB1C9] text-white px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between sticky top-0 z-40 rounded-xl max-w-[900px] w-full mx-auto shadow-md mb-4 gap-3 animate-fade-in select-none">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 animate-pulse" />
            <span className="text-xs font-bold tracking-wider uppercase">VISTA PREVIA DEL DOCUMENTO</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleOpenSalesModal()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Abrir panel de Cierre de Ventas y WhatsApp"
            >
              <Rocket className="w-3.5 h-3.5 text-emerald-200" />
              <span>Cierre & WhatsApp</span>
            </button>
            <button
              onClick={() => handleDownloadDirectPDF()}
              className="bg-[#040D16] hover:bg-black text-[#2CB1C9] border border-[#2CB1C9]/50 text-xs font-bold px-3.5 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
              title={`Descargar archivo PDF: ${getFullQuotationFilename()}.pdf`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar PDF</span>
            </button>
            <button
              onClick={handleCaptureScreenshot}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              title="Descargar imagen PNG de alta resolución"
            >
              <Camera className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Captura PNG</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              title="Abrir diálogo de impresión del navegador"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button
              onClick={() => setPreviewMode(false)}
              className="bg-white hover:bg-slate-50 text-[#040d16] text-xs font-extrabold px-4 py-1.5 rounded-full transition-all cursor-pointer active:scale-95"
            >
              Regresar al Editor
            </button>
          </div>
        </div>
      )}

      {/* STYLE INJECTIONS FOR DYNAMIC BRANDING THEMES */}
      <style>{`
        .theme-bg { background-color: ${themeColor} !important; }
        .theme-text { color: ${themeColor} !important; }
        .theme-border { border-color: ${themeColor} !important; }
        .theme-border-b { border-bottom-color: ${themeColor} !important; }
        .theme-border-l { border-left-color: ${themeColor} !important; }
        .theme-outline:focus { outline-color: ${themeColor} !important; }
        .accent-checkbox { accent-color: ${themeColor} !important; }
        .theme-ring:focus { --tw-ring-color: ${themeColor} !important; }
      `}</style>

      {/* 
        ===========================================================
        COMPACT INTEGRATED EDITOR CONTROL RIBBON
        =========================================================== 
      */}
      {/* 
        ===========================================================
        COMPACT SYSTEM INTEGRATION PANEL (Option 3 Implementation)
        =========================================================== 
      */}
      {!previewMode && (
        <div className="no-print print:hidden max-w-[900px] w-full mx-auto bg-slate-900 text-white rounded-xl shadow-md p-4 mb-5 border border-slate-800 animate-fade-in text-xs select-none">
          <div className="flex flex-col gap-3.5">
            {/* Header with live cloud status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#2CB1C9] animate-pulse shrink-0" />
                <span className="font-extrabold uppercase tracking-wider text-slate-200 text-[11px]">
                  Base de Datos & Sincronización en la Nube
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-950/90 px-3 py-1 rounded-full border border-slate-800 text-[10.5px] font-mono">
                  <span className="text-slate-400">Canal:</span>
                  {dbSource === "firebase" ? (
                    <span className="text-cyan-400 flex items-center gap-1.5 font-bold">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                      </span>
                      <span>Nube Firestore (Multi-dispositivo)</span>
                    </span>
                  ) : dbSource === "server" ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-bold">
                      <Server className="w-3 h-3" /> API Servidor
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1 font-bold">
                      <WifiOff className="w-3 h-3" /> Solo Dispositivo (Local)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Persistence Mode Selectors & Global Action Tools */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Channel buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-400 text-[11px]">Modo de Guardado:</span>
                <div className="inline-flex bg-slate-950 p-1 rounded-lg border border-slate-850">
                  <button
                    type="button"
                    onClick={() => {
                      setDbSource("firebase");
                      localStorage.setItem("one_db_source", "firebase");
                      showNotification("Nube Firebase Firestore activa. Tus cotizaciones se sincronizan entre todos tus dispositivos.", "success");
                      fetchHistory();
                    }}
                    className={`px-3 py-1.5 rounded font-bold transition-all cursor-pointer flex items-center gap-1.5 text-[11px] ${
                      dbSource === "firebase"
                        ? "bg-cyan-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                    title="Almacena en Google Cloud Firestore. Accesible desde cualquier dispositivo (celular, laptop, tablet)"
                  >
                    <Cloud className="w-3.5 h-3.5" />
                    <span>Nube Firestore</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDbSource("offline");
                      localStorage.setItem("one_db_source", "offline");
                      showNotification("Modo Solo Dispositivo activo. Se guarda en la memoria de este navegador.", "info");
                    }}
                    className={`px-3 py-1.5 rounded font-bold transition-all cursor-pointer flex items-center gap-1.5 text-[11px] ${
                      dbSource === "offline"
                        ? "bg-amber-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                    title="Guarda únicamente en este navegador (sin conexión a la nube)"
                  >
                    <WifiOff className="w-3.5 h-3.5" />
                    <span>Solo Dispositivo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDbSource("server");
                      localStorage.setItem("one_db_source", "server");
                      showNotification("Servidor central API seleccionado.", "success");
                      fetchHistory();
                    }}
                    className={`px-3 py-1.5 rounded font-bold transition-all cursor-pointer flex items-center gap-1.5 text-[11px] ${
                      dbSource === "server"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                    title="Guarda a través de los servicios API del servidor"
                  >
                    <Server className="w-3.5 h-3.5" />
                    <span>Servidor API</span>
                  </button>
                </div>
              </div>

              {/* Multi-device sync & Backup tools */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSyncCloudAndLocal}
                  disabled={loading}
                  className="bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 px-2.5 py-1.5 rounded-lg transition-all font-bold cursor-pointer flex items-center gap-1.5 text-[11px] disabled:opacity-50"
                  title="Sincronizar y unificar cotizaciones entre el dispositivo y la nube"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Sincronizar Nube ↔ Local</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportBackupJson}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1.5 rounded-lg transition-all font-bold cursor-pointer flex items-center gap-1.5 text-[11px]"
                  title="Descargar copia de seguridad física de todas las cotizaciones y clientes en archivo JSON"
                >
                  <Download className="w-3.5 h-3.5 text-slate-300" />
                  <span>Respaldo JSON</span>
                </button>

                <label 
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1.5 rounded-lg transition-all font-bold cursor-pointer flex items-center gap-1.5 text-[11px]"
                  title="Restaurar o transferir cotizaciones desde un archivo de respaldo JSON"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-300" />
                  <span>Restaurar JSON</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackupJson}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 px-2.5 py-1.5 rounded-lg transition-all font-bold cursor-pointer flex items-center gap-1.5 text-[11px]"
                  title="Descargar reporte consolidado de cotizaciones en formato CSV compatible con Excel"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Excel (CSV)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowDbSettings(!showDbSettings)}
                  className="bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 p-1.5 rounded-lg border border-slate-800 transition-all cursor-pointer"
                  title="Ajustes técnicos de conexión"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Informative helper note */}
            <div className="bg-slate-950/50 border border-slate-850 rounded-lg p-2.5 flex items-start gap-2 text-[10.5px] leading-relaxed text-slate-350">
              <span className="text-cyan-400 font-bold shrink-0 mt-0.5">ℹ️</span>
              <p>
                {dbSource === "firebase" ? (
                  <>
                    <strong className="text-cyan-300 font-semibold">Nube Firestore Activa: </strong> 
                    Cada cotización que guardes se almacena en tiempo real en Google Cloud Firestore y en la memoria de este navegador. Puedes acceder a tu cotizador desde tu teléfono móvil, tablet u otra computadora y tus cotizaciones estarán disponibles.
                  </>
                ) : dbSource === "offline" ? (
                  <>
                    <strong className="text-amber-300 font-semibold">Modo Local: </strong> 
                    Las cotizaciones se conservan exclusivamente en la memoria de este navegador. Usa el botón <em className="text-slate-200">"Sincronizar Nube ↔ Local"</em> o <em className="text-slate-200">"Respaldo JSON"</em> para respaldar tus datos en la nube o en un archivo.
                  </>
                ) : (
                  <>
                    <strong className="text-emerald-300 font-semibold">Servidor Central: </strong> 
                    Las cotizaciones se procesan a través de los servicios del servidor web.
                  </>
                )}
              </p>
            </div>

            {/* Advanced connection panel (optional for advanced users) */}
            {showDbSettings && (
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 animate-fade-in mt-1 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[#2CB1C9] uppercase text-[10px] tracking-wider">
                    Configuración Avanzada de Firestore Cloud
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">
                    Proyecto: {defaultFirebaseConfig.projectId}
                  </span>
                </div>
                <p className="text-slate-450 leading-normal text-[10px]">
                  La aplicación viene preconfigurada para conectarse directamente a la nube Firestore sin requerir autenticación manual. Si deseas usar un proyecto personalizado propio, puedes ingresar el JSON aquí:
                </p>
                <textarea
                  value={firebaseConfigStr}
                  onChange={(e) => setFirebaseConfigStr(e.target.value)}
                  placeholder={`{\n  "apiKey": "${defaultFirebaseConfig.apiKey}",\n  "projectId": "${defaultFirebaseConfig.projectId}",\n  "authDomain": "${defaultFirebaseConfig.authDomain}"\n}`}
                  className="w-full h-20 bg-slate-900 border border-slate-800 rounded p-2 text-slate-200 font-mono text-[10px] focus:outline-none focus:border-[#2CB1C9]"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFirebaseConfigStr("");
                      localStorage.removeItem("one_firebase_config_keys");
                      firestoreInstanceDb = null;
                      firebaseInstanceApp = null;
                      showNotification("Restablecido a las credenciales predeterminadas de la nube.", "info");
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded font-semibold text-[10px] cursor-pointer"
                  >
                    Restablecer Predeterminadas
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(firebaseConfigStr);
                        if (!parsed.apiKey) {
                          showNotification("El JSON debe contener al menos el campo 'apiKey'.", "error");
                          return;
                        }
                        localStorage.setItem("one_firebase_config_keys", JSON.stringify(parsed));
                        firestoreInstanceDb = null;
                        firebaseInstanceApp = null;
                        
                        const testDb = getActiveFirebaseDb();
                        if (testDb) {
                          showNotification("¡Conexión inicializada con tu Firestore Cloud!", "success");
                          fetchHistory();
                        } else {
                          showNotification("Error de inicialización. Verifica los valores.", "error");
                        }
                      } catch (je) {
                        showNotification("Formato JSON inválido. Revisa las comillas y comas.", "error");
                      }
                    }}
                    className="bg-[#2CB1C9] hover:bg-[#2CB1C9]/80 text-slate-950 px-3 py-1 rounded font-black text-[10px] cursor-pointer uppercase transition-all"
                  >
                    Guardar Personalizada
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 
        ===========================================================
        THE REAL UNIFIED INVOICE CANVAS (Matches user's single HTML)
        =========================================================== 
      */}
      <div 
        id="main-cotizador-sheet" 
        className="max-w-[900px] w-full mx-auto bg-white rounded-lg overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all flex flex-col border border-slate-200"
      >
        
        {/* ENCABEZADO CON LOGO (Estilo limpio blanco con línea divisoria cyan de canto a canto) */}
        <div className="print-fixed-header w-full">
          <div className="bg-white text-slate-800 p-6 sm:px-8 sm:py-5 print:px-8 print:py-4 flex flex-col sm:flex-row print:flex-row items-start sm:items-center print:items-center justify-between border-b-[3px] border-solid border-[#2CB1C9]">
            <div className="flex flex-col mb-4 sm:mb-0 print:mb-0">
              <img src={logoOne} alt="ONE estudio gráfico Logo" className="h-16 print:h-14 w-auto max-w-[240px] object-contain" />
            </div>

            <div className="text-left sm:text-right print:text-right text-xs space-y-0.5 text-slate-600">
              <h2 className="text-sm font-extrabold text-[#2CB1C9] tracking-wider uppercase mb-1">OBED GUEVARA</h2>
              <p className="font-semibold text-slate-700">RUC: 10417585350</p>
              <p className="flex items-center sm:justify-end gap-1.5"><i className='bx bxl-whatsapp text-sm text-[#2CB1C9]' /> +51 991 820 589</p>
              <p className="flex items-center sm:justify-end gap-1.5"><i className='bx bx-envelope text-sm text-[#2CB1C9]' /> obedjoel@gmail.com</p>
              <p className="flex items-center sm:justify-end gap-1.5"><i className='bx bx-map text-sm text-[#2CB1C9]' /> Leoncio Prado V7, Paucarpata</p>
            </div>
          </div>
        </div>

        <div className="print-body-content flex-1 max-w-[900px] w-full mx-auto">
          {/* SECCIÓN FECHA Y NÚMERO (Fondo blanco con línea cyan de canto a canto) */}
          <div className="flex flex-col sm:flex-row print:flex-row items-start sm:items-center print:items-center justify-between px-6 sm:px-8 print:px-8 py-3 bg-white border-b-[2px] border-solid border-[#2CB1C9] gap-2">
            <div>
              <p className="text-xs text-slate-800 font-bold select-none">
                <strong>Fecha de Emisión:</strong> {fechaActual || "Cargando..."}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-800 font-bold">
              <span>N° COTIZACIÓN:</span>
              <span className="font-extrabold text-[#2CB1C9] select-none">{cotizacionPrefix}</span>
              <input 
                type="text" 
                value={cotizacionNumero}
                onChange={(e) => {
                  setCotizacionNumero(e.target.value);
                }}
                className="w-20 text-xs text-[#2CB1C9] font-extrabold font-sans placeholder-slate-400 border-b border-dashed border-[#2CB1C9] focus:outline-none focus:border-solid bg-transparent px-1 py-0 text-center hover:bg-slate-100 rounded transition-colors print:border-none print:bg-transparent"
                title="Haz clic para modificar el número correlativo de la cotización"
                placeholder="00001"
              />
            </div>
          </div>

          {/* MAIN BODY OF THE DOCUMENT */}
          <div className="p-6 sm:p-8 print:px-8 print:py-5 space-y-6 print:space-y-4">

          {/* DATOS CLIENTE */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-l-4 theme-border-l pl-3.5 select-none">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <span>INFORMACIÓN DEL CLIENTE</span>
              </h2>
              {!isDocumentClean && (
                <div className="flex flex-wrap items-center gap-1.5 no-print no-pdf">
                  <button 
                    type="button"
                    onClick={handleSaveContacto}
                    className="text-[10px] font-black uppercase bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md transition-all cursor-pointer shadow-sm flex items-center gap-1.5 active:scale-95"
                    title="Almacenar este contacto en el directorio de clientes para usarlo en futuras cotizaciones"
                  >
                    <span>💾 GUARDAR EN DIRECTORIO</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setDirectorySearch("");
                      setNewDirectorioFormOpen(false);
                      setDirectoryModalOpen(true);
                    }}
                    className="text-[10px] font-black uppercase bg-[#040D16] hover:bg-slate-850 text-[#2CB1C9] border-2 border-[#2CB1C9] px-3 py-1.5 rounded-md transition-all cursor-pointer shadow-sm flex items-center gap-1.5 active:scale-95 ring-1 ring-[#2CB1C9]/30"
                    title="Abrir directorio para elegir un cliente y cargar sus datos en 1 clic"
                  >
                    <Users className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>MOSTRAR DIRECTORIO</span>
                    <span className="bg-[#2CB1C9] text-[#040D16] text-[9.5px] font-black px-1.5 py-0.2 rounded-full leading-tight">
                      {contactos.length}
                    </span>
                  </button>
                  {contactos.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearContactos}
                      className="text-[10px] font-extrabold uppercase bg-rose-50 hover:bg-rose-100 text-rose-700 px-2 py-1.5 rounded-md transition-all cursor-pointer"
                      title="Borrar directorio guardado localmente"
                    >
                      🗑️ Vaciar
                    </button>
                  )}
                </div>
              )}
            </div>

            {!isDocumentClean && (
              <div className="no-print no-pdf flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs animate-fade-in select-none">
                <div className="flex items-center gap-2 flex-1 min-w-[260px]">
                  <Users className="w-4 h-4 text-[#2CB1C9] shrink-0" />
                  <span className="font-extrabold text-[10px] uppercase tracking-wider text-slate-700 whitespace-nowrap">
                    Elegir del Directorio:
                  </span>
                  {contactos.length > 0 ? (
                    <select
                      className="bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-[#2CB1C9] max-w-sm cursor-pointer shadow-xs transition-colors"
                      value=""
                      onChange={(e) => {
                        const selected = contactos.find(c => c.nombre === e.target.value);
                        if (selected) handleSelectContacto(selected);
                      }}
                    >
                      <option value="">-- Cargar cliente guardado ({contactos.length} disponibles) --</option>
                      {contactos.map((cont, cIdx) => (
                        <option key={cIdx} value={cont.nombre}>
                          🏢 {cont.nombre} {cont.ruc ? `[RUC: ${cont.ruc}]` : ""} {cont.contacto ? `(${cont.contacto})` : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">
                      Directorio vacío. Escribe los datos abajo y pulsa "GUARDAR EN DIRECTORIO".
                    </span>
                  )}
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    setDirectorySearch("");
                    setNewDirectorioFormOpen(false);
                    setDirectoryModalOpen(true);
                  }}
                  className="text-[10.5px] font-black text-[#2CB1C9] hover:underline flex items-center gap-1 cursor-pointer uppercase tracking-wider"
                >
                  <span>Abrir catálogo de clientes</span>
                  <span>↗</span>
                </button>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-4 print:gap-6">
              
              {/* Column 1 info inputs */}
              <div className="space-y-3 text-xs">
                <div>
                  {isDocumentClean ? (
                    <div className="py-2.5 px-1 border-b border-transparent text-[#0F1829]">
                      <p className="text-[10px] text-slate-400 font-bold uppercase select-none">Empresa / Razón Social</p>
                      <p className="font-semibold text-slate-800 select-all">{cliente.nombre || "-(Sin especificar)-"}</p>
                    </div>
                  ) : (
                    <input 
                      type="text" 
                      placeholder="Empresa / Razón Social" 
                      value={cliente.nombre}
                      onChange={(e) => {
                        const newCli = { ...cliente, nombre: e.target.value };
                        setCliente(newCli);
                      }}
                      className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded focus:border-slate-550 focus:outline-none transition-all placeholder:text-slate-400 font-medium font-sans theme-outline"
                    />
                  )}
                </div>

                <div>
                  {isDocumentClean ? (
                    <div className="py-2.5 print:py-0 px-1 border-b border-transparent text-[#0F1829]">
                      <p className="text-[10px] text-slate-400 font-bold uppercase select-none">RUC / DNI</p>
                      <p className="font-semibold text-slate-800 font-mono select-all">{cliente.ruc || "-(Sin especificar)-"}</p>
                    </div>
                  ) : (
                    <input 
                      type="text" 
                      placeholder="RUC / DNI" 
                      value={cliente.ruc}
                      onChange={(e) => {
                        const newCli = { ...cliente, ruc: e.target.value };
                        setCliente(newCli);
                      }}
                      className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded focus:border-slate-550 focus:outline-none transition-all placeholder:text-slate-400 font-medium theme-outline"
                    />
                  )}
                </div>
              </div>

              {/* Column 2 info inputs */}
              <div className="space-y-3 text-xs print:space-y-1">
                <div>
                  {isDocumentClean ? (
                    <div className="py-2.5 print:py-0 px-1 border-b border-transparent text-[#0F1829]">
                      <p className="text-[10px] text-slate-400 font-bold uppercase select-none">Nombre de Contacto</p>
                      <p className="font-semibold text-slate-800 select-all">{cliente.contacto || "-(Sin especificar)-"}</p>
                    </div>
                  ) : (
                    <input 
                      type="text" 
                      placeholder="Nombre de Contacto" 
                      value={cliente.contacto}
                      onChange={(e) => {
                        const newCli = { ...cliente, contacto: e.target.value };
                        setCliente(newCli);
                      }}
                      className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded focus:border-slate-550 focus:outline-none transition-all placeholder:text-slate-400 font-medium theme-outline"
                    />
                  )}
                </div>

                <div>
                  {isDocumentClean ? (
                    <div className="py-2.5 print:py-0 px-1 border-b border-transparent text-[#0F1829]">
                      <p className="text-[10px] text-slate-400 font-bold uppercase select-none">Teléfono / Celular</p>
                      <p className="font-semibold text-slate-800 select-all">{cliente.telefono || "-(Sin especificar)-"}</p>
                    </div>
                  ) : (
                    <input 
                      type="text" 
                      placeholder="Teléfono / Celular" 
                      value={cliente.telefono}
                      onChange={(e) => {
                        const newCli = { ...cliente, telefono: e.target.value };
                        setCliente(newCli);
                      }}
                      className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded focus:border-slate-550 focus:outline-none transition-all placeholder:text-slate-400 font-medium theme-outline"
                    />
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* PROYECTO */}
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-l-4 theme-border-l pl-3.5 select-none animate-fade-in">
              PROYECTO:
            </h2>
            <div>
              {isDocumentClean ? (
                <p className="text-sm font-extrabold theme-text bg-slate-50 py-3 print:py-1 px-4 print:px-2 rounded-lg select-all inline-block uppercase leading-snug">
                  {proyecto || "-(Sujeto a Proyecto o Campaña Publicitaria)-"}
                </p>
              ) : (
                <input 
                  type="text" 
                  placeholder="Nombre del proyecto o campaña publicitaria" 
                  value={proyecto}
                  onChange={(e) => {
                    setProyecto(e.target.value);
                  }}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded focus:border-slate-500 focus:outline-none transition-all placeholder:text-slate-400 font-medium uppercase font-sans tracking-wide theme-outline"
                />
              )}
            </div>
          </div>

          {/* DETALLE DE SERVICIOS */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 select-none">
              <div className="flex items-center gap-2.5">
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-l-4 theme-border-l pl-3.5 leading-none">
                  DETALLE DE SERVICIOS
                </h2>
                {!isDocumentClean && (
                  <button
                    type="button"
                    onClick={() => handleOpenAddItemModal()}
                    className="no-print no-pdf bg-[#2CB1C9] hover:bg-[#259eb4] text-slate-950 font-black text-[11px] px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 uppercase tracking-wide"
                    title="Agregar nuevo ítem / producto"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Agregar</span>
                  </button>
                )}
              </div>
              {!isDocumentClean && (
                <div className="no-print no-pdf flex flex-wrap items-center gap-1 bg-slate-50 p-1 rounded-md border border-slate-200/50">
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase mr-1 px-1">Rápidos:</span>
                  {POPULAR_CHIPS.map((chip) => (
                    <button
                      key={chip.label}
                      onClick={() => handleQuickAddChip(chip)}
                      className="text-[10px] font-extrabold bg-white hover:bg-slate-100 text-slate-600 px-2 py-0.5 rounded transition-all cursor-pointer border border-slate-250 active:scale-95 shadow-sm hover:text-slate-900"
                      title={`Agregar: ${chip.desc}`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* If empty in editor mode */}
            {confirmedOrNotEmptyItems.length === 0 ? (
              <div className="border border-dashed border-slate-300 rounded-xl bg-slate-50/60 p-8 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-xl bg-[#2CB1C9]/15 text-[#2CB1C9] flex items-center justify-center border border-[#2CB1C9]/30">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    No hay productos o servicios agregados
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-0.5 font-sans">
                    Haz clic en <strong>"Agregar"</strong> para registrar el producto o servicio en la ventana emergente con amplio espacio de lectura y edición.
                  </p>
                </div>
                {!isDocumentClean && (
                  <button
                    type="button"
                    onClick={() => handleOpenAddItemModal()}
                    className="no-print no-pdf bg-[#2CB1C9] hover:bg-[#259eb4] text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer inline-flex items-center gap-2 shadow-sm active:scale-95 uppercase tracking-wider"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>+ Agregar Ítem</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 select-none">
                      <th className="p-3 print:p-1.5 font-semibold text-slate-500 w-[5%] text-center font-sans text-[10px] uppercase">Ítem</th>
                      <th className="p-3 print:p-1.5 font-semibold text-slate-500 w-[48%] font-sans text-[10px] uppercase">Descripción</th>
                      <th className="p-3 print:p-1.5 font-semibold text-slate-500 w-[8%] text-center font-sans text-[10px] uppercase">Cant.</th>
                      <th className="p-3 print:p-1.5 font-semibold text-slate-500 w-[12%] font-sans text-[10px] uppercase">Unidad</th>
                      <th className="p-3 print:p-1.5 font-semibold text-slate-500 w-[13%] text-right font-sans text-[10px] uppercase">P. Unit.</th>
                      <th className="p-3 print:p-1.5 font-semibold text-slate-500 w-[14%] text-right font-sans text-[10px] uppercase">Subtotal</th>
                      {!isDocumentClean && <th className="p-3 w-[12%] no-print no-pdf text-right pr-4 font-sans text-[10px] uppercase text-slate-400">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {confirmedOrNotEmptyItems.map((item, idx) => {
                      const rowNumber = idx + 1;
                      const isEven = rowNumber % 2 === 0;
                      
                      return (
                        <tr 
                          key={item.id}
                          className={`${isEven ? "bg-slate-50/20" : "bg-white"} transition-all group hover:bg-cyan-50/20`}
                        >
                          {/* Number */}
                          <td className="p-3 print:p-1.5 text-center text-slate-400 font-mono font-medium">{rowNumber}</td>
   
                          {/* Product / service description */}
                          <td className="p-3 print:p-1.5">
                            <div className="text-slate-850 py-1 select-all font-medium whitespace-pre-line leading-relaxed text-[11.5px]">
                              {item.producto}
                            </div>
                          </td>
   
                          {/* Quantity */}
                          <td className="p-3 print:p-1.5 text-center">
                            <span className="font-semibold font-sans text-[11.5px]">{item.cantidad}</span>
                          </td>
   
                          {/* Unit */}
                          <td className="p-3 print:p-1.5">
                            <span className="font-semibold text-slate-500 text-[11px]">{item.unidad}</span>
                          </td>
   
                          {/* Unit Price */}
                          <td className="p-3 print:p-1.5 text-right">
                            <span className="font-semibold font-sans text-[11.5px]">{moneda} {(item.valorUnitario || 0).toFixed(2)}</span>
                          </td>
   
                          {/* Subtotal */}
                          <td className="p-3 print:p-1.5 text-right font-sans font-bold text-slate-850 text-[11.5px]">
                            {moneda} {((item.cantidad || 0) * (item.valorUnitario || 0)).toFixed(2)}
                          </td>
   
                          {/* Action controls */}
                          {!isDocumentClean && (
                            <td className="no-print no-pdf p-1 px-3 text-right select-none">
                              <div className="flex items-center gap-1 justify-end">
                                
                                {/* Edit Item (Opens POP-UP modal to read & modify) */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditItemModal(item)}
                                  className="p-1 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-md transition-all cursor-pointer flex items-center gap-1 font-bold text-[10.5px] border border-amber-200"
                                  title="Editar descripción y valores en ventana emergente"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  <span>Editar</span>
                                </button>

                                {/* Copy Item */}
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateItem(item.id)}
                                  className="p-1 text-slate-400 hover:text-cyan-600 hover:bg-slate-100 rounded cursor-pointer"
                                  title="Duplicar servicio"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                
                                {/* Move Row Up/Down */}
                                <button
                                  type="button"
                                  onClick={() => handleMoveItem(idx, "up")}
                                  disabled={idx === 0}
                                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded disabled:opacity-20 cursor-pointer"
                                  title="Mover hacia arriba"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => handleMoveItem(idx, "down")}
                                  disabled={idx === confirmedOrNotEmptyItems.length - 1}
                                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded disabled:opacity-20 cursor-pointer"
                                  title="Mover hacia abajo"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                
                                {/* Remove Item */}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>

                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bottom Add button */}
            {!isDocumentClean && confirmedOrNotEmptyItems.length > 0 && (
              <div className="no-print no-pdf flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleOpenAddItemModal()}
                  className="bg-[#2CB1C9] hover:bg-[#259eb4] text-slate-950 font-black text-xs px-3.5 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 uppercase tracking-wide"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ Agregar Ítem</span>
                </button>
                <span className="text-[11px] text-slate-500 font-sans">
                  Total de ítems: <strong className="text-slate-800">{confirmedOrNotEmptyItems.length}</strong>
                </span>
              </div>
            )}
          </div>

          {/* CONDITIONS AND TOTALS SPLIT BLOCK */}
          <div className="grid grid-cols-1 md:grid-cols-10 print:grid-cols-10 gap-6 print:gap-8 pt-4 border-t border-slate-100">
            
            {/* Direct observations conditions text zone */}
            <div className="md:col-span-6 print:col-span-6 space-y-2.5">
              <div className="flex items-center justify-between border-l-4 theme-border-l pl-3.5 select-none">
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  CONDICIONES
                </h2>
                {!isDocumentClean && observaciones.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setObservaciones("");
                      showNotification("Cajón de condiciones vaciado.", "info");
                    }}
                    className="no-print no-pdf text-[10px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-0.5 rounded font-bold transition-all cursor-pointer flex items-center gap-1 border border-rose-200"
                    title="Vaciar cajón de texto de condiciones"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Vaciar Texto</span>
                  </button>
                )}
              </div>

              {isDocumentClean ? (
                <div className="text-[10px] text-slate-700 font-medium leading-relaxed bg-slate-50/50 p-3.5 print:p-2 rounded border border-slate-200/50 whitespace-pre-line select-text">
                  {observaciones.trim() || "-(Sin condiciones particulares especificadas)-"}
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea 
                    rows={4} 
                    placeholder="Escribe aquí las condiciones particulares o selecciona cláusulas de abajo..."
                    value={observaciones}
                    onChange={(e) => {
                      setObservaciones(e.target.value);
                    }}
                    className="w-full text-xs p-3 bg-white border border-slate-300 rounded focus:border-slate-550 focus:outline-none transition-all placeholder:text-slate-400 leading-relaxed font-sans font-medium"
                  />
                  
                  {/* Cláusulas por Categoría */}
                  <div className="clause-builder no-print no-pdf bg-slate-50 border border-slate-200/80 p-2.5 rounded-lg text-[10px] select-none space-y-2 shadow-2xs">
                    {/* Categorías agrupadas */}
                    {[
                      { key: "pago", title: "Forma de Pago" },
                      { key: "entrega", title: "Tiempo Entrega" },
                      { key: "validez", title: "Validez Oferta" },
                      { key: "aprobacion", title: "Visto Bueno" },
                      { key: "ajustes", title: "Ajustes / Cambios" },
                      { key: "envio", title: "Entrega / Envío" }
                    ].map(catGroup => {
                      const clausulasDeCat = CONDICIONES_CLAUSULAS.filter(c => c.categoria === catGroup.key);
                      if (!clausulasDeCat.length) return null;

                      return (
                        <div key={catGroup.key} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <span className="text-[9px] font-bold text-slate-400 min-w-[95px] shrink-0 uppercase tracking-tight">
                            {catGroup.title}:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {clausulasDeCat.map((cl) => {
                              const isPresent = observaciones.includes(cl.text.trim());
                              return (
                                <button
                                  key={cl.label}
                                  type="button"
                                  onClick={() => handleApplyConditionClause(cl.categoria, cl.text)}
                                  className={`px-2 py-0.5 rounded text-[9.5px] font-semibold transition-all cursor-pointer border flex items-center gap-1 ${
                                    isPresent
                                      ? "bg-[#2CB1C9] text-white border-[#2CB1C9] shadow-xs font-bold"
                                      : "bg-white text-slate-700 hover:bg-slate-100 border-slate-250 hover:border-slate-350"
                                  }`}
                                  title={isPresent ? "Haz clic para quitar esta cláusula" : `Haz clic para seleccionar (${catGroup.title})`}
                                >
                                  {isPresent && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                  <span>{cl.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Totals table calculations */}
            <div className="md:col-span-4 print:col-span-4 flex flex-col justify-start">
              <div className="border border-slate-200 rounded overflow-hidden select-none">
                
                {/* Subtotal */}
                <div className="flex items-center justify-between p-2.5 print:p-1.5 bg-slate-50/50 border-b border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Subtotal</span>
                  <span className="text-xs font-bold text-slate-700 font-sans">{moneda} {subtotal.toFixed(2)}</span>
                </div>

                {/* Promotional Discount line */}
                {discountPercentage > 0 && (
                  <div className="flex items-center justify-between p-2.5 print:p-1.5 bg-rose-50/40 border-b border-rose-100 text-rose-700 font-medium transition-all duration-300 animate-fade-in">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Descuento ({discountPercentage}%)</span>
                    <span className="text-xs font-bold font-sans">-{moneda} {discountAmount.toFixed(2)}</span>
                  </div>
                )}

                {/* Tax level toggling */}
                <div className="flex items-center justify-between p-2.5 border-b border-slate-200 bg-white">
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 label-chk">
                      <span>IGV ({taxRate}%)</span>
                      {!isDocumentClean && (
                        <input 
                          type="checkbox" 
                          checked={igvActivo}
                          onChange={(e) => {
                            setIgvActivo(e.target.checked);
                          }}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-slate-700 accent-checkbox cursor-pointer no-print no-pdf"
                        />
                      )}
                    </span>
                    {!isDocumentClean && igvActivo && (
                      <div className="no-print no-pdf flex items-center gap-1 mt-1 text-[10px] text-slate-500">
                        <span>Tasa:</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={taxRate}
                          onChange={(e) => setTaxRate(Number(e.target.value))}
                          className="w-10 bg-transparent border-b border-dashed border-slate-300 text-center focus:outline-none focus:border-[#2CB1C9] font-sans text-[10px] p-0 font-bold"
                          title="Editar tasa impositiva (%)"
                        />
                        <span>%</span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-700 font-sans">
                    {igvActivo ? `${moneda} ${igv.toFixed(2)}` : `${moneda} 0.00`}
                  </span>
                </div>

                {/* Big summary line total */}
                <div className="flex items-center justify-between p-3.5 print:p-2 bg-slate-50 border-t-[3px] border-solid theme-border text-[#040D16]">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-[#040D16] font-sans">Total Final</span>
                  <span className="text-sm font-black font-sans theme-text">{moneda} {total.toFixed(2)}</span>
                </div>

              </div>
            </div>

          </div>
        </div>
        </div>

        {/* PIE DE PÁGINA (Estilo limpio blanco con línea superior cyan de canto a canto) */}
        <div className="print-fixed-footer w-full">
          <div className="bg-white text-slate-700 p-6 sm:px-8 sm:py-5 print:px-8 print:py-4 flex flex-col sm:flex-row print:flex-row items-start sm:items-center print:items-center justify-between border-t-[3px] border-solid border-[#2CB1C9] gap-4 select-none">
            <div className="text-left sm:text-left print:text-left text-[10.5px] space-y-1 text-slate-600 font-medium">
              {bancoSoles && <p><strong>BCP Soles:</strong> {bancoSoles} {cciSoles && <>| <strong>CCI:</strong> {cciSoles}</>}</p>}
              {bancoDolares && <p><strong>ScotiaBank Dólares:</strong> {bancoDolares} {cciDolares && <>| <strong>CCI:</strong> {cciDolares}</>}</p>}
              {detracciones && <p><strong>Detracciones BN:</strong> {detracciones}</p>}
            </div>
            <div className="text-left sm:text-right print:text-right text-[10.5px] leading-tight text-slate-600 shrink-0">
              <p className="font-extrabold text-slate-900 uppercase text-xs leading-none mb-1">OBED GUEVARA</p>
              <p className="flex items-center sm:justify-end gap-1 text-[#2CB1C9] font-bold"><i className='bx bxl-instagram text-xs' /> @one.estudiografico</p>
              <p className="flex items-center sm:justify-end gap-1 text-slate-600 mt-0.5"><i className='bx bxl-whatsapp text-xs text-emerald-500' /> +51 991 820 589</p>
            </div>
          </div>
        </div>

      </div>

      {/* 
        ===========================================================
        THE BOTONERA (Bottom actions bar matching their original UI)
        =========================================================== 
      */}
      {!previewMode && (
        <div className="no-print print:hidden max-w-[900px] w-full mx-auto mt-6 flex flex-wrap items-center justify-end gap-2.5 px-1 pb-10">
          
          <button 
            type="button"
            onClick={handleLimpiarTodo}
            className="py-2.5 px-3.5 bg-slate-400 hover:bg-slate-500 text-white font-extrabold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-slate-900/10 uppercase"
            title="Restablecer cotizador para una nueva propuesta"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpiar</span>
          </button>

          <button 
            type="button"
            onClick={() => handleCloneQuote()}
            className="py-2.5 px-3.5 bg-slate-600 hover:bg-slate-700 text-white font-extrabold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-slate-600/10 uppercase"
            title="Duplicar / clonar esta cotización con un nuevo número correlativo"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Clonar</span>
          </button>

          <button 
            type="button"
            onClick={handleSaveToDatabase}
            className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-700/10 uppercase"
            title="Guardar cotización en la nube Firestore y localmente"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Guardar DB</span>
          </button>

          <button 
            type="button"
            onClick={() => {
              setHistoryOpen(true);
              fetchHistory();
            }}
            className="py-2.5 px-3.5 bg-slate-700 hover:bg-slate-800 text-white font-extrabold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-slate-700/10 uppercase"
            title="Consultar historial de cotizaciones guardadas"
          >
            <History className="w-3.5 h-3.5" />
            <span>Historial</span>
          </button>

          <button 
            type="button"
            onClick={() => setPreviewMode(true)}
            className="py-2.5 px-4 bg-[#2CB1C9] hover:bg-[#2CB1C9]/85 text-white font-extrabold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-cyan-600/10 uppercase"
            title="Vista previa del documento final"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Vista Previa</span>
          </button>

          <button 
            type="button"
            onClick={() => handleOpenSalesModal()}
            className="py-2.5 px-4.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-lg text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md uppercase active:scale-95"
            title="Abrir panel de Cierre de Ventas y Comunicación Rápida por WhatsApp"
          >
            <Rocket className="w-4 h-4 fill-white/20 text-emerald-200" />
            <span>Cierre & WhatsApp</span>
          </button>

          <button 
            type="button"
            onClick={() => handleDownloadDirectPDF()}
            className="py-2.5 px-4 bg-[#040D16] hover:bg-black text-[#2CB1C9] border border-[#2CB1C9] font-black rounded-lg text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md uppercase active:scale-95"
            title={`Descargar archivo PDF: ${getFullQuotationFilename()}.pdf`}
          >
            <Download className="w-4 h-4" />
            <span>Descargar PDF</span>
          </button>

        </div>
      )}

      {/* HISTORIAL MODAL (Matches user's dialog design but styled clean) */}
      {historyOpen && (
        <div className="no-print print:hidden fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px] p-4 transition-all animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden max-h-[80vh] border border-slate-200">
            
            {/* Modal header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-[#040D16] text-white">
              <div className="flex items-center gap-2 select-none">
                <History className="w-4.5 h-4.5 text-[#2CB1C9]" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider">Historial de Cotizaciones</h3>
              </div>
              <button 
                onClick={() => setHistoryOpen(false)}
                className="text-slate-400 hover:text-white transition-all cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal List Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 min-h-[250px]">
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                  <RefreshCw className="w-8 h-8 text-[#2CB1C9] animate-spin" />
                  <span className="text-xs font-bold uppercase tracking-wider">Cargando base de datos...</span>
                </div>
              ) : historyList.length === 0 ? (
                <div className="text-center py-12 px-6 border border-dashed border-slate-200 bg-white rounded-lg text-slate-400 space-y-2 select-none">
                  <Eye className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold uppercase">No se encontraron registros</p>
                  <p className="text-[10px] text-slate-400 leading-normal">Cree y confirme una cotización, luego presione "Guardar DB".</p>
                </div>
              ) : (
                historyList.map((q) => (
                  <div 
                    key={q.id}
                    onClick={() => handleCargarQuote(q)}
                    className="bg-white p-4 rounded-lg border border-slate-200 hover:border-[#2CB1C9] transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer shadow-sm group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-[#2CB1C9]">{q.id}</span>
                        <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">{q.fecha}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 leading-normal">
                        {q.cliente?.nombre || "(Sin Razón Social)"}
                      </h4>
                      {q.proyecto && (
                        <p className="text-[10px] text-slate-400 font-medium">Proyecto: {q.proyecto}</p>
                      )}
                      <p className="text-[10px] text-[#2CB1C9]/90 font-sans font-bold pt-0.5">
                        {q.items?.filter(i => i.producto.trim())?.length || 0} ítems • Total S/ {(q.total || 0).toFixed(2)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto self-stretch sm:self-center justify-end">
                      <div className="text-right shrink-0 mr-1">
                        <span className="text-[8px] uppercase font-bold text-slate-400 block tracking-tight select-none">Total</span>
                        <span className="text-xs font-extrabold text-slate-850 font-sans">S/ {(q.total || 0).toFixed(2)}</span>
                      </div>

                      {/* Estado Pipeline */}
                      <span className={`text-[8.5px] font-extrabold px-2 py-0.5 rounded-full select-none ${
                        q.status === 'aprobada' ? 'bg-emerald-100 text-emerald-800' :
                        q.status === 'rechazada' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {q.status === 'aprobada' ? '🟢 Aprobada' : q.status === 'rechazada' ? '🔴 Cancelada' : '🟡 Pendiente'}
                      </span>

                      {/* Botón Cierre & WhatsApp */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenSalesModal(q);
                        }}
                        className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md transition-all cursor-pointer flex items-center gap-1 text-[10.5px] font-bold border border-emerald-200"
                        title="Abrir panel de Cierre de Ventas y WhatsApp"
                      >
                        <Rocket className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="hidden sm:inline">Cierre</span>
                      </button>

                      {/* Botón Descargar PDF */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadDirectPDF(q);
                        }}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-all cursor-pointer flex items-center gap-1 text-[10.5px] font-bold border border-slate-250"
                        title={`Descargar PDF: ${getFullQuotationFilename(q.prefix, q.numero)}.pdf`}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">PDF</span>
                      </button>

                      {/* Botón Clonar / Duplicar */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCloneQuote(q);
                        }}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-all cursor-pointer flex items-center gap-1 text-[10.5px] font-bold border border-slate-250"
                        title="Clonar como nueva cotización con nuevo correlativo"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Clonar</span>
                      </button>

                      {/* Botón Eliminar */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteQuote(q.id, e)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md transition-all cursor-pointer border border-transparent hover:border-rose-200"
                        title="Eliminar registro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal actions close */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end select-none">
              <button
                onClick={() => setHistoryOpen(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-extrabold rounded text-xs transition-colors cursor-pointer uppercase tracking-wider"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 
        ===========================================================
        MODAL DIRECTORIO DE CLIENTES (MOSTRAR DIRECTORIO)
        =========================================================== 
      */}
      {directoryModalOpen && (
        <div className="no-print print:hidden fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-[3px] p-3 sm:p-4 transition-all animate-fade-in font-sans">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden max-h-[90vh] border border-slate-200">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#040D16] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#2CB1C9]/20 text-[#2CB1C9] rounded-lg border border-[#2CB1C9]/30">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <span>Directorio de Clientes</span>
                    <span className="text-[10px] font-bold bg-[#2CB1C9] text-[#040D16] px-2 py-0.5 rounded-full">
                      {contactos.length} {contactos.length === 1 ? "cliente" : "clientes"}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Elige un cliente para cargar automáticamente su Razón Social, RUC, contacto y teléfono.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setNewDirectorioFormOpen(!newDirectorioFormOpen)}
                  className="bg-[#2CB1C9] hover:bg-[#259eb4] text-slate-950 font-black text-xs px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                  title="Agregar un nuevo cliente directamente al directorio"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{newDirectorioFormOpen ? "Cerrar Formulario" : "Nuevo Cliente"}</span>
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setDirectoryModalOpen(false);
                    setNewDirectorioFormOpen(false);
                  }}
                  className="text-slate-400 hover:text-white transition-all cursor-pointer p-1.5 rounded-lg hover:bg-white/10"
                  title="Cerrar directorio"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* In-Modal Quick New Client Form */}
            {newDirectorioFormOpen && (
              <div className="p-4 bg-slate-900 text-white border-b border-slate-800 animate-fade-in space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-[#2CB1C9] uppercase tracking-wider flex items-center gap-1.5">
                    <span>+ Registrar Nuevo Cliente en Directorio</span>
                  </h4>
                  <span className="text-[10px] text-slate-400">Completa los campos deseados</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Empresa / Razón Social *</label>
                    <input
                      type="text"
                      placeholder="Ej. Mi Cliente S.A.C."
                      value={newDirectorioCliente.nombre}
                      onChange={(e) => setNewDirectorioCliente({ ...newDirectorioCliente, nombre: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder:text-slate-500 focus:border-[#2CB1C9] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">RUC / DNI</label>
                    <input
                      type="text"
                      placeholder="Ej. 20601234567"
                      value={newDirectorioCliente.ruc}
                      onChange={(e) => setNewDirectorioCliente({ ...newDirectorioCliente, ruc: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder:text-slate-500 focus:border-[#2CB1C9] focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Nombre de Contacto</label>
                    <input
                      type="text"
                      placeholder="Ej. Juan Pérez"
                      value={newDirectorioCliente.contacto}
                      onChange={(e) => setNewDirectorioCliente({ ...newDirectorioCliente, contacto: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder:text-slate-500 focus:border-[#2CB1C9] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Teléfono / WhatsApp</label>
                    <input
                      type="text"
                      placeholder="Ej. +51 991 234 567"
                      value={newDirectorioCliente.telefono}
                      onChange={(e) => setNewDirectorioCliente({ ...newDirectorioCliente, telefono: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder:text-slate-500 focus:border-[#2CB1C9] focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setNewDirectorioFormOpen(false)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddNewDirectorioCliente(false)}
                    className="bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Solo Guardar en Directorio
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddNewDirectorioCliente(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-4 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm"
                  >
                    Guardar y Elegir para Cotización
                  </button>
                </div>
              </div>
            )}

            {/* Search Input Bar */}
            <div className="p-3.5 bg-slate-100 border-b border-slate-200">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Buscar por Empresa / Razón Social, RUC, Contacto o Teléfono..."
                  value={directorySearch}
                  onChange={(e) => setDirectorySearch(e.target.value)}
                  className="w-full text-xs pl-9 pr-8 py-2.5 bg-white border border-slate-300 rounded-lg focus:border-[#2CB1C9] focus:outline-none transition-all placeholder:text-slate-400 font-medium font-sans"
                  autoFocus
                />
                {directorySearch && (
                  <button 
                    type="button" 
                    onClick={() => setDirectorySearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Client List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50 min-h-[220px]">
              {contactos.length === 0 ? (
                <div className="text-center py-10 px-6 border border-dashed border-slate-200 bg-white rounded-xl text-slate-400 space-y-3 select-none">
                  <Users className="w-12 h-12 text-slate-300 mx-auto" />
                  <div>
                    <p className="text-xs font-bold text-slate-700 uppercase">Directorio Vacío</p>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1">
                      Aún no tienes clientes guardados en el directorio. Puedes agregar tu primer cliente o cargar ejemplos para probar.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setNewDirectorioFormOpen(true)}
                      className="bg-[#2CB1C9] hover:bg-[#259eb4] text-slate-950 font-black text-xs px-3.5 py-2 rounded-lg cursor-pointer transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Registrar Primer Cliente</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadSampleContactos}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-2 rounded-lg cursor-pointer transition-all"
                    >
                      Cargar Clientes de Ejemplo
                    </button>
                  </div>
                </div>
              ) : filteredContactos.length === 0 ? (
                <div className="text-center py-10 px-4 text-slate-400 space-y-2 select-none">
                  <p className="text-xs font-semibold">No se encontraron clientes con "{directorySearch}"</p>
                  <button 
                    type="button"
                    onClick={() => setDirectorySearch("")}
                    className="text-[11px] text-[#2CB1C9] hover:underline font-bold cursor-pointer"
                  >
                    Limpiar filtro de búsqueda
                  </button>
                </div>
              ) : (
                filteredContactos.map((cont, cIdx) => (
                  <div 
                    key={cIdx}
                    onClick={() => handleSelectContacto(cont)}
                    className="bg-white border border-slate-200 hover:border-[#2CB1C9] hover:shadow-md rounded-xl p-3.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group cursor-pointer"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-xs text-slate-900 group-hover:text-[#2CB1C9] transition-colors">
                          🏢 {cont.nombre}
                        </span>
                        {cont.ruc && (
                          <span className="bg-slate-100 text-slate-700 font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200">
                            RUC: {cont.ruc}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 font-medium">
                        {cont.contacto && (
                          <span className="flex items-center gap-1">
                            👤 <strong>Contacto:</strong> {cont.contacto}
                          </span>
                        )}
                        {cont.telefono && (
                          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                            📞 {cont.telefono}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleSelectContacto(cont)}
                        className="bg-[#2CB1C9] hover:bg-[#259eb4] text-slate-950 text-xs font-black px-3.5 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                        title="Cargar todos los datos de este cliente en la cotización actual"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Elegir Cliente</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSingleContacto(cont.nombre)}
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-lg transition-all cursor-pointer"
                        title="Eliminar este cliente del directorio"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between select-none">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-medium">
                  Mostrando {filteredContactos.length} de {contactos.length} clientes
                </span>
                {contactos.length === 0 && (
                  <button
                    type="button"
                    onClick={handleLoadSampleContactos}
                    className="text-[10.5px] font-bold text-[#2CB1C9] hover:underline cursor-pointer"
                  >
                    + Ejemplos
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setDirectoryModalOpen(false);
                  setNewDirectorioFormOpen(false);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer uppercase tracking-wider"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 
        ===========================================================
        MODAL AGREGAR / MODIFICAR ÍTEM (ESTILO SUNAT POP-UP)
        =========================================================== 
      */}
      {itemModalOpen && (
        <div className="no-print print:hidden fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-[3px] p-3 sm:p-4 transition-all animate-fade-in font-sans">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden max-h-[92vh] border border-slate-200">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#040D16] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#2CB1C9]/20 text-[#2CB1C9] rounded-xl border border-[#2CB1C9]/30">
                  {editingItemId ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5 stroke-[2.5]" />}
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <span>{editingItemId ? "Modificar Ítem / Producto" : "Agregar Ítem / Producto"}</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {editingItemId 
                      ? "Lee, revisa y corrige la descripción y los datos del ítem con total comodidad." 
                      : "Ingresa la descripción detallada, cantidad y precio del producto o servicio."}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setItemModalOpen(false)}
                className="text-slate-400 hover:text-white transition-all cursor-pointer p-1.5 rounded-lg hover:bg-white/10"
                title="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50">
              
              {/* Row 1: Unidad de Medida, Cantidad, Valor Unitario */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Unidad */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">
                    Unidad de Medida
                  </label>
                  <select
                    value={modalItemData.unidad}
                    onChange={(e) => setModalItemData({ ...modalItemData, unidad: e.target.value })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:border-[#2CB1C9] focus:outline-none font-bold text-slate-700 shadow-2xs"
                  >
                    <option value="Unidad">Unidad</option>
                    <option value="Millar">Millar</option>
                    <option value="Ciento">Ciento</option>
                    <option value="Docena">Docena</option>
                    <option value="Paquete">Paquete</option>
                    <option value="Servicio">Servicio</option>
                    <option value="Metro">Metro</option>
                    <option value="Global">Global</option>
                    <option value="Horas">Horas</option>
                  </select>
                </div>

                {/* Cantidad */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">
                    Cantidad *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={modalItemData.cantidad}
                    onChange={(e) => setModalItemData({ ...modalItemData, cantidad: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:border-[#2CB1C9] focus:outline-none font-bold text-slate-800 font-sans shadow-2xs"
                  />
                </div>

                {/* Valor Unitario */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">
                    Valor / P. Unit. ({moneda})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">
                      {moneda}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={modalItemData.valorUnitario}
                      onChange={(e) => setModalItemData({ ...modalItemData, valorUnitario: Number(e.target.value) })}
                      className="w-full text-xs pl-8 pr-2.5 py-2.5 bg-white border border-slate-300 rounded-lg focus:border-[#2CB1C9] focus:outline-none font-bold text-slate-800 font-sans shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Descripción (Spacious, Comfortable Textarea) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase text-slate-700 flex items-center gap-1.5">
                    <span>Descripción del Producto o Servicio</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {modalItemData.producto.length} caracteres
                    </span>
                    {modalItemData.producto.trim() && (
                      <button
                        type="button"
                        onClick={() => setModalItemData({ ...modalItemData, producto: "" })}
                        className="text-[10px] text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Limpiar descripción"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  rows={6}
                  value={modalItemData.producto}
                  onChange={(e) => setModalItemData({ ...modalItemData, producto: e.target.value })}
                  placeholder="Escribe la descripción completa del producto o servicio... Tienes amplio espacio para detallar materiales, acabados, medidas, especificaciones o requisitos sin cortes de línea."
                  className="w-full text-xs sm:text-sm p-3.5 bg-white border border-slate-300 rounded-xl focus:border-[#2CB1C9] focus:ring-2 focus:ring-[#2CB1C9]/20 focus:outline-none transition-all placeholder:text-slate-400 font-sans font-medium leading-relaxed text-slate-850 resize-y shadow-2xs"
                  autoFocus
                />
                <p className="text-[10px] text-slate-400">
                  💡 Puedes redactar libremente en varios párrafos o líneas. Se mantendrá la lectura clara tanto en pantalla como en el PDF final.
                </p>
              </div>

              {/* Row 3: Plantillas / Chips Rápidos para rellenar */}
              <div className="bg-white border border-slate-200/90 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-600 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#2CB1C9]" />
                    <span>Sugerencias / Plantillas Rápidas:</span>
                  </span>
                  <span className="text-[9.5px] text-slate-400">Clic para rellenar descripción</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_CHIPS.map(chip => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => {
                        setModalItemData({
                          ...modalItemData,
                          producto: chip.desc,
                          unidad: chip.unit,
                          valorUnitario: chip.price || modalItemData.valorUnitario
                        });
                      }}
                      className="text-[10.5px] font-bold bg-slate-50 hover:bg-[#2CB1C9]/10 hover:text-[#0b6b7d] hover:border-[#2CB1C9]/50 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 transition-all cursor-pointer shadow-2xs active:scale-95"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 4: Resumen de Cálculo en tiempo real */}
              <div className="bg-[#040D16] text-white rounded-xl p-3.5 flex items-center justify-between shadow-sm border border-slate-800">
                <div className="text-[11px] text-slate-300">
                  <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-400">Subtotal del Ítem:</span>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {modalItemData.cantidad || 0} {modalItemData.unidad} × {moneda} {(Number(modalItemData.valorUnitario) || 0).toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base sm:text-lg font-black text-[#2CB1C9] font-sans tracking-tight">
                    {moneda} {((Number(modalItemData.cantidad) || 0) * (Number(modalItemData.valorUnitario) || 0)).toFixed(2)}
                  </span>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setItemModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer rounded-lg hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveItemModal}
                className="bg-[#2CB1C9] hover:bg-[#259eb4] text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-md active:scale-95 uppercase tracking-wider"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{editingItemId ? "Aceptar / Guardar Cambios" : "Aceptar / Agregar Ítem"}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 
        ===========================================================
        1. CIERRE DE VENTAS Y COMUNICACIÓN RÁPIDA (MODAL EJECUTIVO)
        =========================================================== 
      */}
      {salesModalOpen && (
        <div className="no-print print:hidden fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-[3px] p-3 sm:p-4 transition-all animate-fade-in font-sans">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden max-h-[92vh] border border-slate-200">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#040D16] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                  <Rocket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                    Cierre de Ventas y Comunicación Rápida
                  </h3>
                  <p className="text-[10.5px] text-cyan-300 font-mono mt-0.5">
                    Archivo: {getFullQuotationFilename(salesTargetQuote?.prefix, salesTargetQuote?.numero)}.pdf
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSalesModalOpen(false)}
                className="text-slate-400 hover:text-white transition-all cursor-pointer p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50 text-xs">
              
              {/* Sales Status Pipeline Selector */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    Estado en el Embudo de Ventas:
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {currentQuoteStatus === "aprobada" ? "🟢 Venta Cerrada / Aprobada" :
                     currentQuoteStatus === "rechazada" ? "🔴 Rechazada / No Concretada" :
                     "🟡 Cotización Enviada (Pendiente)"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-250">
                  <button
                    type="button"
                    onClick={() => {
                      const qId = salesTargetQuote ? salesTargetQuote.id : `${cotizacionPrefix}${cotizacionNumero}`;
                      handleUpdateQuoteStatus(qId, "pendiente");
                    }}
                    className={`px-2.5 py-1 rounded text-[10.5px] font-extrabold transition-all cursor-pointer ${
                      currentQuoteStatus === "pendiente" 
                        ? "bg-amber-500 text-white shadow-sm" 
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    🟡 Pendiente
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const qId = salesTargetQuote ? salesTargetQuote.id : `${cotizacionPrefix}${cotizacionNumero}`;
                      handleUpdateQuoteStatus(qId, "aprobada");
                    }}
                    className={`px-2.5 py-1 rounded text-[10.5px] font-extrabold transition-all cursor-pointer ${
                      currentQuoteStatus === "aprobada" 
                        ? "bg-emerald-600 text-white shadow-sm" 
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    🟢 Aprobada
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const qId = salesTargetQuote ? salesTargetQuote.id : `${cotizacionPrefix}${cotizacionNumero}`;
                      handleUpdateQuoteStatus(qId, "rechazada");
                    }}
                    className={`px-2.5 py-1 rounded text-[10.5px] font-extrabold transition-all cursor-pointer ${
                      currentQuoteStatus === "rechazada" 
                        ? "bg-rose-600 text-white shadow-sm" 
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    🔴 Cancelada
                  </button>
                </div>
              </div>

              {/* Communication Stage Tabs */}
              <div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                  Selecciona la Etapa de Comunicación:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectSalesTemplate("formal")}
                    className={`p-2.5 rounded-xl border font-bold text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      salesTemplate === "formal"
                        ? "bg-cyan-50 border-cyan-500 text-cyan-900 ring-2 ring-cyan-400/30"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <span className="text-xs flex items-center gap-1.5">🌟 Envío Formal</span>
                    <span className="text-[9.5px] font-medium text-slate-400 leading-tight">Propuesta, cuentas y PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectSalesTemplate("aprobacion")}
                    className={`p-2.5 rounded-xl border font-bold text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      salesTemplate === "aprobacion"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-400/30"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <span className="text-xs flex items-center gap-1.5">🤝 Confirmación</span>
                    <span className="text-[9.5px] font-medium text-slate-400 leading-tight">Visto bueno y pase a taller</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectSalesTemplate("vencimiento")}
                    className={`p-2.5 rounded-xl border font-bold text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      salesTemplate === "vencimiento"
                        ? "bg-purple-50 border-purple-500 text-purple-900 ring-2 ring-purple-400/30"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <span className="text-xs flex items-center gap-1.5">⏳ Vencimiento</span>
                    <span className="text-[9.5px] font-medium text-slate-400 leading-tight">Urgencia antes de expirar</span>
                  </button>
                </div>
              </div>

              {/* Client Quick Phone Contact Field */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-1.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-[10.5px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp Destinatario del Cliente:</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-bold">
                    {salesTargetQuote?.cliente?.nombre || cliente.nombre || "(Cliente no especificado)"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={salesCustomPhone}
                    onChange={(e) => setSalesCustomPhone(e.target.value)}
                    placeholder="Ej: 991820589 o +51 991 820 589"
                    className="flex-1 p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1.5 rounded-md font-medium border border-slate-250 shrink-0">
                    🇵🇪 Perú (+51 automático)
                  </span>
                </div>
              </div>

              {/* Message Editor / Preview */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10.5px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <span>Mensaje Listo para Enviar:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(salesCustomMessage);
                      showNotification("Mensaje copiado al portapapeles", "success");
                    }}
                    className="text-[10.5px] font-bold text-cyan-600 hover:text-cyan-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copiar texto</span>
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={salesCustomMessage}
                  onChange={(e) => setSalesCustomMessage(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-250 rounded-lg text-xs font-sans text-slate-800 focus:outline-none focus:border-cyan-500 leading-relaxed font-normal"
                />
              </div>

            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
              
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadDirectPDF(salesTargetQuote)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer border border-slate-250"
                  title="Descargar solo el archivo PDF oficial"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF ({getFullQuotationFilename(salesTargetQuote?.prefix, salesTargetQuote?.numero)}.pdf)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendEmail(salesTargetQuote, salesCustomMessage)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer border border-slate-250"
                  title="Enviar por correo electrónico"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Correo</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExecuteSendWhatsApp(salesTargetQuote, salesCustomMessage, salesCustomPhone)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                >
                  <MessageCircle className="w-4 h-4 fill-white/20" />
                  <span>Abrir WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadAndOpenWhatsApp(salesTargetQuote, salesCustomMessage, salesCustomPhone)}
                  className="px-4.5 py-2 bg-gradient-to-r from-[#040D16] to-cyan-900 hover:to-cyan-800 text-cyan-300 border border-cyan-400/50 font-black rounded-lg text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md active:scale-95"
                  title="Descarga el PDF con la nomenclatura oficial y abre el WhatsApp del cliente con 1 solo clic"
                >
                  <Rocket className="w-4 h-4 text-cyan-400" />
                  <span>Descargar PDF + WhatsApp (1 Clic)</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION DIALOG (Protects against iframe sandbox blocking of confirm()) */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 backdrop-blur-[2px] p-4 transition-all animate-fade-in font-sans">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full flex flex-col overflow-hidden border border-slate-200 p-5 space-y-4">
            <div className="flex items-start gap-4">
              <div className={`p-2.5 rounded-full shrink-0 ${confirmModal.isDanger ? 'bg-rose-50 text-rose-600' : 'bg-cyan-50 text-[#2CB1C9]'}`}>
                <AlertCircle className="w-5.5 h-5.5" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 className="text-sm font-black text-slate-850 leading-snug uppercase tracking-wide">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  {confirmModal.description}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-2.5 pt-1.5 select-none text-xs">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 font-extrabold rounded-md transition-all cursor-pointer text-xs uppercase"
              >
                {confirmModal.cancelText}
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`px-4.5 py-2 text-white font-extrabold rounded-md transition-all cursor-pointer text-xs uppercase ${
                  confirmModal.isDanger 
                    ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-850 shadow-sm' 
                    : 'bg-[#2CB1C9] hover:bg-[#2CB1C9]/90 active:bg-cyan-750 shadow-sm'
                }`}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
