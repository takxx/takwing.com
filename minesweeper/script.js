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

function resizeHexes() {
  if (!cols) return;

  const maxWidth = window.innerWidth <= 600 ? 44 : 52;
  const availableWidth = Math.max(0, window.innerWidth - 24);
  const fittedWidth = availableWidth / (cols + 0.5);
  const width = Math.min(maxWidth, Math.max(30, fittedWidth));
  const height = width * (60 / 52);

  document.documentElement.style.setProperty("--hex-w", `${width}px`);
  document.documentElement.style.setProperty("--hex-h", `${height}px`);
  document.documentElement.style.setProperty("--row-step", `${height * 0.75}px`);
  document.documentElement.style.setProperty("--row-offset", `${width * 0.5}px`);
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

function render() {
  if (!cells) return;

  boardEl.replaceChildren();
  boardEl.setAttribute("aria-label", text.boardAria);

  for (let row = 0; row < rows; row++) {
    const rowEl = document.createElement("div");
    rowEl.className = `row${row % 2 ? " odd" : ""}`;

    for (let col = 0; col < cols; col++) {
      const cell = cells[row * cols + col];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "hex";

      let label = translate("cellHidden", {
        row: row + 1,
        col: col + 1
      });

      if (cell.revealed) {
        button.classList.add("revealed");

        if (cell.mine) {
          if (cell.hit) {
            button.textContent = "💥";
            button.classList.add("mine-hit");
            label = translate("cellExploded", {
              row: row + 1,
              col: col + 1
            });
          } else {
            button.textContent = "💣";
            button.classList.add(gameWon ? "mine-win" : "mine-lost");
            label = translate("cellMine", {
              row: row + 1,
              col: col + 1
            });
          }
        } else if (cell.count > 0) {
          button.textContent = String(cell.count);
          button.dataset.number = cell.count;
          label = translate("cellAdjacent", {
            row: row + 1,
            col: col + 1,
            count: cell.count
          });
        } else {
          label = translate("cellEmpty", {
            row: row + 1,
            col: col + 1
          });
        }
      } else if (cell.flagged) {
        button.classList.add("flagged");
        button.textContent = "🚩";
        label = translate("cellFlagged", {
          row: row + 1,
          col: col + 1
        });
      }

      button.setAttribute("aria-label", label);

      button.addEventListener("click", () => {
        if (flagMode) {
          toggleFlag(cell);
        } else {
          reveal(cell);
        }
      });

      button.addEventListener("contextmenu", event => {
        event.preventDefault();
        toggleFlag(cell);
      });

      rowEl.append(button);
    }

    boardEl.append(rowEl);
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

window.addEventListener("resize", resizeHexes);

newGame();
applyLanguage();
