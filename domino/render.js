const INITIAL_COLUMNS = 11;
const MAX_COLUMNS = 15;
const INITIAL_ROWS = 9;
const ROWS_PER_EXTENSION = 2;
const TURN_MARGIN = 2;

const SVG_NS = "http://www.w3.org/2000/svg";

const FLOW_DIRECTIONS = Object.freeze({
  WE: { dr: 0, dc: 1 },
  EW: { dr: 0, dc: -1 },
  SN: { dr: -1, dc: 0 },
  NS: { dr: 1, dc: 0 },
});

const CLOCKWISE_FLOW = Object.freeze({
  WE: "NS",
  NS: "EW",
  EW: "SN",
  SN: "WE",
});

const COUNTERCLOCKWISE_FLOW = Object.freeze({
  WE: "SN",
  SN: "EW",
  EW: "NS",
  NS: "WE",
});

const PIP_POSITIONS = Object.freeze({
  0: [],
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
});

function coordinate(row, col) {
  return `${String.fromCharCode(65 + col)}${String(row).padStart(2, "0")}`;
}

function createTurnState() {
  return {
    left: { preferred: "clockwise", count: 0 },
    right: { preferred: "clockwise", count: 0 },
  };
}

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);

  for (const [attribute, value] of Object.entries(attributes)) {
    element.setAttribute(attribute, String(value));
  }

  return element;
}

function addPips(group, value, x, y, size) {
  const inset = size * 0.2;
  const span = size - inset * 2;
  const radius = Math.max(1.5, size * 0.055);

  for (const position of PIP_POSITIONS[value] ?? []) {
    const index = position - 1;
    const col = index % 3;
    const row = Math.floor(index / 3);

    group.appendChild(
      svgElement("circle", {
        cx: x + inset + (col * span) / 2,
        cy: y + inset + (row * span) / 2,
        r: radius,
        class: "pip",
      }),
    );
  }
}

function addDomino(group, values, x, y, unit, horizontal) {
  const width = horizontal ? unit * 2 : unit;
  const height = horizontal ? unit : unit * 2;
  const dividerInset = unit * 0.15;

  // A single body keeps the center seam square and continuous.
  group.appendChild(
    svgElement("rect", {
      x,
      y,
      width,
      height,
      rx: unit * 0.1,
      class: "domino-body",
    }),
  );

  group.appendChild(
    svgElement("line", {
      x1: horizontal ? x + unit : x + dividerInset,
      y1: horizontal ? y + dividerInset : y + unit,
      x2: horizontal ? x + unit : x + unit - dividerInset,
      y2: horizontal ? y + unit - dividerInset : y + unit,
      class: "domino-divider",
    }),
  );

  addPips(group, values[0], x, y, unit);

  addPips(
    group,
    values[1],
    horizontal ? x + unit : x,
    horizontal ? y : y + unit,
    unit,
  );
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
    status,
  } = elements;

  let cells = new Map();
  let topRow = 0;
  let bottomRow = INITIAL_ROWS - 1;
  let leftCol = 0;
  let rightCol = INITIAL_COLUMNS - 1;

  let visualTiles = [];
  let endpoints = { left: null, right: null };
  let turnState = createTurnState();
  let sideSelector = null;

  const resizeObserver =
    typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => renderBoard())
      : null;

  function key(point) {
    return `${point.row}:${point.col}`;
  }

  function inside(point) {
    return (
      point.row >= topRow &&
      point.row <= bottomRow &&
      point.col >= leftCol &&
      point.col <= rightCol
    );
  }

  function read(point) {
    return inside(point) ? (cells.get(key(point)) ?? null) : null;
  }

  function write(point, descriptor) {
    if (!inside(point)) {
      throw new Error(
        `Cannot write outside board at ${coordinate(point.row, point.col)}.`,
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
      col: point.col + direction.dc * amount,
    };
  }

  function extendToward(point) {
    const columns = rightCol - leftCol + 1;

    if (columns < MAX_COLUMNS) {
      const extension = Math.min(2, MAX_COLUMNS - columns);

      if (point.col < leftCol) {
        leftCol -= extension;
      } else if (point.col > rightCol) {
        rightCol += extension;
      }
    }

    if (point.row < topRow) {
      topRow -= ROWS_PER_EXTENSION;
    } else if (point.row > bottomRow) {
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
        `Missing ${side} open marker at ${
          coordinate(endpoint.marker.row, endpoint.marker.col)
        }.`,
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
        `Invalid ${side} endpoint marker at ${
          coordinate(endpoint.marker.row, endpoint.marker.col)
        }.`,
      );
    }
  }

  function distanceToEdge(point, flow) {
    const direction = FLOW_DIRECTIONS[flow];

    if (direction.dc === 1) return rightCol - point.col;
    if (direction.dc === -1) return point.col - leftCol;
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
      nextMarker: add(marker, flow, 2),
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

    return Boolean(
      firstIsCurrentMarker &&
      isEmpty(candidate.second) &&
      isEmpty(candidate.nextMarker),
    );
  }

  function straightPathIsClear(candidate) {
    const beyond = add(candidate.nextMarker, candidate.flow);

    return (
      isEmpty(candidate.second) &&
      isEmpty(candidate.nextMarker) &&
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
        state.preferred === "clockwise"
          ? "counterclockwise"
          : "clockwise";
    }
  }

  function chooseNormalPath(side) {
    const endpoint = endpoints[side];
    const straight = createCandidate(endpoint.marker, endpoint.flow);
    const horizontal =
      endpoint.flow === "WE" || endpoint.flow === "EW";

    if (horizontal && shouldTurnAt(endpoint.marker, endpoint.flow)) {
      const beyond = add(straight.nextMarker, straight.flow);

      if (!inside(beyond)) {
        extendToward(beyond);
      }
    }

    if (
      !shouldTurnAt(endpoint.marker, endpoint.flow) &&
      straightPathIsClear(straight)
    ) {
      return straight;
    }

    const turnFlows = {
      clockwise: CLOCKWISE_FLOW[endpoint.flow],
      counterclockwise: COUNTERCLOCKWISE_FLOW[endpoint.flow],
    };

    for (const turn of turnOrder(side)) {
      const candidate = createCandidate(
        endpoint.marker,
        turnFlows[turn],
      );

      if (!inside(candidate.nextMarker)) {
        extendToward(candidate.nextMarker);
      }

      if (candidateFits(side, candidate)) {
        recordTurn(side);
        return candidate;
      }
    }

    if (!inside(straight.nextMarker)) {
      extendToward(straight.nextMarker);
    }

    return candidateFits(side, straight) ? straight : null;
  }

  function placeNormal(placement) {
    const { side, matching, exposed } = placement;

    assertEndpointMarker(side, matching);

    const path = chooseNormalPath(side);

    if (!path) {
      throw new Error(
        `No contiguous route is available for the ${side} chain.`,
      );
    }

    write(path.first, [matching, matchingRoleFor(side), path.flow]);
    write(path.second, [exposed, exposedRoleFor(side), path.flow]);
    setOpenMarker(side, path.nextMarker, exposed, path.flow);

    visualTiles.push({
      kind: "normal",
      cells: [path.first, path.second],
    });

    endpoints[side] = {
      marker: path.nextMarker,
      flow: path.flow,
      value: exposed,
    };
  }

  function placeDouble(placement) {
    const { side, matching, exposed } = placement;

    assertEndpointMarker(side, matching);

    const endpoint = endpoints[side];
    const center = endpoint.marker;
    const nextMarker = add(center, endpoint.flow);

    if (!inside(nextMarker)) {
      extendToward(nextMarker);
    }

    if (!isEmpty(nextMarker)) {
      throw new Error(`No space is available for a ${side} double.`);
    }

    write(center, [matching, "double", endpoint.flow]);
    setOpenMarker(side, nextMarker, exposed, endpoint.flow);

    visualTiles.push({
      kind: "double",
      center,
      flow: endpoint.flow,
    });

    endpoints[side] = {
      marker: nextMarker,
      flow: endpoint.flow,
      value: exposed,
    };
  }

  function place(placement) {
    if (placement.side !== "left" && placement.side !== "right") {
      throw new Error(`Invalid placement side "${placement.side}".`);
    }

    for (const pip of [placement.matching, placement.exposed]) {
      if (!Number.isInteger(pip) || pip < 0 || pip > 6) {
        throw new Error(
          "Placement pips must be integers from 0 through 6.",
        );
      }
    }

    if (placement.double) {
      placeDouble(placement);
    } else {
      placeNormal(placement);
    }

    renderBoard();
  }

  function renderGrid(svg, unit) {
    for (let row = topRow; row <= bottomRow; row += 1) {
      for (let col = leftCol; col <= rightCol; col += 1) {
        const descriptor = read({ row, col });
        const label = coordinate(row, col);

        const cell = svgElement("rect", {
          x: (col - leftCol) * unit,
          y: (row - topRow) * unit,
          width: unit,
          height: unit,
          class: "board-cell",
          "data-coordinate": label,
          role: "gridcell",
          "aria-label": label,
        });

        if (descriptor) {
          const [pip, role, flow] = descriptor;

          cell.setAttribute("data-pip", String(pip));
          cell.setAttribute("data-role", role);
          cell.setAttribute("data-flow", flow);

          if (role === "open-left" || role === "open-right") {
            cell.classList.add(role);
          }
        }

        svg.appendChild(cell);
      }
    }
  }

  function renderNormalTile(svg, tileData, unit) {
    const [first, second] = tileData.cells;
    const firstDescriptor = read(first);
    const secondDescriptor = read(second);

    if (!firstDescriptor || !secondDescriptor) {
      throw new Error(
        "Cannot render a normal domino without both descriptors.",
      );
    }

    const horizontal = first.row === second.row;

    const x =
      (Math.min(first.col, second.col) - leftCol) * unit;
    const y =
      (Math.min(first.row, second.row) - topRow) * unit;

    const firstBeforeSecond = horizontal
      ? first.col < second.col
      : first.row < second.row;

    const values = firstBeforeSecond
      ? [firstDescriptor[0], secondDescriptor[0]]
      : [secondDescriptor[0], firstDescriptor[0]];

    const group = svgElement("g", {
      class: `board-domino ${
        horizontal ? "horizontal" : "vertical"
      }`,
    });

    addDomino(group, values, x, y, unit, horizontal);
    svg.appendChild(group);
  }

  function renderDoubleTile(svg, tileData, unit) {
    const descriptor = read(tileData.center);

    if (!descriptor) {
      throw new Error(
        "Cannot render a double without its board descriptor.",
      );
    }

    const vertical =
      tileData.flow === "WE" || tileData.flow === "EW";

    const centerX = (tileData.center.col - leftCol) * unit;
    const centerY = (tileData.center.row - topRow) * unit;

    const x = vertical ? centerX : centerX - unit / 2;
    const y = vertical ? centerY - unit / 2 : centerY;

    const group = svgElement("g", {
      class: "board-domino board-double",
    });

    addDomino(
      group,
      [descriptor[0], descriptor[0]],
      x,
      y,
      unit,
      !vertical,
    );

    svg.appendChild(group);
  }

  function renderSideSelector(svg, unit) {
    if (!sideSelector) return;

    const selector = sideSelector;

    const group = svgElement("g", {
      class: "side-selector",
      role: "group",
      "aria-label": selector.label,
    });

    const prompt = svgElement("text", {
      x: ((rightCol - leftCol + 1) * unit) / 2,
      y: 20,
      "text-anchor": "middle",
      class: "side-selector-prompt",
    });

    prompt.textContent = selector.label;
    group.appendChild(prompt);

    for (const side of ["left", "right"]) {
      const marker = endpoints[side].marker;

      const button = svgElement("g", {
        class: `side-selector-button side-selector-${side}`,
        role: "button",
        tabindex: "0",
        "aria-label": selector.sideLabels[side],
      });

      button.appendChild(
        svgElement("circle", {
          cx: (marker.col - leftCol + 0.5) * unit,
          cy: (marker.row - topRow + 0.5) * unit,
          r: unit * 0.42,
          class: "side-selector-hit-area",
        }),
      );

      const select = () => {
        // Ignore a stale selector if a newer one has replaced it.
        if (sideSelector !== selector) return;

        const callback = selector.onSelect;

        sideSelector = null;
        renderBoard();
        callback(side);
      };

      button.addEventListener("click", select);

      button.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          select();
        }
      });

      group.appendChild(button);
    }

    svg.appendChild(group);
  }

  function renderBoard() {
    const width = board.getBoundingClientRect().width;

    if (!width) return;

    const columns = rightCol - leftCol + 1;
    const rows = bottomRow - topRow + 1;
    const unit = width / columns;
    const height = unit * rows;

    const svg = svgElement("svg", {
      class: "domino-board-svg",
      xmlns: SVG_NS,
      viewBox: `0 0 ${width} ${height}`,
      width: "100%",
      height,
      role: "grid",
      "aria-label": "Domino board",
    });

    renderGrid(svg, unit);

    for (const tileData of visualTiles) {
      if (tileData.kind === "double") {
        renderDoubleTile(svg, tileData, unit);
      } else {
        renderNormalTile(svg, tileData, unit);
      }
    }

    renderSideSelector(svg, unit);

    board.replaceChildren(svg);
    board.style.height = `${height}px`;
  }

  function showSideSelector({ label, sideLabels, onSelect }) {
    sideSelector = { label, sideLabels, onSelect };
    renderBoard();
  }

  function hideSideSelector() {
    sideSelector = null;
    renderBoard();
  }

  function reset(opening) {
    sideSelector = null;
    cells = new Map();

    // Center the initial 11 × 9 board around the opening double.
    leftCol = 5;
    rightCol = leftCol + INITIAL_COLUMNS - 1;
    topRow = 45;
    bottomRow = topRow + INITIAL_ROWS - 1;

    visualTiles = [];
    turnState = createTurnState();

    const center = {
      row: topRow + (INITIAL_ROWS - 1)/2,
      col: leftCol + (INITIAL_COLUMNS - 1)/2,
    };

    const leftMarker = {
      row: center.row,
      col: center.col - 1,
    };

    const rightMarker = {
      row: center.row,
      col: center.col + 1,
    };

    write(center, [opening.value, "double", "EW"]);
    setOpenMarker("left", leftMarker, opening.value, "EW");
    setOpenMarker("right", rightMarker, opening.value, "WE");

    visualTiles.push({
      kind: "double",
      center,
      flow: "EW",
    });

    endpoints = {
      left: {
        marker: leftMarker,
        flow: "EW",
        value: opening.value,
      },
      right: {
        marker: rightMarker,
        flow: "WE",
        value: opening.value,
      },
    };

    renderBoard();
  }

  function renderHand(tiles, options) {
    const fragment = document.createDocumentFragment();

    for (const tile of tiles) {
      const playable =
        options.enabled && options.isPlayable(tile);

      const button = document.createElement("button");

      button.type = "button";
      button.className =
        `hand-domino${playable ? " playable" : ""}`;
      button.disabled = !playable;
      button.title = `${tile.a}-${tile.b}`;
      button.setAttribute("aria-label", `${tile.a}-${tile.b}`);

      for (const value of [tile.a, tile.b]) {
        const half = document.createElement("span");
        half.className = "domino-half";

        const pips = document.createElement("span");
        pips.className = "pips";

        for (const position of PIP_POSITIONS[value] ?? []) {
          const pip = document.createElement("span");
          pip.className = `pip pip-${position}`;
          pips.appendChild(pip);
        }

        half.appendChild(pips);
        button.appendChild(half);
      }

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
    score.textContent =
      `${values.playerWins} – ${values.computerWins}`;
    status.textContent = values.message || "";
  }

  function boardSnapshot() {
    const rows = bottomRow - topRow + 1;
    const columns = rightCol - leftCol + 1;

    return Array.from({ length: rows }, (_, rowOffset) => {
      const row = topRow + rowOffset;

      return Array.from({ length: columns }, (_, colOffset) => {
        const col = leftCol + colOffset;

        return cells.get(key({ row, col })) ?? null;
      });
    });
  }

  function destroy() {
    resizeObserver?.disconnect();
    sideSelector = null;
    board.replaceChildren();
    board.style.removeProperty("height");
  }

  resizeObserver?.observe(board);

  return {
    reset,
    place,
    renderBoard,
    renderHand,
    renderComputerHand,
    renderStats,
    boardSnapshot,
    showSideSelector,
    hideSideSelector,
    destroy,
  };
}