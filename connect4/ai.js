import {
  EMPTY,
  dropPiece,
  getValidColumns,
  findWinningLine
} from "./game.js";

export function chooseComputerColumn({
  board,
  rows,
  cols,
  player,
  computer,
  depth = 4,
  mistakeChance = 0.02
}) {
  const validColumns = getValidColumns(board, cols);

  if (validColumns.length === 0) {
    return null;
  }

  // Occasionally make a less strategic move for a more casual opponent.
  if (Math.random() < mistakeChance) {
    return randomItem(validColumns);
  }

  let bestScore = -Infinity;
  let bestColumns = [];

  for (const column of orderColumns(validColumns, cols)) {
    const row = dropPiece(board, column, computer, rows);

    const score = minimax({
      board,
      rows,
      cols,
      player,
      computer,
      depth: Math.max(0, depth - 1),
      maximizing: false,
      alpha: -Infinity,
      beta: Infinity
    });

    board[row][column] = EMPTY;

    if (score > bestScore) {
      bestScore = score;
      bestColumns = [column];
    } else if (score === bestScore) {
      bestColumns.push(column);
    }
  }

  return randomItem(bestColumns);
}

function minimax({
  board,
  rows,
  cols,
  player,
  computer,
  depth,
  maximizing,
  alpha,
  beta
}) {
  const computerWon = findWinningLine(
    board, computer, rows, cols
  ).won;

  const playerWon = findWinningLine(
    board, player, rows, cols
  ).won;

  if (computerWon) return 1_000_000 + depth;
  if (playerWon) return -1_000_000 - depth;

  const validColumns = getValidColumns(board, cols);

  if (depth <= 0 || validColumns.length === 0) {
    return evaluateBoard(board, rows, cols, player, computer);
  }

  if (maximizing) {
    let bestScore = -Infinity;

    for (const column of orderColumns(validColumns, cols)) {
      const row = dropPiece(board, column, computer, rows);

      const score = minimax({
        board,
        rows,
        cols,
        player,
        computer,
        depth: depth - 1,
        maximizing: false,
        alpha,
        beta
      });

      board[row][column] = EMPTY;

      bestScore = Math.max(bestScore, score);
      alpha = Math.max(alpha, bestScore);

      if (beta <= alpha) break;
    }

    return bestScore;
  }

  let bestScore = Infinity;

  for (const column of orderColumns(validColumns, cols)) {
    const row = dropPiece(board, column, player, rows);

    const score = minimax({
      board,
      rows,
      cols,
      player,
      computer,
      depth: depth - 1,
      maximizing: true,
      alpha,
      beta
    });

    board[row][column] = EMPTY;

    bestScore = Math.min(bestScore, score);
    beta = Math.min(beta, bestScore);

    if (beta <= alpha) break;
  }

  return bestScore;
}

function orderColumns(columns, cols) {
  const center = Math.floor(cols / 2);

  return [...columns].sort(
    (a, b) => Math.abs(a - center) - Math.abs(b - center)
  );
}

function evaluateBoard(board, rows, cols, player, computer) {
  let score = 0;
  const centerColumn = Math.floor(cols / 2);

  for (let row = 0; row < rows; row++) {
    if (board[row][centerColumn] === computer) score += 6;
    if (board[row][centerColumn] === player) score -= 6;
  }

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < cols; column++) {
      if (column + 3 < cols) {
        score += evaluateWindow([
          board[row][column],
          board[row][column + 1],
          board[row][column + 2],
          board[row][column + 3]
        ], player, computer);
      }

      if (row + 3 < rows) {
        score += evaluateWindow([
          board[row][column],
          board[row + 1][column],
          board[row + 2][column],
          board[row + 3][column]
        ], player, computer);
      }

      if (row + 3 < rows && column + 3 < cols) {
        score += evaluateWindow([
          board[row][column],
          board[row + 1][column + 1],
          board[row + 2][column + 2],
          board[row + 3][column + 3]
        ], player, computer);
      }

      if (row + 3 < rows && column - 3 >= 0) {
        score += evaluateWindow([
          board[row][column],
          board[row + 1][column - 1],
          board[row + 2][column - 2],
          board[row + 3][column - 3]
        ], player, computer);
      }
    }
  }

  return score;
}

function evaluateWindow(windowCells, player, computer) {
  const computerCount =
    windowCells.filter(cell => cell === computer).length;

  const playerCount =
    windowCells.filter(cell => cell === player).length;

  const emptyCount =
    windowCells.filter(cell => cell === EMPTY).length;

  if (computerCount > 0 && playerCount > 0) return 0;

  if (computerCount === 4) return 100_000;
  if (computerCount === 3 && emptyCount === 1) return 120;
  if (computerCount === 2 && emptyCount === 2) return 12;
  if (computerCount === 1 && emptyCount === 3) return 2;

  if (playerCount === 4) return -100_000;
  if (playerCount === 3 && emptyCount === 1) return -150;
  if (playerCount === 2 && emptyCount === 2) return -15;
  if (playerCount === 1 && emptyCount === 3) return -2;

  return 0;
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}
