import { findComputerPlay } from "./ai.js";
import { playerName as getPlayerName } from "./lang.js";

const COLORS = ["pink", "orange", "green", "azure"];
const PLAYER_COUNT = 3;
const JOKER_POINTS = 30;
const PASSES_TO_END = PLAYER_COUNT * 2;

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  return items;
}

function makeDeck() {
  const deck = [];
  let id = 0;

  for (const color of COLORS) {
    for (let copy = 0; copy < 2; copy++) {
      for (let value = 1; value <= 13; value++) {
        deck.push({ id: id++, color, value, joker: false });
      }
    }
  }

  deck.push({ id: id++, color: "joker", value: 0, joker: true });
  deck.push({ id: id++, color: "joker", value: 0, joker: true });

  return shuffle(deck);
}

function isConcreteSet(tiles) {
  if (
    !Array.isArray(tiles) ||
    tiles.length < 3 ||
    tiles.length > 13 ||
    tiles.some(tile => tile.joker)
  ) {
    return false;
  }

  const sameNumber =
    tiles.every(tile => tile.value === tiles[0].value) &&
    new Set(tiles.map(tile => tile.color)).size === tiles.length;

  if (sameNumber) return tiles.length <= 4;

  const sameColor = tiles.every(tile => tile.color === tiles[0].color);
  if (!sameColor) return false;

  const values = tiles.map(tile => tile.value).sort((a, b) => a - b);
  if (new Set(values).size !== values.length) return false;

  return values.every(
    (value, index) => index === 0 || value === values[index - 1] + 1
  );
}

export function isValidSet(tiles) {
  if (!Array.isArray(tiles) || tiles.length < 3 || tiles.length > 13) {
    return false;
  }

  const jokers = tiles.filter(tile => tile.joker);
  const natural = tiles.filter(tile => !tile.joker);

  if (jokers.length === 0) return isConcreteSet(tiles);
  if (jokers.length > 2 || natural.length === 0) return false;

  function assignJokers(index, completed) {
    if (index === jokers.length) return isConcreteSet(completed);

    for (const color of COLORS) {
      for (let value = 1; value <= 13; value++) {
        const assignment = {
          id: `joker-${index}`,
          color,
          value,
          joker: false
        };

        if (assignJokers(index + 1, [...completed, assignment])) return true;
      }
    }

    return false;
  }

  return assignJokers(0, natural);
}

function bestSetPoints(tiles) {
  const jokers = tiles.filter(tile => tile.joker);
  const natural = tiles.filter(tile => !tile.joker);

  if (jokers.length === 0) {
    return isConcreteSet(tiles)
      ? natural.reduce((sum, tile) => sum + tile.value, 0)
      : -1;
  }

  if (jokers.length > 2 || natural.length === 0) return -1;

  let best = -1;

  function assign(index, completed, score) {
    if (index === jokers.length) {
      if (isConcreteSet(completed)) best = Math.max(best, score);
      return;
    }

    for (const color of COLORS) {
      for (let value = 1; value <= 13; value++) {
        assign(
          index + 1,
          [...completed, { id: `joker-${index}`, color, value, joker: false }],
          score + value
        );
      }
    }
  }

  assign(0, natural, natural.reduce((sum, tile) => sum + tile.value, 0));
  return best;
}

function cloneSets(sets) {
  return sets.map(set => [...set]);
}

function handPoints(hand) {
  return hand.reduce(
    (total, tile) => total + (tile.joker ? JOKER_POINTS : tile.value),
    0
  );
}

function getScores(players) {
  return players.map((player, playerIndex) => ({
    playerIndex,
    name: getPlayerName(playerIndex),
    points: handPoints(player.hand),
    tileCount: player.hand.length,
    tiles: [...player.hand]
  }));
}


export class Game {
  constructor() {
    this.newGame();
  }

  newGame() {
    this.stock = makeDeck();
    this.players = Array.from({ length: PLAYER_COUNT }, (_, index) => ({
      id: index,
      hand: []
    }));

    for (let i = 0; i < 14; i++) {
      for (const player of this.players) {
        player.hand.push(this.stock.pop());
      }
    }

    this.table = [];
    this.current = 0;
    this.over = false;
    this.hasOpened = this.players.map(() => false);
    this.draft = null;
    this.consecutiveNoDrawTurns = 0;
    this.message = { key: "newGameMessage" };
  }

  get isHumanTurn() {
    return !this.over && this.current === 0;
  }

  beginHumanTurn() {
    if (!this.isHumanTurn) return false;

    this.draft = {
      table: cloneSets(this.table),
      hand: [...this.players[0].hand],
      loose: [],
      playedFromHand: new Set()
    };

    return true;
  }

  pickFromHand(tileId) {
    if (!this.draft) return false;

    const index = this.draft.hand.findIndex(tile => tile.id === tileId);
    if (index < 0) return false;

    const [tile] = this.draft.hand.splice(index, 1);
    this.draft.loose.push(tile);
    this.draft.playedFromHand.add(tile.id);

    return true;
  }

  pickFromTable(setIndex, tileId) {
    if (!this.draft) return false;

    const set = this.draft.table[setIndex];
    if (!set) return false;

    const tileIndex = set.findIndex(tile => tile.id === tileId);
    if (tileIndex < 0) return false;

    const [tile] = set.splice(tileIndex, 1);
    this.draft.loose.push(tile);

    if (set.length === 0) this.draft.table.splice(setIndex, 1);

    return true;
  }

  putLoose(tileId, setIndex) {
    if (!this.draft) return false;

    const looseIndex = this.draft.loose.findIndex(tile => tile.id === tileId);
    if (looseIndex < 0 || !this.draft.table[setIndex]) return false;

    const [tile] = this.draft.loose.splice(looseIndex, 1);
    this.draft.table[setIndex].push(tile);

    return true;
  }

  makeNewSet(tileId) {
    if (!this.draft) return false;

    const looseIndex = this.draft.loose.findIndex(tile => tile.id === tileId);
    if (looseIndex < 0) return false;

    const [tile] = this.draft.loose.splice(looseIndex, 1);
    this.draft.table.push([tile]);

    return true;
  }

  cancelDraft() {
    this.draft = null;
  }

  commitHumanTurn() {
    if (!this.isHumanTurn || !this.draft) {
      return { ok: false, reason: "no-draft" };
    }

    if (this.draft.loose.length) {
      return { ok: false, reason: "loose-tiles" };
    }

    if (!this.draft.playedFromHand.size) {
      return { ok: false, reason: "must-play-from-hand" };
    }

    if (!this.draft.table.every(isValidSet)) {
      return { ok: false, reason: "invalid-table" };
    }

    if (!this.hasOpened[0]) {
      let openingPoints = 0;

      for (const set of this.draft.table) {
        const playedTiles = set.filter(tile =>
          this.draft.playedFromHand.has(tile.id)
        );

        if (playedTiles.length) {
          const score = bestSetPoints(playedTiles);
          if (score < 0) return { ok: false, reason: "opening-meld" };
          openingPoints += score;
        }
      }

      if (openingPoints < 30) {
        return { ok: false, reason: "opening-meld" };
      }
    }

    this.table = cloneSets(this.draft.table);
    this.players[0].hand = [...this.draft.hand];
    this.hasOpened[0] = true;
    this.draft = null;
    this.consecutiveNoDrawTurns = 0;

    if (this.players[0].hand.length === 0) {
      this.over = true;
      this.message = {
        key: "youWin",
        values: { scores: getScores(this.players) }
      };
    } else {
      this.message = { key: "played" };
      this.advanceTurn();
    }

    return { ok: true };
  }

  drawForHuman() {
    if (!this.isHumanTurn) return false;

    this.draft = null;
    const tile = this.stock.pop();

    if (tile) {
      this.players[0].hand.push(tile);
      this.consecutiveNoDrawTurns = 0;
      this.message = null;
      this.advanceTurn();
    } else {
      this.message = { key: "drawEmpty" };
      this.recordNoDrawTurn();

      if (!this.over) this.advanceTurn();
    }

    return true;
  }

  recordNoDrawTurn() {
    this.consecutiveNoDrawTurns++;

    if (this.consecutiveNoDrawTurns >= PASSES_TO_END) {
      this.endByLowestHandPoints();
    }
  }

  endByLowestHandPoints() {
    const scores = getScores(this.players);
    const lowest = Math.min(...scores.map(score => score.points));
    const winners = scores.filter(score => score.points === lowest);

    this.over = true;
    this.draft = null;

    if (winners.length === 1) {
      const winner = winners[0];

      this.message = {
        key: winner.playerIndex === 0 ? "youWinLowest" : "opponentWinsLowest",
        values: {
          name: winner.name,
          points: lowest,
          scores
        }
      };
    } else {
      this.message = {
        key: "tieLowest",
        values: {
          names: winners.map(winner => winner.name).join(", "),
          points: lowest,
          scores
        }
      };
    }
  }

  advanceTurn() {
    if (!this.over) {
      this.current = (this.current + 1) % this.players.length;
    }
  }

  playComputerTurn() {
    if (this.over || this.current === 0) return;

    const playerIndex = this.current;
    const player = this.players[playerIndex];
    const play = findComputerPlay(
      player.hand,
      this.table,
      this.hasOpened[playerIndex]
    );

    if (play && Array.isArray(play.table) && play.playedIds instanceof Set) {
      const handIds = new Set(player.hand.map(tile => tile.id));
      const tableIds = new Set(play.table.flat().map(tile => tile.id));

      const validPlay =
        play.playedIds.size > 0 &&
        [...play.playedIds].every(id => handIds.has(id)) &&
        [...play.playedIds].every(id => tableIds.has(id)) &&
        play.table.every(isValidSet);

      if (validPlay) {
        player.hand = player.hand.filter(tile => !play.playedIds.has(tile.id));
        this.table = cloneSets(play.table);
        this.hasOpened[playerIndex] = true;
        this.consecutiveNoDrawTurns = 0;

        if (player.hand.length === 0) {
          this.over = true;
          this.message = {
            key: "opponentWins",
            values: {
              name: playerIndex,
              scores: getScores(this.players)
            }
          };
          return;
        }

        this.advanceTurn();
        return;
      }
    }

    const tile = this.stock.pop();

    if (tile) {
      player.hand.push(tile);
      this.consecutiveNoDrawTurns = 0;
    } else {
      this.recordNoDrawTurn();
    }

    if (!this.over) this.advanceTurn();
  }
}
