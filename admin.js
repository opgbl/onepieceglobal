const API_URL="https://opapi.onrender.com";
let ADMIN_TOKEN=null,ADMIN_EXP=0,EXP_TIMER=null;
const loader=document.getElementById("loader");
function showLoader(){if(loader)loader.style.display="block"}function hideLoader(){if(loader)loader.style.display="none"}
function b64url(s){return s.replace(/-/g,"+").replace(/_/g,"/")}
function parseJWT(t){try{const p=t.split(".")[1];return JSON.parse(atob(b64url(p)))}catch{return {}}}
function clearTimer(){if(EXP_TIMER){clearTimeout(EXP_TIMER);EXP_TIMER=null}}
function scheduleExpiry(){clearTimer();const ms=Math.max(0,(ADMIN_EXP*1000)-Date.now());EXP_TIMER=setTimeout(()=>{logout()},ms)}
function saveToken(t){const d=parseJWT(t);ADMIN_TOKEN=t;ADMIN_EXP=d.exp||0;localStorage.setItem("admin_token",t);scheduleExpiry();const el=document.getElementById("tokenInfo");if(el)el.textContent="Sesión activa";const out=document.getElementById("btnLogout");if(out)out.classList.remove("hidden")}
function loadToken(){const t=localStorage.getItem("admin_token");if(!t)return;const d=parseJWT(t);if((d.exp||0)*1000>Date.now()){ADMIN_TOKEN=t;ADMIN_EXP=d.exp||0;scheduleExpiry();const el=document.getElementById("tokenInfo");if(el)el.textContent="Sesión activa";const out=document.getElementById("btnLogout");if(out)out.classList.remove("hidden")}else{localStorage.removeItem("admin_token")}}
function logout(){ADMIN_TOKEN=null;ADMIN_EXP=0;localStorage.removeItem("admin_token");clearTimer();const el=document.getElementById("tokenInfo");if(el)el.textContent="No autenticado";const out=document.getElementById("btnLogout");if(out)out.classList.add("hidden")}
async function fetchJSON(url,opts={}){const h=Object.assign({},opts.headers||{});if(ADMIN_TOKEN)h.Authorization="Bearer "+ADMIN_TOKEN;const r=await fetch(url,Object.assign({credentials:"include",headers:h},opts));if(r.status===401&&ADMIN_TOKEN){logout()}if(!r.ok)throw new Error(String(r.status));const ct=r.headers.get("content-type")||"";return ct.includes("application/json")?r.json():r.text()}
async function ensureTS(){showLoader();await window.__tsGate.ensure();hideLoader()}
async function login(){const pwd=document.getElementById("password").value||"";if(!pwd)return;showLoader();try{const data=await fetchJSON(API_URL+"/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:pwd})});saveToken(data.token);const box=document.getElementById("loginBox");if(box)box.classList.add("hidden");const tabs=document.getElementById("tabs");if(tabs)tabs.classList.remove("hidden")}catch{const m=document.getElementById("loginMsg");if(m)m.textContent="Error de login"}hideLoader()}
async function listarPublic(){await ensureTS();showLoader();try{const res=await fetchJSON(API_URL+"/api/episodes");return res.items||[]}finally{hideLoader()}}
async function publicar(payload){if(!ADMIN_TOKEN)return;showLoader();try{await fetchJSON(API_URL+"/api/admin/episodes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)})}finally{hideLoader()}}
async function actualizar(id,payload){if(!ADMIN_TOKEN||!id)return;showLoader();try{await fetchJSON(API_URL+"/api/admin/episodes/"+id,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)})}finally{hideLoader()}}
async function eliminar(id){if(!ADMIN_TOKEN||!id)return;showLoader();try{await fetchJSON(API_URL+"/api/admin/episodes/"+id,{method:"DELETE"})}finally{hideLoader()}}
document.addEventListener("DOMContentLoaded",()=>{const bL=document.getElementById("btnLogin");if(bL)bL.addEventListener("click",login);const bO=document.getElementById("btnLogout");if(bO)bO.addEventListener("click",logout);loadToken()});
