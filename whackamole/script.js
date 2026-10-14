const translations = {
  en: {
    pageTitle: "Whack-a-Mole! — Funfair Challenge",
    langCode: "en-GB",
    arcade: "THE MIDWAY ARCADE",
    title: "Whack-a-Mole!",
    subtitle: "Step right up and test your reflexes.",
    mole: "MOLE",
    madness: "MADNESS",
    gameLabel: "Whack-a-mole game",
    holesLabel: "Mole holes",
    round: "ROUND",
    target: "TARGET",
    score: "SCORE",
    time: "TIME",
    highScore: "HIGH SCORE",
    readyStatus: "Ready for a little friendly competition?",
    help: "Tap or click a mole when it pops up. Each round gets quicker!",
    language: "Language",
    newGame: "New game",
    ready: "READY, PLAYER?",
    roundEyebrow: (stage) => `ROUND ${stage}`,
    firstTitle: "Step right up!",
    nextTitle: "Next round!",
    firstCopy: "The carnival challenge is about to begin.",
    nextCopy: "The crowd is cheering. Can you beat the next challenge?",
    objective: "YOUR OBJECTIVE",
    objectiveText: (target, time) => `Hit ${target} moles in ${time} seconds`,
    relaxed: "Relaxed Mode",
    relaxedDescription: "Slower moles and a slower countdown",
    start: "Start game",
    next: "Start next round",
    playAgain: "Play again",
    statusStart: (stage, target) => `Round ${stage}: hit ${target} moles before time runs out!`,
    remaining: (count, stage) => `${count} more to clear round ${stage}.`,
    cleared: (stage) => `Round ${stage} cleared!`,
    timesUp: "TIME'S UP!",
    tryAgain: "Have another go?",
    lostCopy: (hits, target) => `You hit ${hits} of ${target} moles. Take a breath, then try again!`,
    newRecord: "New high score!",
  },

  es: {
    pageTitle: "¡A golpear topos! — Feria",
    langCode: "es-ES",
    arcade: "LA FERIA",
    title: "¡A golpear topos!",
    subtitle: "¡Acércate y demuestra tus reflejos!",
    mole: "TOPOS",
    madness: "¡A TOPE!",
    gameLabel: "Juego de golpear topos",
    holesLabel: "Agujeros de los topos",
    round: "RONDA",
    target: "OBJETIVO",
    score: "PUNTOS",
    time: "TIEMPO",
    highScore: "RÉCORD",
    readyStatus: "¿Listo para un poco de competición amistosa?",
    help: "Toca o haz clic en un topo cuando aparezca. ¡Cada ronda será más rápida!",
    language: "Idioma",
    newGame: "Nueva partida",
    ready: "¿PREPARADO?",
    roundEyebrow: (stage) => `RONDA ${stage}`,
    firstTitle: "¡Pasa y juega!",
    nextTitle: "¡Siguiente ronda!",
    firstCopy: "El reto de la feria está a punto de empezar.",
    nextCopy: "¡El público está animándote! ¿Superarás el siguiente reto?",
    objective: "TU OBJETIVO",
    objectiveText: (target, time) => `Golpea ${target} topos en ${time} segundos`,
    relaxed: "Modo relajado",
    relaxedDescription: "Topos más lentos y cuenta atrás más pausada",
    start: "Empezar",
    next: "Empezar siguiente ronda",
    playAgain: "Jugar otra vez",
    statusStart: (stage, target) => `Ronda ${stage}: golpea ${target} topos antes de que se acabe el tiempo.`,
    remaining: (count, stage) => `Te faltan ${count} para superar la ronda ${stage}.`,
    cleared: (stage) => `¡Ronda ${stage} superada!`,
    timesUp: "¡SE ACABÓ EL TIEMPO!",
    tryAgain: "¿Otra partida?",
    lostCopy: (hits, target) => `Has golpeado ${hits} de ${target} topos. ¡Respira y vuelve a intentarlo!`,
    newRecord: "¡Nuevo récord!",
  },

  zh: {
    pageTitle: "扑傻瓜！— 嘉年華挑戰",
    langCode: "zh-HK",
    arcade: "嘉年華遊戲攤位",
    title: "扑傻瓜！",
    subtitle: "快啲嚟試下你嘅反應！",
    mole: "扑傻瓜",
    madness: "大挑戰",
    gameLabel: "扑傻瓜遊戲",
    holesLabel: "傻瓜洞",
    round: "關卡",
    target: "目標",
    score: "分數",
    time: "時間",
    highScore: "最高分",
    readyStatus: "準備好玩一場未？",
    help: "傻瓜一出現就撳落去！每一關都會快啲。",
    language: "語言",
    newGame: "重新開始",
    ready: "準備好未？",
    roundEyebrow: (stage) => `第 ${stage} 關`,
    firstTitle: "快啲嚟玩！",
    nextTitle: "下一關！",
    firstCopy: "嘉年華挑戰就快開始喇。",
    nextCopy: "大家都喺度幫你打氣！下一個挑戰難啲喎。",
    objective: "今關目標",
    objectiveText: (target, time) => `${time} 秒內扑中 ${target} 次`,
    relaxed: "輕鬆模式",
    relaxedDescription: "傻瓜出現耐啲，倒數亦會慢一半",
    start: "開始遊戲",
    next: "開始下一關",
    playAgain: "再玩一次",
    statusStart: (stage, target) => `第 ${stage} 關：時間完之前扑中 ${target} 次！`,
    remaining: (count, stage) => `仲差 ${count} 次就過第 ${stage} 關。`,
    cleared: (stage) => `過咗第 ${stage} 關！`,
    timesUp: "時間到！",
    tryAgain: "再試一次？",
    lostCopy: (hits, target) => `你扑中咗 ${target} 次目標入面嘅 ${hits} 次。唞一唞再試啦！`,
    newRecord: "新紀錄！",
  },
};

const LANGUAGE_KEY = "whack-a-mole-language";
const HIGH_SCORE_KEY = "whack-a-mole-high-score";

const stageDisplay = document.querySelector("#stage");
const targetDisplay = document.querySelector("#target");
const scoreDisplay = document.querySelector("#score");
const timeDisplay = document.querySelector("#time");
const highScoreDisplay = document.querySelector("#highScore");
const statusDisplay = document.querySelector("#status");

const dialog = document.querySelector("#roundDialog");
const dialogEyebrow = document.querySelector("#dialogEyebrow");
const dialogTitle = document.querySelector("#dialogTitle");
const dialogCopy = document.querySelector("#dialogCopy");
const dialogObjective = document.querySelector("#dialogObjective");
const confirmButton = document.querySelector("#confirmButton");
const relaxedControl = document.querySelector("#relaxedControl");
const relaxedToggle = document.querySelector("#relaxedToggle");
const languageSelect = document.querySelector("#languageSelect");

const holes = [...document.querySelectorAll(".hole")];
const restartButton = document.querySelector("#restartButton");

let stage = 1;
let target = 5;
let score = 0;
let stageScore = 0;
let timeLeft = 30;
let running = false;
let relaxedMode = false;
let activeHole = null;
let moleTimer = null;
let countdownTimer = null;
let nextMoleTimer = null;
let language = getInitialLanguage();

  const board = document.querySelector(".playfield");
  const canvas = document.createElement("canvas");
  const size = 128;
  const colors = [
    [117, 67, 45],
    [180, 119, 75],
    [137, 80, 52],
    [96, 53, 31]
  ];

  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  const image = context.createImageData(size, size);

  for (let i = 0; i < image.data.length; i += 4) {
    const color = colors[Math.floor(Math.random() * colors.length)];
    image.data[i] = color[0];
    image.data[i + 1] = color[1];
    image.data[i + 2] = color[2];
    image.data[i + 3] = 255;
  }

  context.putImageData(image, 0, 0);
  board.style.backgroundImage = `url(${canvas.toDataURL()})`;
  board.style.backgroundSize = "100% 100%";


function normalizeLanguage(value) {
  if (!value) return null;

  const normalized = value.trim().toLowerCase();
  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  if (normalized === "es" || normalized.startsWith("es-")) return "es";
  if (
    normalized === "zh" ||
    normalized.startsWith("zh-") ||
    normalized.startsWith("zh_")
  ) {
    return "zh";
  }

  return null;
}

function getInitialLanguage() {
  const params = new URLSearchParams(window.location.search);
  const urlLanguage = normalizeLanguage(params.get("lang"));

  if (urlLanguage) {
    localStorage.setItem(LANGUAGE_KEY, urlLanguage);
    return urlLanguage;
  }

  const savedLanguage = normalizeLanguage(localStorage.getItem(LANGUAGE_KEY));
  if (savedLanguage) return savedLanguage;

  const browserLanguages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language || "en"];

  for (const browserLanguage of browserLanguages) {
    const detected = normalizeLanguage(browserLanguage);
    if (detected) return detected;
  }

  return "en";
}

function t(key, ...args) {
  const value = translations[language][key] ?? translations.en[key];
  return typeof value === "function" ? value(...args) : value;
}

function applyTranslations() {
  document.documentElement.lang = t("langCode");
  document.title = t("pageTitle");

  const textById = {
    eyebrow: "arcade",
    gameTitle: "title",
    subtitle: "subtitle",
    marqueeMole: "mole",
    marqueeMadness: "madness",
    stageLabel: "round",
    targetLabel: "target",
    scoreLabel: "score",
    timeLabel: "time",
    highScoreLabel: "highScore",
    languageLabel: "language",
    restartButton: "newGame",
    objectiveLabel: "objective",
    relaxedLabel: "relaxed",
    relaxedDescription: "relaxedDescription",
    helpText: "help",
  };

  for (const [id, key] of Object.entries(textById)) {
    document.getElementById(id).textContent = t(key);
  }

  document.querySelector("#machine").setAttribute("aria-label", t("gameLabel"));
  document.querySelector("#playfield").setAttribute("aria-label", t("holesLabel"));

  holes.forEach((hole, index) => {
    hole.setAttribute("aria-label", `${index + 1}`);
  });

  languageSelect.value = language;
  updateDisplay();

  if (dialog.open) {
    if (stage === 1 && score === 0) {
      showRoundDialog("first");
    } else if (!running && timeLeft <= 0) {
      showRoundDialog("gameOver");
    } else {
      showRoundDialog("next");
    }
  }
}

function setLanguage(nextLanguage) {
  if (!translations[nextLanguage]) return;
  language = nextLanguage;
  localStorage.setItem(LANGUAGE_KEY, language);
  applyTranslations();
}

function readHighScore() {
  const saved = Number.parseInt(localStorage.getItem(HIGH_SCORE_KEY), 10);
  return Number.isFinite(saved) && saved > 0 ? saved : 0;
}

function updateDisplay() {
  stageDisplay.textContent = stage;
  targetDisplay.textContent = target;
  scoreDisplay.textContent = score;
  timeDisplay.textContent = timeLeft;
  highScoreDisplay.textContent = readHighScore();
}

function clearTimers() {
  clearTimeout(moleTimer);
  clearTimeout(nextMoleTimer);
  clearInterval(countdownTimer);
}

function hideMoles() {
  holes.forEach((hole) => hole.classList.remove("is-up", "is-hit"));
  activeHole = null;
}

function stageDuration() {
  return Math.max(12, 30 - (stage - 1) * 2);
}

function moleTimings() {
  const speed = relaxedMode ? 2 : 1;
  return {
    visible: Math.max(350, 1100 - (stage - 1) * 85) * speed,
    pause: Math.max(120, 650 - (stage - 1) * 45) * speed,
  };
}

function showRoundDialog(kind) {
  const initial = kind === "first";
  const gameOver = kind === "gameOver";

  dialogEyebrow.textContent = initial
    ? t("ready")
    : gameOver
      ? t("timesUp")
      : t("roundEyebrow", stage);

  dialogTitle.textContent = initial
    ? t("firstTitle")
    : gameOver
      ? t("tryAgain")
      : t("nextTitle");

  dialogCopy.textContent = initial
    ? t("firstCopy")
    : gameOver
      ? t("lostCopy", stageScore, target)
      : t("nextCopy");

  dialogObjective.textContent = t("objectiveText", target, timeLeft);
  confirmButton.textContent = gameOver
    ? t("playAgain")
    : initial
      ? t("start")
      : t("next");

  // Offer the mode choice before the first round; keep its setting for later rounds.
  relaxedControl.hidden = !initial;

  if (!dialog.open) dialog.showModal();
}

function prepareStage() {
  running = false;
  clearTimers();
  hideMoles();

  target = 4 + stage;
  timeLeft = stageDuration();
  stageScore = 0;
  updateDisplay();

  showRoundDialog(stage === 1 ? "first" : "next");
}

function startStage() {
  if (relaxedControl.hidden === false) {
    relaxedMode = relaxedToggle.checked;
  }

  dialog.close();
  running = true;
  statusDisplay.textContent = t("statusStart", stage, target);
  updateDisplay();
  startCountdown();
  showRandomMole();
}

function startCountdown() {
  clearInterval(countdownTimer);

  // Relaxed Mode halves the countdown speed as well as slowing the moles.
  const tickMilliseconds = relaxedMode ? 2000 : 1000;

  countdownTimer = setInterval(() => {
    timeLeft -= 1;
    updateDisplay();

    if (timeLeft <= 0) finishStage();
  }, tickMilliseconds);
}

function showRandomMole() {
  if (!running) return;

  hideMoles();

  const choices = holes.filter((hole) => hole !== activeHole);
  const hole = choices[Math.floor(Math.random() * choices.length)];
  const timings = moleTimings();

  activeHole = hole;
  hole.classList.add("is-up");

  moleTimer = setTimeout(() => {
    if (activeHole === hole) {
      hole.classList.remove("is-up");
      activeHole = null;
    }

    if (running) {
      nextMoleTimer = setTimeout(showRandomMole, timings.pause);
    }
  }, timings.visible);
}

function saveHighScoreIfNeeded() {
  const highScore = readHighScore();
  if (score > highScore) {
    localStorage.setItem(HIGH_SCORE_KEY, String(score));
    return true;
  }
  return false;
}

function finishStage() {
  if (!running) return;

  running = false;
  clearTimers();
  hideMoles();

  if (stageScore >= target) {
    statusDisplay.textContent = t("cleared", stage);
    saveHighScoreIfNeeded();
    updateDisplay();

    stage += 1;
    nextMoleTimer = setTimeout(prepareStage, 700);
  } else {
    const brokeRecord = saveHighScoreIfNeeded();
    statusDisplay.textContent = brokeRecord ? t("newRecord") : t("timesUp");
    updateDisplay();

    showRoundDialog("gameOver");
  }
}

function whackMole(event) {
  if (!running) return;

  const hole = event.currentTarget;
  if (!hole.classList.contains("is-up")) return;

  hole.classList.remove("is-up");
  hole.classList.add("is-hit");
  activeHole = null;

  score += 1;
  stageScore += 1;
  updateDisplay();

  if ("vibrate" in navigator) navigator.vibrate(20);

  if (stageScore >= target) {
    finishStage();
    return;
  }

  statusDisplay.textContent = t("remaining", target - stageScore, stage);
  clearTimeout(moleTimer);
  clearTimeout(nextMoleTimer);

  nextMoleTimer = setTimeout(() => {
    if (running) showRandomMole();
  }, moleTimings().pause);
}

holes.forEach((hole) => {
  hole.addEventListener("pointerdown", whackMole);
});

confirmButton.addEventListener("click", () => {
  if (!running && timeLeft <= 0) {
    stage = 1;
    target = 5;
    score = 0;
    stageScore = 0;
    timeLeft = 30;
    updateDisplay();
  }

  startStage();
});

restartButton.addEventListener("click", () => {
  clearTimers();
  hideMoles();
  running = false;
  stage = 1;
  target = 5;
  score = 0;
  stageScore = 0;
  timeLeft = 30;
  statusDisplay.textContent = t("readyStatus");
  updateDisplay();
  prepareStage();
});

languageSelect.addEventListener("change", (event) => {
  setLanguage(event.target.value);
});

applyTranslations();
statusDisplay.textContent = t("readyStatus");
prepareStage();
