"use strict";

/* =========================================================
   DOM
   ========================================================= */

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

const sizeControl = document.getElementById("size");
const newButton = document.getElementById("new");
const resetButton = document.getElementById("reset");
const undoButton = document.getElementById("undo");
const redoButton = document.getElementById("redo");
const statusElement = document.getElementById("status");
const languageSelect = document.getElementById("language");

/* =========================================================
   Constants
   ========================================================= */

const EMPTY = 0;
const BACKSLASH = 1;
const SLASH = 2;

const COLORS = {
  background: "#111923",
  grid: "#405066",
  diagonal: "#f4f7ff",
  node: "#347fa5",
  complete: "#35a962",
  invalid: "#ff5572",
  text: "#ffffff"
};

let boardSize = Number(sizeControl?.value) || 15;
let board = [];
let solution = [];
let clues = [];

let history = [];
let historyIndex = -1;
const maxHistory = 200;

let canvasSize = 0;
let cellSize = 0;
let deviceScale = 1;
let boardOrigin = 0;

/* =========================================================
   Translations
   ========================================================= */

const TRANSLATIONS = {
  en: {
    puzzleTitle: "Slant",
    sizeLabel: "Board size:",
    newButton: "New puzzle",
    resetButton: "Reset",
    instruction: "Click on squares to place or clear slants.",
    rulesTitle: "Rules",
    rulesList: [
      "Draw exactly one diagonal in every square.",
      "No diagonal may form a closed loop.",
      "The number at each node shows how many diagonals touch that node."
    ],
    languageLabel: "Language:",

    // Status messages
    generating: "Generating puzzle…",
    solved: "Solved!",
    hasViolation: "There is a rule violation.",
    noViolations: "No current rule violations."
  },

  es: {
    puzzleTitle: "Diagonales",
    sizeLabel: "Tamaño del tablero:",
    newButton: "Nuevo puzzle",
    resetButton: "Reiniciar",
    instruction: "Haz clic en los cuadros para colocar o borrar las diagonales.",
    rulesTitle: "Reglas",
    rulesList: [
      "Dibuja exactamente una diagonal en cada cuadro.",
      "Ninguna diagonal puede formar un bucle cerrado.",
      "El número en cada nodo indica cuántas diagonales tocan ese nodo."
    ],
    languageLabel: "Idioma:",

    // Status messages
    generating: "Generando puzzle…",
    solved: "¡Resuelto!",
    hasViolation: "Hay una violación de las reglas.",
    noViolations: "No hay violaciones de reglas actualmente."
  },

  "zh-Hant": {
    puzzleTitle: "斜線謎題",
    sizeLabel: "棋盤大小：",
    newButton: "新謎題",
    resetButton: "重設",
    instruction: "點擊方格以放置或清除斜線。",
    rulesTitle: "規則",
    rulesList: [
      "每個方格必須畫恰好一條斜線。",
      "任何斜線都不能形成閉合迴路。",
      "每個節點的數字表示有幾條斜線連接到該節點。"
    ],
    languageLabel: "語言：",

    // Status messages
    generating: "正在生成謎題…",
    solved: "已解開！",
    hasViolation: "有違規情況。",
    noViolations: "目前沒有違規。"
  }
};

/* =========================================================
   General helpers
   ========================================================= */

function makeGrid(rows, columns, value = EMPTY) {
  return Array.from(
    { length: rows },
    () => Array(columns).fill(value)
  );
}

function copyGrid(grid) {
  return grid.map(row => row.slice());
}

function shuffle(array) {
  for (let index = array.length - 1; index > 0; index--) {
    const other =
      Math.floor(Math.random() * (index + 1));

    [array[index], array[other]] =
      [array[other], array[index]];
  }

  return array;
}

function gridsEqual(first, second) {
  if (!first || !second) {
    return false;
  }

  if (first.length !== second.length) {
    return false;
  }

  for (let row = 0; row < first.length; row++) {
    if (first[row].length !== second[row].length) {
      return false;
    }

    for (let column = 0; column < first[row].length; column++) {
      if (first[row][column] !== second[row][column]) {
        return false;
      }
    }
  }

  return true;
}

function cellKey(row, column) {
  return `${row},${column}`;
}

function nodeKey(row, column) {
  return `${row},${column}`;
}

function nodeId(row, column) {
  return row * (boardSize + 1) + column;
}

/* =========================================================
   Disjoint set
   ========================================================= */

class DisjointSet {
  constructor(size) {
    this.parent = Array.from(
      { length: size },
      (_, index) => index
    );

    this.rank = Array(size).fill(0);
  }

  find(value) {
    if (this.parent[value] !== value) {
      this.parent[value] =
        this.find(this.parent[value]);
    }

    return this.parent[value];
  }

  union(first, second) {
    let rootA = this.find(first);
    let rootB = this.find(second);

    if (rootA === rootB) {
      return false;
    }

    if (this.rank[rootA] < this.rank[rootB]) {
      [rootA, rootB] = [rootB, rootA];
    }

    this.parent[rootB] = rootA;

    if (this.rank[rootA] === this.rank[rootB]) {
      this.rank[rootA]++;
    }

    return true;
  }
}

/* =========================================================
   Board geometry
   ========================================================= */

function diagonalEndpoints(row, column, type) {
  if (type === BACKSLASH) {
    return [
      nodeId(row, column),
      nodeId(row + 1, column + 1)
    ];
  }

  return [
    nodeId(row, column + 1),
    nodeId(row + 1, column)
  ];
}

function adjacentCells(nodeRow, nodeColumn) {
  const cells = [];

  if (nodeRow > 0 && nodeColumn > 0) {
    cells.push({
      row: nodeRow - 1,
      column: nodeColumn - 1
    });
  }

  if (nodeRow > 0 && nodeColumn < boardSize) {
    cells.push({
      row: nodeRow - 1,
      column: nodeColumn
    });
  }

  if (nodeRow < boardSize && nodeColumn > 0) {
    cells.push({
      row: nodeRow,
      column: nodeColumn - 1
    });
  }

  if (nodeRow < boardSize && nodeColumn < boardSize) {
    cells.push({
      row: nodeRow,
      column: nodeColumn
    });
  }

  return cells;
}

function touchingOrientation(
  cellRow,
  cellColumn,
  nodeRow,
  nodeColumn
) {
  if (
    cellRow === nodeRow - 1 &&
    cellColumn === nodeColumn - 1
  ) {
    return BACKSLASH;
  }

  if (
    cellRow === nodeRow - 1 &&
    cellColumn === nodeColumn
  ) {
    return SLASH;
  }

  if (
    cellRow === nodeRow &&
    cellColumn === nodeColumn - 1
  ) {
    return SLASH;
  }

  return BACKSLASH;
}

function touchesNode(
  cellRow,
  cellColumn,
  type,
  nodeRow,
  nodeColumn
) {
  return type === touchingOrientation(
    cellRow,
    cellColumn,
    nodeRow,
    nodeColumn
  );
}

function countNodeConnections(
  state,
  nodeRow,
  nodeColumn
) {
  let count = 0;

  for (const cell of adjacentCells(nodeRow, nodeColumn)) {
    const value =
      state[cell.row][cell.column];

    if (
      value !== EMPTY &&
      touchesNode(
        cell.row,
        cell.column,
        value,
        nodeRow,
        nodeColumn
      )
    ) {
      count++;
    }
  }

  return count;
}

/* =========================================================
   Loop detection
   ========================================================= */

function hasLoop(state) {
  const pointCount =
    (boardSize + 1) * (boardSize + 1);

  const dsu =
    new DisjointSet(pointCount);

  for (let row = 0; row < boardSize; row++) {
    for (let column = 0; column < boardSize; column++) {
      const value =
        state[row][column];

      if (value === EMPTY) {
        continue;
      }

      const endpoints =
        diagonalEndpoints(
          row,
          column,
          value
        );

      if (
        dsu.find(endpoints[0]) ===
        dsu.find(endpoints[1])
      ) {
        return true;
      }

      dsu.union(
        endpoints[0],
        endpoints[1]
      );
    }
  }

  return false;
}

function findLoopCells(state) {
  const pointCount =
    (boardSize + 1) * (boardSize + 1);

  const adjacency =
    Array.from(
      { length: pointCount },
      () => []
    );

  for (let row = 0; row < boardSize; row++) {
    for (let column = 0; column < boardSize; column++) {
      const value =
        state[row][column];

      if (value === EMPTY) {
        continue;
      }

      const endpoints =
        diagonalEndpoints(
          row,
          column,
          value
        );

      const edge = {
        from: endpoints[0],
        to: endpoints[1],
        row,
        column
      };

      adjacency[edge.from].push(edge);

      adjacency[edge.to].push({
        from: edge.to,
        to: edge.from,
        row,
        column
      });
    }
  }

  const allLoopCells = new Set();
  const visited = Array(pointCount).fill(false);
  const parentNode = Array(pointCount).fill(-1);
  const parentEdge = Array(pointCount).fill(null);

  for (let start = 0; start < pointCount; start++) {
    if (visited[start]) {
      continue;
    }

    visited[start] = true;

    const stack = [
      {
        node: start,
        edgeIndex: 0
      }
    ];

    while (stack.length > 0) {
      const currentFrame =
        stack[stack.length - 1];

      const current =
        currentFrame.node;

      const edges =
        adjacency[current];

      if (
        currentFrame.edgeIndex >= edges.length
      ) {
        stack.pop();
        continue;
      }

      const edge =
        edges[currentFrame.edgeIndex];

      currentFrame.edgeIndex++;

      const next =
        edge.to;

      const cameFromEdge =
        parentEdge[current];

      if (
        cameFromEdge &&
        cameFromEdge.row === edge.row &&
        cameFromEdge.column === edge.column
      ) {
        continue;
      }

      if (!visited[next]) {
        visited[next] = true;
        parentNode[next] = current;
        parentEdge[next] = edge;

        stack.push({
          node: next,
          edgeIndex: 0
        });

        continue;
      }

      const cycle =
        collectCycleCells(
          current,
          next,
          edge,
          parentNode,
          parentEdge
        );

      for (const key of cycle) {
        allLoopCells.add(key);
      }
    }
  }

  return allLoopCells;
}

function collectCycleCells(
  firstNode,
  secondNode,
  closingEdge,
  parentNode,
  parentEdge
) {
  const firstPath = [];
  const secondPath = [];

  let cursor = firstNode;

  while (cursor !== -1) {
    firstPath.push({
      node: cursor,
      edge: parentEdge[cursor]
    });

    cursor =
      parentNode[cursor];
  }

  cursor = secondNode;

  while (cursor !== -1) {
    secondPath.push({
      node: cursor,
      edge: parentEdge[cursor]
    });

    cursor =
      parentNode[cursor];
  }

  firstPath.reverse();
  secondPath.reverse();

  let commonLength = 0;

  while (
    commonLength < firstPath.length &&
    commonLength < secondPath.length &&
    firstPath[commonLength].node ===
      secondPath[commonLength].node
  ) {
    commonLength++;
  }

  const cycle = new Set();

  for (
    let index = commonLength;
    index < firstPath.length;
    index++
  ) {
    const edge =
      firstPath[index].edge;

    if (edge) {
      cycle.add(
        cellKey(edge.row, edge.column)
      );
    }
  }

  for (
    let index = commonLength;
    index < secondPath.length;
    index++
  ) {
    const edge =
      secondPath[index].edge;

    if (edge) {
      cycle.add(
        cellKey(edge.row, edge.column)
      );
    }
  }

  cycle.add(
    cellKey(
      closingEdge.row,
      closingEdge.column
    )
  );

  return cycle;
}

/* =========================================================
   Solution generation
   ========================================================= */

function generateLoopFreeSolution() {
  for (let attempt = 0; attempt < 80; attempt++) {
    const candidate =
      makeGrid(boardSize, boardSize);

    const dsu =
      new DisjointSet(
        (boardSize + 1) * (boardSize + 1)
      );

    const cells = [];

    for (let row = 0; row < boardSize; row++) {
      for (let column = 0; column < boardSize; column++) {
        cells.push({ row, column });
      }
    }

    shuffle(cells);

    let failed = false;

    for (const cell of cells) {
      const orientations =
        Math.random() < 0.5
          ? [BACKSLASH, SLASH]
          : [SLASH, BACKSLASH];

      let placed = false;

      for (const orientation of orientations) {
        const endpoints =
          diagonalEndpoints(
            cell.row,
            cell.column,
            orientation
          );

        if (
          dsu.find(endpoints[0]) !==
          dsu.find(endpoints[1])
        ) {
          candidate[cell.row][cell.column] =
            orientation;

          dsu.union(
            endpoints[0],
            endpoints[1]
          );

          placed = true;
          break;
        }
      }

      if (!placed) {
        failed = true;
        break;
      }
    }

    if (!failed) {
      return candidate;
    }
  }

  return generateFallbackSolution();
}

function generateFallbackSolution() {
  const fallback =
    makeGrid(boardSize, boardSize);

  for (let row = 0; row < boardSize; row++) {
    for (let column = 0; column < boardSize; column++) {
      fallback[row][column] =
        (row + column) % 2 === 0
          ? BACKSLASH
          : SLASH;
    }
  }

  return fallback;
}

function calculateAllClues(solutionState) {
  const result =
    makeGrid(
      boardSize + 1,
      boardSize + 1,
      null
    );

  for (let row = 0; row <= boardSize; row++) {
    for (let column = 0; column <= boardSize; column++) {
      result[row][column] =
        countNodeConnections(
          solutionState,
          row,
          column
        );
    }
  }

  return result;
}

function allNodePositions() {
  const positions = [];

  for (let row = 0; row <= boardSize; row++) {
    for (let column = 0; column <= boardSize; column++) {
      positions.push({ row, column });
    }
  }

  positions.sort((first, second) => {
    const firstDegree =
      adjacentCells(
        first.row,
        first.column
      ).length;

    const secondDegree =
      adjacentCells(
        second.row,
        second.column
      ).length;

    return secondDegree - firstDegree;
  });

  return positions;
}

function chooseInitialClues(
  positions,
  fullClues
) {
  const selected = [];

  const density =
    boardSize >= 25 ? 0.34 :
    boardSize >= 20 ? 0.28 :
    0.22;

  const target =
    Math.ceil(positions.length * density);

  for (
    let index = 0;
    index < positions.length &&
    selected.length < target;
    index++
  ) {
    const position =
      positions[index];

    const spread =
      (position.row + position.column) % 3;

    if (
      spread !== 1 ||
      selected.length < target * 0.35
    ) {
      selected.push(position);
    }
  }

  return selected;
}

function createPuzzle() {
  solution =
    generateLoopFreeSolution();

  const fullClues =
    calculateAllClues(solution);

  clues =
    makeGrid(
      boardSize + 1,
      boardSize + 1,
      null
    );

  const positions =
    allNodePositions();

  const selected =
    chooseInitialClues(
      positions,
      fullClues
    );

  for (const position of selected) {
    clues[position.row][position.column] =
      fullClues[position.row][position.column];
  }

  let result =
    fastUniquenessCheck(
      clues,
      solution
    );

  let cursor = 0;

  while (
    !result.unique &&
    cursor < positions.length
  ) {
    const batchSize =
      boardSize >= 25 ? 18 :
      boardSize >= 20 ? 12 :
      8;

    for (
      let count = 0;
      count < batchSize &&
      cursor < positions.length;
      count++
    ) {
      const position =
        positions[cursor++];

      if (
        clues[position.row][position.column] === null
      ) {
        clues[position.row][position.column] =
          fullClues[position.row][position.column];
      }
    }

    result =
      fastUniquenessCheck(
        clues,
        solution
      );
  }

  if (!result.unique) {
    completePuzzleWithFallback(
      positions,
      fullClues
    );
  }

  if (boardSize <= 20) {
    pruneFast(
      positions,
      solution
    );
  }

  board =
    makeGrid(
      boardSize,
      boardSize
    );
}

function completePuzzleWithFallback(
  positions,
  fullClues
) {
  for (const position of positions) {
    if (
      clues[position.row][position.column] === null
    ) {
      clues[position.row][position.column] =
        fullClues[position.row][position.column];
    }
  }
}

/* =========================================================
   Solver
   ========================================================= */

function fastUniquenessCheck(
  currentClues,
  knownSolution
) {
  const result =
    collectSolutions(
      currentClues,
      2,
      boardSize >= 25
        ? 250000
        : 500000,
      boardSize >= 25
        ? 700
        : 1200
    );

  return {
    unique:
      result.complete &&
      result.solutions.length === 1 &&
      gridsEqual(
        result.solutions[0],
        knownSolution
      ),
    complete: result.complete,
    result
  };
}

function pruneFast(
  positions,
  knownSolution
) {
  const maximumAttempts =
    boardSize >= 20
      ? 20
      : 50;

  let attempts = 0;

  for (const position of positions) {
    if (attempts >= maximumAttempts) {
      break;
    }

    if (
      clues[position.row][position.column] === null
    ) {
      continue;
    }

    const oldValue =
      clues[position.row][position.column];

    clues[position.row][position.column] =
      null;

    const result =
      fastUniquenessCheck(
        clues,
        knownSolution
      );

    attempts++;

    if (!result.unique) {
      clues[position.row][position.column] =
        oldValue;
    }
  }
}

function collectSolutions(
  currentClues,
  limit = 2,
  nodeLimit = Infinity,
  timeLimit = Infinity
) {
  const solutions = [];
  const startTime = performance.now();

  let nodesVisited = 0;
  let timedOut = false;

  function search(state) {
    if (
      solutions.length >= limit ||
      timedOut
    ) {
      return;
    }

    nodesVisited++;

    if (
      nodesVisited > nodeLimit ||
      performance.now() - startTime > timeLimit
    ) {
      timedOut = true;
      return;
    }

    if (
      !propagate(
        state,
        currentClues
      )
    ) {
      return;
    }

    if (isComplete(state)) {
      if (
        isValidComplete(
          state,
          currentClues
        ) &&
        !solutions.some(existing =>
          gridsEqual(existing, state)
        )
      ) {
        solutions.push(
          copyGrid(state)
        );
      }

      return;
    }

    const cell =
      chooseMostConstrainedCell(
        state,
        currentClues
      );

    if (!cell) {
      return;
    }

    const values =
      [BACKSLASH, SLASH];

    if (Math.random() < 0.5) {
      values.reverse();
    }

    for (const value of values) {
      const next =
        copyGrid(state);

      next[cell.row][cell.column] =
        value;

      search(next);

      if (
        solutions.length >= limit ||
        timedOut
      ) {
        return;
      }
    }
  }

  search(
    makeGrid(
      boardSize,
      boardSize
    )
  );

  return {
    solutions,
    complete: !timedOut,
    nodesVisited
  };
}

function propagate(state, currentClues) {
  let changed = true;

  while (changed) {
    changed = false;

    for (let row = 0; row <= boardSize; row++) {
      for (let column = 0; column <= boardSize; column++) {
        const clue =
          currentClues[row][column];

        if (clue === null) {
          continue;
        }

        const neighbours =
          adjacentCells(row, column);

        let connected = 0;
        const unknown = [];

        for (const cell of neighbours) {
          const value =
            state[cell.row][cell.column];

          if (value === EMPTY) {
            unknown.push(cell);
          } else if (
            touchesNode(
              cell.row,
              cell.column,
              value,
              row,
              column
            )
          ) {
            connected++;
          }
        }

        if (
          connected > clue ||
          connected + unknown.length < clue
        ) {
          return false;
        }

        if (connected === clue) {
          for (const cell of unknown) {
            const forbidden =
              touchingOrientation(
                cell.row,
                cell.column,
                row,
                column
              );

            const allowed =
              forbidden === BACKSLASH
                ? SLASH
                : BACKSLASH;

            if (
              !assignForced(
                state,
                cell.row,
                cell.column,
                allowed
              )
            ) {
              return false;
            }

            changed = true;
          }
        } else if (
          connected + unknown.length === clue
        ) {
          for (const cell of unknown) {
            const required =
              touchingOrientation(
                cell.row,
                cell.column,
                row,
                column
              );

            if (
              !assignForced(
                state,
                cell.row,
                cell.column,
                required
              )
            ) {
              return false;
            }

            changed = true;
          }
        }
      }
    }

    if (hasLoop(state)) {
      return false;
    }
  }

  return true;
}

function assignForced(
  state,
  row,
  column,
  value
) {
  if (state[row][column] === EMPTY) {
    state[row][column] = value;

    return !hasLoop(state);
  }

  return state[row][column] === value;
}

function isComplete(state) {
  return state.every(row =>
    row.every(value => value !== EMPTY)
  );
}

function isValidComplete(
  state,
  currentClues
) {
  if (hasLoop(state)) {
    return false;
  }

  for (let row = 0; row <= boardSize; row++) {
    for (let column = 0; column <= boardSize; column++) {
      const clue =
        currentClues[row][column];

      if (
        clue !== null &&
        countNodeConnections(
          state,
          row,
          column
        ) !== clue
      ) {
        return false;
      }
    }
  }

  return true;
}

function chooseMostConstrainedCell(
  state,
  currentClues
) {
  let best = null;
  let bestScore = -1;

  for (let row = 0; row < boardSize; row++) {
    for (let column = 0; column < boardSize; column++) {
      if (
        state[row][column] !== EMPTY
      ) {
        continue;
      }

      let nearbyClues = 0;
      let filledNeighbours = 0;

      const nodes = [
        [row, column],
        [row + 1, column],
        [row, column + 1],
        [row + 1, column + 1]
      ];

      for (const [nodeRow, nodeColumn] of nodes) {
        if (
          currentClues[nodeRow][nodeColumn] !== null
        ) {
          nearbyClues++;
        }
      }

      const neighbours = [
        [row - 1, column],
        [row + 1, column],
        [row, column - 1],
        [row, column + 1]
      ];

      for (const [
        neighbourRow,
        neighbourColumn
      ] of neighbours) {
        if (
          neighbourRow >= 0 &&
          neighbourRow < boardSize &&
          neighbourColumn >= 0 &&
          neighbourColumn < boardSize &&
          state[neighbourRow][neighbourColumn] !== EMPTY
        ) {
          filledNeighbours++;
        }
      }

      const score =
        nearbyClues * 10 +
        filledNeighbours;

      if (score > bestScore) {
        bestScore = score;
        best = {
          row,
          column
        };
      }
    }
  }

  return best;
}

/* =========================================================
   Canvas sizing and drawing
   ========================================================= */

function getMaxBoardSize() {
  const calculatedSize =
    200 + boardSize * 50;

  const horizontalPadding = 32;

  const availableWidth =
    Math.max(
      1,
      document.documentElement.clientWidth -
        horizontalPadding
    );

  return Math.min(
    calculatedSize,
    availableWidth
  );
}

function getNodeRadius() {
  return Math.max(
    9,
    cellSize * 0.26
  );
}

function resizeCanvas() {
  canvasSize =
    Math.floor(
      getMaxBoardSize()
    );

  canvas.style.width =
    `${canvasSize}px`;

  canvas.style.height =
    `${canvasSize}px`;

  deviceScale =
    window.devicePixelRatio || 1;

  canvas.width =
    Math.floor(
      canvasSize * deviceScale
    );

  canvas.height =
    Math.floor(
      canvasSize * deviceScale
    );

  ctx.setTransform(
    deviceScale,
    0,
    0,
    deviceScale,
    0,
    0
  );

  const nominalCellSize =
    canvasSize / boardSize;

  const radius =
    Math.max(
      9,
      nominalCellSize * 0.26
    );

  const usableSize =
    canvasSize - 2 * radius;

  cellSize =
    usableSize / boardSize;

  boardOrigin = radius;
}

function draw(highlights) {
  ctx.clearRect(
    0,
    0,
    canvasSize,
    canvasSize
  );

  ctx.fillStyle =
    COLORS.background;

  ctx.fillRect(
    0,
    0,
    canvasSize,
    canvasSize
  );

  drawGrid();
  drawDiagonals(highlights.loopCells);
  drawNodes(highlights);
}

function drawGrid() {
  ctx.strokeStyle =
    COLORS.grid;

  ctx.lineWidth =
    Math.max(
      1,
      cellSize * 0.018
    );

  for (
    let index = 0;
    index <= boardSize;
    index++
  ) {
    const position =
      boardOrigin + index * cellSize;

    drawLine(
      position,
      boardOrigin,
      position,
      boardOrigin + boardSize * cellSize
    );

    drawLine(
      boardOrigin,
      position,
      boardOrigin + boardSize * cellSize,
      position
    );
  }
}

function drawDiagonals(loopCells) {
  for (let row = 0; row < boardSize; row++) {
    for (let column = 0; column < boardSize; column++) {
      const value =
        board[row][column];

      if (value === EMPTY) {
        continue;
      }

      const x =
        boardOrigin + column * cellSize;

      const y =
        boardOrigin + row * cellSize;

      const padding =
        cellSize * 0.18;

      const inLoop =
        loopCells.has(
          cellKey(row, column)
        );

      ctx.strokeStyle =
        inLoop
          ? COLORS.invalid
          : COLORS.diagonal;

      ctx.lineWidth =
        inLoop
          ? Math.max(
              3,
              cellSize * 0.075
            )
          : Math.max(
              2,
              cellSize * 0.055
            );

      ctx.lineCap = "round";

      if (value === BACKSLASH) {
        drawLine(
          x + padding,
          y + padding,
          x + cellSize - padding,
          y + cellSize - padding
        );
      } else {
        drawLine(
          x + cellSize - padding,
          y + padding,
          x + padding,
          y + cellSize - padding
        );
      }
    }
  }
}

function drawNodes(highlights) {
  const radius =
    getNodeRadius();

  for (let row = 0; row <= boardSize; row++) {
    for (let column = 0; column <= boardSize; column++) {
      const x =
        boardOrigin + column * cellSize;

      const y =
        boardOrigin + row * cellSize;

      const key =
        nodeKey(row, column);

      const clue =
        clues[row][column];

      let color =
        COLORS.node;

      if (
        highlights.badNodes.has(key)
      ) {
        color =
          COLORS.invalid;
      } else if (
        highlights.completeNodes.has(key)
      ) {
        color =
          COLORS.complete;
      }

      ctx.beginPath();

      ctx.arc(
        x,
        y,
        radius,
        0,
        Math.PI * 2
      );

      ctx.fillStyle =
        color;

      ctx.fill();

      if (clue !== null) {
        ctx.fillStyle =
          COLORS.text;

        ctx.font =
          `800 ${Math.max(
            12,
            cellSize * 0.28
          )}px system-ui`;

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.fillText(
          clue,
          x,
          y
        );
      }
    }
  }
}

function drawLine(
  x1,
  y1,
  x2,
  y2
) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/* =========================================================
   Highlights and state
   ========================================================= */

function calculateHighlights() {
  const badNodes = new Set();
  const completeNodes = new Set();
  const loopCells = findLoopCells(board);

  for (let row = 0; row <= boardSize; row++) {
    for (let column = 0; column <= boardSize; column++) {
      const neighbours =
        adjacentCells(row, column);

      const complete =
        neighbours.every(cell =>
          board[cell.row][cell.column] !== EMPTY
        );

      if (!complete) {
        continue;
      }

      const actual =
        countNodeConnections(
          board,
          row,
          column
        );

      const clue =
        clues[row][column];

      if (
        clue !== null &&
        actual !== clue
      ) {
        badNodes.add(
          nodeKey(row, column)
        );
      } else {
        completeNodes.add(
          nodeKey(row, column)
        );
      }
    }
  }

  return {
    badNodes,
    completeNodes,
    loopCells
  };
}

function isSolved() {
  return (
    isComplete(board) &&
    isValidComplete(board, clues)
  );
}

function updateDisplay() {
  const highlights =
    calculateHighlights();

  draw(highlights);

  const language =
    languageSelect?.value || "en";

  const translation =
    TRANSLATIONS[language] ||
    TRANSLATIONS.en;

  if (isSolved()) {
    statusElement.textContent =
      translation.solved;

    statusElement.className =
      "good";

    return;
  }

  if (
    highlights.badNodes.size > 0 ||
    highlights.loopCells.size > 0
  ) {
    statusElement.textContent =
      translation.hasViolation;

    statusElement.className =
      "bad";

    return;
  }

  statusElement.textContent =
    translation.noViolations;

  statusElement.className =
    "";
}

/* =========================================================
   Undo and redo
   ========================================================= */

function updateUndoRedoButtons() {
  if (undoButton) {
    undoButton.disabled =
      historyIndex <= 0;
  }

  if (redoButton) {
    redoButton.disabled =
      historyIndex >= history.length - 1;
  }
}

function resetHistory() {
  history = [
    copyGrid(board)
  ];

  historyIndex = 0;

  updateUndoRedoButtons();
}

function saveHistory() {
  const snapshot =
    copyGrid(board);

  if (
    historyIndex >= 0 &&
    gridsEqual(
      history[historyIndex],
      snapshot
    )
  ) {
    updateUndoRedoButtons();
    return;
  }

  history =
    history.slice(
      0,
      historyIndex + 1
    );

  history.push(snapshot);

  if (history.length > maxHistory) {
    history.shift();
  }

  historyIndex =
    history.length - 1;

  updateUndoRedoButtons();
}

function undo() {
  if (historyIndex <= 0) {
    return;
  }

  historyIndex--;

  board =
    copyGrid(
      history[historyIndex]
    );

  updateDisplay();
  updateUndoRedoButtons();
}

function redo() {
  if (
    historyIndex < 0 ||
    historyIndex >= history.length - 1
  ) {
    return;
  }

  historyIndex++;

  board =
    copyGrid(
      history[historyIndex]
    );

  updateDisplay();
  updateUndoRedoButtons();
}

/* =========================================================
   Interaction
   ========================================================= */

function getCellFromPointer(event) {
  const rectangle =
    canvas.getBoundingClientRect();

  const x =
    event.clientX - rectangle.left;

  const y =
    event.clientY - rectangle.top;

  const column =
    Math.floor(
      (x - boardOrigin) / cellSize
    );

  const row =
    Math.floor(
      (y - boardOrigin) / cellSize
    );

  if (
    row < 0 ||
    row >= boardSize ||
    column < 0 ||
    column >= boardSize
  ) {
    return null;
  }

  return {
    row,
    column
  };
}

function changeCell(row, column, mode) {
  const current = board[row][column];
  let next;

  if (mode === "primary") {
    // Original left-click behavior
    if (current === EMPTY) {
      next = BACKSLASH;
    } else if (current === BACKSLASH) {
      next = SLASH;
    } else {
      next = EMPTY;
    }
  } else {
    // Original right-click behavior
    if (current === EMPTY) {
      next = SLASH;
    } else if (current === SLASH) {
      next = BACKSLASH;
    } else {
      next = EMPTY;
    }
  }

  if (next === current) return;

  board[row][column] = next;
  saveHistory();
  updateDisplay();
}

canvas.addEventListener(
  "contextmenu",
  event => {
    event.preventDefault();
  }
);

canvas.addEventListener(
  "pointerdown",
  event => {
    event.preventDefault();

    const cell =
      getCellFromPointer(event);

    if (!cell) {
      return;
    }

    changeCell(
      cell.row,
      cell.column,
      event.button === 0 ? "primary" : "secondary"
    );
  }
);

/* =========================================================
   Game controls
   ========================================================= */

function startNewGame() {
  const language =
    languageSelect?.value || "en";

  const translation =
    TRANSLATIONS[language] ||
    TRANSLATIONS.en;

  statusElement.textContent =
    translation.generating;

  statusElement.className =
    "";

  if (newButton) {
    newButton.disabled = true;
  }

  setTimeout(() => {
    createPuzzle();

    resizeCanvas();
    resetHistory();
    updateDisplay();

    if (newButton) {
      newButton.disabled = false;
    }
  }, 20);
}

newButton?.addEventListener(
  "click",
  startNewGame
);

resetButton?.addEventListener(
  "click",
  () => {
    board =
      makeGrid(
        boardSize,
        boardSize
      );

    resetHistory();
    updateDisplay();
  }
);

undoButton?.addEventListener(
  "click",
  undo
);

redoButton?.addEventListener(
  "click",
  redo
);

sizeControl?.addEventListener(
  "change",
  () => {
    boardSize =
      Number(sizeControl.value) || 15;

    startNewGame();
  }
);

window.addEventListener(
  "resize",
  () => {
    resizeCanvas();
    updateDisplay();
  }
);

/* =========================================================
   Language
   ========================================================= */

function getBrowserLanguage() {
  const language = (
    navigator.language ||
    navigator.userLanguage ||
    "en"
  ).toLowerCase();

  if (
    language.startsWith("zh-hk") ||
    language.startsWith("zh-tw") ||
    language.startsWith("zh-mo") ||
    language.startsWith("zh")
  ) {
    return "zh-Hant";
  }

  if (language.startsWith("es")) {
    return "es";
  }

  return "en";
}

function applyTranslations(language) {
  const translation =
    TRANSLATIONS[language] ||
    TRANSLATIONS.en;

  const elements =
    document.querySelectorAll(
      "[data-i18n]"
    );

  for (const element of elements) {
    const key =
      element.dataset.i18n;

    if (key === "rulesList") {
      element.innerHTML = "";

      for (const rule of translation.rulesList) {
        const listItem =
          document.createElement("li");

        listItem.textContent =
          rule;

        element.appendChild(
          listItem
        );
      }

      continue;
    }

    if (translation[key]) {
      element.textContent =
        translation[key];
    }
  }
}

function initializeLanguage() {
  let language =
    getBrowserLanguage();

  try {
    const savedLanguage =
      localStorage.getItem(
        "puzzle-language"
      );

    if (
      savedLanguage &&
      TRANSLATIONS[savedLanguage]
    ) {
      language =
        savedLanguage;
    }
  } catch {
    // Ignore unavailable localStorage.
  }

  if (languageSelect) {
    languageSelect.value =
      language;

    applyTranslations(language);

    languageSelect.addEventListener(
      "change",
      () => {
        const selected =
          TRANSLATIONS[languageSelect.value]
            ? languageSelect.value
            : "en";

        applyTranslations(selected);

        try {
          localStorage.setItem(
            "puzzle-language",
            selected
          );
        } catch {
          // Ignore unavailable localStorage.
        }
      }
    );
  } else {
    applyTranslations(language);
  }
}

/* =========================================================
   Start
   ========================================================= */

initializeLanguage();
startNewGame();
