const loader=document.getElementById("loader");
function showLoader(){loader.style.display="block"}function hideLoader(){loader.style.display="none"}

async function load(){
  showLoader();
  await window.__tsGate.ensure();
  const p=new URLSearchParams(location.search);
  const id=p.get("id");
  const key="ep_"+id;
  let ep=null;
  const c=sessionStorage.getItem(key);
  if(c){try{ep=JSON.parse(c)}catch{}}
  if(!ep){
    const r=await fetch(API_URL+"/api/episodes/"+id,{credentials:"include",cache:"no-store"});
    if(!r.ok){hideLoader();document.getElementById("title").textContent="No encontrado";return}
    ep=await r.json();
    sessionStorage.setItem(key,JSON.stringify(ep));
  }
  hideLoader();
  const title=document.getElementById("title");
  title.textContent="Episodio "+(ep.episodio??id)+": "+(ep.titulo||"");
  const dls=document.getElementById("dls");
  dls.innerHTML="";
  if(ep.dl1080){const a=document.createElement("a");a.className="btn";a.textContent="Descargar 1080p";a.href=ep.dl1080;dls.appendChild(a)}
  if(ep.dl720){const a=document.createElement("a");a.className="btn";a.textContent="Descargar 720p";a.href=ep.dl720;dls.appendChild(a)}
  if(ep.dl480){const a=document.createElement("a");a.className="btn";a.textContent="Descargar 480p";a.href=ep.dl480;dls.appendChild(a)}
  const box=document.getElementById("embedBox");
  box.textContent="";
  if(ep.embed){
    const iframe=document.createElement("iframe");
    iframe.width="100%";iframe.height="360";
    iframe.src=ep.embed;
    iframe.allow="autoplay; fullscreen; picture-in-picture";
    iframe.frameBorder="0";
    box.appendChild(iframe);
  }
}

document.addEventListener("DOMContentLoaded",load);