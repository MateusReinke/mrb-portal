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
const passCancelBtn = document.querySelector("#passCancel");

const imageUrlEl = document.querySelector("#imageUrl");
const imageFileEl = document.querySelector("#imageFile");
const imgPreviewEl = document.querySelector("#imgPreview");
const imgPlaceholderEl = document.querySelector("#imgPlaceholder");

let allCards = [];
let currentMode = "edit";
let currentId = null;

const PASS_KEY = "mrb_portal_admin_pass";
let passResolver = null;

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

function requirePassConfirm() {
  if (hasPass()) return Promise.resolve(true);
  openPassModal();
  return new Promise((resolve) => { passResolver = resolve; });
}
function resolvePass(ok) {
  if (typeof passResolver === "function") {
    const fn = passResolver;
    passResolver = null;
    fn(ok);
  }
}

// preview
function setPreviewFromUrl(url) {
  const clean = String(url || "").trim();
  if (!clean) {
    imgPreviewEl.style.display = "none";
    imgPreviewEl.src = "";
    imgPlaceholderEl.style.display = "block";
    return;
  }
  imgPlaceholderEl.style.display = "none";
  imgPreviewEl.style.display = "block";
  imgPreviewEl.src = clean;
}

imageUrlEl.addEventListener("input", () => setPreviewFromUrl(imageUrlEl.value));

imageFileEl.addEventListener("change", () => {
  const file = imageFileEl.files?.[0];
  if (!file) return;
  const localUrl = URL.createObjectURL(file);
  setPreviewFromUrl(localUrl);
});

// modal
function openCardModal(mode, card) {
  currentMode = mode;
  currentId = card?.id || null;

  cardModal.setAttribute("aria-hidden", "false");

  imageFileEl.value = "";
  setPreviewFromUrl("");

  if (mode === "create") {
    cardModalTitle.textContent = "Adicionar card";
    deleteBtn.style.display = "none";
    cardForm.reset();
    cardForm.elements.id.value = "";
    imageUrlEl.value = "";
    return;
  }

  cardModalTitle.textContent = "Editar card";
  deleteBtn.style.display = "inline-flex";

  cardForm.elements.id.value = card.id ?? "";
  cardForm.elements.title.value = card.title ?? "";
  cardForm.elements.category.value = card.category ?? "";
  cardForm.elements.url.value = card.url ?? "";
  cardForm.elements.description.value = card.description ?? "";

  imageUrlEl.value = card.image ?? "";
  setPreviewFromUrl(card.image ?? "");
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

      <div class="card__center">
        ${imgHtml}
        <h3 class="card__title">${title}</h3>
        <p class="card__cat">${category || "&nbsp;"}</p>
      </div>
    </article>
  `;
}

function addCardHtml() {
  return `
    <article class="card card--add" role="button" tabindex="0" data-add="1">
      <div class="card__center">
        <div class="plus">+</div>
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
  const headers = { ...(opts.headers || {}) };

  const method = String(opts.method || "GET").toUpperCase();
  const needsAuth = ["POST","PUT","PATCH","DELETE"].includes(method);

  if (!(opts.body instanceof FormData)) headers["Content-Type"] = "application/json";
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
  const card = allCards.find((c) => String(c.id) === String(id));
  if (!card) return;
  alert(
    `Detalhes do card:\n\n` +
    `ID: ${card.id}\n` +
    `Título: ${card.title}\n` +
    `Categoria: ${card.category || "-"}\n` +
    `URL: ${card.url}\n` +
    `Imagem: ${card.image || "-"}`
  );
}

function openEditModal(id) {
  const card = allCards.find((c) => String(c.id) === String(id));
  if (!card) return;
  openCardModal("edit", card);
}

function openCreateModal() {
  openCardModal("create", null);
}

// grid events
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
    return;
  }

  if (cardEl.dataset.add === "1") return openCreateModal();

  const url = cardEl.dataset.url;
  if (url) openCard(url);
});

grid.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const cardEl = e.target.closest(".card");
  if (!cardEl) return;

  e.preventDefault();
  if (cardEl.dataset.add === "1") return openCreateModal();

  const url = cardEl.dataset.url;
  if (url) openCard(url);
});

// close modals
document.addEventListener("click", (e) => {
  if (e.target.closest("#card-modal [data-close]")) closeCardModal();
  if (e.target.closest("#pass-modal [data-close]")) {
    closePassModal();
    resolvePass(false);
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (cardModal.getAttribute("aria-hidden") === "false") closeCardModal();
  if (passModal.getAttribute("aria-hidden") === "false") {
    closePassModal();
    resolvePass(false);
  }
});

adminBtn.addEventListener("click", () => openPassModal());
searchEl.addEventListener("input", applyFilter);

// pass modal submit
passForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const p = passForm.elements.password.value || "";
  setPass(p);
  closePassModal();
  resolvePass(!!p);
});
passCancelBtn.addEventListener("click", (e) => {
  e.preventDefault();
  closePassModal();
  resolvePass(false);
});

// upload helper
async function uploadSelectedImageIfAny() {
  const file = imageFileEl.files?.[0];
  if (!file) return null;

  const ok = await requirePassConfirm();
  if (!ok) return null;

  const fd = new FormData();
  fd.append("file", file);

  const result = await api("/api/upload", { method: "POST", body: fd });
  return result.url;
}

// save (create/edit) — senha só aqui
cardForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    // 1) upload se tiver arquivo
    const uploadedUrl = await uploadSelectedImageIfAny();
    let imageUrl = uploadedUrl || (imageUrlEl.value || "").trim();

    if (uploadedUrl) {
      imageUrlEl.value = uploadedUrl;
      setPreviewFromUrl(uploadedUrl);
    }

    // 2) pede senha pra salvar (se ainda não tiver)
    const ok = await requirePassConfirm();
    if (!ok) return;

    const payload = {
      title: cardForm.elements.title.value,
      category: cardForm.elements.category.value,
      url: cardForm.elements.url.value,
      image: imageUrl,
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

// delete — senha só aqui
deleteBtn.addEventListener("click", async () => {
  try {
    const id = currentId || cardForm.elements.id.value;
    if (!id) return;

    if (!confirm("Tem certeza que deseja excluir este card?")) return;

    const ok = await requirePassConfirm();
    if (!ok) return;

    await api(`/api/cards/${encodeURIComponent(id)}`, { method: "DELETE" });

    closeCardModal();
    await load();
  } catch (err) {
    alert(err.message);
  }
});

load();
