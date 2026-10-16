export function renderBoard({
  boardElement,
  board,
  winningCells,
  player,
  computer,
  onColumnClick
}) {
  boardElement.innerHTML = "";

  const rows = board.length;
  const cols = board[0].length;

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < cols; column++) {
      const cell = document.createElement("button");

      cell.className = "cell";
      cell.setAttribute(
        "aria-label",
        `Row ${row + 1}, column ${column + 1}`
      );

      if (board[row][column] === player) {
        cell.classList.add("player");
      }

      if (board[row][column] === computer) {
        cell.classList.add("computer");
      }

      const isWinningCell = winningCells.some(
        ([winningRow, winningColumn]) =>
          winningRow === row && winningColumn === column
      );

      if (isWinningCell) {
        cell.classList.add("win");
      }

      cell.addEventListener("click", () => {
        onColumnClick(column);
      });

      boardElement.appendChild(cell);
    }
  }
}