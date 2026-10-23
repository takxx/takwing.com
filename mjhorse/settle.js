import {
  discardWinDeltas,
  scoreRobKong,
  scoreSelfDraw,
} from "./scoring.js";

export function createSettlement({
  state,
  t,
  roundLog,
  clearTimer,
  update,
  transferCredits,
  recordRound,
}) {
  function drawHorseTiles() {
    const tiles = [];

    for (let i = 0; i < 3 && state.wall.length > 0; i += 1) {
      tiles.push(state.wall.pop());
    }

    return tiles;
  }

  function finishRoundRecord() {
    const record = {
      date: new Date().toISOString(),
      diceSeat: state.diceSeat,
      winner: state.winner,
      winningTile: state.winningTile,
      log: [...roundLog],
    };

    const deltas = roundLog.reduce(
      (total, entry) =>
        total.map((value, player) => value + entry.deltas[player]),
      [0, 0, 0, 0],
    );

    const latest = recordRound({ record, deltas });
    state.credits = latest.credits;
    state.records = latest.records;
    state.gameSummary = [...roundLog];
  }

  function settle(
    winner,
    selfDraw,
    discarder = null,
    claimedTile = null,
    robKong = false,
  ) {
    if (!state.running) {
      return;
    }

    state.running = false;
    clearTimer();
    state.actions = [];
    state.pendingDiscard = null;
    state.winner = winner;
    state.winningTile = selfDraw
      ? state.hands[winner][state.drawnTileIndex]
      : claimedTile;
    state.winningTileIndex = selfDraw ? state.drawnTileIndex : null;

    if (selfDraw) {
      const result = scoreSelfDraw(
        winner,
        state.diceSeat,
        drawHorseTiles(),
      );

      roundLog.unshift({
        label: `${t.selfDraw}（${t.horseHits} ${result.horseHits} ${t.tilesCount}）`,
        horseTiles: result.horseTiles,
        winningHorseTiles: result.winningHorseTiles,
        deltas: result.deltas,
      });

      state.message =
        winner === 0
          ? `${t.win} ${t.winBySelfDraw}；${t.horseHits} ${result.horseHits} ${t.tilesCount}`
          : `${t.lose} ${t.winBySelfDraw}；${t.horseHits} ${result.horseHits} ${t.tilesCount}`;
    } else if (robKong) {
      const result = scoreRobKong(winner, discarder);
      roundLog.unshift({
        label: t.robKongWin || t.discardWin,
        deltas: result.deltas,
      });
      state.message = winner === 0 ? t.win : t.lose;
    } else if (discarder !== null) {
      const deltas = discardWinDeltas(winner, discarder);
      roundLog.unshift({ label: t.discardWin, deltas });
      state.message = winner === 0 ? t.win : t.lose;
    }

    finishRoundRecord();
    update();
  }

  function endRound(message) {
    if (!state.running) {
      return;
    }

    state.running = false;
    clearTimer();
    state.actions = [];
    state.message = message || t.draw;
    state.winner = null;
    roundLog.unshift({ label: t.draw, deltas: [0, 0, 0, 0] });
    finishRoundRecord();
    update();
  }

  return { settle, endRound };
}
