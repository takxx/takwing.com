import { Game, isValidSet } from "./game.js";
import { render, setEnglishLabels } from "./render.js";
import { playerName, t } from "./lang.js";

setEnglishLabels();

let game = new Game();
const messageLog = [];

let lastLoggedKey;
let lastTurnState;

game.beginHumanTurn();

function addLogMessage(message, tiles = []) {
  const text = String(message ?? "").trim();
  if (!text) return;

  const key = `${text}|${tiles.map(tile => tile.id).join(",")}`;
  if (key === lastLoggedKey) return;

  messageLog.unshift({ text, tiles: [...tiles] });
  lastLoggedKey = key;
}

function displayGameMessage(message) {
  if (!message) return "";

  if (typeof message === "string") return message;

  return t(message.key, {
    ...(message.values ?? {}),
    name:
      message.values?.name === undefined
        ? undefined
        : playerName(message.values.name),
    names:
      message.values?.names === undefined
        ? undefined
        : message.values.names
            .split(",")
            .map(index => playerName(Number(index)))
            .join(", ")
  });
}

function tilesAdded(before, after) {
  const previousIds = new Set(before.map(tile => tile.id));
  return after.filter(tile => !previousIds.has(tile.id));
}

function tilesRemoved(before, after) {
  const remainingIds = new Set(after.map(tile => tile.id));
  return before.filter(tile => !remainingIds.has(tile.id));
}

function update() {
  const gameMessage = displayGameMessage(game.message);

  if (gameMessage) {
    addLogMessage(gameMessage);
    game.message = null;
  }

  const turnState = game.over
    ? t("gameOver")
    : game.current === 0
      ? t("yourTurn")
      : t("opponentTurn", { name: playerName(game.current) });

  if (turnState !== lastTurnState) {
    addLogMessage(turnState);
    lastTurnState = turnState;
  }

  render(game, new Set(), messageLog);
}

function restartDraft(messageKey) {
  game.cancelDraft();

  if (game.isHumanTurn && !game.over) {
    game.beginHumanTurn();
  }

  if (messageKey) game.message = { key: messageKey };
  update();
}

function runComputerTurns() {
  if (game.over) {
    update();
    return;
  }

  if (game.isHumanTurn) {
    if (!game.draft) game.beginHumanTurn();
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
    const aiName = playerName(aiIndex);
    const handBefore = [...game.players[aiIndex].hand];

    game.playComputerTurn();

    const handAfter = game.players[aiIndex].hand;
    const playedTiles = tilesRemoved(handBefore, handAfter);
    const drewTiles = tilesAdded(handBefore, handAfter);

    if (playedTiles.length > 0) {
      addLogMessage(t("aiPlayed", { name: aiName }), playedTiles);
    } else if (drewTiles.length > 0) {
      // AI draw messages intentionally do not display the drawn tile.
      addLogMessage(t("aiDrew", { name: aiName }));
    }

    runComputerTurns();
  }, 650);
}

function addDraftAsNewSet() {
  if (!game.draft || game.draft.loose.length < 3) return;
  if (!isValidSet(game.draft.loose)) return;

  const ids = game.draft.loose.map(tile => tile.id);
  if (!game.makeNewSet(ids[0])) return;

  const setIndex = game.draft.table.length - 1;

  for (const id of ids.slice(1)) {
    if (!game.putLoose(id, setIndex)) {
      restartDraft("invalidMove");
      return;
    }
  }

  update();
}

function commitTurn() {
  const handBefore = [...game.players[0].hand];
  const result = game.commitHumanTurn();

  if (!result.ok) {
    const reasonKeys = {
      "invalid-table": "invalidTable",
      "must-play-from-hand": "mustPlayFromHand",
      "opening-meld": "openingMeld",
      "loose-tiles": "looseTiles",
      "no-draft": "noDraft"
    };

    restartDraft(reasonKeys[result.reason] ?? "invalidMove");
    return;
  }

  const playedTiles = tilesRemoved(handBefore, game.players[0].hand);

  if (playedTiles.length > 0) {
    addLogMessage(t("youPlayed"), playedTiles);
  }

  runComputerTurns();
}

function beginDrag(event, tileButton) {
  if (!game.isHumanTurn || !tileButton.draggable) {
    event.preventDefault();
    return;
  }

  const tileId = tileButton.dataset.tileId;
  if (!tileId) return;

  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", tileId);
  tileButton.classList.add("is-dragging");
}

function handleDrop(event, target) {
  event.preventDefault();
  target.classList.remove("drag-over");

  const tileId = Number(event.dataTransfer.getData("text/plain"));
  if (!Number.isInteger(tileId) || !game.isHumanTurn) return;

  const tileButton = document.querySelector(
    `button[data-tile-id="${tileId}"]`
  );

  if (!tileButton) return;

  if (target.id === "loose") {
    if (!game.draft) game.beginHumanTurn();

    if (tileButton.dataset.handTile) {
      if (game.pickFromHand(tileId)) update();
      return;
    }

    if (tileButton.dataset.setIndex !== undefined) {
      if (game.pickFromTable(Number(tileButton.dataset.setIndex), tileId)) {
        update();
      }
    }

    return;
  }

  const setElement = target.closest(".set[data-set-index]");

  if (setElement && tileButton.dataset.looseTile) {
    if (game.putLoose(tileId, Number(setElement.dataset.setIndex))) {
      update();
    }
  }
}

document.addEventListener("dragstart", event => {
  const tileButton = event.target.closest?.("button[data-tile-id]");
  if (tileButton) beginDrag(event, tileButton);
});

document.addEventListener("dragend", event => {
  event.target
    .closest?.("button[data-tile-id]")
    ?.classList.remove("is-dragging");

  document
    .querySelectorAll(".drag-over")
    .forEach(element => element.classList.remove("drag-over"));
});

document.addEventListener("dragover", event => {
  const target = event.target.closest?.("#loose, .set[data-set-index]");
  if (!target) return;

  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  target.classList.add("drag-over");
});

document.addEventListener("dragleave", event => {
  const target = event.target.closest?.("#loose, .set[data-set-index]");

  if (target && !target.contains(event.relatedTarget)) {
    target.classList.remove("drag-over");
  }
});

document.addEventListener("drop", event => {
  const target = event.target.closest?.("#loose, .set[data-set-index]");
  if (target) handleDrop(event, target);
});

document.addEventListener("click", event => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const actionButton = target.closest("[data-action]");

  if (actionButton) {
    switch (actionButton.dataset.action) {
      case "validate-draft":
        addDraftAsNewSet();
        return;

      case "commit":
        commitTurn();
        return;

      case "cancel":
        restartDraft("draftCancelled");
        return;
    }
  }

  if (!game.isHumanTurn) return;

  const tileButton = target.closest("button[data-tile-id]");
  if (!tileButton) return;

  const tileId = Number(tileButton.dataset.tileId);
  if (!Number.isInteger(tileId)) return;

  // A tap on a hand tile or table tile moves it into the draft area.
  if (!game.draft) game.beginHumanTurn();

  if (tileButton.dataset.handTile) {
    if (game.pickFromHand(tileId)) update();
    return;
  }

  const setIndex = tileButton.dataset.setIndex;

  if (setIndex !== undefined) {
    if (game.pickFromTable(Number(setIndex), tileId)) update();
  }
});

document.querySelector("#draw")?.addEventListener("click", () => {
  if (!game.isHumanTurn) return;

  const handBefore = [...game.players[0].hand];

  game.drawForHuman();

  const drawnTiles = tilesAdded(handBefore, game.players[0].hand);

  if (drawnTiles.length > 0) {
    addLogMessage(t("youDrew"), drawnTiles);
  }

  runComputerTurns();
});

document.querySelector("#new-game")?.addEventListener("click", () => {
  game.newGame();
  messageLog.length = 0;
  lastLoggedKey = undefined;
  lastTurnState = undefined;

  game.beginHumanTurn();
  update();
});

update();
