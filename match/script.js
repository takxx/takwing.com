import {
  initGame,
  handleTap,
  handleSwipe,
  showHint,
  showIntro,
  startGameFromIntro
} from "./game.js";

import { setLanguage } from "./lang.js";

function getCellFromEvent(event) {
  const cell = event.target.closest(".cell");

  if (!cell) {
    return null;
  }

  return {
    row: Number(cell.dataset.row),
    col: Number(cell.dataset.col),
    element: cell
  };
}

function wireBoardInput() {
  const boardElement = document.getElementById("board");
  let pointerStart = null;

  boardElement.addEventListener("pointerdown", event => {
    const cell = getCellFromEvent(event);

    if (!cell || !boardElement.childElementCount) {
      return;
    }

    pointerStart = {
      row: cell.row,
      col: cell.col,
      x: event.clientX,
      y: event.clientY
    };

    cell.element.setPointerCapture?.(event.pointerId);
  });

  boardElement.addEventListener("pointerup", event => {
    if (!pointerStart) {
      return;
    }

    const start = { ...pointerStart };
    pointerStart = null;

    handleSwipe(start, event.clientX, event.clientY);
  });

  boardElement.addEventListener("pointercancel", () => {
    pointerStart = null;
  });
}

function wireControls() {
  const introLanguageSelect = document.getElementById(
    "introLanguageSelect"
  );

  const modeToggle = document.getElementById("modeToggle");
  const startGameButton =
    document.getElementById("startGame");

  const hintButton =
    document.getElementById("hintButton");

  const newGameButton =
    document.getElementById("newGame");

  introLanguageSelect?.addEventListener("change", event => {
    setLanguage(event.target.value);
  });

  modeToggle?.addEventListener("change", () => {
    /* The actual mode is applied when Start Game is pressed. */
  });

  startGameButton?.addEventListener(
    "click",
    startGameFromIntro
  );

  hintButton?.addEventListener("click", showHint);

  newGameButton?.addEventListener("click", showIntro);
}

wireBoardInput();
wireControls();
initGame();