import { Game } from "./game.js";
import { render, setEnglishLabels } from "./render.js";
import { t } from "./lang.js";

setEnglishLabels();

let game = new Game();
const selectedIds = new Set();
const messageLog = [];

let lastLoggedMessage;
let lastTurnState;

game.beginHumanTurn();

function addLogMessage(message) {
  const text = String(message ?? "").trim();
  if (!text || text === lastLoggedMessage) return;

  messageLog.unshift(text);
  lastLoggedMessage = text;
}

function update() {
  const gameMessage = String(game.message ?? "").trim();

  if (gameMessage) {
    addLogMessage(gameMessage);
  }

  const turnState = game.over
    ? t("gameOver")
    : game.current === 0
      ? t("yourTurn")
      : t("opponentTurn", { name: `AI ${game.current}` });

  if (turnState !== lastTurnState) {
    addLogMessage(turnState);
    lastTurnState = turnState;
  }

  render(game, selectedIds, messageLog);
}

function restartDraft(message) {
  game.cancelDraft();

  if (game.isHumanTurn && !game.over) {
    game.beginHumanTurn();
  }

  if (message) {
    game.message = message;
  }

  update();
}

function runComputerTurns() {
  if (game.over) {
    update();
    return;
  }

  if (game.isHumanTurn) {
    if (!game.draft) {
      game.beginHumanTurn();
    }

    update();
    return;
  }

  update();

  window.setTimeout(() => {
    if (game.over || game.isHumanTurn) {
      runComputerTurns();
      return;
    }

    const aiIndex = game.current;
    const aiName = `AI ${game.current}`;
    const handSizeBefore = game.players[aiIndex].hand.length;
    const stockSizeBefore = game.stock.length;

    game.playComputerTurn();

    const handSizeAfter = game.players[aiIndex].hand.length;
    const stockSizeAfter = game.stock.length;

    // Keep game.message when the turn ended the game, so the winner
    // or lowest-points result isn't replaced by a generic AI message.
    if (!game.over) {
      if (handSizeAfter < handSizeBefore) {
        game.message = t("aiPlayed", { name: aiName });
      } else if (stockSizeAfter < stockSizeBefore) {
        game.message = t("aiDrew", { name: aiName });
      }
    }

    runComputerTurns();
  }, 650);
}

function moveSelectedToLoose() {
  if (!game.draft) {
    game.beginHumanTurn();
  }

  for (const id of selectedIds) {
    if (!game.pickFromHand(id)) {
      selectedIds.clear();
      restartDraft(t("selectedTileError"));
      return;
    }
  }

  selectedIds.clear();
  update();
}

function makeSetFromLoose() {
  if (!game.draft || game.draft.loose.length === 0) return;

  const ids = game.draft.loose.map(tile => tile.id);

  if (!game.makeNewSet(ids[0])) return;

  const setIndex = game.draft.table.length - 1;

  for (const id of ids.slice(1)) {
    game.putLoose(id, setIndex);
  }

  update();
}

function commitTurn() {
  const result = game.commitHumanTurn();

  if (!result.ok) {
    const reasonKeys = {
      "invalid-table": "invalidTable",
      "must-play-from-hand": "mustPlayFromHand",
      "opening-meld": "openingMeld",
      "loose-tiles": "looseTiles",
      "no-draft": "noDraft"
    };

    restartDraft(t(reasonKeys[result.reason] ?? "invalidMove"));
    return;
  }

  selectedIds.clear();
  runComputerTurns();
}

document.addEventListener("click", event => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const actionButton = target.closest("[data-action]");

  if (actionButton) {
    switch (actionButton.dataset.action) {
      case "move-selected":
        moveSelectedToLoose();
        return;

      case "new-set":
        makeSetFromLoose();
        return;

      case "commit":
        commitTurn();
        return;

      case "cancel":
        selectedIds.clear();
        restartDraft(t("draftCancelled"));
        return;
    }
  }

  if (!game.isHumanTurn) return;

  const tileButton = target.closest("button[data-tile-id]");

  if (tileButton) {
    const tileId = Number(tileButton.dataset.tileId);
    const setIndex = tileButton.dataset.setIndex;

    if (setIndex !== undefined) {
      if (!game.draft) {
        game.beginHumanTurn();
      }

      if (game.pickFromTable(Number(setIndex), tileId)) {
        update();
      }

      return;
    }

    if (tileButton.dataset.handTile) {
      if (selectedIds.has(tileId)) {
        selectedIds.delete(tileId);
      } else {
        selectedIds.add(tileId);
      }

      update();
      return;
    }
  }

  const setElement = target.closest(".set[data-set-index]");

  if (setElement && game.draft?.loose.length) {
    const tile = game.draft.loose[0];

    if (game.putLoose(tile.id, Number(setElement.dataset.setIndex))) {
      update();
    }
  }
});

document.querySelector("#draw")?.addEventListener("click", () => {
  if (!game.isHumanTurn) return;

  selectedIds.clear();
  game.drawForHuman();
  runComputerTurns();
});

document.querySelector("#new-game")?.addEventListener("click", () => {
  game.newGame();
  selectedIds.clear();
  messageLog.length = 0;
  lastLoggedMessage = undefined;
  lastTurnState = undefined;

  game.message = t("newGameMessage");
  game.beginHumanTurn();
  update();
});

update();
