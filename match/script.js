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

const DYNAMITE_POINTS_RELAXED = 500;
const DYNAMITE_POINTS_TIMED = 100;
const DYNAMITE_CASCADE_LEVEL = 5;
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
    score: "Puntos",
    moves: "Movimientos",
    time: "Tiempo",
    bestScore: "Récord",
    hint: "Pista",
    newGame: "Nuevo Juego",
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

// Score progress toward the next score-based dynamite.
let pointsSinceLastDynamite = 0;

// FIFO queue. The first item is always the first dynamite
// that must be placed when an empty cell becomes available.
let pendingDynamites = [];

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

  document.documentElement.style.setProperty(
    "--rows",
    String(ROWS)
  );

  document.documentElement.style.setProperty(
    "--cols",
    String(COLS)
  );
}

/* ---------------------------
   Language support
---------------------------- */

function getBrowserLanguage() {
  const browserLanguages =
    navigator.languages || [navigator.language];

  for (const language of browserLanguages) {
    const normalized = String(language).toLowerCase();

    if (
      normalized === "zh-tw" ||
      normalized === "zh-hk" ||
      normalized === "zh-mo" ||
      normalized === "zh-hant" ||
      normalized.startsWith("zh-tw-") ||
      normalized.startsWith("zh-hk-") ||
      normalized.startsWith("zh-mo-") ||
      normalized.startsWith("zh-hant-")
    ) {
      return "zh-TW";
    }

    if (
      normalized === "zh-cn" ||
      normalized === "zh-hans" ||
      normalized.startsWith("zh-cn-") ||
      normalized.startsWith("zh-hans-")
    ) {
      return "zh-TW";
    }

    if (
      normalized === "es" ||
      normalized.startsWith("es-") ||
      normalized.startsWith("es_")
    ) {
      return "es";
    }

    if (
      normalized === "en" ||
      normalized.startsWith("en-") ||
      normalized.startsWith("en_")
    ) {
      return "en";
    }
  }

  return "en";
}

function translate(key, ...args) {
  const language = translations[currentLanguage] ||
    translations.en;

  const value = language[key];

  if (typeof value === "function") {
    return value(...args);
  }

  return value ?? translations.en[key] ?? key;
}

function setLanguage(language) {
  currentLanguage = translations[language]
    ? language
    : "en";

  if (languageSelect) {
    languageSelect.value = currentLanguage;
  }

  document.documentElement.lang =
    currentLanguage === "zh-TW"
      ? "zh-Hant"
      : currentLanguage;

  document.documentElement.classList.remove(
    "lang-en",
    "lang-es",
    "lang-zh-tw"
  );

  document.documentElement.classList.add(
    `lang-${currentLanguage.toLowerCase()}`
  );

  document.querySelectorAll("[data-i18n]").forEach(element => {
    const key = element.dataset.i18n;
    const translation =
      translations[currentLanguage][key];

    if (typeof translation === "string") {
      element.textContent = translation;
    }
  });

  if (modeSelect && modeSelect.options.length >= 2) {
    modeSelect.options[0].textContent =
      translate("modeRelaxed");

    modeSelect.options[1].textContent =
      translate("modeTimed");
  }

  if (!busy && !gameOverShown && messageElement) {
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

  const time = context.currentTime;

  const oscillator = context.createOscillator();
  const oscillatorGain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(90, time);
  oscillator.frequency.exponentialRampToValueAtTime(
    40,
    time + 0.35
  );

  oscillatorGain.gain.setValueAtTime(
    0.0001,
    time
  );

  oscillatorGain.gain.exponentialRampToValueAtTime(
    0.25,
    time + 0.02
  );

  oscillatorGain.gain.exponentialRampToValueAtTime(
    0.0001,
    time + 0.35
  );

  oscillator.connect(oscillatorGain);
  oscillatorGain.connect(context.destination);

  oscillator.start(time);
  oscillator.stop(time + 0.36);

  const bufferSize = context.sampleRate * 0.4;
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
  noise.buffer = buffer;

  const noiseFilter = context.createBiquadFilter();
  noiseFilter.type = "lowpass";

  noiseFilter.frequency.setValueAtTime(
    900,
    time
  );

  noiseFilter.frequency.exponentialRampToValueAtTime(
    120,
    time + 0.3
  );

  const noiseGain = context.createGain();

  noiseGain.gain.setValueAtTime(
    0.0001,
    time
  );

  noiseGain.gain.exponentialRampToValueAtTime(
    0.22,
    time + 0.01
  );

  noiseGain.gain.exponentialRampToValueAtTime(
    0.0001,
    time + 0.35
  );

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(context.destination);

  noise.start(time);
  noise.stop(time + 0.4);

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
  return new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });
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

    return;
  }

  if (score > bestScoreTimed) {
    bestScoreTimed = score;

    localStorage.setItem(
      "seaMatchesBestTimed",
      String(bestScoreTimed)
    );
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
  if (
    gameMode !== "timed" ||
    gameOverShown ||
    seconds <= 0
  ) {
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
  pendingDynamites = [];

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
  if (!boardElement) {
    return;
  }

  boardElement.innerHTML = "";

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = document.createElement("button");

      cell.type = "button";
      cell.className = "cell";
      cell.dataset.row = row;
      cell.dataset.col = col;

      const value = board[row][col];

      cell.textContent = value || "";

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

      const isHintCell = hintCells.some(hint => {
        return (
          hint.row === row &&
          hint.col === col
        );
      });

      if (isHintCell) {
        cell.classList.add("hint");
      }

      boardElement.appendChild(cell);
    }
  }

  if (scoreElement) {
    scoreElement.textContent = score;
  }

  if (movesElement) {
    movesElement.textContent = moves;
  }

  if (bestScoreElement) {
    bestScoreElement.textContent = getBestScore();
  }

  updateTimerDisplay();
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

/* ---------------------------
   Dynamite queue and refilling
---------------------------- */

function queueDynamite() {
  if (
    pendingDynamites.length >=
    MAX_PENDING_DYNAMITES
  ) {
    return;
  }

  // FIFO: append to the end.
  // The first queued dynamite remains at index 0.
  pendingDynamites.push(DYNAMITE);
}

function getEmptyCells() {
  const emptyCells = [];

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
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
      // Preserve the queue. Do not replace animals.
      return;
    }

    const randomIndex = Math.floor(
      Math.random() * emptyCells.length
    );

    const cell = emptyCells[randomIndex];

    // Remove the oldest queued dynamite only after placement.
    board[cell.row][cell.col] =
      pendingDynamites.shift();
  }
}

function collapseColumns() {
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
        remaining[indexFromBottom] ?? null;
    }
  }
}

function fillEmptyCells() {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (board[row][col] === null) {
        board[row][col] = randomAnimal();
      }
    }
  }
}

function refillBoard() {
  // First move existing cells downward.
  collapseColumns();

  // Next place the oldest queued dynamites into newly
  // available cells.
  placePendingDynamites();

  // Finally fill remaining empty cells with animals.
  fillEmptyCells();
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

  while (
    pointsSinceLastDynamite >= threshold
  ) {
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

    // Refill after each cascade. Any dynamite already queued
    // gets first priority over new animals.
    refillBoard();
    render();

    await wait(180);

    cascadeLevel++;
  }

  if (pointsThisMove > 0) {
    // Queue score-based dynamites before the final refill.
    addScore(pointsThisMove);

    // Queue the cascade dynamite after the score dynamite.
    // Therefore the score dynamite has priority.
    if (
      cascadeLevel >= DYNAMITE_CASCADE_LEVEL
    ) {
      queueDynamite();
    }

    // The final refill places queued dynamites before animals.
    refillBoard();
    render();
  }

  if (!findPossibleMove()) {
    if (
      gameMode === "relaxed" &&
      !boardHasDynamite()
    ) {
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

function triggerDynamiteExplosion(
  row,
  col,
  explodedSet
) {
  // Start with the initially triggered dynamite.
  const toExplode = [{ row, col }];

  let totalCleared = 0;

  // Process explosions until no chained dynamites remain.
  while (toExplode.length > 0) {
    const current = toExplode.pop();

    const currentKey =
      `${current.row},${current.col}`;

    // Skip cells that have already been cleared.
    if (explodedSet.has(currentKey)) {
      continue;
    }

    explodedSet.add(currentKey);

    const currentValue =
      board[current.row][current.col];

    // Ignore empty cells, though this should normally
    // not happen for a queued dynamite position.
    if (!currentValue) {
      continue;
    }

    // Important fix:
    // Remove the exploding dynamite itself.
    // Without this line, the dynamite remains on the board.
    board[current.row][current.col] = null;

    totalCleared++;

    // Check all eight neighboring cells.
    for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
      for (let colOffset = -1; colOffset <= 1; colOffset++) {
        const neighborRow =
          current.row + rowOffset;

        const neighborCol =
          current.col + colOffset;

        // Stay within the board boundaries.
        if (
          neighborRow < 0 ||
          neighborRow >= ROWS ||
          neighborCol < 0 ||
          neighborCol >= COLS
        ) {
          continue;
        }

        const neighborKey =
          `${neighborRow},${neighborCol}`;

        // Skip already-cleared cells.
        if (explodedSet.has(neighborKey)) {
          continue;
        }

        const neighborValue =
          board[neighborRow][neighborCol];

        // Skip empty cells.
        if (!neighborValue) {
          continue;
        }

        // Clear the neighboring cell.
        explodedSet.add(neighborKey);

        board[neighborRow][neighborCol] = null;

        totalCleared++;

        // If the neighbor was also dynamite, queue it
        // for its own explosion.
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
   Explosion resolution
---------------------------- */

async function resolveExplosion(
  cleared,
  message
) {
  addScore(cleared);

  messageElement.textContent = message;
  render();

  await wait(250);

  // Explosion created empty cells. Queued dynamites are
  // placed before any replacement animals.
  refillBoard();
  render();

  await wait(180);

  await checkAfterExplosion();
}

/* ---------------------------
   Swaps and interactions
---------------------------- */

async function attemptSwap(first, second) {
  const firstValue =
    board[first.row][first.col];

  const secondValue =
    board[second.row][second.col];

  if (
    firstValue === DYNAMITE &&
    secondValue === DYNAMITE
  ) {
    swap(first, second);
    render();

    await wait(150);

    playDynamiteSound();

    const cleared = clearEntireBoard();

    await resolveExplosion(
      cleared,
      translate("dynamiteCleared", cleared)
    );

    return;
  }

  if (
    firstValue === DYNAMITE &&
    secondValue !== DYNAMITE
  ) {
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
        if (board[row][col] === secondValue) {
          const key = `${row},${col}`;

          if (!explodedSet.has(key)) {
            explodedSet.add(key);
            board[row][col] = null;
          }
        }
      }
    }

    const cleared = explodedSet.size;

    await resolveExplosion(
      cleared,
      translate("dynamiteCleared", cleared)
    );

    return;
  }

  if (
    secondValue === DYNAMITE &&
    firstValue !== DYNAMITE
  ) {
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
        if (board[row][col] === firstValue) {
          const key = `${row},${col}`;

          if (!explodedSet.has(key)) {
            explodedSet.add(key);
            board[row][col] = null;
          }
        }
      }
    }

    const cleared = explodedSet.size;

    await resolveExplosion(
      cleared,
      translate("dynamiteCleared", cleared)
    );

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
    if (
      gameMode === "relaxed" &&
      !boardHasDynamite()
    ) {
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

  await resolveExplosion(
    cleared,
    translate("dynamiteCleared", cleared)
  );
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

  if (
    !validTarget ||
    busy ||
    gameOverShown
  ) {
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
   Possible moves / reshuffling
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

        if (
          !board[first.row][first.col] ||
          !board[second.row][second.col]
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

function createPlayableBoard() {
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
}

function reshuffleBoard() {
  // Pending dynamites remain queued during a reshuffle.
  createPlayableBoard();

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
   New game / mode changes
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
  pendingDynamites = [];
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
    if (
      gameMode === "relaxed" &&
      !boardHasDynamite()
    ) {
      showGameOver();
    } else {
      reshuffleBoard();
    }
  }
}, 800);