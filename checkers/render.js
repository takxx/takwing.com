// render.js
// SVG and interface rendering. This module reads snapshots; it does not
// mutate game state.

import { t, getLanguage } from "./lang.js";
import {
  coordinateKey,
  coordinateToScreen,
  getCell,
  HEX_CORNERS,
  HOLE_RADIUS,
  PIECE_RADIUS,
  TRIANGLE_ARMS,
} from "./game.js";

function createSvgElement(tagName) {
  return document.createElementNS("http://www.w3.org/2000/svg", tagName);
}

function createPolygon(coordinates, className) {
  const polygon = createSvgElement("polygon");

  polygon.setAttribute(
    "points",
    coordinates
      .map(([x, y]) => {
        const point = coordinateToScreen(x, y);
        return `${point.screenX},${point.screenY}`;
      })
      .join(" "),
  );

  polygon.setAttribute("class", className);
  return polygon;
}

function getRegionName(cell) {
  return cell.region === "center"
    ? t("centralHexagon")
    : t(cell.armNameKey);
}

export function createRenderer(elements, handlers) {
  const {
    boardSvg,
    turnStatus,
    readout,
    resetMoveButton,
    restartButton,
    opponentCountSelect,
    totalHolesElement,
    centralHolesElement,
    armHolesElement,
    winCountElement,
    lossCountElement,
  } = elements;

  let lastSnapshot = null;
  let staticLayersBuilt = false;

  let guidesLayer = null;
  let holesLayer = null;
  let piecesLayer = null;

  const holeNodes = new Map();
  const pieceNodes = new Map();
  let previousLegalKeys = new Set();

  function ensureStaticLayers(snapshot) {
    if (staticLayersBuilt) {
      return;
    }

    guidesLayer = createSvgElement("g");
    guidesLayer.classList.add("guides-layer");

    holesLayer = createSvgElement("g");
    holesLayer.classList.add("holes-layer");

    piecesLayer = createSvgElement("g");
    piecesLayer.classList.add("pieces-layer");

    boardSvg.replaceChildren(guidesLayer, holesLayer, piecesLayer);

    guidesLayer.appendChild(
      createPolygon(HEX_CORNERS, "central-hexagon-guide"),
    );

    for (const arm of TRIANGLE_ARMS) {
      guidesLayer.appendChild(
        createPolygon(
          [arm.tip, arm.baseA, arm.baseB],
          "outer-arm-guide",
        ),
      );
    }

    const cells = [...snapshot.board.cells.values()].sort((first, second) => {
      const depthDifference = (second.x + second.y) - (first.x + first.y);

      return depthDifference || first.x - second.x;
    });

    for (const cell of cells) {
      const point = coordinateToScreen(cell.x, cell.y);
      const key = coordinateKey(cell.x, cell.y);

      const hole = createSvgElement("circle");
      hole.setAttribute("class", "hole");
      hole.setAttribute("cx", point.screenX);
      hole.setAttribute("cy", point.screenY);
      hole.setAttribute("r", HOLE_RADIUS);
      hole.dataset.cellKey = key;
      hole.setAttribute("role", "gridcell");
      hole.setAttribute(
        "aria-label",
        t("coordinateReadout", {
          x: cell.x,
          y: cell.y,
          region: getRegionName(cell),
        }),
      );

      holesLayer.appendChild(hole);
      holeNodes.set(key, hole);
    }

    staticLayersBuilt = true;
  }

  function updateStaticText() {
    const language = getLanguage();

    document.documentElement.lang = language === "zh" ? "zh-Hant" : language;
    document.title = t("documentTitle");

    document.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = t(element.dataset.i18n);
    });

    document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      element.setAttribute(
        "aria-label",
        t(element.dataset.i18nAriaLabel),
      );
    });

    boardSvg.setAttribute("aria-label", t("boardAriaLabel"));
    resetMoveButton.textContent = t("resetMoveButton");
    resetMoveButton.title = t("resetMoveHint");
    restartButton.textContent = t("restartButton");

    document.querySelectorAll(".language-button").forEach((button) => {
      const isSelected = button.dataset.language === language;

      button.setAttribute("aria-pressed", String(isSelected));
      button.disabled = isSelected;
    });
  }

  function updateBoardSummary(snapshot) {
    const { board } = snapshot;

    totalHolesElement.textContent = board.cells.size;

    let centerCount = 0;
    let armZeroCount = 0;

    for (const cell of board.cells.values()) {
      if (cell.region === "center") {
        centerCount += 1;
      }

      if (cell.region === "arm-0") {
        armZeroCount += 1;
      }
    }

    centralHolesElement.textContent = centerCount;
    armHolesElement.textContent = armZeroCount;
  }

  function updateLegalDestinations(snapshot) {
    const currentLegalKeys = new Set(
      snapshot.legalMovesForSelected.map((move) => {
        return coordinateKey(move.to[0], move.to[1]);
      }),
    );

    for (const key of previousLegalKeys) {
      if (currentLegalKeys.has(key)) {
        continue;
      }

      const hole = holeNodes.get(key);

      if (hole) {
        hole.classList.remove("is-legal");
        hole.setAttribute("role", "gridcell");
        hole.removeAttribute("tabindex");
      }
    }

    for (const key of currentLegalKeys) {
      const hole = holeNodes.get(key);

      if (!hole) {
        continue;
      }

      hole.classList.add("is-legal");

      if (!snapshot.state.computerThinking) {
        hole.setAttribute("role", "button");
        hole.setAttribute("tabindex", "0");
      }
    }

    previousLegalKeys = currentLegalKeys;
  }

  function createPieceNode(piece) {
    const group = createSvgElement("g");
    group.classList.add("piece", piece.playerId);
    group.dataset.pieceId = piece.id;
    group.setAttribute("role", "button");
    group.setAttribute("tabindex", "0");

    const body = createSvgElement("circle");
    body.classList.add("piece-body");
    body.setAttribute("r", PIECE_RADIUS);

    const highlight = createSvgElement("circle");
    highlight.classList.add("piece-highlight");
    highlight.setAttribute("cx", "-2.5");
    highlight.setAttribute("cy", "-2.6");
    highlight.setAttribute("r", "2.5");

    group.append(body, highlight);

    return group;
  }

  function updatePieceNode(node, piece, snapshot) {
    const player = snapshot.activePlayers.find(
      (candidate) => candidate.id === piece.playerId,
    );

    const point = coordinateToScreen(piece.x, piece.y);

    node.setAttribute(
      "transform",
      `translate(${point.screenX} ${point.screenY})`,
    );

    node.setAttribute(
      "aria-label",
      `${t(player.nameKey)}: (${piece.x}, ${piece.y})`,
    );

    node.classList.toggle(
      "is-active",
      piece.playerId === snapshot.activePlayer.id
        && !snapshot.state.gameOver
        && !snapshot.state.computerThinking,
    );

    node.classList.toggle(
      "is-selected",
      piece.id === snapshot.state.selectedPieceId,
    );

    const awaitingConfirmation = (
      piece.id === snapshot.state.selectedPieceId
      && snapshot.state.jumpChainActive
      && snapshot.state.jumpAwaitingConfirmation
    );

    node.classList.toggle(
      "is-awaiting-confirmation",
      awaitingConfirmation,
    );

    const body = node.querySelector(".piece-body");

    if (awaitingConfirmation) {
      body.setAttribute("fill", "#ffffff");
    } else {
      body.removeAttribute("fill");
    }
  }

  function updatePieces(snapshot) {
    const livePieceIds = new Set();

    for (const piece of snapshot.state.pieces.values()) {
      livePieceIds.add(piece.id);

      let node = pieceNodes.get(piece.id);

      if (!node) {
        node = createPieceNode(piece);
        pieceNodes.set(piece.id, node);
        piecesLayer.appendChild(node);
      }

      updatePieceNode(node, piece, snapshot);
    }

    for (const [pieceId, node] of pieceNodes) {
      if (!livePieceIds.has(pieceId)) {
        node.remove();
        pieceNodes.delete(pieceId);
      }
    }
  }

  function updateStatus(snapshot) {
    opponentCountSelect.value = String(snapshot.state.opponentCount);
    opponentCountSelect.disabled = (
      snapshot.state.computerThinking
      || snapshot.state.jumpChainActive
    );

    resetMoveButton.disabled = !(
      snapshot.state.jumpChainActive
      && !snapshot.state.computerThinking
      && snapshot.activePlayer.type === "human"
      && snapshot.state.jumpChainStart
    );

    if (snapshot.state.gameOver) {
      const message = t("playerWon", {
        player: t(snapshot.activePlayer.nameKey),
      });

      turnStatus.textContent = message;
      readout.textContent = message;
      resetMoveButton.disabled = true;
      return;
    }

    if (
      snapshot.state.computerThinking
      && snapshot.activePlayer.type === "computer"
    ) {
      turnStatus.textContent = t("computerThinking", {
        player: t(snapshot.activePlayer.nameKey),
      });

      readout.textContent = t("computerTurn", {
        player: t(snapshot.activePlayer.nameKey),
      });

      resetMoveButton.disabled = true;
      return;
    }

    turnStatus.textContent = t("playerTurn", {
      player: t(snapshot.activePlayer.nameKey),
    });

    if (snapshot.state.jumpChainActive && snapshot.state.selectedPieceId) {
      readout.textContent = t("jumpContinue");
      return;
    }

    if (snapshot.state.selectedPieceId) {
      const selectedPiece = [...snapshot.state.pieces.values()]
        .find((piece) => piece.id === snapshot.state.selectedPieceId);

      if (selectedPiece) {
        readout.textContent = t("selectedPiece", {
          x: selectedPiece.x,
          y: selectedPiece.y,
        });

        return;
      }
    }

    readout.textContent = snapshot.hasAnyLegalMove
      ? t("selectOwnMarble")
      : t("selectOwnMarbleWithMoves");
  }

  function updateWinLossCount(snapshot) {
    winCountElement.textContent = snapshot.persistentResults.wins;
    lossCountElement.textContent = snapshot.persistentResults.losses;
  }

  function render(snapshot) {
    lastSnapshot = snapshot;

    ensureStaticLayers(snapshot);
    updateStaticText();
    updateBoardSummary(snapshot);
    updateLegalDestinations(snapshot);
    updatePieces(snapshot);
    updateStatus(snapshot);
    updateWinLossCount(snapshot);
  }

  function showCoordinateReadout(x, y) {
    if (!lastSnapshot) {
      return;
    }

    const cell = getCell(lastSnapshot.board, x, y);

    if (!cell) {
      return;
    }

    readout.textContent = t("coordinateReadout", {
      x,
      y,
      region: getRegionName(cell),
    });
  }

  boardSvg.addEventListener("click", (event) => {
    const pieceNode = event.target.closest("[data-piece-id]");

    if (pieceNode) {
      handlers.onPieceSelected(pieceNode.dataset.pieceId);
      return;
    }

    const holeNode = event.target.closest("[data-cell-key]");

    if (!holeNode) {
      return;
    }

    const [x, y] = holeNode.dataset.cellKey.split(",").map(Number);

    if (holeNode.classList.contains("is-legal")) {
      handlers.onDestinationSelected(x, y);
    } else {
      handlers.onReadoutRequested(x, y);
    }
  });

  boardSvg.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    const pieceNode = event.target.closest("[data-piece-id]");

    if (pieceNode) {
      event.preventDefault();
      handlers.onPieceSelected(pieceNode.dataset.pieceId);
      return;
    }

    const holeNode = event.target.closest("[data-cell-key]");

    if (!holeNode) {
      return;
    }

    event.preventDefault();

    const [x, y] = holeNode.dataset.cellKey.split(",").map(Number);

    if (holeNode.classList.contains("is-legal")) {
      handlers.onDestinationSelected(x, y);
    } else {
      handlers.onReadoutRequested(x, y);
    }
  });

  return {
    render,
    showCoordinateReadout,
  };
}