const SITE_KEY = "0x4AAAAAABshM3tkI6jl4RQn";

(function() {
  if (window.__tsGate) return;

  let widget = null;
  let verificationPromise = null;
  const tsDiv = document.getElementById("ts"); 

  function mountWidget() {
    if (widget) return;
    const host = tsDiv || document.createElement("div");
    host.id = "ts";
    document.body.appendChild(host);
    
    widget = turnstile.render(host, {
      sitekey: SITE_KEY,
      size: "normal", 
      callback: (token) => {
      },
      "error-callback": (err) => {
        if (verificationPromise) {
          verificationPromise.reject(new Error("Turnstile error: " + err));
        }
      }
    });
  }

  function waitForLib() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Turnstile library not loaded")), 10000);
      const check = setInterval(() => {
        if (window.turnstile && typeof window.turnstile.render === "function") {
          clearInterval(check);
          clearTimeout(timeout);
          resolve();
        }
      }, 100);
    });
  }

  async function ensure() {
    if (verificationPromise) return verificationPromise;

    verificationPromise = new Promise(async (resolve, reject) => {
      try {
        await waitForLib();
        mountWidget();
        
        turnstile.reset(widget);
        turnstile.execute(widget);

        const checkInterval = setInterval(async () => {
          const token = turnstile.getResponse(widget);
          if (token) {
            clearInterval(checkInterval);
            
            const r = await fetch(API_URL + "/api/verify-turnstile", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token })
            });
            
            if (r.ok) {
              if (tsDiv) {
                tsDiv.style.display = "none";
              }
              resolve();
            } else {
              reject(new Error("Token verification failed on server."));
            }
          }
        }, 500);

        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error("Turnstile timeout."));
        }, 15000);

      } catch (e) {
        reject(e);
      } finally {
        verificationPromise = null;
      }
    });

    return verificationPromise;
  }

  window.__tsGate = { ensure };
})();