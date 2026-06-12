export interface CotizacionItem {
  id: string;
  producto: string;
  cantidad: number;
  unidad: string;
  valorUnitario: number;
  confirmed: boolean;
}

export interface ClientData {
  nombre: string;
  ruc: string;
  contacto: string;
  telefono: string;
}

export interface BankAccount {
  banco: string;
  cuenta: string;
  cci: string;
}

export interface Cotizacion {
  id: string; // Unified unique identifier (e.g. 2026-05-00195)
  numero: string; // The suffix part (00195)
  prefix: string; // Suffix prefix (YYYY-MM-)
  fecha: string;
  cliente: ClientData;
  proyecto: string;
  observaciones: string;
  igvActivo: boolean;
  items: CotizacionItem[];
  subtotal: number;
  igv: number;
  total: number;
  createdAt?: string;
  
  // Advanced customization fields for branding and flexible billing
  moneda?: string;             // Currency symbol e.g., "S/" or "$"
  discountPercentage?: number; // Discount rate (0-100)
  discountAmount?: number;     // Processed discount deduction 
  themeColor?: string;         // Brand hexadecimal color accent
  bancoSoles?: string;         // Bank account 1 details 
  cciSoles?: string;           // CCI 1 details
  bancoDolares?: string;       // Bank account 2 details
  cciDolares?: string;         // CCI 2 details
  detracciones?: string;       // Detracciones bank details or note
  brandName?: string;          // Name of the brand (e.g. ONE ESPACIO CREATIVO)
  brandSubtitle?: string;      // Subtitle of the brand
  emisorNombre?: string;       // Name of the issuer (e.g. OBED GUEVARA)
  emisorRuc?: string;          // RUC of the issuer
  emisorTelefono?: string;     // WhatsApp/tel of the issuer
  emisorEmail?: string;        // Email of the issuer
  emisorDireccion?: string;    // Address of the issuer
  taxRate?: number;            // Applied custom tax rate %
}
