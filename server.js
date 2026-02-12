const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const PORT = 8088;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const JWT_SECRET = process.env.JWT_SECRET || "mrb_super_secret";

const dataFile = path.join(__dirname, 'data', 'data.json');
fs.ensureFileSync(dataFile);

// Se estiver vazio, cria dados padrão
if (!fs.readFileSync(dataFile).toString()) {
  fs.writeJsonSync(dataFile, [
    {
      id: 1,
      title: "n8n",
      category: "Automações",
      url: "https://n8n.mrbautomacoes.site",
      image: "https://registry.npmmirror.com/@lobehub/icons-static-png/latest/files/dark/n8n-color.png"
    },
    {
      id: 2,
      title: "Zabbix",
      category: "Monitoramento",
      url: "https://zabbix.mrbautomacoes.site",
      image: "https://images.icon-icons.com/2699/PNG/512/zabbix_logo_icon_168734.png"
    },
    {
      id: 3,
      title: "GLPI",
      category: "Service Desk",
      url: "https://glpi.mrbautomacoes.site",
      image: "https://helpdesk.project.inf.br/pics/logos/logo-GLPI-500-white.png"
    },
    {
      id: 4,
      title: "Evolution",
      category: "WhatsApp API",
      url: "https://evolution.mrbautomacoes.site",
      image: "URL_IMAGEM_VALIDA_AQUI"
    },
    {
      id: 5,
      title: "Chatwoot",
      category: "Atendimento",
      url: "https://chatwoot.mrbautomacoes.site",
      image: "URL_IMAGEM_VALIDA_AQUI"
    },
    {
      id: 6,
      title: "Coolify",
      category: "Plataforma",
      url: "https://coolify.mrbautomacoes.site",
      image: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/coolify.png"
    }
  ], { spaces: 2 });
}

function auth(req, res, next){
  const token = req.headers.authorization;
  if(!token) return res.status(401).json({error:"Token ausente"});
  try{
    jwt.verify(token, JWT_SECRET);
    next();
  }catch{
    res.status(401).json({error:"Token inválido"});
  }
}

app.post('/login', (req,res)=>{
  if(req.body.password !== ADMIN_PASSWORD)
    return res.status(401).json({error:"Senha incorreta"});
  const token = jwt.sign({admin:true}, JWT_SECRET, {expiresIn:"8h"});
  res.json({token});
});

app.get('/cards', async(req,res)=>{
  const data = await fs.readJson(dataFile);
  res.json(data);
});

app.post('/cards', auth, async(req,res)=>{
  await fs.writeJson(dataFile, req.body, {spaces:2});
  res.json({success:true});
});
// ROTA ADMIN INVISÍVEL
app.get('/portal-mrb-admin-8472.html', (req,res)=>{
  res.sendFile(path.join(__dirname,'public','portal-mrb-admin-8472.html'));
});

// START SERVER
app.listen(PORT, ()=> console.log("Rodando na porta "+PORT));
