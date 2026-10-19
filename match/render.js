import { translate } from "./lang.js";

let boardElement = null;
let scoreElement = null;
let movesElement = null;
let messageElement = null;
let timerWrap = null;
let timerElement = null;
let bestScoreElement = null;

export function initRender(refs) {
  boardElement = refs.boardElement;
  scoreElement = refs.scoreElement;
  movesElement = refs.movesElement;
  messageElement = refs.messageElement;
  timerWrap = refs.timerWrap;
  timerElement = refs.timerElement;
  bestScoreElement = refs.bestScoreElement;
}

export function setBoardSize(rows, cols) {
  document.documentElement.style.setProperty("--rows", String(rows));
  document.documentElement.style.setProperty("--cols", String(cols));
}

export function showMessage(key, ...args) {
  if (!messageElement) {
    return;
  }

  messageElement.textContent = translate(key, ...args);
}

export function showMessageText(text) {
  if (messageElement) {
    messageElement.textContent = text;
  }
}

export function updateStats({
  score,
  moves,
  bestScore,
  gameMode,
  timeLeft
}) {
  if (scoreElement) {
    scoreElement.textContent = String(score);
  }

  if (movesElement) {
    movesElement.textContent = String(moves);
  }

  if (bestScoreElement) {
    bestScoreElement.textContent = String(bestScore);
  }

  if (!timerWrap || !timerElement) {
    return;
  }

  if (gameMode === "timed") {
    timerWrap.hidden = false;
    timerElement.textContent = String(
      Math.max(0, Math.ceil(timeLeft))
    ).padStart(2, "0");
  } else {
    timerWrap.hidden = true;
  }
}

export function renderBoard({
  board,
  rows,
  cols,
  selected,
  hintCells
}) {
  if (!boardElement) {
    return;
  }

  boardElement.innerHTML = "";

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const value = board[row][col];
      const cell = document.createElement("button");

      cell.type = "button";
      cell.className = "cell";
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      cell.textContent = value || "";

      cell.setAttribute(
        "aria-label",
        value
          ? value === "🧨"
            ? "Dynamite"
            : `Animal ${value}`
          : "Empty"
      );

      if (!value) {
        cell.classList.add("empty");
      }

      if (value === "🧨") {
        cell.classList.add("dynamite");
      }

      if (
        selected &&
        selected.row === row &&
        selected.col === col
      ) {
        cell.classList.add("selected");
      }

      if (
        hintCells.some(
          hint => hint.row === row && hint.col === col
        )
      ) {
        cell.classList.add("hint");
      }

      boardElement.appendChild(cell);
    }
  }
}

export function getMatchedCellElements(matches, cols) {
  const cells = [...document.querySelectorAll(".cell")];

  return [...matches].map(match => {
    const [row, col] = match.split(",").map(Number);
    return cells[row * cols + col];
  });
}

export function setIntroVisible(visible) {
  const introOverlay = document.getElementById("introOverlay");

  if (introOverlay) {
    introOverlay.hidden = !visible;
  }
}