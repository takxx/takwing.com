"use strict";

const translations = {
  en: {
    title: "Mahjong Solitaire",
    newGame: "New Game",
    restart: "Restart",
    undo: "Undo",
    hint: "Hint",
    language: "Language",
    remaining: "Remaining:",
    selectMatch: "Select a matching tile.",
    notMatch: "Those tiles do not match.",
    noHint: "No matching moves available.",
    won: "You won!"
  },
  es: {
    title: "Solitario de Mahjong",
    newGame: "Nueva partida",
    restart: "Reiniciar",
    undo: "Deshacer",
    hint: "Pista",
    language: "Idioma",
    remaining: "Restantes:",
    selectMatch: "Selecciona una ficha que coincida.",
    notMatch: "Esas fichas no coinciden.",
    noHint: "No hay movimientos coincidentes.",
    won: "¡Has ganado!"
  },
  "zh-Hant": {
    title: "四川省",
    newGame: "新遊戲",
    restart: "重新開始",
    undo: "悔棋",
    hint: "提示",
    language: "語言",
    remaining: "剩餘：",
    selectMatch: "請選擇相同的牌。",
    notMatch: "這兩張牌不相同。",
    noHint: "沒有可配對的牌。",
    won: "你贏了！"
  }
};

const board = document.getElementById("gameBoard");
const boardScaler = document.getElementById("boardScaler");
const message = document.getElementById("message");
const remainingCount = document.getElementById("remainingCount");
const newGameButton = document.getElementById("newGameBtn");
const restartButton = document.getElementById("restartBtn");
const undoButton = document.getElementById("undoBtn");
const hintButton = document.getElementById("hintBtn");
const titleElement = document.getElementById("gameTitle");
const languageLabel = document.getElementById("languageLabel");
const remainingLabel = document.getElementById("remainingLabel");
const languageSelect = document.getElementById("languageSelect");

const requiredElements = [
  board,
  boardScaler,
  message,
  remainingCount,
  newGameButton,
  restartButton,
  undoButton,
  hintButton,
  titleElement,
  languageLabel,
  remainingLabel,
  languageSelect
];

if (requiredElements.some(element => !element)) {
  throw new Error(
    "Mahjong Solitaire: one or more required HTML elements are missing."
  );
}

const UNIT_X = 58;
const UNIT_Y = 78;
const TILE_SPRITE_URL = "mahjong.svg";
const WIDE_BOARD_WIDTH = 850;
const WIDE_BOARD_HEIGHT = 650;
const NARROW_BOARD_WIDTH = 500;
const NARROW_BOARD_HEIGHT = 990;
const NARROW_LAYOUT_BREAKPOINT = 700;

let currentLanguage = "en";
let currentBoardMode = "wide";
let tiles = [];
let startingTiles = [];
let undoStack = [];
let selectedTileId = null;
let hintedTileIds = new Set();
let hintTimeout = null;
let resizeTimeout = null;

const tileElements = new Map();

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

function normalizeLanguage(language) {
  if (!language) return null;

  const normalized = language.trim().toLowerCase();

  if (
    normalized === "zh" ||
    normalized === "zh-hant" ||
    normalized.startsWith("zh-tw") ||
    normalized.startsWith("zh-hk") ||
    normalized.startsWith("zh-mo")
  ) {
    return "zh-Hant";
  }

  if (normalized === "es" || normalized.startsWith("es-")) return "es";
  if (normalized === "en" || normalized.startsWith("en-")) return "en";

  return null;
}

function getQueryLanguage() {
  const queryLanguage = new URLSearchParams(window.location.search).get("lang");
  return normalizeLanguage(queryLanguage);
}

function getBrowserLanguage() {
  const browserLanguages =
    Array.isArray(navigator.languages) && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language];

  for (const language of browserLanguages) {
    const normalizedLanguage = normalizeLanguage(language);
    if (normalizedLanguage) return normalizedLanguage;
  }

  return "en";
}

function getSavedLanguage() {
  try {
    const savedLanguage = localStorage.getItem("mahjong-language");
    if (savedLanguage && Object.hasOwn(translations, savedLanguage)) {
      return savedLanguage;
    }
  } catch {
    // Storage can be unavailable; use the browser language instead.
  }

  return getBrowserLanguage();
}

function getInitialLanguage() {
  return getQueryLanguage() || getSavedLanguage();
}

function translate(key) {
  const selectedTranslations = translations[currentLanguage];

  if (selectedTranslations && Object.hasOwn(selectedTranslations, key)) {
    return selectedTranslations[key];
  }

  return translations.en[key] || key;
}

function updateLanguage() {
  document.documentElement.lang = currentLanguage;
  titleElement.textContent = translate("title");
  newGameButton.textContent = translate("newGame");
  restartButton.textContent = translate("restart");
  undoButton.textContent = translate("undo");
  languageLabel.textContent = translate("language");
  remainingLabel.textContent = translate("remaining");
  hintButton.textContent = translate("hint");
  languageSelect.value = currentLanguage;

  if (message.dataset.state === "select") {
    message.textContent = translate("selectMatch");
  } else if (message.dataset.state === "wrong") {
    message.textContent =
      message.dataset.messageKey === "noHint"
        ? translate("noHint")
        : translate("notMatch");
  } else if (message.dataset.state === "won") {
    message.textContent = translate("won");
  }
}

languageSelect.addEventListener("change", event => {
  currentLanguage = normalizeLanguage(event.target.value) || "en";

  try {
    localStorage.setItem("mahjong-language", currentLanguage);
  } catch {
    // Language selection still works for this page session.
  }

  updateLanguage();
});

function tileSpriteHref(symbol) {
  return `${TILE_SPRITE_URL}#${encodeURIComponent(symbol)}`;
}

function shuffle(array) {
  const result = [...array];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [
      result[randomIndex],
      result[index]
    ];
  }

  return result;
}

function cloneTiles(source) {
  return source.map(tile => ({ ...tile }));
}

function showMessage(text = "", state = "", messageKey = "") {
  message.textContent = text;
  message.dataset.state = state;
  message.dataset.messageKey = messageKey;
}

function createLayoutPosition(id, x, y, z) {
  return {
    id,
    x,
    y,
    z,
    group: "",
    symbol: "",
    matchKey: "",
    removed: false
  };
}

function addLayoutLayer(layout, idStart, width, height, z, offsetX, offsetY) {
  let id = idStart;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      layout.push(
        createLayoutPosition(id++, offsetX + x, offsetY + y, z)
      );
    }
  }

  return id;
}

function createWideLayout() {
  const layout = [];
  let id = 0;

  id = addLayoutLayer(layout, id, 12, 6, 0, 1, 1);
  id = addLayoutLayer(layout, id, 9, 4, 1, 2.5, 2);
  id = addLayoutLayer(layout, id, 6, 4, 2, 4, 2);
  addLayoutLayer(layout, id, 3, 4, 3, 5.5, 2);

  return layout;
}

function createNarrowLayout() {
  const layout = [];
  let id = 0;

  id = addLayoutLayer(layout, id, 8, 11, 0, 0, 0);
  id = addLayoutLayer(layout, id, 6, 6, 1, 1, 2);
  addLayoutLayer(layout, id, 4, 5, 2, 2, 3);

  return layout;
}

function createLayoutForMode(mode) {
  return mode === "narrow" ? createNarrowLayout() : createWideLayout();
}

function createPairPool() {
  const pairs = [];

  for (const [group, symbol, matchKey] of tileDefinitions) {
    if (group !== "seasons" && group !== "flowers") {
      const tile = { group, symbol, matchKey };
      pairs.push([{ ...tile }, { ...tile }]);
      pairs.push([{ ...tile }, { ...tile }]);
    }
  }

  const seasons = tileDefinitions
    .filter(([group]) => group === "seasons")
    .map(([group, symbol, matchKey]) => ({ group, symbol, matchKey }));

  const flowers = tileDefinitions
    .filter(([group]) => group === "flowers")
    .map(([group, symbol, matchKey]) => ({ group, symbol, matchKey }));

  pairs.push(
    [seasons[0], seasons[1]],
    [seasons[2], seasons[3]],
    [flowers[0], flowers[1]],
    [flowers[2], flowers[3]]
  );

  return shuffle(pairs);
}

function overlaps(first, second) {
  return (
    first.x < second.x + 1 &&
    first.x + 1 > second.x &&
    first.y < second.y + 1 &&
    first.y + 1 > second.y
  );
}

function overlapsVertically(first, second) {
  return first.y < second.y + 1 && first.y + 1 > second.y;
}

function isFree(tile, tileList) {
  if (!tile || tile.removed) return false;

  const covered = tileList.some(
    other =>
      !other.removed &&
      other.id !== tile.id &&
      other.z > tile.z &&
      overlaps(tile, other)
  );

  if (covered) return false;

  const leftBlocked = tileList.some(
    other =>
      !other.removed &&
      other.id !== tile.id &&
      other.z === tile.z &&
      overlapsVertically(tile, other) &&
      other.x + 1 <= tile.x &&
      other.x + 1 > tile.x - 2
  );

  const rightBlocked = tileList.some(
    other =>
      !other.removed &&
      other.id !== tile.id &&
      other.z === tile.z &&
      overlapsVertically(tile, other) &&
      other.x >= tile.x + 1 &&
      other.x < tile.x + 3
  );

  return !leftBlocked || !rightBlocked;
}

function createSolvableDeal(mode) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const layout = createLayoutForMode(mode);
    const pairs = createPairPool();
    const activeIds = new Set(layout.map(tile => tile.id));
    let failed = false;

    while (activeIds.size > 0) {
      const activeTiles = layout.filter(tile => activeIds.has(tile.id));
      const freeTiles = activeTiles.filter(tile => isFree(tile, activeTiles));

      if (freeTiles.length < 2 || pairs.length === 0) {
        failed = true;
        break;
      }

      const first = freeTiles[Math.floor(Math.random() * freeTiles.length)];
      const alternatives = freeTiles.filter(tile => tile.id !== first.id);
      const second =
        alternatives[Math.floor(Math.random() * alternatives.length)];
      const pair = pairs.pop();

      Object.assign(first, pair[0]);
      Object.assign(second, pair[1]);

      activeIds.delete(first.id);
      activeIds.delete(second.id);
    }

    if (!failed) return layout;
  }

  const fallback = createLayoutForMode(mode);
  const physicalTiles = [];

  for (const [group, symbol, matchKey] of tileDefinitions) {
    const copies = group === "seasons" || group === "flowers" ? 1 : 4;

    for (let index = 0; index < copies; index += 1) {
      physicalTiles.push({ group, symbol, matchKey });
    }
  }

  shuffle(physicalTiles).forEach((tile, index) => {
    Object.assign(fallback[index], tile);
  });

  return fallback;
}

function getBoardDimensions() {
  return currentBoardMode === "narrow"
    ? { width: NARROW_BOARD_WIDTH, height: NARROW_BOARD_HEIGHT }
    : { width: WIDE_BOARD_WIDTH, height: WIDE_BOARD_HEIGHT };
}

function updateBoardScale() {
  const dimensions = getBoardDimensions();
  const availableWidth = Math.max(0, document.documentElement.clientWidth - 40);
  const scale = Math.min(1, availableWidth / dimensions.width);

  board.style.transform = scale < 1 ? `scale(${scale})` : "";
  boardScaler.style.width = `${Math.ceil(dimensions.width * scale)}px`;
  boardScaler.style.height = `${Math.ceil(dimensions.height * scale)}px`;
}

/*
 * Resizing never changes the layout or replaces the game. The layout is
 * selected only when newGame() is explicitly called.
 */
function scheduleScaleUpdate() {
  window.clearTimeout(resizeTimeout);
  resizeTimeout = window.setTimeout(updateBoardScale, 100);
}

window.addEventListener("resize", scheduleScaleUpdate);
window.addEventListener("orientationchange", scheduleScaleUpdate);

function createTileContent(tile) {
  const content = document.createElement("span");
  content.className = "tile-content";

  const tileSvg = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  tileSvg.setAttribute("class", "tile-image");
  tileSvg.setAttribute("aria-hidden", "true");
  tileSvg.setAttribute("focusable", "false");

  const useElement = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "use"
  );
  useElement.setAttribute("href", tileSpriteHref(tile.symbol));

  tileSvg.appendChild(useElement);
  content.appendChild(tileSvg);

  return content;
}

function createTileElement(tile) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = `tile ${tile.group} ${tile.matchKey}`;
  element.appendChild(createTileContent(tile));
  element.setAttribute("aria-label", `${tile.group} ${tile.matchKey}`);
  element.style.left = `${tile.x * UNIT_X + tile.z * 10}px`;
  element.style.top = `${tile.y * UNIT_Y - tile.z * 10}px`;
  element.style.zIndex =
    tile.z * 100000 + Math.round(tile.y * 1000) + Math.round(tile.x);
  element.addEventListener("click", () => selectTile(tile.id));

  tileElements.set(tile.id, element);
  return element;
}

function render() {
  const visibleTiles = tiles.filter(tile => !tile.removed);
  const visibleIds = new Set(visibleTiles.map(tile => tile.id));

  for (const [id, element] of tileElements) {
    if (!visibleIds.has(id)) {
      element.remove();
      tileElements.delete(id);
    }
  }

  for (const tile of visibleTiles) {
    const element = tileElements.get(tile.id) || createTileElement(tile);

    element.classList.toggle("selected", tile.id === selectedTileId);
    element.classList.toggle("hinted", hintedTileIds.has(tile.id));

    if (!element.isConnected) board.appendChild(element);
  }

  remainingCount.textContent = String(visibleTiles.length);
  undoButton.disabled = undoStack.length === 0;
}

function tilesMatch(first, second) {
  if (!first || !second) return false;

  if (first.group === "seasons" && second.group === "seasons") return true;
  if (first.group === "flowers" && second.group === "flowers") return true;

  return first.matchKey === second.matchKey;
}

function clearHintTimer() {
  if (hintTimeout !== null) {
    window.clearTimeout(hintTimeout);
    hintTimeout = null;
  }
}

function selectTile(id) {
  clearHintTimer();
  hintedTileIds.clear();

  const tile = tiles.find(item => item.id === id);
  if (!tile || tile.removed || !isFree(tile, tiles)) return;

  if (selectedTileId !== null) {
    const oldTile = tiles.find(item => item.id === selectedTileId);

    if (!oldTile || oldTile.removed || !isFree(oldTile, tiles)) {
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

  const first = tiles.find(item => item.id === selectedTileId);

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

    if (tiles.every(item => item.removed)) {
      showMessage(translate("won"), "won");
    }

    return;
  }

  selectedTileId = id;
  showMessage(translate("notMatch"), "wrong");
  render();
}

function findHint() {
  const freeTiles = tiles.filter(
    tile => !tile.removed && isFree(tile, tiles)
  );

  for (let firstIndex = 0; firstIndex < freeTiles.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < freeTiles.length;
      secondIndex += 1
    ) {
      const first = freeTiles[firstIndex];
      const second = freeTiles[secondIndex];

      if (tilesMatch(first, second)) return [first, second];
    }
  }

  return null;
}

function showHint() {
  clearHintTimer();
  hintedTileIds.clear();

  const hint = findHint();

  if (!hint) {
    showMessage(translate("noHint"), "wrong", "noHint");
    render();
    return;
  }

  hintedTileIds.add(hint[0].id);
  hintedTileIds.add(hint[1].id);
  showMessage();
  render();

  hintTimeout = window.setTimeout(() => {
    hintedTileIds.clear();
    hintTimeout = null;
    render();
  }, 2000);
}

function newGame() {
  clearHintTimer();

  // Choose the layout once, when a new game is explicitly started.
  currentBoardMode =
    window.innerWidth < NARROW_LAYOUT_BREAKPOINT ? "narrow" : "wide";

  board.classList.toggle("narrow-board", currentBoardMode === "narrow");
  board.classList.toggle("wide-board", currentBoardMode === "wide");

  tiles = createSolvableDeal(currentBoardMode);
  startingTiles = cloneTiles(tiles);
  undoStack = [];
  selectedTileId = null;
  hintedTileIds.clear();
  tileElements.clear();

  board.replaceChildren();
  updateBoardScale();
  showMessage();
  render();
}

function restartGame() {
  if (startingTiles.length === 0) {
    newGame();
    return;
  }

  clearHintTimer();
  tiles = cloneTiles(startingTiles);
  undoStack = [];
  selectedTileId = null;
  hintedTileIds.clear();
  showMessage();
  render();
}

function undoMove() {
  if (undoStack.length === 0) return;

  clearHintTimer();
  tiles = undoStack.pop();
  selectedTileId = null;
  hintedTileIds.clear();
  showMessage();
  render();
}

newGameButton.addEventListener("click", newGame);
restartButton.addEventListener("click", restartGame);
undoButton.addEventListener("click", undoMove);
hintButton.addEventListener("click", showHint);

currentLanguage = getInitialLanguage();
updateLanguage();

newGame();
