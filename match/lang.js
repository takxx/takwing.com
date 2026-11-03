const LANGUAGE_STORAGE_KEY = "sea-matches-language";

export const SUPPORTED_LANGUAGES = ["en", "es", "zh"];

const URL_LANGUAGE_MAP = {
  en: "en",
  es: "es",
  zh: "zh"
};

export const translations = {
  en: {
    title: "Sea Match",
    language: "Language",
    mode: "Mode",
    modeRelaxed: "Relaxed",
    modeTimed: "Timed",
    score: "Score",
    moves: "Moves",
    time: "Time",
    bestScore: "Best",
    hint: "Hint",
    newGame: "New Game",
    instructions: "Click or swipe neighbouring animals to match them.",
    match: count => `Great! ${count} animals matched!`,
    invalidSwap: "That swap did not make a match.",
    reshuffled: "No moves available. The board was reshuffled!",
    timeUp: "Time is up!",
    noMoves: "Game over! There are no possible matches left.",
    hintMessage: "Hint: try swapping these two animals.",
    dynamiteCleared: count => `Boom! ${count} animals cleared!`,
    dynamiteHint: "Hint: explode this dynamite.",

    introHow:
      "Swap neighbouring animals to make lines of three or more.",
    howRelaxed:
      "Play without a timer; the game ends when no moves remain.",
    howTimed:
      "Match quickly to earn extra time before time runs out.",
    chooseMode: "Choose game mode",
    startGame: "Start Game"
  },

  es: {
    title: "Conexión Marina",
    language: "Idioma",
    mode: "Modo",
    modeRelaxed: "Relajado",
    modeTimed: "Contrarreloj",
    score: "Puntuación",
    moves: "Movimientos",
    time: "Tiempo",
    bestScore: "Récord",
    hint: "Pista",
    newGame: "Nueva Partida",
    instructions:
      "Haz clic o desliza animales vecinos para combinarlos.",
    match: count => `¡Bien! ¡Has combinado ${count} animales!`,
    invalidSwap: "Ese movimiento no creó una combinación.",
    reshuffled: "No hay movimientos. ¡El tablero se reorganizó!",
    timeUp: "¡Se acabó el tiempo!",
    noMoves: "¡Fin del juego! No quedan combinaciones posibles.",
    hintMessage: "Pista: intenta intercambiar estos dos animales.",
    dynamiteCleared: count =>
      `¡Boom! ¡${count} animales eliminados!`,
    dynamiteHint: "Pista: detona esta dinamita.",

    introHow:
      "Intercambia animales vecinos para formar líneas de tres o más.",
    howRelaxed:
      "Juega sin temporizador; la partida termina cuando no quedan movimientos.",
    howTimed:
      "Combina rápidamente para ganar tiempo antes de que se agote.",
    chooseMode: "Elige el modo de juego",
    startGame: "Comenzar"
  },

  zh: {
    title: "消海鮮",
    language: "語言",
    mode: "模式",
    modeRelaxed: "消閑模式",
    modeTimed: "限時模式",
    score: "分數",
    moves: "步數",
    time: "時間",
    bestScore: "最高紀錄",
    hint: "提示",
    newGame: "重新開始",
    instructions: "點擊或滑動相鄰嘅海洋生物嚟進行配對。",
    match: count => `好嘢！成功消除咗 ${count} 隻生物！`,
    invalidSwap: "呢個交換配唔到對。",
    reshuffled: "冇得行喇！棋盤已重新洗牌！",
    timeUp: "夠鐘！",
    noMoves: "遊戲結束！已經冇位可以再配對。",
    hintMessage: "提示：試吓將呢兩隻海洋生物對調。",
    dynamiteCleared: count => `轟！炸咗 ${count} 隻生物！`,
    dynamiteHint: "提示：引爆呢個炸藥。",

    introHow:
      "對調相鄰嘅海洋生物，組成三個或以上嘅連線。",
    howRelaxed:
      "冇時間限制；玩到冇得行就完局。",
    howTimed:
      "鬥快配對賺取額外時間，喺倒數完之前爭取更高分。",
    chooseMode: "選擇遊戲模式",
    startGame: "開始遊戲"
  }
};

let currentLanguage = "en";

function readStorage(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* Storage may be unavailable. */
  }
}

function getQueryLanguage() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("lang")?.trim().toLowerCase();
  return URL_LANGUAGE_MAP[requested] || null;
}

function getSavedLanguage() {
  const saved = readStorage(LANGUAGE_STORAGE_KEY);
  return SUPPORTED_LANGUAGES.includes(saved) ? saved : null;
}

function getBrowserLanguage() {
  const browserLanguages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];

  for (const language of browserLanguages) {
    const normalized = String(language)
      .toLowerCase()
      .replace("_", "-");

    // Catch all Chinese variants (Traditional/HK/Taiwan/Simplified) and map them to our single "zh" pack
    if (normalized.startsWith("zh")) {
      return "zh";
    }

    if (normalized === "es" || normalized.startsWith("es-")) {
      return "es";
    }

    if (normalized === "en" || normalized.startsWith("en-")) {
      return "en";
    }
  }

  return "en";
}

export function getInitialLanguage() {
  return getQueryLanguage() || getSavedLanguage() || getBrowserLanguage();
}

export function getCurrentLanguage() {
  return currentLanguage;
}

export function translate(key, ...args) {
  const language = translations[currentLanguage] || translations.en;
  const value = language[key];

  if (typeof value === "function") {
    return value(...args);
  }

  return value ?? translations.en[key] ?? key;
}

export function setLanguage(language) {
  currentLanguage = SUPPORTED_LANGUAGES.includes(language)
    ? language
    : "en";

  writeStorage(LANGUAGE_STORAGE_KEY, currentLanguage);

  document.documentElement.lang =
    currentLanguage === "zh" ? "zh-Hant" : currentLanguage;

  document.documentElement.classList.remove(
    "lang-en",
    "lang-es",
    "lang-zh"
  );

  document.documentElement.classList.add(
    `lang-${currentLanguage.toLowerCase()}`
  );

  document.querySelectorAll("[data-i18n]").forEach(element => {
    const key = element.dataset.i18n;
    const value = translations[currentLanguage][key];

    if (typeof value === "string") {
      element.textContent = value;
    }
  });

  const languageSelect = document.getElementById(
    "introLanguageSelect"
  );

  if (languageSelect) {
    languageSelect.value = currentLanguage;
  }
}