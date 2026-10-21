const NEIGHBORS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
  [-1, 1],
  [1, -1]
];

const BRIDGE_DATA = [
  { offset: [-2, 1], gaps: [[-1, 0], [-1, 1]] },
  { offset: [-1, 2], gaps: [[0, 1], [-1, 1]] },
  { offset: [1, 1], gaps: [[1, 0], [0, 1]] },
  { offset: [2, -1], gaps: [[1, 0], [1, -1]] },
  { offset: [1, -2], gaps: [[0, -1], [1, -1]] },
  { offset: [-1, -1], gaps: [[0, -1], [-1, 0]] }
];

export function chooseComputerMove(board, player = "blue") {
  const size = board.length;
  if (!size || board.some((row) => row.length !== size)) {
    throw new Error("The AI expects a non-empty square board.");
  }

  const opponent = otherPlayer(player);
  const legalMoves = getPrunedLegalMoves(board, player);

  if (legalMoves.length === 0) return null;

  // 1. Immediate win/loss checks
  const winningMove = findImmediateWin(board, player);
  if (winningMove) return winningMove;

  const opponentWinningMove = findImmediateWin(board, opponent);
  if (opponentWinningMove) return opponentWinningMove;

  // 2. Setup MCTS Root
  const root = createNode(player);
  root.untried = rankMovesFast(board, player, Math.min(25, legalMoves.length));

  const simulations = size >= 12 ? 1400 : size >= 9 ? 1800 : 2200;

  for (let simulation = 0; simulation < simulations; simulation++) {
    const position = board.map((row) => row.slice());
    const path = [root];
    let node = root;

    // Selection phase
    while (!node.terminal) {
      if (node.untried === null) {
        node.untried = rankMovesFast(
          position,
          node.toMove,
          Math.min(14, getPrunedLegalMoves(position, node.toMove).length)
        );
      }

      if (node.untried.length > 0) {
        const action = node.untried.shift();
        const mover = node.toMove;
        position[action.row][action.col] = mover;

        const child = createNode(otherPlayer(mover));
        child.move = [action.row, action.col];
        child.prior = action.prior;
        child.terminal = hasConnection(position, mover);
        child.winner = child.terminal ? mover : null;

        node.children.push(child);
        node = child;
        path.push(node);
        break;
      }

      if (node.children.length === 0) break;

      const child = selectChild(node, player);
      position[child.move[0]][child.move[1]] = node.toMove;
      node = child;
      path.push(node);
    }

    // Rollout phase
    const winner = node.terminal
      ? node.winner
      : rollout(position, node.toMove);

    const result = winner === player ? 1 : 0;
    for (const visited of path) {
      visited.visits++;
      visited.wins += result;
    }
  }

  if (root.children.length === 0) {
    return legalMoves[Math.floor(Math.random() * legalMoves.length)];
  }

  root.children.sort((a, b) => {
    if (b.visits !== a.visits) return b.visits - a.visits;
    return (b.wins / Math.max(1, b.visits)) - (a.wins / Math.max(1, a.visits));
  });

  return root.children[0].move;
}

function createNode(toMove) {
  return {
    toMove,
    move: null,
    prior: 0,
    visits: 0,
    wins: 0,
    children: [],
    untried: null,
    terminal: false,
    winner: null
  };
}

function selectChild(node, computer) {
  const logParent = Math.log(node.visits + 1);
  let bestChild = null;
  let bestScore = -Infinity;

  for (const child of node.children) {
    if (child.visits === 0) return child;

    const computerWinRate = child.wins / child.visits;
    const exploitation = node.toMove === computer
      ? computerWinRate
      : 1 - computerWinRate;

    const exploration = 1.41 * Math.sqrt(logParent / child.visits);
    const priorBonus = 0.2 * child.prior / (1 + child.visits);
    const score = exploitation + exploration + priorBonus;

    if (score > bestScore) {
      bestScore = score;
      bestChild = child;
    }
  }

  return bestChild;
}

function rollout(board, firstPlayer) {
  let player = firstPlayer;
  const maxMoves = board.length * board.length;

  for (let turn = 0; turn < maxMoves; turn++) {
    const opponent = otherPlayer(player);
    const ownPath = connectionInfo(board, player);
    const opponentPath = connectionInfo(board, opponent);

    const ownPathMoves = emptyCellsOnPath(board, ownPath.path);
    const opponentPathMoves = emptyCellsOnPath(board, opponentPath.path);

    let move = null;

    if (ownPath.cost === 1 && ownPathMoves.length === 1) {
      move = ownPathMoves[0];
    }

    if (!move && opponentPath.cost === 1 && opponentPathMoves.length === 1) {
      move = opponentPathMoves[0];
    }

    if (!move) {
      const useOwnPath = opponentPathMoves.length === 0 || Math.random() < 0.65;
      const preferred = useOwnPath ? ownPathMoves : opponentPathMoves;
      const fallback = useOwnPath ? opponentPathMoves : ownPathMoves;
      move = randomItem(preferred) || randomItem(fallback);
    }

    if (!move || Math.random() < 0.05) {
      const remaining = getPrunedLegalMoves(board, player);
      move = randomItem(remaining);
    }
    if (!move) break;

    const [row, col] = move;
    board[row][col] = player;

    if (hasConnection(board, player)) return player;
    player = opponent;
  }

  return otherPlayer(firstPlayer);
}

// Dead Cell Pruning: filters out empty cells that are too far from active connection paths
function getPrunedLegalMoves(board, player) {
  const size = board.length;
  const allMoves = getLegalMoves(board);
  if (size <= 5 || allMoves.length < size * 2) return allMoves;

  const opponent = otherPlayer(player);
  const ownInfo = connectionInfo(board, player);
  const oppInfo = connectionInfo(board, opponent);

  const activeSet = new Set();
  for (const [r, c] of ownInfo.path) activeSet.add(`${r},${c}`);
  for (const [r, c] of oppInfo.path) activeSet.add(`${r},${c}`);

  // Include neighbors of the active shortest paths to account for immediate maneuvering space
  const extendedSet = new Set(activeSet);
  for (const key of activeSet) {
    const [r, c] = key.split(',').map(Number);
    for (const [dr, dc] of NEIGHBORS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === null) {
        extendedSet.add(`${nr},${nc}`);
      }
    }
    for (const { offset: [dr, dc], gaps } of BRIDGE_DATA) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === null) {
        extendedSet.add(`${nr},${nc}`);
      }
    }
  }

  const pruned = [];
  for (const [row, col] of allMoves) {
    if (extendedSet.has(`${row},${col}`)) {
      pruned.push([row, col]);
    }
  }

  // Fallback if pruning is too aggressive on empty boards
  return pruned.length > 0 ? pruned : allMoves;
}

function rankMovesFast(board, player, limit) {
  const size = board.length;
  const center = (size - 1) / 2;
  const opponent = otherPlayer(player);
  const candidateMoves = getPrunedLegalMoves(board, player);
  const ranked = [];

  for (const [row, col] of candidateMoves) {
    if (board[row][col] !== null) continue;

    let bridgeCompletion = 0;
    let bridgeDisruption = 0;

    for (const { offset: [dr, dc], gaps } of BRIDGE_DATA) {
      const tr = row + dr;
      const tc = col + dc;
      if (tr >= 0 && tr < size && tc >= 0 && tc < size) {
        if (board[tr][tc] === player) {
          let gapBlocked = false;
          for (const [gdr, gdc] of gaps) {
            const gr = row + gdr;
            const gc = col + gdc;
            if (gr >= 0 && gr < size && gc >= 0 && gc < size) {
              if (board[gr][gc] === opponent) {
                gapBlocked = true;
                break;
              }
            }
          }
          if (!gapBlocked) {
            bridgeCompletion += 2.5;
          }
        } else if (board[tr][tc] === opponent) {
          let gapBlocked = false;
          for (const [gdr, gdc] of gaps) {
            const gr = row + gdr;
            const gc = col + gdc;
            if (gr >= 0 && gr < size && gc >= 0 && gc < size) {
              if (board[gr][gc] === player) {
                gapBlocked = true;
                break;
              }
            }
          }
          if (!gapBlocked) {
            bridgeDisruption += 4.0;
          }
        }
      }
    }

    const centerDist = Math.abs(row - center) + Math.abs(col - center);
    const positionalScore = (size - centerDist) * 0.25;

    const score = 
      bridgeCompletion * 3.0 + 
      bridgeDisruption * 4.0 + 
      positionalScore;

    ranked.push({ row, col, score });
  }

  ranked.sort((a, b) => b.score - a.score);

  const count = Math.min(limit, ranked.length);
  return ranked.slice(0, count).map((move, index) => ({
    row: move.row,
    col: move.col,
    prior: 1 / (1 + index * 0.15)
  }));
}

function connectionInfo(board, player) {
  const size = board.length;
  const total = size * size;
  const opponent = otherPlayer(player);
  const distances = new Int32Array(total);
  const previous = new Int32Array(total);
  distances.fill(0x3fffffff);
  previous.fill(-1);

  const buckets = Array.from({ length: total + 1 }, () => []);

  const addStart = (row, col) => {
    const index = row * size + col;
    if (board[row][col] === opponent) return;

    const cost = board[row][col] === player ? 0 : 1;
    if (cost < distances[index]) {
      distances[index] = cost;
      buckets[cost].push(index);
    }
  };

  if (player === "blue") {
    for (let col = 0; col < size; col++) addStart(0, col);
  } else {
    for (let row = 0; row < size; row++) addStart(row, 0);
  }

  let goal = -1;

  for (let cost = 0; cost < buckets.length; cost++) {
    const bucket = buckets[cost];

    while (bucket.length) {
      const index = bucket.pop();
      if (distances[index] !== cost) continue;

      const row = Math.floor(index / size);
      const col = index % size;

      if (
        (player === "blue" && row === size - 1) ||
        (player === "red" && col === size - 1)
      ) {
        goal = index;
        break;
      }

      for (const [dr, dc] of NEIGHBORS) {
        const nextRow = row + dr;
        const nextCol = col + dc;

        if (
          nextRow < 0 || nextRow >= size ||
          nextCol < 0 || nextCol >= size ||
          board[nextRow][nextCol] === opponent
        ) {
          continue;
        }

        const nextIndex = nextRow * size + nextCol;
        const stepCost = board[nextRow][nextCol] === player ? 0 : 1;
        const nextCost = cost + stepCost;

        if (nextCost < distances[nextIndex]) {
          distances[nextIndex] = nextCost;
          previous[nextIndex] = index;
          buckets[nextCost].push(nextIndex);
        }
      }

      for (const { offset: [dr, dc], gaps } of BRIDGE_DATA) {
        const nextRow = row + dr;
        const nextCol = col + dc;

        if (
          nextRow < 0 || nextRow >= size ||
          nextCol < 0 || nextCol >= size ||
          board[nextRow][nextCol] === opponent
        ) {
          continue;
        }

        let bridgeBlocked = false;
        for (const [gdr, gdc] of gaps) {
          const gr = row + gdr;
          const gc = col + gdc;
          if (gr >= 0 && gr < size && gc >= 0 && gc < size) {
            if (board[gr][gc] === opponent) {
              bridgeBlocked = true;
              break;
            }
          }
        }

        if (!bridgeBlocked) {
          const nextIndex = nextRow * size + nextCol;
          const stepCost = board[nextRow][nextCol] === player ? 0 : 1;
          const nextCost = cost + stepCost;

          if (nextCost < distances[nextIndex]) {
            distances[nextIndex] = nextCost;
            previous[nextIndex] = index;
            buckets[nextCost].push(nextIndex);
          }
        }
      }
    }

    if (goal !== -1) break;
  }

  if (goal === -1) {
    return { cost: Infinity, path: [] };
  }

  const path = [];
  for (let index = goal; index !== -1; index = previous[index]) {
    path.push([Math.floor(index / size), index % size]);
  }
  path.reverse();

  return { cost: distances[goal], path };
}

function findImmediateWin(board, player) {
  const size = board.length;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (board[row][col] !== null) continue;

      board[row][col] = player;
      const wins = hasConnection(board, player);
      board[row][col] = null;

      if (wins) return [row, col];
    }
  }

  return null;
}

function hasConnection(board, player) {
  const size = board.length;
  const visited = new Uint8Array(size * size);
  const stack = [];

  if (player === "blue") {
    for (let col = 0; col < size; col++) {
      if (board[0][col] === player) stack.push(col);
    }
  } else {
    for (let row = 0; row < size; row++) {
      if (board[row][0] === player) stack.push(row * size);
    }
  }

  while (stack.length) {
    const index = stack.pop();
    if (visited[index]) continue;
    visited[index] = 1;

    const row = Math.floor(index / size);
    const col = index % size;

    if (
      (player === "blue" && row === size - 1) ||
      (player === "red" && col === size - 1)
    ) {
      return true;
    }

    for (const [dr, dc] of NEIGHBORS) {
      const nextRow = row + dr;
      const nextCol = col + dc;

      if (
        nextRow >= 0 && nextRow < size &&
        nextCol >= 0 && nextCol < size &&
        board[nextRow][nextCol] === player
      ) {
        const nextIndex = nextRow * size + nextCol;
        if (!visited[nextIndex]) stack.push(nextIndex);
      }
    }
  }

  return false;
}

function emptyCellsOnPath(board, path) {
  const moves = [];
  for (const [row, col] of path) {
    if (board[row][col] === null) moves.push([row, col]);
  }
  return moves;
}

function getLegalMoves(board) {
  const moves = [];
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col.length < board.length; col++) { // Handled safely
    }
  }
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board.length; col++) {
      if (board[row][col] === null) moves.push([row, col]);
    }
  }
  return moves;
}

function randomItem(items) {
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)];
}

function otherPlayer(player) {
  return player === "blue" ? "red" : "blue";
}