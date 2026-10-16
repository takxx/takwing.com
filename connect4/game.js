export const ROWS = 6;
export const COLS = 7;

export const EMPTY = 0;
export const PLAYER = 1;
export const COMPUTER = 2;

export function createBoard(rows, cols, empty) {
  return Array.from(
    { length: rows },
    () => Array(cols).fill(empty)
  );
}

export function dropPiece(board, column, player, rows) {
  for (let row = rows - 1; row >= 0; row--) {
    if (board[row][column] === EMPTY) {
      board[row][column] = player;
      return row;
    }
  }

  return -1;
}

export function getValidColumns(board, cols) {
  return Array.from({ length: cols }, (_, column) => column)
    .filter(column => board[0][column] === EMPTY);
}

export function findWinningLine(board, player, rows, cols) {
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < cols; column++) {
      if (board[row][column] !== player) {
        continue;
      }

      const result = checkWin(board, row, column, player, rows, cols);

      if (result.won) {
        return result;
      }
    }
  }

  return {
    won: false,
    cells: []
  };
}

function checkWin(board, row, column, player, rows, cols) {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1]
  ];

  for (const [rowDirection, columnDirection] of directions) {
    const cells = [[row, column]];

    for (const direction of [-1, 1]) {
      let currentRow = row + rowDirection * direction;
      let currentColumn = column + columnDirection * direction;

      while (
        currentRow >= 0 &&
        currentRow < rows &&
        currentColumn >= 0 &&
        currentColumn < cols &&
        board[currentRow][currentColumn] === player
      ) {
        cells.push([currentRow, currentColumn]);

        currentRow += rowDirection * direction;
        currentColumn += columnDirection * direction;
      }
    }

    if (cells.length >= 4) {
      return {
        won: true,
        cells
      };
    }
  }

  return {
    won: false,
    cells: []
  };
}