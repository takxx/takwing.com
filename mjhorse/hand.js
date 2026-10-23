export function sortHand(hand) {
  hand.sort((a, b) => tileOrder(a) - tileOrder(b));
  return hand;
}

export function findFourOfAKind(hand) {
  const counts = countTiles(hand);
  return hand.find((tile) => counts.get(tile) === 4) ?? null;
}

export function removeTiles(hand, tile, amount) {
  const indices = [];

  for (let i = hand.length - 1; i >= 0 && indices.length < amount; i -= 1) {
    if (hand[i] === tile) indices.push(i);
  }

  if (indices.length !== amount) return false;

  for (const index of indices) hand.splice(index, 1);
  return true;
}

export function addConcealedKong(hand, melds, tile, player) {
  if (!removeTiles(hand, tile, 4)) return false;

  melds.push({
    kind: "kong",
    tiles: Array(4).fill(tile),
    from: player,
    concealed: true,
  });

  return true;
}

export function canWinWith(hand, extraTile, fixedMelds) {
  const tiles =
    extraTile === null || extraTile === undefined
      ? [...hand]
      : [...hand, extraTile];

  return isWinningHand(tiles, fixedMelds);
}

export function isWinningHand(hand, fixedMelds = 0) {
  if (
    !Array.isArray(hand) ||
    !Number.isInteger(fixedMelds) ||
    fixedMelds < 0 ||
    fixedMelds > 4 ||
    hand.length !== (4 - fixedMelds) * 3 + 2
  ) {
    return false;
  }

  const counts = countTiles(hand);

  for (const [pair, count] of counts) {
    if (count < 2) continue;

    counts.set(pair, count - 2);
    const wins = completeMelds(counts, 4 - fixedMelds);
    counts.set(pair, count);

    if (wins) return true;
  }

  return false;
}

function completeMelds(counts, meldsLeft) {
  if (meldsLeft === 0) {
    return [...counts.values()].every((count) => count === 0);
  }

  // Always examine the lowest remaining tile. A sequence containing it
  // cannot start with a lower tile, so this keeps the search complete.
  let tile = null;

  for (const candidate of [...counts.keys()].sort(
    (a, b) => tileOrder(a) - tileOrder(b),
  )) {
    if (counts.get(candidate) > 0) {
      tile = candidate;
      break;
    }
  }

  if (tile === null) return false;

  const count = counts.get(tile);

  if (count >= 3) {
    counts.set(tile, count - 3);
    const wins = completeMelds(counts, meldsLeft - 1);
    counts.set(tile, count);

    if (wins) return true;
  }

  if (isSuitedTile(tile)) {
    const rank = Number(tile.slice(1));
    const next = `${tile[0]}${rank + 1}`;
    const nextNext = `${tile[0]}${rank + 2}`;

    if (
      rank <= 7 &&
      (counts.get(next) ?? 0) > 0 &&
      (counts.get(nextNext) ?? 0) > 0
    ) {
      counts.set(tile, count - 1);
      counts.set(next, counts.get(next) - 1);
      counts.set(nextNext, counts.get(nextNext) - 1);

      const wins = completeMelds(counts, meldsLeft - 1);

      counts.set(tile, count);
      counts.set(next, counts.get(next) + 1);
      counts.set(nextNext, counts.get(nextNext) + 1);

      if (wins) return true;
    }
  }

  return false;
}

function countTiles(hand) {
  const counts = new Map();

  for (const tile of hand) {
    counts.set(tile, (counts.get(tile) ?? 0) + 1);
  }

  return counts;
}

function isSuitedTile(tile) {
  return (
    typeof tile === "string" &&
    /^[mps][1-9]$/.test(tile)
  );
}

function tileOrder(tile) {
  if (typeof tile !== "string" || tile.length < 2) return Number.MAX_SAFE_INTEGER;

  if (tile[0] === "z") return 300 + Number(tile.slice(1));

  const suitOrder = { m: 0, p: 100, s: 200 };
  return (suitOrder[tile[0]] ?? 400) + Number(tile.slice(1));
}
