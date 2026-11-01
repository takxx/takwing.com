// lang.js
// Translation engine and language selection.

export const SUPPORTED_LANGUAGES = new Set(["en", "es", "zh"]);

export const translations = {
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
    ruleExtendedJumpText: "Jump exactly one marble at any straight-line distance. Both clear segments must be equal in length.",
    ruleMultipleJumpTitle: "Multiple jumps",
    ruleMultipleJumpText: "After a jump, click the white jumping marble to finish the sequence, or choose another highlighted jump destination. A marble cannot land on the same hole twice in one jump sequence.",
    ruleTerritoryTitle: "Territory restriction",
    ruleTerritoryText: "A marble may pass through another player's territory but may not finish a move there, whether or not that triangle contains marbles.",
    ruleNoCaptureTitle: "No captures",
    ruleNoCaptureText: "Jumped marbles remain on the board. They are never removed.",
    languageLabel: "Language:",
    opponentCountLabel: "Computer opponents",
    oneEasyOpponentOption: "1 Casual AI",
    twoEasyOpponentsOption: "2 Casual AI",
    oneNormalOpponentOption: "1 Normal AI",
    twoNormalOpponentsOption: "2 Normal AI",
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
    ruleExtendedJumpText: "Puedes saltar exactamente una ficha a cualquier distancia en línea recta. Los dos tramos despejados deben tener la misma longitud.",
    ruleMultipleJumpTitle: "Saltos múltiples",
    ruleMultipleJumpText: "Después de un salto, pulsa la ficha blanca para terminar la secuencia o elige otro destino de salto resaltado. Una ficha no puede aterrizar dos veces en la misma casilla durante una secuencia.",
    ruleTerritoryTitle: "Restricción de territorio",
    ruleTerritoryText: "Una ficha puede atravesar el territorio de otro jugador, pero no puede terminar un movimiento allí, aunque ese triángulo no contenga fichas.",
    ruleNoCaptureTitle: "Sin capturas",
    ruleNoCaptureText: "Las fichas saltadas permanecen en el tablero. Nunca se retiran.",
    languageLabel: "Idioma:",
    opponentCountLabel: "Oponentes controlados por ordenador",
    oneEasyOpponentOption: "1 IA casual",
    twoEasyOpponentsOption: "2 IA casuales",
    oneNormalOpponentOption: "1 IA normal",
    twoNormalOpponentsOption: "2 IA normales",
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
    documentTitle: "波子棋",
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
    ruleObjectiveText: "將你全部十粒波子由起始三角形移去正對面嘅目標三角形。",
    ruleStepTitle: "單步移動",
    ruleStepText: "將一粒波子移去隔離嘅空位。單步移動會完結回合。",
    ruleExtendedJumpTitle: "延伸跳躍",
    ruleExtendedJumpText: "你可以沿直線跨越剛好一粒波子，距離不限。被跨越波子兩邊嘅空位距離必須相等。",
    ruleMultipleJumpTitle: "連續跳躍",
    ruleMultipleJumpText: "跳躍之後，按白色波子就可以結束，或者揀另一個標示咗嘅跳躍目的地。喺同一跳躍序列入面，波子唔可以去返同一孔位。",
    ruleTerritoryTitle: "領地限制",
    ruleTerritoryText: "波子可以行過其他玩家嘅領地，但不可以在嗰度完結移動，不論該三角形入面有無波子。",
    ruleNoCaptureTitle: "唔食棋",
    ruleNoCaptureText: "被跳過嘅波子會留喺棋盤上面，唔會拎走。",
    languageLabel: "語言：",
    opponentCountLabel: "電腦對手數量",
    oneEasyOpponentOption: "1個輕鬆對手",
    twoEasyOpponentsOption: "2個輕鬆對手",
    oneNormalOpponentOption: "1個一般對手",
    twoNormalOpponentsOption: "2個一般對手",
    resetMoveButton: "重設移動",
    restartButton: "重新開始",
    loading: "載入緊遊戲…",
    selectOwnMarble: "請揀一粒你嘅波子。",
    selectOwnMarbleWithMoves: "請揀一粒行得郁嘅波子。",
    selectedPiece: "已經揀咗 ({x}, {y}) 嗰粒波子。請揀標示咗嘅目的地。",
    jumpContinue: "連續跳躍進行中。按白色波子就可以結束，或者揀標示咗嘅跳躍目的地。",
    resetMoveHint: "重設移動會將跳緊嘅波子還原去本次跳躍開始前嘅位置。",
    playerTurn: "輪到 {player}。",
    playerWon: "{player} 贏咗！",
    computerThinking: "{player} 諗緊…",
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

let currentLanguage = getLanguageFromQuery();

function getLanguageFromQuery() {
  const requestedLanguage = new URLSearchParams(window.location.search).get("lang");
  return SUPPORTED_LANGUAGES.has(requestedLanguage) ? requestedLanguage : "en";
}

export function getLanguage() {
  return currentLanguage;
}

export function t(key, replacements = {}) {
  let value = translations[currentLanguage]?.[key]
    ?? translations.en[key]
    ?? key;

  for (const [name, replacement] of Object.entries(replacements)) {
    value = value.replaceAll(`{${name}}`, String(replacement));
  }

  return value;
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
    `${url.pathname}${url.search}${url.hash}`,
  );
}

export function setLanguage(language, { updateUrl = true } = {}) {
  currentLanguage = SUPPORTED_LANGUAGES.has(language) ? language : "en";

  if (updateUrl) {
    replaceLanguageInUrl(currentLanguage);
  }

  return currentLanguage;
}

export function installLanguagePopstate(onChange) {
  window.addEventListener("popstate", () => {
    setLanguage(getLanguageFromQuery(), { updateUrl: false });
    onChange?.();
  });
}