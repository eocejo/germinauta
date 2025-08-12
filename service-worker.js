const CACHE = "habit-reinforcer-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/images/stage1.png",
  "./assets/images/stage2.png",
  "./assets/images/stage3.png",
  "./assets/images/stage4.png",
  "./assets/images/stage5.png",
  "./assets/images/stage6.png",
  "./assets/sounds/tap.wav",
  "./assets/sounds/stage-change.wav",
  "./assets/sounds/action-complete.wav",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      ),
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
