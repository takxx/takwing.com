import { chooseMove } from "./ai.js";

export const COLORS = [
  "#e74c3c", // red
  "#3498db", // blue
  "#f1c40f", // yellow
  "#2ecc71", // green
  "#9b59b6"  // purple
];

const DIRECTIONS = [
  [1, 0], // horizontal, left to right
  [0, 1]  // vertical, top to bottom
];

const cellKey = (x, y) => `${x},${y}`;

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function createDeck() {
  const deck = [];

  // Keep one physical copy of each ordinary tile.
  // legalMoves() checks both this order and its reverse.
  for (let a = 0; a < COLORS.length; a++) {
    for (let b = 0; b < COLORS.length; b++) {
      for (let c = 0; c < COLORS.length; c++) {
        const forward = `${a}${b}${c}`;
        const reverse = `${c}${b}${a}`;

        if (forward <= reverse) {
          deck.push({
            id: `normal-${forward}`,
            colors: [a, b, c],
            type: "normal"
          });
        }
      }
    }
  }

  // Five Chameleon Chrominos. Their middle square is wild.
  for (let color = 0; color < COLORS.length; color++) {
    const nextColor = (color + 1) % COLORS.length;

    deck.push({
      id: `chameleon-${color}`,
      colors: [color, -1, nextColor],
      type: "chameleon"
    });
  }

  return shuffle(deck);
}

function colorsForOrientation(tile, reversed = false) {
  return reversed ? [...tile.colors].reverse() : tile.colors;
}

export class Game {
  constructor(aiCount, onChange) {
    this.onChange = onChange;
    this.board = new Map();
this.players = [
  { name: "👤", human: true, hand: [] },
  ...Array.from({ length: aiCount }, (_, index) => ({
    name: ["🤖", "👾", "💻", "🖥️"][index] ?? `🤖 ${index + 1}`,
    human: false,
    hand: []
  }))
];

    this.current = 0;
    this.selected = null;
    this.finished = false;
    this.winner = null;
    this.drawnThisTurn = false;
    this.deck = createDeck();

    this.start();
  }

  start() {
    // Use an actual Chameleon tile as the starting tile.
    const starterIndex = this.deck.findIndex(
      tile => tile.type === "chameleon"
    );
    const [starter] = this.deck.splice(starterIndex, 1);

    for (let i = 0; i < 3; i++) {
      this.board.set(cellKey(i - 1, 0), {
        color: starter.colors[i],
        tileId: starter.id
      });
    }

    for (const player of this.players) {
      player.hand = this.deck.splice(0, 8);
    }

    this.notify();
  }

  notify() {
    if (this.onChange) this.onChange(this);
  }

  selectTile(tileId) {
    if (this.finished || !this.players[this.current]?.human) return false;

    const player = this.players[this.current];
    const tile = player.hand.find(item => item.id === tileId);

    // A player cannot select a tile that has no legal placement.
    if (!tile || this.legalMoves(tile).length === 0) return false;

    this.selected = tile;
    return true;
  }

  legalMoves(tile) {
    const occupied = [...this.board.keys()].map(position =>
      position.split(",").map(Number)
    );

    if (!occupied.length) return [];

    const xs = occupied.map(([x]) => x);
    const ys = occupied.map(([, y]) => y);
    const minX = Math.min(...xs) - 3;
    const maxX = Math.max(...xs) + 3;
    const minY = Math.min(...ys) - 3;
    const maxY = Math.max(...ys) + 3;
    const moves = [];

    // Reversing a tile whose ends match creates no different orientation.
    const orientations = tile.colors[0] === tile.colors[2]
      ? [false]
      : [false, true];

    for (let dir = 0; dir < DIRECTIONS.length; dir++) {
      for (const reversed of orientations) {
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            if (this.checkPlacement(tile, x, y, dir, reversed)) {
              moves.push({ x, y, dir, reversed });
            }
          }
        }
      }
    }

    return moves;
  }

  checkPlacement(tile, x, y, dir, reversed = false) {
    const direction = DIRECTIONS[dir];
    if (!direction) return false;

    const [dx, dy] = direction;
    const colors = colorsForOrientation(tile, reversed);
    const proposed = [];
    let matches = 0;

    for (let i = 0; i < 3; i++) {
      const px = x + dx * i;
      const py = y + dy * i;

      if (this.board.has(cellKey(px, py))) return false;

      proposed.push({
        x: px,
        y: py,
        color: colors[i]
      });
    }

    for (const cell of proposed) {
      for (const [nx, ny] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ]) {
        const neighbour = this.board.get(
          cellKey(cell.x + nx, cell.y + ny)
        );

        if (!neighbour) continue;

        // Wild squares match any color. Every other edge contact
        // must have matching colors.
        if (
          neighbour.color === -1 ||
          cell.color === -1 ||
          neighbour.color === cell.color
        ) {
          matches++;
        } else {
          return false;
        }
      }
    }

    // Contacts are counted by shared edge. A single new square can
    // supply two matches if it touches two existing squares.
    return matches >= 2;
  }

  place(playerIndex, tileId, move) {
    if (this.finished || playerIndex !== this.current || !move) {
      return false;
    }

    const player = this.players[playerIndex];
    const tileIndex = player.hand.findIndex(tile => tile.id === tileId);

    if (tileIndex === -1) return false;

    const tile = player.hand[tileIndex];
    const reversed = move.reversed === true;

    if (
      !this.checkPlacement(
        tile,
        move.x,
        move.y,
        move.dir,
        reversed
      )
    ) {
      return false;
    }

    const [dx, dy] = DIRECTIONS[move.dir];
    const colors = colorsForOrientation(tile, reversed);

    for (let i = 0; i < 3; i++) {
      this.board.set(cellKey(move.x + dx * i, move.y + dy * i), {
        color: colors[i],
        tileId: tile.id
      });
    }

    player.hand.splice(tileIndex, 1);
    this.selected = null;

    if (player.hand.length === 0) {
      this.finished = true;
      this.winner = playerIndex;
      this.notify();
      return true;
    }

    this.nextTurn();
    return true;
  }

  hasAnyMove(player) {
    return player.hand.some(tile => this.legalMoves(tile).length > 0);
  }

  draw() {
    const player = this.players[this.current];

    if (
      this.finished ||
      !player.human ||
      this.drawnThisTurn ||
      this.hasAnyMove(player)
    ) {
      return false;
    }

    const tile = this.deck.pop();
    if (tile) player.hand.push(tile);

    this.drawnThisTurn = true;
    this.notify();
    return true;
  }

  endTurnAfterDraw() {
    if (!this.drawnThisTurn || this.finished) return;

    const player = this.players[this.current];
    if (!this.hasAnyMove(player)) this.nextTurn();
  }

  nextTurn() {
    this.current = (this.current + 1) % this.players.length;
    this.drawnThisTurn = false;
    this.selected = null;
    this.notify();

    if (!this.finished && !this.players[this.current].human) {
      setTimeout(() => this.playAI(), 450);
    }
  }

  playAI() {
    if (this.finished) return;

    const player = this.players[this.current];
    let move = chooseMove(this, player);

    if (!move && this.deck.length > 0) {
      player.hand.push(this.deck.pop());
      move = chooseMove(this, player);
    }

    if (move) {
      this.place(this.current, move.tile.id, move);
    } else {
      this.nextTurn();
    }
  }
}
