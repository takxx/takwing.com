const SVG_NS = "http://www.w3.org/2000/svg";

const workspace = document.querySelector("#workspace");
const info = document.querySelector("#info");

let pieces = [];
let selected = null;

let dragging = null;
let activePointerId = null;
let dragStartPoint = null;
let dragStartPosition = null;
let didDrag = false;

let lastTapPiece = null;
let lastTapTime = 0;
let tapTimer = null;

const shapes = [
  {
    name: "large-triangle-1",
    color: "#f97316",
    points: "0,0 200,0 0,200"
  },
  {
    name: "large-triangle-2",
    color: "#ef4444",
    points: "0,0 200,0 200,200"
  },
  {
    name: "medium-triangle",
    color: "#22c55e",
    points: "0,0 100,100 0,200"
  },
  {
    name: "small-triangle-1",
    color: "#38bdf8",
    points: "0,0 100,0 0,100"
  },
  {
    name: "small-triangle-2",
    color: "#06b6d4",
    points: "0,0 100,0 100,100"
  },
  {
    name: "square",
    color: "#eab308",
    points: "0,0 100,0 100,100 0,100"
  },
  {
    name: "parallelogram",
    color: "#ec4899",
    points: "0,0 100,0 200,100 100,100"
  }
];

/*
  These positions avoid the title and instructions at startup.
*/
const homePositions = [
  [100, 560],
  [340, 560],
  [650, 530],
  [120, 790],
  [270, 790],
  [450, 780],
  [700, 760]
];

function makeElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);

  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }

  return element;
}

function updatePiece(piece) {
  const x = Number(piece.dataset.x);
  const y = Number(piece.dataset.y);
  const rotation = Number(piece.dataset.rotation);
  const flip = Number(piece.dataset.flip);

  piece.setAttribute(
    "transform",
    `
      translate(${x} ${y})
      rotate(${rotation})
      scale(${flip} 1)
    `
  );
}

function selectPiece(piece) {
  pieces.forEach(item => {
    item.classList.remove("selected");
  });

  selected = piece;
  selected.classList.add("selected");

  // Move selected piece above all other pieces.
  workspace.appendChild(selected);
}

function rotatePiece(piece) {
  if (!piece) return;

  piece.dataset.rotation =
    Number(piece.dataset.rotation) + 45;

  updatePiece(piece);
}

function flipPiece(piece) {
  if (!piece) return;

  piece.dataset.flip =
    Number(piece.dataset.flip) * -1;

  updatePiece(piece);
}

function getSvgPoint(event) {
  const point = new DOMPoint(
    event.clientX,
    event.clientY
  );

  return point.matrixTransform(
    workspace.getScreenCTM().inverse()
  );
}

/*
  Begin dragging a piece.
*/
function startDragging(event) {
  event.preventDefault();

  const piece = event.currentTarget;
  selectPiece(piece);

  const point = getSvgPoint(event);

  dragging = piece;
  activePointerId = event.pointerId;
  didDrag = false;

  dragStartPoint = {
    x: point.x,
    y: point.y
  };

  dragStartPosition = {
    x: Number(piece.dataset.x),
    y: Number(piece.dataset.y)
  };

  /*
    Pointer capture keeps the drag alive even when the pointer
    leaves the rotated piece.
  */
  try {
    piece.setPointerCapture(event.pointerId);
  } catch {
    // Some browsers may not support pointer capture.
  }

  window.addEventListener("pointermove", dragPiece, {
    passive: false
  });

  window.addEventListener("pointerup", finishDragging);
  window.addEventListener("pointercancel", finishDragging);
}

/*
  Move by pointer delta rather than using the piece's bounding box.
  This avoids jumps after rotating or flipping.
*/
function dragPiece(event) {
  if (!dragging) return;
  if (event.pointerId !== activePointerId) return;

  event.preventDefault();

  const point = getSvgPoint(event);

  const dx = point.x - dragStartPoint.x;
  const dy = point.y - dragStartPoint.y;

  if (Math.hypot(dx, dy) > 5) {
    didDrag = true;

    if (info) {
      info.classList.add("hidden");
    }
  }

  dragging.dataset.x = dragStartPosition.x + dx;
  dragging.dataset.y = dragStartPosition.y + dy;

  updatePiece(dragging);
}

/*
  Finish dragging globally.
*/
function finishDragging(event) {
  if (!dragging) return;
  if (event.pointerId !== activePointerId) return;

  const piece = dragging;
  const wasDragged = didDrag;

  try {
    piece.releasePointerCapture(activePointerId);
  } catch {
    // Pointer capture may already have ended.
  }

  window.removeEventListener("pointermove", dragPiece);
  window.removeEventListener("pointerup", finishDragging);
  window.removeEventListener("pointercancel", finishDragging);

  dragging = null;
  activePointerId = null;
  dragStartPoint = null;
  dragStartPosition = null;
  didDrag = false;

  /*
    A drag should never also count as a tap.
  */
  if (wasDragged) {
    lastTapPiece = null;
    lastTapTime = 0;
    clearTimeout(tapTimer);
    return;
  }

  /*
    Only touchscreen taps use this behavior.
  */
  if (event.pointerType === "touch") {
    handleTouchTap(piece);
  }
}

/*
  Desktop right-click rotates.
*/
function handleContextMenu(event) {
  event.preventDefault();

  const piece = event.currentTarget;

  selectPiece(piece);
  rotatePiece(piece);
}

/*
  Desktop double-click flips.
*/
function handleDoubleClick(event) {
  event.preventDefault();

  const piece = event.currentTarget;

  selectPiece(piece);
  flipPiece(piece);
}

/*
  Touch controls:
  - Single tap rotates.
  - Double-tap flips.
*/
function handleTouchTap(piece) {
  const now = Date.now();

  selectPiece(piece);

  const isDoubleTap =
    lastTapPiece === piece &&
    now - lastTapTime < 320;

  clearTimeout(tapTimer);

  if (isDoubleTap) {
    lastTapPiece = null;
    lastTapTime = 0;

    flipPiece(piece);
    return;
  }

  lastTapPiece = piece;
  lastTapTime = now;

  tapTimer = setTimeout(() => {
    rotatePiece(piece);

    lastTapPiece = null;
    lastTapTime = 0;
  }, 320);
}

function createPieces() {
  workspace.innerHTML = "";
  pieces = [];

  shapes.forEach((shape, index) => {
    const piece = makeElement("polygon", {
      points: shape.points,
      fill: shape.color,
      class: "piece",
      "data-name": shape.name
    });

    piece.dataset.x = homePositions[index][0];
    piece.dataset.y = homePositions[index][1];
    piece.dataset.rotation = 0;
    piece.dataset.flip = 1;

    updatePiece(piece);

    workspace.appendChild(piece);
    pieces.push(piece);

    piece.addEventListener("pointerdown", startDragging);
    piece.addEventListener("contextmenu", handleContextMenu);
    piece.addEventListener("dblclick", handleDoubleClick);
  });
}

createPieces();
