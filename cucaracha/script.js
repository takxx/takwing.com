const game = document.querySelector("#game");
const floor = document.querySelector("#floor");
const floorContext = floor.getContext("2d");
const roachLayer = document.querySelector("#roaches");
const sandal = document.querySelector("#sandal");

const stageDisplay = document.querySelector("#stage");
const targetDisplay = document.querySelector("#target");
const scoreDisplay = document.querySelector("#score");
const timerDisplay = document.querySelector("#timer");
const highScoreDisplay = document.querySelector("#high-score");
const message = document.querySelector("#message");
const languageSelect = document.querySelector("#language");

const translations = {
  en: {
    language: "Language",
    stage: "Stage",
    target: "Target",
    hit: "Hit",
    time: "Time",
    best: "Best",
    instructions: "Click or tap to swat the roaches!",
    ready: "Roach Patrol\n\nHit the target number of roaches before time runs out. Click or tap to swing the sandal. Ready?",
    stageCleared: "Stage cleared! Ready for stage {stage}?",
    timeUp: "Time's up! You hit {score} of {target}. Try again?",
    refresh: "Refresh the page when you're ready to play."
  },
  es: {
    language: "Idioma",
    stage: "Fase",
    target: "Objetivo",
    hit: "Aciertos",
    time: "Tiempo",
    best: "Récord",
    instructions: "¡Haz clic o toca para aplastar las cucarachas!",
    ready: "Putas cucarachas\n\nAplasta el número de cucarachas indicado antes de que se acabe el tiempo. Haz clic o toca para dar un zapatillazo. ¿Preparado?",
    stageCleared: "¡Fase superada! ¿Listo para la fase {stage}?",
    timeUp: "¡Se acabó el tiempo! Has acertado {score} de {target}. ¿Lo intentas de nuevo?",
    refresh: "Recarga la página cuando quieras jugar."
  },
  zh: {
    language: "語言",
    stage: "關卡",
    target: "目標",
    hit: "擊中",
    time: "時間",
    best: "最高紀錄",
    instructions: "撳一下或點一下，打曱甴！",
    ready: "打曱甴\n\n喺時間完之前打中指定數量嘅曱甴。撳一下或點一下用拖鞋拍落去。準備好未？",
    stageCleared: "過關喇！準備好玩第 {stage} 關未？",
    timeUp: "時間到！你打中咗 {target} 隻入面嘅 {score} 隻。再玩一次？",
    refresh: "想玩嘅時候，重新載入呢頁。"
  }
};

const VALID_LANGUAGES = ["en", "es", "zh"];
const LANGUAGE_STORAGE_KEY = "roachPatrolLanguage";
const HIGH_SCORE_STORAGE_KEY = "roachPatrolHighScore";

let stage = 1;
let score = 0;
let target = 5;
let timeLeft = 20;
let spawnInterval = 900;
let roachSpeed = 95;
let running = false;
let lastFrame = 0;
let spawnTimer;
let clockTimer;
let roaches = [];
let highScore = Number(localStorage.getItem(HIGH_SCORE_STORAGE_KEY)) || 0;
let audioContext;

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

let language = getInitialLanguage();

function text(key, values = {}) {
  let result = translations[language][key] ?? translations.en[key] ?? key;

  for (const [name, value] of Object.entries(values)) {
    result = result.replaceAll(`{${name}}`, value);
  }

  return result;
}

function updateLabels() {
  document.documentElement.lang = language === "zh" ? "zh-Hant-HK" : language;
  document.querySelector("#language-label").textContent = text("language");
  document.querySelector("#stage-label")?.replaceChildren(text("stage"));
  document.querySelector("#target-label")?.replaceChildren(text("target"));
  document.querySelector("#hit-label")?.replaceChildren(text("hit"));
  document.querySelector("#time-label")?.replaceChildren(text("time"));
  document.querySelector("#high-score-label").textContent = text("best");
  message.textContent = text("instructions");
}

function setLanguage(nextLanguage) {
  if (!VALID_LANGUAGES.includes(nextLanguage)) return;

  language = nextLanguage;
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  languageSelect.value = language;
  updateLabels();

  stageDisplay.textContent = stage;
  targetDisplay.textContent = target;
  scoreDisplay.textContent = score;
  timerDisplay.textContent = timeLeft;
  highScoreDisplay.textContent = highScore;
}

function drawFloor() {
  const pixelSize = 4;
  const greys = ["#c9c9c6", "#d2d2cf", "#d9d9d6", "#e0e0dd"];
  const width = game.clientWidth;
  const height = game.clientHeight;
  const scale = window.devicePixelRatio || 1;

  floor.width = width * scale;
  floor.height = height * scale;
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

    // Low thump
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

    // Short, bright slap
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
  const bounds = game.getBoundingClientRect();
  const impact = document.createElement("span");

  impact.textContent = "💥";
  impact.setAttribute("aria-hidden", "true");
  impact.style.cssText = `
    position: absolute;
    z-index: 11;
    left: ${Math.max(12, Math.min(x - 34, bounds.width - 12))}px;
    top: ${Math.max(12, Math.min(y , bounds.height - 12))}px;
    transform: translate(-50%, -50%);
    font-size: 38px;
    pointer-events: none;
  `;

  game.appendChild(impact);
  window.setTimeout(() => impact.remove(), 450);
}

function startStage() {
  target = 5 + (stage - 1) * 2;
  timeLeft = Math.max(8, 20 - (stage - 1));
  spawnInterval = Math.max(500, 1200 - (stage - 1) * 45);
  roachSpeed = 95 + (stage - 1) * 12;
  score = 0;
  running = true;

  stageDisplay.textContent = stage;
  targetDisplay.textContent = target;
  scoreDisplay.textContent = score;
  timerDisplay.textContent = timeLeft;
  message.textContent = text("instructions");

  clearInterval(spawnTimer);
  clearInterval(clockTimer);
  removeAllRoaches();

  spawnRoach();
  spawnTimer = setInterval(spawnRoach, spawnInterval);
  clockTimer = setInterval(tick, 1000);
  lastFrame = performance.now();
  requestAnimationFrame(updateRoaches);
}

function tick() {
  if (!running) return;

  timeLeft -= 1;
  timerDisplay.textContent = timeLeft;

  if (timeLeft <= 0) endStage(false);
}

function endStage(won) {
  if (!running) return;

  running = false;
  clearInterval(spawnTimer);
  clearInterval(clockTimer);
  removeAllRoaches();

  if (won) {
    stage += 1;
    window.setTimeout(() => {
      if (window.confirm(text("stageCleared", { stage }))) {
        startStage();
      } else {
        showStart();
      }
    }, 100);
  } else {
    window.setTimeout(() => {
      if (window.confirm(text("timeUp", { score, target }))) {
        stage = 1;
        showStart();
      } else {
        showStart();
      }
    }, 100);
  }
}

function showStart() {
  window.setTimeout(() => {
    if (window.confirm(text("ready"))) {
      stage = 1;
      startStage();
    } else {
      message.textContent = text("refresh");
    }
  }, 0);
}

function spawnRoach() {
  if (!running) return;

  const bounds = game.getBoundingClientRect();
  const edge = Math.floor(Math.random() * 4);
  let x;
  let y;

  if (edge === 0) {
    x = Math.random() * bounds.width;
    y = -35;
  } else if (edge === 1) {
    x = bounds.width + 35;
    y = Math.random() * bounds.height;
  } else if (edge === 2) {
    x = Math.random() * bounds.width;
    y = bounds.height + 35;
  } else {
    x = -35;
    y = Math.random() * bounds.height;
  }

  const destinationX = bounds.width * (0.25 + Math.random() * 0.5);
  const destinationY = bounds.height * (0.2 + Math.random() * 0.6);
  const dx = destinationX - x;
  const dy = destinationY - y;
  const length = Math.hypot(dx, dy) || 1;

  const element = document.createElement("div");
  element.className = "roach";
  element.textContent = "🪳";
  roachLayer.appendChild(element);

  roaches.push({
    element,
    x,
    y,
    vx: (dx / length) * roachSpeed,
    vy: (dy / length) * roachSpeed
  });
}

function updateRoaches(now) {
  if (!running) return;

  const delta = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;
  const bounds = game.getBoundingClientRect();

  roaches = roaches.filter((roach) => {
    roach.x += roach.vx * delta;
    roach.y += roach.vy * delta;

    const angle = Math.atan2(roach.vy, roach.vx) * (180 / Math.PI) + 90;
    roach.element.style.transform =
      `translate(${roach.x}px, ${roach.y}px) rotate(${angle}deg)`;

    const outside =
      roach.x < -90 || roach.x > bounds.width + 90 ||
      roach.y < -90 || roach.y > bounds.height + 90;

    if (outside) {
      roach.element.remove();
      return false;
    }

    return true;
  });

  requestAnimationFrame(updateRoaches);
}

function removeAllRoaches() {
  roaches.forEach((roach) => roach.element.remove());
  roaches = [];
}

function showSandal(x, y) {
  sandal.style.left = `${x}px`;
  sandal.style.top = `${y}px`;
  sandal.style.display = "block";

  sandal.style.animation = "none";
  void sandal.offsetWidth;
  sandal.style.animation = "";

  window.setTimeout(() => {
    sandal.style.display = "none";
  }, 220);
}

game.addEventListener("pointerdown", (event) => {
  const bounds = game.getBoundingClientRect();
  const x = event.clientX - bounds.left;
  const y = event.clientY - bounds.top;

  showSandal(x, y);
  if (!running) return;

  // Increase this number for a more forgiving hit area.
  const hitRadius = 58;
  const hitIndex = roaches.findIndex(
    (roach) => Math.hypot(roach.x - x, roach.y - y) < hitRadius
  );

  if (hitIndex === -1) return;

  roaches[hitIndex].element.remove();
  roaches.splice(hitIndex, 1);

  score += 1;
  scoreDisplay.textContent = score;
  showImpact(x, y);
  playHitSound();

  if ("vibrate" in navigator) {
    navigator.vibrate(45);
  }

  if (score > highScore) {
    highScore = score;
    localStorage.setItem(HIGH_SCORE_STORAGE_KEY, String(highScore));
    highScoreDisplay.textContent = highScore;
  }

  if (score >= target) endStage(true);
});

languageSelect.value = language;
languageSelect.addEventListener("change", () => {
  setLanguage(languageSelect.value);
});

highScoreDisplay.textContent = highScore;
updateLabels();
drawFloor();
window.addEventListener("resize", drawFloor);
showStart();
