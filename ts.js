const SITE_KEY = "0x4AAAAAABshM3tkI6jl4RQn";

(function() {
  if (window.__tsGate) return;
  let widget = null,
    promise = null;

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
      size: "normal", // O "invisible", según tu preferencia
      callback: (token) => {
        // La verificación es exitosa, pero la promesa aún debe ser resuelta
      }
    });
  }

  async function ensure() {
    if (promise) return promise;
    promise = new Promise(async (resolve, reject) => {
      try {
        await waitLib();
        mount();
        turnstile.reset(widget);
        turnstile.execute(widget);

        // Espera un tiempo prudente para la verificación
        const t0 = Date.now();
        while (Date.now() - t0 < 15000) { // 15 segundos para la verificación
          // Verifica si el widget ha generado un token
          const token = turnstile.getResponse(widget);
          if (token) {
            // Envía el token al servidor para verificarlo
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
            if (r.ok) {
              return resolve();
            }
          }
          await new Promise(r => setTimeout(r, 100));
        }
        reject(new Error("Turnstile failed to verify after timeout"));
      } catch (e) {
        reject(e);
      } finally {
        promise = null;
      }
    });
    return promise;
  }
  window.__tsGate = {
    ensure
  };
})();