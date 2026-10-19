const LANGUAGE_STORAGE_KEY = "reversi-language";
const WINS_STORAGE_KEY = "reversi-wins";
const LOSSES_STORAGE_KEY = "reversi-losses";
const DRAWS_STORAGE_KEY = "reversi-draws";

export const SUPPORTED_LANGUAGES = ["en", "es", "zh-Hant"];

const translations = {
  en: {
    title: "Reversi",
    newGame: "New game",
    setupTitle: "New game",
    gameMode: "Game mode",
    humanVsAi: "Human vs AI",
    twoHumans: "Two human players",
    boardConfiguration: "Board configuration",
    standardBoard: "Standard",
    hexagonalBoard: "Hexagonal",
    language: "Language",
    startGame: "Start game",
    currentScore: "Current pieces",
    record: "Game record",
    won: "Won",
    lost: "Lost",
    drawn: "Drawn",
    black: "Black",
    white: "White",
    you: "You",
    computer: "Computer",
    hint: "Hint",
    status: "Status",
    yourTurn: "Your turn.",
    blackTurn: "Black to move.",
    whiteTurn: "White to move.",
    computerTurn: "Computer is thinking…",
    blackStarts: "Black starts.",
    whiteStarts: "White starts.",
    youStart: "You start.",
    computerStarts: "The computer starts.",
    youPassed: "You have no legal moves and must pass.",
    computerPassed: "The computer has no legal moves and passes.",
    playerPassed: "{player} has no legal moves and passes.",
    gameOver: "Game over.",
    youWin: "You win!",
    youLose: "You lose.",
    draw: "It's a draw.",
    blackWins: "Black wins!",
    whiteWins: "White wins!",
    hintMessage: "Suggested move: {position}.",
    noHint: "There are no legal moves to suggest.",
    thinkingHint: "Calculating a strong move…",
    movePosition: "{column}{row}",
    instructionsTitle: "How to play",
    instructions1:
      "Place a disc so that it traps one or more opponent discs between the new disc and one of your existing discs.",
    instructions2:
      "All trapped opponent discs are turned to your colour. If a player has no legal moves, they must pass. The game ends when neither player can move; the player with more discs wins."
  },
  es: {
    title: "Reversi",
    newGame: "Nueva partida",
    setupTitle: "Nueva partida",
    gameMode: "Modo de juego",
    humanVsAi: "Humano contra IA",
    twoHumans: "Dos jugadores humanos",
    boardConfiguration: "Configuración del tablero",
    standardBoard: "Estándar",
    hexagonalBoard: "Hexagonal",
    language: "Idioma",
    startGame: "Comenzar partida",
    currentScore: "Fichas actuales",
    record: "Historial",
    won: "Ganadas",
    lost: "Perdidas",
    drawn: "Empates",
    black: "Negras",
    white: "Blancas",
    you: "Tú",
    computer: "Ordenador",
    hint: "Pista",
    status: "Estado",
    yourTurn: "Tu turno.",
    blackTurn: "Turno de las negras.",
    whiteTurn: "Turno de las blancas.",
    computerTurn: "El ordenador está pensando…",
    blackStarts: "Empiezan las negras.",
    whiteStarts: "Empiezan las blancas.",
    youStart: "Empiezas tú.",
    computerStarts: "Empieza el ordenador.",
    youPassed: "No tienes movimientos legales y debes pasar.",
    computerPassed: "El ordenador no tiene movimientos legales y pasa.",
    playerPassed: "{player} no tiene movimientos legales y pasa.",
    gameOver: "Fin de la partida.",
    youWin: "¡Has ganado!",
    youLose: "Has perdido.",
    draw: "La partida termina en empate.",
    blackWins: "¡Ganan las negras!",
    whiteWins: "¡Ganan las blancas!",
    hintMessage: "Movimiento sugerido: {position}.",
    noHint: "No hay ningún movimiento legal que sugerir.",
    thinkingHint: "Calculando un buen movimiento…",
    movePosition: "{column}{row}",
    instructionsTitle: "Cómo jugar",
    instructions1:
      "Coloca una ficha de manera que atrapes una o más fichas rivales entre la nueva ficha y otra de tus fichas.",
    instructions2:
      "Todas las fichas rivales atrapadas cambian a tu color. Si un jugador no tiene movimientos legales, debe pasar. La partida termina cuando ningún jugador puede mover; gana quien tenga más fichas."
  },
  "zh-Hant": {
    title: "黑白棋",
    newGame: "新遊戲",
    setupTitle: "新遊戲",
    gameMode: "遊戲模式",
    humanVsAi: "與電腦對戰",
    twoHumans: "雙人對戰",
    boardConfiguration: "棋盤設定",
    standardBoard: "標準",
    hexagonalBoard: "六角",
    language: "語言",
    startGame: "開始遊戲",
    currentScore: "目前棋數",
    record: "戰績",
    won: "勝",
    lost: "負",
    drawn: "和",
    black: "黑棋",
    white: "白棋",
    you: "你",
    computer: "電腦",
    hint: "提示",
    status: "狀態",
    yourTurn: "輪到你喇。",
    blackTurn: "輪到黑棋。",
    whiteTurn: "輪到白棋。",
    computerTurn: "電腦思考中……",
    blackStarts: "黑棋先行。",
    whiteStarts: "白棋先行。",
    youStart: "由你開始。",
    computerStarts: "由電腦開始。",
    youPassed: "你冇合規格嘅步法，須要停手一次。",
    computerPassed: "電腦冇合規格嘅步法，需要停手一次。",
    playerPassed: "{player}冇合規格嘅步法，需要停手一次。",
    gameOver: "遊戲結束。",
    youWin: "你贏咗！",
    youLose: "你輸咗。",
    draw: "平手。",
    blackWins: "黑棋勝出！",
    whiteWins: "白棋勝出！",
    hintMessage: "建議落子位置：{position}。",
    noHint: "目前冇合規格嘅建議步法。",
    thinkingHint: "計算緊最佳步法……",
    movePosition: "{column}{row}",
    instructionsTitle: "玩法說明",
    instructions1:
      "落子時，必須用新棋子同你本身嘅棋子夾住對方嘅一隻或多隻棋子。",
    instructions2:
      "所有被夾住嘅對方棋子都會變成你嘅顏色。如果玩家冇合規格嘅步法，就要停手。當雙方都無法落子時遊戲就會結束，擁有最多棋子嘅玩家獲勝。"
  }
};

function readStorage(key, fallback = null) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* Storage may be unavailable; the game remains playable. */
  }
}

function determineInitialLanguage() {
  // 1. Query string ?lang=en/es/zh (or zh-Hant)
  try {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const langParam = params.get("lang");
      if (langParam) {
        if (langParam === "zh" || langParam.startsWith("zh-")) {
          return "zh-Hant";
        }
        if (SUPPORTED_LANGUAGES.includes(langParam)) {
          return langParam;
        }
      }
    }
  } catch {
    // Ignore URL parsing errors
  }

  // 2. Previous selected and stored language
  const saved = readStorage(LANGUAGE_STORAGE_KEY);
  if (SUPPORTED_LANGUAGES.includes(saved)) {
    return saved;
  }

  // 3. Browser preference
  try {
    if (typeof navigator !== "undefined") {
      const browserLangs = navigator.languages ? Array.from(navigator.languages) : [navigator.language];
      for (const bl of browserLangs) {
        if (!bl) continue;
        const lower = bl.toLowerCase();
        if (lower.startsWith("es")) return "es";
        if (lower.startsWith("zh")) return "zh-Hant";
        if (lower.startsWith("en")) return "en";
      }
    }
  } catch {
    // Ignore navigator errors
  }

  // 4. Fallback to English
  return "en";
}

let currentLanguage = determineInitialLanguage();

export function t(key, replacements = {}) {
  let text = translations[currentLanguage][key] ?? translations.en[key] ?? key;

  for (const [name, value] of Object.entries(replacements)) {
    text = text.replaceAll(`{${name}}`, value);
  }

  return text;
}

export function getCurrentLanguage() {
  return currentLanguage;
}

export function getInitialLanguage() {
  return currentLanguage;
}

export function applyTranslations() {
  document.documentElement.lang = currentLanguage;

  document.querySelectorAll("[data-i18n]").forEach(element => {
    element.textContent = t(element.dataset.i18n);
  });
}

export function setLanguage(language) {
  currentLanguage = SUPPORTED_LANGUAGES.includes(language) ? language : "en";
  writeStorage(LANGUAGE_STORAGE_KEY, currentLanguage);
  applyTranslations();
}

export function readRecord() {
  const number = key => {
    const value = Number(readStorage(key, "0"));
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
  };

  return {
    wins: number(WINS_STORAGE_KEY),
    losses: number(LOSSES_STORAGE_KEY),
    draws: number(DRAWS_STORAGE_KEY)
  };
}

export function saveRecord(record) {
  writeStorage(WINS_STORAGE_KEY, record.wins);
  writeStorage(LOSSES_STORAGE_KEY, record.losses);
  writeStorage(DRAWS_STORAGE_KEY, record.draws);
}