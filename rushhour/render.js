export const ROWS = 6;
export const COLS = 9;

const ROTATE_QUERY = "(max-width: 600px)";

export function isRotatedLayout() {
  return window.matchMedia(ROTATE_QUERY).matches;
}

export function getGridMetrics(board, rotated = isRotatedLayout()) {
  const style = getComputedStyle(board);

  const paddingLeft = parseFloat(style.paddingLeft) || 0;
  const paddingRight = parseFloat(style.paddingRight) || 0;
  const paddingTop = parseFloat(style.paddingTop) || 0;
  const paddingBottom = parseFloat(style.paddingBottom) || 0;
  const gapX = parseFloat(style.columnGap) || 0;
  const gapY = parseFloat(style.rowGap) || 0;

  const gridWidth = board.clientWidth - paddingLeft - paddingRight;
  const gridHeight = board.clientHeight - paddingTop - paddingBottom;

  // The rotated layout has 6 screen columns and 9 screen rows.
  const screenCols = rotated ? ROWS : COLS;
  const screenRows = rotated ? COLS : ROWS;

  const cellWidth = (gridWidth - gapX * (screenCols - 1)) / screenCols;
  const cellHeight = (gridHeight - gapY * (screenRows - 1)) / screenRows;

  return {
    rotated,
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

function screenPosition(row, col, metrics, car) {
  if (!metrics.rotated) {
    return { screenRow: row, screenCol: col };
  }

  // Clockwise rotation. A vertical car extends left-to-right on screen,
  // so its screen-left position comes from its last original row.
  return {
    screenRow: col,
    screenCol:
      car?.dir === "v"
        ? ROWS - 1 - (row + car.length - 1)
        : ROWS - 1 - row,
  };
}

function cellPosition(row, col, metrics, car) {
  const { screenRow, screenCol } = screenPosition(row, col, metrics, car);

  return {
    left: metrics.paddingLeft + screenCol * metrics.stepX,
    top: metrics.paddingTop + screenRow * metrics.stepY,
  };
}


export function createCells(board) {
  board.querySelectorAll(".cell").forEach(cell => cell.remove());

  const exit = board.querySelector(".exit");

  for (let i = 0; i < ROWS * COLS; i += 1) {
    const cell = document.createElement("div");
    cell.className = "cell";
    board.insertBefore(cell, exit);
  }
}

function renderCar(board, car, metrics, onPointerDown) {
  const element = document.createElement("div");

  const visualDirection = metrics.rotated
    ? car.dir === "h" ? "v" : "h"
    : car.dir;

  element.className =
    `car ${visualDirection === "h" ? "horizontal" : "vertical"} ${car.color}`;

  const position = cellPosition(car.row, car.col, metrics, car);
  const visualWidthInCells =
    car.dir === "h" ? (metrics.rotated ? 1 : car.length) : (metrics.rotated ? car.length : 1);

  const visualHeightInCells =
    car.dir === "v" ? (metrics.rotated ? 1 : car.length) : (metrics.rotated ? car.length : 1);

  element.style.left = `${position.left}px`;
  element.style.top = `${position.top}px`;
  element.style.width =
    `${visualWidthInCells * metrics.cellWidth +
      (visualWidthInCells - 1) * metrics.gapX}px`;
  element.style.height =
    `${visualHeightInCells * metrics.cellHeight +
      (visualHeightInCells - 1) * metrics.gapY}px`;

  element.textContent = car.label || "";
  element.addEventListener("pointerdown", event => {
    onPointerDown(event, car, element, metrics);
  });

  board.appendChild(element);
}

function positionExit(board, target, metrics) {
  const exit = board.querySelector(".exit");
  if (!exit || !target) return;

  if (!metrics.rotated) {
    exit.style.left = "";
    exit.style.top = "";
    exit.style.right = "";
    exit.style.bottom = "";
    exit.style.width = "";
    exit.style.height = "";
    return;
  }

  // After clockwise rotation, the target lane exits through the bottom.
  const screenCol = ROWS - 1 - target.row;
  const gridBottom =
    metrics.paddingTop + COLS * metrics.stepY - metrics.gapY;

  exit.style.left =
    `${metrics.paddingLeft + screenCol * metrics.stepX}px`;
  exit.style.right = "auto";
  exit.style.top = `${gridBottom}px`;
  exit.style.bottom = "auto";
  exit.style.width = `${metrics.cellWidth}px`;
  exit.style.height = "18px";
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

  const rotated = isRotatedLayout();
  board.classList.toggle("rotated", rotated);

  if (rotated) {
    const style = getComputedStyle(board);
    const px = value => parseFloat(value) || 0;

    const paddingX = px(style.paddingLeft) + px(style.paddingRight);
    const paddingY = px(style.paddingTop) + px(style.paddingBottom);
    const borderY =
      px(style.borderTopWidth) + px(style.borderBottomWidth);
    const gapX = px(style.columnGap);
    const gapY = px(style.rowGap);

    // Six square cells across; calculate the height needed for nine rows.
    const cellSize =
      (board.clientWidth - paddingX - gapX * (ROWS - 1)) / ROWS;

    board.style.height =
      `${borderY + paddingY + cellSize * COLS + gapY * (COLS - 1)}px`;
  } else {
    board.style.height = "";
  }

  const metrics = getGridMetrics(board, rotated);
  const target = cars.find(car => car.id === "target");

  positionExit(board, target, metrics);

  for (const car of cars) {
    renderCar(board, car, metrics, onPointerDown);
  }

  document.getElementById("moveCount").textContent = moves;
  bestCount.textContent = localStorage.getItem(bestKey) || "—";
}
