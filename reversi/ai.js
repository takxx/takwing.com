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
  return boardDefinition.neighbours
    .get(cellId)
    .some(neighbourId => board.get(neighbourId) === EMPTY);
}

function evaluateBoard(boardDefinition, board, perspective) {
  const counts = countPieces(board);
  const ownCount = perspective === BLACK ? counts.black : counts.white;
  const opponentCount = perspective === BLACK ? counts.white : counts.black;

  const ownMoves = getLegalMoves(boardDefinition, board, perspective).length;
  const opponentMoves = getLegalMoves(boardDefinition, board, -perspective).length;

  let positionScore = 0;
  let corners = 0;
  let ownFrontier = 0;
  let opponentFrontier = 0;

  for (const cell of boardDefinition.cells) {
    const value = board.get(cell.id);

    if (value === perspective) {
      positionScore += boardDefinition.getWeight(cell.id);

      if (isFrontier(boardDefinition, board, cell.id)) {
        ownFrontier += 1;
      }
    } else if (value === -perspective) {
      positionScore -= boardDefinition.getWeight(cell.id);

      if (isFrontier(boardDefinition, board, cell.id)) {
        opponentFrontier += 1;
      }
    }
  }

  for (const cornerId of boardDefinition.corners) {
    const value = board.get(cornerId);

    if (value === perspective) corners += 1;
    if (value === -perspective) corners -= 1;
  }

  const occupied = ownCount + opponentCount;
  const endgameWeight = occupied > boardDefinition.cells.length * 0.68 ? 4 : 1;

  return (
    positionScore +
    (ownMoves - opponentMoves) * 12 +
    corners * 180 +
    (opponentFrontier - ownFrontier) * 4 +
    (ownCount - opponentCount) * endgameWeight * 2
  );
}

function terminalScore(board, perspective) {
  const counts = countPieces(board);
  const ownCount = perspective === BLACK ? counts.black : counts.white;
  const opponentCount = perspective === BLACK ? counts.white : counts.black;

  if (ownCount > opponentCount) {
    return 100000 + (ownCount - opponentCount) * 100;
  }

  if (ownCount < opponentCount) {
    return -100000 + (ownCount - opponentCount) * 100;
  }

  return 0;
}

function quickMoveScore(boardDefinition, board, move, color) {
  const nextBoard = applyMove(boardDefinition, board, move, color);
  const opponentMobility = getLegalMoves(boardDefinition, nextBoard, -color).length;

  return (
    boardDefinition.getWeight(move.id) +
    move.flips.length * 2 -
    opponentMobility * 4 +
    (boardDefinition.corners.includes(move.id) ? 1000 : 0)
  );
}

function orderMoves(boardDefinition, board, moves, color) {
  return [...moves].sort(
    (first, second) =>
      quickMoveScore(boardDefinition, board, second, color) -
      quickMoveScore(boardDefinition, board, first, color)
  );
}

function negamax(boardDefinition, board, playerToMove, depth, alpha, beta, rootColor, passed) {
  const moves = getLegalMoves(boardDefinition, board, playerToMove);

  if (depth <= 0) {
    return evaluateBoard(boardDefinition, board, rootColor);
  }

  if (moves.length === 0) {
    const opponentMoves = getLegalMoves(boardDefinition, board, -playerToMove);

    if (opponentMoves.length === 0) {
      return terminalScore(board, rootColor);
    }

    if (passed) {
      return evaluateBoard(boardDefinition, board, rootColor);
    }

    return -negamax(
      boardDefinition,
      board,
      -playerToMove,
      depth - 1,
      -beta,
      -alpha,
      rootColor,
      true
    );
  }

  let best = -Infinity;

  for (const move of orderMoves(boardDefinition, board, moves, playerToMove)) {
    const nextBoard = applyMove(boardDefinition, board, move, playerToMove);
    const score = -negamax(
      boardDefinition,
      nextBoard,
      -playerToMove,
      depth - 1,
      -beta,
      -alpha,
      rootColor,
      false
    );

    best = Math.max(best, score);
    alpha = Math.max(alpha, score);

    if (alpha >= beta) {
      break;
    }
  }

  return best;
}

function chooseDepth(boardDefinition, board) {
  const counts = countPieces(board);
  const empty = boardDefinition.cells.length - counts.black - counts.white;

  if (empty <= 10) return 8;
  if (empty <= 18) return 6;
  if (empty <= 32) return 5;
  return 4;
}

export function findBestMove(boardDefinition, board, color, depth = null) {
  const moves = getLegalMoves(boardDefinition, board, color);

  if (moves.length === 0) {
    return null;
  }

  const searchDepth = depth ?? chooseDepth(boardDefinition, board);
  let bestScore = -Infinity;
  let bestMoves = [];

  for (const move of orderMoves(boardDefinition, board, moves, color)) {
    const nextBoard = applyMove(boardDefinition, board, move, color);
    const score = -negamax(
      boardDefinition,
      nextBoard,
      -color,
      searchDepth - 1,
      -Infinity,
      Infinity,
      color,
      true
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