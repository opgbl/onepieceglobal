const API_URL = "https://opapi.onrender.com";

const $$ = (sel, p = document) => Array.from(p.querySelectorAll(sel));
const $ = (sel, p = document) => p.querySelector(sel);

let TOKEN = null;
let TOKEN_EXP = null;

function setToken(tok, expSec = 24 * 3600) {
  TOKEN = tok;
  TOKEN_EXP = Date.now() + expSec * 1000;
  localStorage.setItem("opg_jwt", tok);
  localStorage.setItem("opg_jwt_exp", String(TOKEN_EXP));
  updateAuthUI();
}

function loadToken() {
  TOKEN = localStorage.getItem("opg_jwt");
  TOKEN_EXP = Number(localStorage.getItem("opg_jwt_exp") || 0);
  if (!TOKEN || !TOKEN_EXP || Date.now() > TOKEN_EXP) {
    clearToken();
    return;
  }
  updateAuthUI();
}

function clearToken() {
  TOKEN = null;
  TOKEN_EXP = null;
  localStorage.removeItem("opg_jwt");
  localStorage.removeItem("opg_jwt_exp");
  updateAuthUI();
}

function authHeaders(extra = {}) {
  const h = { "Content-Type": "application/json" };
  if (TOKEN) h["Authorization"] = "Bearer " + TOKEN;
  return { ...h, ...extra };
}

function setMsg(el, text, ok = false) {
  if (!el) return;
  el.textContent = text || "";
  el.style.color = ok ? "#3fb950" : text ? "#f85149" : "";
}

function updateAuthUI() {
  const chip = $("#tokenInfo");
  const boxLogin = $("#loginBox");
  const blockTabs = $("#tabs");
  const btnLogout = $("#btnLogout");

  if (!chip || !boxLogin || !blockTabs || !btnLogout) return;

  if (TOKEN) {
    const remaining = Math.max(0, Math.floor((TOKEN_EXP - Date.now()) / 1000));
    const h = Math.floor(remaining / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    chip.textContent = `Autenticado · expira en ${h}h ${m}m`;
    chip.classList.add("ok");
    btnLogout.classList.remove("hidden");
    boxLogin.classList.add("hidden");
    blockTabs.classList.remove("hidden");
  } else {
    chip.textContent = "No autenticado";
    chip.classList.remove("ok");
    btnLogout.classList.add("hidden");
    boxLogin.classList.remove("hidden");
    blockTabs.classList.add("hidden");
  }
}

async function fetchJSON(url, opts = {}) {
  const r = await fetch(url, opts);
  const isJson = r.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await r.json().catch(() => ({})) : null;
  if (!r.ok) throw new Error((data && data.error) || `HTTP ${r.status}`);
  return data;
}

async function login() {
  const pwd = $("#password")?.value || "";
  const out = $("#loginMsg");
  try {
    const data = await fetchJSON(API_URL + "/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pwd }),
    });
    setToken(data.token, data.expires_in || 86400);
    setMsg(out, "OK", true);
    await recargarListas();
  } catch (e) {
    setMsg(out, e.message);
  }
}

async function getPublicEpisodes() {
  const j = await fetchJSON(API_URL + "/api/episodes");
  return j.items || [];
}

function toAdminPayload(prefix) {
  const get = (id) => $("#" + prefix + id)?.value.trim() || "";
  return {
    episodio: get("-episodio"),
    titulo: get("-titulo"),
    fecha: get("-fecha"),
    embed: get("-embed"),
    dl1080: get("-dl1080"),
    dl720: get("-dl720"),
    dl480: get("-dl480"),
  };
}

async function recargarListas() {
  const list = await getPublicEpisodes();

  const cont = $("#list");
  if (cont) {
    cont.innerHTML = "";
    const term = ($("#q")?.value || "").trim().toLowerCase();
    list
      .filter((e) => {
        const id = String(e.episodio ?? e.id);
        const title = (e.titulo ?? e.title ?? "").toLowerCase();
        return !term || id.includes(term) || title.includes(term);
      })
      .forEach((e) => {
        const row = document.createElement("div");
        row.className = "row";
        const id = e.episodio ?? e.id;
        const title = e.titulo ?? e.title ?? "";
        row.innerHTML = `<div class="cell">#${id}</div><div class="cell">${title}</div>
          <div class="cell">
            <button class="btn tiny" data-copy="/onepieceglobal/video.html?id=${id}">Copiar link</button>
          </div>`;
        cont.appendChild(row);
      });
  }

  const selEdit = $("#edit-select");
  const selDel = $("#del-select");
  if (selEdit && selDel) {
    selEdit.innerHTML = "";
    selDel.innerHTML = "";
    selEdit.appendChild(new Option("Selecciona", ""));
    selDel.appendChild(new Option("Selecciona", ""));
    list.forEach((e) => {
      const text = `${e.episodio ?? e.id} - ${(e.titulo ?? e.title) || ""}`;
      const opt1 = new Option(text, String(e.episodio ?? e.id));
      const opt2 = new Option(text, String(e.episodio ?? e.id));
      selEdit.appendChild(opt1);
      selDel.appendChild(opt2);
    });
  }
}

async function publicar() {
  const msg = $("#pubMsg");
  try {
    const payload = toAdminPayload("pub");
    const data = await fetchJSON(API_URL + "/api/admin/episodes", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    setMsg(msg, "Publicado ID " + (data.id || data.episodio), true);
    await recargarListas();
  } catch (e) {
    setMsg(msg, e.message);
  }
}

async function cargarSeleccionParaEditar() {
  const sel = $("#edit-select")?.value;
  const msg = $("#editMsg");
  if (!sel) {
    setMsg(msg, "Selecciona un episodio");
    return;
  }
  const list = await getPublicEpisodes();
  const ep = list.find((e) => String(e.episodio ?? e.id) === String(sel));
  if (!ep) {
    setMsg(msg, "No encontrado");
    return;
  }
  const set = (id, v) => { const el = $("#edit" + id); if (el) el.value = v || ""; };
  ($("#edit-episodio") || {}).value = ep.episodio ?? ep.id ?? "";
  ($("#edit-titulo") || {}).value = ep.titulo ?? ep.title ?? "";
  ($("#edit-fecha") || {}).value = ep.fecha ?? "";
  ($("#edit-embed") || {}).value = ep.embed ?? "";
  ($("#edit-dl1080") || {}).value = ep.dl1080 ?? "";
  ($("#edit-dl720") || {}).value = ep.dl720 ?? "";
  ($("#edit-dl480") || {}).value = ep.dl480 ?? "";
  setMsg(msg, "");
}

async function guardarEdicion() {
  const sel = $("#edit-select")?.value;
  const msg = $("#editMsg");
  if (!sel) {
    setMsg(msg, "Selecciona un episodio");
    return;
  }
  try {
    const payload = toAdminPayload("edit");
    await fetchJSON(API_URL + "/api/admin/episodes/" + encodeURIComponent(sel), {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    setMsg(msg, "Guardado", true);
    await recargarListas();
  } catch (e) {
    setMsg(msg, e.message);
  }
}

async function eliminar() {
  const sel = $("#del-select")?.value;
  const msg = $("#delMsg");
  if (!sel) {
    setMsg(msg, "Selecciona un episodio");
    return;
  }
  if (!confirm("¿Eliminar episodio " + sel + "?")) return;
  const headers = authHeaders();
  const apikey = $("#del-apikey")?.value.trim();
  if (apikey) headers["X-API-SECRET"] = apikey;
  try {
    await fetchJSON(API_URL + "/api/admin/episodes/" + encodeURIComponent(sel), {
      method: "DELETE",
      headers,
    });
    setMsg(msg, "Eliminado", true);
    await recargarListas();
  } catch (e) {
    setMsg(msg, e.message);
  }
}

function bindTabs() {
  $$(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".tab").forEach((b) => b.classList.remove("active"));
      $$(".tabpane").forEach((p) => p.classList.add("hidden"));
      btn.classList.add("active");
      const pane = $("#" + btn.dataset.tab);
      if (pane) pane.classList.remove("hidden");
    });
  });
}

function bindListActions() {
  $("#btnRecargar")?.addEventListener("click", recargarListas);
  $("#q")?.addEventListener("input", recargarListas);
  $("#list")?.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-copy]");
    if (!btn) return;
    const path = btn.getAttribute("data-copy");
    const url = location.origin + path;
    navigator.clipboard.writeText(url).then(() => {
      const prev = btn.textContent;
      btn.textContent = "Copiado";
      setTimeout(() => (btn.textContent = prev), 1000);
    });
  });
}

function bindUI() {
  bindTabs();
  bindListActions();
  $("#btnLogin")?.addEventListener("click", login);
  $("#btnLogout")?.addEventListener("click", clearToken);
  $("#btnPublicar")?.addEventListener("click", publicar);
  $("#edit-select")?.addEventListener("change", cargarSeleccionParaEditar);
  $("#btnGuardar")?.addEventListener("click", guardarEdicion);
  $("#btnEliminar")?.addEventListener("click", eliminar);
}

async function init() {
  loadToken();
  bindUI();
  try { await recargarListas(); } catch {}
}

window.addEventListener("DOMContentLoaded", init);
