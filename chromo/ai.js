export function chooseMove(game, player) {
  const candidates = [];

  for (const tile of player.hand) {
    for (const move of game.legalMoves(tile)) {
      candidates.push({
        tile,
        ...move,
        score: scoreMove(game, player, tile, move)
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] || null;
}

function scoreMove(game, player, tile, move) {
  let score = 10;

  // Prefer getting rid of tiles with repeated colours.
  score += (3 - new Set(tile.colors).size) * 2;

  // Wild tiles are useful, so avoid spending them when ordinary options exist.
  if (tile.type === "chameleon") score -= 1.5;

  const [dx, dy] = move.dir === 0 ? [1, 0] : [0, 1];
  const insertedKeys = [];

  for (let i = 0; i < 3; i++) {
    const x = move.x + dx * i;
    const y = move.y + dy * i;
    const key = `${x},${y}`;

    game.board.set(key, { color: tile.colors[i], tileId: tile.id });
    insertedKeys.push(key);
  }

  // Reduce the number of legal options left for the next player.
  const nextPlayer = game.players[(game.current + 1) % game.players.length];
  let nextOptions = 0;

  for (const nextTile of nextPlayer.hand) {
    nextOptions += Math.min(game.legalMoves(nextTile).length, 8);
  }

  for (const key of insertedKeys) game.board.delete(key);

  score -= nextOptions * 0.12;

  // Small randomness breaks ties so the AI doesn't repeat the same choices.
  score += Math.random() * 0.25;
  return score;
}
