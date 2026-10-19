import { EMPTY, BLACK, WHITE } from "./board4.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

function createSvgElement(tagName, attributes = {}) {
  const element = document.createElementNS(SVG_NAMESPACE, tagName);

  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, String(value));
  }

  return element;
}

function squarePoints(position, cellSize) {
  const half = cellSize / 2;
  const x = position.x;
  const y = position.y;

  return [
    [x - half, y - half],
    [x + half, y - half],
    [x + half, y + half],
    [x - half, y + half]
  ];
}

function hexPoints(position, cellSize) {
  const points = [];

  for (let index = 0; index < 6; index += 1) {
    const angle = Math.PI / 180 * (60 * index);
    points.push([
      position.x + cellSize * Math.cos(angle),
      position.y + cellSize * Math.sin(angle)
    ]);
  }

  return points;
}

function pointsAttribute(points) {
  return points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
}

export class BoardRenderer {
  constructor(boardElement, onCellClick) {
    this.boardElement = boardElement;
    this.onCellClick = onCellClick;
  }

  render({ boardDefinition, board, legalMoveIds, hintId }) {
    const geometry = boardDefinition.geometry;
    const positions = geometry.positions;

    const xs = positions.map(position => position.x);
    const ys = positions.map(position => position.y);
    const cellSize = geometry.cellSize;

    const minX = Math.min(...xs) - cellSize;
    const maxX = Math.max(...xs) + cellSize;
    const minY = Math.min(...ys) - cellSize;
    const maxY = Math.max(...ys) + cellSize;

    this.boardElement.setAttribute(
      "viewBox",
      `${minX.toFixed(2)} ${minY.toFixed(2)} ${(maxX - minX).toFixed(2)} ${(maxY - minY).toFixed(2)}`
    );

    this.boardElement.replaceChildren();

    const legalIds = new Set(legalMoveIds);

    for (const position of positions) {
      const value = board.get(position.id) ?? EMPTY;
      const isLegal = legalIds.has(position.id);
      const isHint = hintId === position.id;

      const group = createSvgElement("g", {
        class: `board-cell${isLegal ? " legal" : ""}`,
        "data-cell-id": position.id,
        role: "gridcell",
        "aria-label": boardDefinition.positionName(position.id)
      });

      const shapePoints =
        geometry.kind === "hex"
          ? hexPoints(position, cellSize * 0.96)
          : squarePoints(position, cellSize * 0.96);

      const shape = createSvgElement("polygon", {
        points: pointsAttribute(shapePoints),
        fill: "var(--board-green)",
        stroke: "var(--board-line)",
        "stroke-width": geometry.kind === "hex" ? 2 : 1
      });

      group.appendChild(shape);

      if (value !== EMPTY) {
        group.appendChild(
          createSvgElement("circle", {
            cx: position.x,
            cy: position.y,
            r: cellSize * 0.36,
            class: value === BLACK ? "disk-black" : "disk-white"
          })
        );
      }

      if (isLegal) {
        group.appendChild(
          createSvgElement("circle", {
            cx: position.x,
            cy: position.y,
            r: cellSize * 0.13,
            class: "legal-marker"
          })
        );
      }

      if (isHint) {
        group.appendChild(
          createSvgElement("circle", {
            cx: position.x,
            cy: position.y,
            r: cellSize * 0.25,
            class: "hint-marker"
          })
        );
      }

      if (isLegal) {
        group.addEventListener("click", () => {
          this.onCellClick(position.id);
        });
      }

      this.boardElement.appendChild(group);
    }
  }
}