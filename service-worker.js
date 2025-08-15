const CACHE = "habit-reinforcer-v6";
const ASSETS = [
  "./",
  "./index.html",
  "./offline.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/images/background.png",
  "./assets/videos/stage1.mp4",
  "./assets/videos/stage1.mov",
  "./assets/images/stage2.png",
  "./assets/images/stage3.png",
  "./assets/images/stage4.png",
  "./assets/images/stage5.png",
  "./assets/images/stage6.png",
  "./assets/sounds/tap.wav",
  "./assets/sounds/stage-change.wav",
  "./assets/sounds/action-complete.wav",
  "./assets/videos/intro.mp4",
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
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() =>
        caches.match(e.request).then((r) => {
          if (r) return r;
          if (e.request.mode === "navigate") {
            return caches.match("./offline.html");
          }
        }),
      ),
  );
});
