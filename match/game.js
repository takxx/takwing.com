import {
  translate,
  setLanguage,
  getInitialLanguage,
  getCurrentLanguage
} from "./lang.js";

import {
  initRender,
  setBoardSize,
  showMessage,
  showMessageText,
  updateStats,
  renderBoard,
  getMatchedCellElements,
  setIntroVisible
} from "./render.js";

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

const LANGUAGE_STORAGE_KEY = "sea-matches-language";
const BEST_RELAXED_STORAGE_KEY = "seaMatchesBestRelaxed";
const BEST_TIMED_STORAGE_KEY = "seaMatchesBestTimed";

let rows = 8;
let cols = 8;

let board = [];
let selected = null;
let hintCells = [];

let score = 0;
let moves = 0;
let busy = false;
let gameOverShown = false;
let gameStarted = false;

let gameMode = "relaxed";
let timeLeft = TIMED_START_SECONDS;
let timerEndTime = null;
let timerTimeout = null;

let bestScoreRelaxed = 0;
let bestScoreTimed = 0;

let pointerStart = null;
let audioContext = null;

let pointsSinceLastDynamite = 0;
let pendingDynamites = [];

let resizeTimeout = null;
let noMoveCheckInterval = null;
let wasPortrait = null;

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
  return Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
}

function getBestScore() {
  return gameMode === "relaxed"
    ? bestScoreRelaxed
    : bestScoreTimed;
}

function updateBestScore() {
  if (score <= getBestScore()) {
    return;
  }

  if (gameMode === "relaxed") {
    bestScoreRelaxed = score;
    writeStorage(BEST_RELAXED_STORAGE_KEY, bestScoreRelaxed);
  } else {
    bestScoreTimed = score;
    writeStorage(BEST_TIMED_STORAGE_KEY, bestScoreTimed);
  }
}

function isPortraitOrientation() {
  return window.innerHeight > window.innerWidth;
}

function updateBoardSize() {
  const portrait = isPortraitOrientation();

  rows = portrait ? 10 : 7;
  cols = portrait ? 7 : 10;

  setBoardSize(rows, cols);
}

function randomAnimal() {
  return ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
}

function wait(milliseconds) {
  return new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });
}

function refreshView() {
  renderBoard({
    board,
    rows,
    cols,
    selected,
    hintCells
  });

  updateStats({
    score,
    moves,
    bestScore: getBestScore(),
    gameMode,
    timeLeft
  });
}

/* ------------------------------ Audio ------------------------------ */

function getAudioContext() {
  if (!audioContext) {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      return null;
    }

    audioContext = new AudioContextClass();
  }

  return audioContext;
}

function playMatchSound(index = 0) {
  const context = getAudioContext();

  if (!context) {
    return;
  }

  if (context.state === "suspended") {
    context.resume().catch(() => {});
  }

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

function playMatchSounds(numberOfMatchedAnimals) {
  const soundCount = Math.max(1, numberOfMatchedAnimals - 2);

  for (let index = 0; index < soundCount; index++) {
    playMatchSound(index);
  }
}

function playDynamiteSound() {
  const context = getAudioContext();

  if (!context) {
    return;
  }

  if (context.state === "suspended") {
    context.resume().catch(() => {});
  }

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
  const buffer = context.createBuffer(
    1,
    bufferSize,
    context.sampleRate
  );
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

/* ------------------------------ Timer ------------------------------ */

function addTime(seconds) {
  if (gameMode !== "timed" || gameOverShown || seconds <= 0) {
    return;
  }

  timeLeft = Math.min(TIMED_MAX_SECONDS, timeLeft + seconds);

  if (timerEndTime !== null) {
    timerEndTime += seconds * 1000;
  }

  refreshView();
}

function scheduleTimerTick() {
  if (gameMode !== "timed" || gameOverShown || timerEndTime === null) {
    return;
  }

  const millisecondsRemaining = timerEndTime - Date.now();

  if (millisecondsRemaining <= 0) {
    timeLeft = 0;
    refreshView();
    finishGame("timeUp");
    return;
  }

  timeLeft = millisecondsRemaining / 1000;
  refreshView();

  const nextUpdate = millisecondsRemaining % 1000 || 1000;
  timerTimeout = setTimeout(scheduleTimerTick, nextUpdate);
}

function startTimer() {
  stopTimer();

  if (gameMode !== "timed") {
    return;
  }

  timeLeft = TIMED_START_SECONDS;
  timerEndTime = Date.now() + TIMED_START_SECONDS * 1000;

  refreshView();
  scheduleTimerTick();
}

function stopTimer() {
  if (timerTimeout !== null) {
    clearTimeout(timerTimeout);
    timerTimeout = null;
  }

  timerEndTime = null;
}

/* --------------------------- Board setup --------------------------- */

function createEmptyBoard() {
  return Array.from(
    { length: rows },
    () => Array.from({ length: cols }, () => null)
  );
}

function createBoard() {
  gameOverShown = false;
  selected = null;
  busy = false;
  pointerStart = null;
  hintCells = [];
  pointsSinceLastDynamite = 0;
  pendingDynamites = [];

  do {
    board = Array.from(
      { length: rows },
      () => Array.from({ length: cols }, randomAnimal)
    );
  } while (findMatches().size > 0);

  refreshView();
}

function createPlayableBoard() {
  do {
    board = Array.from(
      { length: rows },
      () => Array.from({ length: cols }, randomAnimal)
    );
  } while (
    findMatches().size > 0 ||
    !findPossibleMove()
  );
}

/* --------------------------- Match logic --------------------------- */

function swap(first, second) {
  [
    board[first.row][first.col],
    board[second.row][second.col]
  ] = [
    board[second.row][second.col],
    board[first.row][first.col]
  ];
}

function findMatches() {
  const matches = new Set();

  for (let row = 0; row < rows; row++) {
    let start = 0;

    for (let col = 1; col <= cols; col++) {
      const same =
        col < cols &&
        board[row][col] &&
        board[row][col] === board[row][start];

      if (!same) {
        if (col - start >= 3 && board[row][start]) {
          for (let x = start; x < col; x++) {
            matches.add(`${row},${x}`);
          }
        }

        start = col;
      }
    }
  }

  for (let col = 0; col < cols; col++) {
    let start = 0;

    for (let row = 1; row <= rows; row++) {
      const same =
        row < rows &&
        board[row][col] &&
        board[row][col] === board[start][col];

      if (!same) {
        if (row - start >= 3 && board[start][col]) {
          for (let y = start; y < row; y++) {
            matches.add(`${y},${col}`);
          }
        }

        start = row;
      }
    }
  }

  return matches;
}

function findPossibleMove() {
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
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
          second.row >= rows ||
          second.col >= cols ||
          !board[first.row][first.col] ||
          !board[second.row][second.col]
        ) {
          continue;
        }

        swap(first, second);
        const createsMatch = findMatches().size > 0;
        swap(first, second);

        if (createsMatch) {
          return { first, second };
        }
      }
    }
  }

  return null;
}

/* ------------------------ Dynamite and refill ---------------------- */

function queueDynamite() {
  if (pendingDynamites.length >= MAX_PENDING_DYNAMITES) {
    return;
  }

  pendingDynamites.push(DYNAMITE);
}

function getEmptyCells() {
  const emptyCells = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (board[row][col] === null) {
        emptyCells.push({ row, col });
      }
    }
  }

  return emptyCells;
}

function placePendingDynamites() {
  while (pendingDynamites.length > 0) {
    const emptyCells = getEmptyCells();

    if (emptyCells.length === 0) {
      return;
    }

    const cell =
      emptyCells[Math.floor(Math.random() * emptyCells.length)];

    board[cell.row][cell.col] = pendingDynamites.shift();
  }
}

function collapseColumns() {
  for (let col = 0; col < cols; col++) {
    const remaining = [];

    for (let row = rows - 1; row >= 0; row--) {
      if (board[row][col] !== null) {
        remaining.push(board[row][col]);
      }
    }

    for (let row = rows - 1; row >= 0; row--) {
      const indexFromBottom = rows - 1 - row;
      board[row][col] = remaining[indexFromBottom] ?? null;
    }
  }
}

function fillEmptyCells() {
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (board[row][col] === null) {
        board[row][col] = randomAnimal();
      }
    }
  }
}

function refillBoard() {
  collapseColumns();
  placePendingDynamites();
  fillEmptyCells();
}

/* ------------------------------ Scoring ---------------------------- */

function scoreForMatch(count, cascadeLevel) {
  const basePoints = Math.max(1, count - 2);
  return basePoints * cascadeLevel;
}

function addScore(points) {
  if (points <= 0) {
    return;
  }

  score += points;

  if (gameMode === "timed") {
    addTime(points * TIME_PER_POINT);
  }

  pointsSinceLastDynamite += points;

  const threshold =
    gameMode === "timed"
      ? DYNAMITE_POINTS_TIMED
      : DYNAMITE_POINTS_RELAXED;

  while (pointsSinceLastDynamite >= threshold) {
    pointsSinceLastDynamite -= threshold;
    queueDynamite();
  }

  updateBestScore();
}

/* ---------------------------- Game flow ---------------------------- */

async function resolveMatches() {
  let cascadeLevel = 1;
  let pointsThisMove = 0;

  while (true) {
    const matches = findMatches();

    if (matches.size === 0) {
      break;
    }

    playMatchSounds(matches.size);

    const matchedCells = getMatchedCellElements(matches, cols);

    matchedCells.forEach(cell => {
      cell?.classList.add("matched");
    });

    pointsThisMove += scoreForMatch(matches.size, cascadeLevel);
    showMessage("match", matches.size);

    await wait(300);

    for (const match of matches) {
      const [row, col] = match.split(",").map(Number);
      board[row][col] = null;
    }

    refillBoard();
    refreshView();

    await wait(180);

    cascadeLevel++;
  }

  if (pointsThisMove > 0) {
    addScore(pointsThisMove);

    if (cascadeLevel >= DYNAMITE_CASCADE_LEVEL) {
      queueDynamite();
    }

    refillBoard();
    refreshView();
  }
}

/* ------------------------- Dynamite logic -------------------------- */

function boardHasDynamite() {
  return board.some(row => row.includes(DYNAMITE));
}

function clearCell(row, col, explodedSet) {
  const key = `${row},${col}`;

  if (
    explodedSet.has(key) ||
    row < 0 ||
    row >= rows ||
    col < 0 ||
    col >= cols ||
    !board[row][col]
  ) {
    return false;
  }

  explodedSet.add(key);
  board[row][col] = null;

  return true;
}

function triggerDynamiteExplosion(row, col, explodedSet) {
  const toExplode = [{ row, col }];
  let totalCleared = 0;

  while (toExplode.length > 0) {
    const current = toExplode.pop();
    const currentKey = `${current.row},${current.col}`;

    if (explodedSet.has(currentKey)) {
      continue;
    }

    if (clearCell(current.row, current.col, explodedSet)) {
      totalCleared++;
    }

    for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
      for (let colOffset = -1; colOffset <= 1; colOffset++) {
        const neighborRow = current.row + rowOffset;
        const neighborCol = current.col + colOffset;

        if (
          neighborRow < 0 ||
          neighborRow >= rows ||
          neighborCol < 0 ||
          neighborCol >= cols
        ) {
          continue;
        }

        const neighborKey = `${neighborRow},${neighborCol}`;

        if (explodedSet.has(neighborKey)) {
          continue;
        }

        const neighborValue =
          board[neighborRow][neighborCol];

        if (
          clearCell(neighborRow, neighborCol, explodedSet)
        ) {
          totalCleared++;
        }

        if (neighborValue === DYNAMITE) {
          toExplode.push({
            row: neighborRow,
            col: neighborCol
          });
        }
      }
    }
  }

  return totalCleared;
}

function clearEntireBoard() {
  let count = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (board[row][col]) {
        board[row][col] = null;
        count++;
      }
    }
  }

  return count;
}

async function resolveExplosion(cleared) {
  addScore(cleared);
  showMessage("dynamiteCleared", cleared);

  refreshView();
  await wait(250);

  refillBoard();
  refreshView();
  await wait(180);

  await resolveMatches();
  await checkAfterMove();
}

/* ------------------------- Swaps and input ------------------------- */

function areNeighbors(first, second) {
  return (
    Math.abs(first.row - second.row) +
      Math.abs(first.col - second.col) ===
    1
  );
}

async function attemptSwap(first, second) {
  const firstValue = board[first.row][first.col];
  const secondValue = board[second.row][second.col];

  if (firstValue === DYNAMITE && secondValue === DYNAMITE) {
    swap(first, second);
    refreshView();

    await wait(150);
    playDynamiteSound();

    const cleared = clearEntireBoard();
    await resolveExplosion(cleared);

    return;
  }

  if (firstValue === DYNAMITE || secondValue === DYNAMITE) {
    const dynamiteCell =
      firstValue === DYNAMITE ? first : second;

    const animalValue =
      firstValue === DYNAMITE ? secondValue : firstValue;

    swap(first, second);
    refreshView();

    await wait(150);
    playDynamiteSound();

    const explodedSet = new Set();

    triggerDynamiteExplosion(
      dynamiteCell.row,
      dynamiteCell.col,
      explodedSet
    );

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (board[row][col] === animalValue) {
          clearCell(row, col, explodedSet);
        }
      }
    }

    await resolveExplosion(explodedSet.size);

    return;
  }

  swap(first, second);
  refreshView();

  if (findMatches().size === 0) {
    await wait(250);

    swap(first, second);
    moves--;

    showMessage("invalidSwap");
    refreshView();

    busy = false;
    return;
  }

  await resolveMatches();
  await checkAfterMove();
}

async function checkAfterMove() {
  if (gameOverShown) {
    busy = false;
    return;
  }

  if (findPossibleMove()) {
    busy = false;
    showMessage("instructions");
    return;
  }

  if (gameMode === "relaxed") {
    if (boardHasDynamite()) {
      busy = false;
      showMessage("dynamiteHint");
      return;
    }

    finishGame("noMoves");
    busy = false;
    return;
  }

  reshuffleBoard();
  busy = false;
}

export function handleTap(row, col) {
  if (!gameStarted || gameOverShown || busy) {
    return;
  }

  const cellValue = board[row][col];

  if (!cellValue) {
    return;
  }

  if (cellValue === DYNAMITE) {
    moves++;
    handleDynamiteClick(row, col);
    return;
  }

  if (!selected) {
    selected = { row, col };
    refreshView();
    return;
  }

  if (selected.row === row && selected.col === col) {
    selected = null;
    refreshView();
    return;
  }

  const second = { row, col };

  if (!areNeighbors(selected, second)) {
    selected = second;
    refreshView();
    return;
  }

  const first = selected;

  selected = null;
  moves++;
  busy = true;

  attemptSwap(first, second);
}

export function handleSwipe(start, endX, endY) {
  const deltaX = endX - start.x;
  const deltaY = endY - start.y;
  const distance = Math.max(
    Math.abs(deltaX),
    Math.abs(deltaY)
  );

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
    targetRow >= 0 &&
    targetRow < rows &&
    targetCol >= 0 &&
    targetCol < cols &&
    board[targetRow][targetCol];

  if (!validTarget || busy || gameOverShown) {
    selected = null;
    refreshView();
    return;
  }

  const first = {
    row: start.row,
    col: start.col
  };

  const second = {
    row: targetRow,
    col: targetCol
  };

  selected = null;
  moves++;
  busy = true;

  attemptSwap(first, second);
}

async function handleDynamiteClick(row, col) {
  if (busy || gameOverShown) {
    return;
  }

  busy = true;
  playDynamiteSound();

  const explodedSet = new Set();
  const cleared = triggerDynamiteExplosion(
    row,
    col,
    explodedSet
  );

  await resolveExplosion(cleared);
}

/* --------------------- Reshuffle, hint, finish --------------------- */

function reshuffleBoard() {
  createPlayableBoard();

  selected = null;
  hintCells = [];

  if (gameMode === "timed") {
    addTime(RESHUFFLE_BONUS_SECONDS);
  }

  refreshView();
  showMessage("reshuffled");

  setTimeout(() => {
    if (!busy && !gameOverShown && gameStarted) {
      showMessage("instructions");
    }
  }, 1200);
}

export function showHint() {
  if (!gameStarted || busy || gameOverShown) {
    return;
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (board[row][col] === DYNAMITE) {
        hintCells = [{ row, col }];
        showMessage("dynamiteHint");
        refreshView();

        setTimeout(() => {
          hintCells = [];

          if (!busy && !gameOverShown && gameStarted) {
            showMessage("instructions");
          }

          refreshView();
        }, 2200);

        return;
      }
    }
  }

  const hint = findPossibleMove();

  if (!hint) {
    if (gameMode === "relaxed" && boardHasDynamite()) {
      hintCells = [];

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (board[row][col] === DYNAMITE) {
            hintCells.push({ row, col });
          }
        }
      }

      showMessage("dynamiteHint");
      refreshView();

      setTimeout(() => {
        hintCells = [];

        if (!busy && !gameOverShown && gameStarted) {
          showMessage("instructions");
        }

        refreshView();
      }, 2200);

      return;
    }

    reshuffleBoard();
    return;
  }

  hintCells = [hint.first, hint.second];
  showMessage("hintMessage");
  refreshView();

  setTimeout(() => {
    hintCells = [];

    if (!busy && !gameOverShown && gameStarted) {
      showMessage("instructions");
    }

    refreshView();
  }, 2200);
}

function finishGame(messageKey) {
  if (gameOverShown) {
    return;
  }

  gameOverShown = true;
  busy = true;

  stopTimer();
  updateBestScore();
  refreshView();

  const finalMessage = translate(messageKey);
  showMessageText(finalMessage);

  setTimeout(() => {
    alert(finalMessage);
  }, 100);
}

/* ------------------------- Intro and startup ----------------------- */

function resetGameState() {
  score = 0;
  moves = 0;
  selected = null;
  busy = false;
  gameOverShown = false;
  pointerStart = null;
  hintCells = [];
  pointsSinceLastDynamite = 0;
  pendingDynamites = [];
}

export function startNewGame() {
  stopTimer();
  resetGameState();

  gameStarted = true;

  if (gameMode === "timed") {
    startTimer();
  }

  createBoard();
  showMessage("instructions");
}

export function showIntro() {
  stopTimer();
  gameStarted = false;
  busy = true;

  const modeToggle = document.getElementById("modeToggle");

  if (modeToggle) {
    modeToggle.checked = gameMode === "timed";
  }

  setIntroVisible(true);
}

export function startGameFromIntro() {
  const modeToggle = document.getElementById("modeToggle");

  gameMode = modeToggle?.checked ? "timed" : "relaxed";

  setIntroVisible(false);
  startNewGame();
}

export function initGame() {
  const boardElement = document.getElementById("board");
  const scoreElement = document.getElementById("score");
  const movesElement = document.getElementById("moves");
  const messageElement = document.getElementById("message");
  const timerWrap = document.getElementById("timerWrap");
  const timerElement = document.getElementById("timer");
  const bestScoreElement =
    document.getElementById("bestScore");

  initRender({
    boardElement,
    scoreElement,
    movesElement,
    messageElement,
    timerWrap,
    timerElement,
    bestScoreElement
  });

  bestScoreRelaxed = readScore(BEST_RELAXED_STORAGE_KEY);
  bestScoreTimed = readScore(BEST_TIMED_STORAGE_KEY);

  setLanguage(getInitialLanguage());

  wasPortrait = isPortraitOrientation();
  updateBoardSize();

  const modeToggle = document.getElementById("modeToggle");
  gameMode = modeToggle?.checked ? "timed" : "relaxed";

  createBoard();
  showIntro();

  noMoveCheckInterval = setInterval(() => {
    if (
      !gameStarted ||
      busy ||
      gameOverShown ||
      findPossibleMove()
    ) {
      return;
    }

    if (gameMode === "relaxed") {
      if (boardHasDynamite()) {
        showMessage("dynamiteHint");
        return;
      }

      finishGame("noMoves");
      return;
    }

    reshuffleBoard();
  }, 800);

  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);

    resizeTimeout = setTimeout(() => {
      const portrait = isPortraitOrientation();

      if (portrait === wasPortrait) {
        return;
      }

      wasPortrait = portrait;
      updateBoardSize();

      if (gameStarted) {
        startNewGame();
      }
    }, 150);
  });
}