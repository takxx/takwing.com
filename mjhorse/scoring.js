const PLAYER_COUNT = 4;

function emptyDeltas() {
  return Array(PLAYER_COUNT).fill(0);
}

export function discardWinDeltas(winners, discarder, amount = 2) {
  const deltas = emptyDeltas();
  const uniqueWinners = [...new Set(
    Array.isArray(winners) ? winners : [winners]
  )].filter(winner =>
    Number.isInteger(winner) &&
    winner >= 0 &&
    winner < PLAYER_COUNT &&
    winner !== discarder
  );

  deltas[discarder] -= amount * uniqueWinners.length;

  for (const winner of uniqueWinners) {
    deltas[winner] += amount;
  }

  return deltas;
}

export function selfDrawDeltas(winner, payment) {
  const deltas = emptyDeltas();

  for (let player = 0; player < PLAYER_COUNT; player += 1) {
    if (player === winner) continue;
    deltas[player] -= payment;
    deltas[winner] += payment;
  }

  return deltas;
}

export function kongDeltas(payer, receiver, amount) {
  const deltas = emptyDeltas();
  deltas[payer] -= amount;
  deltas[receiver] += amount;
  return deltas;
}

export function allPayKongDeltas(receiver, amount) {
  const deltas = emptyDeltas();

  for (let player = 0; player < PLAYER_COUNT; player += 1) {
    if (player === receiver) continue;
    deltas[player] -= amount;
    deltas[receiver] += amount;
  }

  return deltas;
}

export function horseHit(tile, player, diceSeat) {
  const seat = (player - diceSeat + PLAYER_COUNT) % PLAYER_COUNT;

  if (tile.startsWith("z")) {
    const honor = Number(tile.slice(1));

    if (seat === 0) return honor === 1;
    if (honor >= 5 && honor <= 7) return true;
    return honor === seat + 1;
  }

  const rank = Number(tile.slice(1));
  const ranksBySeat = [[1, 5, 9], [2, 6], [3, 7], [4, 8]];

  return ranksBySeat[seat].includes(rank);
}

export function scoreSelfDraw(winner, diceSeat, horseTiles) {
  const winningHorseTiles = horseTiles.filter(tile =>
    horseHit(tile, winner, diceSeat)
  );
  const horseHits = winningHorseTiles.length;
  const payment = 2 + horseHits * 2;

  return {
    deltas: selfDrawDeltas(winner, payment),
    horseHits,
    horseTiles: [...horseTiles],
    winningHorseTiles,
  };
}

export function scoreRobKong(winner, kongPlayer) {
  return {
    deltas: kongDeltas(kongPlayer, winner, 6),
  };
}
