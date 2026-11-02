"use strict";

const translations = {
  en: {
    title: "Summer Memories",
    language: "Language",
    score: "Score",
    time: "Time",
    highScore: "Best",
    roundLabel: "Round",
    newGame: "New Game",
    start: "Start Game",
    instruction1: "Memorise the six outer numbers in 10 seconds.",
    instruction2: "Select numbers that add up to the centre number.",
    instruction3: "",
    instruction4: "",
    memorise: "Memorise the numbers",
    findSum: "Make the centre sum",
    correct: "Correct!",
    incorrect: "Too large! Try again.",
    timeUp: "Time's up!",
    finalScore: "Game over — score: {score}",
    ready: "Ready?"
  },
  es: {
    title: "Suma y sigue",
    language: "Idioma",
    score: "Puntuación",
    time: "Tiempo",
    highScore: "Récord",
    roundLabel: "Ronda",
    newGame: "Nueva partida",
    start: "Empezar",
    instruction1: "Memoriza los seis números exteriores en 10 segundos.",
    instruction2: "Selecciona los números cuya suma dé el número central.",
    instruction3: "",
    instruction4: "",
    memorise: "Memoriza los números",
    findSum: "Haz la suma central",
    correct: "¡Correcto!",
    incorrect: "¡Demasiado alto! Inténtalo de nuevo.",
    timeUp: "¡Se acabó el tiempo!",
    finalScore: "Fin de la partida — puntuación: {score}",
    ready: "¿Preparado?"
  },
  "zh-Hant": {
    title: "心中有數",
    language: "語言",
    score: "分數",
    time: "時間",
    highScore: "最高分",
    roundLabel: "回合",
    newGame: "新遊戲",
    start: "開始遊戲",
    instruction1: "用 10 秒記住外圍嘅六個數字。",
    instruction2: "揀出加埋等於中心數字嘅數字。",
    instruction3: "",
    instruction4: "",
    memorise: "記住啲數字",
    findSum: "砌出中心總和",
    correct: "答啱！",
    incorrect: "太大喇！再試一次。",
    timeUp: "夠鐘！",
    finalScore: "遊戲結束 — 分數：{score}",
    ready: "準備好未？"
  }
};

const languageSelect = document.getElementById("languageSelect");
const overlayLanguageSelect = document.getElementById("overlayLanguageSelect");
const overlay = document.getElementById("instructionOverlay");
const overlayStart = document.getElementById("overlayStart");
const startButton = document.getElementById("startButton");
const board = document.getElementById("board");
const centerText = document.getElementById("centerText");
const message = document.getElementById("message");
const scoreDisplay = document.getElementById("score");
const timeDisplay = document.getElementById("time");
const highScoreDisplay = document.getElementById("highScore");
const roundDisplay = document.getElementById("round");
const title = document.getElementById("gameTitle");

const outerHexes = [...board.querySelectorAll(".hex")].filter(
  hex => Number(hex.dataset.index) !== 0
);
const numberLabels = [...board.querySelectorAll(".hex-number")];

let language = "en";
let numbers = [];
let target = 0;
let selected = new Set();
let score = 0;
let secondsLeft = 60;
let round = 1;
let gameActive = false;
let memorising = false;
let timerInterval = null;
let countdownInterval = null;
let feedbackTimeout = null;
let audioContext = null;

function normaliseLanguage(value) {
  if (!value) return null;
  const code = value.toLowerCase();

  if (code === "en" || code.startsWith("en-")) return "en";
  if (code === "es" || code.startsWith("es-")) return "es";
  if (code === "zh" || code.startsWith("zh-")) return "zh-Hant";

  return null;
}

function chooseInitialLanguage() {
  const queryLanguage = normaliseLanguage(
    new URLSearchParams(window.location.search).get("lang")
  );
  if (queryLanguage) return queryLanguage;

  try {
    const storedLanguage = normaliseLanguage(localStorage.getItem("summer-memories-language"));
    if (storedLanguage) return storedLanguage;
  } catch {
    // Storage may be unavailable; continue with browser preferences.
  }

  for (const preference of navigator.languages || [navigator.language]) {
    const browserLanguage = normaliseLanguage(preference);
    if (browserLanguage) return browserLanguage;
  }

  return "en";
}

function text(key) {
  return translations[language][key];
}

function applyLanguage() {
  document.documentElement.lang = language === "zh-Hant" ? "zh-Hant" : language;
  document.title = text("title");
  title.textContent = text("title");

  document.querySelectorAll("[data-i18n]").forEach(element => {
    const key = element.dataset.i18n;
    if (translations[language][key]) {
      element.textContent = translations[language][key];
    }
  });

  languageSelect.value = language;
  overlayLanguageSelect.value = language;
  updateMessage();
}

function setLanguage(value, updateQuery = true) {
  language = normaliseLanguage(value) || "en";
  try {
    localStorage.setItem("summer-memories-language", language);
  } catch {
    // Language still works for this page if storage is unavailable.
  }

  if (updateQuery) {
    const url = new URL(window.location.href);
    url.searchParams.set("lang", language === "zh-Hant" ? "zh" : language);
    window.history.replaceState({}, "", url);
  }

  applyLanguage();
}

function updateMessage() {
  if (!gameActive && !memorising && secondsLeft === 0) {
    message.textContent = text("finalScore").replace("{score}", score);
  } else if (memorising) {
    message.textContent = text("memorise");
  } else if (gameActive) {
    message.textContent = text("findSum");
  } else {
    message.textContent = text("ready");
  }
}

function updateDisplays() {
  scoreDisplay.textContent = String(score);
  timeDisplay.textContent = String(secondsLeft);
  roundDisplay.textContent = String(round);
  timeDisplay.classList.toggle("low-time", secondsLeft <= 10);
}

function getHighScore() {
  try {
    return Number(localStorage.getItem("summer-memories-high-score")) || 0;
  } catch {
    return 0;
  }
}

function setHighScore(value) {
  try {
    localStorage.setItem("summer-memories-high-score", String(value));
  } catch {
    // The current game remains playable without persistent storage.
  }
}

function updateHighScore() {
  highScoreDisplay.textContent = String(getHighScore());
}

function playTone(type) {
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === "suspended") audioContext.resume();

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.type = "sine";
    oscillator.frequency.value = type === "correct" ? 660 : 180;
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.22);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.23);
  } catch {
    // Audio is optional; the visual feedback still works.
  }
}

function setHexNumber(index, value) {
  const label = numberLabels.find(
    item => Number(item.dataset.numberIndex) === index
  );
  if (label) label.textContent = value == null ? "" : String(value);
}

function displayNumbers(show) {
  numbers.forEach((number, position) => {
    setHexNumber(position + 1, show ? number : "");
  });
}

function makePuzzle() {
  const pool = [3, 4, 5, 6, 7, 8, 9];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  numbers = pool.slice(0, 6);
  selected.clear();
  clearHexStates();
  chooseTarget();
}

function chooseTarget() {
  const possibleTargets = new Set();
  const requiredCount = round <= 3 ? 2 : null;

  for (let mask = 0; mask < (1 << numbers.length); mask++) {
    const count = mask.toString(2).replace(/0/g, "").length;

    if (requiredCount !== null && count !== requiredCount) continue;
    if (requiredCount === null && (count < 2 || count > 4)) continue;

    let sum = 0;
    for (let i = 0; i < numbers.length; i++) {
      if (mask & (1 << i)) sum += numbers[i];
    }

    if (sum >= 10) possibleTargets.add(sum);
  }

  const alternatives = [...possibleTargets].filter(value => value !== target);
  const choices = alternatives.length ? alternatives : [...possibleTargets];

  target = choices[Math.floor(Math.random() * choices.length)];
  centerText.textContent = String(target);
}

function clearHexStates() {
  board.querySelectorAll(".hex").forEach(hex => {
    hex.classList.remove("active", "wrong", "correct", "revealed-muted", "selectable");
  });
}

function startGame() {
  clearInterval(timerInterval);
  clearInterval(countdownInterval);
  clearTimeout(feedbackTimeout);

  score = 0;
  secondsLeft = 60;
  round = 1;
  gameActive = false;
  memorising = true;
  selected.clear();
  updateDisplays();
  makePuzzle();
  displayNumbers(true);

  overlay.hidden = true;
  startButton.disabled = true;
  centerText.classList.add("countdown");

  let countdown = 10;
  centerText.textContent = String(countdown);
  message.textContent = text("memorise");

  countdownInterval = setInterval(() => {
    countdown -= 1;

    if (countdown <= 0) {
      clearInterval(countdownInterval);
      memorising = false;
      gameActive = true;
      displayNumbers(false);
      centerText.classList.remove("countdown");
      centerText.textContent = String(target);
      outerHexes.forEach(hex => hex.classList.add("selectable"));
      startButton.disabled = false;
      updateMessage();
      timerInterval = setInterval(tick, 1000);
    } else {
      centerText.textContent = String(countdown);
    }
  }, 1000);
}

function tick() {
  if (!gameActive) return;
  secondsLeft -= 1;
  if (secondsLeft <= 0) {
    secondsLeft = 0;
    endGame();
  }
  updateDisplays();
}

function handleSelection(hex) {
  if (!gameActive) return;

  const index = Number(hex.dataset.index) - 1;
  if (index < 0 || index >= numbers.length || selected.has(index)) return;

  selected.add(index);
  setHexNumber(index + 1, numbers[index]);
  hex.classList.add("active");

  const sum = [...selected].reduce((total, item) => total + numbers[item], 0);

  if (sum === target) {
    gameActive = false;
    score += target;
    secondsLeft = Math.min(99, secondsLeft + 3);
    round += 1;
    if (score > getHighScore()) setHighScore(score);
    updateHighScore();
    updateDisplays();

    const centerHex = board.querySelector('[data-index="0"]');
    centerHex.classList.add("correct");
    centerText.textContent = String(target);
    message.textContent = text("correct");
    playTone("correct");

    feedbackTimeout = setTimeout(() => {
      if (secondsLeft <= 0) {
        endGame();
        return;
      }
    
      // Keep the ring numbers; generate a new target from those same numbers.
      selected.clear();
      clearHexStates();
      displayNumbers(false);
      chooseTarget();
      outerHexes.forEach(hex => hex.classList.add("selectable"));
    
      gameActive = true;
      updateDisplays();
      updateMessage();
    }, 500);
  } else if (sum > target) {
    secondsLeft = Math.max(0, secondsLeft - 1);
    updateDisplays();

    const centerHex = board.querySelector('[data-index="0"]');
    centerHex.classList.add("wrong");
    message.textContent = text("incorrect");
    playTone("wrong");

    feedbackTimeout = setTimeout(() => {
      centerHex.classList.remove("wrong");
      selected.clear();
      outerHexes.forEach((outerHex, position) => {
        outerHex.classList.remove("active");
        setHexNumber(position + 1, "");
      });

      if (secondsLeft <= 0) {
        endGame();
      } else {
        updateMessage();
      }
    }, 550);
  }
}

function endGame() {
  clearInterval(timerInterval);
  clearInterval(countdownInterval);
  clearTimeout(feedbackTimeout);

  gameActive = false;
  memorising = false;
  startButton.disabled = false;
  displayNumbers(true);

  outerHexes.forEach(hex => {
    hex.classList.remove("selectable", "active");
    hex.classList.add("revealed-muted");
  });

  centerText.classList.remove("countdown");
  centerText.textContent = String(target);
  updateMessage();
  updateDisplays();

  if (score > getHighScore()) {
    setHighScore(score);
    updateHighScore();
  }
}

language = chooseInitialLanguage();
applyLanguage();
updateHighScore();
updateDisplays();
overlay.hidden = false;

languageSelect.addEventListener("change", event => {
  setLanguage(event.target.value);
});

overlayLanguageSelect.addEventListener("change", event => {
  setLanguage(event.target.value);
});

overlayStart.addEventListener("click", startGame);
startButton.addEventListener("click", startGame);

board.addEventListener("click", event => {
  const hex = event.target.closest(".hex");
  if (hex && Number(hex.dataset.index) !== 0) {
    handleSelection(hex);
  }
});
