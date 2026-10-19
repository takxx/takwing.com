const EMPTY = 0;
const BLACK = 1;
const WHITE = -1;

const RADIUS = 4;
const DIRECTIONS = [
  [1, 0], [1, -1], [0, -1],
  [-1, 0], [-1, 1], [0, 1]
];

function id(q, r) {
  return `${q},${r}`;
}

function createCellList() {
  const cells = [];

  for (let r = -RADIUS; r <= RADIUS; r += 1) {
    const start = Math.max(-RADIUS, -r - RADIUS);
    const end = Math.min(RADIUS, RADIUS - r);

    for (let q = start; q <= end; q += 1) {
      cells.push({ id: id(q, r), q, r });
    }
  }

  return cells;
}

function createInitialBoard(cells) {
  const board = new Map();
  cells.forEach(cell => board.set(cell.id, EMPTY));

  board.set(id(0, 0), WHITE);

  const centreNeighbours = DIRECTIONS.map(
    ([dq, dr]) => id(dq, dr)
  );

  centreNeighbours.forEach((cellId, index) => {
    board.set(cellId, index % 2 === 0 ? BLACK : WHITE);
  });

  return board;
}

export function createHexagonalBoard() {
  const cells = createCellList();
  const cellMap = new Map(cells.map(cell => [cell.id, cell]));
  const neighbours = new Map();
  const directed = new Map();

  for (const cell of cells) {
    const neighbourIds = [];
    const directionIds = [];

    for (const [dq, dr] of DIRECTIONS) {
      const nextId = id(cell.q + dq, cell.r + dr);

      if (cellMap.has(nextId)) {
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
    if (board.get(cellId) !== EMPTY) {
      return [];
    }

    const [q, r] = cellId.split(",").map(Number);
    const opponent = -color;
    const flips = [];

    for (const [dq, dr] of DIRECTIONS) {
      const line = [];
      let nextQ = q + dq;
      let nextR = r + dr;
      let nextId = id(nextQ, nextR);

      while (cellMap.has(nextId) && board.get(nextId) === opponent) {
        line.push(nextId);
        nextQ += dq;
        nextR += dr;
        nextId = id(nextQ, nextR);
      }

      if (
        line.length > 0 &&
        cellMap.has(nextId) &&
        board.get(nextId) === color
      ) {
        flips.push(...line);
      }
    }

    return flips;
  }

  const corners = [
    id(-RADIUS, 0), id(0, -RADIUS),
    id(RADIUS, -RADIUS), id(RADIUS, 0),
    id(0, RADIUS), id(-RADIUS, RADIUS)
  ];

  return {
    variant: "board6",
    cells,
    neighbours,
    directed,
    corners,
    initial: createInitialBoard(cells),
    getWeight: cellId => {
      const [q, r] = cellId.split(",").map(Number);
      const distance = (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
      return corners.includes(cellId) ? 120 : 24 - distance * 4;
    },
    getFlips,
    positionName: cellId => {
      const [q, r] = cellId.split(",").map(Number);
      return `${String.fromCharCode(65 + q + RADIUS)}${r + RADIUS + 1}`;
    },
    geometry: {
      kind: "hex",
      cellSize: 42,
      positions: cells.map(cell => ({
        id: cell.id,
        x: 42 * Math.sqrt(3) * (cell.q + cell.r / 2),
        y: 42 * 1.5 * cell.r
      }))
    }
  };
}

export { EMPTY, BLACK, WHITE };