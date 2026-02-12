const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const crypto = require("crypto");

const app = express();
const PORT = Number(process.env.PORT ?? 8088);

// normaliza secret removendo: aspas, espaços, tabs, newlines e chars invisíveis
function normalizeSecret(value, fallback) {
  let v = (value ?? fallback ?? "").toString();

  // remove BOM e zero-width chars comuns
  v = v.replace(/\uFEFF/g, "");                 // BOM
  v = v.replace(/[\u200B-\u200D\u2060]/g, "");  // zero width

  v = v.trim();

  // remove aspas envolvendo o valor
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }

  // remove todos espaços/tabs/newlines restantes (se você quiser permitir espaço na senha, remova esta linha)
  v = v.replace(/\s+/g, "");

  return v;
}

const ADMIN_PASSWORD = normalizeSecret(process.env.ADMIN_PASSWORD, "1537");

const DATA_FILE = path.join(__dirname, "data", "data.json");
const PUBLIC_DIR = path.join(__dirname, "public");
const UPLOAD_DIR = path.join(PUBLIC_DIR, "uploads");

app.use(express.json({ limit: "5mb" }));

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
ensureDir(path.dirname(DATA_FILE));
ensureDir(UPLOAD_DIR);

app.use(express.static(PUBLIC_DIR));
app.use("/uploads", express.static(UPLOAD_DIR));

// ---------- Data ----------
function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf-8");
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
  ensureDataFile();
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

// ---------- Auth helpers ----------
function sha8(s) {
  return crypto.createHash("sha256").update(String(s || ""), "utf8").digest("hex").slice(0, 10);
}

function getPasswordFromHeaders(req) {
  const headerPass = String(req.headers["x-admin-password"] || "");
  const auth = String(req.headers["authorization"] || "");
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
  return normalizeSecret(headerPass || bearer, "");
}

function getPasswordFromBody(req) {
  const p = req?.body?.admin_password ?? req?.body?.password ?? "";
  return normalizeSecret(p, "");
}

function getProvidedPassword(req) {
  return getPasswordFromHeaders(req) || getPasswordFromBody(req);
}

function isAuthorized(req) {
  const pass = getProvidedPassword(req);
  return !!pass && pass === ADMIN_PASSWORD;
}

function requireAuth(req, res, next) {
  if (!isAuthorized(req)) {
    const provided = getProvidedPassword(req);

    return res.status(401).json({
      error: "Senha inválida ou não informada.",
      debug: {
        env_has_admin_password: !!process.env.ADMIN_PASSWORD,
        env_admin_len: ADMIN_PASSWORD.length,
        env_admin_hash8: sha8(ADMIN_PASSWORD),

        provided_from_header: !!getPasswordFromHeaders(req),
        provided_from_body: !!getPasswordFromBody(req),
        provided_len: provided.length,
        provided_hash8: sha8(provided),

        body_keys: req.body ? Object.keys(req.body) : [],
        content_type: String(req.headers["content-type"] || ""),
      },
    });
  }
  next();
}

// ✅ endpoint pra testar senha e comparar hash (não vaza)
app.post("/api/debug-auth-hash", (req, res) => {
  const provided = getProvidedPassword(req);
  return res.json({
    ok: provided === ADMIN_PASSWORD,
    env_has_admin_password: !!process.env.ADMIN_PASSWORD,
    env_admin_len: ADMIN_PASSWORD.length,
    env_admin_hash8: sha8(ADMIN_PASSWORD),
    provided_len: provided.length,
    provided_hash8: sha8(provided),
  });
});

// ---------- Upload (multer) ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || "";
    const safeExt = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].includes(ext) ? ext : "";
    cb(null, `img_${Date.now()}_${Math.random().toString(16).slice(2)}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"].includes(file.mimetype);
    if (!ok) return cb(new Error("Tipo inválido. Envie PNG/JPG/GIF/WEBP/SVG."));
    cb(null, true);
  },
});

// ---------- API ----------
app.get("/api/health", (req, res) => res.json({ ok: true }));
app.get("/api/cards", (req, res) => res.json(readCards()));

// upload: multer primeiro, depois auth
app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!isAuthorized(req)) {
    const provided = getProvidedPassword(req);
    return res.status(401).json({
      error: "Senha inválida ou não informada.",
      debug: {
        env_has_admin_password: !!process.env.ADMIN_PASSWORD,
        env_admin_len: ADMIN_PASSWORD.length,
        env_admin_hash8: sha8(ADMIN_PASSWORD),

        provided_from_header: !!getPasswordFromHeaders(req),
        provided_from_body: !!getPasswordFromBody(req),
        provided_len: provided.length,
        provided_hash8: sha8(provided),

        body_keys: req.body ? Object.keys(req.body) : [],
        has_file: !!req.file,
        content_type: String(req.headers["content-type"] || ""),
      },
    });
  }

  if (!req.file) return res.status(400).json({ error: "Arquivo não enviado." });
  return res.json({ url: `/uploads/${req.file.filename}` });
});

// create/edit/delete
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
    const updated = { ...cards[idx], ...patch, updatedAt: new Date().toISOString() };

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
  if (filtered.length === cards.length) return res.status(404).json({ error: "Card não encontrado" });

  writeCards(filtered);
  res.json({ ok: true });
});

// SPA fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ MRB Portal em http://0.0.0.0:${PORT}`);
  console.log("ENV ADMIN_PASSWORD exists?", !!process.env.ADMIN_PASSWORD);
  console.log("ADMIN_PASSWORD len =", ADMIN_PASSWORD.length);
  console.log("ADMIN_PASSWORD hash8 =", sha8(ADMIN_PASSWORD));
});
