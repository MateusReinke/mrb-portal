// public/app.js (COMPLETO)

const grid = document.querySelector("#cards-grid");
const statusEl = document.querySelector("#status");
const searchEl = document.querySelector("#search");
const adminBtn = document.querySelector("#adminBtn");

const cardModal = document.querySelector("#card-modal");
const cardModalTitle = document.querySelector("#modal-title");
const cardForm = document.querySelector("#card-form");
const deleteBtn = document.querySelector("#deleteBtn");

const passModal = document.querySelector("#pass-modal");
const passForm = document.querySelector("#pass-form");

let allCards = [];
let currentMode = "edit";
let currentId = null;

const PASS_KEY = "mrb_portal_admin_pass";

function setStatus(msg) { statusEl.textContent = msg || ""; }

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getPass() { return sessionStorage.getItem(PASS_KEY) || ""; }
function setPass(p) { sessionStorage.setItem(PASS_KEY, String(p || "")); }
function hasPass() { return !!getPass(); }

function openPassModal() {
  passModal.setAttribute("aria-hidden", "false");
  const input = passForm.elements.password;
  input.value = "";
  setTimeout(() => input.focus(), 30);
}
function closePassModal() { passModal.setAttribute("aria-hidden", "true"); }

function ensurePassOrPrompt() {
  if (hasPass()) return true;
  openPassModal();
  alert("Para alterar cards, informe a senha admin.");
  return false;
}

function openCardModal(mode, card) {
  currentMode = mode;
  currentId = card?.id || null;

  cardModal.setAttribute("aria-hidden", "false");

  if (mode === "create") {
    cardModalTitle.textContent = "Adicionar card";
    deleteBtn.style.display = "none";
    cardForm.reset();
    cardForm.elements.id.value = "";
    return;
  }

  cardModalTitle.textContent = "Editar card";
  deleteBtn.style.display = "inline-flex";

  cardForm.elements.id.value = card.id ?? "";
  cardForm.elements.title.value = card.title ?? "";
  cardForm.elements.category.value = card.category ?? "";
  cardForm.elements.url.value = card.url ?? "";
  cardForm.elements.image.value = card.image ?? "";
  cardForm.elements.description.value = card.description ?? "";
}
function closeCardModal() {
  cardModal.setAttribute("aria-hidden", "true");
  currentId = null;
}

function openCard(url) {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

function cardHtml(c) {
  const title = escapeHtml(c.title);
  const category = escapeHtml(c.category || "");
  const desc = escapeHtml(c.description || "");
  const image = escapeHtml(c.image || "");

  const imgHtml = image
    ? `<img class="card__img" src="${image}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none'" />`
    : `<div class="card__img" aria-hidden="true"></div>`;

  return `
    <article class="card" role="button" tabindex="0"
      data-id="${escapeHtml(c.id)}"
      data-url="${escapeHtml(c.url)}"
    >
      <div class="card__actions">
        <button class="icon-btn" data-action="settings" aria-label="Configurações">⚙</button>
        <button class="icon-btn" data-action="edit" aria-label="Editar">✏</button>
      </div>

      <div class="card__body">
        <div class="card__top">
          ${imgHtml}
          <h3 class="card__title">${title}</h3>
        </div>

        <p class="card__desc">${desc || " "}</p>

        ${category ? `<div class="card__meta"><span class="pill">${category}</span></div>` : ""}
      </div>
    </article>
  `;
}

function addCardHtml() {
  return `
    <article class="card card--add" role="button" tabindex="0">
      <div class="card__actions">
        <button class="icon-btn" data-action="add" aria-label="Adicionar novo card">＋</button>
      </div>

      <div class="card__body">
        <div class="card__top">
          <div class="card__img" aria-hidden="true"></div>
          <h3 class="card__title">Adicionar</h3>
        </div>
        <p class="card__desc">Crie um novo atalho/portal.</p>
        <div class="card__meta"><span class="pill">Admin</span></div>
      </div>
    </article>
  `;
}

function render(cards) {
  grid.innerHTML = "";
  for (const c of cards) grid.insertAdjacentHTML("beforeend", cardHtml(c));
  grid.insertAdjacentHTML("beforeend", addCardHtml());
}

async function api(path, opts = {}) {
  const pass = getPass();
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };

  const method = String(opts.method || "GET").toUpperCase();
  const needsAuth = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  if (needsAuth && pass) headers["x-admin-password"] = pass;

  const res = await fetch(path, { ...opts, headers });
  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const body = isJson ? await res.json() : await res.text();

  if (!res.ok) throw new Error(body?.error || `Erro HTTP ${res.status}`);
  return body;
}

async function load() {
  try {
    setStatus("Carregando...");
    allCards = await api("/api/cards");
    applyFilter();
    setStatus(`OK • ${allCards.length} card(s)`);
  } catch (e) {
    console.error(e);
    setStatus(`Erro: ${e.message}`);
  }
}

function applyFilter() {
  const q = (searchEl.value || "").trim().toLowerCase();
  if (!q) return render(allCards);

  const filtered = allCards.filter((c) => {
    const hay = `${c.title || ""} ${c.category || ""} ${c.description || ""} ${c.url || ""}`.toLowerCase();
    return hay.includes(q);
  });
  render(filtered);
}

function openSettings(id) {
  if (!ensurePassOrPrompt()) return;
  const card = allCards.find((c) => String(c.id) === String(id));
  if (!card) return;

  alert(
    `Configurações do card:\n\n` +
    `ID: ${card.id}\n` +
    `Título: ${card.title}\n` +
    `Categoria: ${card.category || "-"}\n` +
    `URL: ${card.url}\n` +
    `Imagem: ${card.image || "-"}`
  );
}

function openEditModal(id) {
  if (!ensurePassOrPrompt()) return;
  const card = allCards.find((c) => String(c.id) === String(id));
  if (!card) return;
  openCardModal("edit", card);
}

function openCreateModal() {
  if (!ensurePassOrPrompt()) return;
  openCardModal("create", null);
}

// Grid events
grid.addEventListener("click", (e) => {
  const actionBtn = e.target.closest("[data-action]");
  const cardEl = e.target.closest(".card");
  if (!cardEl) return;

  if (actionBtn) {
    e.stopPropagation();
    const action = actionBtn.dataset.action;
    const id = cardEl.dataset.id;

    if (action === "settings") return openSettings(id);
    if (action === "edit") return openEditModal(id);
    if (action === "add") return openCreateModal();
    return;
  }

  if (cardEl.classList.contains("card--add")) return openCreateModal();

  const url = cardEl.dataset.url;
  if (url) openCard(url);
});

// keyboard
grid.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const cardEl = e.target.closest(".card");
  if (!cardEl) return;

  e.preventDefault();

  if (cardEl.classList.contains("card--add")) return openCreateModal();
  const url = cardEl.dataset.url;
  if (url) openCard(url);
});

// close modals
document.addEventListener("click", (e) => {
  if (e.target.closest("#card-modal [data-close]")) closeCardModal();
  if (e.target.closest("#pass-modal [data-close]")) closePassModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (cardModal.getAttribute("aria-hidden") === "false") closeCardModal();
  if (passModal.getAttribute("aria-hidden") === "false") closePassModal();
});

adminBtn.addEventListener("click", () => openPassModal());

passForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const p = passForm.elements.password.value || "";
  setPass(p);
  closePassModal();
  alert(p ? "Senha salva nesta sessão." : "Senha removida desta sessão.");
});

cardForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    if (!ensurePassOrPrompt()) return;

    const payload = {
      title: cardForm.elements.title.value,
      category: cardForm.elements.category.value,
      url: cardForm.elements.url.value,
      image: cardForm.elements.image.value,
      description: cardForm.elements.description.value,
    };

    if (currentMode === "create") {
      await api("/api/cards", { method: "POST", body: JSON.stringify(payload) });
    } else {
      const id = cardForm.elements.id.value;
      await api(`/api/cards/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    }

    closeCardModal();
    await load();
  } catch (err) {
    alert(err.message);
  }
});

deleteBtn.addEventListener("click", async () => {
  try {
    if (!ensurePassOrPrompt()) return;

    const id = currentId || cardForm.elements.id.value;
    if (!id) return;

    if (!confirm("Tem certeza que deseja excluir este card?")) return;

    await api(`/api/cards/${encodeURIComponent(id)}`, { method: "DELETE" });

    closeCardModal();
    await load();
  } catch (err) {
    alert(err.message);
  }
});

searchEl.addEventListener("input", applyFilter);

load();
