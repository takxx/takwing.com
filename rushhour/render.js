export const ROWS = 6;
export const COLS = 9;

export function getGridMetrics(board) {
  const style = getComputedStyle(board);

  const paddingLeft = parseFloat(style.paddingLeft) || 0;
  const paddingRight = parseFloat(style.paddingRight) || 0;
  const paddingTop = parseFloat(style.paddingTop) || 0;
  const paddingBottom = parseFloat(style.paddingBottom) || 0;
  const gapX = parseFloat(style.columnGap) || 0;
  const gapY = parseFloat(style.rowGap) || 0;

  const gridWidth = board.clientWidth - paddingLeft - paddingRight;
  const gridHeight = board.clientHeight - paddingTop - paddingBottom;
  const cellWidth = (gridWidth - gapX * (COLS - 1)) / COLS;
  const cellHeight = (gridHeight - gapY * (ROWS - 1)) / ROWS;

  return {
    paddingLeft,
    paddingTop,
    gapX,
    gapY,
    cellWidth,
    cellHeight,
    stepX: cellWidth + gapX,
    stepY: cellHeight + gapY,
  };
}

function cellPosition(row, col, metrics) {
  return {
    left: metrics.paddingLeft + col * metrics.stepX,
    top: metrics.paddingTop + row * metrics.stepY,
  };
}

export function createCells(board) {
  for (let i = 0; i < ROWS * COLS; i += 1) {
    const cell = document.createElement("div");
    cell.className = "cell";
    board.insertBefore(cell, board.querySelector(".exit"));
  }
}

export function render({
  board,
  cars,
  moves,
  bestCount,
  bestKey,
  onPointerDown,
}) {
  board.querySelectorAll(".car").forEach(element => element.remove());

  const metrics = getGridMetrics(board);

  for (const car of cars) {
    const element = document.createElement("div");
    element.className =
      `car ${car.dir === "h" ? "horizontal" : "vertical"} ${car.color}`;

    const width = car.dir === "h" ? car.length : 1;
    const height = car.dir === "v" ? car.length : 1;
    const position = cellPosition(car.row, car.col, metrics);

    element.style.left = `${position.left}px`;
    element.style.top = `${position.top}px`;
    element.style.width =
      `${width * metrics.cellWidth + (width - 1) * metrics.gapX}px`;
    element.style.height =
      `${height * metrics.cellHeight + (height - 1) * metrics.gapY}px`;
    element.textContent = car.label || "";

    element.addEventListener("pointerdown", event => {
      onPointerDown(event, car, element, metrics);
    });

    board.appendChild(element);
  }

  document.getElementById("moveCount").textContent = moves;
  bestCount.textContent = localStorage.getItem(bestKey) || "—";
}
