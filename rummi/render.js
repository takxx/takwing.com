import { isValidSet } from "./game.js";
import { currentLanguage, playerName, setLanguage, t } from "./lang.js";

const COLOR_ORDER = ["pink", "orange", "green", "azure"];

const TILE_COLORS = {
  pink: "#ff1493",
  orange: "#ff6a00",
  green: "#39ff14",
  azure: "#00bfff",
  joker: "#bb86fc"
};

function compareTiles(a, b) {
  if (a.joker !== b.joker) return a.joker ? 1 : -1;

  const colorDifference =
    COLOR_ORDER.indexOf(a.color) - COLOR_ORDER.indexOf(b.color);

  return colorDifference || a.value - b.value;
}

function orderSet(tiles) {
  return [...tiles].sort(compareTiles);
}

function requireElement(selector) {
  const element = document.querySelector(selector);

  if (!element) {
    throw new Error(`Required game element not found: ${selector}`);
  }

  return element;
}

function makeTile(
  tile,
  { disabled = false, draggable = false, loose = false } = {}
) {
  const button = document.createElement("button");

  button.type = "button";
  button.className = "tile";
  button.style.setProperty(
    "--tile-color",
    TILE_COLORS[tile.color] ?? TILE_COLORS.joker
  );
  button.textContent = tile.joker ? "★" : String(tile.value);
  button.title = tile.joker
    ? t("joker")
    : t("tileTitle", {
        color: t(tile.color),
        value: tile.value
      });
  button.disabled = disabled;
  button.draggable = draggable && !disabled;
  button.dataset.tileId = String(tile.id);

  if (loose) button.dataset.looseTile = "true";

  return button;
}

function ensureDraftControls(handSection) {
  const mainControls = [...handSection.querySelectorAll(".controls")]
    .find(element => element.id !== "draft-controls");

  if (!mainControls) {
    throw new Error("Game controls not found.");
  }

  const oldDraftControls = document.querySelector("#draft-controls");

  let finishButton = mainControls.querySelector('[data-action="commit"]');

  if (!finishButton) {
    finishButton = oldDraftControls?.querySelector(
      '[data-action="commit"]'
    );
  }

  if (!finishButton) {
    finishButton = document.createElement("button");
    finishButton.type = "button";
    finishButton.dataset.action = "commit";
  }

  finishButton.textContent = t("finishTurn");

  const drawButton = mainControls.querySelector("#draw");
  mainControls.insertBefore(finishButton, drawButton);

  oldDraftControls?.remove();

  return { controls: mainControls, finishButton };
}

function renderOpponent(position, player, index) {
  const seat = document.querySelector(`#opponent-${position}`);
  if (!seat) return;

  seat.replaceChildren();

  if (!player) {
    seat.hidden = true;
    return;
  }

  seat.hidden = false;
  seat.className = `opponent opponent-${position}`;

  const name = document.createElement("span");
  name.className = "opponent-name";
  name.textContent = playerName(index);

  const rack = document.createElement("span");
  rack.className = "mini-rack";
  rack.setAttribute(
    "aria-label",
    t("opponentTiles", { count: player.hand.length })
  );

  for (let i = 0; i < Math.min(player.hand.length, 14); i++) {
    const miniTile = document.createElement("span");
    miniTile.className = "mini-tile";
    rack.append(miniTile);
  }

  const count = document.createElement("span");
  count.className = "opponent-count";
  count.textContent = String(player.hand.length);

  seat.append(name, rack, count);
}

function renderLogTile(tile) {
  const element = document.createElement("span");
  element.className = "log-tile";
  element.style.setProperty(
    "--tile-color",
    TILE_COLORS[tile.color] ?? TILE_COLORS.joker
  );
  element.textContent = tile.joker ? "★" : String(tile.value);
  element.title = tile.joker
    ? t("joker")
    : t("tileTitle", {
        color: t(tile.color),
        value: tile.value
      });

  return element;
}

function renderFinalScores(container, game) {
  if (!game.over) return;

  const scores = game.message?.values?.scores;
  if (!Array.isArray(scores)) return;

  const section = document.createElement("section");
  section.className = "final-scores";
  section.setAttribute("aria-label", t("scoresTitle"));

  const heading = document.createElement("h2");
  heading.textContent = t("scoresTitle");

  const list = document.createElement("ul");
  list.className = "final-scores-list";

  for (const score of scores) {
    const item = document.createElement("li");
    item.className = "final-score";
    item.textContent = t("scoreRow", {
      name: score.name,
      points: score.points,
      tileCount: score.tileCount
    });
    list.append(item);
  }

  section.append(heading, list);
  container.append(section);
}

function renderMessageLog(messages, game) {
  const element = requireElement("#message");
  element.replaceChildren();

  for (const message of messages) {
    const entry = document.createElement("p");
    entry.className = "message-entry";
    entry.append(document.createTextNode(message.text));

    if (message.tiles?.length) {
      entry.append(document.createTextNode(" "));

      for (const tile of message.tiles) {
        entry.append(renderLogTile(tile));
      }
    }

    element.append(entry);
  }

  renderFinalScores(element, game);

  let languageSelect = document.querySelector("#language-select");

  if (!languageSelect) {
    languageSelect = document.createElement("select");
    languageSelect.id = "language-select";
    languageSelect.setAttribute("aria-label", "Language");

    for (const [value, label] of [
      ["en", "English"],
      ["es", "Español"],
      ["zh", "中文"]
    ]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      languageSelect.append(option);
    }

    languageSelect.addEventListener("change", () => {
      if (!setLanguage(languageSelect.value)) return;

      setEnglishLabels();
      render(game, new Set(), messages);
    });
  }

  languageSelect.value = currentLanguage;

  if (element.nextElementSibling !== languageSelect) {
    element.insertAdjacentElement("afterend", languageSelect);
  }
}


function tableSignature(table) {
  return JSON.stringify(table.map(set => set.map(tile => tile.id)));
}

export function render(game, _selectedIds = new Set(), messageLog = []) {
  const table = requireElement("#table");
  const hand = requireElement("#hand");
  const handSection = hand.closest(".hand-section");

  if (!handSection) {
    throw new Error("#hand must be inside .hand-section.");
  }

  const draft = game.draft;
  const sets = draft ? draft.table : game.table;
  const rack = draft ? draft.hand : game.players[0].hand;
  const canInteract = game.isHumanTurn && Boolean(draft);

  table.replaceChildren();

  sets.forEach((tiles, originalIndex) => {
    const group = document.createElement("div");
    group.className = "set";
    group.dataset.setIndex = String(originalIndex);
    group.title = t("boardDropHint");

    if (canInteract && !isValidSet(tiles)) {
      group.classList.add("set-invalid");
    }

    for (const tile of orderSet(tiles)) {
      const button = makeTile(tile, {
        disabled: !game.isHumanTurn,
        draggable: game.isHumanTurn
      });

      button.dataset.setIndex = String(originalIndex);
      group.append(button);
    }

    table.append(group);
  });

  hand.replaceChildren();

  for (const tile of [...rack].sort(compareTiles)) {
    const button = makeTile(tile, {
      disabled: !game.isHumanTurn,
      draggable: game.isHumanTurn
    });

    button.dataset.handTile = "true";
    hand.append(button);
  }

  const loose = requireElement("#loose");
  loose.replaceChildren();
  loose.classList.toggle("is-drop-ready", canInteract);
  loose.setAttribute("aria-label", t("draftArea"));

  if (draft) {
    for (const tile of [...draft.loose].sort(compareTiles)) {
      loose.append(
        makeTile(tile, {
          disabled: !game.isHumanTurn,
          draggable: game.isHumanTurn,
          loose: true
        })
      );
    }
  }

  const validDraft =
    Boolean(draft) &&
    draft.loose.length >= 3 &&
    isValidSet(draft.loose);

  const tick = document.createElement("button");
  tick.type = "button";
  tick.className = "draft-valid-tick";
  tick.dataset.action = "validate-draft";
  tick.textContent = "✓";
  tick.setAttribute("aria-label", t("validDraft"));
  tick.title = t("validDraftHint");
  tick.hidden = !canInteract || !validDraft;
  loose.append(tick);

  const hasDraftChanges =
    Boolean(draft) &&
    (
      draft.loose.length > 0 ||
      draft.hand.length < game.players[0].hand.length ||
      tableSignature(draft.table) !== tableSignature(game.table)
    );

  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "draft-valid-tick draft-cancel-x";
  cancel.dataset.action = "cancel";
  cancel.textContent = "×";
  cancel.setAttribute("aria-label", t("cancelDraft"));
  cancel.title = t("cancelDraft");
  cancel.hidden = !canInteract || !hasDraftChanges;
  loose.append(cancel);

  const { finishButton } = ensureDraftControls(handSection);

  const playedFromHand =
    Boolean(draft) && draft.hand.length < game.players[0].hand.length;

  finishButton.hidden = !canInteract || !playedFromHand;
  finishButton.disabled = !canInteract || !playedFromHand;

  renderOpponent("top", game.players[1], 1);
  renderOpponent("left", game.players[2], 2);

  const rightSeat = document.querySelector("#opponent-right");
  if (rightSeat) rightSeat.hidden = true;

  const bottomSeat = document.querySelector("#opponent-bottom");
  if (bottomSeat) bottomSeat.hidden = true;

  requireElement("#turn").textContent = game.over
    ? ""
    : game.current === 0
      ? t("yourTurn")
      : t("opponentTurn", { name: playerName(game.current) });

  requireElement("#stock").textContent = t("stock", {
    count: game.stock.length
  });

  renderMessageLog(messageLog, game);

  const playButton = document.querySelector("#play");
  if (playButton) playButton.hidden = true;

  const drawButton = document.querySelector("#draw");
  if (drawButton) drawButton.disabled = !game.isHumanTurn;

  const newGameButton = document.querySelector("#new-game");
  if (newGameButton) newGameButton.disabled = false;
}

function ensureInstructionsDialog() {
  if (document.querySelector("#instructions-dialog")) return;

  const dialog = document.createElement("dialog");
  dialog.id = "instructions-dialog";
  dialog.setAttribute("aria-labelledby", "instructions-title");

  const heading = document.createElement("h2");
  heading.id = "instructions-title";
  heading.dataset.i18n = "instructionsTitle";
  dialog.append(heading);

  const sections = [
    ["instructionsGoalTitle", "instructionsGoal"],
    ["instructionsSetsTitle", "instructionsSets"],
    ["instructionsFirstTurnTitle", "instructionsFirstTurn"],
    ["instructionsTurnsTitle", "instructionsTurns"],
    ["instructionsControlsTitle", "instructionsControls"]
  ];

  for (const [headingKey, textKey] of sections) {
    const sectionHeading = document.createElement("h3");
    sectionHeading.dataset.i18n = headingKey;

    const paragraph = document.createElement("p");
    paragraph.dataset.i18n = textKey;

    dialog.append(sectionHeading, paragraph);
  }

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.dataset.i18n = "closeInstructions";
  closeButton.addEventListener("click", () => dialog.close());

  dialog.append(closeButton);
  document.body.append(dialog);

  document
    .querySelector("#instructions-button")
    ?.addEventListener("click", () => dialog.showModal());
}

export function setEnglishLabels() {
  ensureInstructionsDialog();

  document.querySelectorAll("[data-i18n]").forEach(element => {
    const value = t(element.dataset.i18n);

    if (element instanceof HTMLInputElement && element.type === "button") {
      element.value = value;
    } else {
      element.textContent = value;
    }
  });

  const languageSelect = document.querySelector("#language-select");
  if (languageSelect) languageSelect.value = currentLanguage;
}