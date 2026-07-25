require("dotenv").config();
const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();
app.use(express.json({ limit: "2mb" }));

// ---------- Redshift (Postgres-compatible) ----------
const pool = new Pool({
  host: process.env.REDSHIFT_HOST,
  port: Number(process.env.REDSHIFT_PORT || 5439),
  database: process.env.REDSHIFT_DB,
  user: process.env.REDSHIFT_USER,
  password: process.env.REDSHIFT_PASSWORD,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
});

// Solo se permiten SELECT / CTE-SELECT de una sola sentencia (mismo límite
// que tenía el conector de Cowork). El front-end ya construye el SQL con
// interpolación de strings, así que esta es la única barrera de seguridad
// del lado del servidor — no exponer este endpoint fuera de la red/uso interno.
function isSafeSelect(sql) {
  const trimmed = sql.trim().replace(/;+\s*$/, "");
  if (trimmed.includes(";")) return false;
  const head = trimmed.slice(0, 20).toLowerCase();
  if (!(head.startsWith("select") || head.startsWith("with"))) return false;
  if (/\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|unload|vacuum)\b/i.test(trimmed)) return false;
  return true;
}

app.post("/api/query", async (req, res) => {
  const { sql } = req.body || {};
  if (!sql || typeof sql !== "string") return res.status(400).json({ error: 'Falta "sql"' });
  if (!isSafeSelect(sql)) return res.status(400).json({ error: "Solo se permiten sentencias SELECT/CTE-SELECT" });
  try {
    const result = await pool.query(sql);
    const columns = result.fields.map((f) => f.name);
    const rows = result.rows.map((row) => columns.map((c) => row[c]));
    res.json({ columns, rows });
  } catch (e) {
    console.error("Query error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ---------- Anthropic (chat / resúmenes con IA) ----------
let anthropicClient = null;
function getAnthropic() {
  if (anthropicClient) return anthropicClient;
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const Anthropic = require("@anthropic-ai/sdk");
  anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropicClient;
}

app.post("/api/ask-claude", async (req, res) => {
  const anthropic = getAnthropic();
  if (!anthropic) return res.status(500).json({ error: "ANTHROPIC_API_KEY no configurada en el servidor" });
  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== "string") return res.status(400).json({ error: 'Falta "prompt"' });
  try {
    const msg = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });
    const text = (msg.content || []).map((b) => b.text || "").join("");
    res.json({ text });
  } catch (e) {
    console.error("ask-claude error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get("/healthz", (_req, res) => res.json({ ok: true }));

// ---------- Estáticos ----------
app.use(express.static(path.join(__dirname, "public")));
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Runrate Mexico Live escuchando en puerto ${PORT}`));
