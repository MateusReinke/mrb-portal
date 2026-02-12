const grid = document.querySelector("#cards-grid");
const statusEl = document.querySelector("#status");
const searchEl = document.querySelector("#search");

const cardModal = document.querySelector("#card-modal");
const cardModalTitle = document.querySelector("#modal-title");
const cardForm = document.querySelector("#card-form");
const deleteBtn = document.querySelector("#deleteBtn");

const confirmModal = document.querySelector("#confirm-modal");
const confirmForm = document.querySelector("#confirm-form");
const confirmTitle = document.querySelector("#confirm-title");
const confirmText = document.querySelector("#confirm-text");
const confirmPass = document.querySelector("#confirmPass");
const confirmCancel = document.querySelector("#confirmCancel");

const imageUrlEl = document.querySelector("#imageUrl");
const imageFileEl = document.querySelector("#imageFile");
const imgPreviewEl = document.querySelector("#imgPreview");
const imgPlaceholderEl = document.querySelector("#imgPlaceholder");

let allCards = [];
let currentMode = "edit";
let currentId = null;

let confirmResolver = null;

function setStatus(msg) { statusEl.textContent = msg || ""; }

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

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
  setPreviewFromUrl(URL.createObjectURL(file));
});

// ---------- Confirm modal ----------
function openConfirmModal({ title, text }) {
  confirmTitle.textContent = title || "Confirmar";
  confirmText.textContent = text || "Digite a senha para confirmar.";
  confirmPass.value = "";
  confirmModal.setAttribute("aria-hidden", "false");
  setTimeout(() => confirmPass.focus(), 30);

  return new Promise((resolve) => { confirmResolver = resolve; });
}
function closeConfirmModal() { confirmModal.setAttribute("aria-hidden", "true"); }
function resolveConfirm(result) {
  if (typeof confirmResolver === "function") {
    const fn = confirmResolver;
    confirmResolver = null;
    fn(result);
  }
}
confirmForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const pass = (confirmPass.value || "").trim();
  closeConfirmModal();
  resolveConfirm({ ok: !!pass, pass });
});
confirmCancel.addEventListener("click", (e) => {
  e.preventDefault();
  closeConfirmModal();
  resolveConfirm({ ok: false, pass: "" });
});

// ---------- Card modal ----------
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

// ---------- Render ----------
function cardHtml(c) {
  const title = escapeHtml(c.title);
  const category = escapeHtml(c.category || "");
  const image = escapeHtml(c.image || "");

  const imgHtml = image
    ? `<img class="card__img" src="${image}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none'" />`
    : `<div class="card__img" aria-hidden="true"></div>`;

  return `
    <article class="card" role="button" tabindex="0" data-id="${escapeHtml(c.id)}" data-url="${escapeHtml(c.url)}">
      <div class="card__actions">
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
      <div class="card__center"><div class="plus">+</div></div>
    </article>
  `;
}
function render(cards) {
  grid.innerHTML = "";
  for (const c of cards) grid.insertAdjacentHTML("beforeend", cardHtml(c));
  grid.insertAdjacentHTML("beforeend", addCardHtml());
}

// ---------- API ----------
async function api(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  const method = String(opts.method || "GET").toUpperCase();

  if (!(opts.body instanceof FormData)) headers["Content-Type"] = "application/json";

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
searchEl.addEventListener("input", applyFilter);

// ---------- Actions ----------
function openEditModal(id) {
  const card = allCards.find((c) => String(c.id) === String(id));
  if (!card) return;
  openCardModal("edit", card);
}
function openCreateModal() { openCardModal("create", null); }

grid.addEventListener("click", (e) => {
  const actionBtn = e.target.closest("[data-action]");
  const cardEl = e.target.closest(".card");
  if (!cardEl) return;

  if (actionBtn) {
    e.stopPropagation();
    const id = cardEl.dataset.id;
    return openEditModal(id);
  }

  if (cardEl.dataset.add === "1") return openCreateModal();
  const url = cardEl.dataset.url;
  if (url) openCard(url);
});

// close modals
document.addEventListener("click", (e) => {
  if (e.target.closest("#card-modal [data-close]")) closeCardModal();
  if (e.target.closest("#confirm-modal [data-close]")) {
    closeConfirmModal();
    resolveConfirm({ ok: false, pass: "" });
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (cardModal.getAttribute("aria-hidden") === "false") closeCardModal();
  if (confirmModal.getAttribute("aria-hidden") === "false") {
    closeConfirmModal();
    resolveConfirm({ ok: false, pass: "" });
  }
});

// helper: cria headers com 2 formas
function authHeaders(pass) {
  const p = String(pass || "").trim();
  return {
    "x-admin-password": p,
    "Authorization": `Bearer ${p}`,
  };
}

// upload
async function uploadSelectedImageIfAny(password) {
  const file = imageFileEl.files?.[0];
  if (!file) return null;

  const fd = new FormData();
  fd.append("file", file);

  const result = await api("/api/upload", {
    method: "POST",
    body: fd,
    headers: authHeaders(password),
  });

  return result.url;
}

// save (sempre pede senha)
cardForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    const conf = await openConfirmModal({
      title: "Confirmar alteração",
      text: currentMode === "create"
        ? "Digite a senha para criar este card."
        : "Digite a senha para salvar as alterações deste card.",
    });
    if (!conf.ok) return;

    const uploadedUrl = await uploadSelectedImageIfAny(conf.pass);
    const imageUrl = uploadedUrl || (imageUrlEl.value || "").trim();

    if (uploadedUrl) {
      imageUrlEl.value = uploadedUrl;
      setPreviewFromUrl(uploadedUrl);
    }

    const payload = {
      title: cardForm.elements.title.value,
      category: cardForm.elements.category.value,
      url: cardForm.elements.url.value,
      image: imageUrl,
      description: cardForm.elements.description.value,
    };

    if (currentMode === "create") {
      await api("/api/cards", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: authHeaders(conf.pass),
      });
    } else {
      const id = cardForm.elements.id.value;
      await api(`/api/cards/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
        headers: authHeaders(conf.pass),
      });
    }

    closeCardModal();
    await load();
  } catch (err) {
    alert(err.message);
  }
});

// delete (sempre pede senha)
deleteBtn.addEventListener("click", async () => {
  try {
    const id = currentId || cardForm.elements.id.value;
    if (!id) return;

    if (!confirm("Tem certeza que deseja excluir este card?")) return;

    const conf = await openConfirmModal({
      title: "Confirmar exclusão",
      text: "Digite a senha para excluir este card.",
    });
    if (!conf.ok) return;

    await api(`/api/cards/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: authHeaders(conf.pass),
    });

    closeCardModal();
    await load();
  } catch (err) {
    alert(err.message);
  }
});

load();
