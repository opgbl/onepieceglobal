const loader=document.getElementById("loader");
const titleEl=document.getElementById("title");
const embedBox=document.getElementById("embedBox");
const dls=document.getElementById("dls");

function show(){loader.style.display="block"}
function hide(){loader.style.display="none"}

function getId(){const u=new URL(location.href);return u.searchParams.get("id")||u.searchParams.get("ep")||u.searchParams.get("chapter")}

function makeDl(label,href){const a=document.createElement("a");a.className="btn";a.textContent=label;a.href=href;a.target="_blank";a.rel="noopener noreferrer";return a}

async function getEpisode(id){
  const tries=[`/episode?id=${encodeURIComponent(id)}`,`/episodes/${encodeURIComponent(id)}`,`/v1/episode?id=${encodeURIComponent(id)}`];
  for(const t of tries){try{const json=await apiGet(t);if(json&&typeof json==="object")return json}catch(e){}}
  throw new Error("No se pudo cargar el episodio.");
}

function embed(ep){
  embedBox.textContent="";
  if(ep.embed){const ifr=document.createElement("iframe");ifr.src=ep.embed;ifr.allow="autoplay; fullscreen; picture-in-picture";ifr.allowFullscreen=true;ifr.referrerPolicy="no-referrer";embedBox.appendChild(ifr);return}
  if(ep.file||ep.m3u8){const v=document.createElement("video");v.controls=true;v.playsInline=true;v.src=ep.file||ep.m3u8;embedBox.appendChild(v);return}
  embedBox.innerHTML='<p class="notice">Sin fuente de video.</p>';
}

async function init(){
  show();
  try{
    await (window.__tsGate?window.__tsGate.ensure():Promise.resolve());
    const id=getId();
    if(!id) throw new Error("Falta id");
    const ep=await getEpisode(id);
    titleEl.textContent=ep.title||ep.titulo||("Capítulo "+(ep.episode||ep.number||id));
    embed(ep);
    dls.textContent="";
    if(ep.dl1080)dls.appendChild(makeDl("Descargar 1080p",ep.dl1080));
    if(ep.dl720)dls.appendChild(makeDl("Descargar 720p",ep.dl720));
    if(ep.dl480)dls.appendChild(makeDl("Descargar 480p",ep.dl480));
  }catch(e){
    embedBox.innerHTML='<p class="error-message">Error cargando el episodio.</p>';
  }finally{hide()}
}
document.addEventListener("DOMContentLoaded",init);