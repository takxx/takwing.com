import {
  applyLanguage,
  getInitialLanguage,
  SUPPORTED_LANGUAGES,
  translate,
} from "./lang.js";

import {
  createCells,
  getGridMetrics,
  render,
} from "./render.js";

import {
  cloneCars,
  generatePuzzle,
  legalPositions,
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

  if (target.col + target.length < 9 || solved) return;

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
      const rowAt = other.row + (other.dir === "v" ? i : 0);
      const colAt = other.col + (other.dir === "h" ? i : 0);
      occupied.add(`${rowAt},${colAt}`);
    }
  }

  for (let i = 0; i < car.length; i += 1) {
    const rowAt = row + (car.dir === "v" ? i : 0);
    const colAt = col + (car.dir === "h" ? i : 0);

    if (
      rowAt < 0 || rowAt >= 6 ||
      colAt < 0 || colAt >= 9 ||
      occupied.has(`${rowAt},${colAt}`)
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
    let row = originalRow;
    let col = originalCol;

    if (car.dir === "h") {
      col += Math.round(dx / metrics.stepX);
    } else {
      row += Math.round(dy / metrics.stepY);
    }

    if (!canPlace(car, row, col)) return;

    car.row = row;
    car.col = col;

    // Update visual position without rebuilding the board mid-drag.
    const left = metrics.paddingLeft + col * metrics.stepX;
    const top = metrics.paddingTop + row * metrics.stepY;
    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
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

createCells(board);
applyLanguage(language, cars, { message });
newPuzzle();
