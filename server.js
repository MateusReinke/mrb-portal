const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const JWT_SECRET = process.env.JWT_SECRET || "mrb_secret_key";

// 📁 Garante que a pasta data exista
const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'data.json');

fs.ensureDirSync(dataDir);

// 📦 Estrutura padrão inicial (ARRAY DE CARDS)
if (!fs.existsSync(dataFile)) {
    fs.writeJsonSync(dataFile, [
        {
            id: 1,
            title: "Portal MRB",
            category: "Sistema",
            url: "#",
            image: "",
            description: "Bem-vindo ao Portal MRB 🚀"
        }
    ], { spaces: 2 });
}

// 🔐 Middleware de autenticação
function authenticate(req, res, next) {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "Token não fornecido" });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Token inválido" });
    }
}

// 🔑 Login
app.post('/login', (req, res) => {
    const { password } = req.body;

    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: "Senha incorreta" });
    }

    const token = jwt.sign({ user: "admin" }, JWT_SECRET, { expiresIn: "8h" });
    res.json({ token });
});

// 📖 Buscar todos os cards
app.get('/content', async (req, res) => {
    try {
        const data = await fs.readJson(dataFile);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: "Erro ao ler dados" });
    }
});

// 💾 Salvar TODOS os cards (substitui lista inteira)
app.post('/content', authenticate, async (req, res) => {
    try {
        const cards = req.body;

        if (!Array.isArray(cards)) {
            return res.status(400).json({ error: "Formato inválido. Deve ser array." });
        }

        await fs.writeJson(dataFile, cards, { spaces: 2 });
        res.json({ success: true });

    } catch (err) {
        res.status(500).json({ error: "Erro ao salvar dados" });
    }
});

// 🚀 Start
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
