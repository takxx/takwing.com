const SIZE = 8;
const EMPTY = 0;
const BLACK = 1;
const WHITE = -1;

const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1]
];

const WEIGHTS = [
  [120, -25, 20, 5, 5, 20, -25, 120],
  [-25, -45, -5, -5, -5, -5, -45, -25],
  [20, -5, 15, 3, 3, 15, -5, 20],
  [5, -5, 3, 3, 3, 3, -5, 5],
  [5, -5, 3, 3, 3, 3, -5, 5],
  [20, -5, 15, 3, 3, 15, -5, 20],
  [-25, -45, -5, -5, -5, -5, -45, -25],
  [120, -25, 20, 5, 5, 20, -25, 120]
];

function id(row, col) {
  return `${row},${col}`;
}

function createInitialBoard() {
  const board = new Map();

  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      board.set(id(row, col), EMPTY);
    }
  }

  board.set(id(3, 3), WHITE);
  board.set(id(3, 4), BLACK);
  board.set(id(4, 3), BLACK);
  board.set(id(4, 4), WHITE);

  return board;
}

export function createStandardBoard() {
  const cells = [];

  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      cells.push({ id: id(row, col), row, col });
    }
  }

  const neighbours = new Map();
  const directed = new Map();

  for (const cell of cells) {
    const neighbourIds = [];
    const directionIds = [];

    for (const [dr, dc] of DIRECTIONS) {
      const nextRow = cell.row + dr;
      const nextCol = cell.col + dc;
      const inside =
        nextRow >= 0 && nextRow < SIZE &&
        nextCol >= 0 && nextCol < SIZE;

      if (inside) {
        const nextId = id(nextRow, nextCol);
        neighbourIds.push(nextId);
        directionIds.push(nextId);
      } else {
        directionIds.push(null);
      }
    }

    neighbours.set(cell.id, neighbourIds);
    directed.set(cell.id, directionIds);
  }

  function getFlips(board, cellId, color) {
    const [row, col] = cellId.split(",").map(Number);

    if (board.get(cellId) !== EMPTY) {
      return [];
    }

    const opponent = -color;
    const flips = [];

    for (const [dr, dc] of DIRECTIONS) {
      const line = [];
      let nextRow = row + dr;
      let nextCol = col + dc;

      while (
        nextRow >= 0 && nextRow < SIZE &&
        nextCol >= 0 && nextCol < SIZE &&
        board.get(id(nextRow, nextCol)) === opponent
      ) {
        line.push(id(nextRow, nextCol));
        nextRow += dr;
        nextCol += dc;
      }

      if (
        line.length > 0 &&
        nextRow >= 0 && nextRow < SIZE &&
        nextCol >= 0 && nextCol < SIZE &&
        board.get(id(nextRow, nextCol)) === color
      ) {
        flips.push(...line);
      }
    }

    return flips;
  }

  return {
    variant: "board4",
    cells,
    neighbours,
    directed,
    corners: [id(0, 0), id(0, 7), id(7, 0), id(7, 7)],
    initial: createInitialBoard(),
    getWeight: cellId => {
      const [row, col] = cellId.split(",").map(Number);
      return WEIGHTS[row][col];
    },
    getFlips,
    positionName: cellId => {
      const [row, col] = cellId.split(",").map(Number);
      return `${String.fromCharCode(65 + col)}${row + 1}`;
    },
    geometry: {
      kind: "square",
      cellSize: 80,
      width: SIZE * 80,
      height: SIZE * 80,
      positions: cells.map(cell => ({
        id: cell.id,
        x: cell.col * 80 + 40,
        y: cell.row * 80 + 40
      }))
    }
  };
}

export { EMPTY, BLACK, WHITE };