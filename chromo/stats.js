const KEY = "doc-record";

export function getRecord() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return {
      wins: Number(saved?.wins) || 0,
      losses: Number(saved?.losses) || 0
    };
  } catch {
    return { wins: 0, losses: 0 };
  }
}

export function recordResult(won) {
  const record = getRecord();

  if (won) {
    record.wins++;
  } else {
    record.losses++;
  }

  try {
    localStorage.setItem(KEY, JSON.stringify(record));
  } catch {
    // The current session can still display the updated record.
  }

  return record;
}
