const translations = {
  en: {
    settings: "Settings",
    habits: "Habits",
    add: "Add",
    buttonName: "Button name",
    showCounts: "Show counts",
    hideCounts: "Hide counts",
    reset: "Reset",
    refresh: "Update",
    close: "Close",
    today: "Today",
    week: "Week",
    month: "Month",
    total: "Total",
    onboarding:
      "Tap buttons to grow your creature and keep track of your habits.",
    storageError: "Storage unavailable. Progress won't be saved.",
    confirmReset: "Reset the app? This will erase all data.",
    confirmRefresh: "Update the app? This clears cache.",
    showStats: "Show stats",
    defaultButton: "Decision",
  },
  es: {
    settings: "Configuración",
    habits: "Hábitos",
    add: "Agregar",
    buttonName: "Nombre del botón",
    showCounts: "Mostrar contadores",
    hideCounts: "Ocultar contadores",
    reset: "Reiniciar",
    refresh: "Actualizar",
    close: "Cerrar",
    today: "Hoy",
    week: "Semana",
    month: "Mes",
    total: "Total",
    onboarding:
      "Presiona los botones para hacer crecer tu criatura y seguir tus hábitos.",
    storageError: "Almacenamiento no disponible. El progreso no se guardará.",
    confirmReset: "¿Reiniciar la app? Se borrarán todos los datos.",
    confirmRefresh: "¿Actualizar la app? Se borrará la caché de la página.",
    showStats: "Mostrar estadísticas",
    defaultButton: "Decisión",
  },
};

const lang = navigator.language.startsWith("es") ? "es" : "en";
document.documentElement.lang = lang;
const t = (k) => translations[lang][k];

// Config persistente
const LS_SETTINGS = "habitSettings";
const LS_LOG = "habitLog";
const LS_ONBOARD = "habitOnboard";

const storageAvailable = isStorageAvailable();

const defaultSettings = {
  buttons: [{ label: t("defaultButton"), color: "#ffcc66", icon: "" }],
  showButtonCounts: false,
  stage: 1,
  stageProgress: 0,
};
const LABEL_LIMIT = 10;
const defaultColors = [
  "#ffcc66",
  "#66ff66",
  "#66ccff",
  "#ff6666",
  "#cc66ff",
  "#ff9966",
];
const defaultEmojis = ["😀", "💪", "📚", "🍎", "🧘", "🚰"];

let settings = loadJSON(LS_SETTINGS, defaultSettings);
let logs = loadJSON(LS_LOG, []);
let nextDefault = settings.buttons.length;
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
const sfxTap = document.getElementById("sfx-tap");
const sfxStage = document.getElementById("sfx-stage");
const sfxComplete = document.getElementById("sfx-complete");
const btnSettings = document.getElementById("btn-settings");
const settingsSheet = document.getElementById("settings");
const addButton = document.getElementById("add-button");
const newLabel = document.getElementById("new-label");
const newIcon = document.getElementById("new-icon");
const newColor = document.getElementById("new-color");
const newPreview = document.getElementById("new-preview");
const buttonList = document.getElementById("button-list");
newLabel.maxLength = LABEL_LIMIT;
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
const onboardingSheet = document.getElementById("onboarding");
const onboardingText = document.getElementById("onboarding-text");
const closeOnboarding = document.getElementById("close-onboarding");
const storageErrorSheet = document.getElementById("storage-error");
const storageErrorText = document.getElementById("storage-error-text");
const chartCanvas = document.getElementById("chart-week");

let dragIndex = null;
document.addEventListener("pointerup", () => {
  dragIndex = null;
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
closeOnboarding.textContent = t("close");
lblToday.textContent = `${t("today")}:`;
lblWeek.textContent = `${t("week")}:`;
lblMonth.textContent = `${t("month")}:`;
lblTotal.textContent = `${t("total")}:`;
toggleCounts.textContent = settings.showButtonCounts
  ? t("hideCounts")
  : t("showCounts");
onboardingText.textContent = t("onboarding");
storageErrorText.textContent = t("storageError");

// Init
renderStage();
renderButtons();
renderSettings();
updateStats();
if (introVideo) {
  const removeVideo = () => {
    introVideo.classList.add("fade-out");
    setTimeout(() => introVideo.remove(), 500);
  };
  introVideo.addEventListener("timeupdate", () => {
    if (
      introVideo.duration - introVideo.currentTime <= 0.5 &&
      !introVideo.classList.contains("fade-out")
    ) {
      removeVideo();
    }
  });
  introVideo.addEventListener("ended", removeVideo);
}

if (!loadJSON(LS_ONBOARD, false)) {
  onboardingSheet.hidden = false;
  closeOnboarding.addEventListener("click", () => {
    onboardingSheet.hidden = true;
    saveJSON(LS_ONBOARD, true);
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
    labelSpan.textContent = `${b.icon ? b.icon + " " : ""}${b.label}`;
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
  safePlay(sfxTap);
}
function playStageSound() {
  safePlay(sfxStage);
}
function playCompleteSound() {
  safePlay(sfxComplete);
}
function safePlay(audioEl) {
  try {
    audioEl.currentTime = 0;
    audioEl.play();
  } catch (_) {
    /* ignored */
  }
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

function getLast7DaysCounts() {
  const counts = Array(7).fill(0);
  const now = new Date();
  for (const item of logs) {
    const d = new Date(item.timestamp);
    const diff = Math.floor((now - d) / 86400000);
    if (diff >= 0 && diff < 7) {
      counts[6 - diff]++;
    }
  }
  return counts;
}

function drawChart() {
  if (!chartCanvas) return;
  const ctx = chartCanvas.getContext("2d");
  const data = getLast7DaysCounts();
  const w = chartCanvas.width;
  const h = chartCanvas.height;
  ctx.clearRect(0, 0, w, h);
  const max = Math.max(...data, 1);
  const barWidth = w / data.length;
  data.forEach((val, i) => {
    const barHeight = (val / max) * (h - 20);
    ctx.fillStyle = "#66ccff";
    ctx.fillRect(i * barWidth + 4, h - barHeight - 10, barWidth - 8, barHeight);
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
  settingsSheet.hidden = false;
});

closeSettings.addEventListener("click", () => {
  settingsSheet.hidden = true;
  renderButtons();
});

function updateNewPreview() {
  newPreview.textContent = `${newIcon.value ? newIcon.value + " " : ""}${
    newLabel.value
  }`;
  newPreview.style.background = newColor.value;
}

[newLabel, newIcon, newColor].forEach((el) =>
  el.addEventListener("input", updateNewPreview),
);

function setNextDefaults() {
  newColor.value = defaultColors[nextDefault % defaultColors.length];
  newIcon.value = defaultEmojis[nextDefault % defaultEmojis.length];
  nextDefault += 1;
  updateNewPreview();
}

setNextDefaults();

addButton.addEventListener("click", () => {
  const label = newLabel.value.trim().slice(0, LABEL_LIMIT);
  if (!label) return;
  const color = newColor.value;
  const icon = newIcon.value.trim();
  settings.buttons.push({ label, color, icon });
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
    handle.addEventListener("pointerdown", () => {
      dragIndex = idx;
    });
    li.addEventListener("pointerenter", () => {
      const to = Number(li.dataset.index);
      if (dragIndex === null || dragIndex === to) return;
      move(settings.buttons, dragIndex, to);
      dragIndex = to;
      saveJSON(LS_SETTINGS, settings);
      renderSettings();
      renderButtons();
    });

    const input = document.createElement("input");
    input.type = "text";
    input.value = b.label;
    input.maxLength = LABEL_LIMIT;
    input.addEventListener("input", () => {
      settings.buttons[idx].label = input.value;
      saveJSON(LS_SETTINGS, settings);
      renderButtons();
    });

    const icon = document.createElement("input");
    icon.type = "text";
    icon.value = b.icon || "";
    icon.addEventListener("input", () => {
      settings.buttons[idx].icon = icon.value;
      saveJSON(LS_SETTINGS, settings);
      renderButtons();
      updatePreview();
    });

    const color = document.createElement("input");
    color.type = "color";
    color.value = b.color || "#ffcc66";
    color.addEventListener("input", () => {
      settings.buttons[idx].color = color.value;
      saveJSON(LS_SETTINGS, settings);
      renderButtons();
      updatePreview();
    });

    const preview = document.createElement("button");
    preview.className = "action";
    preview.type = "button";
    preview.disabled = true;
    const updatePreview = () => {
      preview.textContent = `${icon.value ? icon.value + " " : ""}${
        input.value
      }`;
      preview.style.background = color.value;
    };
    updatePreview();
    input.addEventListener("input", updatePreview);
    icon.addEventListener("input", updatePreview);
    color.addEventListener("input", updatePreview);

    const del = document.createElement("button");
    del.textContent = "✕";
    del.addEventListener("click", () => {
      settings.buttons.splice(idx, 1);
      saveJSON(LS_SETTINGS, settings);
      renderSettings();
      renderButtons();
    });

    li.append(handle, input, icon, color, preview, del);
    buttonList.appendChild(li);
  });

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
  const step = Math.PI / (n - 1);
  items.forEach((el, i) => {
    const angle = step * i;
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
