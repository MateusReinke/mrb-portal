// server.js
// ✅ Porta fixa 8088 (com fallback para PORT se você definir)
// Se você quer GARANTIR 8088 sempre, deixe PORT=8088 no Coolify
// ou troque a linha PORT para const PORT = 8088;

const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();

// ✅ GARANTIA: se não existir PORT, usa 8088
const PORT = Number(process.env.PORT || 8088);

const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || "1234567");

const DATA_FILE = path.join(__dirname, "data.json");

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

// ---------- Helpers ----------
function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

function readCards() {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, "utf-8").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCards(cards) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(cards, null, 2), "utf-8");
}

function normalizeCard(input) {
  const title = String(input.title ?? "").trim();
  const category = String(input.category ?? "").trim();
  const url = String(input.url ?? "").trim();
  const image = String(input.image ?? "").trim();
  const description = String(input.description ?? "").trim();

  if (!title) throw new Error("Título é obrigatório");
  if (!url) throw new Error("URL é obrigatória");

  return { title, category, url, image, description };
}

function isAuthorized(req) {
  const headerPass = String(req.headers["x-admin-password"] || "").trim();

  const auth = String(req.headers["authorization"] || "").trim();
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";

  const pass = headerPass || bearer;
  return pass && pass === ADMIN_PASSWORD;
}

function requireAuth(req, res, next) {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Senha inválida ou não informada." });
  }
  next();
}

// ---------- API ----------
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/cards", (req, res) => {
  res.json(readCards());
});

app.post("/api/cards", requireAuth, (req, res) => {
  try {
    const cards = readCards();
    const card = normalizeCard(req.body);

    const nextId = cards.reduce((max, c) => Math.max(max, Number(c.id) || 0), 0) + 1;

    const created = {
      id: nextId,
      ...card,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    cards.push(created);
    writeCards(cards);

    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message || "Erro ao criar card" });
  }
});

app.put("/api/cards/:id", requireAuth, (req, res) => {
  try {
    const cards = readCards();
    const id = Number(req.params.id);
    const idx = cards.findIndex((c) => Number(c.id) === id);
    if (idx === -1) return res.status(404).json({ error: "Card não encontrado" });

    const patch = normalizeCard(req.body);

    const updated = {
      ...cards[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    cards[idx] = updated;
    writeCards(cards);

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message || "Erro ao atualizar card" });
  }
});

app.delete("/api/cards/:id", requireAuth, (req, res) => {
  const cards = readCards();
  const id = Number(req.params.id);

  const filtered = cards.filter((c) => Number(c.id) !== id);
  if (filtered.length === cards.length) {
    return res.status(404).json({ error: "Card não encontrado" });
  }

  writeCards(filtered);
  res.json({ ok: true });
});

// Fallback SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ MRB Portal rodando em http://0.0.0.0:${PORT}`);
  console.log(`🔐 ADMIN_PASSWORD=${ADMIN_PASSWORD ? "definida" : "não definida"}`);
});
