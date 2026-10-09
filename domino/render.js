/*
  render.js

  Renderer-only module.

  - A01–Q17 board coordinates
  - Board descriptors and renderer invariants
  - Physical tile placement
  - Directed snake routing
  - Clockwise turns
  - DOM rendering for board and hands

  Board descriptor:
  [pip, role, flow]

  role:
  - "left"       = exposed side of a tile placed on the logical left chain
  - "right"      = exposed side of a tile placed on the logical right chain
  - "double"     = a double, centered on its logical board cell
  - "open-left"  = reserved next connection for the logical left chain
  - "open-right" = reserved next connection for the logical right chain

  Directed flow convention:
  - WE = west → east   (move right / dc +1)
  - EW = east → west   (move left  / dc -1)
  - SN = south → north (move up    / dr -1)
  - NS = north → south (move down  / dr +1)

  Clockwise turns:
  - WE → NS
  - NS → EW
  - EW → SN
  - SN → WE

  Opening for a 6-6:
  H09 = [6, "open-left", "EW"]
  I09 = [6, "double", "EW"]
  J09 = [6, "open-right", "WE"]
*/

const BOARD_SIZE = 17;
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
  return `${String.fromCharCode(65 + col)}${String(row + 1).padStart(2, "0")}`;
}

function createEmptyBoard() {
  return Array.from(
    { length: BOARD_SIZE },
    () => Array.from({ length: BOARD_SIZE }, () => null)
  );
}

function add(point, flow, amount = 1) {
  const direction = FLOW_DIRECTIONS[flow];

  return {
    row: point.row + direction.dr * amount,
    col: point.col + direction.dc * amount
  };
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

  let grid = createEmptyBoard();
  let visualTiles = [];

  /*
    Every endpoint has exactly one current reserved marker.

    That marker:
    - contains the only pip allowed to join that chain end
    - is the exact square consumed by the next tile
    - is never skipped on a turn
  */
  let endpoints = {
    left: null,
    right: null
  };

  function inside(point) {
    return point.row >= 0
      && point.row < BOARD_SIZE
      && point.col >= 0
      && point.col < BOARD_SIZE;
  }

  function read(point) {
    return inside(point)
      ? grid[point.row][point.col]
      : null;
  }

  function write(point, descriptor) {
    if (!inside(point)) {
      throw new Error(
        `Cannot write outside board at ${coordinate(point.row, point.col)}.`
      );
    }

    grid[point.row][point.col] = descriptor;
  }

  function isEmpty(point) {
    return inside(point) && read(point) === null;
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
        `Missing ${side} open marker at ${
          coordinate(endpoint.marker.row, endpoint.marker.col)
        }.`
      );
    }

    const [reservedPip, role, flow] = descriptor;

    if (reservedPip !== endpoint.value) {
      throw new Error(
        `Endpoint state mismatch at ${
          coordinate(endpoint.marker.row, endpoint.marker.col)
        }. Endpoint value is ${endpoint.value}; marker pip is ${reservedPip}.`
      );
    }

    if (reservedPip !== matchingPip) {
      throw new Error(
        `Invalid renderer connection at ${
          coordinate(endpoint.marker.row, endpoint.marker.col)
        }. Reserved pip is ${reservedPip}; tile matching pip is ${matchingPip}.`
      );
    }

    if (role !== markerRoleFor(side)) {
      throw new Error(
        `Invalid marker role at ${
          coordinate(endpoint.marker.row, endpoint.marker.col)
        }. Expected "${markerRoleFor(side)}"; got "${role}".`
      );
    }

    if (flow !== endpoint.flow) {
      throw new Error(
        `Invalid marker flow at ${
          coordinate(endpoint.marker.row, endpoint.marker.col)
        }. Expected "${endpoint.flow}"; got "${flow}".`
      );
    }
  }

  function distanceToEdge(point, flow) {
    const direction = FLOW_DIRECTIONS[flow];

    if (direction.dc === 1) {
      return BOARD_SIZE - 1 - point.col;
    }

    if (direction.dc === -1) {
      return point.col;
    }

    if (direction.dr === 1) {
      return BOARD_SIZE - 1 - point.row;
    }

    return point.row;
  }

  function shouldTurnAt(marker, flow) {
    /*
      A normal domino consumes:
      - marker       = matching half
      - next square  = exposed half
      - next + one   = next open marker

      So it needs two positions ahead after the marker.
    */
    return distanceToEdge(marker, flow) <= TURN_MARGIN;
  }

  /*
    Every candidate starts at the exact current marker.

    The next marker is one cell beyond the exposed half.
  */
  function createCandidate(marker, flow) {
    const first = marker;
    const second = add(marker, flow, 1);
    const nextMarker = add(second, flow, 1);

    return {
      flow,
      first,
      second,
      nextMarker
    };
  }

  function candidateFits(side, candidate) {
    const endpoint = endpoints[side];
    const firstDescriptor = read(candidate.first);

    const firstIsCurrentMarker = firstDescriptor
      && firstDescriptor[0] === endpoint.value
      && firstDescriptor[1] === markerRoleFor(side)
      && firstDescriptor[2] === endpoint.flow;

    return firstIsCurrentMarker
      && isEmpty(candidate.second)
      && inside(candidate.nextMarker)
      && isEmpty(candidate.nextMarker);
  }

  function chooseNormalPath(side) {
    const endpoint = endpoints[side];

    const straight = createCandidate(endpoint.marker, endpoint.flow);

    if (
      !shouldTurnAt(endpoint.marker, endpoint.flow)
      && candidateFits(side, straight)
    ) {
      return straight;
    }

    const clockwise = createCandidate(
      endpoint.marker,
      CLOCKWISE_FLOW[endpoint.flow]
    );

    if (candidateFits(side, clockwise)) {
      return clockwise;
    }

    const counterClockwise = createCandidate(
      endpoint.marker,
      COUNTERCLOCKWISE_FLOW[endpoint.flow]
    );

    if (candidateFits(side, counterClockwise)) {
      return counterClockwise;
    }

    if (candidateFits(side, straight)) {
      return straight;
    }

    return null;
  }

  /*
    Opening layout for a double:

    H09 = [value, "open-left", "EW"]
    I09 = [value, "double", "EW"]
    J09 = [value, "open-right", "WE"]

    Left chain starts moving west. Right chain starts moving east.
  */
  function reset(opening) {
    grid = createEmptyBoard();
    visualTiles = [];

    const center = { row: 8, col: 8 };
    const leftMarker = { row: 8, col: 7 };
    const rightMarker = { row: 8, col: 9 };

    write(center, [opening.value, "double", "EW"]);

    setOpenMarker("left", leftMarker, opening.value, "EW");
    setOpenMarker("right", rightMarker, opening.value, "WE");

    visualTiles.push({
      kind: "double",
      center,
      flow: "EW"
    });

    endpoints.left = {
      marker: leftMarker,
      flow: "EW",
      value: opening.value
    };

    endpoints.right = {
      marker: rightMarker,
      flow: "WE",
      value: opening.value
    };

    renderBoard();
  }

  /*
    A normal play always does this:

    Existing:
    [matching, "open-left/right", oldFlow]

    Becomes:
    [matching, "left/right", newFlow]
    [exposed,  "right/left", newFlow]
    [exposed,  "open-left/right", newFlow]

    The marker pip always becomes the matching half, regardless of whether
    newFlow is straight, clockwise, or counter-clockwise.
  */
  function placeNormal(placement) {
    const side = placement.side;

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

  /*
    A double consumes the current reserved marker as its center.

    Its center advances the chain by exactly one grid cell in the current
    flow, regardless of whether that flow is horizontal or vertical.

    The other half of the double is rendered perpendicular to the chain.
  */
  function placeDouble(placement) {
    const side = placement.side;
    const endpoint = endpoints[side];

    assertEndpointMarker(side, placement.matching);

    const center = endpoint.marker;
    const nextMarker = add(center, endpoint.flow, 1);

    if (!inside(nextMarker) || !isEmpty(nextMarker)) {
      throw new Error(`No space is available for a ${side} double.`);
    }

    write(center, [
      placement.matching,
      "double",
      endpoint.flow
    ]);

    setOpenMarker(
      side,
      nextMarker,
      placement.exposed,
      endpoint.flow
    );

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
      !Number.isInteger(placement.matching)
      || placement.matching < 0
      || placement.matching > 6
      || !Number.isInteger(placement.exposed)
      || placement.exposed < 0
      || placement.exposed > 6
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

  function renderGridCells() {
    const fragment = document.createDocumentFragment();

    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        const cell = document.createElement("div");
        const descriptor = grid[row][col];

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

    board.replaceChildren(fragment);
  }

  function renderNormalTile(tileData, unit) {
    const [first, second] = tileData.cells;
    const firstDescriptor = read(first);
    const secondDescriptor = read(second);

    if (!firstDescriptor || !secondDescriptor) {
      throw new Error("Cannot render a normal domino without both board descriptors.");
    }

    const horizontal = first.row === second.row;
    const startRow = Math.min(first.row, second.row);
    const startCol = Math.min(first.col, second.col);

    const tile = document.createElement("div");
    tile.className = `board-domino ${horizontal ? "horizontal" : "vertical"}`;

    tile.style.left = `${startCol * unit}px`;
    tile.style.top = `${startRow * unit}px`;
    tile.style.width = `${horizontal ? unit * 2 : unit}px`;
    tile.style.height = `${horizontal ? unit : unit * 2}px`;

    /*
      DOM order follows physical screen order. For west/upward movement,
      reverse the pip sequence to match the displayed tile orientation.
    */
    const firstBeforeSecond = horizontal
      ? first.col < second.col
      : first.row < second.row;

    const orderedPips = firstBeforeSecond
      ? [firstDescriptor[0], secondDescriptor[0]]
      : [secondDescriptor[0], firstDescriptor[0]];

    tile.append(
      createPipHalf(orderedPips[0]),
      createPipHalf(orderedPips[1])
    );

    board.appendChild(tile);
  }

  /*
    Doubles are drawn perpendicular to their directed flow:
    - horizontal chain flow → vertical double
    - vertical chain flow   → horizontal double

    This is only their visual orientation. In the grid model, the chain
    advances one cell from the double's center in every flow direction.
  */
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
      tile.style.top = `${(tileData.center.row - 0.5) * unit}px`;
      tile.style.width = `${unit}px`;
      tile.style.height = `${unit * 2}px`;
    } else {
      tile.style.left = `${(tileData.center.col - 0.5) * unit}px`;
      tile.style.top = `${tileData.center.row * unit}px`;
      tile.style.width = `${unit * 2}px`;
      tile.style.height = `${unit}px`;
    }

    tile.append(
      createPipHalf(pip),
      createPipHalf(pip)
    );

    board.appendChild(tile);
  }

  function renderBoard() {
    renderGridCells();

    const boardWidth = board.getBoundingClientRect().width;

    if (!boardWidth) {
      return;
    }

    const unit = boardWidth / BOARD_SIZE;

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

      button.append(
        createPipHalf(tile.a),
        createPipHalf(tile.b)
      );

      if (playable) {
        button.addEventListener("click", () => {
          options.onTileClick(tile);
        });
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

  /*
    Read-only debug/testing snapshot.
  */
  function boardSnapshot() {
    return structuredClone(grid);
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