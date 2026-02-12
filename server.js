
const express = require('express');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;
const SECRET = "mrb_secret_key";
const ADMIN_PASSWORD_HASH = bcrypt.hashSync("admin123", 10);

const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).send("Token required");
  const token = authHeader.split(' ')[1];
  try {
    jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(403).send("Invalid token");
  }
}

app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (!bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
    return res.status(401).send("Invalid password");
  }
  const token = jwt.sign({ role: "admin" }, SECRET, { expiresIn: "8h" });
  res.json({ token });
});

app.get('/api/cards', (req, res) => {
  res.json(readData().cards);
});

app.post('/api/cards', authMiddleware, (req, res) => {
  const data = readData();
  const newCard = { id: Date.now(), ...req.body };
  data.cards.push(newCard);
  writeData(data);
  res.json(newCard);
});

app.delete('/api/cards/:id', authMiddleware, (req, res) => {
  const data = readData();
  const id = parseInt(req.params.id);
  data.cards = data.cards.filter(c => c.id !== id);
  writeData(data);
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log("MRB Portal com Auth rodando na porta " + PORT);
});
