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

const translations = {
  en: {
    title: "Perfect Matches",
    language: "Language",
    score: "Score",
    moves: "Moves",
    hint: "Hint",
    newGame: "New Game",
    instructions: "Click or swipe neighboring animals to match them.",
    match: count => `Great! ${count} animals matched!`,
    invalidSwap: "That swap did not make a match.",
    noMoves: "Game over! There are no possible matches left.",
    hintMessage: "Hint: try swapping these two animals."
  },

  es: {
    title: "Parejitas",
    language: "Idioma",
    score: "Puntuación",
    moves: "Movimientos",
    hint: "Pista",
    newGame: "Nuevo Juego",
    instructions: "Haz clic o desliza animales vecinos para combinarlos.",
    match: count => `¡Bien! ¡Has combinado ${count} animales!`,
    invalidSwap: "Ese movimiento no creó una combinación.",
    noMoves: "¡Fin del juego! No quedan combinaciones posibles.",
    hintMessage: "Pista: intenta intercambiar estos dos animales."
  },

  "zh-TW": {
    title: "深海群組",
    language: "語言",
    score: "分數",
    moves: "步數",
    hint: "提示",
    newGame: "重新開始",
    instructions: "點擊或滑動相鄰動物以作配對",
    match: count => `成功配對 ${count} 隻動物！`,
    invalidSwap: "未能配對",
    noMoves: "遊戲結束！已無動物可配對。",
    hintMessage: "提示：試試交換這兩隻動物。"
  }
};

const boardElement = document.getElementById("board");
const scoreElement = document.getElementById("score");
const movesElement = document.getElementById("moves");
const messageElement = document.getElementById("message");
const newGameButton = document.getElementById("newGame");
const hintButton = document.getElementById("hintButton");
const languageSelect = document.getElementById("languageSelect");

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

/* ---------------------------
   Orientation / board size
---------------------------- */

function updateBoardSize() {
  const isPortrait = window.innerHeight > window.innerWidth;

  // Portrait → 7×10, Landscape → 10×7 (adjust as you like)
  if (isPortrait) {
    ROWS = 10;
    COLS = 7;
  } else {
    ROWS = 7;
    COLS = 10;
  }

  // Update CSS grid layout via CSS variables
  document.documentElement.style.setProperty("--rows", String(ROWS));
  document.documentElement.style.setProperty("--cols", String(COLS));

  // You can remove the direct gridTemplate* lines if you prefer CSS variables
  // boardElement.style.gridTemplateRows = `repeat(${ROWS}, 1fr)`;
  // boardElement.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
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

  if (!busy) {
    messageElement.textContent = translate("instructions");
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
  /*
    3 animals = 1 sound
    4 animals = 2 sounds
    5 animals = 3 sounds
    6 animals = 4 sounds
  */
  const soundCount = Math.max(
    1,
    numberOfMatchedAnimals - 2
  );

  for (let index = 0; index < soundCount; index++) {
    playMatchSound(index);
  }
}

/* ---------------------------
   Board setup and rendering
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

function createBoard() {
  gameOverShown = false;
  selected = null;
  busy = false;
  pointerStart = null;
  hintCells = [];

  do {
    board = Array.from({ length: ROWS }, () =>
      Array.from({ length: COLS }, randomAnimal)
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
      cell.textContent = board[row][col] || "";

      cell.setAttribute(
        "aria-label",
        board[row][col]
          ? `Animal ${board[row][col]}`
          : "Empty"
      );

      if (!board[row][col]) {
        cell.classList.add("empty");
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

  // Horizontal matches
  for (let row = 0; row < ROWS; row++) {
    let start = 0;

    for (let col = 1; col <= COLS; col++) {
      const same =
        col < COLS &&
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

  // Vertical matches
  for (let col = 0; col < COLS; col++) {
    let start = 0;

    for (let row = 1; row <= ROWS; row++) {
      const same =
        row < ROWS &&
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

function dropAnimals() {
  for (let col = 0; col < COLS; col++) {
    const remaining = [];

    // Collect existing animals from bottom to top.
    for (let row = ROWS - 1; row >= 0; row--) {
      if (board[row][col] !== null) {
        remaining.push(board[row][col]);
      }
    }

    // Put existing animals back at the bottom.
    for (let row = ROWS - 1; row >= 0; row--) {
      const indexFromBottom = ROWS - 1 - row;

      board[row][col] =
        remaining[indexFromBottom] ?? randomAnimal();
    }
  }
}

/* ---------------------------
   Game flow
---------------------------- */

async function resolveMatches() {
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
      const [row, col] = match.split(",").map(Number);
      const index = row * COLS + col;

      cells[index]?.classList.add("matched");
    }

    score += matches.size * 10;
    scoreElement.textContent = score;
    messageElement.textContent =
      translate("match", matches.size);

    await wait(300);

    for (const match of matches) {
      const [row, col] = match.split(",").map(Number);
      board[row][col] = null;
    }

    dropAnimals();
    render();

    await wait(180);
  }

  const possibleMove = findPossibleMove();

  if (!possibleMove) {
    showGameOver();
  } else {
    messageElement.textContent =
      translate("instructions");
  }
}

async function attemptSwap(first, second) {
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

/* ---------------------------
   Click, mouse drag, and swipe
---------------------------- */

function areNeighbors(first, second) {
  const distance =
    Math.abs(first.row - second.row) +
    Math.abs(first.col - second.col);

  return distance === 1;
}

function handleTap(row, col) {
  if (busy || !board[row][col]) {
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

  // Treat a short movement as a click or tap.
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

  if (!validTarget || busy) {
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

boardElement.addEventListener("pointerdown", event => {
  const cell = event.target.closest(".cell");

  if (!cell || busy) {
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

  cell.setPointerCapture?.(event.pointerId);
});

boardElement.addEventListener("pointerup", event => {
  if (!pointerStart) {
    return;
  }

  // Copy the values before clearing pointerStart.
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
});

boardElement.addEventListener("pointercancel", () => {
  pointerStart = null;
});

/* ---------------------------
   Hints and game over
---------------------------- */

function findPossibleMove() {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const first = { row, col };

      // Only check right and down.
      // The reverse directions would duplicate the same swaps.
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

function showHint() {
  if (busy) {
    return;
  }

  const hint = findPossibleMove();

  if (!hint) {
    showGameOver();
    return;
  }

  hintCells = [
    hint.first,
    hint.second
  ];

  messageElement.textContent =
    translate("hintMessage");

  render();

  setTimeout(() => {
    hintCells = [];

    if (!busy) {
      messageElement.textContent =
        translate("instructions");
    }

    render();
  }, 2200);
}

function showGameOver() {
  if (gameOverShown) {
    return;
  }

  gameOverShown = true;
  busy = true;

  const gameOverMessage = translate("noMoves");

  messageElement.textContent = gameOverMessage;

  setTimeout(() => {
    alert(gameOverMessage);
  }, 100);
}

/* ---------------------------
   Buttons and startup
---------------------------- */

languageSelect.addEventListener("change", event => {
  setLanguage(event.target.value);
});

hintButton.addEventListener("click", showHint);

newGameButton.addEventListener("click", () => {
  score = 0;
  moves = 0;
  selected = null;
  busy = false;
  gameOverShown = false;
  pointerStart = null;
  hintCells = [];

  createBoard();
  setLanguage(currentLanguage);
});

// Initialize
updateBoardSize();
window.addEventListener("resize", () => {
  updateBoardSize();
  // Restart game when orientation/size changes
  createBoard();
});

setLanguage(getBrowserLanguage());
createBoard();