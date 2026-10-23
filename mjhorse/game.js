import { chooseDiscard, shouldPong, shouldKong } from "./ai.js";
import { render } from "./render.js";
import {
  addConcealedKong,
  canWinWith,
  findFourOfAKind,
  sortHand,
} from "./hand.js";
import {
  loadStats,
  recordRound,
  transferCredits,
} from "./stat.js";
import {
  allPayKongDeltas,
  createScoring,
  discardWinDeltas,
  kongDeltas,
} from "./scoring.js";
import { createSettlement } from "./settle.js";

const PLAYER_COUNT = 4;

function makeWall() {
  const tiles = [];

  for (const suit of ["m", "p", "s"]) {
    for (let rank = 1; rank <= 9; rank += 1) {
      for (let copy = 0; copy < 4; copy += 1) {
        tiles.push(`${suit}${rank}`);
      }
    }
  }

  for (let rank = 1; rank <= 7; rank += 1) {
    for (let copy = 0; copy < 4; copy += 1) {
      tiles.push(`z${rank}`);
    }
  }

  for (let i = tiles.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }

  return tiles;
}

export function createGame(t) {
  const stats = loadStats();

  const state = {
    hands: [[], [], [], []],
    melds: [[], [], [], []],
    discards: [],
    wall: [],
    credits: stats.credits,
    records: stats.records,
    seatWinds: ["z1", "z2", "z3", "z4"],
    dice: [],
    turn: 0,
    selected: null,
    message: "",
    actions: [],
    running: false,
    onDiscard: null,
    onNewGame: null,
    diceSeat: null,
    winner: null,
    winningTile: null,
    winningTileIndex: null,
    drawnTileIndex: null,
    gameSummary: null,
    winners: [],
    nextStartingPlayer: 0,
  };

  let timer = null;
  let pendingDiscard = null;
  let discardClaimWindow = null;
  let discardSerial = 0;
  const roundLog = [];

  const { transfer } = createScoring({
    state,
    roundLog,
    transferCredits,
  });

  function update() {
    state.onDiscard = discard;
    state.onNewGame = winner => {
      const startingPlayer = state.winners.length > 1
        ? state.nextStartingPlayer
        : Array.isArray(winner)
          ? winner[0]
          : winner;
    
      newGame(
        Number.isInteger(startingPlayer)
          ? startingPlayer
          : state.nextStartingPlayer
      );
    };
    render(state, t);
  }

  function clearTimer() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function schedule(callback, delay = 450) {
    clearTimer();
    timer = setTimeout(() => {
      timer = null;
      callback();
    }, delay);
  }

  function refreshStats() {
    const latest = loadStats();
    state.credits = latest.credits;
    state.records = latest.records;
  }

  const { settle, endRound } = createSettlement({
    state,
    t,
    roundLog,
    clearTimer,
    update,
    transferCredits,
    recordRound,
    clearPendingDiscard: () => {
      pendingDiscard = null;
    },
  });

  function newGame(startingPlayer = 0) {
    if (
      !Number.isInteger(startingPlayer) ||
      startingPlayer < 0 ||
      startingPlayer >= PLAYER_COUNT
    ) {
      startingPlayer = 0;
    }

    clearTimer();

    state.hands = [[], [], [], []];
    state.melds = [[], [], [], []];
    state.discards = [];
    state.wall = makeWall();
    state.dice = [];
    state.diceSeat = startingPlayer;
    state.turn = startingPlayer;
    state.selected = null;
    state.running = false;
    state.actions = [];
    state.message = t.roll;
    state.winner = null;
    state.winningTile = null;
    state.winningTileIndex = null;
    state.drawnTileIndex = null;
    state.gameSummary = null;
    state.winners = [];
    state.nextStartingPlayer = startingPlayer;

    discardClaimWindow = null;
    roundLog.length = 0;
    pendingDiscard = null;
    discardSerial = 0;

    update();

    schedule(() => {
      state.dice = [
        1 + Math.floor(Math.random() * 6),
        1 + Math.floor(Math.random() * 6),
      ];

      for (let round = 0; round < 13; round += 1) {
        for (let player = 0; player < PLAYER_COUNT; player += 1) {
          state.hands[player].push(state.wall.pop());
        }
      }

      state.hands[startingPlayer].push(state.wall.pop());
      state.hands.forEach(sortHand);
      state.turn = startingPlayer;
      state.running = true;

      setDrawnTileIndex(
        startingPlayer,
        state.hands[startingPlayer][
          state.hands[startingPlayer].length - 1
        ]
      );

      finishDrawnTurn(startingPlayer);
    }, 500);
  }

  function setDrawnTileIndex(player, tile) {
    state.drawnTileIndex =
      player === 0 ? state.hands[0].lastIndexOf(tile) : null;
  }

  function discard(index) {
    if (!state.running || state.turn !== 0 || state.actions.length) {
      return;
    }

    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= state.hands[0].length
    ) {
      return;
    }

    const [tile] = state.hands[0].splice(index, 1);
    state.drawnTileIndex = null;
    state.selected = null;
    publishDiscard(0, tile);
  }

  function publishDiscard(player, tile) {
    state.discards.push(tile);
    discardSerial += 1;
    pendingDiscard = { player, tile, serial: discardSerial };
    state.actions = [];
    state.selected = null;

    if (!offerDiscardToPlayers(player, tile)) {
      continueAfterDiscard(player);
    }
  }

  function offerDiscardToPlayers(discarder, tile) {
    const order = [
      (discarder + 1) % PLAYER_COUNT,
      (discarder + 2) % PLAYER_COUNT,
      (discarder + 3) % PLAYER_COUNT,
    ];

    const eligibleWinners = order.filter(player =>
      canWinWith(state.hands[player], tile, state.melds[player].length)
    );

    if (eligibleWinners.length) {
      discardClaimWindow = {
        discarder,
        tile,
        serial: discardSerial,
        eligibleWinners,
        winners: [],
        index: 0,
      };
      processNextDiscardClaim();
      return true;
    }

    for (const player of order) {
      const hand = state.hands[player];
      const matching = hand.filter(candidate => candidate === tile).length;

      if (matching >= 3) {
        if (player === 0) {
          showHumanClaims(discarder, tile, false, true, false);
        } else {
          claimMeld(player, discarder, tile, "kong", 4);
          drawForPlayer(player);
        }
        return true;
      }

      if (matching >= 2) {
        if (player === 0) {
          showHumanClaims(discarder, tile, false, false, true);
          return true;
        }

        if (
          shouldPong(
            hand,
            tile,
            state.melds[player].length,
            getVisibleTiles()
          )
        ) {
          claimMeld(player, discarder, tile, "pong", 3);
          state.turn = player;
          state.message = t.opponentTurn;
          schedule(() => takeTurn(player, false));
          update();
          return true;
        }
      }
    }

    return false;
  }

  function processNextDiscardClaim() {
    const window = discardClaimWindow;

    if (
      !state.running ||
      !window ||
      !isCurrentClaim(window.discarder, window.tile)
    ) {
      return;
    }

    while (window.index < window.eligibleWinners.length) {
      const player = window.eligibleWinners[window.index++];

      if (player === 0) {
        showDiscardWinPrompt(window);
        return;
      }

      window.winners.push(player);

      if (window.eligibleWinners.includes(0)) {
        showDiscardWinPrompt(window);
        return;
      }
    }

    finishDiscardClaimWindow();
  }

  function showDiscardWinPrompt(window) {
    state.turn = 0;
    state.message = window.winners.length
      ? t.anotherWinPrompt || t.win
      : t.pongPrompt || t.yourTurn;

    state.actions = [
      {
        label: t.win || "胡",
        run: () => {
          if (!isCurrentClaim(window.discarder, window.tile)) return;

          if (!window.winners.includes(0)) {
            window.winners.push(0);
          }

          processNextDiscardClaim();
        },
      },
      {
        label: t.pass || "過",
        run: () => {
          if (!isCurrentClaim(window.discarder, window.tile)) return;
          processNextDiscardClaim();
        },
      },
    ];

    update();
  }

  function finishDiscardClaimWindow() {
    const window = discardClaimWindow;
    if (!window || !isCurrentClaim(window.discarder, window.tile)) {
      return;
    }
  
    const winners = [...new Set(window.winners)];
    discardClaimWindow = null;
  
    if (winners.length) {
      if (winners.length > 1) {
        state.nextStartingPlayer = window.discarder;
      }
      settle(winners, false, window.discarder, window.tile);
      return;
    }
  
    state.actions = [];
    continueAfterDiscard(window.discarder);
  }

  function showHumanClaims(
    discarder,
    tile,
    canWin,
    canKong = false,
    canPong = false
  ) {
    state.turn = 0;
    state.message = t.pongPrompt || t.yourTurn;
    state.actions = [];

    if (canWin) {
      state.actions.push({
        label: t.win || "胡",
        run: () => {
          if (isCurrentClaim(discarder, tile)) {
            settle(0, false, discarder, tile);
          }
        },
      });
    }

    if (canKong) {
      state.actions.push({
        label: t.kong || "槓",
        run: () => {
          if (!isCurrentClaim(discarder, tile)) return;
          if (claimMeld(0, discarder, tile, "kong", 4)) {
            drawForPlayer(0);
          }
        },
      });
    }

    if (canPong) {
      state.actions.push({
        label: t.pong || "碰",
        run: () => {
          if (!isCurrentClaim(discarder, tile)) return;
          if (!claimMeld(0, discarder, tile, "pong", 3)) return;

          state.turn = 0;
          state.message = t.yourTurn;
          state.actions = [];
          update();
        },
      });
    }

    state.actions.push({
      label: t.pass || "過",
      run: () => {
        if (!isCurrentClaim(discarder, tile)) return;
        state.actions = [];
        continueAfterDiscard(discarder);
      },
    });

    update();
  }

  function isCurrentClaim(player, tile) {
    return (
      pendingDiscard?.player === player &&
      pendingDiscard.tile === tile &&
      pendingDiscard.serial === discardSerial
    );
  }

  function claimMeld(player, discarder, tile, kind, tileCount) {
    const hand = state.hands[player];
    const needed = tileCount - 1;
    let removed = 0;

    for (let i = hand.length - 1; i >= 0 && removed < needed; i -= 1) {
      if (hand[i] === tile) {
        hand.splice(i, 1);
        removed += 1;
      }
    }

    if (removed !== needed) {
      return false;
    }

    state.melds[player].push({
      kind,
      tiles: Array(tileCount).fill(tile),
      from: discarder,
    });

    if (state.discards[state.discards.length - 1] === tile) {
      state.discards.pop();
    }

    pendingDiscard = null;
    state.actions = [];
    state.turn = player;
    state.drawnTileIndex = null;

    if (kind === "kong") {
      transfer(kongDeltas(discarder, player, 3), t.exposedKong);
    }

    return true;
  }

  function continueAfterDiscard(discarder) {
    if (!state.running) return;

    pendingDiscard = null;
    state.actions = [];

    const next = (discarder + 1) % PLAYER_COUNT;
    state.turn = next;
    state.message = next === 0 ? t.yourTurn : t.opponentTurn;

    if (state.wall.length === 0) {
      endRound(t.draw);
    } else if (next === 0) {
      drawForPlayer(0);
    } else {
      schedule(() => takeTurn(next, true));
    }

    update();
  }

  function takeTurn(player, drawFirst) {
    if (!state.running || state.turn !== player) return;

    state.drawnTileIndex = null;

    if (drawFirst) {
      if (state.wall.length === 0) {
        endRound(t.draw);
        return;
      }

      const tile = state.wall.pop();
      state.hands[player].push(tile);
      sortHand(state.hands[player]);
      setDrawnTileIndex(player, tile);
    }

    finishDrawnTurn(player);
  }

  function finishDrawnTurn(player) {
    if (!state.running || state.turn !== player) return;

    const hand = state.hands[player];

    if (canWinWith(hand, null, state.melds[player].length)) {
      settle(player, true);
      return;
    }

    const upgradeablePong = state.melds[player].find(
      meld => meld.kind === "pong" && hand.includes(meld.tiles[0])
    );

    if (upgradeablePong) {
      const tile = upgradeablePong.tiles[0];

      if (player === 0) {
        offerHumanKong(() => upgradePongToKong(0, upgradeablePong));
        return;
      }

      if (shouldKong(hand, tile)) {
        upgradePongToKong(player, upgradeablePong);
        return;
      }
    }

    const concealedKong = findFourOfAKind(hand);

    if (concealedKong) {
      if (player === 0) {
        offerHumanKong(() => commitConcealedKong(0, concealedKong));
        return;
      }

      if (shouldKong(hand, concealedKong)) {
        commitConcealedKong(player, concealedKong);
      } else {
        discardTurn(player);
      }

      return;
    }

    if (player === 0) {
      showHumanDiscardTurn();
    } else {
      discardTurn(player);
    }
  }

  function offerHumanKong(onKong) {
    state.message = t.kongPrompt || t.yourTurn;
    state.actions = [
      {
        label: t.kong || "槓",
        run: () => {
          if (state.running && state.turn === 0) {
            onKong();
          }
        },
      },
      {
        label: t.pass || "過",
        run: () => {
          if (!state.running || state.turn !== 0) return;
          state.actions = [];
          showHumanDiscardTurn();
        },
      },
    ];

    update();
  }

  function showHumanDiscardTurn() {
    state.message = t.yourTurn;
    state.actions = [];
    update();
  }

  function upgradePongToKong(player, meld) {
    const tile = meld.tiles[0];

    if (
      !state.running ||
      !state.hands[player].includes(tile) ||
      meld.kind !== "pong" ||
      !state.melds[player].includes(meld)
    ) {
      return;
    }

    const claimants = [
      (player + 1) % PLAYER_COUNT,
      (player + 2) % PLAYER_COUNT,
      (player + 3) % PLAYER_COUNT,
    ];

    for (const claimant of claimants) {
      if (
        !canWinWith(
          state.hands[claimant],
          tile,
          state.melds[claimant].length
        )
      ) {
        continue;
      }

      if (claimant === 0) {
        offerHumanRobKong(player, tile, meld);
      } else {
        settle(claimant, false, player, tile, true);
      }

      return;
    }

    commitPongUpgrade(player, meld, tile);
  }

  function offerHumanRobKong(kongPlayer, tile, meld) {
    discardSerial += 1;
    pendingDiscard = {
      player: kongPlayer,
      tile,
      serial: discardSerial,
    };

    state.turn = 0;
    state.message = t.robKongPrompt || t.pongPrompt || t.yourTurn;
    state.actions = [
      {
        label: t.win || "胡",
        run: () => {
          if (isCurrentClaim(kongPlayer, tile)) {
            settle(0, false, kongPlayer, tile, true);
          }
        },
      },
      {
        label: t.pass || "過",
        run: () => {
          if (!isCurrentClaim(kongPlayer, tile)) return;
          pendingDiscard = null;
          state.actions = [];
          commitPongUpgrade(kongPlayer, meld, tile);
        },
      },
    ];

    update();
  }

  function commitPongUpgrade(player, meld, tile) {
    const tileIndex = state.hands[player].indexOf(tile);

    if (
      !state.running ||
      tileIndex === -1 ||
      meld.kind !== "pong" ||
      !state.melds[player].includes(meld)
    ) {
      return;
    }

    state.hands[player].splice(tileIndex, 1);
    meld.kind = "kong";
    meld.tiles.push(tile);
    meld.added = true;
    state.actions = [];
    state.drawnTileIndex = null;

    transfer(allPayKongDeltas(player, 1), t.addedKong);
    drawForPlayer(player);
  }

  function commitConcealedKong(player, tile) {
    if (
      !addConcealedKong(
        state.hands[player],
        state.melds[player],
        tile,
        player
      )
    ) {
      return;
    }

    state.actions = [];
    state.drawnTileIndex = null;

    transfer(allPayKongDeltas(player, 2), t.concealedKong);
    drawForPlayer(player);
  }

  function drawForPlayer(player) {
    if (!state.running) return;

    if (state.wall.length === 0) {
      endRound(t.draw);
      return;
    }

    const tile = state.wall.pop();
    state.hands[player].push(tile);
    sortHand(state.hands[player]);
    setDrawnTileIndex(player, tile);
    state.turn = player;
    state.actions = [];
    finishDrawnTurn(player);
  }

  function discardTurn(player) {
    if (!state.running || state.turn !== player) return;

    const index = chooseDiscard(state.hands[player], getVisibleTiles());
    const [tile] = state.hands[player].splice(index, 1);

    if (player === 0) {
      state.drawnTileIndex = null;
    }

    publishDiscard(player, tile);
    update();
  }

  function getVisibleTiles() {
    return [
      ...state.discards,
      ...state.melds.flatMap(melds =>
        melds.flatMap(meld => meld.tiles)
      ),
    ];
  }

  newGame();

  return {
    newGame,
  };
}
