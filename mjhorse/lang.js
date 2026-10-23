const zh = {
  title: "跑馬仔",
  newGame: "新一局",
  instructionsLink: "玩法說明",
  remaining: "剩餘牌數",
  discards: "已打出",
  you: "你",
  credits: "分數",

  instructionsTitle: "玩法說明",
  east: "東",
  south: "南",
  west: "西",
  north: "北",
  roll: "擲緊骰…",
  started: "開局！到你摸牌喇。",
  yourTurn: "到你喇：請出牌。",
  opponentTurn: "對手行緊牌…",

  win: "你食糊喇！",
  lose: "對手食糊。",
  draw: "流局，摸晒牌。",
  pongPrompt: "你可以碰呢張牌。",
  kongPrompt: "你可以槓呢張牌。",
  robKongPrompt: "有人加槓，要唔要搶槓？",
  anotherWinPrompt: "有其他人食糊，你要唔要一齊食？",

  pass: "過",
  pong: "碰",
  kong: "槓",
  discardPrompt: "請先揀一張牌。",

  instructionHTML: `
    <p>此版本為簡化版跑馬仔：使用萬子、筒子、索子及風牌，每款四張；不設花牌。</p>
    <p>目標係湊夠四組面子及一對眼。可以碰、可以槓，唔可以上。玩家摸牌後必須打出一張；按標準食糊牌型判定。</p>
    <p>出銃食糊得兩分，由出銃者支付；若多人同時食同一張牌，每位食糊者各得兩分，由出銃者分別支付。自摸得六分，其他三家各付兩分。槓牌即收一分，由三家各付一分。</p>`,

  gameSummaryTitle: "本局結算",
  winningHand: "食糊牌型",
  highlightedTile: "食糊牌",
  hiddenTile: "暗牌",
  die: "骰仔",
  roundTotal: "今局",
  horseTiles: "馬牌",
  horseHits: "中馬",
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
