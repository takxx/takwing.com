const strings = {
  en: {
    title: "Colour Dominoes",
    welcome: "Welcome to Colour Dominoes",
    rules: "Players take turns placing a three-square tile. At least two squares on the tile must touch matching colours, and different colours cannot touch. If you have no valid moves, you draw one tile; if you still cannot play, your turn ends. The first player to empty their hand wins. The starting Chameleon tile features a wild centre square.",
    opponents: "Computer opponents",
    language: "Language",
    start: "Start Game",
    newGame: "New Game",
    draw: "Draw Tile",
    cancel: "Cancel Selection",
    yourTurn: "Your turn",
    aiTurn: "{name} is thinking…",
    yourHand: "Your Tiles",
    pileCount: "Pile: {count}",
    tilesCount: "{count} tiles",
    selectTile: "Select a tile, then tap one of the highlighted placement spots.",
    chooseMove: "Tap the highlighted full-tile preview to confirm your placement.",
    mustDraw: "No valid moves. Draw a tile.",
    drawnPlayable: "You drew a playable tile! Choose a highlighted placement.",
    drawnPass: "No valid moves after drawing. Turn passed.",
    gameOver: "{name} wins!",
    record: "Wins / Losses: {wins} / {losses}",
    invalid: "That placement isn't allowed.",
    human: "You",
    computer: "Computer {n}",
    wild: "Wild Centre"
  },

  es: {
    title: "Dominó de Colores",
    welcome: "Te damos la bienvenida a Dominó de Colores",
    rules: "Los jugadores se turnan para colocar una ficha de tres casillas. Al menos dos casillas de la ficha deben coincidir con los colores adyacentes, y los colores diferentes no pueden tocarse. Si no tienes movimientos válidos, robas una ficha; si aún así no puedes jugar, tu turno termina. Gana el primer jugador en quedarse sin fichas. La ficha Camaleón inicial tiene una casilla central comodín.",
    opponents: "Oponentes controlados por ordenador",
    language: "Idioma",
    start: "Empezar partida",
    newGame: "Nueva partida",
    draw: "Robar ficha",
    cancel: "Cancelar selección",
    yourTurn: "Tu turno",
    aiTurn: "{name} está pensando…",
    yourHand: "Tus fichas",
    pileCount: "Montón: {count}",
    tilesCount: "{count} fichas",
    selectTile: "Selecciona una ficha y toca una de las casillas resaltadas.",
    chooseMove: "Toca la vista previa resaltada para confirmar la colocación.",
    mustDraw: "No hay movimientos válidos. Roba una ficha.",
    drawnPlayable: "¡Has robado una ficha jugable! Elige una posición resaltada.",
    drawnPass: "No hay movimientos válidos tras robar. Turno pasado.",
    gameOver: "¡{name} ha ganado!",
    record: "Victorias / Derrotas: {wins} / {losses}",
    invalid: "Esa colocación no es válida.",
    human: "Tú",
    computer: "Ordenador {n}",
    wild: "Casilla central comodín"
  },

  zh: {
    title: "七彩骨牌",
    welcome: "歡迎遊玩七彩骨牌",
    rules: "玩家輪流放置三格牌。牌上至少必須有兩格與相鄰顏色相符，且不同顏色不能相鄰。如果你冇合法嘅步數，就要抽一張牌；如果抽完都係出唔到牌，就會輪到下一位玩家。最先清空手牌嘅玩家勝出。起始嘅變色龍牌擁有百搭嘅中心格。",
    opponents: "電腦對手",
    language: "語言",
    start: "開始遊戲",
    newGame: "新遊戲",
    draw: "抽牌",
    cancel: "取消選擇",
    yourTurn: "輪到你",
    aiTurn: "{name} 正在思考…",
    yourHand: "你的手牌",
    pileCount: "牌堆：{count}",
    tilesCount: "{count} 張牌",
    selectTile: "請選擇一張牌，然後點擊其中一個反白嘅放置位置。",
    chooseMove: "點擊反白嘅完整牌面預覽嚟確認放置。",
    mustDraw: "冇合法嘅走法，請抽一張牌。",
    drawnPlayable: "抽到一張可以出嘅牌！請選擇一個反白嘅位置。",
    drawnPass: "抽牌後依然無法出牌，回合結束。",
    gameOver: "{name} 贏咗！",
    record: "勝／負：{wins} 勝 {losses} 負",
    invalid: "呢個位置唔可以放置。",
    human: "你",
    computer: "電腦 {n}",
    wild: "百搭中心格"
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
