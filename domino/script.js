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
  languageSelect: document.getElementById("language-select")
};

const game = createGame();
const renderer = createRenderer(elements);

let pendingTile = null;
let computerThinking = false;
let statusOverride = "";
let pendingTileButton = null;

function tileText(tile) {
  return t("tile", {
    a: tile.a,
    b: tile.b
  });
}

function sideText(side) {
  return t(side === "left" ? "leftSide" : "rightSide");
}

function rememberTileButton(tile) {
  const buttons = elements.playerHand.querySelectorAll(".hand-domino");
  const targetLabel = `${tile.a}-${tile.b}`;

  pendingTileButton = Array.from(buttons).find((button) => {
    return button.getAttribute("aria-label") === targetLabel;
  }) || null;
}

function restoreTileFocus() {
  if (!pendingTileButton) return;

  const button = pendingTileButton;
  pendingTileButton = null;

  window.requestAnimationFrame(() => {
    if (document.contains(button) && !button.disabled) {
      button.focus();
    }
  });
}

function clearPendingTile({ restoreFocus = false } = {}) {
  pendingTile = null;
  renderer.hideSideSelector();

  if (restoreFocus) {
    restoreTileFocus();
  } else {
    pendingTileButton = null;
  }
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

  if (statusOverride) return statusOverride;

  if (event?.type === "opening") {
    return event.player === PLAYER.HUMAN
      ? t("youOpen", { tile: tileText(event.tile) })
      : t("computerOpens", { tile: tileText(event.tile) });
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
      ? t("youDrew", { count: event.count })
      : t("computerDrew", { count: event.count });
  }

  if (event?.type === "pass") {
    return event.player === PLAYER.HUMAN
      ? t("yourTurn")
      : t("computerTurn");
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

  renderer.renderComputerHand(snapshot.hands[PLAYER.COMPUTER].length);

  renderer.renderStats({
    playerTiles: snapshot.hands[PLAYER.HUMAN].length,
    computerTiles: snapshot.hands[PLAYER.COMPUTER].length,
    boneyardTiles: snapshot.boneyardCount,
    playerWins: snapshot.scores[PLAYER.HUMAN],
    computerWins: snapshot.scores[PLAYER.COMPUTER],
    message: resultMessage(snapshot)
  });

  if (pendingTile) {
    renderer.showSideSelector({
      label: t("chooseSide"),
      sideLabels: {
        left: t("leftSide"),
        right: t("rightSide")
      },
      onSelect(side) {
        if (pendingTile) {
          playHumanTile(pendingTile, side);
        }
      }
    });
  } else {
    renderer.hideSideSelector();
  }

  elements.newGame.classList.toggle("is-hidden", !snapshot.gameOver);
}

function scheduleComputerTurn(delay = 350) {
  window.setTimeout(beginComputerTurn, delay);
}

function scheduleHumanTurn(delay = 350) {
  window.setTimeout(beginHumanTurn, delay);
}

function beginHumanTurn() {
  const beforeDraw = game.snapshot();

  if (beforeDraw.gameOver) {
    renderApplication();
    return;
  }

  if (beforeDraw.turn !== PLAYER.HUMAN) {
    renderApplication();

    if (beforeDraw.turn === PLAYER.COMPUTER) {
      scheduleComputerTurn();
    }

    return;
  }

  statusOverride = "";

  const drawResult = game.drawUntilPlayable(PLAYER.HUMAN);
  const afterDraw = game.snapshot();

  if (drawResult.gameOver || afterDraw.gameOver) {
    renderApplication();
    return;
  }

  if (afterDraw.turn !== PLAYER.HUMAN) {
    statusOverride = t("computerTurn");
    renderApplication();

    if (afterDraw.turn === PLAYER.COMPUTER) {
      scheduleComputerTurn();
    }

    return;
  }

  statusOverride = drawResult.drawn.length > 0
    ? t("youDrew", { count: drawResult.drawn.length })
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

  if (sides.length === 0) return;

  if (sides.length === 1) {
    playHumanTile(tile, sides[0]);
    return;
  }

  if (snapshot.ends.left === snapshot.ends.right) {
    const side = sides[Math.floor(Math.random() * sides.length)];
    playHumanTile(tile, side);
    return;
  }

  pendingTile = tile;
  rememberTileButton(tile);
  statusOverride = t("chooseSide");
  renderApplication();
}

function playHumanTile(tile, side) {
  clearPendingTile();
  statusOverride = "";

  const result = game.play(PLAYER.HUMAN, tile.id, side);

  if (!result.ok) {
    renderApplication();
    return;
  }

  renderer.place(result.placement);
  renderApplication();

  if (!game.snapshot().gameOver) {
    scheduleComputerTurn(420);
  }
}

function beginComputerTurn() {
  const beforeTurn = game.snapshot();

  if (beforeTurn.gameOver) {
    computerThinking = false;
    renderApplication();
    return;
  }

  if (beforeTurn.turn !== PLAYER.COMPUTER) {
    computerThinking = false;
    renderApplication();

    if (beforeTurn.turn === PLAYER.HUMAN) {
      scheduleHumanTurn(0);
    }

    return;
  }

  computerThinking = true;
  statusOverride = t("computerTurn");
  renderApplication();

  window.setTimeout(() => {
    const drawResult = game.drawUntilPlayable(PLAYER.COMPUTER);
    const afterDraw = game.snapshot();

    if (drawResult.gameOver || afterDraw.gameOver) {
      computerThinking = false;
      renderApplication();
      return;
    }

    if (afterDraw.turn !== PLAYER.COMPUTER) {
      computerThinking = false;
      statusOverride = t("yourTurn");
      renderApplication();

      if (afterDraw.turn === PLAYER.HUMAN) {
        scheduleHumanTurn();
      }

      return;
    }

    const move = game.chooseComputerMove();

    if (!move) {
      computerThinking = false;

      const current = game.snapshot();
      renderApplication();

      if (!current.gameOver && current.turn === PLAYER.HUMAN) {
        scheduleHumanTurn();
      }

      return;
    }

    const result = game.play(
      PLAYER.COMPUTER,
      move.tile.id,
      move.side
    );

    computerThinking = false;

    if (!result.ok) {
      renderApplication();

      const current = game.snapshot();

      if (!current.gameOver && current.turn === PLAYER.HUMAN) {
        scheduleHumanTurn();
      }

      return;
    }

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

    renderApplication();

    if (!game.snapshot().gameOver) {
      scheduleHumanTurn(350);
    }
  }, 550);
}

function startRound() {
  clearPendingTile();
  computerThinking = false;
  statusOverride = "";

  const opening = game.startRound();

  renderer.reset(opening);
  renderApplication();

  if (game.snapshot().turn === PLAYER.COMPUTER) {
    scheduleComputerTurn(450);
  } else {
    scheduleHumanTurn(120);
  }
}

function bindEvents() {
  elements.newGame.addEventListener("click", startRound);

  elements.languageSelect.addEventListener("change", (event) => {
    setLanguage(event.target.value, true);
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
