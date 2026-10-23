const zh = {
  title: "跑馬仔",
  newGame: "新局",
  instructionsLink: "玩法說明",
  remaining: "剩餘牌數",
  discards: "棄牌",
  you: "你",
  credits: "分數",

  instructionsTitle: "玩法說明",
  east: "東家",
  south: "南家",
  west: "西家",
  north: "北家",
  roll: "擲骰中…",
  started: "開局！輪到你摸牌。",
  yourTurn: "輪到你：請打出一張牌。",
  opponentTurn: "對手正在行牌…",

  win: "你食糊了！",
  lose: "對手食糊。",
  draw: "流局，牌已摸完。",
  pongPrompt: "你可以碰這張牌。",
  kongPrompt: "你可以槓這張牌。",
  robKongPrompt: "有人加槓，是否搶槓？",
  anotherWinPrompt: "另一家食糊了，你要不要也食糊？",

  pass: "過",
  pong: "碰",
  kong: "槓",
  discardPrompt: "請先選一張牌。",

  instructionHTML: `
    <p>此示例採用簡化的跑馬仔玩法：使用萬、筒、索及風牌，每款四張；不使用花牌。</p>
    <p>目標是組成四組面子及一對眼。可碰、可槓，不可上（吃）。玩家摸牌後須打出一張；按標準胡牌牌型判定。</p>
    <p>食出一張棄牌得兩分，由出牌者支付；若多人食同一張棄牌，每位食糊者各得兩分，並由出牌者分別支付。自摸得六分，其他三家各付兩分。槓牌即收一分，由三家各支付一分。</p>`,

  gameSummaryTitle: "本局總結",
  winningHand: "食糊牌型",
  highlightedTile: "食糊牌",
  hiddenTile: "暗牌",
  die: "骰子",
  roundTotal: "本局",
  horseTiles: "馬牌",
  horseHits: "馬中",
  tilesCount: "隻",
  selfDraw: "自摸",
  discardWin: "出銃",
  robKongWin: "搶槓",
  concealedKong: "暗槓",
  exposedKong: "明槓",
  addedKong: "加槓",
  winBySelfDraw: "自摸",
  winByDiscard: "出銃"
};

export function getLang() {
  const params = new URLSearchParams(location.search);
  return params.get("lang") === "zh" ? "zh" : "zh";
}

export function messages() {
  return zh;
}

export function applyLanguage() {
  const m = messages();

  document.documentElement.lang =
    getLang() === "zh" ? "zh-Hant" : "zh";

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if (m[key]) el.textContent = m[key];
  });

  document.querySelector("#instruction-copy").innerHTML =
    m.instructionHTML;
}
