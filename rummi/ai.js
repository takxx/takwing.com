const COLORS = ["pink", "orange", "green", "azure"];
const JOKER_POINTS = 30;

const MAX_REARRANGED_SETS = 3;
const MAX_HAND_TILES_TO_CONSIDER = 8;
const MAX_POOL_TILES = 24;
const SEARCH_BUDGET_MS = 2500;

function isConcreteSet(tiles) {
  if (tiles.length < 3 || tiles.length > 13) return false;
  if (tiles.some(tile => tile.joker)) return false;

  const sameNumber =
    tiles.every(tile => tile.value === tiles[0].value) &&
    new Set(tiles.map(tile => tile.color)).size === tiles.length;

  if (sameNumber) return tiles.length <= COLORS.length;

  if (!tiles.every(tile => tile.color === tiles[0].color)) return false;

  const values = tiles.map(tile => tile.value).sort((a, b) => a - b);

  if (new Set(values).size !== values.length) return false;

  return values.every(
    (value, index) =>
      index === 0 || value === values[index - 1] + 1
  );
}

function forEachJokerAssignment(tiles, visit) {
  const jokers = tiles.filter(tile => tile.joker);
  const natural = tiles.filter(tile => !tile.joker);

  if (jokers.length > 2 || natural.length === 0) return;

  function assign(index, completed, assignments) {
    if (index === jokers.length) {
      if (isConcreteSet(completed)) {
        visit(completed, assignments);
      }
      return;
    }

    const joker = jokers[index];

    for (const color of COLORS) {
      for (let value = 1; value <= 13; value++) {
        const replacement = {
          ...joker,
          color,
          value,
          joker: false
        };

        assign(
          index + 1,
          [...completed, replacement],
          [...assignments, { joker, color, value }]
        );
      }
    }
  }

  assign(0, natural, []);
}

function isValidSet(tiles) {
  if (tiles.length < 3 || tiles.length > 13) return false;

  if (!tiles.some(tile => tile.joker)) {
    return isConcreteSet(tiles);
  }

  let valid = false;
  forEachJokerAssignment(tiles, () => {
    valid = true;
  });

  return valid;
}

/**
 * Returns the best score contributed by tiles in handIds to this meld.
 * A joker in the hand scores the value it represents in the meld.
 */
function handPointsInMeld(meld, handIds) {
  const jokers = meld.filter(tile => tile.joker);
  const natural = meld.filter(tile => !tile.joker);

  if (jokers.length === 0) {
    if (!isConcreteSet(meld)) return -1;

    return natural
      .filter(tile => handIds.has(tile.id))
      .reduce((sum, tile) => sum + tile.value, 0);
  }

  let best = -1;

  forEachJokerAssignment(meld, (_completed, assignments) => {
    let score = natural
      .filter(tile => handIds.has(tile.id))
      .reduce((sum, tile) => sum + tile.value, 0);

    for (const assignment of assignments) {
      if (handIds.has(assignment.joker.id)) {
        score += assignment.value;
      }
    }

    best = Math.max(best, score);
  });

  return best;
}

function handPoints(tile) {
  return tile.joker ? JOKER_POINTS : tile.value;
}

function expired(deadline) {
  return Date.now() >= deadline;
}

function choose(items, count, visit, deadline) {
  const selected = [];

  function walk(start) {
    if (expired(deadline)) return;

    if (selected.length === count) {
      visit([...selected]);
      return;
    }

    const needed = count - selected.length;

    for (let i = start; i <= items.length - needed; i++) {
      if (expired(deadline)) return;

      selected.push(items[i]);
      walk(i + 1);
      selected.pop();
    }
  }

  walk(0);
}

export function findComputerPlay(hand, table, hasOpened) {
  const deadline = Date.now() + SEARCH_BUDGET_MS;
  const handIds = new Set(hand.map(tile => tile.id));
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

    const indexById = new Map(
      pool.map((tile, index) => [tile.id, index])
    );

    const meldsByTile = Array.from({ length: pool.length }, () => []);
    let generationStopped = false;

    // Generate every valid meld candidate from this pool.
    for (let size = 3; size <= Math.min(13, pool.length); size++) {
      choose(
        pool,
        size,
        meld => {
          if (expired(deadline)) {
            generationStopped = true;
            return;
          }

          if (!isValidSet(meld)) return;

          const indexes = meld.map(tile => indexById.get(tile.id));
          const candidate = { tiles: meld, indexes };

          for (const index of indexes) {
            meldsByTile[index].push(candidate);
          }
        },
        deadline
      );

      if (generationStopped || expired(deadline)) break;
    }

    const used = new Array(pool.length).fill(false);
    const partition = [];

    function searchPartition(usedCount) {
      if (expired(deadline)) return;

      if (usedCount === pool.length) {
        if (!openingIsValid(partition)) return;

        const playedIds = new Set(
          pool
            .filter(tile => handIds.has(tile.id))
            .map(tile => tile.id)
        );

        if (playedIds.size === 0) return;

        const playedPoints = pool
          .filter(tile => playedIds.has(tile.id))
          .reduce((sum, tile) => sum + handPoints(tile), 0);

        if (
          !best ||
          playedIds.size > best.playedIds.size ||
          (playedIds.size === best.playedIds.size &&
            playedPoints > best.playedPoints)
        ) {
          const replaced = new Set(replacedIndexes);

          const newTable = table
            .filter((_, index) => !replaced.has(index))
            .map(set => [...set]);

          for (const meld of partition) {
            newTable.push([...meld]);
          }

          best = {
            table: newTable,
            playedIds,
            playedPoints
          };
        }

        return;
      }

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

  // First try new melds made entirely from hand tiles.
  for (
    let count = 1;
    count <= Math.min(MAX_HAND_TILES_TO_CONSIDER, hand.length);
    count++
  ) {
    if (expired(deadline)) break;

    choose(
      hand,
      count,
      selected => considerPool(selected, []),
      deadline
    );
  }

  // Then try rearranging one or two existing table sets.
  for (
    let setCount = 1;
    setCount <= Math.min(MAX_REARRANGED_SETS, table.length);
    setCount++
  ) {
    if (expired(deadline)) break;

    choose(
      table.map((_, index) => index),
      setCount,
      indexes => {
        const boardTiles = indexes.flatMap(index => table[index]);

        if (boardTiles.length >= MAX_POOL_TILES) return;

        const maxHandCount = Math.min(
          MAX_HAND_TILES_TO_CONSIDER,
          hand.length,
          MAX_POOL_TILES - boardTiles.length
        );

        for (let handCount = 1; handCount <= maxHandCount; handCount++) {
          if (expired(deadline)) return;

          choose(
            hand,
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
