const COLUMN_COUNT = 17;
const INITIAL_TOP_ROW = 45;
const INITIAL_BOTTOM_ROW = 53;
const ROWS_PER_EXTENSION = 4;
const TURN_MARGIN = 2;

const FLOW_DIRECTIONS = Object.freeze({
  WE: { dr: 0, dc: 1 },
  EW: { dr: 0, dc: -1 },
  SN: { dr: -1, dc: 0 },
  NS: { dr: 1, dc: 0 }
});

const CLOCKWISE_FLOW = Object.freeze({
  WE: "NS",
  NS: "EW",
  EW: "SN",
  SN: "WE"
});

const COUNTERCLOCKWISE_FLOW = Object.freeze({
  WE: "SN",
  SN: "EW",
  EW: "NS",
  NS: "WE"
});

function coordinate(row, col) {
  return `${String.fromCharCode(65 + col)}${String(row).padStart(2, "0")}`;
}

function pipPositions(value) {
  const positions = {
    0: [],
    1: [5],
    2: [1, 9],
    3: [1, 5, 9],
    4: [1, 3, 7, 9],
    5: [1, 3, 5, 7, 9],
    6: [1, 3, 4, 6, 7, 9]
  };

  return positions[value] || [];
}

function createPipHalf(value) {
  const half = document.createElement("div");
  half.className = "domino-half";

  const pips = document.createElement("div");
  pips.className = "pips";

  for (const position of pipPositions(value)) {
    const pip = document.createElement("span");
    pip.className = `pip pip-${position}`;
    pips.appendChild(pip);
  }

  half.appendChild(pips);
  return half;
}

function isHorizontalFlow(flow) {
  return flow === "WE" || flow === "EW";
}

function createTurnState() {
  return {
    left: { preferred: "clockwise", count: 0 },
    right: { preferred: "clockwise", count: 0 }
  };
}

export function createRenderer(elements) {
  const {
    board,
    playerHand,
    computerHand,
    playerCount,
    computerCount,
    boneyardCount,
    score,
    status
  } = elements;

  // Grid entries are stored by their stable, displayed row and column.
  // Extending the board never renumbers cells already on it.
  let cells = new Map();
  let topRow = INITIAL_TOP_ROW;
  let bottomRow = INITIAL_BOTTOM_ROW;
  let visualTiles = [];
  let endpoints = { left: null, right: null };

  // Each end tracks its turning preference independently.
  let turnState = createTurnState();

  function key(point) {
    return `${point.row}:${point.col}`;
  }

  function inside(point) {
    return (
      point.row >= topRow &&
      point.row <= bottomRow &&
      point.col >= 0 &&
      point.col < COLUMN_COUNT
    );
  }

  function read(point) {
    return inside(point) ? (cells.get(key(point)) ?? null) : null;
  }

  function write(point, descriptor) {
    if (!inside(point)) {
      throw new Error(
        `Cannot write outside board at ${coordinate(point.row, point.col)}.`
      );
    }

    cells.set(key(point), descriptor);
  }

  function isEmpty(point) {
    return inside(point) && read(point) === null;
  }

  function add(point, flow, amount = 1) {
    const direction = FLOW_DIRECTIONS[flow];

    return {
      row: point.row + direction.dr * amount,
      col: point.col + direction.dc * amount
    };
  }

  function extendToward(point) {
    if (point.row < topRow) {
      topRow -= ROWS_PER_EXTENSION;
      return;
    }

    if (point.row > bottomRow) {
      bottomRow += ROWS_PER_EXTENSION;
    }
  }

  function markerRoleFor(side) {
    return side === "left" ? "open-left" : "open-right";
  }

  function matchingRoleFor(side) {
    return side === "left" ? "right" : "left";
  }

  function exposedRoleFor(side) {
    return side === "left" ? "left" : "right";
  }

  function setOpenMarker(side, point, pip, flow) {
    write(point, [pip, markerRoleFor(side), flow]);
  }

  function assertEndpointMarker(side, matchingPip) {
    const endpoint = endpoints[side];

    if (!endpoint) {
      throw new Error(`The ${side} endpoint has not been initialized.`);
    }

    const descriptor = read(endpoint.marker);

    if (!descriptor) {
      throw new Error(
        `Missing ${side} open marker at ${coordinate(
          endpoint.marker.row,
          endpoint.marker.col
        )}.`
      );
    }

    const [reservedPip, role, flow] = descriptor;

    if (
      reservedPip !== endpoint.value ||
      reservedPip !== matchingPip ||
      role !== markerRoleFor(side) ||
      flow !== endpoint.flow
    ) {
      throw new Error(
        `Invalid ${side} endpoint marker at ${coordinate(
          endpoint.marker.row,
          endpoint.marker.col
        )}.`
      );
    }
  }

  function distanceToEdge(point, flow) {
    const direction = FLOW_DIRECTIONS[flow];

    if (direction.dc === 1) return COLUMN_COUNT - 1 - point.col;
    if (direction.dc === -1) return point.col;
    if (direction.dr === 1) return bottomRow - point.row;

    return point.row - topRow;
  }

  function shouldTurnAt(point, flow) {
    return distanceToEdge(point, flow) <= TURN_MARGIN;
  }

  function createCandidate(marker, flow) {
    return {
      flow,
      first: marker,
      second: add(marker, flow),
      nextMarker: add(marker, flow, 2)
    };
  }

  function candidateFits(side, candidate) {
    const endpoint = endpoints[side];
    const firstDescriptor = read(candidate.first);

    const firstIsCurrentMarker =
      firstDescriptor &&
      firstDescriptor[0] === endpoint.value &&
      firstDescriptor[1] === markerRoleFor(side) &&
      firstDescriptor[2] === endpoint.flow;

    return (
      firstIsCurrentMarker &&
      isEmpty(candidate.second) &&
      inside(candidate.nextMarker) &&
      isEmpty(candidate.nextMarker)
    );
  }

  function straightPathIsClear(candidate) {
    const beyond = add(candidate.nextMarker, candidate.flow);

    return (
      isEmpty(candidate.second) &&
      isEmpty(candidate.nextMarker) &&
      inside(beyond) &&
      isEmpty(beyond)
    );
  }

  function turnOrder(side) {
    return turnState[side].preferred === "clockwise"
      ? ["clockwise", "counterclockwise"]
      : ["counterclockwise", "clockwise"];
  }

  function recordTurn(side) {
    const state = turnState[side];
    state.count += 1;

    if (state.count === 2) {
      state.count = 0;
      state.preferred =
        state.preferred === "clockwise" ? "counterclockwise" : "clockwise";
    }
  }

  function chooseNormalPath(side) {
    const endpoint = endpoints[side];
    const straight = createCandidate(endpoint.marker, endpoint.flow);

    if (
      !shouldTurnAt(endpoint.marker, endpoint.flow) &&
      straightPathIsClear(straight)
    ) {
      return straight;
    }

    const turnFlows = {
      clockwise: CLOCKWISE_FLOW[endpoint.flow],
      counterclockwise: COUNTERCLOCKWISE_FLOW[endpoint.flow]
    };

for (const turn of turnOrder(side)) {
  const candidate = createCandidate(endpoint.marker, turnFlows[turn]);

  if (
    candidate.nextMarker.col >= 0 &&
    candidate.nextMarker.col < COLUMN_COUNT &&
    (candidate.nextMarker.row < topRow ||
      candidate.nextMarker.row > bottomRow)
  ) {
    extendToward(candidate.nextMarker);
  }

  if (candidateFits(side, candidate)) {
    recordTurn(side);
    return candidate;
  }
}
    // If the snake needs vertical room, add rows on the side it is
    // approaching, then retry the straight route.
    const nextMarker = straight.nextMarker;

    if (
      (nextMarker.row < topRow || nextMarker.row > bottomRow) &&
      nextMarker.col >= 0 &&
      nextMarker.col < COLUMN_COUNT
    ) {
      extendToward(nextMarker);

      if (candidateFits(side, straight)) {
        return straight;
      }
    }

    if (candidateFits(side, straight)) {
      return straight;
    }

    return null;
  }

  function reset(opening) {
    cells = new Map();
    topRow = INITIAL_TOP_ROW;
    bottomRow = INITIAL_BOTTOM_ROW;
    visualTiles = [];
    turnState = createTurnState();

    const center = { row: 49, col: 8 };
    const leftMarker = { row: 49, col: 7 };
    const rightMarker = { row: 49, col: 9 };

    write(center, [opening.value, "double", "EW"]);
    setOpenMarker("left", leftMarker, opening.value, "EW");
    setOpenMarker("right", rightMarker, opening.value, "WE");

    visualTiles.push({ kind: "double", center, flow: "EW" });

    endpoints = {
      left: { marker: leftMarker, flow: "EW", value: opening.value },
      right: { marker: rightMarker, flow: "WE", value: opening.value }
    };

    renderBoard();
  }

  function placeNormal(placement) {
    const { side } = placement;
    assertEndpointMarker(side, placement.matching);

    const path = chooseNormalPath(side);

    if (!path) {
      throw new Error(`No contiguous route is available for the ${side} chain.`);
    }

    write(path.first, [
      placement.matching,
      matchingRoleFor(side),
      path.flow
    ]);

    write(path.second, [
      placement.exposed,
      exposedRoleFor(side),
      path.flow
    ]);

    setOpenMarker(side, path.nextMarker, placement.exposed, path.flow);

    visualTiles.push({
      kind: "normal",
      cells: [path.first, path.second]
    });

    endpoints[side] = {
      marker: path.nextMarker,
      flow: path.flow,
      value: placement.exposed
    };
  }

  function placeDouble(placement) {
    const { side } = placement;
    const endpoint = endpoints[side];

    assertEndpointMarker(side, placement.matching);

    const center = endpoint.marker;
    const nextMarker = add(center, endpoint.flow);
      
    if (
      nextMarker.col >= 0 &&
      nextMarker.col < COLUMN_COUNT &&
      (nextMarker.row < topRow || nextMarker.row > bottomRow)
    ) {
      extendToward(nextMarker);
    }

    if (!inside(nextMarker) || !isEmpty(nextMarker)) {
      throw new Error(`No space is available for a ${side} double.`);
    }

    write(center, [placement.matching, "double", endpoint.flow]);
    setOpenMarker(side, nextMarker, placement.exposed, endpoint.flow);

    visualTiles.push({
      kind: "double",
      center,
      flow: endpoint.flow
    });

    endpoints[side] = {
      marker: nextMarker,
      flow: endpoint.flow,
      value: placement.exposed
    };
  }

  function place(placement) {
    if (placement.side !== "left" && placement.side !== "right") {
      throw new Error(`Invalid placement side "${placement.side}".`);
    }

    if (
      !Number.isInteger(placement.matching) ||
      placement.matching < 0 ||
      placement.matching > 6 ||
      !Number.isInteger(placement.exposed) ||
      placement.exposed < 0 ||
      placement.exposed > 6
    ) {
      throw new Error("Placement pips must be integers from 0 through 6.");
    }

    if (placement.double) {
      placeDouble(placement);
    } else {
      placeNormal(placement);
    }

    renderBoard();
  }

  function renderGridCells(unit) {
    const fragment = document.createDocumentFragment();
    const rowCount = bottomRow - topRow + 1;

    board.style.setProperty("--board-columns", String(COLUMN_COUNT));
    board.style.setProperty("--board-rows", String(rowCount));
    board.style.setProperty("--board-height", `${rowCount * unit}px`);
    board.replaceChildren();

    for (let row = topRow; row <= bottomRow; row += 1) {
      for (let col = 0; col < COLUMN_COUNT; col += 1) {
        const point = { row, col };
        const cell = document.createElement("div");
        const descriptor = read(point);

        cell.className = "board-cell";
        cell.dataset.coordinate = coordinate(row, col);
        cell.setAttribute("role", "gridcell");
        cell.setAttribute("aria-label", coordinate(row, col));

        if (descriptor) {
          const [pip, role, flow] = descriptor;
          cell.dataset.pip = String(pip);
          cell.dataset.role = role;
          cell.dataset.flow = flow;

          if (role === "open-left" || role === "open-right") {
            cell.classList.add(role);
          }
        }

        fragment.appendChild(cell);
      }
    }

    board.appendChild(fragment);
  }

  function renderNormalTile(tileData, unit) {
    const [first, second] = tileData.cells;
    const firstDescriptor = read(first);
    const secondDescriptor = read(second);

    if (!firstDescriptor || !secondDescriptor) {
      throw new Error("Cannot render a normal domino without both descriptors.");
    }

    const horizontal = first.row === second.row;
    const startRow = Math.min(first.row, second.row);
    const startCol = Math.min(first.col, second.col);
    const tile = document.createElement("div");

    tile.className = `board-domino ${horizontal ? "horizontal" : "vertical"}`;
    tile.style.left = `${startCol * unit}px`;
    tile.style.top = `${(startRow - topRow) * unit}px`;
    tile.style.width = `${horizontal ? unit * 2 : unit}px`;
    tile.style.height = `${horizontal ? unit : unit * 2}px`;

    const firstBeforeSecond = horizontal
      ? first.col < second.col
      : first.row < second.row;

    const orderedPips = firstBeforeSecond
      ? [firstDescriptor[0], secondDescriptor[0]]
      : [secondDescriptor[0], firstDescriptor[0]];

    tile.append(createPipHalf(orderedPips[0]), createPipHalf(orderedPips[1]));
    board.appendChild(tile);
  }

  function renderDoubleTile(tileData, unit) {
    const descriptor = read(tileData.center);

    if (!descriptor) {
      throw new Error("Cannot render a double without its board descriptor.");
    }

    const [pip] = descriptor;
    const vertical = isHorizontalFlow(tileData.flow);
    const tile = document.createElement("div");

    tile.className = `board-domino board-double ${
      vertical ? "vertical" : "horizontal"
    }`;

    if (vertical) {
      tile.style.left = `${tileData.center.col * unit}px`;
      tile.style.top = `${
        (tileData.center.row - topRow - 0.5) * unit
      }px`;
      tile.style.width = `${unit}px`;
      tile.style.height = `${unit * 2}px`;
    } else {
      tile.style.left = `${(tileData.center.col - 0.5) * unit}px`;
      tile.style.top = `${(tileData.center.row - topRow) * unit}px`;
      tile.style.width = `${unit * 2}px`;
      tile.style.height = `${unit}px`;
    }

    tile.append(createPipHalf(pip), createPipHalf(pip));
    board.appendChild(tile);
  }

  function renderBoard() {
    const width = board.getBoundingClientRect().width;

    if (!width) return;

    const unit = width / COLUMN_COUNT;
    const rowCount = bottomRow - topRow + 1;

    renderGridCells(unit);
    board.style.height = `${unit * rowCount}px`;

    for (const tileData of visualTiles) {
      if (tileData.kind === "double") {
        renderDoubleTile(tileData, unit);
      } else {
        renderNormalTile(tileData, unit);
      }
    }
  }

  function renderHand(tiles, options) {
    const fragment = document.createDocumentFragment();

    for (const tile of tiles) {
      const playable = options.enabled && options.isPlayable(tile);
      const button = document.createElement("button");

      button.type = "button";
      button.className = `hand-domino${playable ? " playable" : ""}`;
      button.disabled = !playable;
      button.title = `${tile.a}-${tile.b}`;
      button.setAttribute("aria-label", `${tile.a}-${tile.b}`);
      button.append(createPipHalf(tile.a), createPipHalf(tile.b));

      if (playable) {
        button.addEventListener("click", () => options.onTileClick(tile));
      }

      fragment.appendChild(button);
    }

    playerHand.replaceChildren(fragment);
  }

  function renderComputerHand(count) {
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < count; index += 1) {
      const tileBack = document.createElement("span");
      tileBack.className = "computer-back";
      tileBack.setAttribute("aria-hidden", "true");
      fragment.appendChild(tileBack);
    }

    computerHand.replaceChildren(fragment);
  }

  function renderStats(values) {
    playerCount.textContent = values.playerTiles;
    computerCount.textContent = values.computerTiles;
    boneyardCount.textContent = values.boneyardTiles;
    score.textContent = `${values.playerWins} – ${values.computerWins}`;
    status.textContent = values.message || "";
  }

  function boardSnapshot() {
    return Array.from({ length: bottomRow - topRow + 1 }, (_, index) => {
      const row = topRow + index;

      return Array.from({ length: COLUMN_COUNT }, (_, col) =>
        cells.get(key({ row, col })) ?? null
      );
    });
  }

  return {
    reset,
    place,
    renderBoard,
    renderHand,
    renderComputerHand,
    renderStats,
    boardSnapshot
  };
}
