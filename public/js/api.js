const API_URL="https://opapi.onrender.com";
async function tsToken(){if(window.__tsGate&&window.__tsGate.ensure){return await window.__tsGate.ensure()}return null}
async function apiFetch(path,opt={}){
 const h=new Headers(opt.headers||{});
 const t=await tsToken();
 if(t){h.set("cf-turnstile-response",t);h.set("x-turnstile-token",t)}
 const res=await fetch(API_URL+path,{...opt,headers:h,credentials:"include",cache:"no-store"});
 if(res.status===401){
  if(window.__tsGate&&window.__tsGate.reset){window.__tsGate.reset()}
  const t2=await tsToken();
  const h2=new Headers(opt.headers||{});
  if(t2){h2.set("cf-turnstile-response",t2);h2.set("x-turnstile-token",t2)}
  return fetch(API_URL+path,{...opt,headers:h2,credentials:"include",cache:"no-store"});
 }
 return res;
}
async function apiGet(path){
 const r=await apiFetch(path,{method:"GET"});
 if(!r.ok) throw new Error("HTTP "+r.status);
 return r.json();
}
