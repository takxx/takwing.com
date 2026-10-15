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
    won: "You cleared the field!",
    lost: "Boom! The mines are shown. Start a new game to try again.",
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
    won: "¡Has despejado el campo!",
    lost: "¡Boom! Se muestran las minas. Empieza una nueva partida para volver a intentarlo.",
    boardAria: "Tablero del buscaminas",
    cellHidden: "Fila {row}, columna {col}, oculta",
    cellMine: "Fila {row}, columna {col}, mina",
    cellExploded: "Fila {row}, columna {col}, mina explotada",
    cellFlagged: "Fila {row}, columna {col}, marcada con una bandera",
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
    intro: "揭開一個六角格開始。右擊或開啟插旗模式插旗。",
    findMines: "搵出所有地雷。",
    flagModeOnStatus: "插旗模式已開：點一下六角格即可插旗或除旗。",
    flagModeOffStatus: "插旗模式已關：點一下六角格即可揭開。",
    won: "恭喜你清除晒所有安全格！",
    lost: "爆炸！地雷已顯示。開始新遊戲再試一次。",
    boardAria: "掃雷棋盤",
    cellHidden: "第 {row} 行，第 {col} 格，未揭開",
    cellMine: "第 {row} 行，第 {col} 格，地雷",
    cellExploded: "第 {row} 行，第 {col} 格，已爆炸的地雷",
    cellFlagged: "第 {row} 行，第 {col} 格，已插旗",
    cellEmpty: "第 {row} 行，第 {col} 格，空格",
    cellAdjacent: "第 {row} 行，第 {col} 格，附近有 {count} 個地雷"
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
