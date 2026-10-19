import { COLORS } from "./game.js";
import { t } from "./lang.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const WILD_COLOR = "#fff4d5";

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);

  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, String(value));
  }

  return element;
}

function moveColors(tile, move) {
  return move.reversed
    ? [...tile.colors].reverse()
    : tile.colors;
}

export class Renderer {
  constructor(game, callbacks) {
    this.game = game;
    this.onPlace = callbacks.onPlace;
    this.onDraw = callbacks.onDraw;
    this.onCancel = callbacks.onCancel;
    this.record = callbacks.record ?? { wins: 0, losses: 0 };

    this.svg = document.querySelector("#board");
    this.hand = document.querySelector("#hand");
    this.hint = document.querySelector("#hint");
    this.status = document.querySelector("#status");
    this.recordElement = document.querySelector("#record");
    this.players = document.querySelector("#players");
    this.pileCount = document.querySelector("#pile-count");
    this.handTitle = document.querySelector("#hand-title");
    this.drawButton = document.querySelector("#draw");

    this.drawButton.addEventListener("click", () => this.onDraw());

    document.querySelector("#cancel").addEventListener("click", () => {
      this.onCancel();
    });

    this.render();
  }

  setRecord(record) {
    this.record = record;
    this.renderRecord();
  }

  render() {
    this.renderStatus();
    this.renderHand();
    this.renderBoard();
    this.renderRecord();
  }

  renderRecord() {
    if (!this.recordElement) return;

    this.recordElement.textContent = t("record", this.record);
  }

  renderStatus() {
    const game = this.game;
    this.players.replaceChildren();

    game.players.forEach((player, index) => {
      const element = document.createElement("div");
      element.className = `player ${index === game.current ? "active" : ""}`;

      const name = document.createElement("span");
      name.textContent = player.name;
      element.append(name);

      if (!player.human) {
        const miniHand = document.createElement("span");
        miniHand.className = "mini-hand";
        miniHand.setAttribute(
          "aria-label",
          t("tilesCount", { count: player.hand.length })
        );

        for (let i = 0; i < player.hand.length; i++) {
          const piece = document.createElement("span");
          piece.className = "mini-piece";
          piece.setAttribute("aria-hidden", "true");
          miniHand.append(piece);
        }

        element.append(miniHand);
      }

      this.players.append(element);
    });

    this.pileCount.textContent = t("pileCount", {
      count: game.deck.length
    });

    if (game.finished) {
      const winner = game.players[game.winner];
      this.status.textContent = t("gameOver", {
        name: winner.name
      });
      return;
    }

    const player = game.players[game.current];
    this.status.textContent = player.human
      ? t("yourTurn")
      : t("aiTurn", { name: player.name });
  }

renderHand() {
  const game = this.game;
  const player = game.players[game.current];
  const human = game.players.find(p => p.human);

  this.hand.replaceChildren();

  this.handTitle.textContent = human ? t("yourHand") : "";

  if (!human) {
    this.hint.textContent = "";
    this.drawButton.disabled = true;
    return;
  }

  for (const tile of human.hand) {
    const playable =
      !game.finished &&
      player?.human &&
      game.legalMoves(tile).length > 0;

    const button = document.createElement("button");

    button.type = "button";
    button.className = "tile-button";
    button.disabled = !playable;
    button.setAttribute(
      "aria-pressed",
      String(game.selected?.id === tile.id)
    );
    button.setAttribute(
      "aria-label",
      tile.colors.map(color =>
        color === -1 ? t("wild") : color
      ).join(", ")
    );

    button.addEventListener("click", () => {
      if (!playable) return;

      if (game.selected?.id === tile.id) {
        game.selected = null;
      } else {
        game.selectTile(tile.id);
      }

      this.render();
    });

    tile.colors.forEach(color => {
      const swatch = document.createElement("span");
      swatch.className = `swatch ${color === -1 ? "wild" : ""}`;

      if (color !== -1) {
        swatch.style.backgroundColor = COLORS[color];
      } else {
        swatch.textContent = "★";
      }

      button.append(swatch);
    });

    this.hand.append(button);
  }

  const canPlay = !game.finished && game.hasAnyMove(human);

  this.drawButton.disabled =
    game.finished ||
    canPlay ||
    game.drawnThisTurn ||
    game.deck.length === 0;

  this.hint.textContent = game.finished
    ? ""
    : game.selected
      ? t("chooseMove")
      : canPlay
        ? t("selectTile")
        : t("mustDraw");
}

  renderBoard() {
    const game = this.game;
    this.svg.replaceChildren();

    const cells = [...game.board.entries()].map(([position, value]) => {
      const [x, y] = position.split(",").map(Number);
      return { x, y, ...value };
    });

    const player = game.players[game.current];
    const moves =
      player?.human && game.selected && !game.finished
        ? game.legalMoves(game.selected)
        : [];

    const pointsX = cells.map(cell => cell.x);
    const pointsY = cells.map(cell => cell.y);

    for (const move of moves) {
      const dx = move.dir === 0 ? 1 : 0;
      const dy = move.dir === 1 ? 1 : 0;

      for (let i = 0; i < 3; i++) {
        pointsX.push(move.x + dx * i);
        pointsY.push(move.y + dy * i);
      }
    }

    const margin = 2;
    const minX = Math.min(...pointsX) - margin;
    const maxX = Math.max(...pointsX) + margin;
    const minY = Math.min(...pointsY) - margin;
    const maxY = Math.max(...pointsY) + margin;
    const cols = maxX - minX + 1;
    const rows = maxY - minY + 1;
    const unit = 40;

    this.svg.setAttribute(
      "viewBox",
      `0 0 ${cols * unit} ${rows * unit}`
    );
    this.svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    for (const cell of cells) {
      const wild = cell.color === -1;
      const x = (cell.x - minX) * unit + 2;
      const y = (cell.y - minY) * unit + 2;

      this.svg.append(svgElement("rect", {
        x,
        y,
        width: unit - 4,
        height: unit - 4,
        rx: 5,
        fill: wild ? WILD_COLOR : COLORS[cell.color],
        class: wild ? "board-cell wild-cell" : "board-cell"
      }));

      if (wild) {
        const star = svgElement("text", {
          x: x + (unit - 4) / 2,
          y: y + (unit - 4) / 2,
          class: "move-star",
          "font-size": 20
        });

        star.textContent = "★";
        this.svg.append(star);
      }
    }

    for (const move of moves) {
      this.drawMovePreview(move, game.selected, minX, minY, unit);
    }
  }

  drawMovePreview(move, tile, minX, minY, unit) {
    const dx = move.dir === 0 ? 1 : 0;
    const dy = move.dir === 1 ? 1 : 0;
    const colors = moveColors(tile, move);

    const group = svgElement("g", {
      class: "move-preview",
      tabindex: 0,
      role: "button",
      "aria-label":
        `${t("chooseMove")} ${move.dir === 0 ? "horizontal" : "vertical"}`
    });

    for (let i = 0; i < 3; i++) {
      const x = move.x + dx * i;
      const y = move.y + dy * i;
      const color = colors[i];
      const rectX = (x - minX) * unit + 3;
      const rectY = (y - minY) * unit + 3;

      group.append(svgElement("rect", {
        x: rectX,
        y: rectY,
        width: unit - 6,
        height: unit - 6,
        rx: 5,
        fill: color === -1 ? WILD_COLOR : COLORS[color]
      }));

      if (color === -1) {
        const star = svgElement("text", {
          x: rectX + (unit - 6) / 2,
          y: rectY + (unit - 6) / 2,
          class: "move-star",
          "font-size": 18
        });

        star.textContent = "★";
        group.append(star);
      }
    }

    const place = () => this.onPlace(tile.id, move);

    group.addEventListener("click", place);
    group.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        place();
      }
    });

    this.svg.append(group);
  }
}
