const STORAGE_KEY = "hex-minesweeper-language";
const SUPPORTED_LANGUAGES = new Set(["en", "es", "zh"]);

export const translations = {
  en: {
    documentLang: "en-GB",
    pageTitle: "Minesweeper",
    boardLabel: "Board",
    languageLabel: "Language",
    small: "Small",
    medium: "Medium",
    large: "Large",
    newGame: "New game",
    flagOff: "Flag mode: off",
    flagOn: "Flag mode: on",
    minesLeft: "Mines left: {count}",
    time: "Time: {seconds}",
    intro: "Reveal a hex to start. Right-click or use flag mode to place flags.",
    findMines: "Find all the mines.",
    flagModeOnStatus: "Flag mode on: tap a hex to place or remove a flag.",
    flagModeOffStatus: "Flag mode off: tap a hex to reveal it.",
    won: "You cleared the board!",
    lost: "Boom! The mines are revealed. Start a new game to try again.",
    boardAria: "Minesweeper board",
    cellHidden: "Row {row}, column {col}, hidden",
    cellMine: "Row {row}, column {col}, mine",
    cellExploded: "Row {row}, column {col}, exploded mine",
    cellFlagged: "Row {row}, column {col}, flagged",
    cellEmpty: "Row {row}, column {col}, empty",
    cellAdjacent: "Row {row}, column {col}, {count} adjacent mines"
  },

  es: {
    documentLang: "es-ES",
    pageTitle: "Buscaminas",
    boardLabel: "Tablero",
    languageLabel: "Idioma",
    small: "Pequeño",
    medium: "Mediano",
    large: "Grande",
    newGame: "Nueva partida",
    flagOff: "Modo bandera: desactivado",
    flagOn: "Modo bandera: activado",
    minesLeft: "Minas restantes: {count}",
    time: "Tiempo: {seconds}",
    intro: "Descubre un hexágono para empezar. Haz clic derecho o activa el modo bandera para colocar banderas.",
    findMines: "Encuentra todas las minas.",
    flagModeOnStatus: "Modo bandera activado: toca un hexágono para poner o quitar una bandera.",
    flagModeOffStatus: "Modo bandera desactivado: toca un hexágono para descubrirlo.",
    won: "¡Has ganado la partida!",
    lost: "¡Bum! Las minas quedan al descubierto. Empieza una nueva partida para volver a intentarlo.",
    boardAria: "Tablero de Buscaminas",
    cellHidden: "Fila {row}, columna {col}, oculta",
    cellMine: "Fila {row}, columna {col}, mina",
    cellExploded: "Fila {row}, columna {col}, mina detonada",
    cellFlagged: "Fila {row}, columna {col}, marcada",
    cellEmpty: "Fila {row}, columna {col}, vacía",
    cellAdjacent: "Fila {row}, columna {col}, {count} minas adyacentes"
  },

  zh: {
    documentLang: "zh-HK",
    pageTitle: "掃地雷",
    boardLabel: "棋盤",
    languageLabel: "語言",
    small: "細",
    medium: "中",
    large: "大",
    newGame: "新遊戲",
    flagOff: "插旗模式：關",
    flagOn: "插旗模式：開",
    minesLeft: "剩餘地雷：{count}",
    time: "時間：{seconds}",
    intro: "點擊任意六角格開始。使用右鍵或插旗模式來插旗。",
    findMines: "搵出所有地雷。",
    flagModeOnStatus: "插旗模式已開：點擊六角格以插旗或移除旗幟。",
    flagModeOffStatus: "插旗模式已關：點擊六角格以揭開。",
    won: "恭喜你！成功清除晒所有地雷！",
    lost: "轟！地雷已經全部顯露。開新局再玩過啦！",
    boardAria: "掃雷棋盤",
    cellHidden: "第 {row} 行，第 {col} 列，未揭開",
    cellMine: "第 {row} 行，第 {col} 列，地雷",
    cellExploded: "第 {row} 行，第 {col} 列，已引爆的地雷",
    cellFlagged: "第 {row} 行，第 {col} 列，已插旗",
    cellEmpty: "第 {row} 行，第 {col} 列，空格",
    cellAdjacent: "第 {row} 行，第 {col} 列，周圍有 {count} 個地雷"
  }
};

function normaliseLanguage(value) {
  const language = value?.trim().toLowerCase();
  return SUPPORTED_LANGUAGES.has(language) ? language : null;
}

function getSavedLanguage() {
  try {
    return normaliseLanguage(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function getBrowserLanguage() {
  const preferences = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];

  for (const preference of preferences) {
    const language = preference.toLowerCase();

    if (language.startsWith("es")) return "es";
    if (language.startsWith("zh")) return "zh";
    if (language.startsWith("en")) return "en";
  }

  return "en";
}

export function resolveLanguage() {
  const requested = normaliseLanguage(
    new URLSearchParams(window.location.search).get("lang")
  );

  if (requested) {
    saveLanguage(requested);
    return requested;
  }

  return getSavedLanguage() ?? getBrowserLanguage();
}

export function saveLanguage(language) {
  const validLanguage = normaliseLanguage(language);
  if (!validLanguage) return;

  try {
    localStorage.setItem(STORAGE_KEY, validLanguage);
  } catch {
    // The language still changes for this page if storage is unavailable.
  }
}

export function getTranslations(language) {
  return translations[language] ?? translations.en;
}