// script.js
"use strict";

/* =================================
   DOM
================================= */

const board = document.getElementById("board");
const startButton = document.getElementById("startButton");
const roundDisplay = document.getElementById("round");
const timeDisplay = document.getElementById("time");
const highScoreDisplay = document.getElementById("highScore");
const message = document.getElementById("message");
const languageSelect = document.getElementById("languageSelect");
const feedbackThumb = document.getElementById("feedbackThumb");

let hexagons = [];

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
const LANGUAGE_STORAGE_KEY = "hexSwipeLanguage";

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
   Language and translations
================================= */

let language = "en";
let uiText = {};

function getInitialLanguage() {
  let saved = null;

  try {
    saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    saved = null;
  }

  const translations = window.taskTranslations || {};

  if (saved && translations[saved]) {
    return saved;
  }

  const languages = navigator.languages || [navigator.language];

  for (const lang of languages) {
    const normalized = String(lang).toLowerCase();

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

  return translations.en ? "en" : Object.keys(translations)[0] || "en";
}

function setLanguage(newLang) {
  const translations = window.taskTranslations || {};

  language = translations[newLang] ? newLang : "en";
  uiText = translations[language]?.ui || {};

  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Storage may be unavailable.
  }

  applyTranslations();

  if (!gameRunning) {
    setMessageKey("watchSequence");
  }
}

function applyTranslations() {
  document.documentElement.lang = language;

  document.querySelectorAll("[data-i18n]").forEach(element => {
    const key = element.dataset.i18n;

    if (uiText[key]) {
      element.textContent = uiText[key];
    }
  });

  if (board) {
    board.setAttribute("aria-label", uiText.boardLabel || "");
  }

  hexagons.forEach((hex, index) => {
    let label;

    if (language === "zh-Hant") {
      label = `六角形 ${index + 1}`;
    } else if (language === "es") {
      label = `Hexágono ${index + 1}`;
    } else {
      label = `Hexagon ${index + 1}`;
    }

    hex.setAttribute("aria-label", label);
  });
}

function setMessageKey(key) {
  if (message) {
    message.textContent = uiText[key] || "";
  }
}

/* =================================
   Audio
================================= */

let audioContext = null;

const frequencies = [
  261.63,
  293.66,
  329.63,
  349.23,
  392.0,
  440.0,
  493.88
];

function getAudioContext() {
  if (audioContext) {
    return audioContext;
  }

  const AudioContextClass =
    window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  audioContext = new AudioContextClass();
  return audioContext;
}

function playHexSound(index) {
  const context = getAudioContext();

  if (!context || !frequencies[index]) {
    return;
  }

  if (context.state === "suspended") {
    context.resume().catch(() => {});
  }

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
  if (roundDisplay) roundDisplay.textContent = round;
  if (timeDisplay) timeDisplay.textContent = timeRemaining;
  if (highScoreDisplay) highScoreDisplay.textContent = highScore;
}

function clearHexStates() {
  hexagons.forEach(hex => {
    hex.classList.remove("active", "wrong");
  });
}

function loadHighScore() {
  try {
    const stored = Number(localStorage.getItem(STORAGE_KEY));

    if (Number.isFinite(stored) && stored >= 0) {
      return stored;
    }
  } catch {
    // Storage may be unavailable.
  }

  return 0;
}

function saveHighScore() {
  try {
    localStorage.setItem(STORAGE_KEY, String(highScore));
  } catch {
    // Storage may be unavailable.
  }
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

    if (timeRemaining <= 0) {
      endGame();
    }
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
  currentTask = null;

  stopTimer();
  finishActivePointer();

  if (round > highScore) {
    highScore = round;
    saveHighScore();
  }

  setMessageKey("gameOver");

  if (startButton) {
    startButton.disabled = false;
    startButton.textContent = uiText.tryAgain || "Try Again";
  }

  hexagons.forEach(hex => hex.classList.add("wrong"));

  window.setTimeout(() => {
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
  return Math.max(
    0,
    Math.min(GAME_CONFIG.maxTime, value)
  );
}

/* =================================
   Task loading
================================= */

async function requestNextTask() {
  if (!gameRunning) return;

  const requestGameId = gameId;

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
      console.error("Task generation failed:", error);

      if (requestGameId === gameId && gameRunning) {
        endGame();
      }

      return;
    }
  }

  if (!gameRunning || requestGameId !== gameId) {
    return;
  }

  try {
    validateTaskResponse(task);
  } catch (error) {
    console.error(error);
    endGame();
    return;
  }

  currentTask = task;

  renderTaskInstruction(task);
  renderGeneratedCells(task.cells);
  enableBoard();

  preGenerateNextTask(requestGameId);
}

async function preGenerateNextTask(requestGameId = gameId) {
  if (nextTaskGenerating || !gameRunning) {
    return;
  }

  nextTaskGenerating = true;

  const difficulty = calculateNextDifficulty();

  try {
    const task = await window.generateRandomTask(difficulty);

    if (
      gameRunning &&
      requestGameId === gameId
    ) {
      nextTask = task;
    }
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

  for (const path of task.answerPaths) {
    if (!Array.isArray(path)) {
      throw new Error("Generated answerPaths contains an invalid path.");
    }
  }
}

/* =================================
   Render instruction
================================= */

function renderTaskInstruction(task) {
  if (task.data?._task01) {
    renderTask01Instruction(task);
    return;
  }

  setMessageKey("yourTurn");
}

function renderTask01Instruction(task) {
  const meta = task.data._task01;
  const translations = window.taskTranslations || {};
  const langData =
    translations[language] || translations.en || {};

  const key = meta.negated
    ? "tasks.task01.hexesExcept"
    : "tasks.task01.hexes";

  const template = getNestedValue(langData, key);

  if (!template) {
    setMessageKey("yourTurn");
    return;
  }

  const colorNames = meta.targetColors.map(colorKey => {
    const name =
      (langData.colors && langData.colors[colorKey]) ||
      colorKey;

    return name;
  });

  let formattedList;

  try {
    const listFormatter = new Intl.ListFormat(
      language === "zh-Hant" ? "zh-Hant" : language,
      {
        style: "long",
        type: "conjunction"
      }
    );

    formattedList = listFormatter.format(colorNames);
  } catch {
    formattedList = colorNames.join(", ");
  }

  const parts = template.split("{colors}");

  message.innerHTML = "";

  if (parts[0]) {
    message.appendChild(
      document.createTextNode(parts[0])
    );
  }

  const span = document.createElement("span");
  span.textContent = formattedList;
  span.classList.add(
    `instruction-color-${meta.instructionColorKey}`
  );

  message.appendChild(span);

  if (parts[1]) {
    message.appendChild(
      document.createTextNode(parts[1])
    );
  }
}

function getNestedValue(object, path) {
  if (!path) return "";

  return path
    .split(".")
    .reduce((value, key) => value?.[key], object) || "";
}

/* =================================
   Render cells
================================= */

function renderGeneratedCells(cells) {
  hexagons.forEach((hex, index) => {
    hex.textContent = "";

    /*
      Clear only task-specific inline styles.
      Geometry remains entirely controlled by CSS.
    */
    hex.style.backgroundColor = "";
    hex.style.color = "";

    hex.classList.remove(
      "active",
      "wrong",
      "hex-0",
      "hex-1",
      "hex-2",
      "hex-3",
      "hex-4",
      "hex-5",
      "hex-6"
    );

    hex.classList.add(`hex-${index}`);
  });

  for (const cell of cells) {
    if (!cell || !Number.isInteger(cell.index)) {
      continue;
    }

    const hex = hexagons[cell.index];

    if (!hex) {
      continue;
    }

    hex.textContent =
      cell.content === null ||
      cell.content === undefined
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
    return {
      valid: false,
      reason: "invalidAttempt"
    };
  }

  if (attemptedPath.length < 2) {
    return {
      valid: false,
      reason: "tooShort"
    };
  }

  if (hasRepeatedHex(attemptedPath)) {
    return {
      valid: false,
      reason: "repeatedHex"
    };
  }

  if (!Array.isArray(answerPaths)) {
    return {
      valid: false,
      reason: "missingAnswerPaths"
    };
  }

  const valid = answerPaths.some(answerPath =>
    samePath(attemptedPath, answerPath)
  );

  return {
    valid,
    reason: valid ? "accepted" : "notAccepted"
  };
}

function samePath(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) {
    return false;
  }

  if (a.length !== b.length) {
    return false;
  }

  return a.every((value, index) => value === b[index]);
}

function hasRepeatedHex(path) {
  return new Set(path).size !== path.length;
}

function isPrefixPossible(prefix, answerPaths) {
  if (!Array.isArray(prefix) || prefix.length === 0) {
    return false;
  }

  if (!Array.isArray(answerPaths)) {
    return false;
  }

  return answerPaths.some(answerPath => {
    if (
      !Array.isArray(answerPath) ||
      answerPath.length < prefix.length
    ) {
      return false;
    }

    return prefix.every(
      (value, index) => value === answerPath[index]
    );
  });
}

/* =================================
   Feedback and scoring
================================= */

let feedbackTimerId = null;

function showFeedbackThumb(isCorrect, hexIndex) {
  const hex = hexagons[hexIndex];

  if (!hex || !feedbackThumb) {
    return;
  }

  const hexRect = hex.getBoundingClientRect();
  const boardRect = board.getBoundingClientRect();

  const x =
    hexRect.left -
    boardRect.left +
    hexRect.width / 2;

  const y =
    hexRect.top -
    boardRect.top +
    hexRect.height / 2;

  feedbackThumb.textContent = isCorrect ? "👍" : "👎";
  feedbackThumb.style.left = `${x}px`;
  feedbackThumb.style.top = `${y}px`;
  feedbackThumb.style.display = "block";

  if (feedbackTimerId !== null) {
    window.clearTimeout(feedbackTimerId);
  }

  feedbackTimerId = window.setTimeout(() => {
    feedbackThumb.style.display = "none";
    feedbackTimerId = null;
  }, FEEDBACK_TIME);
}

function acceptPath() {
  if (!acceptingInput || !gameRunning) {
    return;
  }

  acceptingInput = false;
  finishActivePointer();

  currentPath.forEach(index => {
    flashHex(index, "active");
  });

  round += GAME_CONFIG.pointsPerCorrectTask;
  timeRemaining = clampTime(
    timeRemaining + GAME_CONFIG.timeBonusPerCorrectTask
  );
  tasksCompletedTotal += 1;

  updateRound();
  playHexSound(0);

  const lastHexIndex =
    currentPath[currentPath.length - 1];

  showFeedbackThumb(true, lastHexIndex);
  disableBoard();

  const completedGameId = gameId;

  window.setTimeout(() => {
    if (
      gameRunning &&
      completedGameId === gameId
    ) {
      requestNextTask();
    }
  }, NEXT_TASK_DELAY);
}

function rejectPath() {
  if (!acceptingInput || !gameRunning) {
    return;
  }

  acceptingInput = false;
  finishActivePointer();

  currentPath.forEach(index => {
    flashHex(index, "wrong");
  });

  timeRemaining = clampTime(
    timeRemaining - GAME_CONFIG.timePenaltyPerWrongTask
  );

  updateRound();
  playHexSound(6);

  const lastHexIndex =
    currentPath[currentPath.length - 1];

  showFeedbackThumb(false, lastHexIndex);

  if (timeRemaining <= 0) {
    endGame();
    return;
  }

  disableBoard();

  const failedGameId = gameId;

  window.setTimeout(() => {
    if (
      gameRunning &&
      failedGameId === gameId
    ) {
      requestNextTask();
    }
  }, WRONG_TASK_DELAY);
}

function flashHex(index, className = "active") {
  const hex = hexagons[index];

  if (!hex) {
    return;
  }

  hex.classList.add(className);

  window.setTimeout(() => {
    hex.classList.remove(className);
  }, FEEDBACK_TIME);
}

function clearCurrentPath() {
  currentPath = [];
}

/* =================================
   Game flow
================================= */

function createNewGame() {
  gameId += 1;

  finishActivePointer();
  clearHexStates();
  clearCurrentPath();

  round = 0;
  timeRemaining = GAME_CONFIG.startingTime;
  tasksCompletedTotal = 0;

  nextTask = null;
  nextTaskGenerating = false;
  currentTask = null;

  gameRunning = true;
  acceptingInput = false;

  highScore = loadHighScore();
  updateRound();

  if (startButton) {
    startButton.disabled = true;
    startButton.textContent =
      uiText.restart || "Restart Game";
  }

  setMessageKey("yourTurn");
  startTimer();
  requestNextTask();
}

/* =================================
   Pointer and swipe handling
================================= */

let pointerIsDown = false;
let swipeStarted = false;
let activePointerId = null;
let lastPointerHex = null;
let pointerStartX = 0;
let pointerStartY = 0;

function getHexIndex(element) {
  const hex = element?.closest?.(".hex");

  if (!hex || !board.contains(hex)) {
    return null;
  }

  const index = Number(hex.dataset.index);

  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= HEX_COUNT
  ) {
    return null;
  }

  return index;
}

function getHexFromPoint(x, y) {
  const elements = document.elementsFromPoint(x, y);

  for (const element of elements) {
    const index = getHexIndex(element);

    if (index !== null) {
      return index;
    }
  }

  return null;
}

function getHexFromEvent(event) {
  const targetHex = getHexIndex(event.target);

  if (targetHex !== null) {
    return targetHex;
  }

  return getHexFromPoint(
    event.clientX,
    event.clientY
  );
}

function handlePointerDown(event) {
  if (!acceptingInput || !currentTask) {
    return;
  }

  if (activePointerId !== null) {
    return;
  }

  const startingHex = getHexFromEvent(event);

  if (startingHex === null) {
    return;
  }

  event.preventDefault();

  pointerIsDown = true;
  swipeStarted = false;
  activePointerId = event.pointerId;
  lastPointerHex = startingHex;

  pointerStartX = event.clientX;
  pointerStartY = event.clientY;

  if (board.setPointerCapture) {
    try {
      board.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture may not be available.
    }
  }

  currentPath = [startingHex];

  hexagons[startingHex].classList.add("active");
  playHexSound(startingHex);
}

function handlePointerMove(event) {
  if (
    !pointerIsDown ||
    event.pointerId !== activePointerId
  ) {
    return;
  }

  if (!acceptingInput || !currentTask) {
    finishPointer(event);
    return;
  }

  event.preventDefault();

  const distanceMoved = Math.hypot(
    event.clientX - pointerStartX,
    event.clientY - pointerStartY
  );

  if (
    !swipeStarted &&
    distanceMoved < SWIPE_THRESHOLD
  ) {
    return;
  }

  const currentHex = getHexFromPoint(
    event.clientX,
    event.clientY
  );

  if (
    currentHex === null ||
    currentHex === lastPointerHex
  ) {
    return;
  }

  /*
    Non-neighbor hex:
    include it in the failed path so the touched hex
    receives immediate feedback.
  */
  if (
    lastPointerHex === null ||
    !neighbors[lastPointerHex]?.includes(currentHex)
  ) {
    currentPath.push(currentHex);
    hexagons[currentHex].classList.add("active");
    playHexSound(currentHex);

    rejectPath();
    return;
  }

  /*
    Repeated hex:
    include it in the failed path so it is visibly marked.
  */
  if (currentPath.includes(currentHex)) {
    currentPath.push(currentHex);
    hexagons[currentHex].classList.add("active");
    playHexSound(currentHex);

    rejectPath();
    return;
  }

  /*
    Valid geometric move.
  */
  swipeStarted = true;
  lastPointerHex = currentHex;
  currentPath.push(currentHex);

  hexagons[currentHex].classList.add("active");
  playHexSound(currentHex);

  /*
    Reject as soon as the current path cannot be
    the beginning of any correct answer.
  */
  if (
    !isPrefixPossible(
      currentPath,
      currentTask.answerPaths
    )
  ) {
    rejectPath();
    return;
  }

  /*
    Accept immediately when the complete answer path
    has been reached.
  */
  const result = validatePath(
    currentPath,
    currentTask.answerPaths
  );

  if (result.valid) {
    acceptPath();
  }
}

function handlePointerUp(event) {
  if (event.pointerId !== activePointerId) {
    return;
  }

  event.preventDefault();

  /*
    If the path has not already been accepted or rejected,
    validate it when the pointer is released.
  */
  if (
    acceptingInput &&
    currentPath.length >= 2 &&
    currentTask
  ) {
    const result = validatePath(
      currentPath,
      currentTask.answerPaths
    );

    if (result.valid) {
      acceptPath();
    } else {
      rejectPath();
    }
  }

  finishPointer(event);
}

function handlePointerCancel(event) {
  if (event.pointerId !== activePointerId) {
    return;
  }

  finishPointer(event);
}

function finishPointer(event) {
  if (
    event &&
    board.releasePointerCapture &&
    board.hasPointerCapture?.(event.pointerId)
  ) {
    try {
      board.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already have been released.
    }
  }

  pointerIsDown = false;
  swipeStarted = false;
  activePointerId = null;
  lastPointerHex = null;

  pointerStartX = 0;
  pointerStartY = 0;
}

function finishActivePointer() {
  if (activePointerId === null) {
    pointerIsDown = false;
    swipeStarted = false;
    lastPointerHex = null;
    return;
  }

  finishPointer({
    pointerId: activePointerId
  });
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
   Events and initialization
================================= */

if (languageSelect) {
  languageSelect.addEventListener("change", event => {
    setLanguage(event.target.value);
  });
}

if (startButton) {
  startButton.addEventListener("click", createNewGame);
}

if (board) {
  board.addEventListener("pointerdown", handlePointerDown);
  board.addEventListener("pointermove", handlePointerMove);
  board.addEventListener("pointerup", handlePointerUp);
  board.addEventListener("pointercancel", handlePointerCancel);
  board.addEventListener("lostpointercapture", handlePointerCancel);
}

/* =================================
   Initialization
================================= */

(function init() {
  hexagons = [
    ...document.querySelectorAll(".hex")
  ];

  hexagons.forEach((hex, index) => {
    if (!hex.dataset.index) {
      hex.dataset.index = String(index);
    }
  });

  (async function loadTranslations() {
    try {
      const response = await fetch("lang.json");

      if (!response.ok) {
        throw new Error(
          `Translation request failed: ${response.status}`
        );
      }

      const data = await response.json();
      window.taskTranslations = data;

      language = getInitialLanguage();
      setLanguage(language);

      highScore = loadHighScore();
      updateRound();
      setMessageKey("watchSequence");
    } catch (error) {
      console.error(
        "Failed to load lang.json:",
        error
      );

      if (message) {
        message.textContent =
          "Error loading translations.";
      }
    }
  })();
})();