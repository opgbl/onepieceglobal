let ADMIN_TOKEN=null,ADMIN_EXP=0,EXP_TIMER=null;
const loader=document.getElementById("loader");
function showLoader(){if(loader)loader.style.display="block"}
function hideLoader(){if(loader)loader.style.display="none"}
function b64url(s){return s.replace(/-/g,"+").replace(/_/g,"/")}
function parseJWT(t){try{const p=t.split(".")[1];return JSON.parse(atob(b64url(p)))}catch{return {}}}
function clearTimer(){if(EXP_TIMER){clearTimeout(EXP_TIMER);EXP_TIMER=null}}
function scheduleExpiry(){clearTimer();const ms=Math.max(0,(ADMIN_EXP*1000)-Date.now());EXP_TIMER=setTimeout(()=>{logout()},ms)}
function saveToken(t){const d=parseJWT(t);ADMIN_TOKEN=t;ADMIN_EXP=d.exp||0;localStorage.setItem("admin_token",t);scheduleExpiry();document.getElementById("tokenInfo").textContent="Sesión activa";document.getElementById("btnLogout").classList.remove("hidden");document.getElementById("loginBox").classList.add("hidden");document.getElementById("tabs").classList.remove("hidden")}
function loadToken(){const t=localStorage.getItem("admin_token");if(!t)return;const d=parseJWT(t);if((d.exp||0)*1000>Date.now()){ADMIN_TOKEN=t;ADMIN_EXP=d.exp||0;scheduleExpiry();document.getElementById("tokenInfo").textContent="Sesión activa";document.getElementById("btnLogout").classList.remove("hidden");document.getElementById("loginBox").classList.add("hidden");document.getElementById("tabs").classList.remove("hidden")}else{localStorage.removeItem("admin_token")}}
function logout(){ADMIN_TOKEN=null;ADMIN_EXP=0;localStorage.removeItem("admin_token");clearTimer();document.getElementById("tokenInfo").textContent="No autenticado";document.getElementById("btnLogout").classList.add("hidden");document.getElementById("loginBox").classList.remove("hidden");document.getElementById("tabs").classList.add("hidden")}

async function fetchJSON(url,opts={}){
  const h=Object.assign({},opts.headers||{});
  if(ADMIN_TOKEN)h.Authorization="Bearer "+ADMIN_TOKEN;
  const r=await fetch(url,Object.assign({credentials:"include",headers:h},opts));
  if(r.status===401&&ADMIN_TOKEN){logout()}
  if(!r.ok)throw new Error(String(r.status));
  const ct=r.headers.get("content-type")||"";
  return ct.includes("application/json")?r.json():r.text();
}

async function login(){
  const pwd=document.getElementById("password").value||"";
  if(!pwd)return;
  showLoader();
  try{
    const data=await fetchJSON(API_URL+"/api/admin/login",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({password:pwd})
    });
    saveToken(data.token);
  }catch(e){
    document.getElementById("loginMsg").textContent="Error de login";
  }
  hideLoader();
}

async function getPublicEpisodes(){
  showLoader();
  try{
    const res=await fetchJSON(API_URL+"/api/episodes");
    renderEpisodes(res.items||[]);
  }catch(e){
    document.getElementById("list").innerHTML="<p>Error al cargar episodios</p>";
  }
  hideLoader();
}

function renderEpisodes(list){
  const c=document.getElementById("list");
  c.innerHTML="";
  list.forEach(ep=>{
    const div=document.createElement("div");
    div.className="episodeRow";
    div.innerHTML=`
      <span>#${ep.id} - ${ep.title}</span>
      <button data-id="${ep.id}" class="delBtn">Eliminar</button>
    `;
    c.appendChild(div);
  });
  document.querySelectorAll(".delBtn").forEach(btn=>{
    btn.addEventListener("click",()=>delEpisode(btn.dataset.id));
  });
}

async function delEpisode(id){
  if(!confirm("Eliminar episodio "+id+"?"))return;
  showLoader();
  try{
    await fetchJSON(API_URL+"/api/admin/episodes/"+id,{method:"DELETE"});
    await getPublicEpisodes();
  }catch(e){
    alert("Error eliminando episodio");
  }
  hideLoader();
}

async function addEpisode(e){
  e.preventDefault();
  const payload={
    episodio:parseInt(document.getElementById("epNum").value,10),
    titulo:document.getElementById("epTitle").value,
    fecha:document.getElementById("epDate").value,
    embed:document.getElementById("epEmbed").value,
    d1080:document.getElementById("epDl1080").value,
    d720:document.getElementById("epDl720").value,
    d480:document.getElementById("epDl480").value
  };
  showLoader();
  try{
    await fetchJSON(API_URL+"/api/admin/episodes",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(payload)
    });
    document.getElementById("formAdd").reset();
    await getPublicEpisodes();
  }catch(e){
    alert("Error creando episodio");
  }
  hideLoader();
}

document.addEventListener("DOMContentLoaded",()=>{
  loadToken();
  document.getElementById("btnLogin").addEventListener("click",login);
  document.getElementById("formAdd").addEventListener("submit",addEpisode);
  document.getElementById("btnLogout").addEventListener("click",logout);
  if(ADMIN_TOKEN)getPublicEpisodes();
});
