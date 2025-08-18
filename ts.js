const SITE_KEY = "0x4AAAAAABshM3tkI6jl4RQn";

(function() {
  if (window.__tsGate) return;
  let ready = false,
    widget = null,
    promise = null,
    running = false;

  function waitLib() {
    return new Promise((res, rej) => {
      const t0 = Date.now();
      (function s() {
        if (window.turnstile && typeof turnstile.render === "function") return res();
        if (Date.now() - t0 > 10000) return rej(new Error("Turnstile not loaded"));
        setTimeout(s, 80);
      })()
    })
  }

  function mount() {
    if (widget) return;
    let host = document.getElementById("ts");
    if (!host) {
      host = document.createElement("div");
      host.id = "ts";
      document.body.appendChild(host);
    }
    widget = turnstile.render(host, {
      sitekey: SITE_KEY,
      size: "normal",
      callback: async (token) => {
        const r = await fetch(API_URL + "/api/verify-turnstile", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            token
          })
        });
        ready = r.ok;
      }
    });
  }

  async function ensure() {
    if (ready) return;
    if (promise) return promise;
    promise = (async () => {
      await waitLib();
      mount();
      if (running) {
        turnstile.reset(widget);
      }
      running = true;
      turnstile.execute(widget);
      const t0 = Date.now();
      while (!ready && Date.now() - t0 < 9000) await new Promise(r => setTimeout(r, 100));
      if (!ready) {
        turnstile.reset(widget);
        turnstile.execute(widget);
        const t1 = Date.now();
        while (!ready && Date.now() - t1 < 6000) await new Promise(r => setTimeout(r, 100));
      }
      if (!ready) throw new Error("Turnstile failed to verify");
    })();
    return promise;
  }
  window.__tsGate = {
    ensure
  };
})();