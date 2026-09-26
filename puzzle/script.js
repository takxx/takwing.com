// script.js
"use strict";

/* =================================
   DOM
================================= */

const board = document.getElementById("board");
const hexagons = [...document.querySelectorAll(".hex")];
const startButton = document.getElementById("startButton");
const roundDisplay = document.getElementById("round");
const timeDisplay = document.getElementById("time");
const highScoreDisplay = document.getElementById("highScore");
const message = document.getElementById("message");
const languageSelect = document.getElementById("languageSelect");

/* =================================
   Configuration
================================= */

const HEX_COUNT = 7;
const FEEDBACK_TIME = 180;
const SWIPE_THRESHOLD = 8;
const NEXT_TASK_DELAY = 250;
const WRONG_TASK_DELAY = 250;

const GAME_CONFIG = {
  startingTime: 60,
  maxTime: 99,
  timeBonusPerCorrectTask: 3,
  timePenaltyPerWrongTask: 3,
  pointsPerCorrectTask: 1
};

const STORAGE_KEY = "hexSwipeHighScore";

const neighbors = {
  0: [1, 2, 3, 4, 5, 6],
  1: [0, 2, 6],
  2: [0, 1, 3],
  3: [0, 2, 4],
  4: [0, 3, 5],
  5: [0, 4, 6],
  6: [0, 5, 1]
};

/* =================================
   Language & translations
================================= */

let language = "en";
let uiText = {};

function getInitialLanguage() {
  const saved = localStorage.getItem("hexSwipeLanguage");
  const translations = window.taskTranslations || {};

  if (saved && translations[saved]) {
    return saved;
  }

  const languages = navigator.languages || [navigator.language];
  for (const lang of languages) {
    const normalized = lang.toLowerCase();
    if (
      normalized === "zh-tw" ||
      normalized === "zh-hk" ||
      normalized === "zh-mo" ||
      normalized.startsWith("zh-hant")
    ) {
      return "zh-Hant";
    }
    if (normalized.startsWith("es")) {
      return "es";
    }
  }

  return "en";
}

function setLanguage(newLang) {
  const translations = window.taskTranslations || {};
  language = translations[newLang] ? newLang : "en";
  uiText = translations[language]?.ui || {};

  localStorage.setItem("hexSwipeLanguage", language);
  applyTranslations();

  if (!gameRunning) {
    setMessageKey("watchSequence");
  }
}

function applyTranslations() {
  document.documentElement.lang = language;

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if (uiText[key]) {
      el.textContent = uiText[key];
    }
  });

  board.setAttribute("aria-label", uiText.boardLabel || "");

  hexagons.forEach((hex, i) => {
    let label;
    if (language === "zh-Hant") {
      label = `六角形 ${i + 1}`;
    } else if (language === "es") {
      label = `Hexágono ${i + 1}`;
    } else {
      label = `Hexagon ${i + 1}`;
    }
    hex.setAttribute("aria-label", label);
  });
}

function setMessageKey(key) {
  message.textContent = uiText[key] || "";
}

/* =================================
   Audio
================================= */

let audioContext = null;
const frequencies = [
  261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88
];

function getAudioContext() {
  if (!audioContext) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext();
  }
  return audioContext;
}

function playHexSound(index) {
  const context = getAudioContext();
  if (context.state === "suspended") context.resume();

  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = frequencies[index];

  const now = context.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(now);
  oscillator.stop(now + 0.4);
}

/* =================================
   Game state
================================= */

let round = 0;
let highScore = 0;
let timeRemaining = GAME_CONFIG.startingTime;
let timerId = null;

let gameRunning = false;
let acceptingInput = false;
let gameId = 0;

let currentTask = null;
let currentPath = [];

let nextTask = null;
let nextTaskGenerating = false;

let tasksCompletedTotal = 0;

function updateRound() {
  roundDisplay.textContent = round;
  timeDisplay.textContent = timeRemaining;
  highScoreDisplay.textContent = highScore;
}

function clearHexStates() {
  hexagons.forEach(hex => {
    hex.classList.remove("active", "wrong");
  });
}

function loadHighScore() {
  try {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(stored) && stored >= 0) return stored;
  } catch {}
  return 0;
}

function saveHighScore() {
  try {
    localStorage.setItem(STORAGE_KEY, String(highScore));
  } catch {}
}

/* =================================
   Timer and game over
================================= */

function startTimer() {
  stopTimer();
  timerId = window.setInterval(() => {
    if (!gameRunning) return;
    timeRemaining -= 1;
    updateRound();
    if (timeRemaining <= 0) endGame();
  }, 1000);
}

function stopTimer() {
  if (timerId !== null) {
    window.clearInterval(timerId);
    timerId = null;
  }
}

function endGame() {
  gameRunning = false;
  acceptingInput = false;
  stopTimer();

  if (round > highScore) {
    highScore = round;
    saveHighScore();
  }

  setMessageKey("gameOver");
  startButton.disabled = false;
  startButton.textContent = uiText.tryAgain || "Try Again";

  hexagons.forEach(hex => hex.classList.add("wrong"));
  setTimeout(() => {
    hexagons.forEach(hex => hex.classList.remove("wrong"));
  }, 350);

  updateRound();
}

/* =================================
   Difficulty
================================= */

function calculateNextDifficulty() {
  if (tasksCompletedTotal < 3) return 0;
  if (timeRemaining >= 70) return 3;
  if (timeRemaining >= 20) return 2;
  return 1;
}

function clampTime(value) {
  if (value < 0) return 0;
  if (value > GAME_CONFIG.maxTime) return GAME_CONFIG.maxTime;
  return value;
}

/* =================================
   Task loading
================================= */

async function requestNextTask() {
  disableBoard();
  clearCurrentPath();
  clearHexStates();

  let task;

  if (nextTask) {
    task = nextTask;
    nextTask = null;
  } else {
    const difficulty = calculateNextDifficulty();
    try {
      task = await window.generateRandomTask(difficulty);
    } catch (error) {
      console.error(error);
      endGame();
      return;
    }
  }

  validateTaskResponse(task);
  currentTask = task;

  renderTaskInstruction(task);
  renderGeneratedCells(task.cells);
  enableBoard();

  preGenerateNextTask();
}

async function preGenerateNextTask() {
  if (nextTaskGenerating) return;
  nextTaskGenerating = true;

  const difficulty = calculateNextDifficulty();
  try {
    const task = await window.generateRandomTask(difficulty);
    if (gameRunning) nextTask = task;
  } catch (error) {
    console.error("Pre-generation failed:", error);
  } finally {
    nextTaskGenerating = false;
  }
}

function validateTaskResponse(task) {
  if (!task || typeof task !== "object") {
    throw new Error("generateRandomTask() returned no task.");
  }
  if (!Array.isArray(task.cells)) {
    throw new Error("Generated task is missing cells.");
  }
  if (!Array.isArray(task.answerPaths)) {
    throw new Error("Generated task is missing answerPaths.");
  }
}

/* =================================
   Render instruction
================================= */

function renderTaskInstruction(task) {
  // Task01 uses _task01 metadata
  if (task.data?._task01) {
    renderTask01Instruction(task);
    return;
  }

  // Fallback for other tasks if needed
  setMessageKey("yourTurn");
}

function renderTask01Instruction(task) {
  const meta = task.data._task01;
  const translations = window.taskTranslations || {};
  const langData = translations[language] || translations.en || {};

  const key = meta.negated
    ? "tasks.task01.hexesExcept"
    : "tasks.task01.hexes";

  const template = getNestedValue(langData, key);
  if (!template) {
    setMessageKey("yourTurn");
    return;
  }

  const colorNames = meta.targetColors.map(k => {
    const name = (langData.colors && langData.colors[k]) || k;
    return { text: name, instructionColorKey: meta.instructionColorKey };
  });

  const listFormatter = new Intl.ListFormat(
    language === "zh-Hant" ? "zh-Hant" : language,
    { style: "long", type: "conjunction" }
  );

  const formattedList = listFormatter.format(colorNames.map(c => c.text));
  const parts = template.split("{colors}");

  message.innerHTML = "";

  if (parts[0]) {
    message.appendChild(document.createTextNode(parts[0]));
  }

  const span = document.createElement("span");
  span.textContent = formattedList;
  span.classList.add(`instruction-color-${meta.instructionColorKey}`);
  message.appendChild(span);

  if (parts[1]) {
    message.appendChild(document.createTextNode(parts[1]));
  }
}

function getNestedValue(object, path) {
  if (!path) return "";
  return path.split(".").reduce((v, k) => v?.[k], object) || "";
}

/* =================================
   Render cells
================================= */

function renderGeneratedCells(cells) {
  hexagons.forEach(hex => {
    hex.textContent = "";
    hex.style.backgroundColor = "";
    hex.style.color = "";
    hex.className = hex.className.replace(/\s*(hex-\d|active|wrong)\s*/g, " ").trim();
  });

  hexagons.forEach((hex, i) => hex.classList.add(`hex-${i}`));

  for (const cell of cells) {
    const hex = hexagons[cell.index];
    if (!hex) continue;

    hex.textContent =
      cell.content === null || cell.content === undefined
        ? ""
        : String(cell.content);

    if (cell.backgroundColor) {
      hex.style.backgroundColor = cell.backgroundColor;
    }
    if (cell.color) {
      hex.style.color = cell.color;
    }
    if (cell.className) {
      hex.classList.add(cell.className);
    }
  }
}

/* =================================
   Path validation
================================= */

function validatePath(attemptedPath, answerPaths) {
  if (!Array.isArray(attemptedPath)) {
    return { valid: false, reason: "invalidAttempt" };
  }
  if (attemptedPath.length < 2) {
    return { valid: false, reason: "tooShort" };
  }
  if (hasRepeatedHex(attemptedPath)) {
    return { valid: false, reason: "repeatedHex" };
  }
  if (!Array.isArray(answerPaths)) {
    return { valid: false, reason: "missingAnswerPaths" };
  }

  const valid = answerPaths.some(answerPath =>
    samePath(attemptedPath, answerPath)
  );

  return { valid, reason: valid ? "accepted" : "notAccepted" };
}

function samePath(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

function hasRepeatedHex(path) {
  return new Set(path).size !== path.length;
}

/* =================================
   Scoring
================================= */

function acceptPath() {
  acceptingInput = false;

  currentPath.forEach(i => flashHex(i, "active"));

  round += GAME_CONFIG.pointsPerCorrectTask;
  timeRemaining = clampTime(timeRemaining + GAME_CONFIG.timeBonusPerCorrectTask);
  tasksCompletedTotal += 1;

  updateRound();
  playHexSound(0);

  disableBoard();
  setTimeout(() => {
    if (gameRunning) requestNextTask();
  }, NEXT_TASK_DELAY);
}

function rejectPath() {
  acceptingInput = false;

  currentPath.forEach(i => flashHex(i, "wrong"));

  timeRemaining = clampTime(timeRemaining - GAME_CONFIG.timePenaltyPerWrongTask);
  updateRound();
  playHexSound(6);

  if (timeRemaining <= 0) {
    endGame();
    return;
  }

  disableBoard();
  setTimeout(() => {
    if (gameRunning) requestNextTask();
  }, WRONG_TASK_DELAY);
}

function flashHex(index, className = "active") {
  const hex = hexagons[index];
  if (!hex) return;
  hex.classList.add(className);
  setTimeout(() => hex.classList.remove(className), FEEDBACK_TIME);
}

function clearCurrentPath() {
  currentPath = [];
}

/* =================================
   Game flow
================================= */

function createNewGame() {
  gameId++;
  clearHexStates();
  clearCurrentPath();

  round = 0;
  timeRemaining = GAME_CONFIG.startingTime;
  tasksCompletedTotal = 0;

  nextTask = null;
  nextTaskGenerating = false;

  gameRunning = true;
  acceptingInput = false;

  highScore = loadHighScore();
  updateRound();

  startButton.disabled = true;
  startButton.textContent = uiText.restart || "Restart Game";

  setMessageKey("yourTurn");
  startTimer();

  requestNextTask();
}

/* =================================
   Pointer / swipe
================================= */

let pointerIsDown = false;
let swipeStarted = false;
let activePointerId = null;
let lastPointerHex = null;
let pointerStartX = 0;
let pointerStartY = 0;

function getHexIndex(element) {
  const hex = element?.closest?.(".hex");
  if (!hex || !board.contains(hex)) return null;
  const index = Number(hex.dataset.index);
  if (!Number.isInteger(index) || index < 0 || index >= HEX_COUNT) return null;
  return index;
}

function getHexFromPoint(x, y) {
  const elements = document.elementsFromPoint(x, y);
  for (const el of elements) {
    const index = getHexIndex(el);
    if (index !== null) return index;
  }
  return null;
}

function getHexFromEvent(event) {
  const targetHex = getHexIndex(event.target);
  if (targetHex !== null) return targetHex;
  return getHexFromPoint(event.clientX, event.clientY);
}

function handlePointerDown(event) {
  if (!acceptingInput || activePointerId !== null) return;

  const startingHex = getHexFromEvent(event);
  if (startingHex === null) return;

  event.preventDefault();

  pointerIsDown = true;
  swipeStarted = false;
  activePointerId = event.pointerId;
  lastPointerHex = startingHex;
  pointerStartX = event.clientX;
  pointerStartY = event.clientY;

  if (board.setPointerCapture) {
    board.setPointerCapture(event.pointerId);
  }

  currentPath = [startingHex];
  hexagons[startingHex].classList.add("active");
  playHexSound(startingHex);
}

function handlePointerMove(event) {
  if (!pointerIsDown || event.pointerId !== activePointerId) return;
  if (!acceptingInput) {
    finishPointer(event);
    return;
  }

  event.preventDefault();

  const distanceMoved = Math.hypot(
    event.clientX - pointerStartX,
    event.clientY - pointerStartY
  );

  if (!swipeStarted && distanceMoved < SWIPE_THRESHOLD) return;

  const currentHex = getHexFromPoint(event.clientX, event.clientY);
  if (currentHex === null || currentHex === lastPointerHex) return;

  if (
    lastPointerHex === null ||
    !neighbors[lastPointerHex].includes(currentHex)
  ) {
    return;
  }

  swipeStarted = true;
  lastPointerHex = currentHex;

  currentPath.push(currentHex);
  hexagons[currentHex].classList.add("active");
  playHexSound(currentHex);

  const result = validatePath(currentPath, currentTask.answerPaths);
  if (result.valid) acceptPath();
}

function handlePointerUp(event) {
  if (event.pointerId !== activePointerId) return;
  event.preventDefault();

  if (currentPath.length >= 2 && acceptingInput) {
    const result = validatePath(currentPath, currentTask.answerPaths);
    if (result.valid) acceptPath();
    else rejectPath();
  }

  finishPointer(event);
}

function handlePointerCancel(event) {
  if (event.pointerId !== activePointerId) return;
  finishPointer(event);
}

function finishPointer(event) {
  if (
    board.releasePointerCapture &&
    board.hasPointerCapture?.(event.pointerId)
  ) {
    board.releasePointerCapture(event.pointerId);
  }

  pointerIsDown = false;
  swipeStarted = false;
  activePointerId = null;
  lastPointerHex = null;
  pointerStartX = 0;
  pointerStartY = 0;
}

function enableBoard() {
  board.classList.remove("is-disabled");
  board.removeAttribute("aria-disabled");
  acceptingInput = true;
}

function disableBoard() {
  board.classList.add("is-disabled");
  board.setAttribute("aria-disabled", "true");
  acceptingInput = false;
}

/* =================================
   Events & init
================================= */

languageSelect.addEventListener("change", e => setLanguage(e.target.value));
startButton.addEventListener("click", createNewGame);

board.addEventListener("pointerdown", handlePointerDown);
board.addEventListener("pointermove", handlePointerMove);
board.addEventListener("pointerup", handlePointerUp);
board.addEventListener("pointercancel", handlePointerCancel);

// Load translations then initialize
(async function init() {
  try {
    const res = await fetch("lang.json");
    const data = await res.json();
    window.taskTranslations = data;

    language = getInitialLanguage();
    setLanguage(language);

    highScore = loadHighScore();
    updateRound();
    setMessageKey("watchSequence");
  } catch (err) {
    console.error("Failed to load lang.json:", err);
    message.textContent = "Error loading translations.";
  }
})();