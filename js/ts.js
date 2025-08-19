const SITE_KEY="0x4AAAAAABshM3tkI6jl4RQn";
(function(){
 if(window.__tsGate)return;
 let widget=null,token=null;
 function mount(){
  const host=document.getElementById("ts")||document.body.appendChild(Object.assign(document.createElement("div"),{id:"ts"}));
  if(window.turnstile&&!widget){widget=window.turnstile.render(host,{sitekey:SITE_KEY,callback:(t)=>{token=t}})}
 }
 async function ensure(){
  mount();
  const start=Date.now();
  while(!token&&Date.now()-start<15000){await new Promise(r=>setTimeout(r,200))}
  return token||null;
 }
 function get(){return token}
 function reset(){
  token=null;
  if(widget&&window.turnstile){try{window.turnstile.reset(widget)}catch(e){}}
  widget=null;
  mount();
 }
 window.__tsGate={ensure,get,reset};
})();
