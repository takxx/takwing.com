import { renderGameSummary } from "./summary.js";

const TILE_SVG_URL = "/mahjong/mahjong.svg";

const SUITS = {
  m: "萬",
  p: "筒",
  s: "索"
};

const SVG_TILE_IDS = {
  m1: "🀇", m2: "🀈", m3: "🀉", m4: "🀊", m5: "🀋",
  m6: "🀌", m7: "🀍", m8: "🀎", m9: "🀏",

  p1: "🀙", p2: "🀚", p3: "🀛", p4: "🀜", p5: "🀝",
  p6: "🀞", p7: "🀟", p8: "🀠", p9: "🀡",

  s1: "🀐", s2: "🀑", s3: "🀒", s4: "🀓", s5: "🀔",
  s6: "🀕", s7: "🀖", s8: "🀗", s9: "🀘",

  z1: "🀀", z2: "🀁", z3: "🀂", z4: "🀃",
  z5: "🀄", z6: "🀅", z7: "🀆"
};

let svgDocumentPromise;
let hasRendered = false;
let previousDiscardCount = 0;
let previousPlayerHandCount = 0;
let previousDiceKey = "";

function loadTileDocument() {
  if (!svgDocumentPromise) {
    svgDocumentPromise = fetch(TILE_SVG_URL)
      .then(response => {
        if (!response.ok) {
          throw new Error(
            `Could not load ${TILE_SVG_URL}: HTTP ${response.status}`
          );
        }
        return response.text();
      })
      .then(source =>
        new DOMParser().parseFromString(source, "image/svg+xml")
      )
      .then(doc => {
        if (doc.querySelector("parsererror")) {
          throw new Error(`${TILE_SVG_URL} is not valid SVG`);
        }
        return doc;
      });
  }

  return svgDocumentPromise;
}

export function tileName(tile) {
  if (tile.startsWith("z")) {
    return ["東", "南", "西", "北", "中", "發", "白"][
      Number(tile[1]) - 1
    ] || tile;
  }

  return `${tile.slice(1)}${SUITS[tile[0]] || ""}`;
}

function tileFace(tile) {
  if (tile.startsWith("z")) return tileName(tile);

  const numeral =
    ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"][
      Number(tile.slice(1))
    ] || tile.slice(1);

  return `${numeral}${SUITS[tile[0]] || ""}`;
}

export function tileNode(tile, small = false, highlight = false, t = {}) {
  const el = document.createElement("span");
  el.className =
    `tile${small ? " small" : ""}${highlight ? " winning-tile" : ""}`;
  el.title = tileName(tile);

  if (highlight) {
    el.setAttribute(
      "aria-label",
      `${tileName(tile)} — ${t.highlightedTile || "食糊牌"}`
    );
  }

  const fallback = document.createElement("span");
  fallback.className = "tile-fallback";
  fallback.textContent = tileFace(tile);
  el.append(fallback);

  loadTileDocument()
    .then(doc => {
      const svgId = SVG_TILE_IDS[tile];
      const source = svgId ? doc.getElementById(svgId) : null;

      if (!source) {
        console.warn(`Tile ID not found in ${TILE_SVG_URL}:`, tile);
        return;
      }

      const svg = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
      );
      svg.setAttribute("viewBox", "0 0 100 130");
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", tileName(tile));

      if (source.tagName.toLowerCase() === "symbol") {
        const defs = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "defs"
        );
        defs.append(source.cloneNode(true));
        svg.append(defs);

        const use = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "use"
        );
        use.setAttribute("href", `#${svgId}`);
        svg.append(use);

        const sourceViewBox = source.getAttribute("viewBox");
        if (sourceViewBox) svg.setAttribute("viewBox", sourceViewBox);
      } else {
        const clone = source.cloneNode(true);
        clone.removeAttribute("id");
        svg.append(clone);
      }

      el.replaceChildren(svg);
    })
    .catch(error => console.error("Tile SVG load failed:", error));

  return el;
}

function makeBack(t) {
  const el = document.createElement("span");
  el.className = "tile back small";
  el.setAttribute("aria-label", t.hiddenTile || "暗牌");
  return el;
}

function dieNode(value, t) {
  const die = document.createElement("span");
  die.className = "die";
  die.setAttribute("aria-label", `${t.die || "骰子"} ${value}`);

  const points = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8]
  }[value] || [];

  for (let i = 0; i < 9; i++) {
    const pip = document.createElement("i");

    if (points.includes(i)) {
      pip.className = "pip";
      if (value === 1 || value === 4) pip.classList.add("red");
    }

    die.append(pip);
  }

  return die;
}

function diceBox(state, seat, t) {
  if (state.diceSeat !== seat || !state.dice?.length) return null;

  const box = document.createElement("span");
  box.className = "player-dice";
  box.setAttribute("aria-label", t.die || "骰子");

  for (const value of state.dice) {
    box.append(dieNode(value, t));
  }

  return box;
}

function animateDiceFromBoard(target) {
  const board = document.querySelector(".discard-panel");
  if (!board || !target || !target.isConnected) return;

  const sourceRect = board.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();

  const sourceX = sourceRect.left + sourceRect.width / 2;
  const sourceY = sourceRect.top + sourceRect.height / 2;
  const targetX = targetRect.left + targetRect.width / 2;
  const targetY = targetRect.top + targetRect.height / 2;

  const ghost = target.cloneNode(true);
  ghost.classList.add("dice-flight");
  ghost.setAttribute("aria-hidden", "true");
  ghost.querySelectorAll("[aria-label]").forEach(node => {
    node.removeAttribute("aria-label");
  });

  ghost.style.left = `${sourceX - targetRect.width / 2}px`;
  ghost.style.top = `${sourceY - targetRect.height / 2}px`;
  document.body.append(ghost);

  const animation = ghost.animate(
    [
      { transform: "translate(0, 0) scale(1.15)", opacity: 1 },
      {
        transform:
          `translate(${targetX - sourceX}px, ${targetY - sourceY}px) scale(1)`,
        opacity: 0
      }
    ],
    {
      duration: 650,
      easing: "cubic-bezier(.2,.75,.35,1)",
      fill: "forwards"
    }
  );

  animation.onfinish = () => ghost.remove();
}

function renderMelds(melds) {
  const box = document.createElement("div");
  box.className = "melds";

  for (const meld of melds) {
    const group = document.createElement("span");
    group.className = "meld";

    for (const tile of meld.tiles) {
      group.append(tileNode(tile, true));
    }

    box.append(group);
  }

  return box;
}

function addDealAnimation(node, index) {
  const groupDelay = Math.floor(index / 4) * 240;
  node.classList.add("dealing-tile");
  node.style.setProperty("--deal-delay", `${groupDelay}ms`);
}

export function render(state, t) {
  const discardCount = state.discards.length;
  const playerHandCount = state.hands[0]?.length || 0;

  const isInitialDeal = playerHandCount > 0 && previousPlayerHandCount === 0;

  previousDiscardCount = discardCount;
  previousPlayerHandCount = playerHandCount;
  hasRendered = true;

  document.querySelector("#remaining-count").textContent = state.wall.length;
  document.querySelector("#player-credits").textContent = state.credits[0];

  const diceResult = document.querySelector("#dice-result");
  if (diceResult) diceResult.replaceChildren();

  document.querySelector("#discards").replaceChildren(
    ...state.discards.map(tile => tileNode(tile, true))
  );

  const opponents = document.querySelector("#opponents");
  opponents.replaceChildren();

  const diceTargets = [];
  const diceKey = state.dice?.length
    ? `${state.diceSeat}:${state.dice.join(",")}`
    : "";

  const shouldAnimateDice = diceKey !== "" && diceKey !== previousDiceKey;
  previousDiceKey = diceKey;

  const winners = new Set(
    Array.isArray(state.winners)
      ? state.winners
      : state.winner == null
        ? []
        : [state.winner]
  );

  for (let p = 1; p < 4; p++) {
    const box = document.createElement("section");
    box.className = "panel opponent";

    const heading = document.createElement("div");
    heading.className = "opponent-heading";

    const name = document.createElement("span");
    name.className = "opponent-name";

    const dice = diceBox(state, p, t);
    if (dice) {
      name.append(dice);
      if (shouldAnimateDice) diceTargets.push(dice);
    }

    const nameText = document.createElement("span");
    nameText.textContent = t[["", "south", "west", "north"][p]];
    name.append(nameText);

    const credits = document.createElement("span");
    credits.textContent = `${t.credits}: ${state.credits[p]}`;
    heading.append(name, credits);

    const hand = document.createElement("div");

    if (winners.has(p)) {
      hand.className = "opponent-hand";

      for (const [i, tile] of (state.hands[p] || []).entries()) {
        const node = tileNode(
          tile,
          true,
          state.winningTileIndex != null && i === state.winningTileIndex
        );
        if (isInitialDeal) addDealAnimation(node, i);
        hand.append(node);
      }
    } else {
      hand.className = "back-row";

      for (let i = 0; i < (state.hands[p] || []).length; i++) {
        hand.append(makeBack(t));
      }
    }

    box.append(heading, hand, renderMelds(state.melds[p] || []));
    opponents.append(box);
  }

  const playerHand = document.querySelector("#player-hand");
  const playerHeading = document.querySelector(".player-heading");
  const playerName = playerHeading.querySelector("h2");
  const playerDice = diceBox(state, 0, t);

  const playerLabel =
    playerName.dataset.label ||
    playerName.textContent.trim() ||
    t.you ||
    "你";

  playerName.dataset.label = playerLabel;
  playerName.replaceChildren(document.createTextNode(playerLabel));

  if (playerDice) {
    playerName.append(playerDice);
    if (shouldAnimateDice) diceTargets.push(playerDice);
  }

  playerHand.replaceChildren();

  for (const [i, tile] of (state.hands[0] || []).entries()) {
    const isWinningTile =
      winners.has(0) &&
      state.winningTileIndex != null &&
      i === state.winningTileIndex;
    const isDrawnTile = i === state.drawnTileIndex;
    const node = tileNode(tile, false, isWinningTile || isDrawnTile);

    if (isInitialDeal) addDealAnimation(node, i);
    if (state.selected === i) node.classList.add("selected");
    if (isDrawnTile) node.classList.add("drawn-tile");

    node.addEventListener("click", () => state.onDiscard?.(i));
    playerHand.append(node);
  }

  document.querySelector("#player-melds").replaceChildren(
    ...renderMelds(state.melds[0] || []).childNodes
  );

  const message = document.querySelector("#turn-message");
  message.replaceChildren();

  if (state.message) {
    const messageText = document.createElement("span");
    messageText.textContent = state.message;
    message.append(messageText);
  }

  for (const action of state.actions || []) {
    const button = document.createElement("button");
    button.textContent = action.label;
    button.addEventListener("click", action.run);
    message.append(button);
  }

  if (isInitialDeal || diceTargets.length > 0) {
    requestAnimationFrame(() => {
      for (const target of diceTargets) {
        animateDiceFromBoard(target);
      }
    });
  }

  const summaryEntries = Array.isArray(state.gameSummary)
    ? state.gameSummary
    : state.gameSummary?.results || [];

  const winningHorseTiles = summaryEntries.flatMap(
    entry => entry.winningHorseTiles || []
  );

  renderGameSummary(state, t, tileNode, winningHorseTiles);
}
