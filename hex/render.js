import { translate } from "./lang.js";

const SQRT3 = Math.sqrt(3);
const SVG_NS = "http://www.w3.org/2000/svg";
const BOARD_ROTATION = 30; // Clockwise in SVG coordinates

const RECORD_KEY = "hex-computer-record";
const lastWinnerByGame = new WeakMap();

export function renderGame(game, language) {
  const svg = document.querySelector("#board");
  const status = document.querySelector("#status");

  if (!svg || !status) return;

  const state = game.getState();
  const size = state.size;

  updateComputerRecord(game, state, language);

  const radius = size === 13 ? 16 : 19;
  const padding = radius + 5;

  const boardWidth = SQRT3 * radius * (1.5 * size - 0.5);
  const boardHeight = 1.5 * radius * (size - 1) + 2 * radius;
  const viewWidth = boardWidth + 2 * padding;
  const viewHeight = boardHeight + 2 * padding;

  svg.setAttribute("aria-label", `${size} × ${size} Hex board`);
  svg.replaceChildren();

  const centerX = viewWidth / 2;
  const centerY = viewHeight / 2;
  const radians = (BOARD_ROTATION * Math.PI) / 180;

  // Find the bounds of the hex vertices after rotation.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const { cx, cy } = cellCenter(row, col, size, radius, padding);

      for (const [x, y] of hexPoints(cx, cy, radius)) {
        const dx = x - centerX;
        const dy = y - centerY;
        const rotatedX =
          centerX + dx * Math.cos(radians) - dy * Math.sin(radians);
        const rotatedY =
          centerY + dx * Math.sin(radians) + dy * Math.cos(radians);

        minX = Math.min(minX, rotatedX);
        minY = Math.min(minY, rotatedY);
        maxX = Math.max(maxX, rotatedX);
        maxY = Math.max(maxY, rotatedY);
      }
    }
  }

  const margin = 7;
  const viewBoxX = minX - margin;
  const viewBoxY = minY - margin;
  const viewBoxWidth = maxX - minX + margin * 2;
  const viewBoxHeight = maxY - minY + margin * 2;

  svg.setAttribute(
    "viewBox",
    `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`
  );

  const board = document.createElementNS(SVG_NS, "g");
  board.setAttribute(
    "transform",
    `rotate(${BOARD_ROTATION} ${centerX} ${centerY})`
  );
  svg.append(board);

  const winning = new Set(
    (state.winningPath ?? []).map(([row, col]) => `${row},${col}`)
  );

  // Draw the hexes.
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const { cx, cy } = cellCenter(row, col, size, radius, padding);
      const occupant = state.board[row][col];

      const polygon = document.createElementNS(SVG_NS, "polygon");
      polygon.setAttribute(
        "points",
        hexPoints(cx, cy, radius)
          .map(([x, y]) => `${x},${y}`)
          .join(" ")
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

      board.append(polygon);
    }
  }

  // Draw the colored perimeter edges.
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const { cx, cy } = cellCenter(row, col, size, radius, padding);

      if (row === 0) {
        drawEdges(board, cx, cy, radius, [5, 0], "boundary-blue");
      }
      if (row === size - 1) {
        drawEdges(board, cx, cy, radius, [2, 3], "boundary-blue");
      }
      if (col === 0) {
        drawEdges(board, cx, cy, radius, [3, 4], "boundary-red");
      }
      if (col === size - 1) {
        drawEdges(board, cx, cy, radius, [0, 1], "boundary-red");
      }
    }
  }

  updateStatus(status, state, language);
}

function updateComputerRecord(game, state, language) {
  const recordElement = document.querySelector("#computer-record");
  if (!recordElement) return;

  if (state.mode !== "computer") {
    recordElement.hidden = true;
    return;
  }

  recordElement.hidden = false;

  const previousWinner = lastWinnerByGame.get(game) ?? null;

  if (state.winner && !previousWinner) {
    const record = readRecord();

    if (state.winner === state.humanPlayer) {
      record.wins += 1;
    } else {
      record.losses += 1;
    }

    try {
      localStorage.setItem(RECORD_KEY, JSON.stringify(record));
    } catch {
      // The in-memory display still works if storage is unavailable.
    }
  }

  lastWinnerByGame.set(game, state.winner ?? null);

  const record = readRecord();
  recordElement.textContent =
    `${translate(language, "winloss")}${record.wins}/${record.losses}`;
}

function readRecord() {
  try {
    const saved = JSON.parse(localStorage.getItem(RECORD_KEY));

    return {
      wins: Number.isFinite(saved?.wins) ? saved.wins : 0,
      losses: Number.isFinite(saved?.losses) ? saved.losses : 0
    };
  } catch {
    return { wins: 0, losses: 0 };
  }
}

function updateStatus(status, state, language) {
  if (state.winner) {
    const key =
      state.mode === "computer"
        ? state.winner === state.humanPlayer
          ? "youWin"
          : "computerWins"
        : state.winner === "red"
          ? "redWins"
          : "blueWins";

    status.textContent = translate(language, key);
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

function cellCenter(row, col, size, radius, padding) {
  const boardWidth = SQRT3 * radius * (1.5 * size - 0.5);
  const boardHeight = 1.5 * radius * (size - 1) + 2 * radius;
  const viewWidth = boardWidth + 2 * padding;
  const viewHeight = boardHeight + 2 * padding;
  const offsetX = (viewWidth - boardWidth) / 2;
  const offsetY = (viewHeight - boardHeight) / 2;

  return {
    cx: offsetX + (SQRT3 * radius) / 2 + SQRT3 * radius * (col + row / 2),
    cy: offsetY + radius + 1.5 * radius * row
  };
}

function hexPoints(cx, cy, radius) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (-90 + index * 60) * (Math.PI / 180);

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
