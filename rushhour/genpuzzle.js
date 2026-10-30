import { ROWS, COLS } from "./render.js";

export const MIN_SCRAMBLE_MOVES = 8;
export const MAX_SCRAMBLE_MOVES = 24;
export const MAX_GENERATION_ATTEMPTS = 40;

// These are solved starting layouts: the target is at the right edge,
// and no other car occupies its exit lane (row 2).
const layouts = [
  [
    { id: "target", row: 2, col: 7, length: 2, dir: "h", color: "red", label: "YOU" },

    { id: "a", row: 0, col: 0, length: 2, dir: "v", color: "yellow" },
    { id: "b", row: 0, col: 2, length: 3, dir: "v", color: "green" },
    { id: "c", row: 0, col: 5, length: 3, dir: "v", color: "blue" },
    { id: "d", row: 3, col: 8, length: 3, dir: "v", color: "purple" },

    { id: "e", row: 4, col: 1, length: 2, dir: "v", color: "orange" },
    { id: "f", row: 4, col: 6, length: 2, dir: "v", color: "teal" },
    { id: "g", row: 4, col: 7, length: 2, dir: "v", color: "pink" },

    { id: "h", row: 3, col: 2, length: 3, dir: "h", color: "yellow" },

    { id: "i", row: 0, col: 3, length: 2, dir: "h", color: "green" },
    { id: "j", row: 1, col: 3, length: 2, dir: "h", color: "blue" },
    { id: "k", row: 4, col: 3, length: 2, dir: "h", color: "purple" },
    { id: "l", row: 5, col: 3, length: 2, dir: "h", color: "orange" },
  ],
  [
    { id: "target", row: 2, col: 7, length: 2, dir: "h", color: "red", label: "YOU" },

    { id: "a", row: 0, col: 0, length: 2, dir: "v", color: "teal" },
    { id: "b", row: 0, col: 4, length: 3, dir: "v", color: "pink" },
    { id: "c", row: 0, col: 6, length: 3, dir: "v", color: "yellow" },
    { id: "d", row: 3, col: 8, length: 3, dir: "v", color: "green" },

    { id: "e", row: 4, col: 1, length: 2, dir: "v", color: "blue" },
    { id: "f", row: 4, col: 6, length: 2, dir: "h", color: "purple" },
    { id: "g", row: 0, col: 7, length: 2, dir: "v", color: "orange" },

    { id: "h", row: 3, col: 2, length: 3, dir: "h", color: "teal" },

    { id: "i", row: 0, col: 2, length: 2, dir: "h", color: "pink" },
    { id: "j", row: 1, col: 2, length: 2, dir: "h", color: "yellow" },
    { id: "k", row: 4, col: 2, length: 2, dir: "h", color: "green" },
    { id: "l", row: 5, col: 2, length: 2, dir: "h", color: "blue" },
  ],
  [
    { id: "target", row: 2, col: 7, length: 2, dir: "h", color: "red", label: "YOU" },

    { id: "a", row: 0, col: 0, length: 2, dir: "v", color: "purple" },
    { id: "b", row: 0, col: 1, length: 2, dir: "v", color: "orange" },
    { id: "c", row: 0, col: 2, length: 2, dir: "v", color: "teal" },
    { id: "d", row: 0, col: 3, length: 3, dir: "v", color: "pink" },
    { id: "e", row: 0, col: 4, length: 2, dir: "v", color: "yellow" },
    { id: "f", row: 0, col: 5, length: 2, dir: "v", color: "green" },
    { id: "g", row: 0, col: 6, length: 3, dir: "v", color: "blue" },
    { id: "h", row: 0, col: 7, length: 2, dir: "v", color: "purple" },

    { id: "i", row: 4, col: 2, length: 2, dir: "v", color: "orange" },
    { id: "j", row: 4, col: 5, length: 2, dir: "v", color: "teal" },
    { id: "k", row: 4, col: 8, length: 2, dir: "v", color: "pink" },

    { id: "l", row: 3, col: 3, length: 3, dir: "h", color: "yellow" },
    { id: "m", row: 4, col: 3, length: 2, dir: "h", color: "green" },
    { id: "n", row: 4, col: 6, length: 2, dir: "h", color: "blue" },
  ],
  [
    { id: "target", row: 2, col: 7, length: 2, dir: "h", color: "red", label: "YOU" },

    { id: "a", row: 0, col: 0, length: 2, dir: "v", color: "purple" },
    { id: "b", row: 0, col: 2, length: 3, dir: "v", color: "orange" },
    { id: "c", row: 0, col: 4, length: 3, dir: "v", color: "teal" },
    { id: "d", row: 3, col: 7, length: 3, dir: "v", color: "pink" },

    { id: "e", row: 3, col: 0, length: 2, dir: "h", color: "yellow" },
    { id: "f", row: 3, col: 3, length: 3, dir: "h", color: "green" },
    { id: "g", row: 0, col: 5, length: 2, dir: "h", color: "blue" },
    { id: "h", row: 1, col: 5, length: 2, dir: "h", color: "purple" },
    { id: "i", row: 4, col: 5, length: 2, dir: "h", color: "orange" },
    { id: "j", row: 5, col: 0, length: 2, dir: "h", color: "teal" },
    { id: "k", row: 5, col: 5, length: 2, dir: "h", color: "pink" },

    { id: "l", row: 0, col: 8, length: 2, dir: "v", color: "yellow" },
    { id: "m", row: 4, col: 8, length: 2, dir: "v", color: "green" },
  ],
  [
    { id: "target", row: 2, col: 7, length: 2, dir: "h", color: "red", label: "YOU" },

    { id: "a", row: 0, col: 2, length: 3, dir: "v", color: "purple" },
    { id: "b", row: 0, col: 3, length: 3, dir: "v", color: "orange" },
    { id: "c", row: 3, col: 7, length: 3, dir: "v", color: "teal" },
    { id: "d", row: 3, col: 8, length: 3, dir: "v", color: "pink" },

    { id: "e", row: 0, col: 0, length: 2, dir: "h", color: "yellow" },
    { id: "f", row: 0, col: 4, length: 2, dir: "h", color: "green" },
    { id: "g", row: 1, col: 4, length: 2, dir: "h", color: "blue" },
    { id: "h", row: 3, col: 0, length: 2, dir: "h", color: "purple" },
    { id: "i", row: 3, col: 3, length: 3, dir: "h", color: "orange" },

    { id: "j", row: 4, col: 0, length: 2, dir: "h", color: "teal" },
    { id: "k", row: 4, col: 3, length: 2, dir: "h", color: "pink" },
    { id: "l", row: 5, col: 0, length: 2, dir: "h", color: "yellow" },
    { id: "m", row: 5, col: 3, length: 2, dir: "h", color: "green" },
  ],
];

export function cloneCars(cars) {
  return cars.map(car => ({ ...car }));
}

export function cellsFor(car, row = car.row, col = car.col) {
  const cells = [];

  for (let i = 0; i < car.length; i += 1) {
    cells.push({
      row: row + (car.dir === "v" ? i : 0),
      col: col + (car.dir === "h" ? i : 0),
    });
  }

  return cells;
}

function canPlace(car, row, col, cars) {
  const occupied = new Set();

  for (const other of cars) {
    if (other.id === car.id) continue;

    for (const cell of cellsFor(other)) {
      occupied.add(`${cell.row},${cell.col}`);
    }
  }

  for (const cell of cellsFor(car, row, col)) {
    if (
      cell.row < 0 ||
      cell.row >= ROWS ||
      cell.col < 0 ||
      cell.col >= COLS ||
      occupied.has(`${cell.row},${cell.col}`)
    ) {
      return false;
    }
  }

  return true;
}

export function legalPositions(car, cars) {
  const positions = [];
  const directions =
    car.dir === "h"
      ? [{ row: 0, col: -1 }, { row: 0, col: 1 }]
      : [{ row: -1, col: 0 }, { row: 1, col: 0 }];

  for (const direction of directions) {
    let row = car.row + direction.row;
    let col = car.col + direction.col;

    while (canPlace(car, row, col, cars)) {
      positions.push({ row, col });
      row += direction.row;
      col += direction.col;
    }
  }

  return positions;
}

function stateKey(cars) {
  return cars.map(car => `${car.row},${car.col}`).join("|");
}

function validateLayout(cars) {
  const occupied = new Set();

  for (const car of cars) {
    for (const cell of cellsFor(car)) {
      if (
        cell.row < 0 ||
        cell.row >= ROWS ||
        cell.col < 0 ||
        cell.col >= COLS
      ) {
        throw new Error(`Car "${car.id}" is outside the board.`);
      }

      const key = `${cell.row},${cell.col}`;
      if (occupied.has(key)) {
        throw new Error(`Cars overlap at ${key}.`);
      }

      occupied.add(key);
    }
  }
}

export function generatePuzzle() {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const cars = cloneCars(layouts[Math.floor(Math.random() * layouts.length)]);
    validateLayout(cars);

    const target = cars.find(car => car.id === "target");

    // Move the target from the right edge to the far left.
    // The solved layouts have a clear target row, so this is legal.
    target.col = 0;

    const seen = new Set([stateKey(cars)]);
    const scrambleLength =
      MIN_SCRAMBLE_MOVES +
      Math.floor(
        Math.random() * (MAX_SCRAMBLE_MOVES - MIN_SCRAMBLE_MOVES + 1)
      );

    let scrambleMoves = 0;

    for (let step = 0; step < scrambleLength; step += 1) {
      const choices = [];

      // Keep the target at the far left while scrambling the other cars.
      for (const car of cars) {
        if (car.id === "target") continue;

        for (const position of legalPositions(car, cars)) {
          const oldRow = car.row;
          const oldCol = car.col;

          car.row = position.row;
          car.col = position.col;

          const key = stateKey(cars);
          if (!seen.has(key)) {
            choices.push({ car, position, key });
          }

          car.row = oldRow;
          car.col = oldCol;
        }
      }

      if (choices.length === 0) break;

      const choice = choices[Math.floor(Math.random() * choices.length)];
      choice.car.row = choice.position.row;
      choice.car.col = choice.position.col;
      seen.add(choice.key);
      scrambleMoves += 1;
    }

    if (scrambleMoves >= MIN_SCRAMBLE_MOVES) {
      return cars;
    }
  }

  // The target is still at the far left; this layout is solvable by
  // sliding it back to the right because its exit lane is clear.
  const fallback = cloneCars(layouts[0]);
  fallback.find(car => car.id === "target").col = 0;
  return fallback;
}
