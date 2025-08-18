let ADMIN_TOKEN=null,ADMIN_EXP=0,EXP_TIMER=null;
const loader=document.getElementById("loader");
function showLoader(){if(loader)loader.style.display="block"}
function hideLoader(){if(loader)loader.style.display="none"}

function b64url(s){return s.replace(/-/g,"+").replace(/_/g,"/")}
function parseJWT(t){try{const p=t.split(".")[1];return JSON.parse(atob(b64url(p)))}catch{return {}}}

function showLogin(){document.getElementById("loginBox")?.classList.remove("hidden");document.getElementById("tabs")?.classList.add("hidden")}
function showPanel(){document.getElementById("loginBox")?.classList.add("hidden");document.getElementById("tabs")?.classList.remove("hidden")}
function setAuthUI(on){const ti=document.getElementById("tokenInfo");if(ti)ti.textContent=on?"Sesión activa":"No autenticado";const out=document.getElementById("btnLogout");if(out)out.classList.toggle("hidden",!on);on?showPanel():showLogin()}

function clearTimer(){if(EXP_TIMER){clearTimeout(EXP_TIMER);EXP_TIMER=null}}
function scheduleExpiry(){clearTimer();const ms=Math.max(0,(ADMIN_EXP*1000)-Date.now());EXP_TIMER=setTimeout(()=>logout(),ms)}
function saveToken(t){const d=parseJWT(t);ADMIN_TOKEN=t;ADMIN_EXP=d.exp||0;localStorage.setItem("admin_token",t);scheduleExpiry();setAuthUI(true)}
function loadToken(){const t=localStorage.getItem("admin_token");if(!t){setAuthUI(false);return}const d=parseJWT(t);if((d.exp||0)*1000>Date.now()){ADMIN_TOKEN=t;ADMIN_EXP=d.exp||0;scheduleExpiry();setAuthUI(true)}else{localStorage.removeItem("admin_token");setAuthUI(false)}}
function logout(){ADMIN_TOKEN=null;ADMIN_EXP=0;localStorage.removeItem("admin_token");clearTimer();setAuthUI(false)}

async function ensureTS(){if(window.__tsGate){showLoader();try{await window.__tsGate.ensure()}finally{hideLoader()}}}

async function fetchJSON(url,opts={},opt2={}){const admin=!!opt2.admin;const h=Object.assign({},opts.headers||{});if(admin&&ADMIN_TOKEN)h.Authorization="Bearer "+ADMIN_TOKEN;const r=await fetch(url,Object.assign({credentials:"include",headers:h},opts));if(r.status===401&&admin){setAuthUI(false);throw new Error("401")}if(!r.ok)throw new Error(String(r.status));const ct=r.headers.get("content-type")||"";return ct.includes("application/json")?r.json():r.text()}

async function login(){const pwd=document.getElementById("password").value||"";if(!pwd)return;await ensureTS();showLoader();try{const data=await fetchJSON(API_URL+"/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:pwd})},{admin:true});saveToken(data.token)}catch(e){const m=document.getElementById("loginMsg");if(m)m.textContent="Error de login"}hideLoader()}

async function listarPublic(){await ensureTS();showLoader();try{const res=await fetchJSON(API_URL+"/api/episodes",{method:"GET"},{admin:false});return res.items||[]}finally{hideLoader()}}

function renderEpisodes(list){const c=document.getElementById("list");if(!c)return;c.innerHTML="";const f=document.createDocumentFragment();list.forEach(ep=>{const n=ep.episodio??ep.id;const t=ep.titulo??ep.title??"";const row=document.createElement("div");row.className="episodeRow";row.dataset.episodio=String(n);row.innerHTML=`<span>#${n} - ${t}</span><div class="actions"><button class="editBtn">Editar</button><button class="delBtn">Eliminar</button></div>`;f.appendChild(row)});c.appendChild(f)}

async function refreshList(){const items=await listarPublic();renderEpisodes(items)}

function readForm(){const n=parseInt(document.getElementById("epNum").value,10);return{episodio:isNaN(n)?undefined:n,titulo:document.getElementById("epTitle").value||"",fecha:document.getElementById("epDate").value||"",embed:document.getElementById("epEmbed").value||"",dl1080:document.getElementById("epDl1080").value||"",dl720:document.getElementById("epDl720").value||"",dl480:document.getElementById("epDl480").value||""}}

function writeForm(ep){document.getElementById("epNum").value=ep.episodio??ep.id??"";document.getElementById("epTitle").value=ep.titulo??ep.title??"";document.getElementById("epDate").value=ep.fecha??"";document.getElementById("epEmbed").value=ep.embed??"";document.getElementById("epDl1080").value=ep.dl1080??"";document.getElementById("epDl720").value=ep.dl720??"";document.getElementById("epDl480").value=ep.dl480??""}

async function loadToForm(epn){const id=parseInt(epn,10);if(!id)return;const items=await listarPublic();const ep=items.find(x=>(x.episodio??x.id)===id);if(ep)writeForm(ep)}

async function ensureAuth(){if(ADMIN_TOKEN)return true;setAuthUI(false);document.getElementById("password")?.focus();return false}

async function addOrUpdate(e){e.preventDefault();if(!await ensureAuth())return;await ensureTS();const p=readForm();if(!p.episodio||!p.titulo||!p.fecha)return;showLoader();try{const id=p.episodio;try{await fetchJSON(API_URL+"/api/admin/episodes/"+id,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(p)},{admin:true})}catch{await fetchJSON(API_URL+"/api/admin/episodes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(p)},{admin:true})}document.getElementById("formAdd").reset();await refreshList()}finally{hideLoader()}}

async function delEpisode(epn){if(!await ensureAuth())return;const id=parseInt(epn,10);if(!id||isNaN(id))return;await ensureTS();showLoader();try{await fetchJSON(API_URL+"/api/admin/episodes/"+id,{method:"DELETE"},{admin:true});await refreshList()}finally{hideLoader()}}

document.addEventListener("DOMContentLoaded",()=>{loadToken();document.getElementById("btnLogin")?.addEventListener("click",login);document.getElementById("btnLogout")?.addEventListener("click",logout);document.getElementById("formAdd")?.addEventListener("submit",addOrUpdate);const list=document.getElementById("list");if(list){list.addEventListener("click",e=>{const btn=e.target.closest("button");if(!btn)return;const row=btn.closest(".episodeRow");const epn=row?row.dataset.episodio:null;if(btn.classList.contains("delBtn"))delEpisode(epn);else if(btn.classList.contains("editBtn"))loadToForm(epn)})}refreshList()});