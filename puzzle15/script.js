"use strict";

// Filenames use two case-sensitive characters from this alphabet.
// Range bounds are inclusive and follow the alphabet's order.
const CHARACTERS =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

const FIRST_DIGIT_MIN = "0";
const FIRST_DIGIT_MAX = "5";
const SECOND_DIGIT_MIN = "0";
const SECOND_DIGIT_MAX = "2";

const SVG_FOLDER = "svg/";
const SCRAMBLE_MOVES = 500;

const translations = {
  en: {
    title: "15-Puzzle",
    newGame: "New Game",
    instructions: "Tap or slide a tile next to the empty space to move it.",
    language: "Language",
    complete: "Puzzle completed!",
    tile: number => `Tile ${number}`,
    empty: "Empty space",
    noImage: "No SVG files found within the configured range."
  },
  es: {
    title: "El juego del 15",
    newGame: "Nueva partida",
    instructions:
      "Toca o desliza una ficha adyacente al espacio vacío para moverla.",
    language: "Idioma",
    complete: "¡Puzzle completado!",
    tile: number => `Ficha ${number}`,
    empty: "Espacio vacío",
    noImage: "No se ha encontrado ningún archivo SVG en el rango configurado."
  },
  zh: {
    title: "十五迷陣",
    newGame: "重新開始",
    instructions: "點擊或推動空格旁邊嘅磚塊嚟移動。",
    language: "語言",
    complete: "完成啦！",
    tile: number => `第 ${number} 號磚塊`,
    empty: "空格",
    noImage: "喺設定嘅檔名範圍入面搵唔到 SVG 檔案。"
  }
};

const boardElement = document.querySelector("#board");
const statusElement = document.querySelector("#status");
const languageElement = document.querySelector("#language");

let language = getInitialLanguage();
let imageUrl = "";
let tiles = [];
let pointerStart = null;
let gameNumber = 0;

// For each image tile, this set contains the other image tiles that render
// identically. Tile 15 is deliberately excluded: it is the empty space.
let equivalentPieces = Array.from(
  { length: 15 },
  (_, tile) => new Set([tile])
);

function getInitialLanguage() {
  const params = new URLSearchParams(location.search);
  const queryLanguage = params.get("lang");

  if (queryLanguage && translations[queryLanguage]) {
    try {
      localStorage.setItem("puzzle-language", queryLanguage);
    } catch (_) {
      // Continue without persistent storage if it is unavailable.
    }
    return queryLanguage;
  }

  try {
    const savedLanguage = localStorage.getItem("puzzle-language");
    if (savedLanguage && translations[savedLanguage]) {
      return savedLanguage;
    }
  } catch (_) {
    // Continue to browser preferences if storage is unavailable.
  }

  const browserLanguages = navigator.languages || [
    navigator.language || "en"
  ];

  for (const browserLanguage of browserLanguages) {
    const code = browserLanguage.toLowerCase().split("-")[0];
    if (translations[code]) return code;
  }

  return "en";
}

function applyLanguage() {
  const text = translations[language];

  document.documentElement.lang = language;
  document.querySelector("#title").textContent = text.title;
  document.querySelector("#new-game").textContent = text.newGame;
  document.querySelector("#instructions").textContent = text.instructions;
  document.querySelector("#language-label").textContent = text.language;
  languageElement.value = language;
  statusElement.textContent = isSolved() ? text.complete : "";
}

function charactersInRange(min, max) {
  const start = CHARACTERS.indexOf(min);
  const end = CHARACTERS.indexOf(max);

  if (start < 0 || end < start) {
    throw new Error("Invalid filename character range configuration.");
  }

  return CHARACTERS.slice(start, end + 1);
}

function shuffledCandidates() {
  const firstCharacters =
    charactersInRange(FIRST_DIGIT_MIN, FIRST_DIGIT_MAX);
  const secondCharacters =
    charactersInRange(SECOND_DIGIT_MIN, SECOND_DIGIT_MAX);

  const candidates = [];

  for (const first of firstCharacters) {
    for (const second of secondCharacters) {
      candidates.push(first + second);
    }
  }

  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  return candidates;
}

async function findAvailableSvg() {
  for (const id of shuffledCandidates()) {
    const url = `${SVG_FOLDER}${id}.svg`;

    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.ok) return url;
    } catch (_) {
      // Try the next filename if this request fails.
    }
  }

  throw new Error(translations[language].noImage);
}

async function findEquivalentPieces(url) {
  const image = new Image();
  image.src = url;
  await image.decode();

  // Draw the SVG at a consistent size before comparing its 4×4 pieces.
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 400;

  const context = canvas.getContext("2d", {
    willReadFrequently: true
  });

  if (!context) {
    throw new Error("Unable to compare image pieces.");
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const pieces = Array.from({ length: 15 }, (_, tile) => {
    const x = (tile % 4) * 100;
    const y = Math.floor(tile / 4) * 100;
    return context.getImageData(x, y, 100, 100).data;
  });

  return pieces.map((piece, tile) => {
    const matches = new Set([tile]);

    for (let other = 0; other < pieces.length; other++) {
      const candidate = pieces[other];
      let identical = true;

      for (let i = 0; i < piece.length; i++) {
        if (piece[i] !== candidate[i]) {
          identical = false;
          break;
        }
      }

      if (identical) matches.add(other);
    }

    return matches;
  });
}

function makeScrambledBoard() {
  // Tile values 0–14 are the image pieces; 15 is the empty space.
  const board = Array.from({ length: 16 }, (_, index) => index);
  let emptyPosition = 15;
  let previousEmptyPosition = -1;

  for (let step = 0; step < SCRAMBLE_MOVES; step++) {
    const row = Math.floor(emptyPosition / 4);
    const column = emptyPosition % 4;
    const neighbors = [];

    if (row > 0) neighbors.push(emptyPosition - 4);
    if (row < 3) neighbors.push(emptyPosition + 4);
    if (column > 0) neighbors.push(emptyPosition - 1);
    if (column < 3) neighbors.push(emptyPosition + 1);

    // Avoid immediately undoing the previous move.
    const choices = neighbors.filter(
      position => position !== previousEmptyPosition
    );
    const nextPosition =
      choices[Math.floor(Math.random() * choices.length)];

    [board[emptyPosition], board[nextPosition]] =
      [board[nextPosition], board[emptyPosition]];

    previousEmptyPosition = emptyPosition;
    emptyPosition = nextPosition;
  }

  return board;
}

function isSolved() {
  if (tiles.length !== 16 || tiles[15] !== 15) return false;

  return tiles.slice(0, 15).every(
    (tile, position) => equivalentPieces[position].has(tile)
  );
}

function render() {
  const solved = isSolved();
  const text = translations[language];

  boardElement.replaceChildren();
  boardElement.classList.toggle("completed", solved);

  tiles.forEach((tileNumber, position) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tile";

    if (tileNumber === 15 && !solved) {
      // The 16th space is empty during play.
      button.classList.add("empty");
      button.disabled = true;
      button.setAttribute("aria-label", text.empty);
    } else {
      const originalRow = Math.floor(tileNumber / 4);
      const originalColumn = tileNumber % 4;

      button.style.backgroundImage = `url("${imageUrl}")`;
      button.style.backgroundSize = "400% 400%";
      button.style.backgroundPosition =
        `${originalColumn * 100 / 3}% ${originalRow * 100 / 3}%`;
      button.setAttribute("aria-label", text.tile(tileNumber + 1));

      if (!solved) {
        button.addEventListener("click", () => moveTile(position));
      }
    }

    boardElement.append(button);
  });

  statusElement.textContent = solved ? text.complete : "";
}

function moveTile(position) {
  const emptyPosition = tiles.indexOf(15);
  const sameRow =
    Math.floor(position / 4) === Math.floor(emptyPosition / 4);
  const isAdjacent = sameRow
    ? Math.abs(position - emptyPosition) === 1
    : Math.abs(position - emptyPosition) === 4;

  if (!isAdjacent) return;

  [tiles[position], tiles[emptyPosition]] =
    [tiles[emptyPosition], tiles[position]];

  render();
}

async function newGame() {
  const thisGame = ++gameNumber;
  statusElement.textContent = "";

  try {
    const nextImageUrl = await findAvailableSvg();

    // Ignore an older request if New Game was pressed again while loading.
    if (thisGame !== gameNumber) return;

    imageUrl = nextImageUrl;

    try {
      equivalentPieces = await findEquivalentPieces(imageUrl);
    } catch (_) {
      // Fall back to requiring exact tile positions if pixel comparison fails.
      equivalentPieces = Array.from(
        { length: 15 },
        (_, tile) => new Set([tile])
      );
    }

    if (thisGame !== gameNumber) return;

    tiles = makeScrambledBoard();
    render();
  } catch (error) {
    if (thisGame !== gameNumber) return;

    boardElement.replaceChildren();
    boardElement.classList.remove("completed");
    statusElement.textContent =
      error instanceof Error ? error.message : "Unable to start the game.";
  }
}

boardElement.addEventListener("pointerdown", event => {
  const cell = event.target.closest(".tile");
  if (!cell || cell.classList.contains("empty") || isSolved()) return;

  pointerStart = {
    index: Array.prototype.indexOf.call(boardElement.children, cell),
    x: event.clientX,
    y: event.clientY
  };
});

boardElement.addEventListener("pointerup", event => {
  if (!pointerStart) return;

  const dx = event.clientX - pointerStart.x;
  const dy = event.clientY - pointerStart.y;
  const start = pointerStart;
  pointerStart = null;

  // A swipe attempts to move the touched tile. Taps use the click handler.
  if (Math.hypot(dx, dy) > 12) {
    event.preventDefault();
    moveTile(start.index);
  }
});

boardElement.addEventListener("pointercancel", () => {
  pointerStart = null;
});

document.querySelector("#new-game").addEventListener("click", newGame);

languageElement.addEventListener("change", event => {
  language = event.target.value;

  try {
    localStorage.setItem("puzzle-language", language);
  } catch (_) {
    // The selected language still applies for this page session.
  }

  applyLanguage();
});

applyLanguage();
newGame();
