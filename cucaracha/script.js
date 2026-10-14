"use strict";

const game = document.querySelector("#game");
const floor = document.querySelector("#floor");
const floorContext = floor.getContext("2d");
const roachLayer = document.querySelector("#roaches");
const sandal = document.querySelector("#sandal");

const stageDisplay = document.querySelector("#stage");
const targetDisplay = document.querySelector("#target");
const scoreDisplay = document.querySelector("#score");
const timerDisplay = document.querySelector("#timer");
const roachesKilledDisplay = document.querySelector("#high-score");
const message = document.querySelector("#message");

const STAGE_TIME = 30;
const INITIAL_ROACHES = 5;
const ROACHES_PER_STAGE = 2;
const INITIAL_SPEED = 95;
const SPEED_PER_STAGE = 12;
const HIT_RADIUS = 58;
const ROACH_SIZE = 48;

const LANGUAGE_STORAGE_KEY = "roachPatrolLanguage";
const ROACHES_KILLED_STORAGE_KEY = "roachPatrolRoachesKilled";

const translations = {
  en: {
	  gameTitle: "Roach Patrol",
    language: "Language",
    stage: "Stage",
    target: "Target",
    hit: "Hit",
    time: "Time",
    best: "dead",
    instructions: "Click or tap to swat the roaches!",
    ready:
      "Clear all the roaches before the 30-second timer runs out. Use the music switch if you want background music.",
    start: "Start game",
    music: "Background music",
    stageCleared: "Stage cleared! Ready for stage {stage}?",
    continue: "Continue",
    done: "Done",
    timeUp: "Time's up! You hit {score} of {target}.",
    tryAgain: "Try again?"
  },
  es: {
	  gameTitle: "Putas cucarachas",
    language: "Idioma",
    stage: "Fase",
    target: "Objetivo",
    hit: "Aciertos",
    time: "Tiempo",
    best: "eliminadas",
    instructions: "¡Haz clic o toca para aplastar las cucarachas!",
    ready:
      "Elimina todas las cucarachas antes de que termine el límite de 30 segundos. Usa el interruptor si quieres música de fondo.",
    start: "Empezar",
    music: "Música de fondo",
    stageCleared: "¡Fase superada! ¿Listo para la fase {stage}?",
    continue: "Continuar",
    done: "Listo",
    timeUp: "¡Se acabó el tiempo! Has acertado {score} de {target}.",
    tryAgain: "¿Lo intentas de nuevo?"
  },
  zh: {
	  gameTitle: "打曱甴",
    language: "語言",
    stage: "關卡",
    target: "目標",
    hit: "擊中",
    time: "時間",
    best: "隻死曱甴",
    instructions: "撳一下或點一下，打曱甴！",
    ready: "喺30秒內清除所有曱甴。想播背景音樂就開啟音樂掣。",
    start: "開始遊戲",
    music: "背景音樂",
    stageCleared: "過關喇！準備好玩第 {stage} 關未？",
    continue: "繼續",
    done: "完成",
    timeUp: "時間到！你打中咗 {target} 隻入面嘅 {score} 隻。",
    tryAgain: "再玩一次？"
  }
};

const VALID_LANGUAGES = ["en", "es", "zh"];

const music = new Audio("lacucaracha.mp3");
music.loop = true;
music.volume = 0.25;

let language = getInitialLanguage();
let stage = 1;
let score = 0;
let target = INITIAL_ROACHES;
let timeLeft = STAGE_TIME;
let roachSpeed = INITIAL_SPEED;
let roachesKilled =
  Number(localStorage.getItem(ROACHES_KILLED_STORAGE_KEY)) || 0;
let roaches = [];
let running = false;
let lastFrame = 0;
let clockTimer = null;
let sandalTimeout = null;
let audioContext = null;
let overlayElement = null;

function getInitialLanguage() {
  const queryLanguage = new URLSearchParams(window.location.search).get("lang");

  if (VALID_LANGUAGES.includes(queryLanguage)) {
    return queryLanguage;
  }

  const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);

  if (VALID_LANGUAGES.includes(savedLanguage)) {
    return savedLanguage;
  }

  const browserLanguage = (navigator.language || "").toLowerCase();

  if (browserLanguage.startsWith("es")) return "es";

  if (
    browserLanguage.startsWith("zh-hk") ||
    browserLanguage.startsWith("zh-tw") ||
    browserLanguage.startsWith("zh-hant") ||
    browserLanguage.startsWith("yue")
  ) {
    return "zh";
  }

  return "en";
}

function text(key, values = {}) {
  let result = translations[language][key] ?? translations.en[key] ?? key;

  for (const [name, value] of Object.entries(values)) {
    result = result.replaceAll(`{${name}}`, String(value));
  }

  return result;
}

function updateLabels() {
  document.documentElement.lang = language === "zh" ? "zh-Hant-HK" : language;

  document.querySelector("#stage-label").textContent = text("stage");
  document.querySelector("#target-label").textContent = text("target");
  document.querySelector("#hit-label").textContent = text("hit");
  document.querySelector("#time-label").textContent = text("time");
  document.querySelector("#high-score-label").textContent = text("best");
  message.textContent = text("instructions");
}

function updateDisplays() {
  stageDisplay.textContent = stage;
  targetDisplay.textContent = target;
  scoreDisplay.textContent = score;
  timerDisplay.textContent = timeLeft;
  roachesKilledDisplay.textContent = roachesKilled;
}

function setLanguage(nextLanguage) {
  if (!VALID_LANGUAGES.includes(nextLanguage)) return;

  language = nextLanguage;
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);

  updateLabels();
  updateDisplays();

  // Refresh the translated text in the currently open dialog, if any.
  if (overlayElement) {
    const title = overlayElement.querySelector(".game-dialog-title");
    const body = overlayElement.querySelector(".game-dialog-message");
    const languageLabel = overlayElement.querySelector("#language-label");
    const musicLabel = overlayElement.querySelector(".music-toggle > span");

    if (title?.dataset.dialogType === "start") {
      title.textContent = text("gameTitle");
      body.textContent = text("ready");
    }

    if (languageLabel) languageLabel.textContent = text("language");
    if (musicLabel) musicLabel.textContent = text("music");

    const languageSelect = overlayElement.querySelector("#language");
    if (languageSelect) languageSelect.value = language;

    const buttons = [...overlayElement.querySelectorAll(".game-dialog-buttons button")];

    for (const button of buttons) {
      const key = button.dataset.translationKey;
      if (key) button.textContent = text(key);
    }
  }
}

function drawFloor() {
  const pixelSize = 4;
  const greys = ["#c9c9c6", "#d2d2cf", "#d9d9d6", "#e0e0dd"];
  const width = game.clientWidth;
  const height = game.clientHeight;
  const scale = window.devicePixelRatio || 1;

  floor.width = Math.round(width * scale);
  floor.height = Math.round(height * scale);
  floorContext.setTransform(scale, 0, 0, scale, 0, 0);

  for (let y = 0; y < height; y += pixelSize) {
    for (let x = 0; x < width; x += pixelSize) {
      floorContext.fillStyle = greys[Math.floor(Math.random() * greys.length)];
      floorContext.fillRect(x, y, pixelSize, pixelSize);
    }
  }
}

function playHitSound() {
  try {
    audioContext ??= new AudioContext();

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const now = audioContext.currentTime;
    const thump = audioContext.createOscillator();
    const thumpGain = audioContext.createGain();

    thump.type = "sine";
    thump.frequency.setValueAtTime(150, now);
    thump.frequency.exponentialRampToValueAtTime(55, now + 0.12);
    thumpGain.gain.setValueAtTime(0.45, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    thump.connect(thumpGain);
    thumpGain.connect(audioContext.destination);
    thump.start(now);
    thump.stop(now + 0.15);

    const bufferSize = Math.floor(audioContext.sampleRate * 0.08);
    const buffer = audioContext.createBuffer(
      1,
      bufferSize,
      audioContext.sampleRate
    );
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const noiseGain = audioContext.createGain();

    noise.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(350, now + 0.08);
    noiseGain.gain.setValueAtTime(0.45, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(audioContext.destination);
    noise.start(now);
  } catch {
    // The game remains playable if audio is unavailable.
  }
}

function showImpact(x, y) {
  const impact = document.createElement("span");

  impact.className = "impact";
  impact.textContent = "💥";
  impact.setAttribute("aria-hidden", "true");
  impact.style.left = `${x}px`;
  impact.style.top = `${y}px`;

  game.appendChild(impact);
  window.setTimeout(() => impact.remove(), 450);
}

function showOverlay({
  title,
  body,
  buttons,
  musicToggle = false,
  languagePicker = false,
  dialogType = ""
}) {
  overlayElement?.remove();

  const overlay = document.createElement("div");
  overlay.className = "game-dialog-overlay";

  const dialog = document.createElement("section");
  dialog.className = "game-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");

  const heading = document.createElement("h2");
  heading.className = "game-dialog-title";
  heading.textContent = title;
  heading.dataset.dialogType = dialogType;

  const content = document.createElement("p");
  content.className = "game-dialog-message";
  content.textContent = body;

  dialog.append(heading, content);

  if (languagePicker) {
    const languageControl = document.createElement("label");
    languageControl.className = "language-control";
    languageControl.htmlFor = "language";

    const labelText = document.createElement("span");
    labelText.id = "language-label";
    labelText.textContent = text("language");

    const select = document.createElement("select");
    select.id = "language";
    select.setAttribute("aria-labelledby", "language-label");

    const options = [
      ["en", "English"],
      ["es", "Español"],
      ["zh", "繁體中文"]
    ];

    for (const [value, label] of options) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.append(option);
    }

    select.value = language;
    select.addEventListener("change", () => setLanguage(select.value));

    languageControl.append(labelText, select);
    dialog.append(languageControl);
  }

  if (musicToggle) {
    const toggleLabel = document.createElement("label");
    toggleLabel.className = "music-toggle";

    const toggleText = document.createElement("span");
    toggleText.textContent = text("music");

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = !music.paused;
    input.setAttribute("aria-label", text("music"));

    const slider = document.createElement("span");
    slider.className = "music-slider";
    slider.setAttribute("aria-hidden", "true");

    input.addEventListener("change", () => {
      if (input.checked) {
        music.play().catch(() => {
          input.checked = false;
        });
      } else {
        music.pause();
        music.currentTime = 0;
      }
    });

    toggleLabel.append(toggleText, input, slider);
    dialog.append(toggleLabel);
  }

  const buttonRow = document.createElement("div");
  buttonRow.className = "game-dialog-buttons";

  for (const button of buttons) {
    const element = document.createElement("button");
    element.type = "button";
    element.textContent = button.label;

    if (button.translationKey) {
      element.dataset.translationKey = button.translationKey;
    }

    if (button.primary) {
      element.classList.add("primary");
    }

    element.addEventListener("click", () => {
      overlay.remove();
      overlayElement = null;
      button.onClick?.();
    });

    buttonRow.append(element);
  }

  dialog.append(buttonRow);
  overlay.append(dialog);
  document.body.append(overlay);
  overlayElement = overlay;

  dialog.querySelector("button")?.focus();
}

function showStart() {
  showOverlay({
    title: text("gameTitle"),
    body: text("ready"),
    musicToggle: true,
    languagePicker: true,
    dialogType: "start",
    buttons: [
      {
        label: text("start"),
        translationKey: "start",
        primary: true,
        onClick: startNewGame
      }
    ]
  });
}

function startNewGame() {
  stage = 1;
  startStage();
}

function startStage() {
  target = INITIAL_ROACHES + (stage - 1) * ROACHES_PER_STAGE;
  timeLeft = STAGE_TIME;
  roachSpeed = INITIAL_SPEED + (stage - 1) * SPEED_PER_STAGE;
  score = 0;
  running = true;

  clearInterval(clockTimer);
  removeAllRoaches();

  updateDisplays();
  message.textContent = text("instructions");

  for (let i = 0; i < target; i++) {
    spawnRoach();
  }

  lastFrame = performance.now();
  requestAnimationFrame(updateRoaches);
  clockTimer = window.setInterval(tick, 1000);
}

function tick() {
  if (!running) return;

  timeLeft = Math.max(0, timeLeft - 1);
  timerDisplay.textContent = timeLeft;

  if (timeLeft === 0) {
    endStage(false);
  }
}

function endStage(won) {
  if (!running) return;

  running = false;
  clearInterval(clockTimer);
  removeAllRoaches();

  if (won) {
    stage += 1;

    showOverlay({
      title: text("stageCleared", { stage }),
      body: text("stageCleared", { stage }),
      buttons: [
        {
          label: text("continue"),
          translationKey: "continue",
          primary: true,
          onClick: startStage
        }
      ]
    });

    return;
  }

  showOverlay({
    title: text("tryAgain"),
    body: text("timeUp", { score, target }),
    buttons: [
      {
        label: text("tryAgain"),
        translationKey: "tryAgain",
        primary: true,
        onClick: showStart
      },
      {
        label: text("done"),
        translationKey: "done",
        onClick: showStart
      }
    ]
  });
}

function spawnRoach() {
  const bounds = game.getBoundingClientRect();
  const halfSize = ROACH_SIZE / 2;
  const minX = halfSize;
  const maxX = Math.max(minX, bounds.width - halfSize);
  const minY = halfSize;
  const maxY = Math.max(minY, bounds.height - halfSize);
  const x = minX + Math.random() * (maxX - minX);
  const y = minY + Math.random() * (maxY - minY);
  const angle = Math.random() * Math.PI * 2;

  const element = document.createElement("div");
  element.className = "roach";
  element.textContent = "🪳";
  roachLayer.appendChild(element);

  roaches.push({
    element,
    x,
    y,
    vx: Math.cos(angle) * roachSpeed,
    vy: Math.sin(angle) * roachSpeed
  });

  positionRoach(roaches[roaches.length - 1]);
}

function positionRoach(roach) {
  const angle = Math.atan2(roach.vy, roach.vx) * (180 / Math.PI) + 90;

  roach.element.style.transform =
    `translate(${roach.x - ROACH_SIZE / 2}px, ${roach.y - ROACH_SIZE / 2}px) rotate(${angle}deg)`;
}

function updateRoaches(now) {
  if (!running) return;

  const delta = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;

  const bounds = game.getBoundingClientRect();
  const halfSize = ROACH_SIZE / 2;
  const maxX = Math.max(halfSize, bounds.width - halfSize);
  const maxY = Math.max(halfSize, bounds.height - halfSize);

  for (const roach of roaches) {
    roach.x += roach.vx * delta;
    roach.y += roach.vy * delta;

    if (roach.x < halfSize) {
      roach.x = halfSize;
      roach.vx = Math.abs(roach.vx);
    } else if (roach.x > maxX) {
      roach.x = maxX;
      roach.vx = -Math.abs(roach.vx);
    }

    if (roach.y < halfSize) {
      roach.y = halfSize;
      roach.vy = Math.abs(roach.vy);
    } else if (roach.y > maxY) {
      roach.y = maxY;
      roach.vy = -Math.abs(roach.vy);
    }

    positionRoach(roach);
  }

  requestAnimationFrame(updateRoaches);
}

function removeAllRoaches() {
  for (const roach of roaches) {
    roach.element.remove();
  }

  roaches = [];
}

function showSandal(x, y) {
  sandal.style.left = `${x}px`;
  sandal.style.top = `${y}px`;
  sandal.style.display = "block";

  sandal.style.animation = "none";
  void sandal.offsetWidth;
  sandal.style.animation = "";

  window.clearTimeout(sandalTimeout);
  sandalTimeout = window.setTimeout(() => {
    sandal.style.display = "none";
  }, 220);
}

game.addEventListener("pointerdown", (event) => {
  const bounds = game.getBoundingClientRect();
  const x = event.clientX - bounds.left;
  const y = event.clientY - bounds.top;

  showSandal(x, y);

  if (!running) return;

  const hitIndex = roaches.findIndex(
    (roach) => Math.hypot(roach.x - x, roach.y - y) < HIT_RADIUS
  );

  if (hitIndex === -1) return;

  roaches[hitIndex].element.remove();
  roaches.splice(hitIndex, 1);

  score += 1;
  roachesKilled += 1;

  scoreDisplay.textContent = score;
  roachesKilledDisplay.textContent = roachesKilled;

  localStorage.setItem(
    ROACHES_KILLED_STORAGE_KEY,
    String(roachesKilled)
  );

  showImpact(x, y);
  playHitSound();

  if ("vibrate" in navigator) {
    navigator.vibrate(45);
  }

  if (roaches.length === 0) {
    endStage(true);
  }
});

function initialize() {
  updateLabels();
  updateDisplays();
  drawFloor();
  window.addEventListener("resize", drawFloor);
  showStart();
}

initialize();
