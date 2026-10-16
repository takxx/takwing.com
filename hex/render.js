import { translate } from "./lang.js";

const SQRT3 = Math.sqrt(3);
const SVG_NS = "http://www.w3.org/2000/svg";

export function renderGame(game, language) {
  const svg = document.querySelector("#board");
  const status = document.querySelector("#status");
  const state = game.getState();
  const size = state.size;

  // Smaller viewBox radius for 13x13; CSS scales the whole SVG to fit.
  const radius = size === 13 ? 16 : 19;
  const padding = radius + 5;

  const boardWidth = SQRT3 * radius * (1.5 * size - 0.5);
  const boardHeight = 1.5 * radius * (size - 1) + 2 * radius;
  const viewWidth = boardWidth + 2 * padding;
  const viewHeight = boardHeight + 2 * padding;

  svg.setAttribute("viewBox", `0 0 ${viewWidth} ${viewHeight}`);
  svg.setAttribute("aria-label", `${size} × ${size} Hex board`);
  svg.replaceChildren();

  const winning = new Set(
    state.winningPath.map(([row, col]) => `${row},${col}`)
  );

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const cx = padding + SQRT3 * radius / 2 +
        SQRT3 * radius * (col + row / 2);
      const cy = padding + radius + 1.5 * radius * row;
      const occupant = state.board[row][col];

      const polygon = document.createElementNS(SVG_NS, "polygon");
      polygon.setAttribute(
        "points",
        hexPoints(cx, cy, radius).map(([x, y]) => `${x},${y}`).join(" ")
      );
      polygon.setAttribute(
        "class",
        `cell ${occupant ? `cell-${occupant}` : "cell-empty"}` +
          (winning.has(`${row},${col}`) ? " cell-winning" : "")
      );
      polygon.setAttribute(
        "tabindex",
        occupant || state.winner || state.aiThinking ? "-1" : "0"
      );
      polygon.setAttribute("role", "gridcell");
      polygon.dataset.row = row;
      polygon.dataset.col = col;
      polygon.setAttribute(
        "aria-label",
        translate(language, "cellLabel", row + 1, col + 1, occupant)
      );
      svg.append(polygon);
    }
  }

  // Draw the board's colored sides over the cell outlines.
  // Blue: top and bottom. Red: left and right.
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const cx = padding + SQRT3 * radius / 2 +
        SQRT3 * radius * (col + row / 2);
      const cy = padding + radius + 1.5 * radius * row;

      if (row === 0) {
        drawEdges(svg, cx, cy, radius, [5, 0], "boundary-blue");
      }
      if (row === size - 1) {
        drawEdges(svg, cx, cy, radius, [2, 3], "boundary-blue");
      }
      if (col === 0) {
        drawEdges(svg, cx, cy, radius, [3, 4], "boundary-red");
      }
      if (col === size - 1) {
        drawEdges(svg, cx, cy, radius, [0, 1], "boundary-red");
      }
    }
  }

  if (state.winner) {
    status.textContent = translate(
      language,
      state.mode === "computer"
        ? (state.winner === state.humanPlayer ? "youWin" : "computerWins")
        : (state.winner === "red" ? "redWins" : "blueWins")
    );
  } else if (state.aiThinking) {
    status.textContent = translate(language, "computerTurn");
  } else if (state.mode === "computer") {
    status.textContent = translate(
      language,
      "yourTurn",
      state.currentPlayer
    );
  } else {
    status.textContent = translate(
      language,
      state.currentPlayer === "red" ? "redTurn" : "blueTurn"
    );
  }
}

function hexPoints(cx, cy, radius) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (-90 + index * 60) * Math.PI / 180;
    return [
      cx + radius * Math.cos(angle),
      cy + radius * Math.sin(angle)
    ];
  });
}

function drawEdges(svg, cx, cy, radius, edgeIndexes, className) {
  const vertices = hexPoints(cx, cy, radius);

  for (const index of edgeIndexes) {
    const start = vertices[index];
    const end = vertices[(index + 1) % vertices.length];
    const line = document.createElementNS(SVG_NS, "line");

    line.setAttribute("x1", start[0]);
    line.setAttribute("y1", start[1]);
    line.setAttribute("x2", end[0]);
    line.setAttribute("y2", end[1]);
    line.setAttribute("class", `boundary ${className}`);
    svg.append(line);
  }
}
