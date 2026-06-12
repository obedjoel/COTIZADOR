import express from "express";
import path from "path";
import fs from "fs/promises";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "cotizaciones.json");

// Helper to interact with persistent database file
async function readDatabase(): Promise<any[]> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      const content = await fs.readFile(DATA_FILE, "utf-8");
      return JSON.parse(content);
    } catch {
      // If file doesn't exist or has syntax error, write empty array and return it
      await fs.writeFile(DATA_FILE, "[]", "utf-8");
      return [];
    }
  } catch (error) {
    console.error("Database read error:", error);
    return [];
  }
}

async function writeDatabase(data: any[]): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Database write error:", error);
  }
}

// REST endpoints for the quotation app

// 1. Get all quotations
app.get("/api/cotizaciones", async (req, res) => {
  const quotations = await readDatabase();
  res.json(quotations);
});

// 2. Save a quotation (create or update)
app.post("/api/cotizaciones", async (req, res) => {
  const newQuote = req.body;
  if (!newQuote || !newQuote.id) {
    return res.status(400).json({ error: "Datos de cotización inválidos o sin ID." });
  }

  const list = await readDatabase();
  const index = list.findIndex((q) => q.id === newQuote.id);

  if (index > -1) {
    // Update existing quote
    list[index] = { ...list[index], ...newQuote, updatedAt: new Date().toISOString() };
  } else {
    // Add new quote
    list.unshift({ ...newQuote, createdAt: new Date().toISOString() });
  }

  await writeDatabase(list);
  res.json({ success: true, quotation: newQuote });
});

// 3. Delete a quotation
app.delete("/api/cotizaciones/:id", async (req, res) => {
  const { id } = req.params;
  const list = await readDatabase();
  const filtered = list.filter((q) => q.id !== id);
  await writeDatabase(filtered);
  res.json({ success: true, message: `Cotización ${id} eliminada.` });
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
