import { initLanguage, t, onLanguageChange } from "./lang.js";
import {
  ROWS,
  COLS,
  EMPTY,
  PLAYER,
  COMPUTER,
  createBoard,
  dropPiece,
  getValidColumns,
  findWinningLine
} from "./game.js";
import { chooseComputerColumn } from "./ai.js";
import { renderBoard } from "./render.js";

const WINS_KEY = "connect4_wins_v1";

const boardElement = document.getElementById("board");
const statusElement = document.getElementById("status");
const restartButton = document.getElementById("restart");
const playerWinsEl = document.getElementById("player-wins");
const computerWinsEl = document.getElementById("computer-wins");

let board;
let currentPlayer;
let gameOver;
let winningCells;

let playerWins = 0;
let computerWins = 0;

function loadWins() {
  try {
    const raw = localStorage.getItem(WINS_KEY);
    if (!raw) return { player: 0, computer: 0 };

    const data = JSON.parse(raw);

    return {
      player: typeof data.player === "number" ? data.player : 0,
      computer: typeof data.computer === "number" ? data.computer : 0
    };
  } catch {
    return { player: 0, computer: 0 };
  }
}

function saveWins() {
  localStorage.setItem(
    WINS_KEY,
    JSON.stringify({
      player: playerWins,
      computer: computerWins
    })
  );
}

function updateWinCounts() {
  playerWinsEl.textContent = String(playerWins);
  computerWinsEl.textContent = String(computerWins);
  saveWins();
}

function setStatus(message) {
  statusElement.textContent = message;
}

function render() {
  renderBoard({
    boardElement,
    board,
    winningCells,
    player: PLAYER,
    computer: COMPUTER,
    onColumnClick: playerMove
  });
}

function newGame() {
  board = createBoard(ROWS, COLS, EMPTY);
  currentPlayer = Math.random() < 0.5 ? PLAYER : COMPUTER;
  gameOver = false;
  winningCells = [];

  render();

  if (currentPlayer === PLAYER) {
    setStatus(t("yourTurn"));
  } else {
    setStatus(t("computerStarts"));

    setTimeout(computerTurn, 600);
  }
}

function finishIfNeeded(player) {
  const result = findWinningLine(board, player, ROWS, COLS);

  if (result.won) {
    winningCells = result.cells;
    gameOver = true;

    render();

    if (player === PLAYER) {
      playerWins++;
      setStatus(t("youWin"));
    } else {
      computerWins++;
      setStatus(t("computerWins"));
    }

    updateWinCounts();
    return true;
  }

  if (getValidColumns(board, COLS).length === 0) {
    gameOver = true;
    setStatus(t("draw"));
    return true;
  }

  return false;
}

function playerMove(column) {
  if (gameOver || currentPlayer !== PLAYER) {
    return;
  }

  const row = dropPiece(board, column, PLAYER, ROWS);

  if (row === -1) {
    return;
  }

  render();

  if (finishIfNeeded(PLAYER)) {
    return;
  }

  currentPlayer = COMPUTER;
  setStatus(t("computerThinking"));

  setTimeout(computerTurn, 350);
}

function computerTurn() {
  if (gameOver) {
    return;
  }

  const column = chooseComputerColumn({
    board,
    rows: ROWS,
    cols: COLS,
    empty: EMPTY,
    player: PLAYER,
    computer: COMPUTER,
    depth: 5
  });

  dropPiece(board, column, COMPUTER, ROWS);

  render();

  if (finishIfNeeded(COMPUTER)) {
    return;
  }

  currentPlayer = PLAYER;
  setStatus(t("yourTurn"));
}

initLanguage({
  onLanguageChanged: () => {
    if (!gameOver) {
      if (currentPlayer === PLAYER) {
        setStatus(t("yourTurn"));
      } else {
        setStatus(t("computerThinking"));
      }
    }
  }
});

onLanguageChange();

restartButton.addEventListener("click", newGame);

({ player: playerWins, computer: computerWins } = loadWins());
updateWinCounts();

newGame();