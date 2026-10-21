// game.js
// Game state, board geometry, legal-move rules, turn flow, and persistence.

import { t } from "./lang.js";

export const HUMAN_PLAYER_ID = "player-1";

export const GAME_CONFIGURATIONS = {
  1: [
    {
      id: HUMAN_PLAYER_ID,
      type: "human",
      nameKey: "humanPlayer",
      homeRegion: "arm-0",
      targetRegion: "arm-3",
    },
    {
      id: "computer-1",
      type: "computer",
      nameKey: "computerOne",
      homeRegion: "arm-3",
      targetRegion: "arm-0",
    },
  ],

  2: [
    {
      id: HUMAN_PLAYER_ID,
      type: "human",
      nameKey: "humanPlayer",
      homeRegion: "arm-0",
      targetRegion: "arm-3",
    },
    {
      id: "computer-1",
      type: "computer",
      nameKey: "computerOne",
      homeRegion: "arm-2",
      targetRegion: "arm-5",
    },
    {
      id: "computer-2",
      type: "computer",
      nameKey: "computerTwo",
      homeRegion: "arm-4",
      targetRegion: "arm-1",
    },
  ],
};

export const HEX_CORNERS = [
  [4, 0],
  [8, 0],
  [8, 4],
  [4, 8],
  [0, 8],
  [0, 4],
];

export const TRIANGLE_ARMS = [
  {
    region: "arm-0",
    nameKey: "homeRegion",
    tip: [0, 0],
    baseA: [4, 0],
    baseB: [0, 4],
  },
  {
    region: "arm-1",
    nameKey: "bottomLeftRegion",
    tip: [8, -4],
    baseA: [8, 0],
    baseB: [4, 0],
  },
  {
    region: "arm-2",
    nameKey: "topLeftRegion",
    tip: [12, 0],
    baseA: [8, 4],
    baseB: [8, 0],
  },
  {
    region: "arm-3",
    nameKey: "topRegion",
    tip: [8, 8],
    baseA: [4, 8],
    baseB: [8, 4],
  },
  {
    region: "arm-4",
    nameKey: "topRightRegion",
    tip: [0, 12],
    baseA: [0, 8],
    baseB: [4, 8],
  },
  {
    region: "arm-5",
    nameKey: "bottomRightRegion",
    tip: [-4, 8],
    baseA: [0, 4],
    baseB: [0, 8],
  },
];

export const HORIZONTAL_STEP = 18;
export const VERTICAL_STEP = 31.176;
export const BOARD_BOTTOM_Y = 245;
export const HOLE_RADIUS = 10.5;
export const PIECE_RADIUS = 8.4;

const MAX_JUMP_DISTANCE = 12;

const ADJACENT_DIRECTIONS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, -1],
  [-1, 1],
];

const PERSISTENT_RESULTS_STORAGE_KEY = "boziqiPersistentResults";

export function coordinateKey(x, y) {
  return `${x},${y}`;
}

export function coordinateToScreen(x, y) {
  return {
    screenX: (y - x) * HORIZONTAL_STEP,
    screenY: BOARD_BOTTOM_Y - (x + y) * VERTICAL_STEP,
  };
}

export function axialDistance(aX, aY, bX, bY) {
  const dx = aX - bX;
  const dy = aY - bY;

  return (Math.abs(dx) + Math.abs(dy) + Math.abs(dx + dy)) / 2;
}

export function buildBoard() {
  const cells = new Map();

  function addCell(x, y, region, armNameKey = null) {
    const key = coordinateKey(x, y);

    if (cells.has(key)) {
      throw new Error(`Duplicate board coordinate: ${key}.`);
    }

    cells.set(key, { x, y, region, armNameKey });
  }

  function addCentralHexagon() {
    for (let x = 0; x <= 8; x += 1) {
      for (let y = 0; y <= 8; y += 1) {
        if (x + y >= 4 && x + y <= 12) {
          addCell(x, y, "center");
        }
      }
    }
  }

  function addTriangleArm(arm) {
    const [tipX, tipY] = arm.tip;
    const [baseAX, baseAY] = arm.baseA;
    const [baseBX, baseBY] = arm.baseB;

    const edgeAX = (baseAX - tipX) / 4;
    const edgeAY = (baseAY - tipY) / 4;
    const edgeBX = (baseBX - tipX) / 4;
    const edgeBY = (baseBY - tipY) / 4;

    for (let depth = 0; depth < 4; depth += 1) {
      for (let offset = 0; offset <= depth; offset += 1) {
        const alongA = depth - offset;
        const alongB = offset;

        addCell(
          tipX + alongA * edgeAX + alongB * edgeBX,
          tipY + alongA * edgeAY + alongB * edgeBY,
          arm.region,
          arm.nameKey,
        );
      }
    }
  }

  addCentralHexagon();
  TRIANGLE_ARMS.forEach(addTriangleArm);

  return { cells };
}

export function validateBoard(board) {
  if (board.cells.size !== 121) {
    throw new Error(`Expected 121 board holes, found ${board.cells.size}.`);
  }

  let centerCount = 0;
  const armCounts = new Map();

  for (const cell of board.cells.values()) {
    if (cell.region === "center") {
      centerCount += 1;
    } else {
      armCounts.set(cell.region, (armCounts.get(cell.region) ?? 0) + 1);
    }
  }

  if (centerCount !== 61) {
    throw new Error(`Expected 61 central holes, found ${centerCount}.`);
  }

  for (const arm of TRIANGLE_ARMS) {
    if (armCounts.get(arm.region) !== 10) {
      throw new Error(`${arm.region} must contain 10 holes.`);
    }
  }
}

export function getCell(board, x, y) {
  return board.cells.get(coordinateKey(x, y)) ?? null;
}

export function isBoardCoordinate(board, x, y) {
  return board.cells.has(coordinateKey(x, y));
}

export function getPieceAt(position, x, y) {
  return position.pieces.get(coordinateKey(x, y)) ?? null;
}

export function isEmptyHole(position, board, x, y) {
  return isBoardCoordinate(board, x, y) && !getPieceAt(position, x, y);
}

export function canPlayerEndMoveAt(board, player, x, y) {
  const cell = getCell(board, x, y);

  if (!cell) {
    return false;
  }

  return (
    cell.region === "center"
    || cell.region === player.homeRegion
    || cell.region === player.targetRegion
  );
}

export function getNormalMoves(position, board, piece, player) {
  const moves = [];

  for (const [dx, dy] of ADJACENT_DIRECTIONS) {
    const destinationX = piece.x + dx;
    const destinationY = piece.y + dy;

    if (
      isEmptyHole(position, board, destinationX, destinationY)
      && canPlayerEndMoveAt(board, player, destinationX, destinationY)
    ) {
      moves.push({
        type: "step",
        from: [piece.x, piece.y],
        to: [destinationX, destinationY],
        pieceId: piece.id,
      });
    }
  }

  return moves;
}

export function getExtendedJumpsAtPosition(
  position,
  board,
  piece,
  player,
  currentX,
  currentY,
  visitedLandings,
  occupiedKeys,
) {
  const jumps = [];

  for (const [dx, dy] of ADJACENT_DIRECTIONS) {
    for (let distance = 1; distance <= MAX_JUMP_DISTANCE; distance += 1) {
      const jumpedX = currentX + distance * dx;
      const jumpedY = currentY + distance * dy;
      const landingX = currentX + 2 * distance * dx;
      const landingY = currentY + 2 * distance * dy;

      const jumpedKey = coordinateKey(jumpedX, jumpedY);
      const landingKey = coordinateKey(landingX, landingY);

      if (!isBoardCoordinate(board, landingX, landingY)) {
        break;
      }

      if (!occupiedKeys.has(jumpedKey) || occupiedKeys.has(landingKey)) {
        continue;
      }

      if (visitedLandings.has(landingKey)) {
        continue;
      }

      let pathIsClear = true;

      for (let step = 1; step < 2 * distance; step += 1) {
        if (step === distance) {
          continue;
        }

        const pathX = currentX + step * dx;
        const pathY = currentY + step * dy;
        const pathKey = coordinateKey(pathX, pathY);

        if (
          !isBoardCoordinate(board, pathX, pathY)
          || occupiedKeys.has(pathKey)
        ) {
          pathIsClear = false;
          break;
        }
      }

      if (!pathIsClear) {
        continue;
      }

      jumps.push({
        type: "extended-jump",
        from: [currentX, currentY],
        jumped: [jumpedX, jumpedY],
        to: [landingX, landingY],
        distance,
        direction: [dx, dy],
        pieceId: piece.id,
      });
    }
  }

  return jumps;
}

function jumpCanEventuallyFinish(
  position,
  board,
  piece,
  player,
  currentX,
  currentY,
  visitedLandings,
  occupiedKeys,
) {
  if (canPlayerEndMoveAt(board, player, currentX, currentY)) {
    return true;
  }

  const jumps = getExtendedJumpsAtPosition(
    position,
    board,
    piece,
    player,
    currentX,
    currentY,
    visitedLandings,
    occupiedKeys,
  );

  for (const jump of jumps) {
    const [landingX, landingY] = jump.to;
    const landingKey = coordinateKey(landingX, landingY);

    const nextVisitedLandings = new Set(visitedLandings);
    nextVisitedLandings.add(landingKey);

    const nextOccupiedKeys = new Set(occupiedKeys);
    nextOccupiedKeys.delete(coordinateKey(currentX, currentY));
    nextOccupiedKeys.add(landingKey);

    if (
      jumpCanEventuallyFinish(
        position,
        board,
        piece,
        player,
        landingX,
        landingY,
        nextVisitedLandings,
        nextOccupiedKeys,
      )
    ) {
      return true;
    }
  }

  return false;
}

function getPlayableJumpsAtPosition(
  position,
  board,
  piece,
  player,
  currentX,
  currentY,
  visitedLandings,
  occupiedKeys,
) {
  return getExtendedJumpsAtPosition(
    position,
    board,
    piece,
    player,
    currentX,
    currentY,
    visitedLandings,
    occupiedKeys,
  ).filter((jump) => {
    const [landingX, landingY] = jump.to;
    const landingKey = coordinateKey(landingX, landingY);

    const nextVisitedLandings = new Set(visitedLandings);
    nextVisitedLandings.add(landingKey);

    const nextOccupiedKeys = new Set(occupiedKeys);
    nextOccupiedKeys.delete(coordinateKey(currentX, currentY));
    nextOccupiedKeys.add(landingKey);

    return jumpCanEventuallyFinish(
      position,
      board,
      piece,
      player,
      landingX,
      landingY,
      nextVisitedLandings,
      nextOccupiedKeys,
    );
  });
}

function getExtendedJumps(
  position,
  board,
  piece,
  player,
  {
    visitedLandings = new Set([coordinateKey(piece.x, piece.y)]),
    occupiedKeys = new Set(position.pieces.keys()),
  } = {},
) {
  return getPlayableJumpsAtPosition(
    position,
    board,
    piece,
    player,
    piece.x,
    piece.y,
    visitedLandings,
    occupiedKeys,
  );
}

export function getLegalMovesForPiece(
  position,
  board,
  piece,
  player,
  {
    jumpChainActive = false,
    selectedPieceId = null,
    jumpChainVisited = new Set(),
  } = {},
) {
  if (!piece || piece.playerId !== player.id) {
    return [];
  }

  if (jumpChainActive) {
    if (piece.id !== selectedPieceId) {
      return [];
    }

    return getExtendedJumps(position, board, piece, player, {
      visitedLandings: jumpChainVisited,
    });
  }

  const visited = new Set([coordinateKey(piece.x, piece.y)]);
  const occupiedKeys = new Set(position.pieces.keys());

  return [
    ...getNormalMoves(position, board, piece, player),
    ...getExtendedJumps(position, board, piece, player, {
      visitedLandings: visited,
      occupiedKeys,
    }),
  ];
}

export function getAllLegalMovesForPlayer(position, board, player) {
  const moves = [];

  for (const piece of position.pieces.values()) {
    if (piece.playerId !== player.id) {
      continue;
    }

    moves.push(
      ...getLegalMovesForPiece(position, board, piece, player),
    );
  }

  return moves;
}

export function playerHasWon(position, board, player) {
  const playerPieces = [...position.pieces.values()]
    .filter((piece) => piece.playerId === player.id);

  return playerPieces.length === 10 && playerPieces.every((piece) => {
    return getCell(board, piece.x, piece.y)?.region === player.targetRegion;
  });
}

export function clonePosition(position) {
  const pieces = new Map();

  for (const [key, piece] of position.pieces) {
    pieces.set(key, { ...piece });
  }

  return { pieces };
}

function normaliseNonNegativeInteger(value) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function readPersistentResults() {
  try {
    const storedResults = window.localStorage.getItem(
      PERSISTENT_RESULTS_STORAGE_KEY,
    );

    if (!storedResults) {
      return { wins: 0, losses: 0 };
    }

    const parsedResults = JSON.parse(storedResults);

    return {
      wins: normaliseNonNegativeInteger(parsedResults.wins),
      losses: normaliseNonNegativeInteger(parsedResults.losses),
    };
  } catch {
    return { wins: 0, losses: 0 };
  }
}

function writePersistentResults(results) {
  const safeResults = {
    wins: normaliseNonNegativeInteger(results.wins),
    losses: normaliseNonNegativeInteger(results.losses),
  };

  try {
    window.localStorage.setItem(
      PERSISTENT_RESULTS_STORAGE_KEY,
      JSON.stringify(safeResults),
    );
  } catch {
    // Storage may be unavailable; the game should still run.
  }

  return safeResults;
}

export function createGame({ opponentCount = 1 } = {}) {
  const board = buildBoard();
  validateBoard(board);

  const listeners = new Set();

  const state = {
    opponentCount,
    activePlayerIndex: 0,
    selectedPieceId: null,
    jumpChainActive: false,
    jumpAwaitingConfirmation: false,
    jumpChainVisited: new Set(),
    jumpChainStart: null,
    gameOver: false,
    computerThinking: false,
    turnToken: 0,
    pieces: new Map(),
  };

  let activePlayers = GAME_CONFIGURATIONS[opponentCount];
  let persistentResults = readPersistentResults();

  function emit(type = "update") {
    const snapshot = getSnapshot();

    for (const listener of listeners) {
      listener({ type, snapshot });
    }
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function getActivePlayer() {
    return activePlayers[state.activePlayerIndex];
  }

  function getPlayerById(playerId) {
    return activePlayers.find((player) => player.id === playerId) ?? null;
  }

  function findPieceById(pieceId) {
    for (const piece of state.pieces.values()) {
      if (piece.id === pieceId) {
        return piece;
      }
    }

    return null;
  }

  function getSelectedPiece() {
    return state.selectedPieceId ? findPieceById(state.selectedPieceId) : null;
  }

  function getPosition() {
    return { pieces: state.pieces };
  }

  function createPiece(playerId, x, y) {
    const piece = {
      id: `${playerId}:${x},${y}`,
      playerId,
      x,
      y,
    };

    state.pieces.set(coordinateKey(x, y), piece);
  }

  function placeStartingPieces() {
    state.pieces.clear();

    for (const player of activePlayers) {
      for (const cell of board.cells.values()) {
        if (cell.region === player.homeRegion) {
          createPiece(player.id, cell.x, cell.y);
        }
      }
    }
  }

  function movePiece(piece, destinationX, destinationY) {
    state.pieces.delete(coordinateKey(piece.x, piece.y));
    piece.x = destinationX;
    piece.y = destinationY;
    state.pieces.set(coordinateKey(piece.x, piece.y), piece);
  }

  function clearJumpChainState() {
    state.selectedPieceId = null;
    state.jumpChainActive = false;
    state.jumpAwaitingConfirmation = false;
    state.jumpChainVisited.clear();
    state.jumpChainStart = null;
  }

  function recordHumanWin() {
    persistentResults.wins += 1;
    persistentResults = writePersistentResults(persistentResults);
  }

  function recordHumanLoss() {
    persistentResults.losses += 1;
    persistentResults = writePersistentResults(persistentResults);
  }

  function recordGameResult(winningPlayer) {
    if (winningPlayer.id === HUMAN_PLAYER_ID) {
      recordHumanWin();
    } else {
      recordHumanLoss();
    }
  }

  function startHumanJumpChain(piece) {
    state.jumpChainActive = true;
    state.jumpAwaitingConfirmation = false;
    state.jumpChainStart = {
      pieceId: piece.id,
      x: piece.x,
      y: piece.y,
    };
    state.jumpChainVisited = new Set([coordinateKey(piece.x, piece.y)]);
  }

  function selectPiece(pieceId) {
    const activePlayer = getActivePlayer();

    if (state.gameOver || state.computerThinking) {
      return;
    }

    if (activePlayer.type !== "human") {
      return;
    }

    const piece = findPieceById(pieceId);

    if (!piece || piece.playerId !== activePlayer.id) {
      return;
    }

    if (state.jumpChainActive) {
      if (piece.id === state.selectedPieceId) {
        if (canPlayerEndMoveAt(board, activePlayer, piece.x, piece.y)) {
          state.jumpAwaitingConfirmation = true;
          endTurn();
        }
      }

      return;
    }

    const legalMoves = getLegalMovesForPiece(
      getPosition(),
      board,
      piece,
      activePlayer,
    );

    if (legalMoves.length === 0) {
      emit();
      return;
    }

    state.selectedPieceId = piece.id;
    emit();
  }

  function applyHumanMove(destinationX, destinationY) {
    const activePlayer = getActivePlayer();

    if (
      state.gameOver
      || state.computerThinking
      || activePlayer.type !== "human"
    ) {
      return;
    }

    const piece = getSelectedPiece();

    if (!piece) {
      return;
    }

    const legalMoves = getLegalMovesForPiece(
      getPosition(),
      board,
      piece,
      activePlayer,
      {
        jumpChainActive: state.jumpChainActive,
        selectedPieceId: state.selectedPieceId,
        jumpChainVisited: state.jumpChainVisited,
      },
    );

    const move = legalMoves.find((candidate) => {
      return candidate.to[0] === destinationX
        && candidate.to[1] === destinationY;
    });

    if (!move) {
      return;
    }

    if (move.type === "extended-jump" && !state.jumpChainActive) {
      startHumanJumpChain(piece);
    }

    movePiece(piece, move.to[0], move.to[1]);

    if (move.type === "step") {
      endTurn();
      return;
    }

    state.selectedPieceId = piece.id;
    state.jumpAwaitingConfirmation = false;
    state.jumpChainVisited.add(coordinateKey(move.to[0], move.to[1]));
    emit();
  }

  function resetCurrentHumanMove() {
    const activePlayer = getActivePlayer();
    const selectedPiece = getSelectedPiece();

    if (
      state.gameOver
      || state.computerThinking
      || activePlayer.type !== "human"
      || !state.jumpChainActive
      || !selectedPiece
      || !state.jumpChainStart
      || selectedPiece.id !== state.jumpChainStart.pieceId
    ) {
      return;
    }

    movePiece(selectedPiece, state.jumpChainStart.x, state.jumpChainStart.y);

    state.selectedPieceId = selectedPiece.id;
    state.jumpChainActive = false;
    state.jumpAwaitingConfirmation = false;
    state.jumpChainVisited.clear();
    state.jumpChainStart = null;

    emit();
  }

  function applyComputerMove(move) {
    if (state.gameOver) {
      return;
    }

    const piece = getPieceAt(getPosition(), move.from[0], move.from[1]);

    if (!piece) {
      return;
    }

    if (move.type === "extended-jump" && !state.jumpChainActive) {
      startHumanJumpChain(piece);
    }

    movePiece(piece, move.to[0], move.to[1]);
    state.selectedPieceId = piece.id;

    if (move.type === "extended-jump") {
      state.jumpChainVisited.add(coordinateKey(move.to[0], move.to[1]));
    }

    emit();
  }

  function endTurn() {
    const playerWhoMoved = getActivePlayer();

    clearJumpChainState();
    state.computerThinking = false;

    if (playerHasWon(getPosition(), board, playerWhoMoved)) {
      state.gameOver = true;
      state.turnToken += 1;
      recordGameResult(playerWhoMoved);
      emit("game-over");
      return;
    }

    state.activePlayerIndex = (state.activePlayerIndex + 1) % activePlayers.length;
    state.turnToken += 1;
    emit("turn-changed");
  }

  function resetGame() {
    state.turnToken += 1;
    state.activePlayerIndex = 0;
    state.gameOver = false;
    state.computerThinking = false;

    clearJumpChainState();
    placeStartingPieces();

    emit("reset");
  }

  function setOpponentCount(count) {
    if (!GAME_CONFIGURATIONS[count]) {
      return;
    }

    state.opponentCount = count;
    activePlayers = GAME_CONFIGURATIONS[count];
    resetGame();
  }

  function setComputerThinking(value) {
    state.computerThinking = Boolean(value);
    emit();
  }

  function getSnapshot() {
    const activePlayer = getActivePlayer();
    const selectedPiece = getSelectedPiece();

    const legalMovesForSelected = selectedPiece
      ? getLegalMovesForPiece(
          getPosition(),
          board,
          selectedPiece,
          activePlayer,
          {
            jumpChainActive: state.jumpChainActive,
            selectedPieceId: state.selectedPieceId,
            jumpChainVisited: state.jumpChainVisited,
          },
        )
      : [];

    const hasAnyLegalMove = getAllLegalMovesForPlayer(
      getPosition(),
      board,
      activePlayer,
    ).length > 0;

    return {
      board,
      state,
      activePlayers,
      activePlayer,
      legalMovesForSelected,
      hasAnyLegalMove,
      persistentResults: { ...persistentResults },
    };
  }

  return {
    subscribe,
    getSnapshot,
    selectPiece,
    applyHumanMove,
    applyComputerMove,
    resetCurrentHumanMove,
    resetGame,
    setOpponentCount,
    setComputerThinking,
    endTurn,
  };
}