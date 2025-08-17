let ADMIN_TOKEN=null,ADMIN_EXP=0,EXP_TIMER=null;
const loader=document.getElementById("loader");
function showLoader(){if(loader)loader.style.display="block"}function hideLoader(){if(loader)loader.style.display="none"}
function b64url(s){return s.replace(/-/g,"+").replace(/_/g,"/")}
function parseJWT(t){try{const p=t.split(".")[1];return JSON.parse(atob(b64url(p)))}catch{return {}}}
function clearTimer(){if(EXP_TIMER){clearTimeout(EXP_TIMER);EXP_TIMER=null}}
function scheduleExpiry(){clearTimer();const ms=Math.max(0,(ADMIN_EXP*1000)-Date.now());EXP_TIMER=setTimeout(()=>{logout()},ms)}
function saveToken(t){const d=parseJWT(t);ADMIN_TOKEN=t;ADMIN_EXP=d.exp||0;localStorage.setItem("admin_token",t);scheduleExpiry();const i=document.getElementById("tokenInfo");if(i)i.textContent="Sesión activa";const o=document.getElementById("btnLogout");if(o)o.classList.remove("hidden");const b=document.getElementById("loginBox");if(b)b.classList.add("hidden");const tabs=document.getElementById("tabs");if(tabs)tabs.classList.remove("hidden")}
function loadToken(){const t=localStorage.getItem("admin_token");if(!t)return;const d=parseJWT(t);if((d.exp||0)*1000>Date.now()){ADMIN_TOKEN=t;ADMIN_EXP=d.exp||0;scheduleExpiry();const i=document.getElementById("tokenInfo");if(i)i.textContent="Sesión activa";const o=document.getElementById("btnLogout");if(o)o.classList.remove("hidden");const b=document.getElementById("loginBox");if(b)b.classList.add("hidden");const tabs=document.getElementById("tabs");if(tabs)tabs.classList.remove("hidden")}else{localStorage.removeItem("admin_token")}}
function logout(){ADMIN_TOKEN=null;ADMIN_EXP=0;localStorage.removeItem("admin_token");clearTimer();const i=document.getElementById("tokenInfo");if(i)i.textContent="No autenticado";const o=document.getElementById("btnLogout");if(o)o.classList.add("hidden");const b=document.getElementById("loginBox");if(b)b.classList.remove("hidden");const tabs=document.getElementById("tabs");if(tabs)tabs.classList.add("hidden")}
async function fetchJSON(url,opts={}){const h=Object.assign({},opts.headers||{});if(ADMIN_TOKEN)h.Authorization="Bearer "+ADMIN_TOKEN;const r=await fetch(url,Object.assign({credentials:"include",headers:h},opts));if(r.status===401&&ADMIN_TOKEN){logout()}if(!r.ok)throw new Error(String(r.status));const ct=r.headers.get("content-type")||"";return ct.includes("application/json")?r.json():r.text()}
async function login(){const pwd=document.getElementById("password").value||"";if(!pwd)return;showLoader();try{const data=await fetchJSON(API_URL+"/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:pwd})});saveToken(data.token)}catch{const m=document.getElementById("loginMsg");if(m)m.textContent="Error de login"}hideLoader()}
async function listarPublic(){showLoader();try{const res=await fetchJSON(API_URL+"/api/episodes");return res.items||[]}finally{hideLoader()}}
function renderEpisodes(list){const c=document.getElementById("list");c.innerHTML="";const frag=document.createDocumentFragment();list.forEach(ep=>{const row=document.createElement("div");row.className="episodeRow";const epn=ep.episodio??ep.id;const title=ep.titulo??ep.title??"";row.innerHTML=`<span>#${epn} - ${title}</span><div class="actions"><button class="editBtn" data-ep="${epn}">Editar</button><button class="delBtn" data-ep="${epn}">Eliminar</button></div>`;frag.appendChild(row)});c.appendChild(frag);c.querySelectorAll(".delBtn").forEach(b=>b.addEventListener("click",()=>delEpisode(b.dataset.ep)));c.querySelectorAll(".editBtn").forEach(b=>b.addEventListener("click",()=>loadToForm(b.dataset.ep)))}
async function refreshList(){const items=await listarPublic();renderEpisodes(items)}
function readForm(){
	const episodio = parseInt(document.getElementById("epNum").value, 10);
	return {
		episodio: isNaN(episodio) ? undefined : episodio,
		titulo: document.getElementById("epTitle").value || "",
		fecha: document.getElementById("epDate").value || "",
		embed: document.getElementById("epEmbed").value || "",
		dl1080: document.getElementById("epDl1080").value || "",
		dl720: document.getElementById("epDl720").value || "",
		dl480: document.getElementById("epDl480").value || ""
	};
}
function writeForm(ep){document.getElementById("epNum").value=ep.episodio??ep.id??"";document.getElementById("epTitle").value=ep.titulo??ep.title??"";document.getElementById("epDate").value=ep.fecha??"";document.getElementById("epEmbed").value=ep.embed??"";document.getElementById("epDl1080").value=ep.dl1080??"";document.getElementById("epDl720").value=ep.dl720??"";document.getElementById("epDl480").value=ep.dl480??""}
async function loadToForm(epn){const num=Number(epn);const items=await listarPublic();const ep=items.find(x=>(x.episodio??x.id)==num);if(ep)writeForm(ep)}
async function addOrUpdate(e){e.preventDefault();if(!ADMIN_TOKEN)return;const p=readForm();if(!p.episodio||!p.titulo||!p.fecha||!p.embed)return;showLoader();try{const id=p.episodio;await fetchJSON(API_URL+"/api/admin/episodes/"+id,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(p)})}catch{try{await fetchJSON(API_URL+"/api/admin/episodes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(p)})}catch{}}hideLoader();document.getElementById("formAdd").reset();await refreshList()}
async function delEpisode(epn){if(!ADMIN_TOKEN)return;const id=Number(epn);if(!id)return;showLoader();try{await fetchJSON(API_URL+"/api/admin/episodes/"+id,{method:"DELETE"})}finally{hideLoader();refreshList()}}
document.addEventListener("DOMContentLoaded",()=>{loadToken();const bL=document.getElementById("btnLogin");if(bL)bL.addEventListener("click",login);const bO=document.getElementById("btnLogout");if(bO)bO.addEventListener("click",logout);const f=document.getElementById("formAdd");if(f)f.addEventListener("submit",addOrUpdate);if(ADMIN_TOKEN)refreshList()});
