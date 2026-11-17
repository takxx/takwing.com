import { EMPTY, BLACK, WHITE } from "./board4.js";

function cloneBoard(board) {
  return new Map(board);
}

function getLegalMoves(boardDefinition, board, color) {
  const moves = [];

  for (const cell of boardDefinition.cells) {
    const flips = boardDefinition.getFlips(board, cell.id, color);

    if (flips.length > 0) {
      moves.push({ id: cell.id, flips });
    }
  }

  return moves;
}

function applyMove(boardDefinition, board, move, color) {
  const nextBoard = cloneBoard(board);
  nextBoard.set(move.id, color);

  for (const flipId of move.flips) {
    nextBoard.set(flipId, color);
  }

  return nextBoard;
}

function countPieces(board) {
  let black = 0;
  let white = 0;

  for (const value of board.values()) {
    if (value === BLACK) black += 1;
    if (value === WHITE) white += 1;
  }

  return { black, white };
}

function isFrontier(boardDefinition, board, cellId) {
  const neighbours = boardDefinition.neighbours.get(cellId) ?? [];
  return neighbours.some(id => board.get(id) === EMPTY);
}

// Scores the board from the given player's perspective.
function evaluateBoard(boardDefinition, board, perspective) {
  let score = 0;
  let ownFrontier = 0;
  let opponentFrontier = 0;
  let ownPieces = 0;
  let opponentPieces = 0;

  for (const cell of boardDefinition.cells) {
    const value = board.get(cell.id);

    if (value === perspective) {
      ownPieces += 1;
      score += boardDefinition.getWeight(cell.id);

      if (isFrontier(boardDefinition, board, cell.id)) {
        ownFrontier += 1;
      }
    } else if (value === -perspective) {
      opponentPieces += 1;
      score -= boardDefinition.getWeight(cell.id);

      if (isFrontier(boardDefinition, board, cell.id)) {
        opponentFrontier += 1;
      }
    }
  }

  let cornerScore = 0;

  for (const cornerId of boardDefinition.corners) {
    const value = board.get(cornerId);
    if (value === perspective) cornerScore += 1;
    if (value === -perspective) cornerScore -= 1;
  }

  const ownMobility = getLegalMoves(boardDefinition, board, perspective).length;
  const opponentMobility = getLegalMoves(boardDefinition, board, -perspective).length;

  const occupied = ownPieces + opponentPieces;
  const total = boardDefinition.cells.length;
  const endgameWeight = occupied > total * 0.68 ? 4 : 1;

  return (
    score +
    (ownMobility - opponentMobility) * 12 +
    cornerScore * 180 +
    (opponentFrontier - ownFrontier) * 4 +
    (ownPieces - opponentPieces) * endgameWeight * 2
  );
}

function terminalScore(board, perspective) {
  const { black, white } = countPieces(board);
  const ownCount = perspective === BLACK ? black : white;
  const opponentCount = perspective === BLACK ? white : black;
  const difference = ownCount - opponentCount;

  if (difference > 0) return 100000 + difference * 100;
  if (difference < 0) return -100000 + difference * 100;
  return 0;
}

// Cheap ordering: avoid recalculating opponent legal moves for every candidate.
function orderMoves(boardDefinition, moves) {
  return [...moves].sort((a, b) => {
    const aCorner = boardDefinition.corners.includes(a.id) ? 1 : 0;
    const bCorner = boardDefinition.corners.includes(b.id) ? 1 : 0;

    const aScore =
      aCorner * 10000 +
      boardDefinition.getWeight(a.id) +
      a.flips.length;

    const bScore =
      bCorner * 10000 +
      boardDefinition.getWeight(b.id) +
      b.flips.length;

    return bScore - aScore;
  });
}

function negamax(boardDefinition, board, playerToMove, depth, alpha, beta) {
  const moves = getLegalMoves(boardDefinition, board, playerToMove);

  if (moves.length === 0) {
    const opponentMoves = getLegalMoves(boardDefinition, board, -playerToMove);

    if (opponentMoves.length === 0) {
      return terminalScore(board, playerToMove);
    }

    if (depth <= 0) {
      return evaluateBoard(boardDefinition, board, playerToMove);
    }

    // Passing does not change the board, but changes whose perspective is used.
    return -negamax(
      boardDefinition,
      board,
      -playerToMove,
      depth - 1,
      -beta,
      -alpha
    );
  }

  if (depth <= 0) {
    return evaluateBoard(boardDefinition, board, playerToMove);
  }

  let best = -Infinity;

  for (const move of orderMoves(boardDefinition, moves)) {
    const nextBoard = applyMove(boardDefinition, board, move, playerToMove);
    const score = -negamax(
      boardDefinition,
      nextBoard,
      -playerToMove,
      depth - 1,
      -beta,
      -alpha
    );

    best = Math.max(best, score);
    alpha = Math.max(alpha, score);

    if (alpha >= beta) break;
  }

  return best;
}

function chooseDepth(boardDefinition, board) {
  const { black, white } = countPieces(board);
  const empty = boardDefinition.cells.length - black - white;

  // Conservative defaults to help keep searches shorter on the main thread.
  if (empty <= 8) return 5;
  if (empty <= 16) return 4;
  if (empty <= 32) return 3;
  return 2;
}

export function findBestMove(boardDefinition, board, color, depth = null) {
  const moves = getLegalMoves(boardDefinition, board, color);

  if (moves.length === 0) return null;

  const searchDepth = Math.max(
    1,
    depth ?? chooseDepth(boardDefinition, board)
  );

  let bestScore = -Infinity;
  let bestMoves = [];

  for (const move of orderMoves(boardDefinition, moves)) {
    const nextBoard = applyMove(boardDefinition, board, move, color);
    const score = -negamax(
      boardDefinition,
      nextBoard,
      -color,
      searchDepth - 1,
      -Infinity,
      Infinity
    );

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

export { getLegalMoves, applyMove, countPieces, chooseDepth };
