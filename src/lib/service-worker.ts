export function registerServiceWorker() {
  if (!import.meta.env.PROD) return;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  const register = () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      console.warn("Service worker não registrado:", error);
    });
  };

  // Hydration can finish after the load event; a late listener would never run.
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
