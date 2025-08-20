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
  const params = new URLSearchParams(location.search);
  let pathParam = params.get("path");

  if (pathParam && !pathParam.startsWith('/')) {
    pathParam = '/' + pathParam;
  }

  const pathname = (pathParam || location.pathname).replace(/\/$/, "") || "/";

  app.innerHTML = "";
  header.innerHTML = "";

  const homePath = '/onepieceglobal';
  const episodePathPrefix = '/onepieceglobal/episodio/';

  if (pathname === homePath || pathname === '/onepieceglobal/index.html' || pathname === '/') {
    renderHome();
  } else if (pathname.startsWith(episodePathPrefix)) {
    const episodeId = pathname.substring(episodePathPrefix.length);
    if (episodeId && !isNaN(episodeId)) {
      renderEpisode(episodeId);
    } else {
      app.innerHTML = '<p class="notice error" role="alert">Página no encontrada.</p>';
    }
  } else {
    app.innerHTML = '<p class="notice error" role="alert">Página no encontrada.</p>';
  }

  if (pathParam) {
    history.replaceState(null, "", location.pathname);
  }
}

async function renderHome() {
  header.innerHTML = `
    <h1>One Piece Global</h1>
    <input id="q" placeholder="Buscar episodio..." aria-label="Buscar episodio por título o número"/>
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
    btn.href = `/onepieceglobal/episodio/${ep}`;
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
  header.innerHTML = `
    <a href="/onepieceglobal/" class="back" data-link aria-label="Volver a la página principal">← Volver</a>
    <h1 id="title" aria-live="polite">Cargando episodio...</h1>
  `;
  document.querySelector("[data-link]").addEventListener("click", (e) => {
    e.preventDefault();
    history.pushState(null, "", e.target.href);
    router();
  });
  
  const playerSection = document.createElement("section");
  playerSection.className = "player";
  playerSection.setAttribute("aria-label", "Reproductor de video y opciones de descarga");
  playerSection.innerHTML = `
    <div class="video-container">
      <div class="video-box">
        <div id="embedBox" aria-live="polite">Cargando video...</div>
      </div>
    </div>
    <div class="episode-info">
      <h2 id="episode-title"></h2>
      <p id="episode-date" class="meta-text"></p>
    </div>
    <div id="dls" class="download-links" role="region" aria-label="Enlaces de descarga"></div>
  `;
  app.appendChild(playerSection);
  
  try {
    const ep = await fetchData(`/api/episodes/${id}`);
    const title = document.getElementById("episode-title");
    const date = document.getElementById("episode-date");
    title.textContent = `Episodio ${ep.episodio ?? id}: ${ep.titulo || ""}`;
    date.textContent = ep.fecha ? `Fecha: ${new Date(ep.fecha).toLocaleDateString()}` : "";
    
    const dls = document.getElementById("dls");
    dls.innerHTML = "";
    const qualities = [
      { res: "1080p", url: ep.dl1080 },
      { res: "720p", url: ep.dl720 },
      { res: "480p", url: ep.dl480 }
    ];
    qualities.forEach(q => {
      if (q.url) {
        const a = document.createElement("a");
        a.className = "btn download-btn";
        a.textContent = `Descargar ${q.res}`;
        a.href = q.url;
        a.setAttribute("aria-label", `Descargar episodio en calidad ${q.res}`);
        a.setAttribute("download", "");
        dls.appendChild(a);
      }
    });
    
    const box = document.getElementById("embedBox");
    box.textContent = "";
    if (ep.embed) {
      const iframe = document.createElement("iframe");
      iframe.width = "100%";
      iframe.height = "100%";
      iframe.src = ep.embed;
      iframe.allow = "autoplay; fullscreen; picture-in-picture";
      iframe.frameBorder = "0";
      iframe.setAttribute("title", `Reproductor de video para Episodio ${ep.episodio}`);
      box.appendChild(iframe);
    } else {
      box.innerHTML = '<p class="notice error" role="alert">No se encontró el video para este episodio.</p>';
    }
  } catch (e) {
    const box = document.getElementById("embedBox");
    box.innerHTML = '<p class="notice error" role="alert">Episodio no encontrado o error al cargar el video.</p>';
  }
}

document.addEventListener("DOMContentLoaded", router);
window.addEventListener("popstate", router);