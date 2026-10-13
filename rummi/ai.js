const COLORS = ["pink", "orange", "green", "azure"];
const JOKER_POINTS = 30;

const SEARCH_BUDGET_MS = 2500;
const MAX_REARRANGED_SETS = 3;
const MAX_HAND_TILES_TO_CONSIDER = 8;
const MAX_POOL_TILES = 24;

function expired(deadline) {
  return Date.now() >= deadline;
}

function isConcreteSet(tiles) {
  if (tiles.length < 3 || tiles.length > 13) return false;
  if (tiles.some(tile => tile.joker)) return false;

  const sameValue = tiles.every(tile => tile.value === tiles[0].value);
  if (sameValue) {
    return (
      tiles.length <= COLORS.length &&
      new Set(tiles.map(tile => tile.color)).size === tiles.length
    );
  }

  if (!tiles.every(tile => tile.color === tiles[0].color)) return false;

  const values = tiles.map(tile => tile.value).sort((a, b) => a - b);
  return (
    new Set(values).size === values.length &&
    values.every(
      (value, index) => index === 0 || value === values[index - 1] + 1
    )
  );
}

/**
 * Visit valid interpretations of a meld. Returning true from visit stops
 * enumeration early.
 */
function forEachJokerAssignment(tiles, visit) {
  const jokers = tiles.filter(tile => tile.joker);
  const natural = tiles.filter(tile => !tile.joker);

  // A joker needs at least one natural tile to form a valid meld.
  if (jokers.length > 2 || natural.length === 0) return false;

  function assign(index, completed, assignments) {
    if (index === jokers.length) {
      if (!isConcreteSet(completed)) return false;
      return visit(completed, assignments) === true;
    }

    const joker = jokers[index];

    for (const color of COLORS) {
      for (let value = 1; value <= 13; value++) {
        const replacement = { ...joker, color, value, joker: false };

        if (
          assign(
            index + 1,
            [...completed, replacement],
            [...assignments, { joker, color, value }]
          )
        ) {
          return true;
        }
      }
    }

    return false;
  }

  return assign(0, natural, []);
}

function isValidSet(tiles) {
  if (tiles.length < 3 || tiles.length > 13) return false;

  if (!tiles.some(tile => tile.joker)) {
    return isConcreteSet(tiles);
  }

  return forEachJokerAssignment(tiles, () => true);
}

function handPointsInMeld(meld, handIds) {
  const natural = meld.filter(tile => !tile.joker);

  if (!meld.some(tile => tile.joker)) {
    if (!isConcreteSet(meld)) return -1;

    return natural
      .filter(tile => handIds.has(tile.id))
      .reduce((sum, tile) => sum + tile.value, 0);
  }

  let best = -1;

  forEachJokerAssignment(meld, (_completed, assignments) => {
    let points = natural
      .filter(tile => handIds.has(tile.id))
      .reduce((sum, tile) => sum + tile.value, 0);

    for (const assignment of assignments) {
      if (handIds.has(assignment.joker.id)) {
        points += assignment.value;
      }
    }

    best = Math.max(best, points);
  });

  return best;
}

function choose(items, count, visit, deadline) {
  const chosen = [];

  function walk(start) {
    if (expired(deadline)) return;

    if (chosen.length === count) {
      visit([...chosen]);
      return;
    }

    const needed = count - chosen.length;

    for (let i = start; i <= items.length - needed; i++) {
      if (expired(deadline)) return;

      chosen.push(items[i]);
      walk(i + 1);
      chosen.pop();
    }
  }

  walk(0);
}

function tileSearchScore(tile) {
  // Prioritize jokers, then tiles that are more valuable to play.
  return (tile.joker ? 1000 : 0) + (tile.value || 0);
}

function playIsBetter(candidate, current) {
  if (!current) return true;

  if (candidate.playedIds.size !== current.playedIds.size) {
    return candidate.playedIds.size > current.playedIds.size;
  }

  if (candidate.playedPoints !== current.playedPoints) {
    return candidate.playedPoints > current.playedPoints;
  }

  return candidate.reclaimedJokers > current.reclaimedJokers;
}

export function findComputerPlay(hand, table, hasOpened) {
  const deadline = Date.now() + SEARCH_BUDGET_MS;
  const handIds = new Set(hand.map(tile => tile.id));
  const searchHand = [...hand].sort(
    (a, b) => tileSearchScore(b) - tileSearchScore(a)
  );

  let best = null;

  function openingIsValid(melds) {
    if (hasOpened) return true;

    let points = 0;

    for (const meld of melds) {
      const meldPoints = handPointsInMeld(meld, handIds);
      if (meldPoints < 0) return false;
      points += meldPoints;
    }

    return points >= 30;
  }

  function considerPool(pool, replacedIndexes) {
    if (expired(deadline) || pool.length > MAX_POOL_TILES) return;

    const indexById = new Map(pool.map((tile, index) => [tile.id, index]));
    const meldsByTile = Array.from({ length: pool.length }, () => []);

    // Generate valid melds for this pool.
    for (let size = 3; size <= Math.min(13, pool.length); size++) {
      if (expired(deadline)) return;

      choose(
        pool,
        size,
        meld => {
          if (expired(deadline) || !isValidSet(meld)) return;

          const indexes = meld.map(tile => indexById.get(tile.id));
          const candidate = { tiles: meld, indexes };

          for (const index of indexes) {
            meldsByTile[index].push(candidate);
          }
        },
        deadline
      );
    }

    // When choosing a meld for a tile, try options using hand jokers first.
    for (const candidates of meldsByTile) {
      candidates.sort((a, b) => {
        function priority(candidate) {
          let score = 0;

          for (const tile of candidate.tiles) {
            if (!handIds.has(tile.id)) continue;
            score += tile.joker ? 100 : 1;
          }

          return score;
        }

        return priority(b) - priority(a);
      });
    }

    const used = new Array(pool.length).fill(false);
    const partition = [];

    function searchPartition(usedCount) {
      if (expired(deadline)) return;

      if (usedCount === pool.length) {
        if (!openingIsValid(partition)) return;

        const playedIds = new Set(
          pool.filter(tile => handIds.has(tile.id)).map(tile => tile.id)
        );

        if (playedIds.size === 0) return;

        let playedPoints = 0;

        for (const meld of partition) {
          const points = handPointsInMeld(meld, handIds);
          if (points >= 0) playedPoints += points;
        }

        const replaced = new Set(replacedIndexes);
        const newTable = [
          ...table
            .filter((_, index) => !replaced.has(index))
            .map(set => [...set]),
          ...partition.map(meld => [...meld])
        ];

        const reclaimedJokers = replacedIndexes.reduce(
          (total, index) =>
            total + table[index].filter(tile => tile.joker).length,
          0
        );

        const candidate = {
          table: newTable,
          playedIds,
          playedPoints,
          reclaimedJokers
        };

        if (playIsBetter(candidate, best)) best = candidate;
        return;
      }

      // Pivot on the first unused tile to avoid duplicate partitions.
      let pivot = 0;
      while (used[pivot]) pivot++;

      for (const candidate of meldsByTile[pivot]) {
        if (expired(deadline)) return;
        if (candidate.indexes.some(index => used[index])) continue;

        for (const index of candidate.indexes) used[index] = true;
        partition.push(candidate.tiles);

        searchPartition(usedCount + candidate.indexes.length);

        partition.pop();
        for (const index of candidate.indexes) used[index] = false;
      }
    }

    searchPartition(0);
  }

  // Try new melds from the hand first, with jokers and high-value tiles early.
  for (
    let count = 1;
    count <= Math.min(MAX_HAND_TILES_TO_CONSIDER, searchHand.length);
    count++
  ) {
    if (expired(deadline)) break;

    choose(
      searchHand,
      count,
      selected => considerPool(selected, []),
      deadline
    );
  }

  // Put joker-containing sets first so their rearrangements are searched early.
  const tableIndexes = table
    .map((set, index) => ({
      index,
      containsJoker: set.some(tile => tile.joker)
    }))
    .sort((a, b) => Number(b.containsJoker) - Number(a.containsJoker))
    .map(item => item.index);

  for (
    let setCount = 1;
    setCount <= Math.min(MAX_REARRANGED_SETS, table.length);
    setCount++
  ) {
    if (expired(deadline)) break;

    choose(
      tableIndexes,
      setCount,
      indexes => {
        const boardTiles = indexes.flatMap(index => table[index]);
        if (boardTiles.length >= MAX_POOL_TILES) return;

        const maxHandCount = Math.min(
          MAX_HAND_TILES_TO_CONSIDER,
          searchHand.length,
          MAX_POOL_TILES - boardTiles.length
        );

        for (let handCount = 1; handCount <= maxHandCount; handCount++) {
          if (expired(deadline)) return;

          choose(
            searchHand,
            handCount,
            selectedHandTiles => {
              considerPool(
                [...boardTiles, ...selectedHandTiles],
                indexes
              );
            },
            deadline
          );
        }
      },
      deadline
    );
  }

  return best
    ? { table: best.table, playedIds: best.playedIds }
    : null;
}
