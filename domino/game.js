/*
  GAME MODULE CONTRACT

  This module is intentionally independent of the board renderer.

  It does not know:
  - A01 through Q17
  - north, south, east, west
  - grid cells
  - snake wrapping
  - tile orientation
  - HTML or CSS

  It knows only:
  - a standard 28-tile double-six set
  - each player's hand
  - boneyard
  - logical chain ends named "left" and "right"
  - legal matches
  - automatic drawing
  - turns
  - wins and blocked rounds
*/

export const PLAYER = Object.freeze({
  HUMAN: "human",
  COMPUTER: "computer"
});

function createDoubleSixSet() {
  const tiles = [];
  let id = 0;

  for (let high = 0; high <= 6; high += 1) {
    for (let low = 0; low <= high; low += 1) {
      id += 1;

      tiles.push({
        id: `tile-${id}`,
        a: low,
        b: high
      });
    }
  }

  return tiles;
}

function shuffle(items) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const replacement = Math.floor(Math.random() * (index + 1));

    [shuffled[index], shuffled[replacement]] = [
      shuffled[replacement],
      shuffled[index]
    ];
  }

  return shuffled;
}

function copyTile(tile) {
  return {
    id: tile.id,
    a: tile.a,
    b: tile.b
  };
}

export function isDouble(tile) {
  return tile.a === tile.b;
}

export function tilePips(tile) {
  return tile.a + tile.b;
}

export function createGame() {
  const state = {
    hands: {
      [PLAYER.HUMAN]: [],
      [PLAYER.COMPUTER]: []
    },

    boneyard: [],

    /*
      These are logical values only.
      There is no screen direction or coordinate here.
    */
    ends: {
      left: null,
      right: null
    },

    opening: null,
    turn: PLAYER.HUMAN,
    gameOver: false,

    scores: {
      [PLAYER.HUMAN]: 0,
      [PLAYER.COMPUTER]: 0
    },

    lastEvent: null
  };

  function playerExists(player) {
    return player === PLAYER.HUMAN || player === PLAYER.COMPUTER;
  }

  function oppositePlayer(player) {
    return player === PLAYER.HUMAN
      ? PLAYER.COMPUTER
      : PLAYER.HUMAN;
  }

  function handPips(player) {
    return state.hands[player].reduce(
      (total, tile) => total + tilePips(tile),
      0
    );
  }

  function removeFromHand(player, tileId) {
    const index = state.hands[player].findIndex(
      (tile) => tile.id === tileId
    );

    if (index === -1) {
      return null;
    }

    return state.hands[player].splice(index, 1)[0];
  }

  function highestHeldDouble() {
    for (let pip = 6; pip >= 0; pip -= 1) {
      const humanDouble = state.hands[PLAYER.HUMAN].find(
        (tile) => tile.a === pip && tile.b === pip
      );

      if (humanDouble) {
        return {
          player: PLAYER.HUMAN,
          tile: humanDouble
        };
      }

      const computerDouble = state.hands[PLAYER.COMPUTER].find(
        (tile) => tile.a === pip && tile.b === pip
      );

      if (computerDouble) {
        return {
          player: PLAYER.COMPUTER,
          tile: computerDouble
        };
      }
    }

    return null;
  }

  /*
    If neither initial hand contains a double, draw alternately from the
    boneyard until a double appears. This guarantees that the first tile
    is always a double, as requested.
  */
  function drawForOpeningDouble() {
    let drawingPlayer = PLAYER.HUMAN;

    while (state.boneyard.length > 0) {
      const tile = state.boneyard.pop();

      state.hands[drawingPlayer].push(tile);

      if (isDouble(tile)) {
        return {
          player: drawingPlayer,
          tile
        };
      }

      drawingPlayer = oppositePlayer(drawingPlayer);
    }

    return null;
  }

  function findOpening() {
    return highestHeldDouble() || drawForOpeningDouble();
  }

  function canPlay(tile, side) {
    if (
      state.gameOver
      || (side !== "left" && side !== "right")
      || state.ends[side] === null
    ) {
      return false;
    }

    return tile.a === state.ends[side]
      || tile.b === state.ends[side];
  }

  function legalSides(tile) {
    const sides = [];

    if (canPlay(tile, "left")) {
      sides.push("left");
    }

    if (canPlay(tile, "right")) {
      sides.push("right");
    }

    return sides;
  }

  function legalMoves(player) {
    if (!playerExists(player)) {
      return [];
    }

    return state.hands[player]
      .map((tile) => ({
        tile,
        sides: legalSides(tile)
      }))
      .filter((move) => move.sides.length > 0);
  }

  function orient(tile, side) {
    const neededPip = state.ends[side];

    if (tile.a === neededPip) {
      return {
        matching: tile.a,
        exposed: tile.b
      };
    }

    return {
      matching: tile.b,
      exposed: tile.a
    };
  }

  function finishRound(winner, reason) {
    state.gameOver = true;

    if (winner === PLAYER.HUMAN || winner === PLAYER.COMPUTER) {
      state.scores[winner] += 1;
    }

    state.lastEvent = {
      type: "round-end",
      winner,
      reason,
      humanPips: handPips(PLAYER.HUMAN),
      computerPips: handPips(PLAYER.COMPUTER)
    };
  }

  function finishBlockedRound() {
    const humanPips = handPips(PLAYER.HUMAN);
    const computerPips = handPips(PLAYER.COMPUTER);

    if (humanPips < computerPips) {
      finishRound(PLAYER.HUMAN, "blocked");
      return;
    }

    if (computerPips < humanPips) {
      finishRound(PLAYER.COMPUTER, "blocked");
      return;
    }

    finishRound(null, "blocked-tie");
  }

  /*
    The returned placement is deliberately coordinate-free.

    The renderer receives:
    - side: left or right
    - matching: pip touching the current logical end
    - exposed: new logical end
    - double: whether it must be rendered as a double

    Example:
    {
      type: "place",
      side: "left",
      tile: { id: "tile-...", a: 6, b: 1 },
      matching: 6,
      exposed: 1,
      double: false
    }
  */
  function play(player, tileId, side) {
    if (
      state.gameOver
      || state.turn !== player
      || !playerExists(player)
      || (side !== "left" && side !== "right")
    ) {
      return {
        ok: false,
        reason: "invalid-turn"
      };
    }

    const tile = state.hands[player].find(
      (handTile) => handTile.id === tileId
    );

    if (!tile || !canPlay(tile, side)) {
      return {
        ok: false,
        reason: "illegal-move"
      };
    }

    const values = orient(tile, side);
    const playedTile = removeFromHand(player, tileId);

    state.ends[side] = values.exposed;

    const placement = {
      type: "place",
      player,
      side,
      tile: copyTile(playedTile),
      matching: values.matching,
      exposed: values.exposed,
      double: isDouble(playedTile)
    };

    state.lastEvent = placement;

    if (state.hands[player].length === 0) {
      finishRound(player, "empty-hand");

      return {
        ok: true,
        finished: true,
        placement
      };
    }

    state.turn = oppositePlayer(player);

    return {
      ok: true,
      finished: false,
      placement
    };
  }

  /*
    Draw only if the player has no legal tile.
    Keep drawing until a legal tile appears or the boneyard is empty.
  */
  function drawUntilPlayable(player) {
    if (
      state.gameOver
      || state.turn !== player
      || !playerExists(player)
    ) {
      return {
        drawn: [],
        playable: false,
        gameOver: state.gameOver
      };
    }

    if (legalMoves(player).length > 0) {
      return {
        drawn: [],
        playable: true,
        gameOver: false
      };
    }

    const drawn = [];

    while (
      state.boneyard.length > 0
      && legalMoves(player).length === 0
    ) {
      const drawnTile = state.boneyard.pop();
      state.hands[player].push(drawnTile);
      drawn.push(copyTile(drawnTile));
    }

    const playable = legalMoves(player).length > 0;

    if (drawn.length > 0) {
      state.lastEvent = {
        type: "draw",
        player,
        count: drawn.length
      };
    }

    if (!playable && state.boneyard.length === 0) {
      finishBlockedRound();
    }

    return {
      drawn,
      playable,
      gameOver: state.gameOver
    };
  }

  function chooseComputerMove() {
    const moves = legalMoves(PLAYER.COMPUTER);

    if (moves.length === 0) {
      return null;
    }

    const options = [];

    for (const move of moves) {
      for (const side of move.sides) {
        const values = orient(move.tile, side);

        options.push({
          tile: move.tile,
          side,
          score: (tilePips(move.tile) * 10)
            + values.exposed
            + (isDouble(move.tile) ? 2 : 0)
        });
      }
    }

    options.sort((first, second) => second.score - first.score);

    return {
      tile: copyTile(options[0].tile),
      side: options[0].side
    };
  }

  function startRound() {
    const oldScores = { ...state.scores };
    const set = shuffle(createDoubleSixSet());

    state.hands[PLAYER.HUMAN] = set.splice(0, 7);
    state.hands[PLAYER.COMPUTER] = set.splice(0, 7);
    state.boneyard = set;

    state.ends = {
      left: null,
      right: null
    };

    state.opening = null;
    state.turn = PLAYER.HUMAN;
    state.gameOver = false;
    state.scores = oldScores;
    state.lastEvent = null;

    const opening = findOpening();

    if (!opening) {
      throw new Error("Unable to find a double tile for the opening.");
    }

    removeFromHand(opening.player, opening.tile.id);

    state.opening = {
      type: "opening",
      player: opening.player,
      tile: copyTile(opening.tile),
      value: opening.tile.a
    };

    state.ends.left = opening.tile.a;
    state.ends.right = opening.tile.b;
    state.turn = oppositePlayer(opening.player);
    state.lastEvent = state.opening;

    return {
      ...state.opening,
      nextPlayer: state.turn
    };
  }

  /*
    Script gets a safe read-only snapshot rather than a mutable reference.
  */
  function snapshot() {
    return {
      hands: {
        [PLAYER.HUMAN]: state.hands[PLAYER.HUMAN].map(copyTile),
        [PLAYER.COMPUTER]: state.hands[PLAYER.COMPUTER].map(copyTile)
      },

      boneyardCount: state.boneyard.length,

      ends: {
        left: state.ends.left,
        right: state.ends.right
      },

      turn: state.turn,
      gameOver: state.gameOver,

      scores: {
        [PLAYER.HUMAN]: state.scores[PLAYER.HUMAN],
        [PLAYER.COMPUTER]: state.scores[PLAYER.COMPUTER]
      },

      lastEvent: state.lastEvent
        ? structuredClone(state.lastEvent)
        : null
    };
  }

  return {
    startRound,
    snapshot,
    play,
    drawUntilPlayable,
    legalSides,
    legalMoves,
    chooseComputerMove,
    handPips
  };
}