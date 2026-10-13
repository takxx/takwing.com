// ai.js
// Computer move selection: candidate generation, position evaluation,
// lookahead, and alpha-beta search.

import {
  axialDistance,
  canPlayerEndMoveAt,
  clonePosition,
  coordinateKey,
  getCell,
  getExtendedJumpsAtPosition,
  getAllLegalMovesForPlayer,
  getNormalMoves,
  playerHasWon,
} from "./game.js";

const MAX_JUMP_DEPTH = 4;
const MAX_SEARCH_CANDIDATES = 20;

function findPieceById(position, pieceId) {
  for (const piece of position.pieces.values()) {
    if (piece.id === pieceId) {
      return piece;
    }
  }

  return null;
}

function getNearestTargetDistance(board, player, x, y) {
  let shortestDistance = Infinity;

  for (const cell of board.cells.values()) {
    if (cell.region !== player.targetRegion) {
      continue;
    }

    shortestDistance = Math.min(
      shortestDistance,
      axialDistance(x, y, cell.x, cell.y),
    );
  }

  return shortestDistance;
}

function quickMoveScore(position, board, turn, player) {
  const piece = findPieceById(position, turn.pieceId);

  if (!piece) {
    return -Infinity;
  }

  const startDistance = getNearestTargetDistance(
    board,
    player,
    piece.x,
    piece.y,
  );

  const finalMove = turn.moves[turn.moves.length - 1];
  const endDistance = getNearestTargetDistance(
    board,
    player,
    finalMove.to[0],
    finalMove.to[1],
  );

  return (startDistance - endDistance) * 100 + turn.moves.length * 5;
}

function enumerateJumpChains(position, board, piece, player) {
  const chains = [];
  const originKey = coordinateKey(piece.x, piece.y);
  const baseOccupiedKeys = new Set(position.pieces.keys());

  function explore(
    currentPosition,
    currentX,
    currentY,
    visitedLandings,
    occupiedKeys,
    moves,
  ) {
    const jumps = getExtendedJumpsAtPosition(
      currentPosition,
      board,
      piece,
      player,
      currentX,
      currentY,
      visitedLandings,
      occupiedKeys,
    );

    for (const jump of jumps) {
      const nextPosition = clonePosition(currentPosition);
      const movingPiece = findPieceById(nextPosition, piece.id);

      if (!movingPiece) {
        continue;
      }

      nextPosition.pieces.delete(
        coordinateKey(movingPiece.x, movingPiece.y),
      );

      movingPiece.x = jump.to[0];
      movingPiece.y = jump.to[1];

      nextPosition.pieces.set(
        coordinateKey(movingPiece.x, movingPiece.y),
        movingPiece,
      );

      const nextMoves = [...moves, jump];

      if (
        canPlayerEndMoveAt(
          board,
          player,
          jump.to[0],
          jump.to[1],
        )
      ) {
        chains.push({
          type: "jump-chain",
          pieceId: piece.id,
          moves: nextMoves,
        });
      }

      if (nextMoves.length >= MAX_JUMP_DEPTH) {
        continue;
      }

      const nextVisitedLandings = new Set(visitedLandings);
      nextVisitedLandings.add(coordinateKey(jump.to[0], jump.to[1]));

      const nextOccupiedKeys = new Set(occupiedKeys);
      nextOccupiedKeys.delete(coordinateKey(currentX, currentY));
      nextOccupiedKeys.add(coordinateKey(jump.to[0], jump.to[1]));

      explore(
        nextPosition,
        jump.to[0],
        jump.to[1],
        nextVisitedLandings,
        nextOccupiedKeys,
        nextMoves,
      );
    }
  }

  explore(
    position,
    piece.x,
    piece.y,
    new Set([originKey]),
    baseOccupiedKeys,
    [],
  );

  return chains;
}

function generateCandidateTurns(position, board, player) {
  const candidates = [];

  for (const piece of position.pieces.values()) {
    if (piece.playerId !== player.id) {
      continue;
    }

    for (const move of getNormalMoves(position, board, piece, player)) {
      candidates.push({
        type: "step",
        pieceId: piece.id,
        moves: [move],
      });
    }

    for (const chain of enumerateJumpChains(position, board, piece, player)) {
      candidates.push(chain);
    }
  }

  for (const candidate of candidates) {
    candidate.quickScore = quickMoveScore(
      position,
      board,
      candidate,
      player,
    );
  }

  return candidates;
}

function applyTurnToPosition(position, board, turn) {
  const nextPosition = clonePosition(position);
  const piece = findPieceById(nextPosition, turn.pieceId);

  if (!piece) {
    return nextPosition;
  }

  for (const move of turn.moves) {
    nextPosition.pieces.delete(coordinateKey(piece.x, piece.y));

    piece.x = move.to[0];
    piece.y = move.to[1];

    nextPosition.pieces.set(
      coordinateKey(piece.x, piece.y),
      piece,
    );
  }

  return nextPosition;
}

function evaluatePlayer(position, board, player) {
  let score = 0;
  let targetPieceCount = 0;

  for (const piece of position.pieces.values()) {
    if (piece.playerId !== player.id) {
      continue;
    }

    const targetDistance = getNearestTargetDistance(
      board,
      player,
      piece.x,
      piece.y,
    );

    score -= targetDistance * 100;

    const cell = getCell(board, piece.x, piece.y);

    if (cell?.region === player.targetRegion) {
      score += 900;
      targetPieceCount += 1;
    }

    if (cell?.region === player.homeRegion) {
      score -= 140;
    }
  }

  score += targetPieceCount * 180;
  score += getAllLegalMovesForPlayer(position, board, player).length * 4;

  return score;
}

function evaluatePosition(position, board, rootPlayerId, activePlayers) {
  let score = 0;

  for (const player of activePlayers) {
    const playerScore = evaluatePlayer(position, board, player);

    if (player.id === rootPlayerId) {
      score += playerScore;
    } else {
      score -= playerScore * 0.8;
    }
  }

  return score;
}

function minimax(
  position,
  board,
  depth,
  alpha,
  beta,
  rootPlayerId,
  activePlayers,
  currentPlayerIndex,
) {
  const currentPlayer = activePlayers[currentPlayerIndex];

  let anyPlayerHasWon = false;

  for (const player of activePlayers) {
    if (playerHasWon(position, board, player)) {
      anyPlayerHasWon = true;
      break;
    }
  }

  if (depth === 0 || anyPlayerHasWon) {
    return evaluatePosition(
      position,
      board,
      rootPlayerId,
      activePlayers,
    );
  }

  const candidateTurns = generateCandidateTurns(
    position,
    board,
    currentPlayer,
  )
    .sort((first, second) => second.quickScore - first.quickScore)
    .slice(0, MAX_SEARCH_CANDIDATES);

  const nextPlayerIndex = (currentPlayerIndex + 1) % activePlayers.length;

  if (candidateTurns.length === 0) {
    return minimax(
      position,
      board,
      depth - 1,
      alpha,
      beta,
      rootPlayerId,
      activePlayers,
      nextPlayerIndex,
    );
  }

  const maximizing = currentPlayer.id === rootPlayerId;

  if (maximizing) {
    let bestScore = -Infinity;

    for (const turn of candidateTurns) {
      const nextPosition = applyTurnToPosition(position, board, turn);

      const score = minimax(
        nextPosition,
        board,
        depth - 1,
        alpha,
        beta,
        rootPlayerId,
        activePlayers,
        nextPlayerIndex,
      );

      bestScore = Math.max(bestScore, score);
      alpha = Math.max(alpha, bestScore);

      if (alpha >= beta) {
        break;
      }
    }

    return bestScore;
  }

  let bestScore = Infinity;

  for (const turn of candidateTurns) {
    const nextPosition = applyTurnToPosition(position, board, turn);

    const score = minimax(
      nextPosition,
      board,
      depth - 1,
      alpha,
      beta,
      rootPlayerId,
      activePlayers,
      nextPlayerIndex,
    );

    bestScore = Math.min(bestScore, score);
    beta = Math.min(beta, bestScore);

    if (alpha >= beta) {
      break;
    }
  }

  return bestScore;
}

export function chooseComputerTurn({
  position,
  board,
  player,
  activePlayers,
  playerIndex,
  depth = 2,
}) {
  const candidateTurns = generateCandidateTurns(position, board, player)
    .sort((first, second) => second.quickScore - first.quickScore)
    .slice(0, MAX_SEARCH_CANDIDATES);

  if (candidateTurns.length === 0) {
    return null;
  }

  let bestTurn = null;
  let bestScore = -Infinity;

  for (const turn of candidateTurns) {
    const nextPosition = applyTurnToPosition(position, board, turn);

    const score = minimax(
      nextPosition,
      board,
      depth - 1,
      -Infinity,
      Infinity,
      player.id,
      activePlayers,
      (playerIndex + 1) % activePlayers.length,
    );

    if (score > bestScore) {
      bestScore = score;
      bestTurn = turn;
    }
  }

  return bestTurn;
}