/*
  CONTROLLER MODULE

  This is the only module that imports both game.js and render.js.

  1. Start and reset rounds.
  2. Ask game.js whether moves are legal.
  3. Tell render.js to draw accepted game placements.
  4. Handle player clicks and left/right chooser.
  5. Run the computer turn.
  6. Apply language changes.
*/

import {
  initializeLanguage,
  setLanguage,
  t
} from "./lang.js";

import {
  createGame,
  PLAYER
} from "./game.js";

import {
  createRenderer
} from "./render.js";

const elements = {
  board: document.getElementById("board"),
  playerHand: document.getElementById("player-hand"),
  computerHand: document.getElementById("computer-hand"),
  playerCount: document.getElementById("player-count"),
  computerCount: document.getElementById("computer-count"),
  boneyardCount: document.getElementById("boneyard-count"),
  score: document.getElementById("score"),
  status: document.getElementById("game-status"),

  newGame: document.getElementById("new-game"),
  languageSelect: document.getElementById("language-select"),

  sidePicker: document.getElementById("side-picker"),
  playLeft: document.getElementById("play-left"),
  playRight: document.getElementById("play-right"),
  cancelPlay: document.getElementById("cancel-play")
};

const game = createGame();
const renderer = createRenderer(elements);

let pendingTile = null;
let computerThinking = false;
let statusOverride = "";

function tileText(tile) {
  return t("tile", {
    a: tile.a,
    b: tile.b
  });
}

function sideText(side) {
  return t(side === "left" ? "leftSide" : "rightSide");
}

function setSidePickerVisible(visible) {
  elements.sidePicker.classList.toggle("is-hidden", !visible);
}

function clearPendingTile() {
  pendingTile = null;
  setSidePickerVisible(false);
}

function resultMessage(snapshot) {
  const event = snapshot.lastEvent;

  if (snapshot.gameOver && event?.type === "round-end") {
    if (event.reason === "empty-hand") {
      return event.winner === PLAYER.HUMAN
        ? t("youWin")
        : t("computerWins");
    }

    if (event.reason === "blocked") {
      return event.winner === PLAYER.HUMAN
        ? t("blockedYouWin")
        : t("blockedComputerWins");
    }

    return t("blockedTie");
  }

  if (statusOverride) {
    return statusOverride;
  }

  if (event?.type === "opening") {
    return event.player === PLAYER.HUMAN
      ? t("youOpen", {
        tile: tileText(event.tile)
      })
      : t("computerOpens", {
        tile: tileText(event.tile)
      });
  }

  if (event?.type === "place") {
    return event.player === PLAYER.HUMAN
      ? t("youPlayed", {
        tile: tileText(event.tile),
        side: sideText(event.side)
      })
      : t("computerPlayed", {
        tile: tileText(event.tile),
        side: sideText(event.side)
      });
  }

  if (event?.type === "draw") {
    return event.player === PLAYER.HUMAN
      ? t("youDrew", {
        count: event.count
      })
      : t("computerDrew", {
        count: event.count
      });
  }

  return snapshot.turn === PLAYER.HUMAN
    ? t("yourTurn")
    : t("computerTurn");
}

function renderApplication() {
  const snapshot = game.snapshot();

  const playerCanInteract = !snapshot.gameOver
    && !computerThinking
    && !pendingTile
    && snapshot.turn === PLAYER.HUMAN;

  renderer.renderHand(snapshot.hands[PLAYER.HUMAN], {
    enabled: playerCanInteract,

    isPlayable(tile) {
      return game.legalSides(tile).length > 0;
    },

    onTileClick(tile) {
      onHumanTileClick(tile);
    }
  });

  renderer.renderComputerHand(
    snapshot.hands[PLAYER.COMPUTER].length
  );

  renderer.renderStats({
    playerTiles: snapshot.hands[PLAYER.HUMAN].length,
    computerTiles: snapshot.hands[PLAYER.COMPUTER].length,
    boneyardTiles: snapshot.boneyardCount,
    playerWins: snapshot.scores[PLAYER.HUMAN],
    computerWins: snapshot.scores[PLAYER.COMPUTER],
    message: resultMessage(snapshot)
  });

  setSidePickerVisible(Boolean(pendingTile));
}

function beginHumanTurn() {
  const snapshot = game.snapshot();

  if (
    snapshot.gameOver
    || snapshot.turn !== PLAYER.HUMAN
  ) {
    renderApplication();
    return;
  }

  statusOverride = "";

  const drawResult = game.drawUntilPlayable(PLAYER.HUMAN);

  if (drawResult.gameOver) {
    renderApplication();
    return;
  }

  statusOverride = drawResult.drawn.length > 0
    ? t("youDrew", {
      count: drawResult.drawn.length
    })
    : t("yourTurn");

  renderApplication();
}

function onHumanTileClick(tile) {
  const snapshot = game.snapshot();

  if (
    snapshot.gameOver
    || snapshot.turn !== PLAYER.HUMAN
    || computerThinking
    || pendingTile
  ) {
    return;
  }

  const sides = game.legalSides(tile);

  if (sides.length === 0) {
    return;
  }

  if (sides.length === 1) {
    playHumanTile(tile, sides[0]);
    return;
  }

  pendingTile = tile;
  statusOverride = t("chooseSide");
  renderApplication();
}

function playHumanTile(tile, side) {
  clearPendingTile();
  statusOverride = "";

  const result = game.play(
    PLAYER.HUMAN,
    tile.id,
    side
  );

  if (!result.ok) {
    renderApplication();
    return;
  }

  /*
    Game emitted a purely logical left/right placement.
    The renderer independently chooses its A01–Q17 location and geometry.
  */
  renderer.place(result.placement);
  renderApplication();

  if (!game.snapshot().gameOver) {
    window.setTimeout(beginComputerTurn, 420);
  }
}

function beginComputerTurn() {
  const snapshot = game.snapshot();

  if (
    snapshot.gameOver
    || snapshot.turn !== PLAYER.COMPUTER
  ) {
    renderApplication();
    return;
  }

  computerThinking = true;
  statusOverride = t("computerTurn");
  renderApplication();

  window.setTimeout(() => {
    const drawResult = game.drawUntilPlayable(PLAYER.COMPUTER);

    if (drawResult.gameOver) {
      computerThinking = false;
      renderApplication();
      return;
    }

    const move = game.chooseComputerMove();

    if (!move) {
      computerThinking = false;
      renderApplication();
      return;
    }

    const result = game.play(
      PLAYER.COMPUTER,
      move.tile.id,
      move.side
    );

    computerThinking = false;

    if (result.ok) {
      renderer.place(result.placement);

      const drawText = drawResult.drawn.length > 0
        ? `${t("computerDrew", {
          count: drawResult.drawn.length
        })} `
        : "";

      statusOverride = `${drawText}${t("computerPlayed", {
        tile: tileText(move.tile),
        side: sideText(move.side)
      })}`;
    }

    renderApplication();

    if (!game.snapshot().gameOver) {
      window.setTimeout(beginHumanTurn, 350);
    }
  }, 550);
}

function startRound() {
  clearPendingTile();
  computerThinking = false;
  statusOverride = "";

  const opening = game.startRound();

  /*
    Renderer receives only the opener's value/tile/owner data.
    It independently places the centered double at I09.
  */
  renderer.reset(opening);
  renderApplication();

  if (game.snapshot().turn === PLAYER.COMPUTER) {
    window.setTimeout(beginComputerTurn, 450);
  } else {
    window.setTimeout(beginHumanTurn, 120);
  }
}

function bindEvents() {
  elements.newGame.addEventListener("click", startRound);

  elements.languageSelect.addEventListener("change", (event) => {
    setLanguage(event.target.value, true);
    renderApplication();
  });

  elements.playLeft.addEventListener("click", () => {
    if (pendingTile) {
      playHumanTile(pendingTile, "left");
    }
  });

  elements.playRight.addEventListener("click", () => {
    if (pendingTile) {
      playHumanTile(pendingTile, "right");
    }
  });

  elements.cancelPlay.addEventListener("click", () => {
    clearPendingTile();
    statusOverride = t("yourTurn");
    renderApplication();
  });

  window.addEventListener("resize", () => {
    renderer.renderBoard();
  });
}

function initialize() {
  initializeLanguage();
  bindEvents();
  startRound();
}

initialize();