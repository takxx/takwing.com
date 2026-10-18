const strings = {
  en: {
    title: "Dominos of Colours",
    welcome: "Welcome to Dominos of Colours",
    rules: "Players take turns placing a three-square tile. At least two squares on a tile must touch matching colours, and different colours may not touch. If a player has no legal move, they draw one tile; if they still cannot play, their turn ends. The first player to empty their hand wins. The starting Chameleon tile has a wild centre square.",
    opponents: "Computer opponents",
    language: "Language",
    start: "Start game",
    newGame: "New game",
    draw: "Draw tile",
    cancel: "Cancel selection",
    yourTurn: "Player's turn",
    aiTurn: "{name} is thinking…",
    yourHand: "Player's tiles",
    pileCount: "Pile: {count}",
    tilesCount: "{count} tiles",
    selectTile: "Select a tile, then tap one of its highlighted placements.",
    chooseMove: "Tap a highlighted full-tile preview to place it.",
    mustDraw: "No legal move. Draw a tile.",
    drawnPlayable: "A playable tile was drawn. Choose a highlighted placement.",
    drawnPass: "No legal move after drawing. Turn passed.",
    gameOver: "{name} wins!",
    record: "Wins/Losses: {wins}/{losses}",
    invalid: "That placement is not legal.",
    human: "Player",
    computer: "Computer {n}",
    wild: "Wild centre"
  },

  es: {
    title: "Dominós de colores",
    welcome: "Bienvenido a Dominós de colores",
    rules: "Por turnos, cada jugador coloca una ficha de tres cuadrados. Al menos dos cuadrados de la ficha deben tocar colores iguales y los colores distintos no pueden tocarse. Si un jugador no tiene una jugada legal, roba una ficha; si aún no puede jugar, termina su turno. Gana quien se quede sin fichas. La ficha camaleón inicial tiene el cuadrado central comodín.",
    opponents: "Rivales de ordenador",
    language: "Idioma",
    start: "Empezar partida",
    newGame: "Nueva partida",
    draw: "Robar ficha",
    cancel: "Cancelar selección",
    yourTurn: "Turno del jugador",
    aiTurn: "{name} está pensando…",
    yourHand: "Fichas del jugador",
    pileCount: "Montón: {count}",
    tilesCount: "{count} fichas",
    selectTile: "Selecciona una ficha y toca una de sus posiciones resaltadas.",
    chooseMove: "Toca una ficha resaltada completa para colocarla.",
    mustDraw: "No hay jugadas legales. Roba una ficha.",
    drawnPlayable: "Se ha robado una ficha jugable. Elige una posición resaltada.",
    drawnPass: "No hay jugadas tras robar. Turno perdido.",
    gameOver: "¡Gana {name}!",
    record: "Ganadas/perdidas: {wins}/{losses}",
    invalid: "Esa colocación no es válida.",
    human: "Jugador",
    computer: "Ordenador {n}",
    wild: "Centro comodín"
  },

  zh: {
    title: "七彩骨牌",
    welcome: "歡迎玩七彩骨牌",
    rules: "輪流放置三格牌。牌上最少兩格要與相鄰格顏色相同，不同顏色不可相鄰。沒有合法走法時抽一張牌；抽牌後仍無法放置便輪到下一位。最先出清手牌者勝。起始變色牌的中間格是萬用格。",
    opponents: "電腦對手數目",
    language: "語言",
    start: "開始遊戲",
    newGame: "新遊戲",
    draw: "抽一張牌",
    cancel: "取消選擇",
    yourTurn: "輪到你",
    aiTurn: "{name} 正在思考…",
    yourHand: "你的手牌",
    pileCount: "牌堆：{count}",
    tilesCount: "{count} 張",
    selectTile: "選擇一張牌，再點選其中一個標示位置。",
    chooseMove: "點選一個完整的標示牌形來放置。",
    mustDraw: "沒有合規走法，請抽牌。",
    drawnPlayable: "抽到可放置的牌，請選擇標示位置。",
    drawnPass: "抽牌後仍無法放置，輪到下一位。",
    gameOver: "{name} 勝出！",
    record: "勝負：{wins}/{losses}",
    invalid: "這個放置位置不合規。",
    human: "你",
    computer: "電腦{n}號",
    wild: "中間百搭格"
  }
};

let current = "en";

export function setLanguage(lang) {
  current = strings[lang] ? lang : "en";
  document.documentElement.lang = current;

  try {
    localStorage.setItem("doc-language", current);
  } catch {}

  document.querySelectorAll("[data-i18n]").forEach(element => {
    element.textContent = t(element.dataset.i18n);
  });

  document.title = t("title");

  return current;
}

export function t(key, values = {}) {
  let text = strings[current]?.[key] ?? strings.en[key] ?? key;

  for (const [name, value] of Object.entries(values)) {
    text = text.replaceAll(`{${name}}`, String(value));
  }

  return text;
}

export function chooseInitialLanguage() {
  const queryLanguage = new URLSearchParams(location.search).get("lang");
  if (["en", "es", "zh"].includes(queryLanguage)) return queryLanguage;

  try {
    const storedLanguage = localStorage.getItem("doc-language");
    if (["en", "es", "zh"].includes(storedLanguage)) return storedLanguage;
  } catch {}

  const preferences = (navigator.languages || [navigator.language || "en"])
    .map(language => language.toLowerCase());

  if (preferences.some(language => language.startsWith("zh"))) return "zh";
  if (preferences.some(language => language.startsWith("es"))) return "es";
  return "en";
}
