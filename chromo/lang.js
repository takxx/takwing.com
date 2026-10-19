const strings = {
  en: {
    title: "Dominos of Colours",
    welcome: "Welcome to Dominos of Colours",
    rules: "Players take turns placing a three-square tile. At least two squares on a tile must touch matching colours, and different colours may not touch. If you have no legal move, you draw one tile; if you still cannot play, your turn ends. The first player to empty their hand wins. The starting Chameleon tile has a wild centre square.",
    opponents: "Computer opponents",
    language: "Language",
    start: "Start game",
    newGame: "New game",
    draw: "Draw tile",
    cancel: "Cancel selection",
    yourTurn: "Your turn",
    aiTurn: "{name} is thinking…",
    yourHand: "Your tiles",
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
    human: "You",
    computer: "Computer {n}",
    wild: "Wild centre"
  },

  es: {
    title: "Dominó de colores",
    welcome: "Te damos la bienvenida a Dominó de colores",
    rules: "Por turnos, cada jugador coloca una ficha de tres casillas. Al menos dos casillas de la ficha deben coincidir con los colores adyacentes y no puede haber colores distintos en contacto. Si no tienes una jugada válida, robas una ficha; si aun así no puedes jugar, tu turno termina. Gana quien primero se quede sin fichas. La ficha camaleón inicial tiene una casilla central comodín.",
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
    selectTile: "Selecciona una ficha y toca una de sus posiciones resaltadas.",
    chooseMove: "Toca una vista previa completa de la ficha resaltada para colocarla.",
    mustDraw: "No hay jugadas válidas. Roba una ficha.",
    drawnPlayable: "Has robado una ficha jugable. Elige una posición resaltada.",
    drawnPass: "No hay jugadas válidas tras robar. Turno pasado.",
    gameOver: "¡{name} gana!",
    record: "Partidas ganadas/perdidas: {wins}/{losses}",
    invalid: "Esa colocación no es válida.",
    human: "Tú",
    computer: "Ordenador {n}",
    wild: "Casilla central comodín"
  },

  zh: {
    title: "七彩骨牌",
    welcome: "歡迎玩七彩骨牌",
    rules: "玩家輪流放置三格牌。牌上必須最少有兩格與相鄰格顏色相符，且不同顏色不可相鄰。若你無合法步數則需抽一張牌；抽牌後若仍無法出牌則回合結束。最先出清手牌的玩家獲勝。起始的變色龍牌擁有百搭的中間格。",
    opponents: "電腦對手",
    language: "語言",
    start: "開始遊戲",
    newGame: "新遊戲",
    draw: "抽牌",
    cancel: "取消選擇",
    yourTurn: "輪到你了",
    aiTurn: "{name} 正在思考…",
    yourHand: "你的手牌",
    pileCount: "牌堆：{count}",
    tilesCount: "{count} 張牌",
    selectTile: "請選擇一張牌，然後點擊其中一個反白的位置。",
    chooseMove: "點擊反白的完整牌面預覽來放置。",
    mustDraw: "沒有合法的走法，請抽一張牌。",
    drawnPlayable: "抽到了一張可出的牌，請選擇一個反白的位置。",
    drawnPass: "抽牌後仍無法出牌，輪次結束。",
    gameOver: "{name} 贏了！",
    record: "勝／負：{wins}勝 {losses}負",
    invalid: "該放置位置不合法。",
    human: "你",
    computer: "電腦 {n}",
    wild: "百搭中間格"
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
