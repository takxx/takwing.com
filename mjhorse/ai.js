export function chooseDiscard(hand, visibleTiles = []) {
  let bestIndex = 0;
  let bestScore = -Infinity;

  for (let i = 0; i < hand.length; i++) {
    const candidate = hand[i];
    const rest = hand.filter((_, index) => index !== i);
    const score = handPotential(rest, visibleTiles);

    // Prefer to discard a tile that is already heavily visible.
    const visibleCount = visibleTiles.filter(t => t === candidate).length;
    const adjustedScore = score + visibleCount * 0.35;

    if (adjustedScore > bestScore) {
      bestScore = adjustedScore;
      bestIndex = i;
    }
  }
  return bestIndex;
}

export function shouldPong(hand, tile, meldCount = 0, visibleTiles = []) {
  if (hand.filter(t => t === tile).length < 2) return false;

  const before = handPotential(hand, visibleTiles);
  const after = hand.filter(t => t !== tile).filter((_, i) => i !== hand.indexOf(tile));
  const afterScore = handPotential(after, visibleTiles) + 2.5;

  // Avoid breaking a strong hand for an unhelpful pong.
  return meldCount < 4 && afterScore >= before - 1.5;
}

export function shouldKong(hand, tile) {
  return hand.filter(t => t === tile).length >= 3;
}

function handPotential(hand, visibleTiles) {
  const counts = countTiles(hand);
  let score = 0;

  for (const [tile, count] of counts) {
    if (count === 4) score += 8;
    else if (count === 3) score += 6;
    else if (count === 2) score += 2.8;
    else score += 0.15;

    if (tile.startsWith("z")) continue;

    const suit = tile[0];
    const rank = Number(tile.slice(1));

    for (const distance of [1, 2]) {
      const neighbor = `${suit}${rank + distance}`;
      if (rank + distance <= 9 && counts.has(neighbor)) {
        score += distance === 1 ? 1.8 : 0.75;
      }
    }

    // A tile is less useful when all of its copies are already visible.
    const visibleCount = visibleTiles.filter(t => t === tile).length;
    score -= visibleCount * 0.4;
  }

  return score;
}

function countTiles(tiles) {
  const counts = new Map();
  for (const tile of tiles) counts.set(tile, (counts.get(tile) || 0) + 1);
  return counts;
}
