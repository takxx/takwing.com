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
   Constants and state
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

/* Narrow-screen default size */
const NARROW_BREAKPOINT = 768;
const NARROW_DEFAULT_SIZE = 10;
const WIDE_DEFAULT_SIZE = 15;

function isNarrowScreen() {
  const width =
    window.innerWidth ||
    document.documentElement.clientWidth ||
    document.body.clientWidth ||
    1024;

  return width < NARROW_BREAKPOINT;
}

function getDefaultBoardSize() {
  // Prefer explicit control value if present and not default
  const controlValue = Number(sizeControl?.value);

  if (!Number.isNaN(controlValue) && controlValue > 0) {
    return controlValue;
  }

  return isNarrowScreen() ? NARROW_DEFAULT_SIZE : WIDE_DEFAULT_SIZE;
}

let boardSize = getDefaultBoardSize();
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
    htmlLang: "en",

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
    generating: "Generating puzzle…",
    solved: "Solved!",
    hasViolation: "There is a rule violation.",
    noViolations: "No current rule violations."
  },

  es: {
    htmlLang: "es",

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
    generating: "Generando puzzle…",
    solved: "¡Resuelto!",
    hasViolation: "Hay una violación de las reglas.",
    noViolations: "No hay violaciones de reglas actualmente."
  },

  zh: {
    htmlLang: "zh-Hant",

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
    generating: "正在生成謎題…",
    solved: "已解開！",
    hasViolation: "有違規情況。",
    noViolations: "目前沒有違規。"
  }
};

const SUPPORTED_LANGUAGES = Object.keys(TRANSLATIONS);

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
    const other = Math.floor(Math.random() * (index + 1));

    [array[index], array[other]] =
      [array[other], array[index]];
  }

  return array;
}

function gridsEqual(first, second) {
  if (!first || !second || first.length !== second.length) {
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
   Disjoint set for solution generation and loop display
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
      this.parent[value] = this.find(this.parent[value]);
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
   Rollback disjoint set for uniqueness solver
   ========================================================= */

class RollbackDisjointSet {
  constructor(size) {
    this.parent = Array.from(
      { length: size },
      (_, index) => index
    );

    this.rank = Array(size).fill(0);
  }

  find(value) {
    while (this.parent[value] !== value) {
      value = this.parent[value];
    }

    return value;
  }

  union(first, second, trail) {
    let rootA = this.find(first);
    let rootB = this.find(second);

    if (rootA === rootB) {
      return false;
    }

    if (this.rank[rootA] < this.rank[rootB]) {
      [rootA, rootB] = [rootB, rootA];
    }

    trail.push({
      type: "union",
      childRoot: rootB,
      parentRoot: rootA,
      oldParent: this.parent[rootB],
      oldParentRank: this.rank[rootA],
      oldChildRank: this.rank[rootB]
    });

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

function touchingOrientation(cellRow, cellColumn, nodeRow, nodeColumn) {
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

function touchesNode(cellRow, cellColumn, type, nodeRow, nodeColumn) {
  return type === touchingOrientation(
    cellRow,
    cellColumn,
    nodeRow,
    nodeColumn
  );
}

function countNodeConnections(state, nodeRow, nodeColumn) {
  let count = 0;

  for (const cell of adjacentCells(nodeRow, nodeColumn)) {
    const value = state[cell.row][cell.column];

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
   Loop detection for player display
   ========================================================= */

function hasLoop(state) {
  const pointCount =
    (boardSize + 1) * (boardSize + 1);

  const dsu = new DisjointSet(pointCount);

  for (let row = 0; row < boardSize; row++) {
    for (let column = 0; column < boardSize; column++) {
      const value = state[row][column];

      if (value === EMPTY) {
        continue;
      }

      const endpoints = diagonalEndpoints(row, column, value);

      if (
        dsu.find(endpoints[0]) ===
        dsu.find(endpoints[1])
      ) {
        return true;
      }

      dsu.union(endpoints[0], endpoints[1]);
    }
  }

  return false;
}

function findLoopCells(state) {
  const pointCount =
    (boardSize + 1) * (boardSize + 1);

  const adjacency = Array.from(
    { length: pointCount },
    () => []
  );

  for (let row = 0; row < boardSize; row++) {
    for (let column = 0; column < boardSize; column++) {
      const value = state[row][column];

      if (value === EMPTY) {
        continue;
      }

      const endpoints = diagonalEndpoints(row, column, value);

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

    const stack = [{
      node: start,
      edgeIndex: 0
    }];

    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const current = frame.node;
      const edges = adjacency[current];

      if (frame.edgeIndex >= edges.length) {
        stack.pop();
        continue;
      }

      const edge = edges[frame.edgeIndex++];
      const next = edge.to;
      const cameFromEdge = parentEdge[current];

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

      const cycle = collectCycleCells(
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

    cursor = parentNode[cursor];
  }

  cursor = secondNode;

  while (cursor !== -1) {
    secondPath.push({
      node: cursor,
      edge: parentEdge[cursor]
    });

    cursor = parentNode[cursor];
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
    const edge = firstPath[index].edge;

    if (edge) {
      cycle.add(cellKey(edge.row, edge.column));
    }
  }

  for (
    let index = commonLength;
    index < secondPath.length;
    index++
  ) {
    const edge = secondPath[index].edge;

    if (edge) {
      cycle.add(cellKey(edge.row, edge.column));
    }
  }

  cycle.add(cellKey(closingEdge.row, closingEdge.column));

  return cycle;
}

/* =========================================================
   Solution generation
   ========================================================= */

function generateLoopFreeSolution() {
  for (let attempt = 0; attempt < 80; attempt++) {
    const candidate = makeGrid(boardSize, boardSize);

    const dsu = new DisjointSet(
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
        const endpoints = diagonalEndpoints(
          cell.row,
          cell.column,
          orientation
        );

        if (
          dsu.find(endpoints[0]) !==
          dsu.find(endpoints[1])
        ) {
          candidate[cell.row][cell.column] = orientation;
          dsu.union(endpoints[0], endpoints[1]);
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
  const fallback = makeGrid(boardSize, boardSize);

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
  const result = makeGrid(
    boardSize + 1,
    boardSize + 1,
    null
  );

  for (let row = 0; row <= boardSize; row++) {
    for (let column = 0; column <= boardSize; column++) {
      result[row][column] = countNodeConnections(
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

  return positions;
}

/* =========================================================
   Puzzle creation and clue minimization
   ========================================================= */

function createPuzzle() {
  solution = generateLoopFreeSolution();

  const fullClues = calculateAllClues(solution);

  clues = copyGrid(fullClues);

  minimizeClues();

  board = makeGrid(boardSize, boardSize);
}

function minimizeClues() {
  const startTime = performance.now();

  const budget =
    boardSize <= 15 ? 2500 :
    boardSize <= 20 ? 5000 :
    8000;

  const maximumRemovals = Math.floor(
    (boardSize + 1) * (boardSize + 1) * 0.30
  );

  const positions = shuffle(allNodePositions());

  sortClueRemovalOrder(positions);

  let removed = 0;

  for (const position of positions) {
    if (removed >= maximumRemovals) {
      break;
    }

    if (performance.now() - startTime > budget) {
      break;
    }

    const row = position.row;
    const column = position.column;

    if (clues[row][column] === null) {
      continue;
    }

    const savedClue = clues[row][column];

    clues[row][column] = null;

    if (isUniquelySolvable()) {
      removed++;
    } else {
      clues[row][column] = savedClue;
    }
  }
}

function sortClueRemovalOrder(positions) {
  positions.sort((first, second) => {
    return (
      clueRemovalPriority(first) -
      clueRemovalPriority(second)
    );
  });
}

function clueRemovalPriority(position) {
  const row = position.row;
  const column = position.column;
  const value = clues[row][column];

  const isCorner =
    (row === 0 || row === boardSize) &&
    (column === 0 || column === boardSize);

  const isEdge =
    row === 0 ||
    row === boardSize ||
    column === 0 ||
    column === boardSize;

  if (value === 0 || value === 4) {
    return 0;
  }

  if (isCorner && value === 1) {
    return 1;
  }

  if (isEdge && value === 2) {
    return 2;
  }

  return 3;
}

function isUniquelySolvable() {
  const timeLimit =
    boardSize <= 15 ? 500 :
    boardSize <= 20 ? 800 :
    1200;

  const result = collectSolutions(
    clues,
    2,
    timeLimit
  );

  return (
    result.complete &&
    result.solutions.length === 1 &&
    gridsEqual(result.solutions[0], solution)
  );
}

/* =========================================================
   Fast uniqueness solver
   ========================================================= */

function collectSolutions(
  currentClues,
  limit = 2,
  timeLimit = Infinity
) {
  const nodeCount =
    (boardSize + 1) * (boardSize + 1);

  const cellCount = boardSize * boardSize;

  const values = new Int8Array(cellCount);
  const remaining = { count: cellCount };

  const dsu = new RollbackDisjointSet(nodeCount);
  const trail = [];

  const queue = [];

  const solutions = [];
  const startTime = performance.now();

  let timedOut = false;

  function nodeIndex(row, column) {
    return row * (boardSize + 1) + column;
  }

  function enqueueNode(row, column) {
    queue.push(nodeIndex(row, column));
  }

  function enqueueCell(row, column) {
    enqueueNode(row, column);
    enqueueNode(row + 1, column);
    enqueueNode(row, column + 1);
    enqueueNode(row + 1, column + 1);
  }

  function isTimedOut() {
    if (timedOut) {
      return true;
    }

    if (
      timeLimit !== Infinity &&
      performance.now() - startTime > timeLimit
    ) {
      timedOut = true;
    }

    return timedOut;
  }

  function rollback(mark, queueMark) {
    while (trail.length > mark) {
      const entry = trail.pop();

      if (entry.type === "value") {
        values[entry.index] = EMPTY;
        remaining.count++;
      } else {
        dsu.parent[entry.childRoot] =
          entry.oldParent;

        dsu.rank[entry.parentRoot] =
          entry.oldParentRank;

        dsu.rank[entry.childRoot] =
          entry.oldChildRank;
      }
    }

    queue.length = queueMark;
  }

  function assignCell(row, column, value) {
    const index = row * boardSize + column;

    if (values[index] !== EMPTY) {
      return values[index] === value;
    }

    const endpoints = diagonalEndpoints(row, column, value);

    if (
      dsu.find(endpoints[0]) ===
      dsu.find(endpoints[1])
    ) {
      return false;
    }

    values[index] = value;
    remaining.count--;

    trail.push({
      type: "value",
      index
    });

    if (!dsu.union(endpoints[0], endpoints[1], trail)) {
      values[index] = EMPTY;
      remaining.count++;
      trail.pop();
      return false;
    }

    enqueueCell(row, column);

    return true;
  }

  function propagate() {
    let operations = 0;

    while (queue.length > 0) {
      if (++operations % 512 === 0 && isTimedOut()) {
        return false;
      }

      const node = queue.pop();

      const row = Math.floor(node / (boardSize + 1));
      const column = node % (boardSize + 1);
      const clue = currentClues[row][column];

      if (clue === null) {
        continue;
      }

      const neighbours = adjacentCells(row, column);

      let connected = 0;
      const unknown = [];

      for (const cell of neighbours) {
        const value =
          values[cell.row * boardSize + cell.column];

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
          const forbidden = touchingOrientation(
            cell.row,
            cell.column,
            row,
            column
          );

          const required =
            forbidden === BACKSLASH
              ? SLASH
              : BACKSLASH;

          if (!assignCell(cell.row, cell.column, required)) {
            return false;
          }
        }
      } else if (
        connected + unknown.length === clue
      ) {
        for (const cell of unknown) {
          const required = touchingOrientation(
            cell.row,
            cell.column,
            row,
            column
          );

          if (!assignCell(cell.row, cell.column, required)) {
            return false;
          }
        }
      }
    }

    return true;
  }

  function chooseCell() {
    let best = null;
    let bestScore = -1;

    for (let row = 0; row < boardSize; row++) {
      for (let column = 0; column < boardSize; column++) {
        if (values[row * boardSize + column] !== EMPTY) {
          continue;
        }

        let score = 0;

        const nodes = [
          [row, column],
          [row + 1, column],
          [row, column + 1],
          [row + 1, column + 1]
        ];

        for (const [nodeRow, nodeColumn] of nodes) {
          if (currentClues[nodeRow][nodeColumn] !== null) {
            score += 10;
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
            values[
              neighbourRow * boardSize + neighbourColumn
            ] !== EMPTY
          ) {
            score++;
          }
        }

        if (score > bestScore) {
          bestScore = score;
          best = { row, column };
        }
      }
    }

    return best;
  }

  function valuesToGrid() {
    const result = makeGrid(boardSize, boardSize);

    for (let row = 0; row < boardSize; row++) {
      for (let column = 0; column < boardSize; column++) {
        result[row][column] =
          values[row * boardSize + column];
      }
    }

    return result;
  }

  function isValidCompleteValues() {
    for (let row = 0; row <= boardSize; row++) {
      for (let column = 0; column <= boardSize; column++) {
        const clue = currentClues[row][column];

        if (clue === null) {
          continue;
        }

        let actual = 0;

        for (const cell of adjacentCells(row, column)) {
          const value =
            values[cell.row * boardSize + cell.column];

          if (
            value !== EMPTY &&
            touchesNode(
              cell.row,
              cell.column,
              value,
              row,
              column
            )
          ) {
            actual++;
          }
        }

        if (actual !== clue) {
          return false;
        }
      }
    }

    return true;
  }

  function search() {
    if (solutions.length >= limit || isTimedOut()) {
      return;
    }

    if (remaining.count === 0) {
      if (isValidCompleteValues()) {
        solutions.push(valuesToGrid());
      }

      return;
    }

    const cell = chooseCell();

    if (!cell) {
      return;
    }

    for (const value of [BACKSLASH, SLASH]) {
      const trailMark = trail.length;
      const queueMark = queue.length;

      if (assignCell(cell.row, cell.column, value)) {
        if (propagate()) {
          search();
        }
      }

      rollback(trailMark, queueMark);

      if (solutions.length >= limit || isTimedOut()) {
        return;
      }
    }
  }

  for (let row = 0; row <= boardSize; row++) {
    for (let column = 0; column <= boardSize; column++) {
      if (currentClues[row][column] !== null) {
        enqueueNode(row, column);
      }
    }
  }

  if (propagate()) {
    search();
  }

  return {
    solutions,
    complete: !timedOut
  };
}

/* =========================================================
   Canvas sizing and drawing
   ========================================================= */

function getMaxBoardSize() {
  const calculatedSize = 200 + boardSize * 50;
  const horizontalPadding = 32;

  const availableWidth = Math.max(
    1,
    document.documentElement.clientWidth - horizontalPadding
  );

  return Math.min(calculatedSize, availableWidth);
}

function getNodeRadius() {
  return Math.max(9, cellSize * 0.26);
}

function resizeCanvas() {
  canvasSize = Math.floor(getMaxBoardSize());

  canvas.style.width = `${canvasSize}px`;
  canvas.style.height = `${canvasSize}px`;

  deviceScale = window.devicePixelRatio || 1;

  canvas.width = Math.floor(canvasSize * deviceScale);
  canvas.height = Math.floor(canvasSize * deviceScale);

  ctx.setTransform(
    deviceScale,
    0,
    0,
    deviceScale,
    0,
    0
  );

  const nominalCellSize = canvasSize / boardSize;
  const radius = Math.max(9, nominalCellSize * 0.26);
  const usableSize = canvasSize - 2 * radius;

  cellSize = usableSize / boardSize;
  boardOrigin = radius;
}

function draw(highlights) {
  ctx.clearRect(0, 0, canvasSize, canvasSize);

  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  drawGrid();
  drawDiagonals(highlights.loopCells);
  drawNodes(highlights);
}

function drawGrid() {
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = Math.max(1, cellSize * 0.018);

  for (let index = 0; index <= boardSize; index++) {
    const position = boardOrigin + index * cellSize;

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
      const value = board[row][column];

      if (value === EMPTY) {
        continue;
      }

      const x = boardOrigin + column * cellSize;
      const y = boardOrigin + row * cellSize;
      const padding = cellSize * 0.18;
      const inLoop = loopCells.has(cellKey(row, column));

      ctx.strokeStyle = inLoop
        ? COLORS.invalid
        : COLORS.diagonal;

      ctx.lineWidth = inLoop
        ? Math.max(3, cellSize * 0.075)
        : Math.max(2, cellSize * 0.055);

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
  const radius = getNodeRadius();

  for (let row = 0; row <= boardSize; row++) {
    for (let column = 0; column <= boardSize; column++) {
      const x = boardOrigin + column * cellSize;
      const y = boardOrigin + row * cellSize;
      const key = nodeKey(row, column);
      const clue = clues[row][column];

      let color = COLORS.node;

      if (highlights.badNodes.has(key)) {
        color = COLORS.invalid;
      } else if (highlights.completeNodes.has(key)) {
        color = COLORS.complete;
      }

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      if (clue !== null) {
        ctx.fillStyle = COLORS.text;
        ctx.font = `800 ${Math.max(
          12,
          cellSize * 0.28
        )}px system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(clue, x, y);
      }
    }
  }
}

function drawLine(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/* =========================================================
   Highlights and game state
   ========================================================= */

function calculateHighlights() {
  const badNodes = new Set();
  const completeNodes = new Set();
  const loopCells = findLoopCells(board);

  for (let row = 0; row <= boardSize; row++) {
    for (let column = 0; column <= boardSize; column++) {
      const neighbours = adjacentCells(row, column);

      const complete = neighbours.every(cell =>
        board[cell.row][cell.column] !== EMPTY
      );

      if (!complete) {
        continue;
      }

      const actual = countNodeConnections(board, row, column);
      const clue = clues[row][column];

      if (clue !== null && actual !== clue) {
        badNodes.add(nodeKey(row, column));
      } else {
        completeNodes.add(nodeKey(row, column));
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
  if (!board.every(row => row.every(value => value !== EMPTY))) {
    return false;
  }

  if (hasLoop(board)) {
    return false;
  }

  for (let row = 0; row <= boardSize; row++) {
    for (let column = 0; column <= boardSize; column++) {
      const clue = clues[row][column];

      if (
        clue !== null &&
        countNodeConnections(board, row, column) !== clue
      ) {
        return false;
      }
    }
  }

  return true;
}

function getCurrentLanguage() {
  if (languageSelect && TRANSLATIONS[languageSelect.value]) {
    return languageSelect.value;
  }

  return "en";
}

function updateDisplay() {
  // Guard against calling before the puzzle is created
  if (
    !Array.isArray(board) ||
    board.length !== boardSize ||
    !Array.isArray(clues) ||
    clues.length !== boardSize + 1
  ) {
    return;
  }

  const highlights = calculateHighlights();
  draw(highlights);

  const translation = TRANSLATIONS[getCurrentLanguage()];

  if (isSolved()) {
    statusElement.textContent = translation.solved;
    statusElement.className = "good";
    return;
  }

  if (
    highlights.badNodes.size > 0 ||
    highlights.loopCells.size > 0
  ) {
    statusElement.textContent = translation.hasViolation;
    statusElement.className = "bad";
    return;
  }

  statusElement.textContent = translation.noViolations;
  statusElement.className = "";
}

/* =========================================================
   Undo and redo
   ========================================================= */

function updateUndoRedoButtons() {
  if (undoButton) {
    undoButton.disabled = historyIndex <= 0;
  }

  if (redoButton) {
    redoButton.disabled =
      historyIndex >= history.length - 1;
  }
}

function resetHistory() {
  history = [copyGrid(board)];
  historyIndex = 0;

  updateUndoRedoButtons();
}

function saveHistory() {
  const snapshot = copyGrid(board);

  if (
    historyIndex >= 0 &&
    gridsEqual(history[historyIndex], snapshot)
  ) {
    updateUndoRedoButtons();
    return;
  }

  history = history.slice(0, historyIndex + 1);
  history.push(snapshot);

  if (history.length > maxHistory) {
    history.shift();
  }

  historyIndex = history.length - 1;

  updateUndoRedoButtons();
}

function undo() {
  if (historyIndex <= 0) {
    return;
  }

  historyIndex--;
  board = copyGrid(history[historyIndex]);

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
  board = copyGrid(history[historyIndex]);

  updateDisplay();
  updateUndoRedoButtons();
}

/* =========================================================
   Interaction
   ========================================================= */

function getCellFromPointer(event) {
  const rectangle = canvas.getBoundingClientRect();

  const x = event.clientX - rectangle.left;
  const y = event.clientY - rectangle.top;

  const column = Math.floor(
    (x - boardOrigin) / cellSize
  );

  const row = Math.floor(
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

  return { row, column };
}

function changeCell(row, column, mode) {
  const current = board[row][column];
  let next;

  if (mode === "primary") {
    if (current === EMPTY) {
      next = BACKSLASH;
    } else if (current === BACKSLASH) {
      next = SLASH;
    } else {
      next = EMPTY;
    }
  } else {
    if (current === EMPTY) {
      next = SLASH;
    } else if (current === SLASH) {
      next = BACKSLASH;
    } else {
      next = EMPTY;
    }
  }

  if (next === current) {
    return;
  }

  board[row][column] = next;

  saveHistory();
  updateDisplay();
}

canvas.addEventListener("contextmenu", event => {
  event.preventDefault();
});

canvas.addEventListener("pointerdown", event => {
  event.preventDefault();

  const cell = getCellFromPointer(event);

  if (!cell) {
    return;
  }

  changeCell(
    cell.row,
    cell.column,
    event.button === 0 ? "primary" : "secondary"
  );
});

/* =========================================================
   Game controls
   ========================================================= */

function startNewGame() {
  const translation = TRANSLATIONS[getCurrentLanguage()];

  statusElement.textContent = translation.generating;
  statusElement.className = "";

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

newButton?.addEventListener("click", startNewGame);

resetButton?.addEventListener("click", () => {
  board = makeGrid(boardSize, boardSize);

  resetHistory();
  updateDisplay();
});

undoButton?.addEventListener("click", undo);
redoButton?.addEventListener("click", redo);

sizeControl?.addEventListener("change", () => {
  boardSize = Number(sizeControl.value) || getDefaultBoardSize();
  startNewGame();
});

/* Track narrow/wide state so we can adapt default on resize */
let lastWasNarrow = isNarrowScreen();

window.addEventListener("resize", () => {
  const nowNarrow = isNarrowScreen();

  // If crossing the breakpoint and user hasn't chosen an explicit size,
  // adjust the default board size.
  if (nowNarrow !== lastWasNarrow) {
    const controlValue = Number(sizeControl?.value);
    const hasExplicitSize =
      !Number.isNaN(controlValue) &&
      controlValue > 0 &&
      controlValue !== NARROW_DEFAULT_SIZE &&
      controlValue !== WIDE_DEFAULT_SIZE;

    if (!hasExplicitSize) {
      boardSize = nowNarrow ? NARROW_DEFAULT_SIZE : WIDE_DEFAULT_SIZE;

      // Keep the size control in sync with the new default
      if (sizeControl) {
        sizeControl.value = String(boardSize);
      }

      startNewGame();
    }
  }

  resizeCanvas();
  updateDisplay();

  lastWasNarrow = nowNarrow;
});

/* =========================================================
   Language
   ========================================================= */

function getLanguageFromUrl() {
  const urlLanguage = new URLSearchParams(
    window.location.search
  ).get("lang");

  if (!urlLanguage) {
    return null;
  }

  const normalized = urlLanguage.trim().toLowerCase();

  if (SUPPORTED_LANGUAGES.includes(normalized)) {
    return normalized;
  }

  return null;
}

function getBrowserLanguage() {
  const browserLanguage = (
    navigator.language ||
    navigator.userLanguage ||
    "en"
  ).toLowerCase();

  if (browserLanguage.startsWith("zh")) {
    return "zh";
  }

  if (browserLanguage.startsWith("es")) {
    return "es";
  }

  return "en";
}

function applyTranslations(language) {
  const translation = TRANSLATIONS[language] || TRANSLATIONS.en;

  document.documentElement.lang = translation.htmlLang;

  const elements = document.querySelectorAll("[data-i18n]");

  for (const element of elements) {
    const key = element.dataset.i18n;

    if (key === "rulesList") {
      element.innerHTML = "";

      for (const rule of translation.rulesList) {
        const listItem = document.createElement("li");
        listItem.textContent = rule;
        element.appendChild(listItem);
      }

      continue;
    }

    if (translation[key]) {
      element.textContent = translation[key];
    }
  }
}

function setLanguage(language, savePreference) {
  const selected = TRANSLATIONS[language]
    ? language
    : "en";

  if (languageSelect) {
    languageSelect.value = selected;
  }

  applyTranslations(selected);

  if (savePreference) {
    try {
      localStorage.setItem("puzzle-language", selected);
    } catch {
      // Ignore unavailable localStorage.
    }
  }
}

function initializeLanguage() {
  const urlLanguage = getLanguageFromUrl();

  let language = urlLanguage || getBrowserLanguage();

  if (!urlLanguage) {
    try {
      const savedLanguage = localStorage.getItem("puzzle-language");

      if (savedLanguage && TRANSLATIONS[savedLanguage]) {
        language = savedLanguage;
      }
    } catch {
      // Ignore unavailable localStorage.
    }
  }

  setLanguage(language, false);

  languageSelect?.addEventListener("change", () => {
    setLanguage(languageSelect.value, true);
  });
}

/* =========================================================
   Start
   ========================================================= */

initializeLanguage();
startNewGame();