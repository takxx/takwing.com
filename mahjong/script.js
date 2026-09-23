"use strict";

/* -----------------------------
   Translations
----------------------------- */

const translations = {
  en: {
    title: "Mahjong Solitaire",
    newGame: "New Game",
    restart: "Restart",
    undo: "Undo",
    language: "Language",
    remaining: "Remaining:",
    selectMatch: "Select a matching tile.",
    notMatch: "Those tiles do not match.",
    won: "You won!"
  },

  es: {
    title: "Solitario de Mahjong",
    newGame: "Nueva partida",
    restart: "Reiniciar",
    undo: "Deshacer",
    language: "Idioma",
    remaining: "Restantes:",
    selectMatch: "Selecciona una ficha que coincida.",
    notMatch: "Esas fichas no coinciden.",
    won: "¡Has ganado!"
  },

  "zh-Hant": {
    title: "四川省",
    newGame: "新遊戲",
    restart: "重新開始",
    undo: "悔棋",
    language: "語言",
    remaining: "剩餘：",
    selectMatch: "請選擇相同的牌。",
    notMatch: "這兩張牌不相同。",
    won: "你贏了！"
  }
};

/* -----------------------------
   DOM elements
----------------------------- */

const board = document.getElementById("gameBoard");
const message = document.getElementById("message");
const remainingCount = document.getElementById("remainingCount");

const newGameButton = document.getElementById("newGameBtn");
const restartButton = document.getElementById("restartBtn");
const undoButton = document.getElementById("undoBtn");

const titleElement = document.getElementById("gameTitle");
const languageLabel = document.getElementById("languageLabel");
const remainingLabel = document.getElementById("remainingLabel");
const languageSelect = document.getElementById("languageSelect");

if (
  !board ||
  !message ||
  !remainingCount ||
  !newGameButton ||
  !restartButton ||
  !undoButton ||
  !titleElement ||
  !languageLabel ||
  !remainingLabel ||
  !languageSelect
) {
  throw new Error(
    "Mahjong Solitaire: one or more required HTML elements are missing."
  );
}

/* -----------------------------
   Game state
----------------------------- */

const UNIT_X = 57;
const UNIT_Y = 77;
const TILE_IMAGE_FOLDER = "";

let currentLanguage = "en";
let tiles = [];
let startingTiles = [];
let undoStack = [];
let selectedTileId = null;

/* -----------------------------
   Tile definitions
----------------------------- */

const tileDefinitions = [
  ["characters", "🀇", "character-1"],
  ["characters", "🀈", "character-2"],
  ["characters", "🀉", "character-3"],
  ["characters", "🀊", "character-4"],
  ["characters", "🀋", "character-5"],
  ["characters", "🀌", "character-6"],
  ["characters", "🀍", "character-7"],
  ["characters", "🀎", "character-8"],
  ["characters", "🀏", "character-9"],

  ["bamboo", "🀐", "bamboo-1"],
  ["bamboo", "🀑", "bamboo-2"],
  ["bamboo", "🀒", "bamboo-3"],
  ["bamboo", "🀓", "bamboo-4"],
  ["bamboo", "🀔", "bamboo-5"],
  ["bamboo", "🀕", "bamboo-6"],
  ["bamboo", "🀖", "bamboo-7"],
  ["bamboo", "🀗", "bamboo-8"],
  ["bamboo", "🀘", "bamboo-9"],

  ["balls", "🀙", "ball-1"],
  ["balls", "🀚", "ball-2"],
  ["balls", "🀛", "ball-3"],
  ["balls", "🀜", "ball-4"],
  ["balls", "🀝", "ball-5"],
  ["balls", "🀞", "ball-6"],
  ["balls", "🀟", "ball-7"],
  ["balls", "🀠", "ball-8"],
  ["balls", "🀡", "ball-9"],

  ["winds", "🀀", "east"],
  ["winds", "🀁", "south"],
  ["winds", "🀂", "west"],
  ["winds", "🀃", "north"],

  ["dragons", "🀄", "red-dragon"],
  ["dragons", "🀅", "green-dragon"],
  ["dragons", "🀆", "white-dragon"],

  ["seasons", "🀢", "spring"],
  ["seasons", "🀣", "summer"],
  ["seasons", "🀤", "autumn"],
  ["seasons", "🀥", "winter"],

  ["flowers", "🀦", "plum"],
  ["flowers", "🀧", "orchid"],
  ["flowers", "🀨", "chrysanthemum"],
  ["flowers", "🀩", "bamboo-flower"]
];

/* -----------------------------
   Utility functions
----------------------------- */

function getSavedLanguage() {
  // English is always the default language.
  const defaultLanguage = "en";

  try {
    const savedLanguage = localStorage.getItem("mahjong-language");

    if (
      savedLanguage &&
      Object.prototype.hasOwnProperty.call(
        translations,
        savedLanguage
      )
    ) {
      return savedLanguage;
    }
  } catch {
    // localStorage may be unavailable.
  }

  return defaultLanguage;
}

function translate(key) {
  return (
    translations[currentLanguage]?.[key] ||
    translations.en[key] ||
    key
  );
}

function shuffle(array) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [result[i], result[j]] = [
      result[j],
      result[i]
    ];
  }

  return result;
}

function cloneTiles(source) {
  return source.map(tile => ({ ...tile }));
}

function showMessage(text = "", state = "") {
  message.textContent = text;
  message.dataset.state = state;
}

/* -----------------------------
   Layout
----------------------------- */

function createLayout() {
  const layout = [];
  let id = 0;

  function addLayer(width, height, z, offsetX, offsetY) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        layout.push({
          id: id++,
          x: offsetX + x,
          y: offsetY + y,
          z,
          group: "",
          symbol: "",
          matchKey: "",
          removed: false
        });
      }
    }
  }

  addLayer(12, 6, 0, 1, 1);
  addLayer(9, 4, 1, 2.5, 2);
  addLayer(6, 4, 2, 4, 2);
  addLayer(3, 4, 3, 5.5, 2);

  return layout;
}

/* -----------------------------
   Tile generation
----------------------------- */

function createPhysicalTiles() {
  const physicalTiles = [];

  for (const [group, symbol, matchKey] of tileDefinitions) {
    const copies =
      group === "seasons" || group === "flowers"
        ? 1
        : 4;

    for (let i = 0; i < copies; i++) {
      physicalTiles.push({
        group,
        symbol,
        matchKey
      });
    }
  }

  return physicalTiles;
}

function createPairPool() {
  const pairs = [];

  for (const [group, symbol, matchKey] of tileDefinitions) {
    if (group !== "seasons" && group !== "flowers") {
      for (let i = 0; i < 2; i++) {
        pairs.push([
          { group, symbol, matchKey },
          { group, symbol, matchKey }
        ]);
      }
    }
  }

  const seasons = tileDefinitions
    .filter(tile => tile[0] === "seasons")
    .map(([group, symbol, matchKey]) => ({
      group,
      symbol,
      matchKey
    }));

  const flowers = tileDefinitions
    .filter(tile => tile[0] === "flowers")
    .map(([group, symbol, matchKey]) => ({
      group,
      symbol,
      matchKey
    }));

  pairs.push(
    [seasons[0], seasons[1]],
    [seasons[2], seasons[3]],
    [flowers[0], flowers[1]],
    [flowers[2], flowers[3]]
  );

  return shuffle(pairs);
}

/* -----------------------------
   Tile blocking rules
----------------------------- */

function overlaps(a, b) {
  return (
    a.x < b.x + 1 &&
    a.x + 1 > b.x &&
    a.y < b.y + 1 &&
    a.y + 1 > b.y
  );
}

function overlapsVertically(a, b) {
  return (
    a.y < b.y + 1 &&
    a.y + 1 > b.y
  );
}

function isFree(tile, tileList) {
  if (!tile || tile.removed) {
    return false;
  }

  const covered = tileList.some(other => {
    return (
      !other.removed &&
      other.id !== tile.id &&
      other.z > tile.z &&
      overlaps(tile, other)
    );
  });

  if (covered) {
    return false;
  }

  const leftBlocked = tileList.some(other => {
    return (
      !other.removed &&
      other.id !== tile.id &&
      other.z === tile.z &&
      overlapsVertically(tile, other) &&
      other.x + 1 <= tile.x &&
      other.x + 1 > tile.x - 2
    );
  });

  const rightBlocked = tileList.some(other => {
    return (
      !other.removed &&
      other.id !== tile.id &&
      other.z === tile.z &&
      overlapsVertically(tile, other) &&
      other.x >= tile.x + 1 &&
      other.x < tile.x + 3
    );
  });

  return !leftBlocked || !rightBlocked;
}

/* -----------------------------
   Solvable game generation
----------------------------- */

function createSolvableDeal() {
  for (let attempt = 0; attempt < 200; attempt++) {
    const layout = createLayout();
    const pairs = createPairPool();

    const activeIds = new Set(
      layout.map(tile => tile.id)
    );

    let failed = false;

    while (activeIds.size > 0) {
      const activeTiles = layout.filter(tile =>
        activeIds.has(tile.id)
      );

      const freeTiles = activeTiles.filter(tile =>
        isFree(tile, activeTiles)
      );

      if (freeTiles.length < 2 || pairs.length === 0) {
        failed = true;
        break;
      }

      const first =
        freeTiles[
          Math.floor(Math.random() * freeTiles.length)
        ];

      const alternatives = freeTiles.filter(
        tile => tile.id !== first.id
      );

      const second =
        alternatives[
          Math.floor(Math.random() * alternatives.length)
        ];

      const pair = pairs.pop();

      Object.assign(first, pair[0]);
      Object.assign(second, pair[1]);

      activeIds.delete(first.id);
      activeIds.delete(second.id);
    }

    if (!failed) {
      return layout;
    }
  }

  const fallback = createLayout();
  const randomTiles = shuffle(createPhysicalTiles());

  fallback.forEach((tile, index) => {
    Object.assign(tile, randomTiles[index]);
  });

  return fallback;
}

/* -----------------------------
   Tile image rendering
----------------------------- */

function createTileContent(tile) {
  const content = document.createElement("span");
  content.className = "tile-content";

  const fallback = document.createElement("span");
  fallback.className = "tile-fallback";
  fallback.textContent = tile.symbol;
  fallback.setAttribute("aria-hidden", "true");

  const image = document.createElement("img");
  image.className = "tile-image";
  image.alt = "";
  image.hidden = true;
  image.setAttribute("aria-hidden", "true");

  image.src =
    `${TILE_IMAGE_FOLDER}${encodeURIComponent(tile.symbol)}.webp`;

  image.addEventListener("load", () => {
    fallback.hidden = true;
    image.hidden = false;
  });

  image.addEventListener("error", () => {
    image.hidden = true;
    fallback.hidden = false;
  });

  content.appendChild(fallback);
  content.appendChild(image);

  return content;
}

/* -----------------------------
   Rendering
----------------------------- */

function render() {
  board.replaceChildren();

  const visibleTiles = tiles
    .filter(tile => !tile.removed)
    .sort((a, b) => {
      if (a.z !== b.z) {
        return a.z - b.z;
      }

      if (a.y !== b.y) {
        return a.y - b.y;
      }

      return a.x - b.x;
    });

  for (const tile of visibleTiles) {
    const element = document.createElement("button");

    element.type = "button";

    element.className = [
      "tile",
      tile.group,
      tile.matchKey,
      tile.id === selectedTileId ? "selected" : ""
    ]
      .filter(Boolean)
      .join(" ");

    element.appendChild(createTileContent(tile));

    element.setAttribute(
      "aria-label",
      `${tile.group} ${tile.matchKey}`
    );

    element.style.left =
      `${tile.x * UNIT_X + tile.z * 4}px`;

    element.style.top =
      `${tile.y * UNIT_Y - tile.z * 4}px`;

    element.style.zIndex =
      tile.z * 100000 +
      Math.round(tile.y * 1000) +
      Math.round(tile.x);

    element.addEventListener("click", () => {
      selectTile(tile.id);
    });

    board.appendChild(element);
  }

  remainingCount.textContent = tiles.filter(
    tile => !tile.removed
  ).length;

  undoButton.disabled = undoStack.length === 0;
}

/* -----------------------------
   Matching
----------------------------- */

function tilesMatch(first, second) {
  if (!first || !second) {
    return false;
  }

  if (
    first.group === "seasons" &&
    second.group === "seasons"
  ) {
    return true;
  }

  if (
    first.group === "flowers" &&
    second.group === "flowers"
  ) {
    return true;
  }

  return first.matchKey === second.matchKey;
}

/* -----------------------------
   Game interaction
----------------------------- */

function selectTile(id) {
  const tile = tiles.find(item => item.id === id);

  if (
    !tile ||
    tile.removed ||
    !isFree(tile, tiles)
  ) {
    return;
  }

  if (selectedTileId !== null) {
    const oldSelectedTile = tiles.find(
      item => item.id === selectedTileId
    );

    if (
      !oldSelectedTile ||
      oldSelectedTile.removed ||
      !isFree(oldSelectedTile, tiles)
    ) {
      selectedTileId = null;
    }
  }

  if (selectedTileId === null) {
    selectedTileId = id;
    showMessage(translate("selectMatch"), "select");
    render();
    return;
  }

  if (selectedTileId === id) {
    selectedTileId = null;
    showMessage();
    render();
    return;
  }

  const first = tiles.find(
    item => item.id === selectedTileId
  );

  if (!first) {
    selectedTileId = null;
    showMessage();
    render();
    return;
  }

  if (tilesMatch(first, tile)) {
    undoStack.push(cloneTiles(tiles));

    first.removed = true;
    tile.removed = true;

    selectedTileId = null;
    showMessage();
    render();

    if (tiles.every(tileItem => tileItem.removed)) {
      showMessage(translate("won"), "won");
    }

    return;
  }

  selectedTileId = id;
  showMessage(translate("notMatch"), "wrong");
  render();
}

/* -----------------------------
   Game controls
----------------------------- */

function newGame() {
  tiles = createSolvableDeal();
  startingTiles = cloneTiles(tiles);
  undoStack = [];
  selectedTileId = null;

  showMessage();
  render();
}

function restartGame() {
  if (startingTiles.length === 0) {
    newGame();
    return;
  }

  tiles = cloneTiles(startingTiles);
  undoStack = [];
  selectedTileId = null;

  showMessage();
  render();
}

function undoMove() {
  if (undoStack.length === 0) {
    return;
  }

  tiles = undoStack.pop();
  selectedTileId = null;

  showMessage();
  render();
}

/* -----------------------------
   Language
----------------------------- */

function updateLanguage() {
  document.documentElement.lang = currentLanguage;

  titleElement.textContent = translate("title");
  newGameButton.textContent = translate("newGame");
  restartButton.textContent = translate("restart");
  undoButton.textContent = translate("undo");
  languageLabel.textContent = translate("language");
  remainingLabel.textContent = translate("remaining");

  languageSelect.value = currentLanguage;

  const state = message.dataset.state;

  if (state === "select") {
    message.textContent = translate("selectMatch");
  } else if (state === "wrong") {
    message.textContent = translate("notMatch");
  } else if (state === "won") {
    message.textContent = translate("won");
  }
}

languageSelect.addEventListener("change", event => {
  const selectedLanguage = event.target.value;

  if (!translations[selectedLanguage]) {
    currentLanguage = "en";
  } else {
    currentLanguage = selectedLanguage;
  }

  try {
    localStorage.setItem(
      "mahjong-language",
      currentLanguage
    );
  } catch {
    // Continue if localStorage is unavailable.
  }

  updateLanguage();
});

/* -----------------------------
   Event listeners
----------------------------- */

newGameButton.addEventListener("click", newGame);
restartButton.addEventListener("click", restartGame);
undoButton.addEventListener("click", undoMove);

/* -----------------------------
   Start game
----------------------------- */

// English is the default unless the user previously selected
// another supported language.
currentLanguage = getSavedLanguage();

updateLanguage();
newGame();
