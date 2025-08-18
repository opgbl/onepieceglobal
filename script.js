const app = document.getElementById("app");
const loader = document.getElementById("loader");
const header = document.querySelector("header.topbar");

function showLoader() { loader.style.display = "block"; }
function hideLoader() { loader.style.display = "none"; }

const CACHE = {};
async function fetchData(url) {
  if (CACHE[url]) return CACHE[url];
  showLoader();
  try {
    const r = await fetch(API_URL + url, { credentials: "include", cache: "no-store" });
    if (r.status === 401) {
      await window.__tsGate.ensure();
      const retry = await fetch(API_URL + url, { credentials: "include", cache: "no-store" });
      if (!retry.ok) throw new Error("API error on retry");
      const data = await retry.json();
      CACHE[url] = data;
      return data;
    }
    if (!r.ok) throw new Error("API error");
    const data = await r.json();
    CACHE[url] = data;
    return data;
  } finally {
    hideLoader();
  }
}

async function router() {
  const path = location.pathname.split("/").filter(Boolean);
  app.innerHTML = "";
  header.innerHTML = "";
  
  if (path.length <= 1) {
    renderHome();
  } else if (path[1] === "episodio" && path[2]) {
    const episodeId = path[2];
    renderEpisode(episodeId);
  } else {
    app.innerHTML = '<p class="notice">Página no encontrada.</p>';
  }
}

async function renderHome() {
  header.innerHTML = `
    <h1>One Piece Global</h1>
    <input id="q" placeholder="Buscar episodio..."/>
  `;
  const grid = document.createElement("main");
  grid.id = "grid";
  grid.className = "grid";
  app.appendChild(grid);

  const episodes = await fetchData("/api/episodes");
  renderGrid(episodes.items, grid);
  
  document.getElementById("q").addEventListener("input", (e) => {
    const term = e.target.value.trim().toLowerCase();
    const filtered = episodes.items.filter(ep => 
      (ep.titulo || ep.title || "").toLowerCase().includes(term) || 
      String(ep.episodio || ep.id).includes(term)
    );
    renderGrid(filtered, grid);
  });
}

function renderGrid(list, container) {
  container.innerHTML = "";
  const tpl = document.getElementById("card-tpl");
  const frag = document.createDocumentFragment();
  for (const item of list) {
    const node = tpl.content.cloneNode(true);
    const ep = item.episodio ?? item.id;
    node.querySelector(".title").textContent = `Episodio ${ep}: ${item.titulo ?? item.title ?? ""}`;
    const qwrap = node.querySelector(".qualities");
    if (item.dl1080) { const s = document.createElement("span"); s.className = "chip"; s.textContent = "1080p"; qwrap.appendChild(s); }
    if (item.dl720) { const s = document.createElement("span"); s.className = "chip"; s.textContent = "720p"; qwrap.appendChild(s); }
    if (item.dl480) { const s = document.createElement("span"); s.className = "chip"; s.textContent = "480p"; qwrap.appendChild(s); }
    const btn = node.querySelector("[data-link]");
    btn.href = `./episodio/${ep}`;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      history.pushState(null, "", btn.href);
      router();
    });
    frag.appendChild(node);
  }
  container.appendChild(frag);
}

async function renderEpisode(id) {
  header.innerHTML = `<a href="./" class="back" data-link>← Volver</a><h1 id="title">Episodio</h1>`;
  document.querySelector("[data-link]").addEventListener("click", (e) => {
    e.preventDefault();
    history.pushState(null, "", e.target.href);
    router();
  });
  
  const videoPlayer = document.createElement("div");
  videoPlayer.className = "player";
  videoPlayer.innerHTML = `<div class="video-box"><div id="embedBox">Cargando…</div></div><div id="dls"></div>`;
  app.appendChild(videoPlayer);
  
  try {
    const ep = await fetchData(`/api/episodes/${id}`);
    const title = document.getElementById("title");
    title.textContent = `Episodio ${ep.episodio ?? id}: ${ep.titulo || ""}`;
    
    const dls = document.getElementById("dls");
    dls.innerHTML = "";
    if (ep.dl1080) { const a = document.createElement("a"); a.className = "btn"; a.textContent = "Descargar 1080p"; a.href = ep.dl1080; dls.appendChild(a); }
    if (ep.dl720) { const a = document.createElement("a"); a.className = "btn"; a.textContent = "Descargar 720p"; a.href = ep.dl720; dls.appendChild(a); }
    if (ep.dl480) { const a = document.createElement("a"); a.className = "btn"; a.textContent = "Descargar 480p"; a.href = ep.dl480; dls.appendChild(a); }
    
    const box = document.getElementById("embedBox");
    box.textContent = "";
    if (ep.embed) {
      const iframe = document.createElement("iframe");
      iframe.width = "100%";
      iframe.height = "360";
      iframe.src = ep.embed;
      iframe.allow = "autoplay; fullscreen; picture-in-picture";
      iframe.frameBorder = "0";
      box.appendChild(iframe);
    }
  } catch (e) {
    app.innerHTML = '<p class="notice">Episodio no encontrado.</p>';
  }
}

document.addEventListener("DOMContentLoaded", router);
window.addEventListener("popstate", router);