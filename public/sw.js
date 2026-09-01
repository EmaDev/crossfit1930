// Service worker mínimo — lo que necesita <UpdatePrompt> de lib-kit-components.
// Al recibir SKIP_WAITING, el SW nuevo toma control y la app se recarga.
self.addEventListener("message", (e) => {
  if (e.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
