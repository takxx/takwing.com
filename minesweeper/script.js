import {
  getTranslations,
  resolveLanguage,
  saveLanguage
} from "./lang.js";

const boardEl = document.querySelector("#board");
const sizeEl = document.querySelector("#size");
const languageEl = document.querySelector("#language");
const minesLeftEl = document.querySelector("#mines-left");
const timerEl = document.querySelector("#timer");
const statusEl = document.querySelector("#status");
const flagModeButton = document.querySelector("#flag-mode");

let language = resolveLanguage();
let text = getTranslations(language);
let rows;
let cols;
let mineTotal;
let cells;
let started = false;
let ended = false;
let gameWon = false;
let flagMode = false;
let startedAt = 0;
let timerId = null;
let statusKey = "intro";
let statusArgs = {};

// Capture the orientation at startup. Later size changes use the same
// portrait/landscape layout; rotating the device takes effect after reload.
const portraitAtLoad = window.innerHeight > window.innerWidth;

function translate(key, args = {}) {
  return text[key].replace(/\{(\w+)\}/g, (_, name) => args[name] ?? "");
}

function setStatus(key, args = {}) {
  statusKey = key;
  statusArgs = args;
  statusEl.textContent = translate(key, args);
}

function applyLanguage() {
  text = getTranslations(language);
  document.documentElement.lang = text.documentLang;
  document.title = text.pageTitle;

  document.querySelector("#title").textContent = text.pageTitle;
  document.querySelector("#size-label").textContent = text.boardLabel;
  document.querySelector("#language-label").textContent = text.languageLabel;
  document.querySelector("#small-option").textContent = text.small;
  document.querySelector("#medium-option").textContent = text.medium;
  document.querySelector("#large-option").textContent = text.large;
  document.querySelector("#new-game").textContent = text.newGame;
  languageEl.value = language;

  setStatus(statusKey, statusArgs);
  updateMineCounter();
  updateTimer();
  updateFlagModeButton();
  render();
}

function newGame() {
  const [baseRows, baseCols, selectedMineTotal] =
    sizeEl.value.split(",").map(Number);

  [rows, cols] = portraitAtLoad
    ? [baseCols, baseRows]
    : [baseRows, baseCols];

  mineTotal = selectedMineTotal;

  cells = Array.from({ length: rows * cols }, (_, id) => ({
    id,
    row: Math.floor(id / cols),
    col: id % cols,
    mine: false,
    revealed: false,
    flagged: false,
    count: 0,
    hit: false
  }));

  started = false;
  ended = false;
  gameWon = false;
  flagMode = false;
  startedAt = 0;

  clearInterval(timerId);
  timerId = null;

  setStatus("intro");
  flagModeButton.disabled = false;
  updateFlagModeButton();
  updateMineCounter();
  resizeHexes();
  render();
}

function neighbors(cell) {
  const offsets = cell.row % 2 === 0
    ? [
        [0, -1], [0, 1],
        [-1, -1], [-1, 0],
        [1, -1], [1, 0]
      ]
    : [
        [0, -1], [0, 1],
        [-1, 0], [-1, 1],
        [1, 0], [1, 1]
      ];

  return offsets
    .map(([dr, dc]) => {
      const row = cell.row + dr;
      const col = cell.col + dc;

      if (row < 0 || row >= rows || col < 0 || col >= cols) {
        return null;
      }

      return cells[row * cols + col];
    })
    .filter(Boolean);
}

function placeMines(firstCell) {
  const candidates = cells.filter(cell => cell !== firstCell);

  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  for (let i = 0; i < mineTotal; i++) {
    candidates[i].mine = true;
  }

  for (const cell of cells) {
    cell.count = cell.mine
      ? 0
      : neighbors(cell).filter(neighbor => neighbor.mine).length;
  }
}

function updateTimer() {
  if (started && !ended) {
    const seconds = Math.floor((Date.now() - startedAt) / 1000);
    timerEl.textContent = translate("time", { seconds });
  } else {
    timerEl.textContent = translate("time", {
      seconds: started ? Math.floor((Date.now() - startedAt) / 1000) : 0
    });
  }
}

function reveal(cell) {
  if (ended || cell.revealed || cell.flagged) return;

  if (!started) {
    started = true;
    startedAt = Date.now();
    placeMines(cell);
    timerId = setInterval(updateTimer, 250);
    setStatus("findMines");
  }

  if (cell.mine) {
    cell.hit = true;
    finishGame(false);
    return;
  }

  const queue = [cell];
  let index = 0;

  while (index < queue.length) {
    const current = queue[index++];

    if (current.revealed || current.flagged || current.mine) continue;

    current.revealed = true;

    if (current.count === 0) {
      for (const neighbor of neighbors(current)) {
        if (!neighbor.revealed && !neighbor.flagged && !neighbor.mine) {
          queue.push(neighbor);
        }
      }
    }
  }

  render();
  checkWin();
}

function toggleFlag(cell) {
  if (ended || cell.revealed) return;

  if (!cell.flagged) {
    const flagCount = cells.filter(item => item.flagged).length;
    if (flagCount >= mineTotal) return;
  }

  cell.flagged = !cell.flagged;
  updateMineCounter();
  render();
}

function checkWin() {
  const allSafeCellsRevealed = cells
    .filter(cell => !cell.mine)
    .every(cell => cell.revealed);

  if (allSafeCellsRevealed) {
    finishGame(true);
  }
}

function finishGame(won) {
  ended = true;
  gameWon = won;
  clearInterval(timerId);
  updateTimer();

  for (const cell of cells) {
    if (cell.mine) cell.revealed = true;
  }

  flagMode = false;
  flagModeButton.disabled = true;
  updateFlagModeButton();
  setStatus(won ? "won" : "lost");
  render();
  updateMineCounter();
}

function updateMineCounter() {
  const flags = cells ? cells.filter(cell => cell.flagged).length : 0;
  minesLeftEl.textContent = translate("minesLeft", {
    count: mineTotal - flags
  });
}

function updateFlagModeButton() {
  flagModeButton.setAttribute("aria-pressed", String(flagMode));
  flagModeButton.textContent = flagMode ? text.flagOn : text.flagOff;
}

let hexWidth = 40;
let hexHeight = 46.15; // proportion for pointy-topped hexes (width * 2/sqrt(3) approx or ratio)

function resizeHexes() {
  if (!cols) return;

  const maxWidth = window.innerWidth <= 600 ? 44 : 52;
  const availableWidth = Math.max(0, window.innerWidth - 24);
  const fittedWidth = availableWidth / (cols + 0.5);
  hexWidth = Math.min(maxWidth, Math.max(30, fittedWidth));
  hexHeight = hexWidth * (60 / 52);

  // Set total SVG dimensions so it scales and scrolls properly
  const totalWidth = (cols + 0.5) * hexWidth;
  const totalHeight = rows * (hexHeight * 0.75) + (hexHeight * 0.25);
  
  boardEl.setAttribute("width", totalWidth);
  boardEl.setAttribute("height", totalHeight);
}

// Helper to generate the polygon points for a pointy-topped hexagon
function getHexPoints(x, y, w, h) {
  const hw = w / 2;
  const hh = h / 2;
  // Pointy-topped vertices: top, top-right, bottom-right, bottom, bottom-left, top-left
  return `
    ${x + hw},${y}
    ${x + w},${y + hh * 0.5}
    ${x + w},${y + hh * 1.5}
    ${x + hw},${y + h}
    ${x},${y + hh * 1.5}
    ${x},${y + hh * 0.5}
  `;
}

let hoveredCellId = null;

function render() {
  if (!cells) return;

  boardEl.replaceChildren();
  boardEl.setAttribute("aria-label", text.boardAria);

  // Paint opened cells first and unopened cells afterward. SVG paints later
  // elements on top, so unopened borders take precedence at shared edges.
  const paintPriority = cell => {
    if (ended && cell.mine) return 2; // mine-win / mine-lost: above other cells
    return cell.revealed ? 0 : 1;    // unopened cells above ordinary opened cells
  };
	
  const orderedCells = [...cells].sort(
    (a, b) => paintPriority(a) - paintPriority(b) || a.id - b.id
  );

  const groups = new Map();

  for (const cell of orderedCells) {
    const row = cell.row;
    const col = cell.col;
    const x = col * hexWidth + (row % 2 === 1 ? hexWidth * 0.5 : 0);
    const y = row * (hexHeight * 0.75);

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "hex-group");
    g.setAttribute("transform", `translate(${x}, ${y})`);
    g.setAttribute("role", "button");

    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    polygon.setAttribute("points", getHexPoints(0, 0, hexWidth, hexHeight));
    polygon.setAttribute("class", "hex");

    let content = "";
    let label = translate("cellHidden", { row: row + 1, col: col + 1 });
    let extraClass = "";

    if (cell.revealed) {
      extraClass = "revealed";

      if (cell.mine) {
        if (cell.hit) {
          content = "💥";
          extraClass += " mine-hit";
          label = translate("cellExploded", { row: row + 1, col: col + 1 });
        } else {
          content = "💣";
          extraClass += gameWon ? " mine-win" : " mine-lost";
          label = translate("cellMine", { row: row + 1, col: col + 1 });
        }
      } else if (cell.count > 0) {
        content = String(cell.count);
        polygon.dataset.number = cell.count;
        label = translate("cellAdjacent", {
          row: row + 1,
          col: col + 1,
          count: cell.count
        });
      } else {
        label = translate("cellEmpty", { row: row + 1, col: col + 1 });
      }
    } else if (cell.flagged) {
      extraClass = "flagged";
      content = "🚩";
      label = translate("cellFlagged", { row: row + 1, col: col + 1 });
    }

    if (extraClass) {
      polygon.setAttribute("class", `hex ${extraClass}`);
    }

    g.setAttribute("aria-label", label);
    g.append(polygon);

    if (content) {
      const textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
      textEl.textContent = content;
      textEl.setAttribute("x", hexWidth / 2);
      textEl.setAttribute("y", hexHeight / 2);
      textEl.setAttribute("dominant-baseline", "central");
      textEl.setAttribute("text-anchor", "middle");
      textEl.setAttribute("class", "hex-text");
      g.append(textEl);
    }

    g.addEventListener("pointerenter", () => {
      hoveredCellId = cell.id;
      reorderGroups();
    });

    g.addEventListener("pointerleave", () => {
      if (hoveredCellId === cell.id) {
        hoveredCellId = null;
        reorderGroups();
      }
    });

    g.addEventListener("click", () => {
      if (flagMode) {
        toggleFlag(cell);
      } else {
        reveal(cell);
      }
    });

    g.addEventListener("contextmenu", event => {
      event.preventDefault();
      toggleFlag(cell);
    });

    groups.set(cell.id, g);
    boardEl.append(g);
  }

  function reorderGroups() {
    // Restore the base order: revealed first, unrevealed afterward.
    for (const cell of orderedCells) {
      if (cell.id !== hoveredCellId) {
        boardEl.append(groups.get(cell.id));
      }
    }

    // The hovered cell is always the topmost painted cell.
    if (hoveredCellId !== null) {
      const hoveredGroup = groups.get(hoveredCellId);
      if (hoveredGroup) boardEl.append(hoveredGroup);
    }
  }
}

document.querySelector("#new-game").addEventListener("click", newGame);
sizeEl.addEventListener("change", newGame);

flagModeButton.addEventListener("click", () => {
  if (ended) return;

  flagMode = !flagMode;
  updateFlagModeButton();
  setStatus(flagMode ? "flagModeOnStatus" : "flagModeOffStatus");
});

languageEl.addEventListener("change", () => {
  language = languageEl.value;
  saveLanguage(language);
  applyLanguage();
});

window.addEventListener("resize", () => {
  resizeHexes();
  render();
});

newGame();
applyLanguage();
