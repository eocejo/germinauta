const translations = {
  en: {
    settings: "Settings",
    habits: "Habits",
    add: "Add",
    buttonName: "Button name",
    counts: "Counts",
    progress: "Progress",
    showCounts: "Show counts",
    hideCounts: "Hide counts",
    showProgress: "Show progress",
    hideProgress: "Hide progress",
    reset: "Reset",
    refresh: "Clear Cache",
    close: "Close",
    advanced: "Advanced",
    today: "Today",
    day: "Day",
    week: "Week",
    month: "Month",
    year: "Year",
    total: "Total",
    storageError: "Storage unavailable. Progress won't be saved.",
    confirmReset: "Reset the app? This will erase all data.",
    confirmRefresh: "Clear the app cache? This will remove cached files.",
    showStats: "Show stats",
    stats: "Stats",
    weeks: "Weeks",
    months: "Months",
    days: "Days",
    hours: "Hours",
    entries: "Entries",
    defaultButton: "🧭",
  },
  es: {
    settings: "Configuración",
    habits: "Hábitos",
    add: "Agregar",
    buttonName: "Nombre del botón",
    counts: "Contadores",
    progress: "Progreso",
    showCounts: "Mostrar contadores",
    hideCounts: "Ocultar contadores",
    showProgress: "Mostrar progreso",
    hideProgress: "Ocultar progreso",
    reset: "Renacer",
    refresh: "Borrar Cache",
    close: "Cerrar",
    advanced: "Avanzado",
    today: "Hoy",
    day: "Día",
    week: "Semana",
    month: "Mes",
    year: "Año",
    total: "Total",
    storageError: "Almacenamiento no disponible. El progreso no se guardará.",
    confirmReset: "¿Renacer la app? Se borrarán todos los datos.",
    confirmRefresh: "¿Borrar la cache? Se borrará la caché de la página.",
    showStats: "Mostrar estadísticas",
    stats: "Estadísticas",
    weeks: "Semanas",
    months: "Meses",
    days: "Días",
    hours: "Horas",
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
const LS_NOTES = "habitNotes";

const storageAvailable = isStorageAvailable();

const uuid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now() + Math.random());

const defaultSettings = {
  buttons: [{ id: uuid(), label: t("defaultButton"), color: "#3366cc" }],
  showButtonCounts: true,
  showProgressCounter: false,
  stage: 1,
  stageProgress: 0,
};

const LABEL_LIMIT = 8;
const MAX_BUTTONS = 5;
const defaultColors = [
  "#3366cc",
  "#66ff66",
  "#66ccff",
  "#ff6666",
  "#cc66ff",
  "#ff9966",
];

let settings = loadJSON(LS_SETTINGS, defaultSettings);
settings.buttons = settings.buttons.slice(0, MAX_BUTTONS).map((b) => ({
  id: b.id || uuid(),
  label: b.label.slice(0, LABEL_LIMIT),
  color: b.color,
}));
if (typeof settings.showProgressCounter !== "boolean") {
  settings.showProgressCounter = false;
}
saveJSON(LS_SETTINGS, settings);
let logs = loadJSON(LS_LOG, []);
let notes = loadJSON(LS_NOTES, {});
const oldNotes = notes;
notes = {};
settings.buttons.forEach((b) => {
  notes[b.id] = oldNotes[b.id] || oldNotes[b.label] || "";
});
saveJSON(LS_NOTES, notes);
const thresholds = [5, 20, 100, 250, 500]; // 1→2, 2→3, 3→4, 4→5, 5→6

// Elementos
let creatureEl = document.getElementById("creature");
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
const lblCounts = document.getElementById("lbl-counts");
const toggleProgress = document.getElementById("toggle-progress");
const lblProgress = document.getElementById("lbl-progress");

function setVisibilityIcon(btn, visible) {
  const icon = visible ? "ojo-visible" : "ojo-novisible";
  btn.innerHTML = `<img src="assets/icons/${icon}.png" alt="" width="24" height="24" />`;
}
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
const settingsAdvanced = document.getElementById("settings-advanced");
const storageErrorSheet = document.getElementById("storage-error");
const storageErrorText = document.getElementById("storage-error-text");
const progressCounter = document.getElementById("progress-counter");
const chartCanvas = document.getElementById("chart-week");
const chartRange = document.getElementById("chart-range");
const noteSheet = document.getElementById("note-sheet");
const noteTitle = document.getElementById("note-title");
const noteText = document.getElementById("note-text");
const noteCount = document.getElementById("note-count");
const noteMinus = document.getElementById("note-count-minus");
const notePlus = document.getElementById("note-count-plus");
const closeNote = document.getElementById("close-note");
let currentNoteId = "";

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

let lastColor = settings.buttons.length
  ? settings.buttons[settings.buttons.length - 1].color
  : defaultColors[0];
newColor.value = lastColor;
newColor.addEventListener("input", () => {
  lastColor = newColor.value;
});

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
settingsAdvanced.textContent = t("advanced");
newLabel.placeholder = t("buttonName");
addButton.textContent = t("add");
resetApp.textContent = t("reset");
refreshApp.textContent = t("refresh");
closeSettings.setAttribute("aria-label", t("close"));
closeNote.setAttribute("aria-label", t("close"));
statsHeading.textContent = t("stats");
lblToday.textContent = `${t("today")}:`;
lblWeek.textContent = `${t("week")}:`;
lblMonth.textContent = `${t("month")}:`;
lblTotal.textContent = `${t("total")}:`;
chartRange.innerHTML = `
  <option value="day">${t("day")}</option>
  <option value="week">${t("week")}</option>
  <option value="month">${t("month")}</option>
  <option value="year">${t("year")}</option>
`;
chartRange.value = "month";
chartRange.addEventListener("change", drawChart);
lblCounts.textContent = t("counts");
setVisibilityIcon(toggleCounts, settings.showButtonCounts);
toggleCounts.classList.toggle("off", !settings.showButtonCounts);
toggleCounts.setAttribute(
  "aria-label",
  settings.showButtonCounts ? t("hideCounts") : t("showCounts"),
);
lblProgress.textContent = t("progress");
setVisibilityIcon(toggleProgress, settings.showProgressCounter);
toggleProgress.classList.toggle("off", !settings.showProgressCounter);
toggleProgress.setAttribute(
  "aria-label",
  settings.showProgressCounter ? t("hideProgress") : t("showProgress"),
);
storageErrorText.textContent = t("storageError");

// Init
renderStage();
renderButtons();
renderSettings();
updateProgressCounter();
updateStats();
if (introVideo) {
  introVideo.removeAttribute("controls");
  introVideo.muted = true;
  introVideo.setAttribute("muted", "");
  introVideo.setAttribute("playsinline", "");
  introVideo.setAttribute("webkit-playsinline", "");
  const playIntro = () => introVideo.play().catch(() => {});
  if (introVideo.readyState >= 2) {
    playIntro();
  } else {
    introVideo.addEventListener("canplay", playIntro, { once: true });
  }
  document.addEventListener("pointerdown", playIntro, { once: true });
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
function handleAction(id) {
  const button = settings.buttons.find((b) => b.id === id);
  const label = button ? button.label : "";
  const now = new Date().toISOString();
  logs.push({ decisionId: id, decisionLabel: label, timestamp: now });
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
    playStageParticles();
  } else {
    saveJSON(LS_SETTINGS, settings);
  }

  updateStats();
  if (settings.showButtonCounts) renderButtons();
  updateProgressCounter();
}

function undoAction(id) {
  for (let i = logs.length - 1; i >= 0; i--) {
    const key = logs[i].decisionId || logs[i].decisionLabel;
    if (key === id) {
      logs.splice(i, 1);
      break;
    }
  }
  saveJSON(LS_LOG, logs);
  settings.stageProgress -= 1;
  if (settings.stageProgress < 0) {
    if (settings.stage > 1) {
      settings.stage -= 1;
      settings.stageProgress = thresholds[settings.stage - 1] - 1;
      renderStage();
    } else {
      settings.stageProgress = 0;
    }
  }
  saveJSON(LS_SETTINGS, settings);
  updateStats();
  if (settings.showButtonCounts) renderButtons();
  updateProgressCounter();
}

function getCurrentCount() {
  return logs.reduce((acc, l) => {
    const key = l.decisionId || l.decisionLabel;
    if (key === currentNoteId) acc += 1;
    return acc;
  }, 0);
}

function updateNoteCount() {
  noteCount.textContent = String(getCurrentCount());
}

function openNote(id, label) {
  currentNoteId = id;
  noteTitle.textContent = label;
  noteText.value = notes[id] || "";
  noteSheet.hidden = false;
  updateNoteCount();
  const sel = window.getSelection();
  if (sel) sel.removeAllRanges();
  noteText.focus();
}

function renderButtons() {
  buttonsEl.innerHTML = "";
  const counts = logs.reduce((acc, l) => {
    const key = l.decisionId || l.decisionLabel;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  settings.buttons.forEach((b) => {
    const btn = document.createElement("button");
    btn.className = "action";
    const count = counts[b.id] || 0;

    const labelSpan = document.createElement("span");
    labelSpan.className = "label";
    labelSpan.textContent = b.label.slice(0, LABEL_LIMIT);
    const trimmedLabel = labelSpan.textContent.trim();
    if (
      /^\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*$/u.test(
        trimmedLabel,
      )
    ) {
      labelSpan.classList.add("emoji-only");
    }
    btn.appendChild(labelSpan);

    if (settings.showButtonCounts) {
      const countSpan = document.createElement("span");
      countSpan.className = "count";
      countSpan.textContent = String(count);
      btn.appendChild(countSpan);
    }

    btn.style.background = b.color || "#3366cc";
    let holdTimeout;
    let held = false;
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      held = false;
      holdTimeout = setTimeout(() => {
        held = true;
        openNote(b.id, b.label);
      }, 600);
    });
    btn.addEventListener("pointerup", () => {
      clearTimeout(holdTimeout);
      if (!held) {
        handleAction(b.id);
      }
    });
    btn.addEventListener("pointerleave", () => {
      clearTimeout(holdTimeout);
    });
    btn.addEventListener("pointercancel", () => {
      clearTimeout(holdTimeout);
    });
    buttonsEl.appendChild(btn);
  });
  applyBottomArc(buttonsEl);
}

function renderStage() {
  const s = settings.stage;
  if (s === 1) {
    if (creatureEl.tagName !== "VIDEO") {
      const video = document.createElement("video");
      video.id = "creature";
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.setAttribute("muted", "");
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");
      video.src = "assets/videos/stage1.mov";
      creatureEl.replaceWith(video);
      creatureEl = video;
    } else {
      creatureEl.src = "assets/videos/stage1.mov";
      creatureEl.muted = true;
      creatureEl.setAttribute("muted", "");
      creatureEl.setAttribute("playsinline", "");
      creatureEl.setAttribute("webkit-playsinline", "");
      creatureEl.autoplay = true;
      creatureEl.loop = true;
    }
    const playCreature = () => creatureEl.play().catch(() => {});
    if (creatureEl.readyState >= 2) {
      playCreature();
    } else {
      creatureEl.addEventListener("canplay", playCreature, { once: true });
    }
    document.addEventListener("pointerdown", playCreature, { once: true });
  } else {
    if (creatureEl.tagName !== "IMG") {
      const img = document.createElement("img");
      img.id = "creature";
      img.alt = "Criatura";
      img.src = `assets/images/stage${s}.png`;
      creatureEl.replaceWith(img);
      creatureEl = img;
    } else {
      creatureEl.src = `assets/images/stage${s}.png`;
    }
  }
}

function playTapSound() {
  playSound("tap");
}
function playStageSound() {
  playSound("stage");
}
function playStageParticles() {
  confetti({ spread: 70, origin: { y: 0.6 } });
}
function playCompleteSound() {
  playSound("complete");
}

function updateProgressCounter() {
  const threshold = thresholds[settings.stage - 1];
  if (!threshold) {
    progressCounter.hidden = true;
    return;
  }
  const percent = Math.floor((settings.stageProgress / threshold) * 100);
  progressCounter.textContent = `${percent}%`;
  const shouldShow = settings.showProgressCounter || percent >= 85;
  progressCounter.hidden = !shouldShow;
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

function getHoursOfDayCounts() {
  const now = new Date();
  const counts = Array(24).fill(0);
  for (const item of logs) {
    const d = new Date(item.timestamp);
    if (isSameDay(d, now)) {
      counts[d.getHours()] += 1;
    }
  }
  return counts;
}

function getDaysOfWeekCounts() {
  const now = new Date();
  const current = isoWeek(now);
  const counts = Array(7).fill(0);
  for (const item of logs) {
    const d = new Date(item.timestamp);
    const w = isoWeek(d);
    if (w.year === current.year && w.week === current.week) {
      const day = (d.getDay() + 6) % 7;
      counts[day] += 1;
    }
  }
  return counts;
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

function getMonthsOfYearCounts() {
  const now = new Date();
  const year = now.getFullYear();
  const counts = Array(12).fill(0);
  for (const item of logs) {
    const d = new Date(item.timestamp);
    if (d.getFullYear() === year) {
      counts[d.getMonth()] += 1;
    }
  }
  return counts;
}

function drawChart() {
  if (!chartCanvas || !chartRange) return;
  const ctx = chartCanvas.getContext("2d");
  const w = chartCanvas.width;
  const h = chartCanvas.height;
  const marginLeft = 30;
  const marginBottom = 30;
  const originY = h - marginBottom;
  let data = [];
  let xLabel = "";
  let labelOffset = 1;
  switch (chartRange.value) {
    case "day":
      data = getHoursOfDayCounts();
      xLabel = t("hours");
      labelOffset = 0;
      break;
    case "week":
      data = getDaysOfWeekCounts();
      xLabel = t("days");
      break;
    case "month":
      data = getWeeksOfMonthCounts();
      xLabel = t("weeks");
      break;
    case "year":
      data = getMonthsOfYearCounts();
      xLabel = t("months");
      break;
  }
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
  ctx.fillText(xLabel, (w + marginLeft) / 2, h - 5);
  ctx.save();
  ctx.translate(15, h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(t("entries"), 0, 0);
  ctx.restore();
  const sampleLabel = String(data.length - 1 + labelOffset);
  const labelWidth = ctx.measureText(sampleLabel).width + 4;
  const step = Math.max(1, Math.ceil(labelWidth / barWidth));
  data.forEach((val, i) => {
    const barHeight = (val / max) * (originY - 10);
    const x = marginLeft + i * barWidth;
    ctx.fillStyle = "#66ccff";
    ctx.fillRect(x + 4, originY - barHeight, barWidth - 8, barHeight);
    ctx.fillStyle = "#000000";
    const label = String(i + labelOffset);
    if (i % step === 0 || i === data.length - 1) {
      ctx.fillText(label, x + barWidth / 2, h - marginBottom + 15);
    }
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
  settings.buttons.push({ id: uuid(), label, color });
  newLabel.value = "";
  saveJSON(LS_SETTINGS, settings);
  renderSettings();
  renderButtons();
});

toggleCounts.addEventListener("click", () => {
  settings.showButtonCounts = !settings.showButtonCounts;
  saveJSON(LS_SETTINGS, settings);
  toggleCounts.classList.toggle("off", !settings.showButtonCounts);
  toggleCounts.setAttribute(
    "aria-label",
    settings.showButtonCounts ? t("hideCounts") : t("showCounts"),
  );
  setVisibilityIcon(toggleCounts, settings.showButtonCounts);
  renderButtons();
});

toggleProgress.addEventListener("click", () => {
  settings.showProgressCounter = !settings.showProgressCounter;
  saveJSON(LS_SETTINGS, settings);
  toggleProgress.classList.toggle("off", !settings.showProgressCounter);
  toggleProgress.setAttribute(
    "aria-label",
    settings.showProgressCounter ? t("hideProgress") : t("showProgress"),
  );
  setVisibilityIcon(toggleProgress, settings.showProgressCounter);
  updateProgressCounter();
});

resetApp.addEventListener("click", () => {
  const ok = confirm(t("confirmReset"));
  if (!ok) return;
  localStorage.removeItem(LS_SETTINGS);
  localStorage.removeItem(LS_LOG);
  localStorage.removeItem(LS_NOTES);
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

closeNote.addEventListener("click", () => {
  notes[currentNoteId] = noteText.value;
  saveJSON(LS_NOTES, notes);
  noteSheet.hidden = true;
});

noteText.addEventListener("input", () => {
  notes[currentNoteId] = noteText.value;
  saveJSON(LS_NOTES, notes);
});

noteMinus.addEventListener("click", () => {
  if (getCurrentCount() > 0) {
    undoAction(currentNoteId);
    updateNoteCount();
  }
});

notePlus.addEventListener("click", () => {
  handleAction(currentNoteId);
  updateNoteCount();
});

function renderSettings() {
  lblCounts.textContent = t("counts");
  setVisibilityIcon(toggleCounts, settings.showButtonCounts);
  toggleCounts.classList.toggle("off", !settings.showButtonCounts);
  toggleCounts.setAttribute(
    "aria-label",
    settings.showButtonCounts ? t("hideCounts") : t("showCounts"),
  );
  lblProgress.textContent = t("progress");
  setVisibilityIcon(toggleProgress, settings.showProgressCounter);
  toggleProgress.classList.toggle("off", !settings.showProgressCounter);
  toggleProgress.setAttribute(
    "aria-label",
    settings.showProgressCounter ? t("hideProgress") : t("showProgress"),
  );

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
    color.value = b.color || "#3366cc";
    color.addEventListener("input", () => {
      settings.buttons[idx].color = color.value;
      saveJSON(LS_SETTINGS, settings);
      renderButtons();
      lastColor = color.value;
      newColor.value = lastColor;
    });

    const del = document.createElement("button");
    del.textContent = "✕";
    del.addEventListener("click", () => {
      settings.buttons.splice(idx, 1);
      delete notes[b.id];
      saveJSON(LS_SETTINGS, settings);
      saveJSON(LS_NOTES, notes);
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
