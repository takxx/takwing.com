import {
  applyLanguage,
  getInitialLanguage,
  translate,
} from "./lang.js";

import {
  COLS,
  ROWS,
  createCells,
  isRotatedLayout,
  render,
} from "./render.js";

import {
  cloneCars,
  generatePuzzle,
} from "./genpuzzle.js";

const board = document.getElementById("board");
const bestCount = document.getElementById("bestCount");
const message = document.getElementById("message");
const languageSelect = document.getElementById("language");

let cars = [];
let startingCars = [];
let moves = 0;
let puzzleNumber = 0;
let solved = false;
let language = getInitialLanguage();

function bestKey() {
  return `rush-hour-best-${language}-${puzzleNumber}`;
}

function draw() {
  render({
    board,
    cars,
    moves,
    bestCount,
    bestKey: bestKey(),
    onPointerDown: dragCar,
  });
}

function resetPuzzle() {
  cars = cloneCars(startingCars);
  moves = 0;
  solved = false;
  message.textContent = "";
  draw();
}

function newPuzzle() {
  puzzleNumber += 1;
  cars = generatePuzzle();

  for (const car of cars) {
    if (car.id === "target") {
      car.label = translate(language, "youLabel");
    }
  }

  startingCars = cloneCars(cars);
  moves = 0;
  solved = false;
  message.textContent = "";
  draw();
}

function checkWin() {
  const target = cars.find(car => car.id === "target");

  if (!target || target.col + target.length < COLS || solved) return;

  solved = true;
  const oldBest = Number(localStorage.getItem(bestKey()));

  if (!oldBest || moves < oldBest) {
    localStorage.setItem(bestKey(), moves);
  }

  message.textContent = translate(language, "solved")
    .replace("{moves}", moves);

  draw();

  setTimeout(() => {
    const result = window.confirm(
      `${translate(language, "solvedTitle")}\n\n` +
      `${translate(language, "solvedMessage").replace("{moves}", moves)}\n\n` +
      translate(language, "newGameOk")
    );

    if (result) newPuzzle();
  }, 50);
}

function canPlace(car, row, col) {
  const occupied = new Set();

  for (const other of cars) {
    if (other.id === car.id) continue;

    for (let i = 0; i < other.length; i += 1) {
      const occupiedRow = other.row + (other.dir === "v" ? i : 0);
      const occupiedCol = other.col + (other.dir === "h" ? i : 0);
      occupied.add(`${occupiedRow},${occupiedCol}`);
    }
  }

  for (let i = 0; i < car.length; i += 1) {
    const candidateRow = row + (car.dir === "v" ? i : 0);
    const candidateCol = col + (car.dir === "h" ? i : 0);

    if (
      candidateRow < 0 ||
      candidateRow >= ROWS ||
      candidateCol < 0 ||
      candidateCol >= COLS ||
      occupied.has(`${candidateRow},${candidateCol}`)
    ) {
      return false;
    }
  }

  return true;
}

function dragCar(event, car, element, metrics) {
  if (solved) {
    event.preventDefault();
    return;
  }

  event.preventDefault();

  const startX = event.clientX;
  const startY = event.clientY;
  const originalRow = car.row;
  const originalCol = car.col;

  element.setPointerCapture(event.pointerId);

function move(pointerEvent) {
  const dx = pointerEvent.clientX - startX;
  const dy = pointerEvent.clientY - startY;

  let requestedRow = originalRow;
  let requestedCol = originalCol;

  if (!metrics.rotated) {
    if (car.dir === "h") {
      requestedCol += Math.round(dx / metrics.stepX);
    } else {
      requestedRow += Math.round(dy / metrics.stepY);
    }
  } else if (car.dir === "h") {
    // On the rotated board, screen-down moves an original horizontal car right.
    requestedCol += Math.round(dy / metrics.stepY);
  } else {
    // On the rotated board, screen-right moves an original vertical car upward.
    requestedRow -= Math.round(dx / metrics.stepX);
  }

  let row = originalRow;
  let col = originalCol;

  while (row !== requestedRow || col !== requestedCol) {
    const nextRow = row + Math.sign(requestedRow - row);
    const nextCol = col + Math.sign(requestedCol - col);

    if (!canPlace(car, nextRow, nextCol)) break;

    row = nextRow;
    col = nextCol;
  }

  car.row = row;
  car.col = col;

  const screenRow = metrics.rotated ? col : row;
  const screenCol = metrics.rotated
    ? car.dir === "v"
      ? ROWS - 1 - (row + car.length - 1)
      : ROWS - 1 - row
    : col;

  element.style.left =
    `${metrics.paddingLeft + screenCol * metrics.stepX}px`;
  element.style.top =
    `${metrics.paddingTop + screenRow * metrics.stepY}px`;
}

  function end() {
    if (car.row !== originalRow || car.col !== originalCol) {
      moves += 1;
      draw();
      checkWin();
    }

    element.removeEventListener("pointermove", move);
    element.removeEventListener("pointerup", end);
    element.removeEventListener("pointercancel", end);
  }

  element.addEventListener("pointermove", move);
  element.addEventListener("pointerup", end);
  element.addEventListener("pointercancel", end);
}

function updateLanguage() {
  language = languageSelect.value;
  localStorage.setItem("rush-hour-language", language);
  applyLanguage(language, cars, { message });
  draw();
}

document.getElementById("resetButton").addEventListener("click", resetPuzzle);
document.getElementById("newButton").addEventListener("click", newPuzzle);

languageSelect.value = language;
languageSelect.addEventListener("change", updateLanguage);

window.addEventListener("resize", draw);
window.matchMedia("(max-width: 600px)").addEventListener("change", draw);

createCells(board);
applyLanguage(language, cars, { message });
newPuzzle();
