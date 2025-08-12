// Config persistente
const LS_SETTINGS = "habitSettings";
const LS_LOG = "habitLog";

const defaultSettings = {
  buttons: [{ label: "Decision", color: "#ffcc66" }], // por defecto 1
  showButtonCounts: false,
  stage: 1,
  stageProgress: 0,
};

const thresholds = [2, 3, 4, 5, 6]; // 1→2, 2→3, 3→4, 4→5, 5→6

let settings = loadJSON(LS_SETTINGS, defaultSettings);
let logs = loadJSON(LS_LOG, []);

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
const newColor = document.getElementById("new-color");
const buttonList = document.getElementById("button-list");
const toggleCounts = document.getElementById("toggle-counts");
const closeSettings = document.getElementById("close-settings");
const resetApp = document.getElementById("reset-app");

let dragIndex = null;

// Init
renderStage();
renderButtons();
renderSettings();
updateStats();

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
    btn.textContent = b.label;
    btn.style.background = b.color || "#ffcc66";
    btn.addEventListener("click", () => handleAction(b.label));
    if (settings.showButtonCounts) {
      btn.dataset.showCount = "true";
      btn.dataset.count = String(counts[b.label] || 0);
    } else {
      btn.dataset.showCount = "false";
    }
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

addButton.addEventListener("click", () => {
  const label = newLabel.value.trim();
  if (!label) return;
  const color = newColor.value;
  settings.buttons.push({ label, color });
  newLabel.value = "";
  newColor.value = "#ffcc66";
  saveJSON(LS_SETTINGS, settings);
  renderSettings();
  renderButtons();
});

toggleCounts.addEventListener("click", () => {
  settings.showButtonCounts = !settings.showButtonCounts;
  saveJSON(LS_SETTINGS, settings);
  toggleCounts.textContent = settings.showButtonCounts
    ? "Ocultar contadores"
    : "Mostrar contadores";
  renderButtons();
});

resetApp.addEventListener("click", () => {
  const ok = confirm("¿Reiniciar la app? Se borrarán todos los datos.");
  if (!ok) return;
  localStorage.removeItem(LS_SETTINGS);
  localStorage.removeItem(LS_LOG);
  location.reload();
});

function renderSettings() {
  toggleCounts.textContent = settings.showButtonCounts
    ? "Ocultar contadores"
    : "Mostrar contadores";

  buttonList.innerHTML = "";
  settings.buttons.forEach((b, idx) => {
    const li = document.createElement("li");
    li.dataset.index = String(idx);

    const handle = document.createElement("span");
    handle.textContent = "☰";
    handle.className = "drag-handle";
    handle.draggable = true;
    handle.addEventListener("dragstart", () => {
      dragIndex = idx;
    });

    li.addEventListener("dragover", (e) => {
      e.preventDefault();
    });
    li.addEventListener("drop", () => {
      const to = Number(li.dataset.index);
      if (dragIndex === null || dragIndex === to) return;
      move(settings.buttons, dragIndex, to);
      saveJSON(LS_SETTINGS, settings);
      renderSettings();
      renderButtons();
    });

    const input = document.createElement("input");
    input.type = "text";
    input.value = b.label;
    input.addEventListener("input", () => {
      settings.buttons[idx].label = input.value;
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

  saveJSON(LS_SETTINGS, settings);
}

// Utilidades
function loadJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, val) {
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
