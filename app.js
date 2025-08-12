// Config persistente
const LS_SETTINGS = "habitSettings";
const LS_LOG = "habitLog";

const defaultSettings = {
  buttons: [{ label: "Decision" }], // por defecto 1
  showStatsHUD: false,
  stage: 1,
  stageProgress: 0
};

const thresholds = [8, 20, 80, 150, 300]; // 1→2, 2→3, 3→4, 4→5, 5→6

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
const sfxTap = document.getElementById("sfx-tap");
const sfxStage = document.getElementById("sfx-stage");
const btnSettings = document.getElementById("btn-settings");
const settingsSheet = document.getElementById("settings");
const addButton = document.getElementById("add-button");
const newLabel = document.getElementById("new-label");
const buttonList = document.getElementById("button-list");
const toggleStats = document.getElementById("toggle-stats");
const closeSettings = document.getElementById("close-settings");

// Init
renderStage();
renderButtons();
renderSettings();
updateHUDStatsVisibility();
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

  // Progreso de etapa
  settings.stageProgress += 1;
  const canAdvance = settings.stage < 6 && settings.stageProgress >= thresholds[settings.stage - 1];

  if (canAdvance) {
    settings.stage += 1;
    settings.stageProgress = 0;
    saveJSON(LS_SETTINGS, settings);
    renderStage();
    playStageSound();
  } else {
    playTapSound();
  }

  updateStats();
}

function renderButtons() {
  buttonsEl.innerHTML = "";
  settings.buttons.forEach((b) => {
    const btn = document.createElement("button");
    btn.className = "action";
    btn.textContent = b.label;
    btn.addEventListener("click", () => handleAction(b.label));
    buttonsEl.appendChild(btn);
  });
  applyDownwardArc(buttonsEl);
}

function renderStage() {
  const s = settings.stage;
  creatureEl.src = `assets/images/stage${s}.png`;
  envEl.style.backgroundImage = `url('assets/images/stage${s}.png')`;
}

function playTapSound() {
  safePlay(sfxTap);
}
function playStageSound() {
  safePlay(sfxStage);
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
    if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) month++;
  }

  statToday.textContent = String(today);
  statWeek.textContent = String(week);
  statMonth.textContent = String(month);
  statTotal.textContent = String(total);
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
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

btnSettings.addEventListener("click", () => {
  settingsSheet.hidden = false;
});

closeSettings.addEventListener("click", () => {
  settingsSheet.hidden = true;
  renderButtons();
  updateHUDStatsVisibility();
});

addButton.addEventListener("click", () => {
  const label = newLabel.value.trim();
  if (!label) return;
  settings.buttons.push({ label });
  newLabel.value = "";
  saveJSON(LS_SETTINGS, settings);
  renderSettings();
});

toggleStats.addEventListener("change", () => {
  settings.showStatsHUD = toggleStats.checked;
  saveJSON(LS_SETTINGS, settings);
  updateHUDStatsVisibility();
});

function updateHUDStatsVisibility() {
  hudStatsBtn.style.display = settings.showStatsHUD ? "inline-flex" : "none";
  if (!settings.showStatsHUD) statsSheet.hidden = true;
}

function renderSettings() {
  // Rehidratar ajustes
  toggleStats.checked = !!settings.showStatsHUD;

  buttonList.innerHTML = "";
  settings.buttons.forEach((b, idx) => {
    const li = document.createElement("li");

    const input = document.createElement("input");
    input.type = "text";
    input.value = b.label;
    input.addEventListener("input", () => {
      settings.buttons[idx].label = input.value;
      saveJSON(LS_SETTINGS, settings);
    });

    const up = document.createElement("button");
    up.textContent = "↑";
    up.addEventListener("click", () => {
      if (idx === 0) return;
      move(settings.buttons, idx, idx - 1);
      saveJSON(LS_SETTINGS, settings);
      renderSettings();
    });

    const down = document.createElement("button");
    down.textContent = "↓";
    down.addEventListener("click", () => {
      if (idx === settings.buttons.length - 1) return;
      move(settings.buttons, idx, idx + 1);
      saveJSON(LS_SETTINGS, settings);
      renderSettings();
    });

    const del = document.createElement("button");
    del.textContent = "✕";
    del.addEventListener("click", () => {
      settings.buttons.splice(idx, 1);
      saveJSON(LS_SETTINGS, settings);
      renderSettings();
    });

    li.append(input, up, down, del);
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
function applyDownwardArc(container) {
  const items = Array.from(container.children);
  const n = items.length;
  if (n === 0) return;
  const mid = (n - 1) / 2;
  const amplitude = 10; // px extra hacia arriba en extremos
  items.forEach((el, i) => {
    const offset = -Math.pow(i - mid, 2) * (amplitude / (mid === 0 ? 1 : mid * mid)) + amplitude;
    // Queremos el centro más bajo. Desplazamos Y positiva hacia abajo.
    const down = amplitude - offset; // centro más grande
    el.style.transform = `translateY(${down.toFixed(1)}px)`;
  });
}