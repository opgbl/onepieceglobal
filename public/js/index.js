const grid=document.getElementById("grid");
const search=document.getElementById("search");
const loader=document.getElementById("loader");

function show(){loader.style.display="block"}
function hide(){loader.style.display="none"}

function numFrom(x){if(x==null)return-1; if(typeof x==="number")return x; const s=String(x);const m=s.match(/(\d{1,5})/);return m?parseInt(m[1],10):-1}
function idFrom(it){return it.id||it._id||it.slug||it.href||String(numFrom(it))}
function titleOf(it){return it.title||it.titulo||it.name||("Capítulo "+numFrom(it))}

function makeCard(it){
  const a=document.createElement("a");
  a.className="card";
  a.href="video.html?id="+encodeURIComponent(idFrom(it));
  const img=document.createElement("img");img.className="thumb";img.src="assets/images/image.png";img.alt=titleOf(it);
  const h=document.createElement("h3");h.className="title";h.textContent=titleOf(it);
  const qs=document.createElement("div");qs.className="qualities";
  const qsList=it.qualities||it.q||it.qs||[];
  const flags=[["1080p",it.dl1080||it["1080p"]||qsList.includes("1080p")],["720p",it.dl720||it["720p"]||qsList.includes("720p")],["480p",it.dl480||it["480p"]||qsList.includes("480p")]];
  for(const [label,ok] of flags){if(ok){const c=document.createElement("span");c.className="chip";c.textContent=label;qs.appendChild(c)}}
  a.appendChild(img);a.appendChild(h);a.appendChild(qs);
  return a;
}

async function getList(){
  const endpoints=["/episodes","/api/episodes","/v1/episodes","/catalog","/list"];
  for(const ep of endpoints){
    try{const json=await apiGet(ep);if(Array.isArray(json)&&json.length){return json}}catch(e){}
  }
  throw new Error("No se pudo obtener el catálogo.");
}

function render(list){
  grid.textContent="";
  const txt=(search.value||"").toLowerCase();
  let arr=[...list];
  arr=arr.filter(it=>titleOf(it).toLowerCase().includes(txt));
  arr.sort((a,b)=>numFrom(a)-numFrom(b));
  for(const it of arr){grid.appendChild(makeCard(it))}
}

async function init(){
  show();
  try{
    await (window.__tsGate?window.__tsGate.ensure():Promise.resolve());
    const list=await getList();
    render(list);
    search.addEventListener("input",()=>render(list));
  }catch(e){
    grid.innerHTML='<p class="notice">No se pudo cargar el catálogo.</p>';
  }finally{hide()}
}

document.addEventListener("DOMContentLoaded",init);