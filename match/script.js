"use strict";

/* ------------------------------------------------------------------
   Constants
------------------------------------------------------------------ */

const ANIMALS = [
  "🐙",
  "🪼",
  "🦪",
  "🦀",
  "🐢",
  "🐋",
  "🐡"
];

const DYNAMITE = "🧨";

const TIMED_START_SECONDS = 80;
const TIMED_MAX_SECONDS = 99;
const TIME_PER_POINT = 1 / 3;
const RESHUFFLE_BONUS_SECONDS = 2;

const DYNAMITE_POINTS_RELAXED = 500;
const DYNAMITE_POINTS_TIMED = 100;
const DYNAMITE_CASCADE_LEVEL = 5;
const MAX_PENDING_DYNAMITES = 2;

const MATCH_ANIMATION_MS = 300;
const REFILL_ANIMATION_MS = 180;
const EXPLOSION_ANIMATION_MS = 250;
const INVALID_SWAP_ANIMATION_MS = 250;
const HINT_DURATION_MS = 2200;
const RESHUFFLE_MESSAGE_MS = 1200;

const LANGUAGE_STORAGE_KEY = "sea-matches-language";
const BEST_RELAXED_STORAGE_KEY = "seaMatchesBestRelaxed";
const BEST_TIMED_STORAGE_KEY = "seaMatchesBestTimed";

const SUPPORTED_LANGUAGES = ["en", "es", "zh-TW"];

const URL_LANGUAGE_MAP = {
  en: "en",
  es: "es",
  zh: "zh-TW"
};

/* ------------------------------------------------------------------
   Translations
------------------------------------------------------------------ */

const translations = {
  en: {
    title: "Sea Matches",
    language: "Language",
    modeRelaxed: "Relaxed",
    modeTimed: "Timed",
    score: "Score",
    moves: "Moves",
    time: "Time",
    bestScore: "Best",
    instructions: "Click or swipe neighboring animals to match them.",
    match: count => `Great! ${count} animals matched!`,
    invalidSwap: "That swap did not make a match.",
    reshuffled: "No moves available. The board was reshuffled!",
    timeUp: "Time is up!",
    noMoves: "Game over! There are no possible matches left.",
    hintMessage: "Hint: try swapping these two animals.",
    dynamiteCleared: count => `Boom! ${count} animals cleared!`,
    dynamiteHint: "Hint: explode this dynamite."
  },

  es: {
    title: "Parejas del Mar",
    language: "Idioma",
    modeRelaxed: "Relajado",
    modeTimed: "Contrarreloj",
    score: "Puntos",
    moves: "Movimientos",
    time: "Tiempo",
    bestScore: "Récord",
    instructions: "Haz clic o desliza animales vecinos para combinarlos.",
    match: count => `¡Bien! ¡Has combinado ${count} animales!`,
    invalidSwap: "Ese movimiento no creó una combinación.",
    reshuffled: "No hay movimientos. ¡El tablero se reorganizó!",
    timeUp: "¡Se acabó el tiempo!",
    noMoves: "¡Fin del juego! No quedan combinaciones posibles.",
    hintMessage: "Pista: intenta intercambiar estos dos animales.",
    dynamiteCleared: count => `¡Boom! ¡${count} animales eliminados!`,
    dynamiteHint: "Pista: detona esta dinamita."
  },

  "zh-TW": {
    title: "深海群組",
    language: "語言",
    modeRelaxed: "休閒",
    modeTimed: "計時",
    score: "分數",
    moves: "步數",
    time: "時間",
    bestScore: "最佳",
    instructions: "點擊或滑動相鄰動物以作配對",
    match: count => `成功配對 ${count} 隻動物！`,
    invalidSwap: "未能配對",
    reshuffled: "沒有可用步數，棋盤已重新排列！",
    timeUp: "夠鐘！",
    noMoves: "遊戲結束！已無動物可配對。",
    hintMessage: "提示：試試交換這兩隻動物。",
    dynamiteCleared: count => `轟！消除了 ${count} 隻動物！`,
    dynamiteHint: "提示：引爆這顆炸藥。"
  }
};

/* ------------------------------------------------------------------
   DOM references
------------------------------------------------------------------ */

const boardElement = document.getElementById("board");
const scoreElement = document.getElementById("score");
const movesElement = document.getElementById("moves");
const messageElement = document.getElementById("message");
const newGameButton = document.getElementById("newGame");
const hintButton = document.getElementById("hintButton");
const languageSelect = document.getElementById("languageSelect");
const modeSelect = document.getElementById("modeSelect");
const timerWrap = document.getElementById("timerWrap");
const timerElement = document.getElementById("timer");
const bestScoreElement = document.getElementById("bestScore");

/* ------------------------------------------------------------------
   Game state
------------------------------------------------------------------ */

const game = {
  board: [],
  rows: 8,
  cols: 8,

  selected: null,
  score: 0,
  moves: 0,

  busy: false,
  gameOver: false,
  generation: 0,

  mode: "relaxed",
  timeLeft: TIMED_START_SECONDS,
  timerEndTime: null,

  language: "en",
  pointerStart: null,
  hintCells: [],

  bestRelaxed: 0,
  bestTimed: 0,

  pointsSinceDynamite: 0,
  pendingDynamites: []
};

const timers = {
  hint: null,
  message: null,
  timer: null,
  resize: null
};

/* ------------------------------------------------------------------
   Storage
------------------------------------------------------------------ */

function readStorage(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* Storage may be unavailable. */
  }
}

function readScore(key) {
  const value = Number(readStorage(key, "0"));
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

/* ------------------------------------------------------------------
   Timers
------------------------------------------------------------------ */

function clearTimer(timerName) {
  if (timers[timerName] !== null) {
    clearTimeout(timers[timerName]);
    timers[timerName] = null;
  }
}

function clearAllTimers() {
  clearTimer("hint");
  clearTimer("message");
  clearTimer("timer");
  clearTimer("resize");
}

function wait(milliseconds, generation = game.generation) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(generation === game.generation);
    }, milliseconds);
  });
}

/* ------------------------------------------------------------------
   Language
------------------------------------------------------------------ */

function getQueryLanguage() {
  const requested = new URLSearchParams(window.location.search)
    .get("lang")
    ?.trim()
    .toLowerCase();

  return URL_LANGUAGE_MAP[requested] || null;
}

function getSavedLanguage() {
  const saved = readStorage(LANGUAGE_STORAGE_KEY);
  return SUPPORTED_LANGUAGES.includes(saved) ? saved : null;
}

function getBrowserLanguage() {
  const languages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];

  for (const language of languages) {
    const normalized = String(language).toLowerCase().replace("_", "-");

    if (normalized.startsWith("zh")) {
      return "zh-TW";
    }

    if (normalized === "es" || normalized.startsWith("es-")) {
      return "es";
    }

    if (normalized === "en" || normalized.startsWith("en-")) {
      return "en";
    }
  }

  return "en";
}

function translate(key, ...args) {
  const language = translations[game.language] || translations.en;
  const value = language[key];

  return typeof value === "function"
    ? value(...args)
    : value ?? translations.en[key] ?? key;
}

function setLanguage(language) {
  game.language = SUPPORTED_LANGUAGES.includes(language)
    ? language
    : "en";

  writeStorage(LANGUAGE_STORAGE_KEY, game.language);

  if (languageSelect) {
    languageSelect.value = game.language;
  }

  document.documentElement.lang =
    game.language === "zh-TW" ? "zh-Hant" : game.language;

  document.documentElement.classList.remove(
    "lang-en",
    "lang-es",
    "lang-zh-tw"
  );

  document.documentElement.classList.add(
    `lang-${game.language.toLowerCase()}`
  );

  document.querySelectorAll("[data-i18n]").forEach(element => {
    const value = translations[game.language][element.dataset.i18n];

    if (typeof value === "string") {
      element.textContent = value;
    }
  });

  if (modeSelect?.options.length >= 2) {
    modeSelect.options[0].textContent = translate("modeRelaxed");
    modeSelect.options[1].textContent = translate("modeTimed");
  }

  if (!game.busy && !game.gameOver) {
    showMessage(translate("instructions"));
  }
}

/* ------------------------------------------------------------------
   Messages
------------------------------------------------------------------ */

function showMessage(text, autoClearMs = null) {
  clearTimer("message");

  if (messageElement) {
    messageElement.textContent = text;
  }

  if (autoClearMs !== null) {
    timers.message = setTimeout(() => {
      timers.message = null;

      if (!game.busy && !game.gameOver) {
        showMessage(translate("instructions"));
      }
    }, autoClearMs);
  }
}

/* ------------------------------------------------------------------
   Audio
------------------------------------------------------------------ */

let audioContext = null;

function getAudioContext() {
  if (audioContext) {
    return audioContext;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  audioContext = new AudioContextClass();
  return audioContext;
}

function resumeAudio(context) {
  if (context.state === "suspended") {
    context.resume().catch(() => {});
  }
}

function playMatchSound(index = 0) {
  const context = getAudioContext();

  if (!context) {
    return;
  }

  resumeAudio(context);

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const startTime = context.currentTime + index * 0.075;
  const frequency = 520 + index * 55;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startTime);
  oscillator.frequency.exponentialRampToValueAtTime(
    frequency * 1.35,
    startTime + 0.11
  );

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.16, startTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.14);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + 0.16);
}

function playMatchSounds(matchCount) {
  const soundCount = Math.max(1, matchCount - 2);

  for (let index = 0; index < soundCount; index++) {
    playMatchSound(index);
  }
}

function playDynamiteSound() {
  const context = getAudioContext();

  if (!context) {
    return;
  }

  resumeAudio(context);

  const time = context.currentTime;

  const oscillator = context.createOscillator();
  const oscillatorGain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(90, time);
  oscillator.frequency.exponentialRampToValueAtTime(40, time + 0.35);

  oscillatorGain.gain.setValueAtTime(0.0001, time);
  oscillatorGain.gain.exponentialRampToValueAtTime(0.25, time + 0.02);
  oscillatorGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.35);

  oscillator.connect(oscillatorGain);
  oscillatorGain.connect(context.destination);

  oscillator.start(time);
  oscillator.stop(time + 0.36);

  const bufferSize = Math.floor(context.sampleRate * 0.4);
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
  const data = buffer.getChannelData(0);

  for (let index = 0; index < bufferSize; index++) {
    data[index] = Math.random() * 2 - 1;
  }

  const noise = context.createBufferSource();
  const noiseFilter = context.createBiquadFilter();
  const noiseGain = context.createGain();

  noise.buffer = buffer;
  noiseFilter.type = "lowpass";
  noiseFilter.frequency.setValueAtTime(900, time);
  noiseFilter.frequency.exponentialRampToValueAtTime(120, time + 0.3);

  noiseGain.gain.setValueAtTime(0.0001, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.22, time + 0.01);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.35);

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(context.destination);

  noise.start(time);
  noise.stop(time + 0.4);

  navigator.vibrate?.(200);
}

/* ------------------------------------------------------------------
   Board size
------------------------------------------------------------------ */

function isPortrait() {
  return window.innerHeight > window.innerWidth;
}

function updateBoardSize() {
  const portrait = isPortrait();

  game.rows = portrait ? 10 : 7;
  game.cols = portrait ? 7 : 10;

  document.documentElement.style.setProperty("--rows", String(game.rows));
  document.documentElement.style.setProperty("--cols", String(game.cols));
}

/* ------------------------------------------------------------------
   Board helpers
------------------------------------------------------------------ */

function randomAnimal() {
  return ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
}

function createEmptyBoard() {
  return Array.from(
    { length: game.rows },
    () => Array.from({ length: game.cols }, () => null)
  );
}

function createRandomBoard() {
  return Array.from(
    { length: game.rows },
    () => Array.from({ length: game.cols }, randomAnimal)
  );
}

function swapCells(first, second) {
  const firstValue = game.board[first.row][first.col];
  const secondValue = game.board[second.row][second.col];

  game.board[first.row][first.col] = secondValue;
  game.board[second.row][first.col === second.col ? first.col : second.col] =
    firstValue;
}

function areNeighbors(first, second) {
  return (
    Math.abs(first.row - second.row) +
      Math.abs(first.col - second.col) ===
    1
  );
}

function isInsideBoard(row, col) {
  return row >= 0 && row < game.rows && col >= 0 && col < game.cols;
}

function cellKey(row, col) {
  return `${row},${col}`;
}

/* ------------------------------------------------------------------
   Matching
------------------------------------------------------------------ */

function findMatches() {
  const matches = new Set();

  for (let row = 0; row < game.rows; row++) {
    let runStart = 0;

    for (let col = 1; col <= game.cols; col++) {
      const current = game.board[row][col];
      const previous = game.board[row][runStart];

      if (col < game.cols && current && current === previous) {
        continue;
      }

      if (col - runStart >= 3 && previous) {
        for (let matchCol = runStart; matchCol < col; matchCol++) {
          matches.add(cellKey(row, matchCol));
        }
      }

      runStart = col;
    }
  }

  for (let col = 0; col < game.cols; col++) {
    let runStart = 0;

    for (let row = 1; row <= game.rows; row++) {
      const current = game.board[row]?.[col];
      const previous = game.board[runStart][col];

      if (row < game.rows && current && current === previous) {
        continue;
      }

      if (row - runStart >= 3 && previous) {
        for (let matchRow = runStart; matchRow < row; matchRow++) {
          matches.add(cellKey(matchRow, col));
        }
      }

      runStart = row;
    }
  }

  return matches;
}

function findPossibleMove() {
  for (let row = 0; row < game.rows; row++) {
    for (let col = 0; col < game.cols; col++) {
      const first = { row, col };

      for (const direction of [
        { row: 0, col: 1 },
        { row: 1, col: 0 }
      ]) {
        const second = {
          row: row + direction.row,
          col: col + direction.col
        };

        if (
          !isInsideBoard(second.row, second.col) ||
          !game.board[first.row][first.col] ||
          !game.board[second.row][second.col]
        ) {
          continue;
        }

        swapCells(first, second);
        const createsMatch = findMatches().size > 0;
        swapCells(first, second);

        if (createsMatch) {
          return { first, second };
        }
      }
    }
  }

  return null;
}

/* ------------------------------------------------------------------
   Refilling
------------------------------------------------------------------ */

function getEmptyCells() {
  const cells = [];

  for (let row = 0; row < game.rows; row++) {
    for (let col = 0; col < game.cols; col++) {
      if (game.board[row][col] === null) {
        cells.push({ row, col });
      }
    }
  }

  return cells;
}

function queueDynamite() {
  if (game.pendingDynamites.length < MAX_PENDING_DYNAMITES) {
    game.pendingDynamites.push(DYNAMITE);
  }
}

function placePendingDynamites() {
  while (game.pendingDynamites.length > 0) {
    const emptyCells = getEmptyCells();

    if (emptyCells.length === 0) {
      return;
    }

    const cell = emptyCells[
      Math.floor(Math.random() * emptyCells.length)
    ];

    game.board[cell.row][cell.col] = game.pendingDynamites.shift();
  }
}

function collapseColumns() {
  for (let col = 0; col < game.cols; col++) {
    const remaining = [];

    for (let row = game.rows - 1; row >= 0; row--) {
      if (game.board[row][col] !== null) {
        remaining.push(game.board[row][col]);
      }
    }

    for (let row = game.rows - 1; row >= 0; row--) {
      const remainingIndex = game.rows - 1 - row;
      game.board[row][col] = remaining[remainingIndex] ?? null;
    }
  }
}

function fillEmptyCells() {
  for (let row = 0; row < game.rows; row++) {
    for (let col = 0; col < game.cols; col++) {
      if (game.board[row][col] === null) {
        game.board[row][col] = randomAnimal();
      }
    }
  }
}

function refillBoard() {
  collapseColumns();
  placePendingDynamites();
  fillEmptyCells();
}

/* ------------------------------------------------------------------
   Rendering
------------------------------------------------------------------ */

function render() {
  if (!boardElement) {
    return;
  }

  boardElement.innerHTML = "";

  for (let row = 0; row < game.rows; row++) {
    for (let col = 0; col < game.cols; col++) {
      const value = game.board[row][col];
      const cell = document.createElement("button");

      cell.type = "button";
      cell.className = "cell";
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      cell.textContent = value ?? "";

      cell.setAttribute(
        "aria-label",
        value === DYNAMITE
          ? "Dynamite"
          : value
            ? `Animal ${value}`
            : "Empty"
      );

      if (!value) {
        cell.classList.add("empty");
      }

      if (value === DYNAMITE) {
        cell.classList.add("dynamite");
      }

      if (
        game.selected &&
        game.selected.row === row &&
        game.selected.col === col
      ) {
        cell.classList.add("selected");
      }

      if (
        game.hintCells.some(
          hintCell => hintCell.row === row && hintCell.col === col
        )
      ) {
        cell.classList.add("hint");
      }

      boardElement.appendChild(cell);
    }
  }

  if (scoreElement) {
    scoreElement.textContent = game.score;
  }

  if (movesElement) {
    movesElement.textContent = game.moves;
  }

  if (bestScoreElement) {
    bestScoreElement.textContent = getBestScore();
  }

  updateTimerDisplay();
}

/* ------------------------------------------------------------------
   Scoring and best scores
------------------------------------------------------------------ */

function getBestScore() {
  return game.mode === "relaxed"
    ? game.bestRelaxed
    : game.bestTimed;
}

function updateBestScore() {
  if (game.score <= getBestScore()) {
    return;
  }

  if (game.mode === "relaxed") {
    game.bestRelaxed = game.score;
    writeStorage(BEST_RELAXED_STORAGE_KEY, game.bestRelaxed);
  } else {
    game.bestTimed = game.score;
    writeStorage(BEST_TIMED_STORAGE_KEY, game.bestTimed);
  }
}

function scoreForMatch(matchCount, cascadeLevel) {
  return Math.max(1, matchCount - 2) * cascadeLevel;
}

function addScore(points) {
  if (points <= 0) {
    return;
  }

  game.score += points;

  if (game.mode === "timed") {
    addTime(points * TIME_PER_POINT);
  }

  game.pointsSinceDynamite += points;

  const threshold =
    game.mode === "timed"
      ? DYNAMITE_POINTS_TIMED
      : DYNAMITE_POINTS_RELAXED;

  while (game.pointsSinceDynamite >= threshold) {
    game.pointsSinceDynamite -= threshold;
    queueDynamite();
  }

  updateBestScore();
}

/* ------------------------------------------------------------------
   Timer
------------------------------------------------------------------ */

function formatTime(seconds) {
  return String(Math.max(0, Math.ceil(seconds))).padStart(2, "0");
}

function updateTimerDisplay() {
  if (!timerWrap || !timerElement) {
    return;
  }

  if (game.mode !== "timed") {
    timerWrap.hidden = true;
    return;
  }

  timerWrap.hidden = false;
  timerElement.textContent = formatTime(game.timeLeft);
}

function addTime(seconds) {
  if (
    game.mode !== "timed" ||
    game.gameOver ||
    seconds <= 0
  ) {
    return;
  }

  game.timeLeft = Math.min(
    TIMED_MAX_SECONDS,
    game.timeLeft + seconds
  );

  if (game.timerEndTime !== null) {
    game.timerEndTime += seconds * 1000;
  }

  updateTimerDisplay();
}

function stopTimer() {
  clearTimer("timer");
  game.timerEndTime = null;
  updateTimerDisplay();
}

function scheduleTimerTick() {
  if (
    game.mode !== "timed" ||
    game.gameOver ||
    game.timerEndTime === null
  ) {
    return;
  }

  const millisecondsRemaining = game.timerEndTime - Date.now();

  if (millisecondsRemaining <= 0) {
    game.timeLeft = 0;
    updateTimerDisplay();
    finishGame("timeUp");
    return;
  }

  game.timeLeft = millisecondsRemaining / 1000;
  updateTimerDisplay();

  const nextTick = millisecondsRemaining % 1000 || 1000;

  timers.timer = setTimeout(() => {
    timers.timer = null;
    scheduleTimerTick();
  }, nextTick);
}

function startTimer() {
  stopTimer();

  if (game.mode !== "timed") {
    return;
  }

  game.timeLeft = TIMED_START_SECONDS;
  game.timerEndTime = Date.now() + TIMED_START_SECONDS * 1000;

  updateTimerDisplay();
  scheduleTimerTick();
}

/* ------------------------------------------------------------------
   Match resolution
------------------------------------------------------------------ */

async function resolveMatches(generation) {
  let cascadeLevel = 1;
  let pointsThisMove = 0;

  while (generation === game.generation) {
    const matches = findMatches();

    if (matches.size === 0) {
      break;
    }

    playMatchSounds(matches.size);

    const cells = [...boardElement.querySelectorAll(".cell")];

    for (const match of matches) {
      const [row, col] = match.split(",").map(Number);
      cells[row * game.cols + col]?.classList.add("matched");
    }

    pointsThisMove += scoreForMatch(matches.size, cascadeLevel);
    showMessage(translate("match", matches.size));

    const stillCurrent = await wait(MATCH_ANIMATION_MS, generation);

    if (!stillCurrent) {
      return;
    }

    for (const match of matches) {
      const [row, col] = match.split(",").map(Number);
      game.board[row][col] = null;
    }

    refillBoard();
    render();

    const continueCascade = await wait(REFILL_ANIMATION_MS, generation);

    if (!continueCascade) {
      return;
    }

    cascadeLevel++;
  }

  if (generation !== game.generation || pointsThisMove <= 0) {
    return;
  }

  addScore(pointsThisMove);

  if (cascadeLevel >= DYNAMITE_CASCADE_LEVEL) {
    queueDynamite();
  }

  refillBoard();
  render();
}

/* ------------------------------------------------------------------
   Dynamite
------------------------------------------------------------------ */

function boardHasDynamite() {
  return game.board.some(row => row.includes(DYNAMITE));
}

function clearCell(row, col, clearedCells) {
  if (
    !isInsideBoard(row, col) ||
    clearedCells.has(cellKey(row, col)) ||
    !game.board[row][col]
  ) {
    return false;
  }

  clearedCells.add(cellKey(row, col));
  game.board[row][col] = null;

  return true;
}

function triggerDynamiteExplosion(row, col) {
  const clearedCells = new Set();
  const cellsToProcess = [{ row, col }];
  let clearedCount = 0;

  while (cellsToProcess.length > 0) {
    const current = cellsToProcess.pop();

    if (clearedCells.has(cellKey(current.row, current.col))) {
      continue;
    }

    if (clearCell(current.row, current.col, clearedCells)) {
      clearedCount++;
    }

    for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
      for (let colOffset = -1; colOffset <= 1; colOffset++) {
        const neighborRow = current.row + rowOffset;
        const neighborCol = current.col + colOffset;

        if (!isInsideBoard(neighborRow, neighborCol)) {
          continue;
        }

        const neighborValue = game.board[neighborRow][neighborCol];

        if (clearCell(neighborRow, neighborCol, clearedCells)) {
          clearedCount++;
        }

        if (neighborValue === DYNAMITE) {
          cellsToProcess.push({
            row: neighborRow,
            col: neighborCol
          });
        }
      }
    }
  }

  return { clearedCells, clearedCount };
}

function clearEntireBoard() {
  let clearedCount = 0;

  for (let row = 0; row < game.rows; row++) {
    for (let col = 0; col < game.cols; col++) {
      if (game.board[row][col]) {
        game.board[row][col] = null;
        clearedCount++;
      }
    }
  }

  return clearedCount;
}

async function resolveExplosion(clearedCount, generation) {
  addScore(clearedCount);

  showMessage(translate("dynamiteCleared", clearedCount));
  render();

  if (!await wait(EXPLOSION_ANIMATION_MS, generation)) {
    return;
  }

  refillBoard();
  render();

  if (!await wait(REFILL_ANIMATION_MS, generation)) {
    return;
  }

  await resolveMatches(generation);
  await checkAfterMove(generation);
}

/* ------------------------------------------------------------------
   Moves
------------------------------------------------------------------ */

async function attemptSwap(first, second, generation) {
  const firstValue = game.board[first.row][first.col];
  const secondValue = game.board[second.row][second.col];

  if (firstValue === DYNAMITE && secondValue === DYNAMITE) {
    swapCells(first, second);
    render();

    if (!await wait(150, generation)) {
      return;
    }

    playDynamiteSound();
    await resolveExplosion(clearEntireBoard(), generation);

    return;
  }

  if (firstValue === DYNAMITE || secondValue === DYNAMITE) {
    const dynamiteCell = firstValue === DYNAMITE ? first : second;
    const animalValue =
      firstValue === DYNAMITE ? secondValue : firstValue;

    swapCells(first, second);
    render();

    if (!await wait(150, generation)) {
      return;
    }

    playDynamiteSound();

    const { clearedCells, clearedCount } =
      triggerDynamiteExplosion(dynamiteCell.row, dynamiteCell.col);

    for (let row = 0; row < game.rows; row++) {
      for (let col = 0; col < game.cols; col++) {
        if (game.board[row][col] === animalValue) {
          clearCell(row, col, clearedCells);
        }
      }
    }

    await resolveExplosion(clearedCount, generation);

    return;
  }

  swapCells(first, second);
  render();

  if (findMatches().size === 0) {
    if (!await wait(INVALID_SWAP_ANIMATION_MS, generation)) {
      return;
    }

    swapCells(first, second);
    game.moves--;
    showMessage(translate("invalidSwap"));
    render();

    endMove();
    return;
  }

  await resolveMatches(generation);
  await checkAfterMove(generation);
}

async function checkAfterMove(generation) {
  if (generation !== game.generation) {
    return;
  }

  if (game.gameOver) {
    endMove();
    return;
  }

  if (!findPossibleMove()) {
    if (game.mode === "relaxed" && !boardHasDynamite()) {
      finishGame("noMoves");
      return;
    }

    reshuffleBoard();
    endMove();
    return;
  }

  endMove();
}

function endMove() {
  game.busy = false;

  if (!game.gameOver) {
    showMessage(translate("instructions"));
  }
}

/* ------------------------------------------------------------------
   Input
------------------------------------------------------------------ */

function handleDynamiteClick(row, col) {
  if (game.busy || game.gameOver) {
    return;
  }

  const generation = ++game.generation;

  game.busy = true;
  clearHint();

  playDynamiteSound();

  const { clearedCount } = triggerDynamiteExplosion(row, col);

  resolveExplosion(clearedCount, generation);
}

function handleTap(row, col) {
  if (game.gameOver || game.busy) {
    return;
  }

  const value = game.board[row][col];

  if (!value) {
    return;
  }

  if (value === DYNAMITE) {
    game.moves++;
    render();
    handleDynamiteClick(row, col);
    return;
  }

  if (!game.selected) {
    game.selected = { row, col };
    render();
    return;
  }

  if (game.selected.row === row && game.selected.col === col) {
    game.selected = null;
    render();
    return;
  }

  const second = { row, col };

  if (!areNeighbors(game.selected, second)) {
    game.selected = second;
    render();
    return;
  }

  const first = game.selected;

  game.selected = null;
  game.moves++;
  game.busy = true;
  clearHint();

  render();

  const generation = ++game.generation;
  attemptSwap(first, second, generation);
}

function handleSwipe(start, endX, endY) {
  const deltaX = endX - start.x;
  const deltaY = endY - start.y;
  const distance = Math.max(Math.abs(deltaX), Math.abs(deltaY));

  if (distance < 18) {
    handleTap(start.row, start.col);
    return;
  }

  let targetRow = start.row;
  let targetCol = start.col;

  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    targetCol += deltaX > 0 ? 1 : -1;
  } else {
    targetRow += deltaY > 0 ? 1 : -1;
  }

  const validTarget =
    isInsideBoard(targetRow, targetCol) &&
    game.board[targetRow][targetCol];

  if (!validTarget || game.busy || game.gameOver) {
    game.selected = null;
    render();
    return;
  }

  const first = { row: start.row, col: start.col };
  const second = { row: targetRow, col: targetCol };

  game.selected = null;
  game.moves++;
  game.busy = true;
  clearHint();

  render();

  const generation = ++game.generation;
  attemptSwap(first, second, generation);
}

/* ------------------------------------------------------------------
   Board pointer events
------------------------------------------------------------------ */

if (boardElement) {
  boardElement.addEventListener("pointerdown", event => {
    const cell = event.target.closest(".cell");

    if (!cell || game.busy || game.gameOver) {
      return;
    }

    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);

    if (!game.board[row][col]) {
      return;
    }

    game.pointerStart = {
      row,
      col,
      x: event.clientX,
      y: event.clientY
    };

    cell.setPointerCapture?.(event.pointerId);
  });

  boardElement.addEventListener("pointerup", event => {
    if (!game.pointerStart) {
      return;
    }

    const start = { ...game.pointerStart };
    game.pointerStart = null;

    handleSwipe(start, event.clientX, event.clientY);
  });

  boardElement.addEventListener("pointercancel", () => {
    game.pointerStart = null;
  });
}

/* ------------------------------------------------------------------
   Hint
------------------------------------------------------------------ */

function clearHint() {
  clearTimer("hint");
  game.hintCells = [];
}

function showHint() {
  if (game.busy || game.gameOver) {
    return;
  }

  // Important: cancel any previous hint before showing another one.
  clearHint();

  for (let row = 0; row < game.rows; row++) {
    for (let col = 0; col < game.cols; col++) {
      if (game.board[row][col] === DYNAMITE) {
        game.hintCells = [{ row, col }];
        showMessage(translate("dynamiteHint"));

        render();
        scheduleHintClear();

        return;
      }
    }
  }

  const hint = findPossibleMove();

  if (!hint) {
    reshuffleBoard();
    return;
  }

  game.hintCells = [hint.first, hint.second];
  showMessage(translate("hintMessage"));

  render();
  scheduleHintClear();
}

function scheduleHintClear() {
  clearTimer("hint");

  timers.hint = setTimeout(() => {
    timers.hint = null;
    game.hintCells = [];

    if (!game.busy && !game.gameOver) {
      showMessage(translate("instructions"));
    }

    render();
  }, HINT_DURATION_MS);
}

/* ------------------------------------------------------------------
   Game lifecycle
------------------------------------------------------------------ */

function createPlayableBoard() {
  do {
    game.board = createRandomBoard();
  } while (
    findMatches().size > 0 ||
    !findPossibleMove()
  );
}

function reshuffleBoard() {
  createPlayableBoard();

  game.selected = null;
  clearHint();

  if (game.mode === "timed") {
    addTime(RESHUFFLE_BONUS_SECONDS);
  }

  render();
  showMessage(translate("reshuffled"), RESHUFFLE_MESSAGE_MS);
}

function resetGameState() {
  game.generation++;
  game.score = 0;
  game.moves = 0;
  game.selected = null;
  game.busy = false;
  game.gameOver = false;
  game.pointerStart = null;
  game.pointsSinceDynamite = 0;
  game.pendingDynamites = [];

  clearHint();
  clearTimer("message");
}

function startNewGame() {
  stopTimer();
  resetGameState();

  game.board = createRandomBoard();

  while (findMatches().size > 0 || !findPossibleMove()) {
    game.board = createRandomBoard();
  }

  if (game.mode === "timed") {
    startTimer();
  }

  render();
  showMessage(translate("instructions"));
}

function setGameMode(mode) {
  game.mode = mode === "timed" ? "timed" : "relaxed";

  if (modeSelect) {
    modeSelect.value = game.mode;
  }

  startNewGame();
}

function finishGame(messageKey) {
  if (game.gameOver) {
    return;
  }

  game.gameOver = true;
  game.busy = true;
  game.generation++;

  clearHint();
  clearTimer("message");
  stopTimer();
  updateBestScore();
  render();

  const finalMessage = translate(messageKey);
  showMessage(finalMessage);

  setTimeout(() => {
    alert(finalMessage);
  }, 100);
}

/* ------------------------------------------------------------------
   Event listeners
------------------------------------------------------------------ */

if (languageSelect) {
  languageSelect.addEventListener("change", event => {
    setLanguage(event.target.value);
  });
}

if (modeSelect) {
  modeSelect.addEventListener("change", event => {
    setGameMode(event.target.value);
  });
}

if (hintButton) {
  hintButton.addEventListener("click", showHint);
}

if (newGameButton) {
  newGameButton.addEventListener("click", startNewGame);
}

window.addEventListener("resize", () => {
  clearTimer("resize");

  const previousPortrait = isPortrait();

  timers.resize = setTimeout(() => {
    timers.resize = null;

    const portrait = isPortrait();

    if (portrait === previousPortrait) {
      return;
    }

    updateBoardSize();
    startNewGame();
  }, 150);
});

/* ------------------------------------------------------------------
   Startup
------------------------------------------------------------------ */

game.bestRelaxed = readScore(BEST_RELAXED_STORAGE_KEY);
game.bestTimed = readScore(BEST_TIMED_STORAGE_KEY);

updateBoardSize();

game.language = getQueryLanguage() || getSavedLanguage() || getBrowserLanguage();
setLanguage(game.language);

game.mode = modeSelect?.value === "timed" ? "timed" : "relaxed";

startNewGame();