import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { db } from './src/db/index.ts';
import { users, clients, cotizaciones, cotizacionItems } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';
import { getOrCreateUser } from './src/db/users.ts';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// REST endpoints for the quotation app

// 1. Get all quotations
app.get("/api/cotizaciones", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await getOrCreateUser(req.user!.uid, req.user!.email || '');
    
    // Using Drizzle to query cotizaciones with their items and client
    const quotes = await db.query.cotizaciones.findMany({
      where: eq(cotizaciones.userId, user.id),
      with: {
        items: true,
        client: true,
      },
      orderBy: (cotizaciones, { desc }) => [desc(cotizaciones.createdAt)],
    });

    // Map to frontend expected format
    const formattedQuotes = quotes.map(q => ({
      ...q,
      cliente: {
        nombre: q.client?.nombre || '',
        ruc: q.client?.ruc || '',
        contacto: q.client?.contacto || '',
        telefono: q.client?.telefono || '',
      }
    }));
    
    res.json(formattedQuotes);
  } catch (error) {
    console.error("Database query failed:", error);
    res.status(500).json({ error: "Failed to fetch quotes" });
  }
});

// 2. Save a quotation (create or update)
app.post("/api/cotizaciones", requireAuth, async (req: AuthRequest, res) => {
  const newQuote = req.body;
  if (!newQuote || !newQuote.id) {
    return res.status(400).json({ error: "Datos de cotización inválidos o sin ID." });
  }

  try {
    const user = await getOrCreateUser(req.user!.uid, req.user!.email || '');
    
    // Create or update client
    let clientId: number | undefined;
    if (newQuote.cliente && newQuote.cliente.nombre) {
      const clientResult = await db.insert(clients).values({
        userId: user.id,
        nombre: newQuote.cliente.nombre,
        ruc: newQuote.cliente.ruc || '',
        contacto: newQuote.cliente.contacto || '',
        telefono: newQuote.cliente.telefono || '',
      }).returning({ id: clients.id });
      clientId = clientResult[0].id;
    }

    // Upsert cotizacion
    await db.insert(cotizaciones).values({
      id: newQuote.id,
      userId: user.id,
      clientId: clientId,
      numero: newQuote.numero,
      prefix: newQuote.prefix,
      fecha: newQuote.fecha,
      proyecto: newQuote.proyecto,
      observaciones: newQuote.observaciones,
      igvActivo: newQuote.igvActivo,
      subtotal: newQuote.subtotal,
      igv: newQuote.igv,
      total: newQuote.total,
      moneda: newQuote.moneda,
      discountPercentage: newQuote.discountPercentage,
      discountAmount: newQuote.discountAmount,
    }).onConflictDoUpdate({
      target: cotizaciones.id,
      set: {
        clientId: clientId,
        numero: newQuote.numero,
        prefix: newQuote.prefix,
        fecha: newQuote.fecha,
        proyecto: newQuote.proyecto,
        observaciones: newQuote.observaciones,
        igvActivo: newQuote.igvActivo,
        subtotal: newQuote.subtotal,
        igv: newQuote.igv,
        total: newQuote.total,
        moneda: newQuote.moneda,
        discountPercentage: newQuote.discountPercentage,
        discountAmount: newQuote.discountAmount,
      }
    });

    // Handle items: simple approach is delete and insert
    await db.delete(cotizacionItems).where(eq(cotizacionItems.cotizacionId, newQuote.id));
    
    if (newQuote.items && newQuote.items.length > 0) {
      const itemsToInsert = newQuote.items.map((item: any) => ({
        id: item.id || Math.random().toString(36).substring(7),
        cotizacionId: newQuote.id,
        producto: item.producto,
        cantidad: item.cantidad,
        unidad: item.unidad,
        valorUnitario: item.valorUnitario,
        confirmed: item.confirmed,
      }));
      await db.insert(cotizacionItems).values(itemsToInsert);
    }

    res.json({ success: true, quotation: newQuote });
  } catch (error) {
    console.error("Database insert failed:", error);
    res.status(500).json({ error: "Failed to save quote" });
  }
});

// 3. Delete a quotation
app.delete("/api/cotizaciones/:id", requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  try {
    await db.delete(cotizacionItems).where(eq(cotizacionItems.cotizacionId, id));
    await db.delete(cotizaciones).where(eq(cotizaciones.id, id));
    res.json({ success: true, message: `Cotización ${id} eliminada.` });
  } catch (error) {
    console.error("Database delete failed:", error);
    res.status(500).json({ error: "Failed to delete quote" });
  }
});

// Serve frontend build output or run dev middlewares
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Cotizador Web Server running on port ${PORT}`);
  });
}

startServer();
