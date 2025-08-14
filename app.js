const translations = {
  en: {
    settings: "Settings",
    habits: "Habits",
    add: "Add",
    buttonName: "Button name",
    showCounts: "Show counts",
    hideCounts: "Hide counts",
    reset: "Reset",
    refresh: "Clear Cache",
    close: "Close",
    today: "Today",
    week: "Week",
    month: "Month",
    total: "Total",
    storageError: "Storage unavailable. Progress won't be saved.",
    confirmReset: "Reset the app? This will erase all data.",
    confirmRefresh: "Clear the app cache? This will remove cached files.",
    showStats: "Show stats",
    stats: "Stats",
    weeks: "Weeks",
    entries: "Entries",
    defaultButton: "🧭",
  },
  es: {
    settings: "Configuración",
    habits: "Hábitos",
    add: "Agregar",
    buttonName: "Nombre del botón",
    showCounts: "Mostrar contadores",
    hideCounts: "Ocultar contadores",
    reset: "Renacer",
    refresh: "Borrar Cache",
    close: "Cerrar",
    today: "Hoy",
    week: "Semana",
    month: "Mes",
    total: "Total",
    storageError: "Almacenamiento no disponible. El progreso no se guardará.",
    confirmReset: "¿Renacer la app? Se borrarán todos los datos.",
    confirmRefresh: "¿Borrar la cache? Se borrará la caché de la página.",
    showStats: "Mostrar estadísticas",
    stats: "Estadísticas",
    weeks: "Semanas",
    entries: "Registros",
    defaultButton: "🧭",
  },
};

const lang = navigator.language.startsWith("es") ? "es" : "en";
document.documentElement.lang = lang;
const t = (k) => translations[lang][k];

function lockOrientation() {
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock("portrait").catch(() => {});
  }
}

lockOrientation();
window.addEventListener("orientationchange", lockOrientation);

// Config persistente
const LS_SETTINGS = "habitSettings";
const LS_LOG = "habitLog";

const storageAvailable = isStorageAvailable();

const defaultSettings = {
  buttons: [{ label: t("defaultButton"), color: "#ffcc66" }],
  showButtonCounts: true,
  stage: 1,
  stageProgress: 0,
};

const LABEL_LIMIT = 10;
const MAX_BUTTONS = 5;
const defaultColors = [
  "#ffcc66",
  "#66ff66",
  "#66ccff",
  "#ff6666",
  "#cc66ff",
  "#ff9966",
];

let settings = loadJSON(LS_SETTINGS, defaultSettings);
settings.buttons = settings.buttons
  .slice(0, MAX_BUTTONS)
  .map((b) => ({ ...b, label: b.label.slice(0, LABEL_LIMIT) }));
saveJSON(LS_SETTINGS, settings);
let logs = loadJSON(LS_LOG, []);
const thresholds = [2, 3, 4, 5, 6]; // 1→2, 2→3, 3→4, 4→5, 5→6

// Elementos
const creatureEl = document.getElementById("creature");
const envEl = document.getElementById("environment");
const buttonsEl = document.getElementById("buttons");
const hudStatsBtn = document.getElementById("btn-stats");
const statsSheet = document.getElementById("stats");
const statToday = document.getElementById("stat-today");
const statWeek = document.getElementById("stat-week");
const statMonth = document.getElementById("stat-month");
const statTotal = document.getElementById("stat-total");
const closeStats = document.getElementById("close-stats");
const statsHeading = document.getElementById("stats-heading");
const btnSettings = document.getElementById("btn-settings");
const settingsSheet = document.getElementById("settings");
const addButton = document.getElementById("add-button");
const newLabel = document.getElementById("new-label");
newLabel.maxLength = LABEL_LIMIT;
const newColor = document.getElementById("new-color");
const buttonList = document.getElementById("button-list");
const toggleCounts = document.getElementById("toggle-counts");
const closeSettings = document.getElementById("close-settings");
const resetApp = document.getElementById("reset-app");
const refreshApp = document.getElementById("refresh-app");
const introVideo = document.getElementById("intro-video");
const lblToday = document.getElementById("lbl-today");
const lblWeek = document.getElementById("lbl-week");
const lblMonth = document.getElementById("lbl-month");
const lblTotal = document.getElementById("lbl-total");
const settingsTitle = document.getElementById("settings-title");
const settingsHabits = document.getElementById("settings-habits");
const storageErrorSheet = document.getElementById("storage-error");
const storageErrorText = document.getElementById("storage-error-text");
const chartCanvas = document.getElementById("chart-week");

const audioCtx = window.AudioContext ? new AudioContext() : null;
const audioBuffers = {};
const soundFiles = {
  tap: "assets/sounds/tap.wav",
  stage: "assets/sounds/stage-change.wav",
  complete: "assets/sounds/action-complete.wav",
};

async function loadSound(name, url) {
  if (!audioCtx) return;
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  audioBuffers[name] = await audioCtx.decodeAudioData(buf);
}

function playSound(name) {
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") audioCtx.resume();
  const buffer = audioBuffers[name];
  if (!buffer) return;
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  src.connect(audioCtx.destination);
  src.start();
}

for (const [name, url] of Object.entries(soundFiles)) {
  loadSound(name, url);
}

let nextDefault = settings.buttons.length;
function setNextDefaults() {
  newColor.value = defaultColors[nextDefault % defaultColors.length];
  nextDefault += 1;
}
setNextDefaults();

let dragIndex = null;
document.addEventListener("pointerup", () => {
  dragIndex = null;
});
document.addEventListener("pointermove", (e) => {
  if (dragIndex === null) return;
  e.preventDefault();
  const target = document.elementFromPoint(e.clientX, e.clientY);
  const li = target && target.closest("#button-list li");
  if (!li) return;
  const to = Number(li.dataset.index);
  if (to === dragIndex) return;
  move(settings.buttons, dragIndex, to);
  dragIndex = to;
  saveJSON(LS_SETTINGS, settings);
  renderSettings();
  renderButtons();
});
document.addEventListener("selectstart", (e) => {
  if (dragIndex !== null) e.preventDefault();
});

// Traducción inicial
hudStatsBtn.setAttribute("aria-label", t("showStats"));
btnSettings.setAttribute("aria-label", t("settings"));
closeStats.setAttribute("aria-label", t("close"));
settingsTitle.textContent = t("settings");
settingsHabits.textContent = t("habits");
newLabel.placeholder = t("buttonName");
addButton.textContent = t("add");
resetApp.textContent = t("reset");
refreshApp.textContent = t("refresh");
closeSettings.textContent = t("close");
statsHeading.textContent = t("stats");
lblToday.textContent = `${t("today")}:`;
lblWeek.textContent = `${t("week")}:`;
lblMonth.textContent = `${t("month")}:`;
lblTotal.textContent = `${t("total")}:`;
toggleCounts.textContent = settings.showButtonCounts
  ? t("hideCounts")
  : t("showCounts");
storageErrorText.textContent = t("storageError");

// Init
renderStage();
renderButtons();
renderSettings();
updateStats();
if (introVideo) {
  introVideo.removeAttribute("controls");
  introVideo.play().catch(() => {});
  introVideo.addEventListener("ended", () => {
    introVideo.classList.add("fade-out");
    introVideo.addEventListener(
      "transitionend",
      () => {
        introVideo.remove();
      },
      { once: true },
    );
  });
}

if (!storageAvailable) {
  storageErrorSheet.hidden = false;
}

// Registrar SW
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}

// Acciones
function handleAction(label) {
  const now = new Date().toISOString();
  logs.push({ decisionLabel: label, timestamp: now });
  saveJSON(LS_LOG, logs);

  playTapSound();

  // Progreso de etapa
  settings.stageProgress += 1;
  const canAdvance =
    settings.stage < 6 &&
    settings.stageProgress >= thresholds[settings.stage - 1];

  if (canAdvance) {
    settings.stage += 1;
    settings.stageProgress = 0;
    saveJSON(LS_SETTINGS, settings);
    renderStage();
    playStageSound();
  }

  updateStats();
  if (settings.showButtonCounts) renderButtons();
}

function renderButtons() {
  buttonsEl.innerHTML = "";
  const counts = logs.reduce((acc, l) => {
    acc[l.decisionLabel] = (acc[l.decisionLabel] || 0) + 1;
    return acc;
  }, {});
  settings.buttons.forEach((b) => {
    const btn = document.createElement("button");
    btn.className = "action";
    const count = counts[b.label] || 0;

    const labelSpan = document.createElement("span");
    labelSpan.className = "label";
    labelSpan.textContent = b.label.slice(0, LABEL_LIMIT);
    btn.appendChild(labelSpan);

    if (settings.showButtonCounts) {
      const countSpan = document.createElement("span");
      countSpan.className = "count";
      countSpan.textContent = String(count);
      btn.appendChild(countSpan);
    }

    btn.style.background = b.color || "#ffcc66";
    btn.addEventListener("click", () => handleAction(b.label));
    buttonsEl.appendChild(btn);
  });
  applyBottomArc(buttonsEl);
}

function renderStage() {
  const s = settings.stage;
  creatureEl.src = `assets/images/stage${s}.png`;
}

function playTapSound() {
  playSound("tap");
}
function playStageSound() {
  playSound("stage");
}
function playCompleteSound() {
  playSound("complete");
}

// Estadísticas
function updateStats() {
  const now = new Date();
  const total = logs.length;

  let today = 0,
    week = 0,
    month = 0;
  for (const item of logs) {
    const d = new Date(item.timestamp);
    if (isSameDay(d, now)) today++;
    if (isSameISOWeek(d, now)) week++;
    if (
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    )
      month++;
  }

  statToday.textContent = String(today);
  statWeek.textContent = String(week);
  statMonth.textContent = String(month);
  statTotal.textContent = String(total);
  drawChart();
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameISOWeek(a, b) {
  const aw = isoWeek(a),
    bw = isoWeek(b);
  return aw.year === bw.year && aw.week === bw.week;
}

function isoWeek(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return { year: date.getUTCFullYear(), week };
}

function getWeeksOfMonthCounts() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weekCount = Math.ceil(daysInMonth / 7);
  const counts = Array(weekCount).fill(0);
  for (const item of logs) {
    const d = new Date(item.timestamp);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const week = Math.floor((d.getDate() - 1) / 7);
      counts[week] += 1;
    }
  }
  return counts;
}

function drawChart() {
  if (!chartCanvas) return;
  const ctx = chartCanvas.getContext("2d");
  const data = getWeeksOfMonthCounts();
  const w = chartCanvas.width;
  const h = chartCanvas.height;
  const marginLeft = 30;
  const marginBottom = 30;
  const originY = h - marginBottom;
  ctx.clearRect(0, 0, w, h);
  const max = Math.max(...data, 1);
  const barWidth = (w - marginLeft - 10) / data.length;
  ctx.strokeStyle = "#000000";
  ctx.beginPath();
  ctx.moveTo(marginLeft, 10);
  ctx.lineTo(marginLeft, originY);
  ctx.lineTo(w - 10, originY);
  ctx.stroke();
  ctx.fillStyle = "#000000";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("0", marginLeft - 5, originY);
  ctx.fillText(String(max), marginLeft - 5, 15);
  ctx.textAlign = "center";
  ctx.fillText(t("weeks"), (w + marginLeft) / 2, h - 5);
  ctx.save();
  ctx.translate(15, h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(t("entries"), 0, 0);
  ctx.restore();
  data.forEach((val, i) => {
    const barHeight = (val / max) * (originY - 10);
    const x = marginLeft + i * barWidth;
    ctx.fillStyle = "#66ccff";
    ctx.fillRect(x + 4, originY - barHeight, barWidth - 8, barHeight);
    ctx.fillStyle = "#000000";
    const label = String(i + 1);
    ctx.fillText(label, x + barWidth / 2, h - marginBottom + 15);
  });
}

// HUD y Settings
hudStatsBtn.addEventListener("click", () => {
  statsSheet.hidden = !statsSheet.hidden;
});

closeStats.addEventListener("click", () => {
  statsSheet.hidden = true;
});

btnSettings.addEventListener("click", () => {
  renderSettings();
  settingsSheet.hidden = false;
});

closeSettings.addEventListener("click", () => {
  settingsSheet.hidden = true;
  renderButtons();
});

addButton.addEventListener("click", () => {
  if (settings.buttons.length >= MAX_BUTTONS) return;
  const label = newLabel.value.trim().slice(0, LABEL_LIMIT);
  if (!label) return;
  const color = newColor.value;
  settings.buttons.push({ label, color });
  newLabel.value = "";
  setNextDefaults();
  saveJSON(LS_SETTINGS, settings);
  renderSettings();
  renderButtons();
});

toggleCounts.addEventListener("click", () => {
  settings.showButtonCounts = !settings.showButtonCounts;
  saveJSON(LS_SETTINGS, settings);
  toggleCounts.textContent = settings.showButtonCounts
    ? t("hideCounts")
    : t("showCounts");
  renderButtons();
});

resetApp.addEventListener("click", () => {
  const ok = confirm(t("confirmReset"));
  if (!ok) return;
  localStorage.removeItem(LS_SETTINGS);
  localStorage.removeItem(LS_LOG);
  location.reload();
});

refreshApp.addEventListener("click", async () => {
  const ok = confirm(t("confirmRefresh"));
  if (!ok) return;
  if ("serviceWorker" in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      await reg.unregister();
    }
  }
  if (window.caches) {
    const names = await caches.keys();
    for (const name of names) {
      await caches.delete(name);
    }
  }
  location.reload();
});

function renderSettings() {
  toggleCounts.textContent = settings.showButtonCounts
    ? t("hideCounts")
    : t("showCounts");

  buttonList.innerHTML = "";
  settings.buttons.forEach((b, idx) => {
    const li = document.createElement("li");
    li.dataset.index = String(idx);

    const handle = document.createElement("span");
    handle.textContent = "☰";
    handle.className = "drag-handle";
    handle.addEventListener("pointerdown", (e) => {
      dragIndex = idx;
      e.preventDefault();
    });

    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = LABEL_LIMIT;
    input.value = b.label.slice(0, LABEL_LIMIT);
    input.addEventListener("input", () => {
      settings.buttons[idx].label = input.value.slice(0, LABEL_LIMIT);
      saveJSON(LS_SETTINGS, settings);
      renderButtons();
    });

    const color = document.createElement("input");
    color.type = "color";
    color.value = b.color || "#ffcc66";
    color.addEventListener("input", () => {
      settings.buttons[idx].color = color.value;
      saveJSON(LS_SETTINGS, settings);
      renderButtons();
    });

    const del = document.createElement("button");
    del.textContent = "✕";
    del.addEventListener("click", () => {
      settings.buttons.splice(idx, 1);
      saveJSON(LS_SETTINGS, settings);
      renderSettings();
      renderButtons();
    });

    li.append(handle, input, color, del);
    buttonList.appendChild(li);
  });

  addButton.disabled = settings.buttons.length >= MAX_BUTTONS;
  newLabel.disabled = addButton.disabled;
  newColor.disabled = addButton.disabled;
  saveJSON(LS_SETTINGS, settings);
}

// Utilidades
function loadJSON(key, fallback) {
  if (!storageAvailable) return fallback;
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, val) {
  if (!storageAvailable) return;
  localStorage.setItem(key, JSON.stringify(val));
}

function move(arr, from, to) {
  const [el] = arr.splice(from, 1);
  arr.splice(to, 0, el);
}

// Curva hacia abajo en el centro, dinámica
function applyBottomArc(container) {
  const items = Array.from(container.children);
  const n = items.length;
  if (n === 0) return;
  const radius = 40;
  const step = Math.PI / (n + 1);
  items.forEach((el, i) => {
    const angle = step * (i + 1);
    const y = Math.sin(angle) * radius;
    el.style.setProperty("--arc-y", `${y.toFixed(1)}px`);
  });
}

function isStorageAvailable() {
  try {
    const x = "__test__";
    localStorage.setItem(x, x);
    localStorage.removeItem(x);
    return true;
  } catch {
    return false;
  }
}
