let ADMIN_TOKEN = null, ADMIN_EXP = 0, EXP_TIMER = null, API_SECRET_KEY = null;
const loader = document.getElementById("loader");

function showLoader() { if (loader) loader.style.display = "block"; }
function hideLoader() { if (loader) loader.style.display = "none"; }
function showError(msg, elementId = "loginMsg") {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = msg;
    el.style.color = "#f87171";
  }
}

function b64url(s) { return s.replace(/-/g, "+").replace(/_/g, "/"); }
function parseJWT(t) { 
  try { 
    const p = t.split(".")[1]; 
    return JSON.parse(atob(b64url(p))); 
  } catch { 
    return {}; 
  } 
}

function showLogin() { 
  document.getElementById("loginBox")?.classList.remove("hidden"); 
  document.getElementById("tabs")?.classList.add("hidden"); 
}
function showPanel() { 
  document.getElementById("loginBox")?.classList.add("hidden"); 
  document.getElementById("tabs")?.classList.remove("hidden"); 
}

function updateExpiryUI() {
  const expirySpan = document.getElementById("tokenExpiry");
  if (!expirySpan) return;
  if (ADMIN_TOKEN) {
    const remainingMs = (ADMIN_EXP * 1000) - Date.now();
    const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
    expirySpan.textContent = `(${remainingDays} días restantes)`;
    expirySpan.style.color = remainingDays <= 1 ? "#f87171" : "";
  } else {
    expirySpan.textContent = "";
  }
}

function setAuthUI(on) { 
  const ti = document.getElementById("tokenInfo");
  if (ti) {
    ti.textContent = on ? "Sesión activa" : "No autenticado";
    ti.style.color = on ? "#3fb950" : "#f87171";
  }
  const out = document.getElementById("btnLogout");
  if (out) out.classList.toggle("hidden", !on);
  on ? showPanel() : showLogin();
  updateExpiryUI();
}

function clearTimer() { 
  if (EXP_TIMER) { 
    clearTimeout(EXP_TIMER); 
    EXP_TIMER = null; 
  } 
}

function scheduleExpiry() { 
  clearTimer(); 
  const ms = Math.max(0, (ADMIN_EXP * 1000) - Date.now()); 
  EXP_TIMER = setTimeout(() => {
    showError("Sesión expirada");
    logout();
  }, ms); 
}

function saveToken(t) { 
  const d = parseJWT(t); 
  ADMIN_TOKEN = t; 
  ADMIN_EXP = d.exp || 0; 
  localStorage.setItem("admin_token", t); 
  setAuthUI(true); 
  scheduleExpiry(); 
}

function loadToken() { 
  const t = localStorage.getItem("admin_token"); 
  if (!t) { 
    logout(); 
    return false; 
  } 
  const d = parseJWT(t); 
  if (d.exp && d.exp * 1000 < Date.now()) { 
    logout(); 
    return false; 
  } 
  ADMIN_TOKEN = t; 
  ADMIN_EXP = d.exp || 0; 
  setAuthUI(true); 
  scheduleExpiry(); 
  return true; 
}

function saveApiSecret(s) { 
  if (s && s.length >= 16) {
    API_SECRET_KEY = s; 
    localStorage.setItem("api_secret", s); 
  }
}

function loadApiSecret() { 
  const s = localStorage.getItem("api_secret"); 
  if (s) API_SECRET_KEY = s; 
}

function logout() { 
  ADMIN_TOKEN = null; 
  ADMIN_EXP = 0; 
  localStorage.removeItem("admin_token"); 
  localStorage.removeItem("api_secret"); 
  setAuthUI(false); 
  clearTimer(); 
}

async function fetchJSON(url, options = {}) {
  const headers = { 
    'Content-Type': 'application/json',
    ...options.headers 
  };
  
  if (ADMIN_TOKEN) {
    headers["Authorization"] = `Bearer ${ADMIN_TOKEN}`;
  }
  if (API_SECRET_KEY) {
    headers["X-API-Key"] = API_SECRET_KEY;
  }
  
  showLoader();
  try {
    const r = await fetch(API_URL + url, { 
      ...options, 
      headers, 
      credentials: 'include' 
    });
    
    if (!r.ok) {
      const errorBody = await r.text();
      console.error(`Error ${r.status}: ${errorBody}`);
      if (r.status === 401) {
        showError("Sesión expirada");
        logout();
      }
      throw new Error(errorBody || `Error ${r.status}`);
    }

    return await r.json();
  } catch (e) {
    console.error("Fetch error:", e);
    throw e;
  } finally {
    hideLoader();
  }
}

async function login() {
  const pass = document.getElementById("password")?.value;
  const apiSecret = document.getElementById("apiSecret")?.value;
  
  if (!pass || pass.length < 8) {
    showError("La contraseña debe tener al menos 8 caracteres");
    return;
  }
  
  if (!apiSecret || apiSecret.length < 16) {
    showError("La clave API debe tener al menos 16 caracteres");
    return;
  }
  
  saveApiSecret(apiSecret);
  
  try {
    const res = await fetchJSON("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ password: pass })
    });
    
    if (!res.token) {
      throw new Error("No se recibió token de autenticación");
    }
    
    saveToken(res.token);
    await initTurnstileAndRefresh();
  } catch (e) {
    showError(e.message.includes("401") ? 
      "Credenciales incorrectas" : 
      "Error de conexión: " + e.message);
  }
}

async function initTurnstileAndRefresh() {
  try {
    await window.__tsGate.ensure();
    await refreshList();
  } catch (e) {
    console.error("Turnstile or list refresh failed:", e);
    showError("Error de verificación de seguridad");
  }
}

async function refreshList() {
  if (!await ensureAuth()) return;
  
  try {
    const r = await fetchJSON("/api/episodes");
    const list = document.getElementById("list");
    if (!list) return;
    
    list.innerHTML = "";
    const tpl = document.getElementById("listTpl");
    
    r.items.forEach(ep => {
      const row = tpl.content.cloneNode(true);
      const rowElem = row.querySelector(".episodeRow");
      rowElem.dataset.id = ep.episodio;
      
      row.querySelector(".epNum").textContent = ep.episodio;
      row.querySelector(".epTitle").textContent = ep.titulo;
      row.querySelector(".epDate").textContent = new Date(ep.fecha).toLocaleDateString();
      
      row.querySelector(".editBtn").addEventListener("click", () => editEpisode(ep.episodio));
      row.querySelector(".delBtn").addEventListener("click", () => confirmDelete(ep.episodio));
      
      list.appendChild(row);
    });
  } catch (e) {
    showError("Error al cargar episodios", "loginMsg");
  }
}

async function ensureAuth() {
  if (!ADMIN_TOKEN) {
    logout();
    return false;
  }
  
  try {
    await fetchJSON("/api/admin/me");
    return true;
  } catch {
    logout();
    return false;
  }
}

function readForm() {
  const form = document.getElementById("formAdd");
  if (!form) return {};
  
  return {
    episodio: parseInt(form.epNum.value, 10),
    titulo: form.epTitle.value.trim(),
    fecha: form.epDate.value,
    embed: form.epEmbed.value.trim(),
    dl1080: form.epDl1080.value.trim(),
    dl720: form.epDl720.value.trim(),
    dl480: form.epDl480.value.trim()
  };
}

function fillForm(ep) {
  const form = document.getElementById("formAdd");
  if (!form) return;
  
  form.epNum.value = ep.episodio;
  form.epTitle.value = ep.titulo;
  form.epDate.value = ep.fecha;
  form.epEmbed.value = ep.embed || "";
  form.epDl1080.value = ep.dl1080 || "";
  form.epDl720.value = ep.dl720 || "";
  form.epDl480.value = ep.dl480 || "";
  
  form.epNum.disabled = true;
}

function validateEpisode(ep) {
  if (!ep.episodio || isNaN(ep.episodio) || ep.episodio <= 0) {
    showError("Número de episodio inválido", "loginMsg");
    return false;
  }
  
  if (!ep.titulo || ep.titulo.length < 3) {
    showError("Título debe tener al menos 3 caracteres", "loginMsg");
    return false;
  }
  
  if (!ep.fecha) {
    showError("Fecha requerida", "loginMsg");
    return false;
  }
  
  return true;
}

async function editEpisode(id) {
  if (!await ensureAuth()) return;
  
  try {
    const ep = await fetchJSON("/api/episodes/" + id);
    fillForm(ep);
  } catch (e) {
    showError("Error al cargar episodio", "loginMsg");
  }
}

function confirmDelete(id) {
  if (!confirm(`¿Eliminar el episodio ${id}? Esta acción no se puede deshacer.`)) return;
  delEpisode(id);
}

async function delEpisode(epn) {
  if (!await ensureAuth()) return;
  const id = parseInt(epn, 10);
  if (!id || isNaN(id)) return;
  
  try {
    await fetchJSON("/api/admin/episodes/" + id, {
      method: "DELETE"
    });
    await refreshList();
    showError("", "loginMsg"); 
  } catch (e) {
    showError("Error al eliminar episodio", "loginMsg");
  }
}

async function addOrUpdate(e) {
  e.preventDefault();
  if (!await ensureAuth()) return;
  
  const ep = readForm();
  if (!validateEpisode(ep)) return;
  
  try {
    const isUpdate = document.getElementById("epNum").disabled;
    const method = isUpdate ? "PUT" : "POST";
    const url = isUpdate ? `/api/admin/episodes/${ep.episodio}` : `/api/admin/episodes`;
    
    await fetchJSON(url, {
      method: method,
      body: JSON.stringify(ep)
    });
    
    document.getElementById("formAdd").reset();
    document.getElementById("epNum").disabled = false;
    await refreshList();
    showError("", "loginMsg"); 
  } catch (e) {
    showError(e.message.includes("409") ? 
      "El episodio ya existe" : 
      "Error al guardar: " + e.message, 
    "loginMsg");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadApiSecret();
  if (loadToken()) {
    initTurnstileAndRefresh();
  }
  
  document.getElementById("btnLogin")?.addEventListener("click", login);
  document.getElementById("btnLogout")?.addEventListener("click", logout);
  document.getElementById("formAdd")?.addEventListener("submit", addOrUpdate);
  
  document.getElementById("password")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") login();
  });
  
  document.getElementById("apiSecret")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") login();
  });
});