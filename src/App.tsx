import { useState, useEffect } from "react";
import { 
  Trash2, Plus, Check, Edit2, History, RotateCcw, 
  Loader2, Download, Eye, AlertCircle, CheckCircle, RefreshCw, X,
  Palette, Sliders, ChevronDown, ChevronUp, Copy, ArrowUp, ArrowDown, Camera,
  Database, Wifi, WifiOff, Cloud, Server, Globe, Settings
} from "lucide-react";
import html2canvas from "html2canvas";
import { Cotizacion, CotizacionItem, ClientData } from "./types";
import logoOne from "./logoONEtransparente.png";
import { initAuth, googleSignIn, getAccessToken } from "./googleAuth";
import { createSpreadsheet, appendRow, getSpreadsheetData } from "./googleSheetsService";

// Dynamic Client-side Firebase Firestore initialization helper
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, query, orderBy, limit, doc as firestoreDoc, getDoc as firestoreGetDoc } from "firebase/firestore";

let firebaseInstanceApp: any = null;
let firestoreInstanceDb: any = null;

function getActiveFirebaseDb() {
  if (firestoreInstanceDb) return firestoreInstanceDb;
  
  const storedConfig = localStorage.getItem("one_firebase_config_keys");
  if (!storedConfig) return null;
  
  try {
    const config = JSON.parse(storedConfig);
    if (!config || !config.apiKey) return null;
    
    if (getApps().length === 0) {
      firebaseInstanceApp = initializeApp(config);
    } else {
      firebaseInstanceApp = getApp();
    }
    firestoreInstanceDb = getFirestore(firebaseInstanceApp);
    return firestoreInstanceDb;
  } catch (err) {
    console.error("Error initializing custom Firebase Firestore db:", err);
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

const CONDICIONES_PRESETS = [
  { label: "💳 50% Adelanto", text: "Adelanto del 50% para inicio del proyecto, saldo restante de 50% contra entrega de archivos vectorizados y papelería impresa física." },
  { label: "💰 100% Adelanto", text: "Pago 100% por adelantado para activar el servicio de diseño y maquetación digital de forma inmediata." },
  { label: "⏳ Entrega 4-6 días", text: "Tiempo de entrega estimado: 4 a 6 días hábiles tras la aprobación final y conformidad del material gráfico por parte del cliente." },
  { label: "📅 Validez 15 días", text: "La cotización es válida por 15 días calendario. No incluye IGV. Todo trabajo se inicia únicamente previa confirmación de depósito de adelanto del 50%." }
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
  const [authStatus, setAuthStatus] = useState<"loading" | "authenticated" | "unauthorized" | "logged_out">("loading");
  const [authUser, setAuthUser] = useState<any>(null);
  const ALLOWED_EMAIL = "obedjoel@gmail.com";

  const [loading, setLoading] = useState<boolean>(false);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [historyList, setHistoryList] = useState<Cotizacion[]>([]);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);

  // Document states
  const [fechaActual, setFechaActual] = useState<string>("");
  const [cotizacionPrefix, setCotizacionPrefix] = useState<string>("");
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
  const [items, setItems] = useState<CotizacionItem[]>([
    { id: "1", producto: "", cantidad: 1, unidad: "Millar", valorUnitario: 0, confirmed: false }
  ]);

  const [observaciones, setObservaciones] = useState<string>("Adelanto 50%, tiempo de entrega...");
  const [igvActivo, setIgvActivo] = useState<boolean>(true);
  const [previewMode, setPreviewMode] = useState<boolean>(false);

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
  const [brandName, setBrandName] = useState<string>("ONE ESPACIO CREATIVO");
  const [brandSubtitle, setBrandSubtitle] = useState<string>("ESTUDIO GRÁFICO");
  const [emisorNombre, setEmisorNombre] = useState<string>("OBED GUEVARA");
  const [emisorRuc, setEmisorRuc] = useState<string>("10417585350");
  const [emisorTelefono, setEmisorTelefono] = useState<string>("+51 991 820 589");
  const [emisorEmail, setEmisorEmail] = useState<string>("obedjoel@gmail.com");
  const [emisorDireccion, setEmisorDireccion] = useState<string>("Leoncio Prado V7, Paucarpata");
  const [taxRate, setTaxRate] = useState<number>(18);
  const [contactos, setContactos] = useState<ClientData[]>([]);
  
  // Advanced toggles
  const [showBankSettings, setShowBankSettings] = useState<boolean>(false);

  // Database Integration State (Option 3 Implementation)
  const [dbSource, setDbSource] = useState<"server" | "offline" | "firebase" | "gsheets">("offline");
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
    const activePrefix = `${yyyy}-${mm}-`;
    
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
        
        if (parsed.observaciones) setObservaciones(parsed.observaciones);
        if (parsed.igvActivo !== undefined) setIgvActivo(parsed.igvActivo);
        if (parsed.items && parsed.items.length) {
          setItems(parsed.items);
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
        if (parsed.brandName) setBrandName(parsed.brandName);
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

    // Load saved client contacts directory
    const storedContactos = localStorage.getItem("one_estudio_contactos");
    if (storedContactos) {
      try {
        setContactos(JSON.parse(storedContactos));
      } catch (e) {
        console.error("Error loading contacts directory", e);
      }
    }

    // Load custom database settings and selection (Option 3 Dynamic Configuration support)
    const savedDbSource = localStorage.getItem("one_db_source");
    if (savedDbSource === "server" || savedDbSource === "offline" || savedDbSource === "firebase") {
      setDbSource(savedDbSource);
    } else {
      // Default fallback detector: check if running on a real serving container or localhost
      const hasBackendServer = window.location.hostname !== ""; 
      setDbSource(hasBackendServer ? "server" : "offline");
    }

    const savedKeys = localStorage.getItem("one_firebase_config_keys");
    if (savedKeys) {
      setFirebaseConfigStr(savedKeys);
    }

    import("./googleAuth").then(({ initAuth, logout }) => {
      initAuth((user) => {
        if (user.email === ALLOWED_EMAIL) {
          setAuthUser(user);
          setAuthStatus("authenticated");
        } else {
          logout();
          setAuthStatus("unauthorized");
        }
      }, () => {
        setAuthStatus("logged_out");
      });
    }).catch(e => {
      console.error("Could not init google auth", e);
      setAuthStatus("logged_out");
    });

    setIsLoaded(true);
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
    setBrandName(selected.brandName || "ONE ESPACIO CREATIVO");
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
        const resetObs = "Adelanto 50%, tiempo de entrega...";
        const resetItems: CotizacionItem[] = [
          { id: "1", producto: "", cantidad: 1, unidad: "Millar", valorUnitario: 0, confirmed: false }
        ];

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
        setBrandName("ONE ESPACIO CREATIVO");
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

  // helper function to intercept and convert "oklch" color declarations to browser-resolved "rgb" colors
  // to prevent html2canvas / html2pdf stylesheet parser from crashing on unsupported oklch color syntax.
  const withOklchSafeStyles = async <T,>(action: () => Promise<T>): Promise<T> => {
    // 1. Create a dummy div to leverage the browser's native CSS engine for oklch-to-rgb conversion
    const tempDiv = document.createElement("div");
    tempDiv.style.display = "none";
    document.body.appendChild(tempDiv);

    const convertOklch = (oklchStr: string): string => {
      try {
        tempDiv.style.color = "";
        tempDiv.style.color = oklchStr;
        const rgb = window.getComputedStyle(tempDiv).color;
        return rgb && !rgb.includes("oklch") ? rgb : "rgb(15, 23, 42)";
      } catch {
        return "rgb(15, 23, 42)";
      }
    };

    // 2. Fetch all stylesheets present in document.styleSheets and extract all CSS rules
    let aggregatedCss = "";
    const styleSheetCount = document.styleSheets.length;
    
    for (let i = 0; i < styleSheetCount; i++) {
      const sheet = document.styleSheets[i];
      try {
        const rules = sheet.cssRules || sheet.rules;
        if (rules) {
          for (let j = 0; j < rules.length; j++) {
            aggregatedCss += rules[j].cssText + "\n";
          }
        }
      } catch (e) {
        // Fallback for CORS-locked cross-origin stylesheets or programmatic stylesheets
        if (sheet.ownerNode) {
          if (sheet.ownerNode.nodeName === "STYLE") {
            aggregatedCss += (sheet.ownerNode as HTMLStyleElement).innerHTML + "\n";
          }
        }
      }
    }

    // 3. Scan and convert all oklch() color codes in the aggregated CSS string
    const matches = aggregatedCss.match(/oklch\([^)]+\)/g);
    if (matches) {
      const uniqueMatches = Array.from(new Set(matches));
      uniqueMatches.forEach(match => {
        const rgbColor = convertOklch(match);
        const escapedMatch = match.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        aggregatedCss = aggregatedCss.replace(new RegExp(escapedMatch, 'g'), rgbColor);
      });
    }

    // 4. Create a single, temporary, oklch-free <style> block
    const tempStyle = document.createElement("style");
    tempStyle.setAttribute("data-temp-oklch-safe", "true");
    tempStyle.innerHTML = aggregatedCss;
    document.head.appendChild(tempStyle);

    // 5. Temporarily disable all original <style> and <link> elements
    const styleAndLinkElements = Array.from(document.querySelectorAll("style, link[rel='stylesheet']")) as HTMLElement[];
    const disabledElements: HTMLElement[] = [];
    
    styleAndLinkElements.forEach(el => {
      if (el !== tempStyle) {
        if (el.tagName === "LINK" && !(el as HTMLLinkElement).disabled) {
          (el as HTMLLinkElement).disabled = true;
          disabledElements.push(el);
        } else if (el.tagName === "STYLE" && !(el as HTMLStyleElement).disabled) {
          (el as HTMLStyleElement).disabled = true;
          disabledElements.push(el);
        }
      }
    });

    if (tempDiv.parentNode) {
      tempDiv.parentNode.removeChild(tempDiv);
    }

    try {
      return await action();
    } finally {
      // 6. Restore all original stylesheets and cleanup the temporary style tag
      disabledElements.forEach(el => {
        if (el.tagName === "LINK") {
          (el as HTMLLinkElement).disabled = false;
        } else if (el.tagName === "STYLE") {
          (el as HTMLStyleElement).disabled = false;
        }
      });
      tempStyle.remove();
    }
  };

  // Modern print PDF handler using native browser engine
  const handleExportPDF = async () => {
    const validItems = items.filter(i => i.producto.trim() !== "");
    if (!validItems.length) {
      showNotification("Debe tener al menos un ítem con descripción para poder generar la cotización.", "info");
      return;
    }

    setLoading(true);
    showNotification("Abriendo diálogo de impresión (guardar como PDF)...", "info");

    const previousPreviewMode = previewMode;
    // Set to preview mode to render cleanest look (no outline inputs, hidden action keys)
    setPreviewMode(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      window.print();
    } catch (err) {
      console.error(err);
      showNotification("Error al intentar renderizar PDF.", "error");
    } finally {
      setPreviewMode(previousPreviewMode);
      setLoading(false);
    }
  };

  const handleCaptureScreenshot = async () => {
    const validItems = items.filter(i => i.producto.trim() !== "");
    if (!validItems.length) {
      showNotification("Debe tener al menos un ítem con descripción para poder capturar la cotización.", "info");
      return;
    }

    setLoading(true);
    showNotification("Generando captura de pantalla de alta resolución...", "info");

    try {
      await new Promise(resolve => setTimeout(resolve, 350));
      
      const docElement = document.getElementById("main-cotizador-sheet");
      if (docElement) {
        const imgData = await withOklchSafeStyles(async () => {
          const canvas = await html2canvas(docElement, {
            scale: 3, // 3x scale makes it super crisp for sharing on WhatsApp or email
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
            scrollX: 0,
            scrollY: 0,
            windowWidth: docElement.scrollWidth,
            windowHeight: docElement.scrollHeight
          });
          return canvas.toDataURL("image/png", 1.0);
        });
        
        const link = document.createElement("a");
        link.href = imgData;
        link.download = `ONE_cotizacion_${cotizacionPrefix}${cotizacionNumero}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification("¡Captura de pantalla descargada correctamente como imagen PNG corporativa!", "success");
      } else {
        showNotification("No se encontró el contenedor de la cotización para capturar.", "error");
      }
    } catch (err) {
      console.error(err);
      showNotification("Error de procesamiento al capturar la imagen.", "error");
    } finally {
      setLoading(false);
    }
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

  const handleAddNewItemRow = () => {
    const nextId = String(Date.now());
    const updated = [
      ...items,
      { id: nextId, producto: "", cantidad: 1, unidad: "Unidad", valorUnitario: 0, confirmed: false }
    ];
    updateItemsAndAutosave(updated);
  };

  const handleConfirmItem = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item || !item.producto.trim()) {
      showNotification("Por favor, ingrese un producto o servicio válido.", "info");
      return;
    }

    const updated = items.map(i => {
      if (i.id === itemId) return { ...i, confirmed: true };
      return i;
    });
    updateItemsAndAutosave(updated);
    
    // Automatically append a new blank row if there isn't one already open
    const hasUnconfirmed = updated.some(i => !i.confirmed);
    if (!hasUnconfirmed) {
      const nextId = String(Date.now() + 1);
      const withNewRow = [
        ...updated,
        { id: nextId, producto: "", cantidad: 1, unidad: "Unidad", valorUnitario: 0, confirmed: false }
      ];
      updateItemsAndAutosave(withNewRow);
    }
  };

  const handleEditItem = (itemId: string) => {
    const updated = items.map(i => {
      if (i.id === itemId) return { ...i, confirmed: false };
      return i;
    });
    updateItemsAndAutosave(updated);
  };

  const handleRemoveItem = (itemId: string) => {
    let updated = items.filter(i => i.id !== itemId);
    if (updated.length === 0) {
      updated = [{ id: String(Date.now()), producto: "", cantidad: 1, unidad: "Unidad", valorUnitario: 0, confirmed: false }];
    }
    updateItemsAndAutosave(updated);
  };



  const handleDuplicateItem = (itemId: string) => {
    const index = items.findIndex(i => i.id === itemId);
    if (index > -1) {
      const itemToDup = items[index];
      const newItem = {
        ...itemToDup,
        id: String(Date.now() + Math.random()),
        confirmed: false
      };
      const updated = [...items];
      updated.splice(index + 1, 0, newItem);
      updateItemsAndAutosave(updated);
      showNotification("Concepto duplicado, listo para editar.", "success");
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
    const nextId = String(Date.now());
    const lastItem = items[items.length - 1];
    let updated;
    if (lastItem && lastItem.producto.trim() === "" && lastItem.valorUnitario === 0) {
      updated = items.map((it, idx) => {
        if (idx === items.length - 1) {
          return {
            ...it,
            producto: chip.desc,
            valorUnitario: chip.price,
            unidad: chip.unit,
            confirmed: true
          };
        }
        return it;
      });
    } else {
      updated = [
        ...items,
        {
          id: nextId,
          producto: chip.desc,
          cantidad: 1,
          unidad: chip.unit,
          valorUnitario: chip.price,
          confirmed: true
        }
      ];
    }

    const hasUnconfirmed = updated.some(i => !i.confirmed);
    if (!hasUnconfirmed) {
      updated.push({
        id: String(Date.now() + 1),
        producto: "",
        cantidad: 1,
        unidad: "Unidad",
        valorUnitario: 0,
        confirmed: false
      });
    }

    updateItemsAndAutosave(updated);
    showNotification(`Añadido: ${chip.desc.slice(0, 30)}...`, "success");
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
    showNotification(`Cliente "${cliente.nombre}" guardado con éxito en el directorio.`, "success");
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

  // Re-organize layout numbering safely inside render views
  const confirmedOrNotEmptyItems = items.filter(item => 
    !previewMode || item.producto.trim() !== ""
  );

  if (authStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="w-8 h-8 text-[#2CB1C9] animate-spin" />
      </div>
    );
  }

  if (authStatus !== "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-[#2CB1C9]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-[#2CB1C9]" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Acceso Restringido</h2>
          <p className="text-slate-600 mb-8 text-sm">
            Esta aplicación es privada. Inicie sesión con su cuenta autorizada para continuar.
          </p>
          
          {authStatus === "unauthorized" && (
            <div className="bg-rose-50 text-rose-600 p-3 rounded-lg text-sm mb-6 flex items-start gap-2 text-left">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>La cuenta seleccionada no tiene permisos de acceso. Por favor, utilice la cuenta autorizada.</p>
            </div>
          )}

          <button
            onClick={async () => {
              const { googleSignIn } = await import("./googleAuth");
              try {
                const res = await googleSignIn();
                if (res?.user.email === ALLOWED_EMAIL) {
                  setAuthUser(res.user);
                  setAuthStatus("authenticated");
                } else {
                  const { logout } = await import("./googleAuth");
                  await logout();
                  setAuthStatus("unauthorized");
                }
              } catch (e) {
                console.error(e);
              }
            }}
            className="w-full bg-[#2CB1C9] hover:bg-[#2CB1C9]/90 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md shadow-cyan-600/20"
          >
            Iniciar sesión con Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-['Poppins'] flex flex-col bg-slate-100 text-[#0F1829] p-2 sm:p-5">
      
      {/* Dynamic Toast System */}
      {toast.message && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl transition-all duration-300 transform translate-y-0 scale-100 max-w-md ${
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
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-sm transition-all text-center">
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 max-w-xs border border-slate-100">
            <Loader2 className="w-12 h-12 text-[#2CB1C9] animate-spin" />
            <p className="text-xs font-black uppercase tracking-wider text-slate-800">Generando Cotización...</p>
          </div>
        </div>
      )}

      {/* Preview header reminder */}
      {previewMode && (
        <div className="bg-[#2CB1C9] text-white px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between sticky top-0 z-40 rounded-xl max-w-[900px] w-full mx-auto shadow-md mb-4 gap-3 animate-fade-in select-none">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 animate-pulse" />
            <span className="text-xs font-bold tracking-wider uppercase">VISTA PREVIA DEL DOCUMENTO</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCaptureScreenshot}
              className="bg-[#040D16] hover:bg-black text-[#2CB1C9] border border-[#2CB1C9]/30 text-xs font-semibold px-4 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Tomar una captura de pantalla de alta resolución de la cotización"
            >
              <Camera className="w-3.5 h-3.5 animate-bounce" />
              <span>Captura de Imagen</span>
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
        <div className="max-w-[900px] w-full mx-auto bg-slate-900 text-white rounded-xl shadow-md p-4 mb-5 border border-slate-800 animate-fade-in text-xs select-none">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#2CB1C9] animate-pulse shrink-0" />
                <span className="font-extrabold uppercase tracking-wider text-slate-200 text-[11px]">
                  Base de Datos & Sincronización
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-slate-950/80 px-2.5 py-1 rounded-full border border-slate-800 text-[10px] font-mono">
                  <span className="text-slate-400">Canal:</span>
                  {dbSource === "firebase" ? (
                    <span className="text-cyan-400 flex items-center gap-1 font-bold">
                      <Cloud className="w-3 h-3 animate-ping" /> Nube Firestore
                    </span>
                  ) : dbSource === "server" ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-bold">
                      <Server className="w-3 h-3" /> API Servidor
                    </span>
                  ) : (
                    <span className="text-yellow-450 flex items-center gap-1 font-bold">
                      <WifiOff className="w-3 h-3" /> Dispositivo (Local)
                    </span>
                  )}
                </div>
                <button
                  onClick={async () => {
                    const { logout } = await import("./googleAuth");
                    await logout();
                    setAuthStatus("logged_out");
                    setAuthUser(null);
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1 rounded-full text-[10px] font-bold transition-colors border border-slate-700"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-400 text-[11px]">Persistencia Activa:</span>
                <div className="inline-flex bg-slate-950 p-1 rounded-lg border border-slate-850">
                  <button
                    onClick={() => {
                      setDbSource("offline");
                      localStorage.setItem("one_db_source", "offline");
                      showNotification("Sincronización configurada en modo local (Dispositivo).", "info");
                    }}
                    className={`px-3 py-1.5 rounded font-bold transition-all cursor-pointer flex items-center gap-1.5 text-[11px] ${
                      dbSource === "offline"
                        ? "bg-amber-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <WifiOff className="w-3.5 h-3.5" />
                    <span>Dispositivo</span>
                  </button>

                  <button
                    onClick={async () => {
                      const { getAccessToken, googleSignIn } = await import("./googleAuth");
                      let token = getAccessToken();
                      if (!token) {
                        try {
                          await googleSignIn();
                          showNotification("Autenticación con Google exitosa para Servidor API.", "success");
                        } catch (err) {
                           console.error(err);
                           showNotification("Error de autenticación.", "error");
                           return;
                        }
                      }
                      setDbSource("server");
                      localStorage.setItem("one_db_source", "server");
                      showNotification("Conectado con el servidor Cloud SQL.", "success");
                      fetchHistory();
                    }}
                    className={`px-3 py-1.5 rounded font-bold transition-all cursor-pointer flex items-center gap-1.5 text-[11px] ${
                      dbSource === "server"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Server className="w-3.5 h-3.5" />
                    <span>Servidor API (PostgreSQL)</span>
                  </button>

                  <button
                    onClick={() => {
                      setDbSource("firebase");
                      localStorage.setItem("one_db_source", "firebase");
                      const db = getActiveFirebaseDb();
                      if (!db) {
                        showNotification("Se seleccionó Firebase, pero requiere configurar sus credenciales.", "info");
                        setShowDbSettings(true);
                      } else {
                        showNotification("Base de datos en la nube Firebase Firestore habilitada.", "success");
                        fetchHistory();
                      }
                    }}
                    className={`px-3 py-1.5 rounded font-bold transition-all cursor-pointer flex items-center gap-1.5 text-[11px] ${
                      dbSource === "firebase"
                        ? "bg-cyan-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Cloud className="w-3.5 h-3.5" />
                    <span>Nube Firebase</span>
                  </button>

                  <button
                    onClick={async () => {
                      setDbSource("gsheets");
                      localStorage.setItem("one_db_source", "gsheets");
                      showNotification("Servicio de Google Sheets seleccionado.", "info");
                      
                      // Auto-trigger sign-in if not signed in
                      const token = getAccessToken();
                      if (!token) {
                        try {
                          await googleSignIn();
                          showNotification("Autenticación con Google exitosa.", "success");
                        } catch (err: any) {
                           console.error(err);
                           showNotification("Error de autenticación con Google.", "error");
                        }
                      }
                    }}
                    className={`px-3 py-1.5 rounded font-bold transition-all cursor-pointer flex items-center gap-1.5 text-[11px] ${
                      dbSource === "gsheets"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Google Sheets</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDbSettings(!showDbSettings)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-100 px-3 py-1 rounded transition-all font-bold border border-slate-700 cursor-pointer flex items-center gap-1 text-[11px]"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Configurar BD</span>
                </button>
              </div>
            </div>

            {showDbSettings && (
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 animate-fade-in mt-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-[#2CB1C9] uppercase text-[10px] tracking-wider">Credenciales de Firebase Web SDK</span>
                  <span className="text-[9px] text-slate-500">Perfecto para Google Drive, Capacitor e independientes</span>
                </div>
                <p className="text-slate-450 mb-2 leading-normal text-[10px]">
                  Copia y pega el fragmento de configuración de tu aplicación web desde Firebase Console (el objeto JSON con apiKey, authDomain, projectId, etc.):
                </p>
                <textarea
                  value={firebaseConfigStr}
                  onChange={(e) => setFirebaseConfigStr(e.target.value)}
                  placeholder={`{\n  "apiKey": "AIzaSy...",\n  "authDomain": "one-estudio.firebaseapp.com",\n  "projectId": "one-estudio",\n  "storageBucket": "one-estudio.appspot.com",\n  "messagingSenderId": "...",\n  "appId": "..."\n}`}
                  className="w-full h-24 bg-slate-900 border border-slate-800 rounded p-2 text-slate-200 font-mono text-[10px] focus:outline-none focus:border-[#2CB1C9]"
                />
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFirebaseConfigStr("");
                      localStorage.removeItem("one_firebase_config_keys");
                      firestoreInstanceDb = null;
                      firebaseInstanceApp = null;
                      showNotification("Credenciales de Firebase eliminadas.", "info");
                    }}
                    className="bg-red-950/40 hover:bg-red-950/60 text-red-300 px-3 py-1 rounded font-semibold text-[10px] cursor-pointer"
                  >
                    Borrar Credenciales
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
                    className="bg-[#2CB1C9] hover:bg-[#2CB1C9]/80 text-slate-950 px-4 py-1.5 rounded font-black text-[10px] cursor-pointer uppercase transition-all"
                  >
                    Guardar y Conectar
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
        
        {/* ENCABEZADO CON LOGO */}
        <div className="print-fixed-header w-full">
          <div className="bg-[#040D16] text-white p-6 sm:px-8 sm:py-5 print:px-8 print:py-4 flex flex-col sm:flex-row print:flex-row items-start sm:items-center print:items-center justify-between border-b-[4px] border-solid theme-border-b">
            <div className="flex flex-col mb-4 sm:mb-0 print:mb-0">
              <img src={logoOne} alt="ONE Espacio Creativo Logo" className="h-16 print:h-12 w-auto max-w-[250px] object-contain" />
            </div>

            <div className="text-left sm:text-right print:text-right text-xs space-y-0.5 text-slate-300">
              <h2 className="text-sm font-bold theme-text tracking-wider uppercase mb-1">OBED GUEVARA</h2>
              <p className="font-medium">RUC: 10417585350</p>
              <p className="flex items-center sm:justify-end gap-1.5"><i className='bx bxl-whatsapp text-sm theme-text' /> +51 991 820 589</p>
              <p className="flex items-center sm:justify-end gap-1.5"><i className='bx bx-envelope text-sm theme-text' /> obedjoel@gmail.com</p>
              <p className="flex items-center sm:justify-end gap-1.5"><i className='bx bx-map text-sm theme-text' /> Leoncio Prado V7, Paucarpata</p>
            </div>
          </div>
        </div>

        <div className="print-body-content flex-1 max-w-[900px] w-full mx-auto">
          {/* SECCIÓN FECHA Y NÚMERO */}
          <div className="flex flex-col sm:flex-row print:flex-row items-start sm:items-center print:items-center justify-between px-6 sm:px-8 print:px-8 py-3.5 print:py-2 bg-slate-100 border-b border-slate-200 gap-2">
            <div>
              <p className="text-xs text-slate-600 font-medium select-none">
                <strong className="text-slate-800">Fecha de Emisión:</strong> {fechaActual || "Cargando..."}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs theme-text font-bold">
              <span>N° COTIZACIÓN:</span>
              <span className="font-extrabold select-none">{cotizacionPrefix}</span>
              {previewMode ? (
                <span className="font-extrabold font-sans">{cotizacionNumero}</span>
              ) : (
                <input 
                  type="text" 
                  value={cotizacionNumero}
                  onChange={(e) => {
                    setCotizacionNumero(e.target.value);
                  }}
                  className="w-16 text-xs theme-text font-bold font-sans placeholder-slate-400 border-b border-dashed theme-border focus:outline-none focus:border-solid bg-transparent px-1 py-0 text-center"
                />
              )}
            </div>
          </div>

          {/* MAIN BODY OF THE DOCUMENT */}
          <div className="p-6 sm:p-8 print:px-8 print:py-5 space-y-6 print:space-y-4">

          {/* DATOS CLIENTE */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-l-4 theme-border-l pl-3.5 select-none">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                INFORMACIÓN DEL CLIENTE
              </h2>
              {!previewMode && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <button 
                    onClick={handleSaveContacto}
                    className="text-[10px] font-extrabold uppercase bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-2.5 py-1 rounded transition-all cursor-pointer shadow-sm"
                    title="Almacenar este contacto en el directorio local de clientes"
                  >
                    💾 Guardar en Directorio
                  </button>
                  {contactos.length > 0 && (
                    <button
                      onClick={handleClearContactos}
                      className="text-[10px] font-extrabold uppercase bg-rose-50 hover:bg-rose-100 text-rose-700 px-2 py-1 rounded transition-all cursor-pointer"
                      title="Borrar directorio guardado localmente"
                    >
                      🗑️ Vaciar Directorio
                    </button>
                  )}
                </div>
              )}
            </div>

            {!previewMode && contactos.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs space-y-1.5 animate-fade-in select-none">
                <span className="font-extrabold text-[9px] uppercase tracking-wider text-slate-400 block mb-1">📋 Directorio de Clientes Guardados (Haz clic para cargar instantáneamente):</span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {contactos.map((cont, cIdx) => (
                    <button
                      key={cIdx}
                      onClick={() => setCliente(cont)}
                      className="bg-white hover:bg-slate-100 text-[#0F1829] border border-slate-200 hover:border-slate-300 font-extrabold text-[10.5px] px-2.5 py-1 rounded-md transition-all shadow-sm cursor-pointer flex items-center gap-1"
                    >
                      <span>🏢 {cont.nombre}</span>
                      {cont.contacto && <span className="text-slate-400 font-normal">({cont.contacto})</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-4 print:gap-6">
              
              {/* Column 1 info inputs */}
              <div className="space-y-3 text-xs">
                <div>
                  {previewMode ? (
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
                      className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded focus:border-slate-500 focus:outline-none transition-all placeholder:text-slate-400 font-medium font-sans theme-outline"
                    />
                  )}
                </div>

                <div>
                  {previewMode ? (
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
                      className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded focus:border-slate-500 focus:outline-none transition-all placeholder:text-slate-400 font-medium theme-outline"
                    />
                  )}
                </div>
              </div>

              {/* Column 2 info inputs */}
              <div className="space-y-3 text-xs print:space-y-1">
                <div>
                  {previewMode ? (
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
                      className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded focus:border-slate-500 focus:outline-none transition-all placeholder:text-slate-400 font-medium theme-outline"
                    />
                  )}
                </div>

                <div>
                  {previewMode ? (
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
                      className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded focus:border-slate-500 focus:outline-none transition-all placeholder:text-slate-400 font-medium theme-outline"
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
              {previewMode ? (
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
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-l-4 theme-border-l pl-3.5 pl-3.5 pl-1.5 leading-none">
                DETALLE DE SERVICIOS
              </h2>
              {!previewMode && (
                <div className="flex flex-wrap items-center gap-1 bg-slate-50 p-1 rounded-md border border-slate-200/50">
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase mr-1 px-1">Rápidos:</span>
                  {POPULAR_CHIPS.map((chip) => (
                    <button
                      key={chip.label}
                      onClick={() => handleQuickAddChip(chip)}
                      className="text-[10px] font-extrabold bg-white hover:bg-slate-100 text-slate-600 px-2 py-0.5 rounded transition-all cursor-pointer border border-slate-250 active:scale-95 shadow-sm hover:text-slate-900"
                      title={chip.desc}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 select-none">
                    <th className="p-3 print:p-1.5 font-semibold text-slate-500 w-[5%] text-center font-sans text-[10px] uppercase">Ítem</th>
                    <th className="p-3 print:p-1.5 font-semibold text-slate-500 w-[50%] font-sans text-[10px] uppercase">Descripción</th>
                    <th className="p-3 print:p-1.5 font-semibold text-slate-500 w-[8%] text-center font-sans text-[10px] uppercase">Cant.</th>
                    <th className="p-3 print:p-1.5 font-semibold text-slate-500 w-[12%] font-sans text-[10px] uppercase">Unidad</th>
                    <th className="p-3 print:p-1.5 font-semibold text-slate-500 w-[13%] text-right font-sans text-[10px] uppercase">P. Unit.</th>
                    <th className="p-3 print:p-1.5 font-semibold text-slate-500 w-[15%] text-right font-sans text-[10px] uppercase">Subtotal</th>
                    {!previewMode && <th className="p-3 w-[12%]"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {confirmedOrNotEmptyItems.map((item, idx) => {
                    const rowNumber = idx + 1;
                    const isEven = rowNumber % 2 === 0;
                    
                    return (
                      <tr 
                        key={item.id}
                        className={`${isEven ? "bg-slate-50/20" : "bg-white"} ${
                          item.confirmed ? "font-medium animate-fade-in" : "bg-[#2CB1C9]/5"
                        } transition-all group`}
                      >
                        {/* Number */}
                        <td className="p-3 print:p-1.5 text-center text-slate-400 font-mono font-medium">{rowNumber}</td>
 
                        {/* Product / service description */}
                        <td className="p-3 print:p-1.5">
                          {item.confirmed || previewMode ? (
                            <span className="block text-slate-850 py-1 select-all font-medium whitespace-normal leading-relaxed text-[11.5px]">
                              {item.producto || "-(Concepto de servicio vacío)-"}
                            </span>
                          ) : (
                            <div className="relative">
                              <input 
                                type="text" 
                                list="suggestionsList"
                                placeholder="Escriba el concepto de servicio principal o seleccione sugerencias..."
                                value={item.producto}
                                onChange={(e) => handleItemPropertyChange(item.id, "producto", e.target.value)}
                                className="w-full text-xs p-2 border border-slate-300 rounded focus:border-[#2CB1C9] focus:outline-none transition-all placeholder:text-slate-400 font-semibold"
                              />
                              <datalist id="suggestionsList">
                                {PRODUCT_SUGGESTIONS.map((v, sIdx) => (
                                  <option key={sIdx} value={v.nombre} />
                                ))}
                              </datalist>
                            </div>
                          )}
                        </td>
 
                        {/* Quantity */}
                        <td className="p-3 print:p-1.5 text-center">
                          {item.confirmed || previewMode ? (
                            <span className="font-semibold font-sans text-[11.5px]">{item.cantidad}</span>
                          ) : (
                            <input 
                              type="number" 
                              min="1"
                              value={item.cantidad}
                              onChange={(e) => handleItemPropertyChange(item.id, "cantidad", Number(e.target.value))}
                              className="w-14 p-1.5 text-center bg-white border border-slate-300 rounded font-bold font-sans text-xs focus:ring-1 focus:ring-[#2CB1C9]"
                            />
                          )}
                        </td>
 
                        {/* Unit */}
                        <td className="p-3 print:p-1.5">
                          {item.confirmed || previewMode ? (
                            <span className="font-semibold text-slate-500 text-[11px]">{item.unidad}</span>
                          ) : (
                            <select 
                              value={item.unidad}
                              onChange={(e) => handleItemPropertyChange(item.id, "unidad", e.target.value)}
                              className="text-xs p-1.5 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-[#2CB1C9] focus:outline-none font-bold text-slate-600"
                            >
                              <option value="Unidad">Unidad</option>
                              <option value="Millar">Millar</option>
                              <option value="Docena">Docena</option>
                              <option value="Ciento">Ciento</option>
                              <option value="Paquete">Paquete</option>
                            </select>
                          )}
                        </td>
 
                        {/* Unit Price */}
                        <td className="p-3 print:p-1.5 text-right">
                          {item.confirmed || previewMode ? (
                            <span className="font-semibold font-sans text-[11.5px]">{moneda} {(item.valorUnitario || 0).toFixed(2)}</span>
                          ) : (
                            <div className="flex items-center justify-end gap-1 font-sans text-slate-500">
                              <span className="select-none text-[10px] font-bold">{moneda}</span>
                              <input 
                                type="number" 
                                step="0.01"
                                min="0"
                                value={item.valorUnitario}
                                onChange={(e) => handleItemPropertyChange(item.id, "valorUnitario", Number(e.target.value))}
                                className="w-16 p-1.5 text-right bg-white border border-slate-300 rounded font-bold font-sans text-xs focus:ring-1 theme-ring"
                              />
                            </div>
                          )}
                        </td>
 
                        {/* Subtotal */}
                        <td className="p-3 print:p-1.5 text-right font-sans font-bold text-slate-850 text-[11.5px]">
                          {moneda} {((item.cantidad || 0) * (item.valorUnitario || 0)).toFixed(2)}
                        </td>
 
                        {/* Edit icon controls */}
                        {!previewMode && (
                          <td className="p-1 px-2 text-center select-none">
                            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                              
                              {/* Move Row Up/Down action triggers */}
                              <button
                                onClick={() => handleMoveItem(idx, "up")}
                                disabled={idx === 0}
                                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded disabled:opacity-20 cursor-pointer"
                                title="Mover hacia arriba"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              
                              <button
                                onClick={() => handleMoveItem(idx, "down")}
                                disabled={idx === confirmedOrNotEmptyItems.length - 1}
                                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded disabled:opacity-20 cursor-pointer"
                                title="Mover hacia abajo"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>

                              {/* Copy Row action trigger */}
                              <button
                                onClick={() => handleDuplicateItem(item.id)}
                                className="p-1 text-slate-400 hover:text-cyan-600 hover:bg-slate-100 rounded cursor-pointer"
                                title="Duplicar servicio"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              {item.confirmed ? (
                                <button
                                  onClick={() => handleEditItem(item.id)}
                                  className="p-1 text-amber-500 hover:bg-amber-50 rounded cursor-pointer"
                                  title="Editar"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleConfirmItem(item.id)}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded font-bold animate-pulse cursor-pointer"
                                  title="Confirmar"
                                >
                                  <Check className="w-4 h-4 stroke-[3]" />
                                </button>
                              )}
                              
                              <button
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

            {/* Inline add item helper buttons in edit profile */}
            {!previewMode && (
              <div className="flex justify-start">
                <button
                  onClick={handleAddNewItemRow}
                  className="text-xs font-black theme-text flex items-center gap-1.5 border border-dashed border-slate-350 hover:border-slate-400 px-4 py-2.5 rounded-lg transition-all cursor-pointer bg-white shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span className="uppercase tracking-wider">Añadir Concepto / Fila en Blanco</span>
                </button>
              </div>
            )}
          </div>

          {/* CONDITIONS AND TOTALS SPLIT BLOCK */}
          <div className="grid grid-cols-1 md:grid-cols-10 print:grid-cols-10 gap-6 print:gap-8 pt-4 border-t border-slate-100">
            
            {/* Direct observations conditions text zone */}
            <div className="md:col-span-6 print:col-span-6 space-y-2">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-l-4 theme-border-l pl-3.5 select-none">
                CONDICIONES
              </h2>
              {previewMode ? (
                <div className="text-[10px] text-slate-500 font-medium leading-relaxed bg-slate-50 p-3.5 print:p-2 rounded border border-slate-200/50 whitespace-pre-line select-text">
                  {observaciones || "-(Ninguna condición especificada)-"}
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea 
                    rows={4} 
                    placeholder="Ej: Pago: 50% de adelanto, tiempo de entrega..."
                    value={observaciones}
                    onChange={(e) => {
                      setObservaciones(e.target.value);
                    }}
                    className="w-full text-xs p-3 bg-white border border-slate-300 rounded focus:border-slate-550 focus:outline-none transition-all placeholder:text-slate-400 leading-relaxed font-sans font-medium"
                  />
                  <div className="bg-slate-50 border border-slate-200/60 p-2.5 rounded-lg text-[10px] select-none">
                    <span className="font-extrabold text-slate-400 block mb-1.5 uppercase text-[9px] tracking-wide">Plantillas Rápidas:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {CONDICIONES_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => {
                            if (observaciones.trim()) {
                              setObservaciones(observaciones.trim() + "\n" + preset.text);
                            } else {
                              setObservaciones(preset.text);
                            }
                          }}
                          className="bg-white hover:bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200 cursor-pointer transition-all active:scale-95 font-bold shadow-sm flex items-center gap-1"
                          title="Haz clic para añadir esta cláusula al texto"
                        >
                          <span>➕</span>
                          <span>{preset.label}</span>
                        </button>
                      ))}
                    </div>
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
                      {!previewMode && (
                        <input 
                          type="checkbox" 
                          checked={igvActivo}
                          onChange={(e) => {
                            setIgvActivo(e.target.checked);
                          }}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-slate-700 accent-checkbox cursor-pointer"
                        />
                      )}
                    </span>
                    {!previewMode && igvActivo && (
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500">
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

        {/* PIE DE PÁGINA (RESTABLECIDO) - Dark footer with corporate accounts and handles */}
        <div className="print-fixed-footer w-full">
          <div className="bg-[#040D16] text-white p-6 sm:px-8 sm:py-5 print:px-8 print:py-4 flex flex-col sm:flex-row print:flex-row items-start sm:items-center print:items-center justify-between border-t-[3px] border-solid theme-border gap-4 select-none">
            <div className="text-left sm:text-left print:text-left text-[10px] space-y-1 text-slate-300">
              {bancoSoles && <p><strong>BCP Soles:</strong> {bancoSoles} {cciSoles && <>| <strong>CCI:</strong> {cciSoles}</>}</p>}
              {bancoDolares && <p><strong>ScotiaBank Dólares:</strong> {bancoDolares} {cciDolares && <>| <strong>CCI:</strong> {cciDolares}</>}</p>}
              {detracciones && <p><strong>Detracciones BN:</strong> {detracciones}</p>}
            </div>
            <div className="text-left sm:text-right print:text-right text-[10px] leading-tight text-slate-300 shrink-0">
              <p className="font-extrabold text-white uppercase text-xs leading-none mb-1">OBED GUEVARA</p>
              <p className="flex items-center sm:justify-end gap-1 theme-text font-bold"><i className='bx bxl-instagram text-xs' /> @one.estudiografico</p>
              <p className="flex items-center sm:justify-end gap-1 text-slate-300 mt-0.5"><i className='bx bxl-whatsapp text-xs text-emerald-400' /> +51 991 820 589</p>
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
        <div className="max-w-[900px] w-full mx-auto mt-6 grid grid-cols-2 sm:flex sm:flex-row items-center justify-end gap-3 px-1 pb-10">
          
          <button 
            onClick={handleLimpiarTodo}
            className="flex-1 sm:flex-initial py-2.5 px-4 bg-slate-400 hover:bg-slate-500 text-white font-extrabold rounded text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-slate-900/10 uppercase"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpiar</span>
          </button>

          <button 
            onClick={handleSaveToDatabase}
            className="flex-1 sm:flex-initial py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-700/10 uppercase"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Guardar DB</span>
          </button>

          <button 
            onClick={() => {
              setHistoryOpen(true);
              fetchHistory();
            }}
            className="col-span-2 sm:col-span-1 py-2.5 px-4 bg-slate-600 hover:bg-slate-700 text-white font-extrabold rounded text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-slate-600/10 uppercase"
          >
            <History className="w-3.5 h-3.5" />
            <span>Historial</span>
          </button>

          <button 
            onClick={() => setPreviewMode(true)}
            className="flex-1 sm:flex-initial py-2.5 px-4 bg-[#2CB1C9] hover:bg-[#2CB1C9]/85 text-white font-extrabold rounded text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-cyan-600/10 uppercase"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Vista Previa</span>
          </button>

          <button 
            onClick={handleExportPDF}
            className="flex-1 sm:col-span-1 py-2.5 px-5 bg-[#040D16] hover:bg-black text-[#2CB1C9] border border-[#2CB1C9] font-black rounded text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md uppercase"
          >
            <Download className="w-4 h-4" />
            <span>Generar PDF</span>
          </button>

        </div>
      )}

      {/* HISTORIAL MODAL (Matches user's dialog design but styled clean) */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px] p-4 transition-all animate-fade-in">
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

                    <div className="flex items-center gap-3 w-full sm:w-auto self-stretch sm:self-center justify-end">
                      <div className="text-right shrink-0">
                        <span className="text-[8px] uppercase font-bold text-slate-400 block tracking-tight select-none">Total</span>
                        <span className="text-xs font-extrabold text-slate-850 font-sans">S/ {(q.total || 0).toFixed(2)}</span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteQuote(q.id, e)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded transition-all cursor-pointer"
                        title="Eliminar registro"
                      >
                        <Trash2 className="w-4 h-4" />
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
