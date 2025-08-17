let ADMIN_TOKEN=null,ADMIN_EXP=0,EXP_TIMER=null;
const loader=document.getElementById("loader");
function showLoader(){loader.style.display="block"}function hideLoader(){loader.style.display="none"}
function b64url(s){return s.replace(/-/g,"+").replace(/_/g,"/")}
function parseJWT(t){const p=t.split(".")[1];return JSON.parse(atob(b64url(p)))}
function updateAuthState(){document.getElementById("authState").textContent=ADMIN_TOKEN?"Sesión activa":"Sin sesión"}
function clearTimer(){if(EXP_TIMER){clearTimeout(EXP_TIMER);EXP_TIMER=null}}
function scheduleExpiry(){clearTimer();const ms=Math.max(0,ADMIN_EXP*1000-Date.now());EXP_TIMER=setTimeout(()=>{logout()},ms)}
function saveToken(t){const d=parseJWT(t);ADMIN_TOKEN=t;ADMIN_EXP=d.exp||0;localStorage.setItem("admin_token",t);updateAuthState();scheduleExpiry()}
function loadToken(){const t=localStorage.getItem("admin_token");if(!t)return;try{const d=parseJWT(t);if((d.exp||0)*1000>Date.now()){ADMIN_TOKEN=t;ADMIN_EXP=d.exp||0;updateAuthState();scheduleExpiry()}else{localStorage.removeItem("admin_token")}}catch{localStorage.removeItem("admin_token")}}
function logout(){ADMIN_TOKEN=null;ADMIN_EXP=0;localStorage.removeItem("admin_token");clearTimer();updateAuthState()}

async function fetchJSON(url,opts={}){
  const h=Object.assign({},opts.headers||{});
  if(ADMIN_TOKEN)h.Authorization="Bearer "+ADMIN_TOKEN;
  const r=await fetch(url,Object.assign({credentials:"include",headers:h},opts));
  if(r.status===401&&ADMIN_TOKEN){logout()}
  if(!r.ok)throw new Error(String(r.status));
  const ct=r.headers.get("content-type")||"";
  return ct.includes("application/json")?r.json():r.text();
}

async function ensureTS(){showLoader();await window.__tsGate.ensure();hideLoader()}

async function login(){
  const pwd=document.getElementById("pwd").value||"";
  if(!pwd)return;
  showLoader();
  const data=await fetchJSON(API_URL+"/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:pwd})}).finally(hideLoader);
  saveToken(data.token);
}

function formData(){
  const obj={
    episodio:Number(document.getElementById("ep").value||0),
    titulo:document.getElementById("titulo").value||"",
    fecha:document.getElementById("fecha").value||"",
    embed:document.getElementById("embed").value||"",
    dl1080:document.getElementById("dl1080").value||"",
    dl720:document.getElementById("dl720").value||"",
    dl480:document.getElementById("dl480").value||""
  };
  if(!obj.dl1080)delete obj.dl1080;
  if(!obj.dl720)delete obj.dl720;
  if(!obj.dl480)delete obj.dl480;
  return obj;
}

function fillForm(ep){
  document.getElementById("ep").value=ep.episodio||"";
  document.getElementById("titulo").value=ep.titulo||"";
  document.getElementById("fecha").value=ep.fecha||"";
  document.getElementById("embed").value=ep.embed||"";
  document.getElementById("dl1080").value=ep.dl1080||"";
  document.getElementById("dl720").value=ep.dl720||"";
  document.getElementById("dl480").value=ep.dl480||"";
}

async function listar(){
  await ensureTS();
  showLoader();
  const res=await fetchJSON(API_URL+"/api/episodes").finally(hideLoader);
  const items=(res.items||[]).sort((a,b)=>(b.episodio||0)-(a.episodio||0));
  const q=document.getElementById("buscar").value.trim().toLowerCase();
  const data=q?items.filter(e=>(e.titulo||"").toLowerCase().includes(q)||String(e.episodio).includes(q)):items;
  const tb=document.getElementById("tbody");
  tb.innerHTML="";
  const frag=document.createDocumentFragment();
  for(const it of data){
    const tr=document.createElement("tr");
    const t1=document.createElement("td");t1.textContent=it.episodio||"";
    const t2=document.createElement("td");t2.textContent=it.titulo||"";
    const t3=document.createElement("td");t3.textContent=it.fecha||"";
    const t4=document.createElement("td");
    const quals=[];if(it.dl1080)quals.push("1080p");if(it.dl720)quals.push("720p");if(it.dl480)quals.push("480p");t4.textContent=quals.join(" ");
    const t5=document.createElement("td");t5.className="actions";
    const eBtn=document.createElement("button");eBtn.textContent="Editar";eBtn.addEventListener("click",()=>fillForm(it));
    const dBtn=document.createElement("button");dBtn.textContent="Borrar";dBtn.className="secondary";dBtn.addEventListener("click",()=>borrar(it.episodio));
    t5.appendChild(eBtn);t5.appendChild(dBtn);
    tr.appendChild(t1);tr.appendChild(t2);tr.appendChild(t3);tr.appendChild(t4);tr.appendChild(t5);
    frag.appendChild(tr);
  }
  tb.appendChild(frag);
}

async function crear(){
  if(!ADMIN_TOKEN)return;
  const payload=formData();
  if(!payload.episodio||!payload.titulo||!payload.fecha||!payload.embed)return;
  showLoader();
  await fetchJSON(API_URL+"/api/admin/episodes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}).finally(hideLoader);
  await listar();
}

async function actualizar(){
  if(!ADMIN_TOKEN)return;
  const payload=formData();if(!payload.episodio)return;const id=payload.episodio;
  showLoader();
  await fetchJSON(API_URL+"/api/admin/episodes/"+id,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}).finally(hideLoader);
  await listar();
}

async function borrar(id){
  if(!ADMIN_TOKEN||!id)return;
  showLoader();
  await fetchJSON(API_URL+"/api/admin/episodes/"+id,{method:"DELETE"}).finally(hideLoader);
  await listar();
}

function bind(){
  document.getElementById("btnLogin").addEventListener("click",login);
  document.getElementById("btnCrear").addEventListener("click",crear);
  document.getElementById("btnActualizar").addEventListener("click",actualizar);
  document.getElementById("btnRecargar").addEventListener("click",listar);
  document.getElementById("buscar").addEventListener("input",listar);
}

async function init(){
  bind();
  loadToken();
  await listar();
}

document.addEventListener("DOMContentLoaded",init);
