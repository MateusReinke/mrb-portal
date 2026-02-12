
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

const dataFile = path.join(__dirname, 'data', 'data.json');

if (!fs.existsSync(dataFile)) {
    fs.writeJsonSync(dataFile, { content: "Bem-vindo ao Portal MRB 🚀" });
}

function authenticate(req, res, next) {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "Token não fornecido" });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: "Token inválido" });
    }
}

app.post('/login', (req, res) => {
    const { password } = req.body;
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: "Senha incorreta" });
    }

    const token = jwt.sign({ user: "admin" }, JWT_SECRET, { expiresIn: "8h" });
    res.json({ token });
});

app.get('/content', async (req, res) => {
    const data = await fs.readJson(dataFile);
    res.json(data);
});

app.post('/content', authenticate, async (req, res) => {
    const { content } = req.body;
    await fs.writeJson(dataFile, { content });
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
