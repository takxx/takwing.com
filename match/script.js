// Dynamic board size based on orientation
let ROWS = 8;
let COLS = 8;

const animals = [
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

// Dynamite thresholds
const DYNAMITE_POINTS_RELAXED = 500;
const DYNAMITE_POINTS_TIMED = 100;

// A cascade must reach this level to queue one dynamite.
const DYNAMITE_CASCADE_LEVEL = 5;

// Maximum queued dynamites at any time.
const MAX_PENDING_DYNAMITES = 2;

const translations = {
  en: {
    title: "Sea Matches",
    language: "Language",
    mode: "Mode",
    modeRelaxed: "Relaxed",
    modeTimed: "Timed",
    score: "Score",
    moves: "Moves",
    time: "Time",
    bestScore: "Best",
    hint: "Hint",
    newGame: "New Game",
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
    mode: "Modo",
    modeRelaxed: "Relajado",
    modeTimed: "Contrarreloj",
    score: "Score",
    moves: "Moves",
    time: "Time",
    bestScore: "Best",
    hint: "Hint",
    newGame: "New Game",
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
    mode: "模式",
    modeRelaxed: "休閒",
    modeTimed: "計時",
    score: "分數",
    moves: "步數",
    time: "時間",
    bestScore: "最佳",
    hint: "提示",
    newGame: "重新開始",
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

let board = [];
let selected = null;
let score = 0;
let moves = 0;
let busy = false;
let gameOverShown = false;
let currentLanguage = "en";
let pointerStart = null;
let audioContext = null;
let hintCells = [];

let gameMode = "relaxed";
let timeLeft = TIMED_START_SECONDS;
let timerEndTime = null;
let timerTimeout = null;

let bestScoreRelaxed = 0;
let bestScoreTimed = 0;

let resizeTimeout = null;
let reshuffleCheckInterval = null;

// Dynamite tracking
let pointsSinceLastDynamite = 0;

// Dynamites waiting for an empty board space.
let pendingDynamites = 0;

/* ---------------------------
   Orientation / board size
---------------------------- */

function updateBoardSize() {
  const isPortrait = window.innerHeight > window.innerWidth;

  if (isPortrait) {
    ROWS = 10;
    COLS = 7;
  } else {
    ROWS = 7;
    COLS = 10;
  }

  document.documentElement.style.setProperty("--rows", String(ROWS));
  document.documentElement.style.setProperty("--cols", String(COLS));
}

/* ---------------------------
   Language support
---------------------------- */

function getBrowserLanguage() {
  const browserLanguages =
    navigator.languages || [navigator.language];

  for (const language of browserLanguages) {
    const normalized = language.toLowerCase();

    if (
      normalized === "zh-tw" ||
      normalized === "zh-hant" ||
      normalized.startsWith("zh-tw")
    ) {
      return "zh-TW";
    }

    if (normalized.startsWith("es")) {
      return "es";
    }

    if (normalized.startsWith("en")) {
      return "en";
    }
  }

  return "en";
}

function translate(key, ...args) {
  const value = translations[currentLanguage][key];

  return typeof value === "function"
    ? value(...args)
    : value;
}

function setLanguage(language) {
  currentLanguage = translations[language]
    ? language
    : "en";

  languageSelect.value = currentLanguage;

  document.documentElement.lang =
    currentLanguage === "zh-TW"
      ? "zh-Hant"
      : currentLanguage;

  document.querySelectorAll("[data-i18n]").forEach(element => {
    const key = element.dataset.i18n;
    const translation = translations[currentLanguage][key];

    if (typeof translation === "string") {
      element.textContent = translation;
    }
  });

  if (modeSelect) {
    modeSelect.options[0].textContent =
      translate("modeRelaxed");

    modeSelect.options[1].textContent =
      translate("modeTimed");
  }

  if (!busy && !gameOverShown) {
    messageElement.textContent =
      translate("instructions");
  }
}

/* ---------------------------
   Audio
---------------------------- */

function getAudioContext() {
  if (!audioContext) {
    const AudioContext =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioContext) {
      return null;
    }

    audioContext = new AudioContext();
  }

  return audioContext;
}

function playMatchSound(index = 0) {
  const context = getAudioContext();

  if (!context) {
    return;
  }

  if (context.state === "suspended") {
    context.resume();
  }

  const oscillator = context.createOscillator();
  const gain = context.createGain();

  const startTime =
    context.currentTime + index * 0.075;

  const frequency = 520 + index * 55;

  oscillator.type = "sine";

  oscillator.frequency.setValueAtTime(
    frequency,
    startTime
  );

  oscillator.frequency.exponentialRampToValueAtTime(
    frequency * 1.35,
    startTime + 0.11
  );

  gain.gain.setValueAtTime(
    0.0001,
    startTime
  );

  gain.gain.exponentialRampToValueAtTime(
    0.16,
    startTime + 0.015
  );

  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    startTime + 0.14
  );

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + 0.16);
}

function playMatchSounds(numberOfMatchedAnimals) {
  const soundCount = Math.max(
    1,
    numberOfMatchedAnimals - 2
  );

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
    context.resume();
  }

  const t = context.currentTime;

  const osc = context.createOscillator();
  const oscGain = context.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(90, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.35);

  oscGain.gain.setValueAtTime(0.0001, t);
  oscGain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);

  osc.connect(oscGain);
  oscGain.connect(context.destination);

  osc.start(t);
  osc.stop(t + 0.36);

  const bufferSize = context.sampleRate * 0.4;
  const buffer = context.createBuffer(
    1,
    bufferSize,
    context.sampleRate
  );

  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = context.createBufferSource();
  noise.buffer = buffer;

  const noiseFilter = context.createBiquadFilter();
  noiseFilter.type = "lowpass";
  noiseFilter.frequency.setValueAtTime(900, t);
  noiseFilter.frequency.exponentialRampToValueAtTime(120, t + 0.3);

  const noiseGain = context.createGain();
  noiseGain.gain.setValueAtTime(0.0001, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.22, t + 0.01);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(context.destination);

  noise.start(t);
  noise.stop(t + 0.4);

  if (navigator.vibrate) {
    navigator.vibrate(200);
  }
}

/* ---------------------------
   Utility functions
---------------------------- */

function randomAnimal() {
  return animals[
    Math.floor(Math.random() * animals.length)
  ];
}

function wait(milliseconds) {
  return new Promise(resolve =>
    setTimeout(resolve, milliseconds)
  );
}

function getBestScore() {
  return gameMode === "relaxed"
    ? bestScoreRelaxed
    : bestScoreTimed;
}

function updateBestScore() {
  if (gameMode === "relaxed") {
    if (score > bestScoreRelaxed) {
      bestScoreRelaxed = score;

      localStorage.setItem(
        "seaMatchesBestRelaxed",
        String(bestScoreRelaxed)
      );
    }
  } else {
    if (score > bestScoreTimed) {
      bestScoreTimed = score;

      localStorage.setItem(
        "seaMatchesBestTimed",
        String(bestScoreTimed)
      );
    }
  }
}

function formatTime(seconds) {
  return String(
    Math.max(0, Math.ceil(seconds))
  ).padStart(2, "0");
}

function updateTimerDisplay() {
  if (!timerWrap || !timerElement) {
    return;
  }

  if (gameMode === "timed") {
    timerWrap.hidden = false;
    timerElement.textContent = formatTime(timeLeft);
  } else {
    timerWrap.hidden = true;
  }
}

function addTime(seconds) {
  if (gameMode !== "timed" || gameOverShown) {
    return;
  }

  timeLeft = Math.min(
    TIMED_MAX_SECONDS,
    timeLeft + seconds
  );

  if (timerEndTime !== null) {
    timerEndTime += seconds * 1000;
  }

  updateTimerDisplay();
}

function scheduleTimerTick() {
  if (
    gameMode !== "timed" ||
    gameOverShown ||
    timerEndTime === null
  ) {
    return;
  }

  const millisecondsRemaining =
    timerEndTime - Date.now();

  if (millisecondsRemaining <= 0) {
    timeLeft = 0;
    updateTimerDisplay();
    showTimeUp();
    return;
  }

  timeLeft = millisecondsRemaining / 1000;
  updateTimerDisplay();

  const nextUpdate =
    millisecondsRemaining % 1000 || 1000;

  timerTimeout = setTimeout(
    scheduleTimerTick,
    nextUpdate
  );
}

function startTimer() {
  stopTimer();

  if (gameMode !== "timed") {
    return;
  }

  timeLeft = TIMED_START_SECONDS;
  timerEndTime =
    Date.now() + TIMED_START_SECONDS * 1000;

  updateTimerDisplay();
  scheduleTimerTick();
}

function stopTimer() {
  if (timerTimeout !== null) {
    clearTimeout(timerTimeout);
    timerTimeout = null;
  }

  timerEndTime = null;
  updateTimerDisplay();
}

/* ---------------------------
   Board setup and rendering
---------------------------- */

function createBoard() {
  gameOverShown = false;
  selected = null;
  busy = false;
  pointerStart = null;
  hintCells = [];
  pointsSinceLastDynamite = 0;
  pendingDynamites = 0;

  do {
    board = Array.from(
      { length: ROWS },
      () => Array.from(
        { length: COLS },
        randomAnimal
      )
    );
  } while (findMatches().size > 0);

  render();
}

function render() {
  boardElement.innerHTML = "";

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = document.createElement("button");

      cell.type = "button";
      cell.className = "cell";
      cell.dataset.row = row;
      cell.dataset.col = col;

      const value = board[row][col];

      cell.textContent = value ? value : "";

      cell.setAttribute(
        "aria-label",
        value
          ? value === DYNAMITE
            ? "Dynamite"
            : `Animal ${value}`
          : "Empty"
      );

      if (!value) {
        cell.classList.add("empty");
      }

      if (value === DYNAMITE) {
        cell.classList.add("dynamite");
      }

      if (
        selected &&
        selected.row === row &&
        selected.col === col
      ) {
        cell.classList.add("selected");
      }

      const isHintCell = hintCells.some(
        hint =>
          hint.row === row &&
          hint.col === col
      );

      if (isHintCell) {
        cell.classList.add("hint");
      }

      boardElement.appendChild(cell);
    }
  }

  scoreElement.textContent = score;
  movesElement.textContent = moves;

  updateTimerDisplay();

  if (bestScoreElement) {
    bestScoreElement.textContent = getBestScore();
  }
}

/* ---------------------------
   Matching logic
---------------------------- */

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

  for (let row = 0; row < ROWS; row++) {
    let start = 0;

    for (let col = 1; col <= COLS; col++) {
      const same =
        col < COLS &&
        board[row][col] &&
        board[row][col] === board[row][start];

      if (!same) {
        if (
          col - start >= 3 &&
          board[row][start]
        ) {
          for (let x = start; x < col; x++) {
            matches.add(`${row},${x}`);
          }
        }

        start = col;
      }
    }
  }

  for (let col = 0; col < COLS; col++) {
    let start = 0;

    for (let row = 1; row <= ROWS; row++) {
      const same =
        row < ROWS &&
        board[row][col] &&
        board[row][col] === board[start][col];

      if (!same) {
        if (
          row - start >= 3 &&
          board[start][col]
        ) {
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

function dropAnimals() {
  for (let col = 0; col < COLS; col++) {
    const remaining = [];

    for (let row = ROWS - 1; row >= 0; row--) {
      if (board[row][col] !== null) {
        remaining.push(board[row][col]);
      }
    }

    for (let row = ROWS - 1; row >= 0; row--) {
      const indexFromBottom = ROWS - 1 - row;

      board[row][col] =
        remaining[indexFromBottom] ??
        randomAnimal();
    }
  }

  // Place queued dynamites only if empty spaces now exist.
  placePendingDynamites();
}

/* ---------------------------
   Pending dynamite placement
---------------------------- */

function queueDynamite() {
  pendingDynamites = Math.min(
    MAX_PENDING_DYNAMITES,
    pendingDynamites + 1
  );
}

function placePendingDynamites() {
  while (pendingDynamites > 0) {
    const emptyCells = [];

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (!board[row][col]) {
          emptyCells.push({ row, col });
        }
      }
    }

    // No free space yet. Keep the dynamite queued.
    if (emptyCells.length === 0) {
      break;
    }

    const index = Math.floor(
      Math.random() * emptyCells.length
    );

    const cell = emptyCells[index];

    board[cell.row][cell.col] = DYNAMITE;

    pendingDynamites--;
  }
}

/* ---------------------------
   Scoring
---------------------------- */

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

  // One score dynamite per threshold crossed.
  if (pointsSinceLastDynamite >= threshold) {
    pointsSinceLastDynamite -= threshold;

    queueDynamite();
  }
}

/* ---------------------------
   Game flow
---------------------------- */

async function resolveMatches() {
  let cascadeLevel = 1;
  let pointsThisMove = 0;

  while (true) {
    const matches = findMatches();

    if (matches.size === 0) {
      break;
    }

    playMatchSounds(matches.size);

    const cells = [
      ...document.querySelectorAll(".cell")
    ];

    for (const match of matches) {
      const [row, col] =
        match.split(",").map(Number);

      const index = row * COLS + col;

      cells[index]?.classList.add("matched");
    }

    pointsThisMove += scoreForMatch(
      matches.size,
      cascadeLevel
    );

    messageElement.textContent =
      translate("match", matches.size);

    await wait(300);

    for (const match of matches) {
      const [row, col] =
        match.split(",").map(Number);

      board[row][col] = null;
    }

    dropAnimals();
    render();

    await wait(180);

    cascadeLevel++;
  }

  if (pointsThisMove > 0) {
    // May queue one score dynamite.
    addScore(pointsThisMove);

    // May queue one cascade dynamite.
    if (cascadeLevel >= DYNAMITE_CASCADE_LEVEL) {
      queueDynamite();
    }

    render();
  }

  if (!findPossibleMove()) {
    if (gameMode === "relaxed" && !boardHasDynamite()) {
      showGameOver();
      return;
    }

    reshuffleBoard();
    return;
  }

  if (!gameOverShown) {
    messageElement.textContent =
      translate("instructions");
  }
}

/* ---------------------------
   Dynamite logic
---------------------------- */

function boardHasDynamite() {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (board[row][col] === DYNAMITE) {
        return true;
      }
    }
  }

  return false;
}

function triggerDynamiteExplosion(row, col, explodedSet) {
  const toExplode = [{ row, col }];
  let totalCleared = 0;

  while (toExplode.length > 0) {
    const current = toExplode.pop();
    const key = `${current.row},${current.col}`;

    if (explodedSet.has(key)) {
      continue;
    }

    explodedSet.add(key);

    if (!board[current.row][current.col]) {
      continue;
    }

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = current.row + dr;
        const nc = current.col + dc;

        if (
          nr < 0 ||
          nr >= ROWS ||
          nc < 0 ||
          nc >= COLS
        ) {
          continue;
        }

        const neighborKey = `${nr},${nc}`;

        if (explodedSet.has(neighborKey)) {
          continue;
        }

        if (!board[nr][nc]) {
          continue;
        }

        explodedSet.add(neighborKey);
        totalCleared++;

        const value = board[nr][nc];

        board[nr][nc] = null;

        if (value === DYNAMITE) {
          toExplode.push({ row: nr, col: nc });
        }
      }
    }
  }

  return totalCleared;
}

function clearEntireBoard() {
  let count = 0;

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (board[row][col]) {
        board[row][col] = null;
        count++;
      }
    }
  }

  return count;
}

/* ---------------------------
   Swaps and interactions
---------------------------- */

async function attemptSwap(first, second) {
  const firstVal = board[first.row][first.col];
  const secondVal = board[second.row][second.col];

  if (firstVal === DYNAMITE && secondVal === DYNAMITE) {
    swap(first, second);
    render();

    await wait(150);

    playDynamiteSound();

    const cleared = clearEntireBoard();

    addScore(cleared);

    messageElement.textContent =
      translate("dynamiteCleared", cleared);

    render();

    await wait(250);

    dropAnimals();
    render();

    await wait(180);

    await checkAfterExplosion();
    return;
  }

  if (firstVal === DYNAMITE && secondVal !== DYNAMITE) {
    swap(first, second);
    render();

    await wait(150);

    playDynamiteSound();

    const explodedSet = new Set();

    triggerDynamiteExplosion(
      second.row,
      second.col,
      explodedSet
    );

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (board[row][col] === secondVal) {
          const key = `${row},${col}`;

          if (!explodedSet.has(key)) {
            explodedSet.add(key);
            board[row][col] = null;
          }
        }
      }
    }

    const cleared = explodedSet.size;

    addScore(cleared);

    messageElement.textContent =
      translate("dynamiteCleared", cleared);

    render();

    await wait(250);

    dropAnimals();
    render();

    await wait(180);

    await checkAfterExplosion();
    return;
  }

  if (secondVal === DYNAMITE && firstVal !== DYNAMITE) {
    swap(first, second);
    render();

    await wait(150);

    playDynamiteSound();

    const explodedSet = new Set();

    triggerDynamiteExplosion(
      first.row,
      first.col,
      explodedSet
    );

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (board[row][col] === firstVal) {
          const key = `${row},${col}`;

          if (!explodedSet.has(key)) {
            explodedSet.add(key);
            board[row][col] = null;
          }
        }
      }
    }

    const cleared = explodedSet.size;

    addScore(cleared);

    messageElement.textContent =
      translate("dynamiteCleared", cleared);

    render();

    await wait(250);

    dropAnimals();
    render();

    await wait(180);

    await checkAfterExplosion();
    return;
  }

  swap(first, second);
  render();

  if (findMatches().size === 0) {
    await wait(250);

    swap(first, second);
    moves--;

    messageElement.textContent =
      translate("invalidSwap");

    render();
  } else {
    await resolveMatches();
  }

  busy = false;
}

async function checkAfterExplosion() {
  if (!findPossibleMove()) {
    if (gameMode === "relaxed" && !boardHasDynamite()) {
      showGameOver();
      busy = false;
      return;
    }

    reshuffleBoard();
    busy = false;
    return;
  }

  busy = false;

  messageElement.textContent =
    translate("instructions");
}

/* ---------------------------
   Input handling
---------------------------- */

function areNeighbors(first, second) {
  const distance =
    Math.abs(first.row - second.row) +
    Math.abs(first.col - second.col);

  return distance === 1;
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

  addScore(cleared);

  messageElement.textContent =
    translate("dynamiteCleared", cleared);

  render();

  await wait(250);

  dropAnimals();
  render();

  await wait(180);

  await checkAfterExplosion();
}

function handleTap(row, col) {
  if (gameOverShown) {
    return;
  }

  const cellValue = board[row][col];

  if (!cellValue) {
    return;
  }

  if (cellValue === DYNAMITE) {
    if (!busy) {
      moves++;
      handleDynamiteClick(row, col);
    }

    return;
  }

  if (busy) {
    return;
  }

  if (!selected) {
    selected = { row, col };
    render();
    return;
  }

  if (
    selected.row === row &&
    selected.col === col
  ) {
    selected = null;
    render();
    return;
  }

  const second = { row, col };

  if (!areNeighbors(selected, second)) {
    selected = second;
    render();
    return;
  }

  const first = selected;

  selected = null;
  moves++;
  busy = true;

  attemptSwap(first, second);
}

function handleSwipe(start, endX, endY) {
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
    targetRow < ROWS &&
    targetCol >= 0 &&
    targetCol < COLS &&
    board[targetRow][targetCol];

  if (!validTarget || busy || gameOverShown) {
    selected = null;
    render();
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

boardElement.addEventListener(
  "pointerdown",
  event => {
    const cell =
      event.target.closest(".cell");

    if (!cell || busy || gameOverShown) {
      return;
    }

    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);

    if (!board[row][col]) {
      return;
    }

    pointerStart = {
      row,
      col,
      x: event.clientX,
      y: event.clientY
    };

    cell.setPointerCapture?.(
      event.pointerId
    );
  }
);

boardElement.addEventListener(
  "pointerup",
  event => {
    if (!pointerStart) {
      return;
    }

    const start = {
      row: pointerStart.row,
      col: pointerStart.col,
      x: pointerStart.x,
      y: pointerStart.y
    };

    pointerStart = null;

    handleSwipe(
      start,
      event.clientX,
      event.clientY
    );
  }
);

boardElement.addEventListener(
  "pointercancel",
  () => {
    pointerStart = null;
  }
);

/* ---------------------------
   Possible moves and reshuffling
---------------------------- */

function findPossibleMove() {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const first = { row, col };

      const directions = [
        { row: 0, col: 1 },
        { row: 1, col: 0 }
      ];

      for (const direction of directions) {
        const second = {
          row: row + direction.row,
          col: col + direction.col
        };

        if (
          second.row >= ROWS ||
          second.col >= COLS
        ) {
          continue;
        }

        swap(first, second);

        const createsMatch =
          findMatches().size > 0;

        swap(first, second);

        if (createsMatch) {
          return { first, second };
        }
      }
    }
  }

  return null;
}

function reshuffleBoard() {
  do {
    board = Array.from(
      { length: ROWS },
      () => Array.from(
        { length: COLS },
        randomAnimal
      )
    );
  } while (
    findMatches().size > 0 ||
    !findPossibleMove()
  );

  selected = null;
  hintCells = [];

  if (gameMode === "timed") {
    addTime(RESHUFFLE_BONUS_SECONDS);
  }

  render();

  messageElement.textContent =
    translate("reshuffled");

  setTimeout(() => {
    if (!busy && !gameOverShown) {
      messageElement.textContent =
        translate("instructions");
    }
  }, 1200);
}

/* ---------------------------
   Hint
---------------------------- */

function showHint() {
  if (busy || gameOverShown) {
    return;
  }

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (board[row][col] === DYNAMITE) {
        hintCells = [{ row, col }];

        messageElement.textContent =
          translate("dynamiteHint");

        render();

        setTimeout(() => {
          hintCells = [];

          if (!busy && !gameOverShown) {
            messageElement.textContent =
              translate("instructions");
          }

          render();
        }, 2200);

        return;
      }
    }
  }

  const hint = findPossibleMove();

  if (!hint) {
    reshuffleBoard();
    return;
  }

  hintCells = [hint.first, hint.second];

  messageElement.textContent =
    translate("hintMessage");

  render();

  setTimeout(() => {
    hintCells = [];

    if (!busy && !gameOverShown) {
      messageElement.textContent =
        translate("instructions");
    }

    render();
  }, 2200);
}

/* ---------------------------
   Game over
---------------------------- */

function finishGame(messageKey) {
  if (gameOverShown) {
    return;
  }

  gameOverShown = true;
  busy = true;

  stopTimer();
  updateBestScore();
  render();

  const finalMessage = translate(messageKey);

  messageElement.textContent = finalMessage;

  setTimeout(() => {
    alert(finalMessage);
  }, 100);
}

function showTimeUp() {
  finishGame("timeUp");
}

function showGameOver() {
  finishGame("noMoves");
}

/* ---------------------------
   New game and mode changes
---------------------------- */

function resetGameState() {
  score = 0;
  moves = 0;
  selected = null;
  busy = false;
  gameOverShown = false;
  pointerStart = null;
  hintCells = [];
  pointsSinceLastDynamite = 0;
  pendingDynamites = 0;
}

function startNewGame() {
  stopTimer();
  resetGameState();

  if (gameMode === "timed") {
    startTimer();
  }

  createBoard();

  messageElement.textContent =
    translate("instructions");
}

function setGameMode(mode) {
  gameMode = mode === "timed"
    ? "timed"
    : "relaxed";

  if (modeSelect) {
    modeSelect.value = gameMode;
  }

  startNewGame();
}

function loadBestScores() {
  bestScoreRelaxed = Number(
    localStorage.getItem(
      "seaMatchesBestRelaxed"
    ) || "0"
  );

  bestScoreTimed = Number(
    localStorage.getItem(
      "seaMatchesBestTimed"
    ) || "0"
  );
}

/* ---------------------------
   Event listeners
---------------------------- */

languageSelect.addEventListener(
  "change",
  event => {
    setLanguage(event.target.value);
  }
);

modeSelect.addEventListener(
  "change",
  event => {
    setGameMode(event.target.value);
  }
);

hintButton.addEventListener(
  "click",
  showHint
);

newGameButton.addEventListener(
  "click",
  startNewGame
);

window.addEventListener(
  "resize",
  () => {
    clearTimeout(resizeTimeout);

    resizeTimeout = setTimeout(() => {
      updateBoardSize();
      startNewGame();
    }, 150);
  }
);

/* ---------------------------
   Startup
---------------------------- */

loadBestScores();

updateBoardSize();

currentLanguage = getBrowserLanguage();
setLanguage(currentLanguage);

gameMode = modeSelect.value || "relaxed";

createBoard();

if (gameMode === "timed") {
  startTimer();
}

reshuffleCheckInterval = setInterval(() => {
  if (
    !busy &&
    !gameOverShown &&
    !findPossibleMove()
  ) {
    if (gameMode === "relaxed" && !boardHasDynamite()) {
      showGameOver();
    } else {
      reshuffleBoard();
    }
  }
}, 800);