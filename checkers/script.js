// script.js
// Application bootstrap: DOM wiring, module coordination, and AI scheduling.

import { createGame } from "./game.js";
import { chooseComputerTurn } from "./ai.js";
import { createRenderer } from "./render.js";
import {
  installLanguagePopstate,
  setLanguage,
} from "./lang.js";

const elements = {
  boardSvg: document.getElementById("board"),
  turnStatus: document.getElementById("turnStatus"),
  readout: document.getElementById("readout"),
  resetMoveButton: document.getElementById("resetMoveButton"),
  restartButton: document.getElementById("restartButton"),
  opponentCountSelect: document.getElementById("opponentCount"),
  totalHolesElement: document.getElementById("totalHoles"),
  centralHolesElement: document.getElementById("centralHoles"),
  armHolesElement: document.getElementById("armHoles"),
};

for (const [name, element] of Object.entries(elements)) {
  if (!element) {
    throw new Error(`Missing required HTML element: ${name}`);
  }
}

const game = createGame();

const renderer = createRenderer(elements, {
  onPieceSelected: (pieceId) => game.selectPiece(pieceId),
  onDestinationSelected: (destinationX, destinationY) => {
    game.applyHumanMove(destinationX, destinationY);
  },
  onReadoutRequested: (x, y) => renderer.showCoordinateReadout(x, y),
});

let renderQueued = false;

function requestRender() {
  if (renderQueued) {
    return;
  }

  renderQueued = true;

  requestAnimationFrame(() => {
    renderQueued = false;
    renderer.render(game.getSnapshot());
  });
}

const COMPUTER_THINKING_DELAY = 420;
const COMPUTER_JUMP_DELAY = 310;

function playComputerMoveSequence(moves, moveIndex, scheduledTurnToken) {
  const snapshot = game.getSnapshot();

  if (
    snapshot.state.gameOver
    || snapshot.state.turnToken !== scheduledTurnToken
  ) {
    game.setComputerThinking(false);
    return;
  }

  if (moveIndex >= moves.length) {
    game.setComputerThinking(false);
    game.endTurn();
    return;
  }

  game.applyComputerMove(moves[moveIndex]);

  window.setTimeout(() => {
    playComputerMoveSequence(moves, moveIndex + 1, scheduledTurnToken);
  }, COMPUTER_JUMP_DELAY);
}

function maybeScheduleComputerTurn() {
  const snapshot = game.getSnapshot();

  if (
    snapshot.state.gameOver
    || snapshot.activePlayer.type !== "computer"
    || snapshot.state.computerThinking
  ) {
    return;
  }

  game.setComputerThinking(true);

  const scheduledTurnToken = snapshot.state.turnToken;

  window.setTimeout(() => {
    const currentSnapshot = game.getSnapshot();

    if (
      currentSnapshot.state.gameOver
      || currentSnapshot.state.turnToken !== scheduledTurnToken
      || currentSnapshot.activePlayer.type !== "computer"
    ) {
      game.setComputerThinking(false);
      return;
    }

    const computerTurn = chooseComputerTurn({
      position: { pieces: currentSnapshot.state.pieces },
      board: currentSnapshot.board,
      player: currentSnapshot.activePlayer,
      activePlayers: currentSnapshot.activePlayers,
      playerIndex: currentSnapshot.state.activePlayerIndex,
      depth: currentSnapshot.activePlayers.length === 2 ? 3 : 2,
    });

    if (!computerTurn) {
      game.setComputerThinking(false);
      game.endTurn();
      return;
    }

    playComputerMoveSequence(
      computerTurn.moves,
      0,
      scheduledTurnToken,
    );
  }, COMPUTER_THINKING_DELAY);
}

game.subscribe((event) => {
  requestRender();

  if (event.type === "turn-changed") {
    maybeScheduleComputerTurn();
  }
});

elements.resetMoveButton.addEventListener("click", () => {
  game.resetCurrentHumanMove();
});

elements.restartButton.addEventListener("click", () => {
  game.resetGame();
});

elements.opponentCountSelect.addEventListener("change", (event) => {
  game.setOpponentCount(Number(event.target.value));
});

document.querySelectorAll(".language-button").forEach((button) => {
  button.addEventListener("click", () => {
    setLanguage(button.dataset.language);
    renderer.render(game.getSnapshot());
  });
});

installLanguagePopstate(() => {
  renderer.render(game.getSnapshot());
});

renderer.render(game.getSnapshot());
game.resetGame();