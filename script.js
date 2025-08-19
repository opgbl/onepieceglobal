const app = document.getElementById("app");
const loader = document.getElementById("loader");
const header = document.querySelector("header.topbar");

function showLoader() { loader.style.display = "block"; }
function hideLoader() { loader.style.display = "none"; }
function showError(message) {
  const errorEl = document.createElement('div');
  errorEl.className = 'notice error';
  errorEl.textContent = message;
  app.appendChild(errorEl);
}

const CACHE = {};
async function fetchData(url) {
  if (CACHE[url]) return CACHE[url];
  showLoader();
  try {
    const r = await fetch(API_URL + url, { credentials: "include", cache: "no-store" });
    if (r.status === 401) {
      await window.__tsGate.ensure();
      const retry = await fetch(API_URL + url, { credentials: "include", cache: "no-store" });
      if (!retry.ok) throw new Error(`API error ${retry.status}`);
      const data = await retry.json();
      CACHE[url] = data;
      return data;
    }
    if (!r.ok) throw new Error(`API error ${r.status}`);
    const data = await r.json();
    CACHE[url] = data;
    return data;
  } catch (e) {
    showError(e.message.includes('401') ? "Requiere verificación" : "Error del servidor");
    throw e;
  } finally {
    hideLoader();
  }
}

async function router() {
  const BASE = location.pathname.split('/').slice(0, -1).join('/') || '/';
  const params = new URLSearchParams(location.search);
  const pathParam = params.get("path");
  const pathname = pathParam || location.pathname.replace(BASE, '');
  
  app.innerHTML = "";
  header.innerHTML = "";
  
  if (pathname === '/' || pathname === '/index.html') {
    await renderHome();
  } else if (pathname.startsWith("/episodio/")) {
    const parts = pathname.split("/");
    if (parts.length > 2) {
      const episodeId = parts[2];
      await renderEpisode(episodeId);
    } else {
      showNotFound();
    }
  } else {
    showNotFound();
  }

  if (pathParam) {
    history.replaceState(null, "", BASE + pathname);
  }
}

function showNotFound() {
  app.innerHTML = '<p class="notice">Página no encontrada.</p>';
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

  try {
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
  } catch (e) {
    showError("No se pudieron cargar los episodios");
  }
}

function renderGrid(list, container) {
  container.innerHTML = "";
  const tpl = document.getElementById("card-tpl");
  const frag = document.createDocumentFragment();
  
  list.forEach(item => {
    const node = tpl.content.cloneNode(true);
    const ep = item.episodio ?? item.id;
    node.querySelector(".title").textContent = `Episodio ${ep}: ${item.titulo ?? item.title ?? ""}`;
    
    const qwrap = node.querySelector(".qualities");
    ['dl1080', 'dl720', 'dl480'].forEach(quality => {
      if (item[quality]) {
        const s = document.createElement("span");
        s.className = "chip";
        s.textContent = quality.replace('dl', '') + 'p';
        qwrap.appendChild(s);
      }
    });

    const btn = node.querySelector("[data-link]");
    btn.href = `episodio/${ep}`;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      history.pushState(null, "", btn.href);
      router();
    });
    frag.appendChild(node);
  });
  container.appendChild(frag);
}

async function renderEpisode(id) {
  const BASE = location.pathname.split('/').slice(0, -1).join('/') || '/';
  header.innerHTML = `<a href="${BASE}/" class="back" data-link>← Volver</a><h1 id="title">Episodio</h1>`;
  document.querySelector("[data-link]").addEventListener("click", (e) => {
    e.preventDefault();
    history.pushState(null, "", e.target.href);
    router();
  });
  
  const videoPlayer = document.createElement("div");
  videoPlayer.className = "player";
  videoPlayer.innerHTML = `
    <div class="video-box">
      <div id="embedBox">Cargando…</div>
    </div>
    <div id="dls"></div>
  `;
  app.appendChild(videoPlayer);
  
  try {
    const ep = await fetchData(`/api/episodes/${id}`);
    const title = document.getElementById("title");
    title.textContent = `Episodio ${ep.episodio ?? id}: ${ep.titulo || ""}`;
    
    const dls = document.getElementById("dls");
    dls.innerHTML = "";
    ['dl1080', 'dl720', 'dl480'].forEach(quality => {
      if (ep[quality]) {
        const a = document.createElement("a");
        a.className = "btn";
        a.textContent = `Descargar ${quality.replace('dl', '')}p`;
        a.href = ep[quality];
        a.target = "_blank";
        dls.appendChild(a);
      }
    });
    
    const box = document.getElementById("embedBox");
    box.textContent = "";
    if (ep.embed) {
      const iframe = document.createElement("iframe");
      iframe.width = "100%";
      iframe.height = "360";
      iframe.src = ep.embed;
      iframe.allow = "autoplay; fullscreen; picture-in-picture";
      iframe.frameBorder = "0";
      iframe.allowFullscreen = true;
      box.appendChild(iframe);
    }
  } catch (e) {
    showError("No se pudo cargar el episodio");
  }
}

document.addEventListener("DOMContentLoaded", router);
window.addEventListener("popstate", router);