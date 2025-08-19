let ADMIN_TOKEN = null, ADMIN_EXP = 0, EXP_TIMER = null, API_SECRET_KEY = null;
const loader = document.getElementById("loader");
function showLoader() { if (loader) loader.style.display = "block" }
function hideLoader() { if (loader) loader.style.display = "none" }

function b64url(s) { return s.replace(/-/g, "+").replace(/_/g, "/") }
function parseJWT(t) { try { const p = t.split(".")[1]; return JSON.parse(atob(b64url(p))) } catch { return {} } }

function showLogin() { document.getElementById("loginBox")?.classList.remove("hidden"); document.getElementById("tabs")?.classList.add("hidden") }
function showPanel() { document.getElementById("loginBox")?.classList.add("hidden"); document.getElementById("tabs")?.classList.remove("hidden") }

function updateExpiryUI() {
  const expirySpan = document.getElementById("tokenExpiry");
  if (!expirySpan) return;
  if (ADMIN_TOKEN) {
    const remainingMs = (ADMIN_EXP * 1000) - Date.now();
    const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
    expirySpan.textContent = `(${remainingDays} días restantes)`;
  } else {
    expirySpan.textContent = "";
  }
}

function setAuthUI(on) { 
  const ti = document.getElementById("tokenInfo");
  if (ti) ti.textContent = on ? "Sesión activa" : "No autenticado";
  const out = document.getElementById("btnLogout");
  if (out) out.classList.toggle("hidden", !on);
  on ? showPanel() : showLogin();
  updateExpiryUI();
}

function clearTimer() { if (EXP_TIMER) { clearTimeout(EXP_TIMER); EXP_TIMER = null } }
function scheduleExpiry() { clearTimer(); const ms = Math.max(0, (ADMIN_EXP * 1000) - Date.now()); EXP_TIMER = setTimeout(() => logout(), ms) }
function saveToken(t) { const d = parseJWT(t); ADMIN_TOKEN = t; ADMIN_EXP = d.exp || 0; localStorage.setItem("admin_token", t); setAuthUI(true); scheduleExpiry() }
function loadToken() { const t = localStorage.getItem("admin_token"); if (!t) { logout(); return false } const d = parseJWT(t); if (d.exp && d.exp * 1000 < Date.now()) { logout(); return false } ADMIN_TOKEN = t; ADMIN_EXP = d.exp || 0; setAuthUI(true); scheduleExpiry(); return true }
function saveApiSecret(s) { API_SECRET_KEY = s; localStorage.setItem("api_secret", s); }
function loadApiSecret() { const s = localStorage.getItem("api_secret"); API_SECRET_KEY = s; }
function logout() { ADMIN_TOKEN = null; ADMIN_EXP = 0; localStorage.removeItem("admin_token"); localStorage.removeItem("api_secret"); setAuthUI(false); clearTimer() }

async function fetchJSON(url, options = {}) {
  const headers = { ...options.headers };
  if (ADMIN_TOKEN) {
    headers["Authorization"] = `Bearer ${ADMIN_TOKEN}`;
  }
  if (API_SECRET_KEY) {
    headers["X-API-Key"] = API_SECRET_KEY;
  }
  
  const r = await fetch(url, { ...options, headers });
  if (!r.ok) {
    const errorBody = await r.text();
    console.error(`Error ${r.status}: ${errorBody}`);
    if (r.status === 401) {
      logout();
    }
    throw new Error(r.status);
  }

  try {
    return await r.json();
  } catch {
    return {};
  }
}

async function login() {
  const pass = document.getElementById("password")?.value;
  const apiSecret = document.getElementById("apiSecret")?.value;
  if (!pass || !apiSecret) return;
  
  saveApiSecret(apiSecret);
  showLoader();
  try {
    const res = await fetchJSON(API_URL + "/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pass })
    });
    saveToken(res.token);
    await initTurnstileAndRefresh();
  } catch (e) {
    document.getElementById("loginMsg").textContent = "Error de autenticación. Verifique sus credenciales y la clave API.";
  } finally {
    hideLoader();
  }
}

async function initTurnstileAndRefresh() {
  showLoader();
  try {
    const tsCheck = await fetch(API_URL + "/api/episodes", { credentials: "include" });
    if (!tsCheck.ok) {
        await window.__tsGate.ensure();
    }
    await refreshList();
  } catch (e) {
    console.error("Turnstile or list refresh failed:", e);
  } finally {
    hideLoader();
  }
}

async function refreshList() {
  await ensureAuth();
  showLoader();
  try {
    const r = await fetchJSON(API_URL + "/api/episodes");
    const list = document.getElementById("list");
    if (!list) return;
    list.innerHTML = "";
    const tpl = document.getElementById("listTpl");
    for (const ep of r.items) {
      const row = tpl.content.cloneNode(true);
      const rowElem = row.querySelector(".episodeRow");
      rowElem.dataset.id = ep.episodio;
      row.querySelector(".epNum").textContent = ep.episodio;
      row.querySelector(".epTitle").textContent = ep.titulo;
      row.querySelector(".epDate").textContent = ep.fecha;
      row.querySelector(".editBtn").addEventListener("click", () => editEpisode(ep.episodio));
      row.querySelector(".delBtn").addEventListener("click", () => delEpisode(ep.episodio));
      list.appendChild(row);
    }
  } finally {
    hideLoader();
  }
}

async function ensureAuth() {
  if (ADMIN_TOKEN) {
    try {
      const r = await fetchJSON(API_URL + "/api/admin/me");
      if (r.ok) return true;
    } catch {
    }
  }
  logout();
  return false;
}

function readForm() {
  return {
    episodio: parseInt(document.getElementById("epNum")?.value, 10),
    titulo: document.getElementById("epTitle")?.value,
    fecha: document.getElementById("epDate")?.value,
    embed: document.getElementById("epEmbed")?.value,
    dl1080: document.getElementById("epDl1080")?.value,
    dl720: document.getElementById("epDl720")?.value,
    dl480: document.getElementById("epDl480")?.value
  };
}

function fillForm(p) {
  document.getElementById("epNum").value = p.episodio;
  document.getElementById("epTitle").value = p.titulo;
  document.getElementById("epDate").value = p.fecha;
  document.getElementById("epEmbed").value = p.embed;
  document.getElementById("epDl1080").value = p.dl1080 || "";
  document.getElementById("epDl720").value = p.dl720 || "";
  document.getElementById("epDl480").value = p.dl480 || "";
}

async function editEpisode(id) {
  if (!await ensureAuth()) return;
  showLoader();
  try {
    const ep = await fetchJSON(API_URL + "/api/episodes/" + id);
    fillForm(ep);
    document.getElementById("epNum").disabled = true;
  } finally {
    hideLoader();
  }
}

async function addOrUpdate(e) {
  e.preventDefault();
  if (!await ensureAuth()) return;
  const p = readForm();
  if (!p.episodio || !p.titulo || !p.fecha) return;
  showLoader();
  try {
    const id = p.episodio;
    const method = document.getElementById("epNum").disabled ? "PUT" : "POST";
    const url = method === "PUT" ? `/api/admin/episodes/${id}` : `/api/admin/episodes`;
    await fetchJSON(API_URL + url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p)
    });
    
    document.getElementById("formAdd").reset();
    document.getElementById("epNum").disabled = false;
    await refreshList();
  } finally {
    hideLoader();
  }
}

async function delEpisode(epn) {
  if (!await ensureAuth()) return;
  const id = parseInt(epn, 10);
  if (!id || isNaN(id)) return;
  showLoader();
  try {
    await fetchJSON(API_URL + "/api/admin/episodes/" + id, {
      method: "DELETE"
    });
    await refreshList();
  } finally {
    hideLoader();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadApiSecret();
  loadToken();
  if (ADMIN_TOKEN) {
    initTurnstileAndRefresh();
  }
  document.getElementById("btnLogin")?.addEventListener("click", login);
  document.getElementById("btnLogout")?.addEventListener("click", logout);
  document.getElementById("formAdd")?.addEventListener("submit", addOrUpdate);
  const list = document.getElementById("list");
  if (list) {
    list.addEventListener("click", e => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const row = btn.closest(".episodeRow");
      const epn = row?.dataset.id;
      if (!epn) return;
      if (btn.classList.contains("editBtn")) {
        editEpisode(epn);
      } else if (btn.classList.contains("delBtn")) {
        delEpisode(epn);
      }
    });
  }
});