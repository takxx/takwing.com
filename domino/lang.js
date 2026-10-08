const translations = {
  en: {
    title: "Dominoes",
    subtitle: "Double-six draw dominoes",
    wins: "Wins",
    boneyard: "Boneyard",
    computer: "Computer",
    yourHand: "Your hand",
    chooseSide: "Choose an end for this tile.",
    left: "Left",
    right: "Right",
    cancel: "Cancel",
    newGame: "New game",
    language: "Language",
    howToPlay: "How to play",
    instructions: "Click a domino that matches an open end. If it matches both ends, choose left or right. Drawing is automatic when no tile can be played.",
    yourTurn: "Your turn.",
    computerTurn: "Computer is thinking…",
    youOpen: "You open with {tile}.",
    computerOpens: "Computer opens with {tile}.",
    youDrew: "You drew {count} tile(s).",
    computerDrew: "Computer drew {count} tile(s).",
    youPlayed: "You played {tile} on the {side}.",
    computerPlayed: "Computer played {tile} on the {side}.",
    youWin: "You win this round.",
    computerWins: "Computer wins this round.",
    blockedYouWin: "The round is blocked. You win with fewer pips.",
    blockedComputerWins: "The round is blocked. Computer wins with fewer pips.",
    blockedTie: "The round is blocked. It is a tie.",
    leftSide: "left",
    rightSide: "right",
    tile: "{a}-{b}"
  },

  es: {
    title: "Dominó",
    subtitle: "Dominó de robo doble-seis",
    wins: "Victorias",
    boneyard: "Pozo",
    computer: "Computadora",
    yourHand: "Tu mano",
    chooseSide: "Elige un extremo para esta ficha.",
    left: "Izquierda",
    right: "Derecha",
    cancel: "Cancelar",
    newGame: "Nueva partida",
    language: "Idioma",
    howToPlay: "Cómo jugar",
    instructions: "Haz clic en una ficha que coincida con un extremo abierto. Si coincide con ambos extremos, elige izquierda o derecha. El robo es automático cuando no puedes jugar.",
    yourTurn: "Tu turno.",
    computerTurn: "La computadora está pensando…",
    youOpen: "Abres con {tile}.",
    computerOpens: "La computadora abre con {tile}.",
    youDrew: "Robaste {count} ficha(s).",
    computerDrew: "La computadora robó {count} ficha(s).",
    youPlayed: "Jugaste {tile} a la {side}.",
    computerPlayed: "La computadora jugó {tile} a la {side}.",
    youWin: "Ganas esta ronda.",
    computerWins: "La computadora gana esta ronda.",
    blockedYouWin: "La ronda está bloqueada. Ganas con menos puntos.",
    blockedComputerWins: "La ronda está bloqueada. La computadora gana con menos puntos.",
    blockedTie: "La ronda está bloqueada. Hay empate.",
    leftSide: "izquierda",
    rightSide: "derecha",
    tile: "{a}-{b}"
  },

  zh: {
    title: "骨牌",
    subtitle: "雙六抽牌骨牌",
    wins: "勝局",
    boneyard: "牌堆",
    computer: "電腦",
    yourHand: "你的手牌",
    chooseSide: "請選擇放在哪一端。",
    left: "左端",
    right: "右端",
    cancel: "取消",
    newGame: "新一局",
    language: "語言",
    howToPlay: "玩法",
    instructions: "點選能配對開口端的骨牌。如兩端都可放置，請選擇左端或右端。沒有可出的牌時會自動抽牌。",
    yourTurn: "輪到你。",
    computerTurn: "電腦正在思考…",
    youOpen: "你以 {tile} 開局。",
    computerOpens: "電腦以 {tile} 開局。",
    youDrew: "你抽了 {count} 張牌。",
    computerDrew: "電腦抽了 {count} 張牌。",
    youPlayed: "你把 {tile} 放在{side}。",
    computerPlayed: "電腦把 {tile} 放在{side}。",
    youWin: "你贏得這一局。",
    computerWins: "電腦贏得這一局。",
    blockedYouWin: "這局無牌可出。你的點數較少，獲勝。",
    blockedComputerWins: "這局無牌可出。電腦的點數較少，獲勝。",
    blockedTie: "這局無牌可出，平局。",
    leftSide: "左端",
    rightSide: "右端",
    tile: "{a}-{b}"
  }
};

let activeLanguage = "en";

function normalizeLanguage(value) {
  if (!value) {
    return null;
  }

  const code = String(value).toLowerCase().split("-")[0];

  return Object.hasOwn(translations, code) ? code : null;
}

function detectLanguage() {
  const urlLanguage = normalizeLanguage(
    new URLSearchParams(window.location.search).get("lang")
  );

  if (urlLanguage) {
    return urlLanguage;
  }

  const savedLanguage = normalizeLanguage(
    localStorage.getItem("domino-language")
  );

  if (savedLanguage) {
    return savedLanguage;
  }

  const browserLanguages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];

  for (const browserLanguage of browserLanguages) {
    const supportedLanguage = normalizeLanguage(browserLanguage);

    if (supportedLanguage) {
      return supportedLanguage;
    }
  }

  return "en";
}

export function t(key, values = {}) {
  let text = translations[activeLanguage][key]
    ?? translations.en[key]
    ?? key;

  for (const [name, value] of Object.entries(values)) {
    text = text.replaceAll(`{${name}}`, String(value));
  }

  return text;
}

export function getLanguage() {
  return activeLanguage;
}

export function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });

  const selector = document.getElementById("language-select");

  if (selector) {
    selector.value = activeLanguage;
  }
}

export function setLanguage(language, updateUrl = false) {
  activeLanguage = normalizeLanguage(language) || "en";

  document.documentElement.lang = activeLanguage;
  localStorage.setItem("domino-language", activeLanguage);

  if (updateUrl) {
    const url = new URL(window.location.href);
    url.searchParams.set("lang", activeLanguage);
    window.history.replaceState({}, "", url);
  }

  applyTranslations();
}

export function initializeLanguage() {
  setLanguage(detectLanguage(), false);
}