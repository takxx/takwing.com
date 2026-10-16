const messages = {
  en: {
    eyebrow: "A game of connection",
    title: "Hex",
    newGame: "New game",
    redGoal: "Red connects left to right",
    blueGoal: "Blue connects top to bottom",
    footer: "There are no draws in Hex: one player will always make a connecting path.",
    welcome: "Welcome to Hex",
    instructions: "Take turns placing stones on empty hexes. Red tries to connect the left and right edges; blue tries to connect the top and bottom edges. The first player to connect their two sides wins.",
    modeLabel: "Play mode",
    twoPlayers: "Two players",
    vsComputer: "Play against computer",
    boardLabel: "Board size",
    languageLabel: "Language",
    start: "Start game",
    redTurn: "Red's turn",
    blueTurn: "Blue's turn",
    yourTurn: (player) => `Your turn (${player === "blue" ? "Blue" : "Red"})`,
    computerTurn: "Computer is thinking…",
    redWins: "Red wins!",
    blueWins: "Blue wins!",
    youWin: "You win!",
    computerWins: "Computer wins!",
    cellLabel: (row, col, occupant) =>
      `Row ${row}, column ${col}${occupant ? `, ${occupant}` : ", empty"}`
  },
  es: {
    eyebrow: "Un juego de conexión",
    title: "Hex",
    newGame: "Nueva partida",
    redGoal: "Rojo conecta izquierda y derecha",
    blueGoal: "Azul conecta arriba y abajo",
    footer: "En Hex no hay empates: siempre habrá un camino ganador.",
    welcome: "Bienvenido a Hex",
    instructions: "Por turnos, coloca fichas en hexágonos vacíos. Rojo intenta conectar los bordes izquierdo y derecho; azul, los bordes superior e inferior. Gana quien conecte primero sus dos lados.",
    modeLabel: "Modo de juego",
    twoPlayers: "Dos jugadores",
    vsComputer: "Jugar contra el ordenador",
    boardLabel: "Tamaño del tablero",
    languageLabel: "Idioma",
    start: "Empezar partida",
    redTurn: "Turno del rojo",
    blueTurn: "Turno del azul",
    yourTurn: (player) => `Tu turno (${player === "blue" ? "azul" : "rojo"})`,
    computerTurn: "El ordenador está pensando…",
    redWins: "¡Gana el rojo!",
    blueWins: "¡Gana el azul!",
    youWin: "¡Has ganado!",
    computerWins: "¡Gana el ordenador!",
    cellLabel: (row, col, occupant) =>
      `Fila ${row}, columna ${col}${occupant ? `, ${occupant}` : ", vacía"}`
  },
  zh: {
    eyebrow: "連線棋局",
    title: "Hex 六角棋",
    newGame: "新一局",
    redGoal: "紅方連接左右兩邊",
    blueGoal: "藍方連接上下兩邊",
    footer: "六角棋不會和局：總有一方可以連成一條路。",
    welcome: "歡迎玩六角棋",
    instructions: "輪流喺空格放棋子。紅方要連接左右兩邊；藍方要連接上下兩邊。首先連通自己兩邊嘅一方獲勝。",
    modeLabel: "遊戲模式",
    twoPlayers: "雙人對戰",
    vsComputer: "對戰電腦",
    boardLabel: "棋盤大小",
    languageLabel: "語言",
    start: "開始遊戲",
    redTurn: "紅方回合",
    blueTurn: "藍方回合",
    yourTurn: (player) => `輪到你（${player === "blue" ? "藍方" : "紅方"}）`,
    computerTurn: "電腦思考中…",
    redWins: "紅方獲勝！",
    blueWins: "藍方獲勝！",
    youWin: "你贏咗！",
    computerWins: "電腦獲勝！",
    cellLabel: (row, col, occupant) =>
      `第 ${row} 行，第 ${col} 列${occupant ? `，${occupant}` : "，空格"}`
  }
};

export function chooseInitialLanguage() {
  const params = new URLSearchParams(window.location.search);
  const queryLanguage = normalizeLanguage(params.get("lang"));
  if (queryLanguage) return queryLanguage;

  try {
    const savedLanguage = normalizeLanguage(localStorage.getItem("hex-language"));
    if (savedLanguage) return savedLanguage;
  } catch {
    // Storage may be unavailable; continue to browser preferences.
  }

  const preferences = navigator.languages?.length
    ? navigator.languages
    : [navigator.language || "en"];

  for (const preference of preferences) {
    const language = normalizeLanguage(preference);
    if (language) return language;
  }
  return "en";
}

function normalizeLanguage(value) {
  if (!value) return null;
  const language = value.toLowerCase();

  if (language === "en" || language.startsWith("en-")) return "en";
  if (language === "es" || language.startsWith("es-")) return "es";
  if (
    language === "zh" ||
    language.startsWith("zh-") ||
    language === "yue" ||
    language.startsWith("yue-")
  ) return "zh";

  return null;
}

export function saveLanguage(language) {
  try {
    localStorage.setItem("hex-language", language);
  } catch {
    // The current page still uses the selected language.
  }
}

export function translate(language, key, ...args) {
  const dictionary = messages[language] || messages.en;
  const value = dictionary[key] ?? messages.en[key] ?? key;
  return typeof value === "function" ? value(...args) : value;
}

export function applyTranslations(language, root = document) {
  root.documentElement?.setAttribute("lang", language === "zh" ? "zh-HK" : language);

  root.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = translate(language, element.dataset.i18n);
  });
}
