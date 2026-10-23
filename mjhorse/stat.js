const STORAGE_KEY = "pa-ma-zai-stat";
const PLAYER_COUNT = 4;
const STARTING_CREDITS = 100;

function emptyStats() {
  return {
    credits: Array(PLAYER_COUNT).fill(STARTING_CREDITS),
    records: [],
  };
}

function readStats() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (
      value &&
      Array.isArray(value.credits) &&
      value.credits.length === PLAYER_COUNT &&
      value.credits.every(Number.isFinite) &&
      Array.isArray(value.records)
    ) {
      return {
        credits: [...value.credits],
        records: [...value.records],
      };
    }
  } catch {
    // Invalid or unavailable storage: use fresh stats.
  }

  return emptyStats();
}

function writeStats(stats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch (error) {
    console.warn("Could not save game stats:", error);
  }
}

function validateDeltas(deltas) {
  if (
    !Array.isArray(deltas) ||
    deltas.length !== PLAYER_COUNT ||
    !deltas.every(Number.isFinite)
  ) {
    throw new TypeError("Credit deltas must contain four finite numbers.");
  }
}

function applyDeltas(stats, deltas) {
  stats.credits = stats.credits.map(
    (credits, player) => credits + deltas[player],
  );
}

export function loadStats() {
  return readStats();
}

export function recordRound({ record, deltas }) {
  validateDeltas(deltas);

  const stats = readStats();
  applyDeltas(stats, deltas);
  stats.records.unshift(record);

  writeStats(stats);
  return readStats();
}

export function transferCredits({ deltas }) {
  validateDeltas(deltas);

  const stats = readStats();
  applyDeltas(stats, deltas);
  writeStats(stats);

  return [...stats.credits];
}
