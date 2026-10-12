import { t } from "./lang.js";

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
  const jokers = tiles.filter(tile => tile.joker);
  const natural = tiles.filter(tile => !tile.joker);

  if (jokers.length && natural.length >= 2) {
    const sameColor = natural.every(tile => tile.color === natural[0].color);

    if (sameColor) {
      const values = natural.map(tile => tile.value).sort((a, b) => a - b);
      const missing = [];

      for (let value = values[0]; value <= values.at(-1); value++) {
        if (!values.includes(value)) missing.push(value);
      }

      if (missing.length >= jokers.length) {
        return [
          ...natural,
          ...jokers.map((tile, index) => ({
            ...tile,
            displayValue: missing[index]
          }))
        ].sort(
          (a, b) =>
            (a.displayValue ?? a.value) - (b.displayValue ?? b.value)
        );
      }
    }
  }

  return [...tiles].sort(compareTiles);
}

function setSortKey(tiles) {
  const first = orderSet(tiles)[0];
  return first ? (first.displayValue ?? first.value) : 0;
}

function requireElement(selector) {
  const element = document.querySelector(selector);

  if (!element) {
    throw new Error(`Required game element not found: ${selector}`);
  }

  return element;
}

function makeTile(tile, { selected = false, disabled = false } = {}) {
  const button = document.createElement("button");

  button.type = "button";
  button.className = `tile${selected ? " selected" : ""}`;
  button.style.setProperty(
    "--tile-color",
    TILE_COLORS[tile.color] ?? TILE_COLORS.joker
  );
  button.textContent = tile.joker
    ? "★"
    : String(tile.displayValue ?? tile.value);
  button.title = tile.joker ? "Joker" : `${tile.color} ${tile.value}`;
  button.disabled = disabled;
  button.dataset.tileId = String(tile.id);

  return button;
}

function ensureDraftControls(handSection) {
  let controls = document.querySelector("#draft-controls");
  if (controls) return controls;

  controls = document.createElement("div");
  controls.id = "draft-controls";
  controls.className = "controls draft-controls";

  const actions = [
    ["move-selected", "Move selected rack tiles to loose area"],
    ["new-set", "Make a new set from loose tiles"],
    ["commit", "Finish turn"],
    ["cancel", "Cancel draft"]
  ];

  for (const [action, label] of actions) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.action = action;
    button.textContent = label;
    controls.append(button);
  }

  handSection.append(controls);
  return controls;
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
  name.textContent = `AI${index}`;

  const rack = document.createElement("span");
  rack.className = "mini-rack";
  rack.setAttribute("aria-label", `${player.hand.length} tiles`);

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

function renderMessageLog(messages) {
  const element = requireElement("#message");
  element.replaceChildren();

  for (const message of messages) {
    const entry = document.createElement("p");
    entry.className = "message-entry";
    entry.textContent = message;
    element.append(entry);
  }
}

export function render(game, selectedIds = new Set(), messageLog = []) {
  const table = requireElement("#table");
  const hand = requireElement("#hand");
  const handSection = hand.closest(".hand-section");

  if (!handSection) {
    throw new Error("#hand must be inside .hand-section.");
  }

  const draft = game.draft;
  const sets = draft ? draft.table : game.table;
  const rack = draft ? draft.hand : game.players[0].hand;

  table.replaceChildren();

  sets
    .map((tiles, originalIndex) => ({ tiles, originalIndex }))
    .sort((a, b) => setSortKey(a.tiles) - setSortKey(b.tiles))
    .forEach(({ tiles, originalIndex }) => {
      const group = document.createElement("div");
      group.className = "set";
      group.dataset.setIndex = String(originalIndex);
      group.title =
        "Pick up a tile, or click empty set space to place a loose tile.";

      for (const tile of orderSet(tiles)) {
        const button = makeTile(tile, { disabled: !game.isHumanTurn });
        button.dataset.setIndex = String(originalIndex);
        group.append(button);
      }

      table.append(group);
    });

  hand.replaceChildren();

  for (const tile of [...rack].sort(compareTiles)) {
    const button = makeTile(tile, {
      selected: selectedIds.has(tile.id),
      disabled: !game.isHumanTurn
    });

    button.dataset.handTile = "true";
    hand.append(button);
  }

  const loose = requireElement("#loose");
  loose.replaceChildren();

  if (draft) {
    for (const tile of [...draft.loose].sort(compareTiles)) {
      loose.append(makeTile(tile, { disabled: true }));
    }
  }

  renderOpponent("top", game.players[1], 1);
  renderOpponent("left", game.players[2], 2);
  renderOpponent("right", game.players[3], 3);
  renderOpponent("bottom", game.players[4], 4);

  const controls = ensureDraftControls(handSection);

  controls.querySelector('[data-action="move-selected"]').disabled =
    !game.isHumanTurn || selectedIds.size === 0;
  controls.querySelector('[data-action="new-set"]').disabled =
    !game.isHumanTurn || !draft || draft.loose.length === 0;
  controls.querySelector('[data-action="commit"]').disabled =
    !game.isHumanTurn || !draft;
  controls.querySelector('[data-action="cancel"]').disabled =
    !game.isHumanTurn || !draft;

  requireElement("#turn").textContent = game.over
    ? ""
    : game.current === 0
      ? t("yourTurn")
      : t("opponentTurn", { name: `AI ${game.current}` });

  requireElement("#stock").textContent = `Remaining: ${game.stock.length}`;

  renderMessageLog(messageLog);

  const playButton = document.querySelector("#play");
  if (playButton) playButton.hidden = true;

  const drawButton = document.querySelector("#draw");
  if (drawButton) drawButton.disabled = !game.isHumanTurn;

  const newGameButton = document.querySelector("#new-game");
  if (newGameButton) newGameButton.disabled = false;
}

export function setEnglishLabels() {
  document.querySelectorAll("[data-i18n]").forEach(element => {
    element.textContent = t(element.dataset.i18n);
  });
}
