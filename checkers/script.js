"use strict";

const SUPPORTED_LANGUAGES = new Set(["en", "es", "zh"]);

const translations = {
en: {
  documentTitle: "Chinese Checkers",
  title: "Chinese Checkers",
  description: "",
  boardAriaLabel: "Chinese Checkers board",
  boardPanelAriaLabel: "Chinese Checkers board",
  boardSummaryAriaLabel: "Board summary",
  statusAriaLabel: "Game status",
  languageSelectorAriaLabel: "Language selection",
  boardHolesLabel: "Board holes:",
  centralHexagonLabel: "Central hexagon:",
  outerTriangleLabel: "Each outer triangle:",
  rulesTitle: "Variant rules",
  ruleObjectiveTitle: "Objective",
  ruleObjectiveText: "Move all ten of your marbles from your home triangle into the triangle directly opposite it.",
  ruleStepTitle: "Step move",
  ruleStepText: "Move one marble to an adjacent empty hole. A step ends your turn.",
  ruleExtendedJumpTitle: "Extended jump",
  ruleExtendedJumpText: "Jump exactly one marble at any straight-line distance: x --- o --- x. Both clear segments must be equal in length.",
  ruleMultipleJumpTitle: "Multiple jumps",
  ruleMultipleJumpText: "After a jump, click the white jumping marble to finish the sequence, or choose another highlighted jump destination. A marble cannot land on the same hole twice in one jump sequence.",
  ruleTerritoryTitle: "Territory restriction",
  ruleTerritoryText: "A marble may pass through another player's territory but may not finish a move there, whether or not that triangle contains marbles.",
  ruleNoCaptureTitle: "No captures",
  ruleNoCaptureText: "Jumped marbles remain on the board. They are never removed.",
  languageLabel: "Language:",
  opponentCountLabel: "Computer opponents",
  oneOpponentOption: "1 computer",
  twoOpponentsOption: "2 computers",
  resetMoveButton: "Reset move",
  restartButton: "Restart game",
  loading: "Loading game…",
  selectOwnMarble: "Select one of your marbles.",
  selectOwnMarbleWithMoves: "Select one of your marbles with a legal move.",
  selectedPiece: "Selected marble at ({x}, {y}). Choose a highlighted destination.",
  jumpContinue: "Jump sequence active. Click the white marble to finish, or choose a highlighted jump destination.",
  resetMoveHint: "Reset move returns the jumping marble to its position before this jump sequence.",
  playerTurn: "{player}'s turn.",
  playerWon: "{player} wins!",
  computerThinking: "{player} is thinking…",
  computerTurn: "{player}'s turn.",
  coordinateReadout: "Coordinate ({x}, {y}) — {region}.",
  homeRegion: "Bottom / Player's home",
  bottomLeftRegion: "Bottom-left",
  topLeftRegion: "Top-left",
  topRegion: "Top",
  topRightRegion: "Top-right",
  bottomRightRegion: "Bottom-right",
  centralHexagon: "Central hexagon",
  humanPlayer: "Player",
  computerOne: "Computer 1",
  computerTwo: "Computer 2",
  winsLabel: "Wins",
  lossesLabel: "Losses"
},
es: {
  documentTitle: "Damas chinas",
  title: "Damas chinas",
  description: "",
  boardAriaLabel: "Tablero de damas chinas",
  boardPanelAriaLabel: "Tablero de damas chinas",
  boardSummaryAriaLabel: "Resumen del tablero",
  statusAriaLabel: "Estado de la partida",
  languageSelectorAriaLabel: "Selección de idioma",
  boardHolesLabel: "Casillas del tablero:",
  centralHexagonLabel: "Hexágono central:",
  outerTriangleLabel: "Cada triángulo exterior:",
  rulesTitle: "Reglas de la variante",
  ruleObjectiveTitle: "Objetivo",
  ruleObjectiveText: "Lleva tus diez fichas desde tu triángulo inicial hasta el triángulo situado directamente enfrente.",
  ruleStepTitle: "Movimiento simple",
  ruleStepText: "Mueve una ficha a una casilla adyacente vacía. Un movimiento simple termina tu turno.",
  ruleExtendedJumpTitle: "Salto extendido",
  ruleExtendedJumpText: "Puedes saltar exactamente una ficha a cualquier distancia en línea recta: x --- o --- x. Los dos tramos despejados deben tener la misma longitud.",
  ruleMultipleJumpTitle: "Saltos múltiples",
  ruleMultipleJumpText: "Después de un salto, pulsa la ficha blanca para terminar la secuencia o elige otro destino de salto resaltado. Una ficha no puede aterrizar dos veces en la misma casilla durante una secuencia.",
  ruleTerritoryTitle: "Restricción de territorio",
  ruleTerritoryText: "Una ficha puede atravesar el territorio de otro jugador, pero no puede terminar un movimiento allí, aunque ese triángulo no contenga fichas.",
  ruleNoCaptureTitle: "Sin capturas",
  ruleNoCaptureText: "Las fichas saltadas permanecen en el tablero. Nunca se retiran.",
  languageLabel: "Idioma:",
  opponentCountLabel: "Oponentes controlados por ordenador",
  oneOpponentOption: "1 ordenador",
  twoOpponentsOption: "2 ordenadores",
  resetMoveButton: "Restablecer movimiento",
  restartButton: "Reiniciar partida",
  loading: "Cargando partida…",
  selectOwnMarble: "Selecciona una de tus fichas.",
  selectOwnMarbleWithMoves: "Selecciona una de tus fichas con un movimiento legal.",
  selectedPiece: "Ficha seleccionada en ({x}, {y}). Elige un destino resaltado.",
  jumpContinue: "Secuencia de saltos activa. Pulsa la ficha blanca para terminar o elige un destino resaltado.",
  resetMoveHint: "Restablecer movimiento devuelve la ficha a su posición anterior a esta secuencia de saltos.",
  playerTurn: "Turno de {player}.",
  playerWon: "¡{player} gana!",
  computerThinking: "{player} está pensando…",
  computerTurn: "Turno de {player}.",
  coordinateReadout: "Coordenada ({x}, {y}) — {region}.",
  homeRegion: "Abajo / inicio del Jugador",
  bottomLeftRegion: "Abajo a la izquierda",
  topLeftRegion: "Arriba a la izquierda",
  topRegion: "Arriba",
  topRightRegion: "Arriba a la derecha",
  bottomRightRegion: "Abajo a la derecha",
  centralHexagon: "Hexágono central",
  humanPlayer: "Jugador",
  computerOne: "Ordenador 1",
  computerTwo: "Ordenador 2",
  winsLabel: "Victorias",
  lossesLabel: "Derrotas"
},
zh: {
  documentTitle: "波子棋棋盤",
  title: "波子棋",
  description: "",
  boardAriaLabel: "波子棋棋盤",
  boardPanelAriaLabel: "波子棋棋盤",
  boardSummaryAriaLabel: "棋盤摘要",
  statusAriaLabel: "遊戲狀態",
  languageSelectorAriaLabel: "語言選擇",
  boardHolesLabel: "棋盤孔位：",
  centralHexagonLabel: "中央六角形：",
  outerTriangleLabel: "每個外側三角形：",
  rulesTitle: "變體規則",
  ruleObjectiveTitle: "目標",
  ruleObjectiveText: "把你的全部十枚波子由起始三角形移到正對面的目標三角形。",
  ruleStepTitle: "單步移動",
  ruleStepText: "把一枚波子移到相鄰的空孔位。單步移動會結束回合。",
  ruleExtendedJumpTitle: "延伸跳躍",
  ruleExtendedJumpText: "你可以沿直線跨越剛好一枚波子，距離不限：x --- o --- x。被跨越波子兩邊的空位距離必須相等。",
  ruleMultipleJumpTitle: "連續跳躍",
  ruleMultipleJumpText: "跳躍後，按白色波子即可結束序列，或選擇另一個已標示的跳躍目的地。同一跳躍序列中，波子不可兩次落在同一孔位。",
  ruleTerritoryTitle: "領地限制",
  ruleTerritoryText: "波子可以穿越其他玩家的領地，但不可在該處結束移動，不論該三角形內是否有波子。",
  ruleNoCaptureTitle: "不吃子",
  ruleNoCaptureText: "被跳過的波子會留在棋盤上，永不移除。",
  languageLabel: "語言：",
  opponentCountLabel: "電腦對手數量",
  oneOpponentOption: "1名電腦玩家",
  twoOpponentsOption: "2名電腦玩家",
  resetMoveButton: "重設移動",
  restartButton: "重新開始",
  loading: "正在載入遊戲…",
  selectOwnMarble: "請選擇一枚你的波子。",
  selectOwnMarbleWithMoves: "請選擇一枚可以合法移動的波子。",
  selectedPiece: "已選擇位於 ({x}, {y}) 的波子。請選擇已標示的目的地。",
  jumpContinue: "連續跳躍進行中。按白色波子即可結束，或選擇已標示的跳躍目的地。",
  resetMoveHint: "重設移動會把正在跳躍的波子還原到本次跳躍序列開始前的位置。",
  playerTurn: "輪到 {player}。",
  playerWon: "{player} 勝出！",
  computerThinking: "{player} 正在思考…",
  computerTurn: "輪到 {player}。",
  coordinateReadout: "座標 ({x}, {y}) — {region}。",
  homeRegion: "下方／玩家起點",
  bottomLeftRegion: "左下",
  topLeftRegion: "左上",
  topRegion: "上方",
  topRightRegion: "右上",
  bottomRightRegion: "右下",
  centralHexagon: "中央六角形",
  humanPlayer: "玩家",
  computerOne: "電腦甲",
  computerTwo: "電腦乙",
  winsLabel: "勝",
  lossesLabel: "負"
}
};

function getLanguageFromQuery() {
  const requestedLanguage = new URLSearchParams(window.location.search).get("lang");
  return SUPPORTED_LANGUAGES.has(requestedLanguage) ? requestedLanguage : "en";
}

let currentLanguage = getLanguageFromQuery();
let text = translations[currentLanguage];

function translate(key, replacements = {}) {
  let value = text[key] ?? translations.en[key] ?? key;

  Object.entries(replacements).forEach(([name, replacement]) => {
    value = value.replaceAll(`{${name}}`, String(replacement));
  });

  return value;
}

const boardSvg = document.getElementById("board");
const turnStatus = document.getElementById("turnStatus");
const readout = document.getElementById("readout");
const resetMoveButton = document.getElementById("resetMoveButton");
const restartButton = document.getElementById("restartButton");
const opponentCountSelect = document.getElementById("opponentCount");
const totalHolesElement = document.getElementById("totalHoles");
const centralHolesElement = document.getElementById("centralHoles");
const armHolesElement = document.getElementById("armHoles");

const requiredElements = [
  ["#board", boardSvg],
  ["#turnStatus", turnStatus],
  ["#readout", readout],
  ["#resetMoveButton", resetMoveButton],
  ["#restartButton", restartButton],
  ["#opponentCount", opponentCountSelect],
  ["#totalHoles", totalHolesElement],
  ["#centralHoles", centralHolesElement],
  ["#armHoles", armHolesElement]
];

requiredElements.forEach(([selector, element]) => {
  if (!element) {
    throw new Error(`Missing required HTML element: ${selector}`);
  }
});

function applyLocalizedStaticText() {
  document.documentElement.lang = currentLanguage === "zh" ? "zh-Hant" : currentLanguage;
  document.title = translate("documentTitle");

  document.querySelectorAll("[data-i18n]").forEach(element => {
    element.textContent = translate(element.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach(element => {
    element.setAttribute("aria-label", translate(element.dataset.i18nAriaLabel));
  });

  boardSvg.setAttribute("aria-label", translate("boardAriaLabel"));
  resetMoveButton.textContent = translate("resetMoveButton");
  resetMoveButton.title = translate("resetMoveHint");
  restartButton.textContent = translate("restartButton");

  document.querySelectorAll(".language-button").forEach(button => {
    const isSelected = button.dataset.language === currentLanguage;
    button.setAttribute("aria-pressed", String(isSelected));
    button.disabled = isSelected;
  });
}

function replaceLanguageInUrl(language) {
  const url = new URL(window.location.href);

  if (language === "en") {
    url.searchParams.delete("lang");
  } else {
    url.searchParams.set("lang", language);
  }

  window.history.replaceState(
    { language },
    "",
    `${url.pathname}${url.search}${url.hash}`
  );
}

function setLanguage(language, options = {}) {
  const { updateUrl = true } = options;
  currentLanguage = SUPPORTED_LANGUAGES.has(language) ? language : "en";
  text = translations[currentLanguage];

  if (updateUrl) {
    replaceLanguageInUrl(currentLanguage);
  }

  applyLocalizedStaticText();
  updateBoardSummary();
  renderBoard();
  updateInterface();
}

function installLanguageControls() {
  document.querySelectorAll(".language-button").forEach(button => {
    button.addEventListener("click", () => {
      setLanguage(button.dataset.language);
    });
  });

  window.addEventListener("popstate", () => {
    setLanguage(getLanguageFromQuery(), { updateUrl: false });
  });
}

const PERSISTENT_RESULTS_STORAGE_KEY = "boziqiPersistentResults";

function normaliseNonNegativeInteger(value) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function readPersistentResults() {
  try {
    const storedResults = window.localStorage.getItem(PERSISTENT_RESULTS_STORAGE_KEY);

    if (!storedResults) {
      return { wins: 0, losses: 0 };
    }

    const parsedResults = JSON.parse(storedResults);

    return {
      wins: normaliseNonNegativeInteger(parsedResults.wins),
      losses: normaliseNonNegativeInteger(parsedResults.losses)
    };
  } catch {
    return { wins: 0, losses: 0 };
  }
}

function writePersistentResults(results) {
  const safeResults = {
    wins: normaliseNonNegativeInteger(results.wins),
    losses: normaliseNonNegativeInteger(results.losses)
  };

  try {
    window.localStorage.setItem(
      PERSISTENT_RESULTS_STORAGE_KEY,
      JSON.stringify(safeResults)
    );
  } catch {
    // Ignore unavailable storage.
  }

  return safeResults;
}

let persistentResults = readPersistentResults();

function recordHumanWin() {
  persistentResults.wins += 1;
  persistentResults = writePersistentResults(persistentResults);
}

function recordHumanLoss() {
  persistentResults.losses += 1;
  persistentResults = writePersistentResults(persistentResults);
}

function getPersistentResults() {
  return { ...persistentResults };
}

function resetPersistentResults() {
  persistentResults = writePersistentResults({ wins: 0, losses: 0 });
  return getPersistentResults();
}

window.getPersistentResults = getPersistentResults;
window.resetPersistentResults = resetPersistentResults;

const HEX_CORNERS = [[4, 0], [8, 0], [8, 4], [4, 8], [0, 8], [0, 4]];

const TRIANGLE_ARMS = [
  { region: "arm-0", nameKey: "homeRegion", tip: [0, 0], baseA: [4, 0], baseB: [0, 4] },
  { region: "arm-1", nameKey: "bottomLeftRegion", tip: [8, -4], baseA: [8, 0], baseB: [4, 0] },
  { region: "arm-2", nameKey: "topLeftRegion", tip: [12, 0], baseA: [8, 4], baseB: [8, 0] },
  { region: "arm-3", nameKey: "topRegion", tip: [8, 8], baseA: [4, 8], baseB: [8, 4] },
  { region: "arm-4", nameKey: "topRightRegion", tip: [0, 12], baseA: [0, 8], baseB: [4, 8] },
  { region: "arm-5", nameKey: "bottomRightRegion", tip: [-4, 8], baseA: [0, 4], baseB: [0, 8] }
];

const HORIZONTAL_STEP = 18;
const VERTICAL_STEP = 31.176;
const BOARD_BOTTOM_Y = 245;
const HOLE_RADIUS = 10.5;
const PIECE_RADIUS = 8.4;
const MAX_JUMP_DISTANCE = 12;

const boardCells = new Map();

function coordinateKey(x, y) {
  return `${x},${y}`;
}

function coordinateToScreen(x, y) {
  return {
    screenX: (y - x) * HORIZONTAL_STEP,
    screenY: BOARD_BOTTOM_Y - (x + y) * VERTICAL_STEP
  };
}

function addCell(x, y, region, armNameKey = null) {
  const key = coordinateKey(x, y);

  if (boardCells.has(key)) {
    throw new Error(`Duplicate board coordinate: ${key}.`);
  }

  boardCells.set(key, { x, y, region, armNameKey });
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
        arm.nameKey
      );
    }
  }
}

function buildBoard() {
  boardCells.clear();
  addCentralHexagon();
  TRIANGLE_ARMS.forEach(addTriangleArm);
}

function countCellsInRegion(region) {
  return [...boardCells.values()].filter(cell => cell.region === region).length;
}

function validateBoard() {
  if (boardCells.size !== 121) {
    throw new Error(`Expected 121 board holes, found ${boardCells.size}.`);
  }

  if (countCellsInRegion("center") !== 61) {
    throw new Error("The central hexagon must contain 61 holes.");
  }

  TRIANGLE_ARMS.forEach(arm => {
    if (countCellsInRegion(arm.region) !== 10) {
      throw new Error(`${arm.region} must contain 10 holes.`);
    }
  });
}

const HUMAN_PLAYER_ID = "player-1";

const GAME_CONFIGURATIONS = {
  1: [
    {
      id: HUMAN_PLAYER_ID,
      type: "human",
      nameKey: "humanPlayer",
      homeRegion: "arm-0",
      targetRegion: "arm-3"
    },
    {
      id: "computer-1",
      type: "computer",
      nameKey: "computerOne",
      homeRegion: "arm-3",
      targetRegion: "arm-0"
    }
  ],
  2: [
    {
      id: HUMAN_PLAYER_ID,
      type: "human",
      nameKey: "humanPlayer",
      homeRegion: "arm-0",
      targetRegion: "arm-3"
    },
    {
      id: "computer-1",
      type: "computer",
      nameKey: "computerOne",
      homeRegion: "arm-2",
      targetRegion: "arm-5"
    },
    {
      id: "computer-2",
      type: "computer",
      nameKey: "computerTwo",
      homeRegion: "arm-4",
      targetRegion: "arm-1"
    }
  ]
};

const ADJACENT_DIRECTIONS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, -1],
  [-1, 1]
];

const gameState = {
  activePlayerIndex: 0,
  selectedPieceId: null,
  jumpChainActive: false,
  jumpAwaitingConfirmation: false,
  jumpChainVisited: new Set(),
  jumpChainStart: null,
  gameOver: false,
  computerThinking: false,
  turnToken: 0,
  pieces: new Map()
};

let opponentCount = 1;
let activePlayers = GAME_CONFIGURATIONS[opponentCount];

function getActivePlayer() {
  return activePlayers[gameState.activePlayerIndex];
}

function getPlayerById(playerId) {
  return activePlayers.find(player => player.id === playerId) ?? null;
}

function isHumanPlayer(player) {
  return player?.type === "human";
}

function isComputerPlayer(player) {
  return player?.type === "computer";
}

function getPlayerName(player) {
  return translate(player.nameKey);
}

function getCell(x, y) {
  return boardCells.get(coordinateKey(x, y)) ?? null;
}

function isBoardCoordinate(x, y) {
  return boardCells.has(coordinateKey(x, y));
}

function getPieceAt(x, y) {
  return gameState.pieces.get(coordinateKey(x, y)) ?? null;
}

function isEmptyHole(x, y) {
  return isBoardCoordinate(x, y) && getPieceAt(x, y) === null;
}

function createPiece(playerId, x, y) {
  const piece = {
    id: `${playerId}:${x},${y}`,
    playerId,
    x,
    y
  };

  gameState.pieces.set(coordinateKey(x, y), piece);
}

function placeStartingPieces() {
  gameState.pieces.clear();

  activePlayers.forEach(player => {
    boardCells.forEach(cell => {
      if (cell.region === player.homeRegion) {
        createPiece(player.id, cell.x, cell.y);
      }
    });
  });
}

function findPieceById(pieceId) {
  for (const piece of gameState.pieces.values()) {
    if (piece.id === pieceId) {
      return piece;
    }
  }

  return null;
}

function movePiece(piece, destinationX, destinationY) {
  gameState.pieces.delete(coordinateKey(piece.x, piece.y));
  piece.x = destinationX;
  piece.y = destinationY;
  gameState.pieces.set(coordinateKey(piece.x, piece.y), piece);
}

function canPlayerEndMoveAt(player, x, y) {
  const cell = getCell(x, y);

  if (!cell) {
    return false;
  }

  return cell.region === "center" ||
    cell.region === player.homeRegion ||
    cell.region === player.targetRegion;
}

function getNormalMoves(piece, player) {
  const moves = [];

  ADJACENT_DIRECTIONS.forEach(([dx, dy]) => {
    const destinationX = piece.x + dx;
    const destinationY = piece.y + dy;

    if (
      isEmptyHole(destinationX, destinationY) &&
      canPlayerEndMoveAt(player, destinationX, destinationY)
    ) {
      moves.push({
        type: "step",
        from: [piece.x, piece.y],
        to: [destinationX, destinationY],
        pieceId: piece.id
      });
    }
  });

  return moves;
}

function getExtendedJumpsAtPosition(
  piece,
  player,
  currentX,
  currentY,
  visitedLandings,
  occupiedKeys
) {
  const jumps = [];

  ADJACENT_DIRECTIONS.forEach(([dx, dy]) => {
    for (let distance = 1; distance <= MAX_JUMP_DISTANCE; distance += 1) {
      const jumpedX = currentX + distance * dx;
      const jumpedY = currentY + distance * dy;
      const landingX = currentX + 2 * distance * dx;
      const landingY = currentY + 2 * distance * dy;
      const jumpedKey = coordinateKey(jumpedX, jumpedY);
      const landingKey = coordinateKey(landingX, landingY);

      if (!isBoardCoordinate(landingX, landingY)) {
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

        if (!isBoardCoordinate(pathX, pathY) || occupiedKeys.has(pathKey)) {
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
        pieceId: piece.id
      });
    }
  });

  return jumps;
}

function jumpCanEventuallyFinish(
  piece,
  player,
  currentX,
  currentY,
  visitedLandings,
  occupiedKeys
) {
  if (canPlayerEndMoveAt(player, currentX, currentY)) {
    return true;
  }

  const jumps = getExtendedJumpsAtPosition(
    piece,
    player,
    currentX,
    currentY,
    visitedLandings,
    occupiedKeys
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
        piece,
        player,
        landingX,
        landingY,
        nextVisitedLandings,
        nextOccupiedKeys
      )
    ) {
      return true;
    }
  }

  return false;
}

function getPlayableJumpsAtPosition(
  piece,
  player,
  currentX,
  currentY,
  visitedLandings,
  occupiedKeys
) {
  return getExtendedJumpsAtPosition(
    piece,
    player,
    currentX,
    currentY,
    visitedLandings,
    occupiedKeys
  ).filter(jump => {
    const [landingX, landingY] = jump.to;
    const landingKey = coordinateKey(landingX, landingY);
    const nextVisitedLandings = new Set(visitedLandings);
    nextVisitedLandings.add(landingKey);

    const nextOccupiedKeys = new Set(occupiedKeys);
    nextOccupiedKeys.delete(coordinateKey(currentX, currentY));
    nextOccupiedKeys.add(landingKey);

    return jumpCanEventuallyFinish(
      piece,
      player,
      landingX,
      landingY,
      nextVisitedLandings,
      nextOccupiedKeys
    );
  });
}

function getExtendedJumps(piece, player, options = {}) {
  const {
    visitedLandings = gameState.jumpChainVisited,
    occupiedKeys = new Set(gameState.pieces.keys())
  } = options;

  return getPlayableJumpsAtPosition(
    piece,
    player,
    piece.x,
    piece.y,
    visitedLandings,
    occupiedKeys
  );
}

function getLegalMovesForPiece(piece, player = getActivePlayer()) {
  if (!piece || gameState.gameOver || piece.playerId !== player.id) {
    return [];
  }

  if (gameState.jumpChainActive) {
    if (piece.id !== gameState.selectedPieceId) {
      return [];
    }

    return getExtendedJumps(piece, player);
  }

  const visited = new Set([coordinateKey(piece.x, piece.y)]);
  const occupiedKeys = new Set(gameState.pieces.keys());

  return [
    ...getNormalMoves(piece, player),
    ...getPlayableJumpsAtPosition(
      piece,
      player,
      piece.x,
      piece.y,
      visited,
      occupiedKeys
    )
  ];
}

function getAllLegalMovesForPlayer(player = getActivePlayer()) {
  const moves = [];

  gameState.pieces.forEach(piece => {
    if (piece.playerId === player.id) {
      moves.push(...getLegalMovesForPiece(piece, player));
    }
  });

  return moves;
}

function playerHasWon(player) {
  const playerPieces = [...gameState.pieces.values()].filter(
    piece => piece.playerId === player.id
  );

  return playerPieces.length === 10 && playerPieces.every(piece => {
    return getCell(piece.x, piece.y)?.region === player.targetRegion;
  });
}

function getSelectedPiece() {
  return gameState.selectedPieceId
    ? findPieceById(gameState.selectedPieceId)
    : null;
}

function selectPiece(piece) {
  const activePlayer = getActivePlayer();

  if (
    gameState.gameOver ||
    gameState.computerThinking ||
    !isHumanPlayer(activePlayer) ||
    piece.playerId !== activePlayer.id
  ) {
    return;
  }

if (gameState.jumpChainActive && piece.id === gameState.selectedPieceId) {
  if (canPlayerEndMoveAt(activePlayer, piece.x, piece.y)) {
    gameState.jumpAwaitingConfirmation = true;
    endTurn();
  }
  return;
}

  if (gameState.jumpChainActive) {
    return;
  }

  if (getLegalMovesForPiece(piece).length === 0) {
    updateInterface();
    return;
  }

  gameState.selectedPieceId = piece.id;
  renderBoard();
  updateInterface();
}

function findMatchingLegalMove(piece, destinationX, destinationY) {
  return getLegalMovesForPiece(piece).find(move => {
    return move.to[0] === destinationX && move.to[1] === destinationY;
  });
}

function startHumanJumpChain(piece) {
  gameState.jumpChainActive = true;
  gameState.jumpAwaitingConfirmation = false;
  gameState.jumpChainStart = {
    pieceId: piece.id,
    x: piece.x,
    y: piece.y
  };
  gameState.jumpChainVisited = new Set([coordinateKey(piece.x, piece.y)]);
}

function applyHumanMove(move) {
  const activePlayer = getActivePlayer();

  if (
    gameState.gameOver ||
    gameState.computerThinking ||
    !isHumanPlayer(activePlayer)
  ) {
    return;
  }

  const [startX, startY] = move.from;
  const [destinationX, destinationY] = move.to;
  const piece = getPieceAt(startX, startY);

  if (!piece || piece.playerId !== activePlayer.id) {
    return;
  }

  const legalMove = findMatchingLegalMove(piece, destinationX, destinationY);

  if (!legalMove) {
    return;
  }

  if (legalMove.type === "extended-jump" && !gameState.jumpChainActive) {
    startHumanJumpChain(piece);
  }

  movePiece(piece, destinationX, destinationY);

  if (legalMove.type === "step") {
    endTurn();
    return;
  }

  gameState.selectedPieceId = piece.id;
  gameState.jumpAwaitingConfirmation = false;
  gameState.jumpChainVisited.add(coordinateKey(destinationX, destinationY));

  renderBoard();
  updateInterface();
}

function resetCurrentHumanMove() {
  const activePlayer = getActivePlayer();
  const selectedPiece = getSelectedPiece();
  const jumpStart = gameState.jumpChainStart;

  if (
    gameState.gameOver ||
    gameState.computerThinking ||
    !isHumanPlayer(activePlayer) ||
    !gameState.jumpChainActive ||
    !selectedPiece ||
    !jumpStart ||
    selectedPiece.id !== jumpStart.pieceId
  ) {
    return;
  }

  movePiece(selectedPiece, jumpStart.x, jumpStart.y);
  gameState.selectedPieceId = selectedPiece.id;
  gameState.jumpChainActive = false;
  gameState.jumpAwaitingConfirmation = false;
  gameState.jumpChainVisited.clear();
  gameState.jumpChainStart = null;
  renderBoard();
  updateInterface();
}

const COMPUTER_THINKING_DELAY = 420;
const COMPUTER_JUMP_DELAY = 310;
const COMPUTER_MAX_JUMP_DEPTH = 4;
const COMPUTER_MAX_CHAIN_OPTIONS = 220;

function getTargetDistance(player, x, y) {
  const targetCells = [...boardCells.values()].filter(
    cell => cell.region === player.targetRegion
  );
  let shortestDistance = Infinity;

  targetCells.forEach(targetCell => {
    const distance = Math.max(
      Math.abs(targetCell.x - x),
      Math.abs(targetCell.y - y)
    );
    shortestDistance = Math.min(shortestDistance, distance);
  });

  return shortestDistance;
}

function getHomeDistance(player, x, y) {
  const homeCells = [...boardCells.values()].filter(
    cell => cell.region === player.homeRegion
  );
  let shortestDistance = Infinity;

  homeCells.forEach(homeCell => {
    const distance = Math.max(
      Math.abs(homeCell.x - x),
      Math.abs(homeCell.y - y)
    );
    shortestDistance = Math.min(shortestDistance, distance);
  });

  return shortestDistance;
}

function scoreFinalComputerPosition(
  player,
  startX,
  startY,
  endX,
  endY,
  jumpCount
) {
  const startDistance = getTargetDistance(player, startX, startY);
  const endDistance = getTargetDistance(player, endX, endY);
  const netProgress = startDistance - endDistance;
  const startHomeDistance = getHomeDistance(player, startX, startY);
  const endHomeDistance = getHomeDistance(player, endX, endY);
  const destinationCell = getCell(endX, endY);
  let score = netProgress * 175;

  score += Math.min(jumpCount, 6) * 8;

  if (destinationCell?.region === player.targetRegion) {
    score += 420;
  }

  if (destinationCell?.region === player.homeRegion) {
    score -= 135;
  }

  if (netProgress < 0) {
    score += netProgress * 300;
  }

  score += (endHomeDistance - startHomeDistance) * 20;
  return score;
}

function scoreComputerStep(move, player) {
  const [fromX, fromY] = move.from;
  const [toX, toY] = move.to;
  const progress =
    getTargetDistance(player, fromX, fromY) -
    getTargetDistance(player, toX, toY);
  const destinationCell = getCell(toX, toY);
  let score = progress * 140;

  if (destinationCell?.region === player.targetRegion) {
    score += 330;
  }

  if (destinationCell?.region === player.homeRegion) {
    score -= 100;
  }

  if (progress < 0) {
    score += progress * 270;
  }

  return score;
}

function getOccupiedKeysWithoutPiece(piece) {
  const occupiedKeys = new Set(gameState.pieces.keys());
  occupiedKeys.delete(coordinateKey(piece.x, piece.y));
  return occupiedKeys;
}

function enumerateJumpChains(piece, player) {
  const chains = [];
  const originKey = coordinateKey(piece.x, piece.y);
  const baseOccupiedKeys = getOccupiedKeysWithoutPiece(piece);
  let exploredOptions = 0;

  function explore(currentX, currentY, visitedLandings, occupiedKeys, moves) {
    if (exploredOptions >= COMPUTER_MAX_CHAIN_OPTIONS) {
      return;
    }

    const occupiedAtCurrentPosition = new Set(occupiedKeys);
    occupiedAtCurrentPosition.add(coordinateKey(currentX, currentY));

    const jumps = getPlayableJumpsAtPosition(
      piece,
      player,
      currentX,
      currentY,
      visitedLandings,
      occupiedAtCurrentPosition
    );

    jumps.forEach(jump => {
      if (exploredOptions >= COMPUTER_MAX_CHAIN_OPTIONS) {
        return;
      }

      exploredOptions += 1;
      const [landingX, landingY] = jump.to;
      const landingKey = coordinateKey(landingX, landingY);
      const nextMoves = [...moves, jump];

      chains.push({
        moves: nextMoves,
        from: [piece.x, piece.y],
        to: [landingX, landingY]
      });

      if (nextMoves.length >= COMPUTER_MAX_JUMP_DEPTH) {
        return;
      }

      const nextVisitedLandings = new Set(visitedLandings);
      nextVisitedLandings.add(landingKey);

      const nextOccupiedKeys = new Set(occupiedKeys);
      nextOccupiedKeys.delete(coordinateKey(currentX, currentY));
      nextOccupiedKeys.add(landingKey);

      explore(
        landingX,
        landingY,
        nextVisitedLandings,
        nextOccupiedKeys,
        nextMoves
      );
    });
  }

  explore(
    piece.x,
    piece.y,
    new Set([originKey]),
    baseOccupiedKeys,
    []
  );

  return chains;
}

function chooseComputerTurn(player) {
  const candidates = [];

  gameState.pieces.forEach(piece => {
    if (piece.playerId !== player.id) {
      return;
    }

    getNormalMoves(piece, player).forEach(move => {
      candidates.push({
        type: "step",
        moves: [move],
        score: scoreComputerStep(move, player)
      });
    });

    enumerateJumpChains(piece, player).forEach(chain => {
      const [startX, startY] = chain.from;
      const [endX, endY] = chain.to;

      candidates.push({
        type: "jump-chain",
        moves: chain.moves,
        score: scoreFinalComputerPosition(
          player,
          startX,
          startY,
          endX,
          endY,
          chain.moves.length
        )
      });
    });
  });

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((first, second) => {
    const scoreDifference = second.score - first.score;

    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    return second.moves.length - first.moves.length;
  });

  const bestScore = candidates[0].score;
  const nearBestCandidates = candidates.filter(candidate => {
    return candidate.score >= bestScore - 10;
  });

  return nearBestCandidates[
    Math.floor(Math.random() * nearBestCandidates.length)
  ];
}

function scheduleComputerTurn() {
  const player = getActivePlayer();

  if (
    gameState.gameOver ||
    !isComputerPlayer(player) ||
    gameState.computerThinking
  ) {
    return;
  }

  gameState.computerThinking = true;
  const scheduledTurnToken = gameState.turnToken;
  renderBoard();
  updateInterface();

  window.setTimeout(() => {
    if (
      gameState.gameOver ||
      scheduledTurnToken !== gameState.turnToken ||
      !isComputerPlayer(getActivePlayer())
    ) {
      gameState.computerThinking = false;
      return;
    }

    const computerTurn = chooseComputerTurn(getActivePlayer());

    if (!computerTurn) {
      gameState.computerThinking = false;
      endTurn();
      return;
    }

    playComputerMoveSequence(computerTurn.moves, 0, scheduledTurnToken);
  }, COMPUTER_THINKING_DELAY);
}

function playComputerMoveSequence(moves, moveIndex, scheduledTurnToken) {
  const player = getActivePlayer();

  if (
    gameState.gameOver ||
    scheduledTurnToken !== gameState.turnToken ||
    !isComputerPlayer(player)
  ) {
    gameState.computerThinking = false;
    return;
  }

  const move = moves[moveIndex];
  const [fromX, fromY] = move.from;
  const [toX, toY] = move.to;
  const piece = getPieceAt(fromX, fromY);

  if (!piece || piece.playerId !== player.id) {
    gameState.computerThinking = false;
    endTurn();
    return;
  }

  if (move.type === "extended-jump" && moveIndex === 0) {
    gameState.jumpChainActive = true;
    gameState.jumpAwaitingConfirmation = false;
    gameState.jumpChainStart = {
      pieceId: piece.id,
      x: fromX,
      y: fromY
    };
    gameState.jumpChainVisited = new Set([coordinateKey(fromX, fromY)]);
  }

  movePiece(piece, toX, toY);
  gameState.selectedPieceId = piece.id;

  if (move.type === "extended-jump") {
    gameState.jumpChainVisited.add(coordinateKey(toX, toY));
  }

  renderBoard();
  updateInterface();

  if (moveIndex === moves.length - 1) {
    window.setTimeout(() => {
      if (scheduledTurnToken !== gameState.turnToken) {
        return;
      }

      gameState.computerThinking = false;
      endTurn();
    }, COMPUTER_JUMP_DELAY);

    return;
  }

  window.setTimeout(() => {
    playComputerMoveSequence(moves, moveIndex + 1, scheduledTurnToken);
  }, COMPUTER_JUMP_DELAY);
}

function clearJumpChainState() {
  gameState.selectedPieceId = null;
  gameState.jumpChainActive = false;
  gameState.jumpAwaitingConfirmation = false;
  gameState.jumpChainVisited.clear();
  gameState.jumpChainStart = null;
}

function recordGameResult(winningPlayer) {
  if (winningPlayer.id === HUMAN_PLAYER_ID) {
    recordHumanWin();
  } else {
    recordHumanLoss();
  }
}

function endTurn() {
  const playerWhoMoved = getActivePlayer();
  clearJumpChainState();
  gameState.computerThinking = false;

  if (playerHasWon(playerWhoMoved)) {
    gameState.gameOver = true;
    gameState.turnToken += 1;
    recordGameResult(playerWhoMoved);
    renderBoard();
    updateInterface();
    return;
  }

  gameState.activePlayerIndex =
    (gameState.activePlayerIndex + 1) % activePlayers.length;

  renderBoard();
  updateInterface();
  scheduleComputerTurn();
}

function resetGame() {
  gameState.turnToken += 1;
  gameState.activePlayerIndex = 0;
  gameState.gameOver = false;
  gameState.computerThinking = false;
  clearJumpChainState();
  placeStartingPieces();
  renderBoard();
  updateInterface();
}

function createSvgElement(tagName) {
  return document.createElementNS("http://www.w3.org/2000/svg", tagName);
}

function createPolygon(coordinates, className) {
  const polygon = createSvgElement("polygon");

  polygon.setAttribute(
    "points",
    coordinates.map(([x, y]) => {
      const point = coordinateToScreen(x, y);
      return `${point.screenX},${point.screenY}`;
    }).join(" ")
  );

  polygon.setAttribute("class", className);
  return polygon;
}

function getRegionName(cell) {
  return cell.region === "center"
    ? translate("centralHexagon")
    : translate(cell.armNameKey);
}

function renderGuides() {
  boardSvg.appendChild(
    createPolygon(HEX_CORNERS, "central-hexagon-guide")
  );

  TRIANGLE_ARMS.forEach(arm => {
    boardSvg.appendChild(
      createPolygon(
        [arm.tip, arm.baseA, arm.baseB],
        "outer-arm-guide"
      )
    );
  });
}

function renderHoles() {
  const selectedPiece = getSelectedPiece();
  const legalDestinationKeys = new Set(
    selectedPiece
      ? getLegalMovesForPiece(selectedPiece).map(move =>
          coordinateKey(move.to[0], move.to[1])
        )
      : []
  );

  const cells = [...boardCells.values()].sort((first, second) => {
    const depthDifference = (second.x + second.y) - (first.x + first.y);
    return depthDifference || first.x - second.x;
  });

  cells.forEach(cell => {
    const point = coordinateToScreen(cell.x, cell.y);
    const hole = createSvgElement("circle");
    const isLegalDestination = legalDestinationKeys.has(
      coordinateKey(cell.x, cell.y)
    );

    hole.setAttribute("class", "hole");
    hole.setAttribute("cx", point.screenX);
    hole.setAttribute("cy", point.screenY);
    hole.setAttribute("r", HOLE_RADIUS);
    hole.setAttribute(
      "aria-label",
      translate("coordinateReadout", {
        x: cell.x,
        y: cell.y,
        region: getRegionName(cell)
      })
    );

    if (isLegalDestination && !gameState.computerThinking) {
      hole.classList.add("is-legal");
      hole.setAttribute("role", "button");
      hole.setAttribute("tabindex", "0");

      const moveToHole = () => {
        const currentSelection = getSelectedPiece();

        if (!currentSelection) {
          return;
        }

        const move = findMatchingLegalMove(
          currentSelection,
          cell.x,
          cell.y
        );

        if (move) {
          applyHumanMove(move);
        }
      };

      hole.addEventListener("click", moveToHole);
      hole.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          moveToHole();
        }
      });
    } else {
      hole.setAttribute("role", "gridcell");
      hole.addEventListener("click", () => {
        readout.textContent = translate("coordinateReadout", {
          x: cell.x,
          y: cell.y,
          region: getRegionName(cell)
        });
      });
    }

    boardSvg.appendChild(hole);
  });
}

function renderPiece(piece) {
  const player = getPlayerById(piece.playerId);
  const point = coordinateToScreen(piece.x, piece.y);
  const group = createSvgElement("g");

  group.setAttribute("class", `piece ${player.id}`);
  group.setAttribute(
    "transform",
    `translate(${point.screenX} ${point.screenY})`
  );
  group.setAttribute("role", "button");
  group.setAttribute("tabindex", "0");
  group.setAttribute(
    "aria-label",
    `${getPlayerName(player)}: (${piece.x}, ${piece.y})`
  );

  if (
    piece.playerId === getActivePlayer().id &&
    !gameState.gameOver &&
    !gameState.computerThinking
  ) {
    group.classList.add("is-active");
  }

  if (piece.id === gameState.selectedPieceId) {
    group.classList.add("is-selected");
  }

  const body = createSvgElement("circle");
  body.setAttribute("class", "piece-body");
  body.setAttribute("r", PIECE_RADIUS);

  /*
   * After a jump, the active piece becomes white. Clicking it again is the
   * explicit confirmation that ends the turn.
   */
  if (
    piece.id === gameState.selectedPieceId &&
    gameState.jumpChainActive &&
    gameState.jumpAwaitingConfirmation
  ) {
    body.setAttribute("fill", "#ffffff");
    group.classList.add("is-awaiting-confirmation");
  }

  const highlight = createSvgElement("circle");
  highlight.setAttribute("class", "piece-highlight");
  highlight.setAttribute("cx", -2.5);
  highlight.setAttribute("cy", -2.6);
  highlight.setAttribute("r", 2.5);

  group.append(body, highlight);

  const selectCurrentPiece = event => {
    event?.stopPropagation();
    selectPiece(piece);
  };

  group.addEventListener("click", selectCurrentPiece);
  group.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectCurrentPiece();
    }
  });

  boardSvg.appendChild(group);
}

function renderPieces() {
  const pieces = [...gameState.pieces.values()].sort((first, second) => {
    const depthDifference = (first.x + first.y) - (second.x + second.y);
    return depthDifference || first.x - second.x;
  });

  pieces.forEach(renderPiece);
}

function renderBoard() {
  boardSvg.replaceChildren();
  renderGuides();
  renderHoles();
  renderPieces();
}

function updateBoardSummary() {
  totalHolesElement.textContent = boardCells.size;
  centralHolesElement.textContent = countCellsInRegion("center");
  armHolesElement.textContent = countCellsInRegion("arm-0");
}

function updateInterface() {
  const activePlayer = getActivePlayer();
  const selectedPiece = getSelectedPiece();

  opponentCountSelect.value = String(opponentCount);
  opponentCountSelect.disabled =
    gameState.computerThinking || gameState.jumpChainActive;

  resetMoveButton.disabled = !(
    gameState.jumpChainActive &&
    !gameState.computerThinking &&
    isHumanPlayer(activePlayer) &&
    gameState.jumpChainStart
  );

  if (gameState.gameOver) {
    const winMessage = translate("playerWon", {
      player: getPlayerName(activePlayer)
    });

    turnStatus.textContent = winMessage;
    readout.textContent = winMessage;
    resetMoveButton.disabled = true;
    return;
  }

  if (gameState.computerThinking && isComputerPlayer(activePlayer)) {
    turnStatus.textContent = translate("computerThinking", {
      player: getPlayerName(activePlayer)
    });
    readout.textContent = translate("computerTurn", {
      player: getPlayerName(activePlayer)
    });
    resetMoveButton.disabled = true;
    return;
  }

  turnStatus.textContent = translate("playerTurn", {
    player: getPlayerName(activePlayer)
  });

  if (gameState.jumpChainActive && selectedPiece) {
    readout.textContent = translate("jumpContinue");
    return;
  }

  if (selectedPiece) {
    readout.textContent = translate("selectedPiece", {
      x: selectedPiece.x,
      y: selectedPiece.y
    });

    return;
  }

  readout.textContent = getAllLegalMovesForPlayer().length > 0
    ? translate("selectOwnMarble")
    : translate("selectOwnMarbleWithMoves");
}

resetMoveButton.addEventListener("click", resetCurrentHumanMove);
restartButton.addEventListener("click", resetGame);

opponentCountSelect.addEventListener("change", () => {
  const selectedOpponentCount = Number(opponentCountSelect.value);

  if (!GAME_CONFIGURATIONS[selectedOpponentCount]) {
    opponentCountSelect.value = String(opponentCount);
    return;
  }

  opponentCount = selectedOpponentCount;
  activePlayers = GAME_CONFIGURATIONS[opponentCount];
  resetGame();
});

buildBoard();
validateBoard();
applyLocalizedStaticText();
installLanguageControls();
updateBoardSummary();
resetGame();