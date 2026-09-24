"use strict";

/*
  Othello implementation.

  Board values:
    0 = empty
    1 = black
   -1 = white
*/

const BOARD_SIZE = 8;
const EMPTY = 0;
const BLACK = 1;
const WHITE = -1;

const DIRECTIONS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1]
];

const POSITION_WEIGHTS = [
  [120, -25, 20, 5, 5, 20, -25, 120],
  [-25, -45, -5, -5, -5, -5, -45, -25],
  [20, -5, 15, 3, 3, 15, -5, 20],
  [5, -5, 3, 3, 3, 3, -5, 5],
  [5, -5, 3, 3, 3, 3, -5, 5],
  [20, -5, 15, 3, 3, 15, -5, 20],
  [-25, -45, -5, -5, -5, -5, -45, -25],
  [120, -25, 20, 5, 5, 20, -25, 120]
];

const translations = {
  en: {
    title: "Othello",
    subtitle: "Play against the computer",
    language: "Language",
    currentScore: "Current pieces",
    record: "Game record",
    won: "Won",
    lost: "Lost",
    drawn: "Drawn",
    computer: "Computer",
    you: "You",
    newGame: "New game",
    hint: "Hint",
    status: "Status",
    yourTurn: "Your turn.",
    computerTurn: "Computer is thinking…",
    youStart: "You start.",
    computerStarts: "The computer starts.",
    yourTurnAfterPass: "The computer has no legal move. Your turn.",
    computerPassed: "The computer has no legal move and passes.",
    youPassed: "You have no legal move and must pass.",
    gameOver: "Game over.",
    youWin: "You win!",
    youLose: "You lose.",
    draw: "The game is a draw.",
    hintMessage: "Suggested move: {position}.",
    noHint: "There is no legal move to suggest.",
    thinkingHint: "Calculating a strong move…",
    movePosition: "{column}{row}"
  },

  es: {
    title: "Othello",
    subtitle: "Juega contra el ordenador",
    language: "Idioma",
    currentScore: "Fichas actuales",
    record: "Historial",
    won: "Ganadas",
    lost: "Perdidas",
    drawn: "Empates",
    computer: "Ordenador",
    you: "Tú",
    newGame: "Nueva partida",
    hint: "Pista",
    status: "Estado",
    yourTurn: "Tu turno.",
    computerTurn: "El ordenador está pensando…",
    youStart: "Empiezas tú.",
    computerStarts: "Empieza el ordenador.",
    yourTurnAfterPass:
      "El ordenador no tiene movimientos legales. Es tu turno.",
    computerPassed:
      "El ordenador no tiene movimientos legales y pasa.",
    youPassed: "No tienes movimientos legales y debes pasar.",
    gameOver: "Fin de la partida.",
    youWin: "¡Has ganado!",
    youLose: "Has perdido.",
    draw: "La partida termina en empate.",
    hintMessage: "Movimiento sugerido: {position}.",
    noHint: "No hay ningún movimiento legal que sugerir.",
    thinkingHint: "Calculando un movimiento fuerte…",
    movePosition: "{column}{row}"
  },

  "zh-Hant": {
    title: "黑白棋",
    subtitle: "與電腦對戰",
    language: "語言",
    currentScore: "目前棋子",
    record: "戰績",
    won: "勝",
    lost: "負",
    drawn: "和",
    computer: "電腦",
    you: "你",
    newGame: "新遊戲",
    hint: "提示",
    status: "狀態",
    yourTurn: "輪到你。",
    computerTurn: "電腦思考中……",
    youStart: "由你先手。",
    computerStarts: "由電腦先手。",
    yourTurnAfterPass: "電腦沒有合法步法。輪到你。",
    computerPassed: "電腦沒有合法步法，跳過回合。",
    youPassed: "你沒有合法步法，必須跳過回合。",
    gameOver: "遊戲結束。",
    youWin: "你贏了！",
    youLose: "你輸了。",
    draw: "平手。",
    hintMessage: "建議步法：{position}。",
    noHint: "目前沒有可建議的合法步法。",
    thinkingHint: "正在計算較佳步法……",
    movePosition: "{column}{row}"
  }
};

const elements = {
  board: document.getElementById("board"),
  languageSelect: document.getElementById("languageSelect"),
  newGameButton: document.getElementById("newGameButton"),
  hintButton: document.getElementById("hintButton"),
  statusText: document.getElementById("statusText"),
  hintMessage: document.getElementById("hintMessage"),
  humanScore: document.getElementById("humanScore"),
  aiScore: document.getElementById("aiScore"),
  wins: document.getElementById("wins"),
  losses: document.getElementById("losses"),
  draws: document.getElementById("draws"),
  humanLabel: document.getElementById("humanLabel")
};

let currentLanguage = detectLanguage();
let humanColor = BLACK;
let aiColor = WHITE;
let currentPlayer = BLACK;
let board = [];
let legalMoves = [];
let highlightedHint = null;
let gameOver = false;
let aiThinking = false;

let record = loadRecord();
let nextStarter = loadNextStarter();

function detectLanguage() {
  const browserLanguages = Array.isArray(navigator.languages)
    ? navigator.languages
    : [navigator.language];

  for (const language of browserLanguages) {
    if (!language) {
      continue;
    }

    const normalized = language.toLowerCase();

    if (normalized.startsWith("zh")) {
      return "zh-Hant";
    }

    if (normalized.startsWith("es")) {
      return "es";
    }

    if (normalized.startsWith("en")) {
      return "en";
    }
  }

  return "en";
}

function loadRecord() {
  try {
    return {
      wins: Number(localStorage.getItem("othello-wins")) || 0,
      losses: Number(localStorage.getItem("othello-losses")) || 0,
      draws: Number(localStorage.getItem("othello-draws")) || 0
    };
  } catch {
    return { wins: 0, losses: 0, draws: 0 };
  }
}

function saveRecord() {
  try {
    localStorage.setItem("othello-wins", String(record.wins));
    localStorage.setItem("othello-losses", String(record.losses));
    localStorage.setItem("othello-draws", String(record.draws));
  } catch {
    // Storage may be unavailable. The game still works for this session.
  }
}

function loadNextStarter() {
  try {
    const saved = localStorage.getItem("othello-next-starter");

    if (saved === "black" || saved === "white") {
      return saved === "black" ? BLACK : WHITE;
    }
  } catch {
    // Ignore storage errors.
  }

  // Random initial starting order.
  return Math.random() < 0.5 ? BLACK : WHITE;
}

function saveNextStarter() {
  try {
    localStorage.setItem(
      "othello-next-starter",
      nextStarter === BLACK ? "black" : "white"
    );
  } catch {
    // Ignore storage errors.
  }
}

function t(key, replacements = {}) {
  let text = translations[currentLanguage][key] ?? translations.en[key];

  for (const [name, value] of Object.entries(replacements)) {
    text = text.replace(`{${name}}`, value);
  }

  return text;
}

function applyTranslations() {
  document.documentElement.lang =
    currentLanguage === "zh-Hant" ? "zh-Hant" : currentLanguage;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    element.textContent = t(key);
  });

  elements.humanLabel.textContent = t("you");
  elements.languageSelect.value = currentLanguage;
  updateStatus();
}

function createInitialBoard() {
  const newBoard = Array.from(
    { length: BOARD_SIZE },
    () => Array(BOARD_SIZE).fill(EMPTY)
  );

  newBoard[3][3] = WHITE;
  newBoard[3][4] = BLACK;
  newBoard[4][3] = BLACK;
  newBoard[4][4] = WHITE;

  return newBoard;
}

function cloneBoard(sourceBoard) {
  return sourceBoard.map((row) => [...row]);
}

function isInside(row, col) {
  return (
    row >= 0 &&
    row < BOARD_SIZE &&
    col >= 0 &&
    col < BOARD_SIZE
  );
}

function getFlips(sourceBoard, row, col, color) {
  if (!isInside(row, col) || sourceBoard[row][col] !== EMPTY) {
    return [];
  }

  const opponent = -color;
  const flips = [];

  for (const [rowDirection, colDirection] of DIRECTIONS) {
    const line = [];
    let nextRow = row + rowDirection;
    let nextCol = col + colDirection;

    while (
      isInside(nextRow, nextCol) &&
      sourceBoard[nextRow][nextCol] === opponent
    ) {
      line.push([nextRow, nextCol]);
      nextRow += rowDirection;
      nextCol += colDirection;
    }

    if (
      line.length > 0 &&
      isInside(nextRow, nextCol) &&
      sourceBoard[nextRow][nextCol] === color
    ) {
      flips.push(...line);
    }
  }

  return flips;
}

function getLegalMoves(sourceBoard, color) {
  const moves = [];

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const flips = getFlips(sourceBoard, row, col, color);

      if (flips.length > 0) {
        moves.push({ row, col, flips });
      }
    }
  }

  return moves;
}

function makeMove(sourceBoard, move, color) {
  const nextBoard = cloneBoard(sourceBoard);
  nextBoard[move.row][move.col] = color;

  for (const [row, col] of move.flips) {
    nextBoard[row][col] = color;
  }

  return nextBoard;
}

function countPieces(sourceBoard) {
  let black = 0;
  let white = 0;

  for (const row of sourceBoard) {
    for (const cell of row) {
      if (cell === BLACK) {
        black += 1;
      } else if (cell === WHITE) {
        white += 1;
      }
    }
  }

  return { black, white };
}

function renderBoard() {
  elements.board.innerHTML = "";

  const humanLegalMove =
    !gameOver && !aiThinking && currentPlayer === humanColor
      ? legalMoves
      : [];

  const legalMoveKeys = new Set(
    humanLegalMove.map((move) => `${move.row}-${move.col}`)
  );

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const cell = document.createElement("button");
      const value = board[row][col];
      const key = `${row}-${col}`;

      cell.className = "cell";
      cell.type = "button";
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      cell.setAttribute("role", "gridcell");
      cell.setAttribute(
        "aria-label",
        `${String.fromCharCode(65 + col)}${row + 1}`
      );

      if (legalMoveKeys.has(key)) {
        cell.classList.add("legal");
      }

      if (
        highlightedHint &&
        highlightedHint.row === row &&
        highlightedHint.col === col
      ) {
        cell.classList.add("hint");
      }

      if (value !== EMPTY) {
        const disk = document.createElement("span");
        disk.className = `disk ${value === BLACK ? "black" : "white"}`;
        disk.setAttribute("aria-hidden", "true");
        cell.appendChild(disk);
      }

      cell.addEventListener("click", handleCellClick);
      elements.board.appendChild(cell);
    }
  }

  updateScores();
}

function updateScores() {
  const counts = countPieces(board);
  const humanCount = humanColor === BLACK ? counts.black : counts.white;
  const aiCount = aiColor === BLACK ? counts.black : counts.white;

  elements.humanScore.textContent = String(humanCount);
  elements.aiScore.textContent = String(aiCount);
  elements.wins.textContent = String(record.wins);
  elements.losses.textContent = String(record.losses);
  elements.draws.textContent = String(record.draws);
}

function updateStatus(message = null) {
  if (message !== null) {
    elements.statusText.textContent = message;
    return;
  }

  if (gameOver) {
    return;
  }

  if (aiThinking) {
    elements.statusText.textContent = t("computerTurn");
    return;
  }

  if (currentPlayer === humanColor) {
    elements.statusText.textContent = t("yourTurn");
  } else {
    elements.statusText.textContent = t("computerTurn");
  }
}

function positionName(row, col) {
  const column = String.fromCharCode(65 + col);
  const rowNumber = row + 1;

  return t("movePosition", {
    column,
    row: rowNumber
  });
}

function beginNewGame() {
  // The human keeps the same colour; only the starting side changes.
  humanColor = BLACK;
  aiColor = WHITE;

  currentPlayer = nextStarter;
  nextStarter = -nextStarter;
  saveNextStarter();

  board = createInitialBoard();
  legalMoves = getLegalMoves(board, currentPlayer);
  highlightedHint = null;
  gameOver = false;
  aiThinking = false;
  elements.hintMessage.textContent = "";

  renderBoard();

  updateStatus(
    currentPlayer === humanColor ? t("youStart") : t("computerStarts")
  );

  if (currentPlayer === aiColor) {
    window.setTimeout(makeComputerTurn, 350);
  }
}

function handleCellClick(event) {
  if (gameOver || aiThinking || currentPlayer !== humanColor) {
    return;
  }

  const row = Number(event.currentTarget.dataset.row);
  const col = Number(event.currentTarget.dataset.col);
  const move = legalMoves.find(
    (candidate) => candidate.row === row && candidate.col === col
  );

  if (!move) {
    return;
  }

  highlightedHint = null;
  elements.hintMessage.textContent = "";
  board = makeMove(board, move, humanColor);
  currentPlayer = aiColor;

  continueGame();
}

function continueGame() {
  legalMoves = getLegalMoves(board, currentPlayer);
  renderBoard();

  if (legalMoves.length > 0) {
    if (currentPlayer === aiColor) {
      aiThinking = true;
      updateStatus();

      window.setTimeout(makeComputerTurn, 300);
    } else {
      aiThinking = false;
      updateStatus();
    }

    return;
  }

  const opponent = -currentPlayer;
  const opponentMoves = getLegalMoves(board, opponent);

  if (opponentMoves.length === 0) {
    finishGame();
    return;
  }

  if (currentPlayer === humanColor) {
    // Human has no move, so the computer continues.
    updateStatus(t("youPassed"));
    currentPlayer = aiColor;
    aiThinking = true;

    window.setTimeout(makeComputerTurn, 700);
  } else {
    // Computer has no move, so the human continues.
    aiThinking = false;
    currentPlayer = humanColor;
    legalMoves = opponentMoves;
    renderBoard();
    updateStatus(t("computerPassed"));
  }
}

function makeComputerTurn() {
  if (gameOver || currentPlayer !== aiColor) {
    return;
  }

  const moves = getLegalMoves(board, aiColor);

  if (moves.length === 0) {
    aiThinking = false;
    continueGame();
    return;
  }

  const depth = chooseSearchDepth(board);
  const bestMove = findBestMove(board, aiColor, depth);

  if (!bestMove) {
    aiThinking = false;
    continueGame();
    return;
  }

  board = makeMove(board, bestMove, aiColor);
  currentPlayer = humanColor;
  aiThinking = false;
  highlightedHint = null;
  elements.hintMessage.textContent = "";

  continueGame();
}

function finishGame() {
  gameOver = true;
  aiThinking = false;
  legalMoves = [];
  highlightedHint = null;

  const counts = countPieces(board);
  const humanCount = humanColor === BLACK ? counts.black : counts.white;
  const aiCount = aiColor === BLACK ? counts.black : counts.white;

  if (humanCount > aiCount) {
    record.wins += 1;
  } else if (humanCount < aiCount) {
    record.losses += 1;
  } else {
    record.draws += 1;
  }

  saveRecord();
  renderBoard();

  if (humanCount > aiCount) {
    updateStatus(`${t("gameOver")} ${t("youWin")}`);
  } else if (humanCount < aiCount) {
    updateStatus(`${t("gameOver")} ${t("youLose")}`);
  } else {
    updateStatus(`${t("gameOver")} ${t("draw")}`);
  }
}

function chooseSearchDepth(sourceBoard) {
  const counts = countPieces(sourceBoard);
  const occupied = counts.black + counts.white;
  const empty = BOARD_SIZE * BOARD_SIZE - occupied;

  if (empty <= 10) {
    return 8;
  }

  if (empty <= 18) {
    return 6;
  }

  if (empty <= 32) {
    return 5;
  }

  return 4;
}

function findBestMove(sourceBoard, color, depth) {
  const moves = getLegalMoves(sourceBoard, color);

  if (moves.length === 0) {
    return null;
  }

  let bestScore = -Infinity;
  let bestMoves = [];

  // Searching stronger-looking moves first improves alpha-beta pruning.
  const orderedMoves = orderMoves(sourceBoard, moves, color);

  for (const move of orderedMoves) {
    const nextBoard = makeMove(sourceBoard, move, color);
    const score = -negamax(
      nextBoard,
      -color,
      depth - 1,
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

  // Small randomization prevents repetitive identical games when scores tie.
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

function negamax(
  sourceBoard,
  playerToMove,
  depth,
  alpha,
  beta,
  rootColor,
  passed
) {
  const moves = getLegalMoves(sourceBoard, playerToMove);
  const opponent = -playerToMove;

  if (depth <= 0) {
    return evaluateBoard(sourceBoard, rootColor);
  }

  if (moves.length === 0) {
    const opponentMoves = getLegalMoves(sourceBoard, opponent);

    if (opponentMoves.length === 0) {
      return terminalScore(sourceBoard, rootColor);
    }

    if (passed) {
      return evaluateBoard(sourceBoard, rootColor);
    }

    // A pass does not change the board, but the side to move changes.
    return -negamax(
      sourceBoard,
      opponent,
      depth - 1,
      -beta,
      -alpha,
      rootColor,
      true
    );
  }

  let best = -Infinity;
  const orderedMoves = orderMoves(sourceBoard, moves, playerToMove);

  for (const move of orderedMoves) {
    const nextBoard = makeMove(sourceBoard, move, playerToMove);
    const score = -negamax(
      nextBoard,
      opponent,
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

function orderMoves(sourceBoard, moves, color) {
  return [...moves].sort((first, second) => {
    const firstScore = quickMoveScore(sourceBoard, first, color);
    const secondScore = quickMoveScore(sourceBoard, second, color);
    return secondScore - firstScore;
  });
}

function quickMoveScore(sourceBoard, move, color) {
  const nextBoard = makeMove(sourceBoard, move, color);
  const opponentMobility = getLegalMoves(nextBoard, -color).length;
  const isCorner =
    (move.row === 0 || move.row === 7) &&
    (move.col === 0 || move.col === 7);

  return (
    POSITION_WEIGHTS[move.row][move.col] +
    move.flips.length * 2 -
    opponentMobility * 4 +
    (isCorner ? 1000 : 0)
  );
}

function evaluateBoard(sourceBoard, perspective) {
  const counts = countPieces(sourceBoard);
  const ownCount = perspective === BLACK ? counts.black : counts.white;
  const opponentCount = perspective === BLACK ? counts.white : counts.black;

  const ownMoves = getLegalMoves(sourceBoard, perspective).length;
  const opponentMoves = getLegalMoves(sourceBoard, -perspective).length;

  let positionScore = 0;
  let corners = 0;
  let frontierOwn = 0;
  let frontierOpponent = 0;

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const cell = sourceBoard[row][col];

      if (cell === perspective) {
        positionScore += POSITION_WEIGHTS[row][col];

        if (isFrontier(sourceBoard, row, col)) {
          frontierOwn += 1;
        }
      } else if (cell === -perspective) {
        positionScore -= POSITION_WEIGHTS[row][col];

        if (isFrontier(sourceBoard, row, col)) {
          frontierOpponent += 1;
        }
      }
    }
  }

  const cornerCoordinates = [
    [0, 0],
    [0, 7],
    [7, 0],
    [7, 7]
  ];

  for (const [row, col] of cornerCoordinates) {
    if (sourceBoard[row][col] === perspective) {
      corners += 1;
    } else if (sourceBoard[row][col] === -perspective) {
      corners -= 1;
    }
  }

  const pieceDifference = ownCount - opponentCount;
  const mobilityDifference = ownMoves - opponentMoves;
  const frontierDifference = frontierOpponent - frontierOwn;

  /*
    Mobility and corners matter more than raw piece count early in the game.
    Piece count becomes increasingly useful near the end.
  */
  const occupied = ownCount + opponentCount;
  const endgameWeight = occupied > 44 ? 4 : 1;

  return (
    positionScore * 1.0 +
    mobilityDifference * 12 +
    corners * 180 +
    frontierDifference * 4 +
    pieceDifference * endgameWeight * 2
  );
}

function terminalScore(sourceBoard, perspective) {
  const counts = countPieces(sourceBoard);
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

function isFrontier(sourceBoard, row, col) {
  for (const [rowDirection, colDirection] of DIRECTIONS) {
    const nextRow = row + rowDirection;
    const nextCol = col + colDirection;

    if (
      isInside(nextRow, nextCol) &&
      sourceBoard[nextRow][nextCol] === EMPTY
    ) {
      return true;
    }
  }

  return false;
}

function showHint() {
  if (gameOver) {
    return;
  }

  if (currentPlayer !== humanColor || aiThinking) {
    elements.hintMessage.textContent = t("noHint");
    return;
  }

  const moves = getLegalMoves(board, humanColor);

  if (moves.length === 0) {
    elements.hintMessage.textContent = t("noHint");
    return;
  }

  elements.hintMessage.textContent = t("thinkingHint");
  elements.hintButton.disabled = true;

  // Yield to the browser so the message can render before the search begins.
  window.setTimeout(() => {
    const bestMove = findBestMove(
      board,
      humanColor,
      chooseSearchDepth(board)
    );

    elements.hintButton.disabled = false;

    if (!bestMove) {
      elements.hintMessage.textContent = t("noHint");
      return;
    }

    highlightedHint = {
      row: bestMove.row,
      col: bestMove.col
    };

    elements.hintMessage.textContent = t("hintMessage", {
      position: positionName(bestMove.row, bestMove.col)
    });

    renderBoard();
  }, 20);
}

elements.newGameButton.addEventListener("click", beginNewGame);
elements.hintButton.addEventListener("click", showHint);

elements.languageSelect.addEventListener("change", (event) => {
  currentLanguage = event.target.value;
  applyTranslations();

  if (highlightedHint) {
    elements.hintMessage.textContent = t("hintMessage", {
      position: positionName(highlightedHint.row, highlightedHint.col)
    });
  }
});

applyTranslations();
beginNewGame();