const SITE_KEY = "0x4AAAAAABshM3tkI6jl4RQn";

let tsReady = false, tsWidget = null, tsExec = false, tsPromise = null;

function mountTS(){
  if(tsWidget) return;
  tsWidget = turnstile.render("#ts", {
    sitekey: SITE_KEY,
    size: "invisible",
    callback: async (token) => {
      const r = await fetch(API_URL + "/api/verify-turnstile", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });
      tsReady = r.ok;
    }
  });
}

async function ensureTurnstile(){
  if(tsReady) return;
  if(tsPromise) return tsPromise;
  tsPromise = (async()=>{
    mountTS();
    if(tsExec) turnstile.reset(tsWidget);
    tsExec = true;
    turnstile.execute(tsWidget);
    const t0 = Date.now();
    while(!tsReady && Date.now()-t0 < 8000) await new Promise(r=>setTimeout(r,120));
    tsExec = false;
    if(!tsReady) throw new Error("Turnstile timeout");
  })().finally(()=>{ tsPromise=null });
  return tsPromise;
}

async function fetchEpisodes(){
  await ensureTurnstile();
  const r = await fetch(API_URL + "/api/episodes", { credentials: "include" });
  if(!r.ok) return;
  const eps = await r.json();
  const list = document.getElementById("episodes");
  list.innerHTML = "";
  eps.forEach(ep=>{
    const a = document.createElement("a");
    a.className = "card";
    a.href = "./video.html?id=" + ep._id;
    a.innerHTML = `
      <img src="./assets/images/image.png" alt="Episodio ${ep.episodio}">
      <div class="info">
        <h3>Episodio ${ep.episodio}</h3>
        <p>${ep.titulo || ""}</p>
      </div>`;
    list.appendChild(a);
  });
}

function init(){
  fetchEpisodes();
}

document.addEventListener("DOMContentLoaded", init);
