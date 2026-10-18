"use strict";

/* =================================
    DOM
================================= */
const board = document.getElementById("board");
const hexagons = [...document.querySelectorAll(".hex")];
const startButton = document.getElementById("startButton");
const roundDisplay = document.getElementById("round");
const message = document.getElementById("message");
const languageSelect = document.getElementById("languageSelect");

/* =================================
    Configuration
================================= */
const HEX_COUNT = 7;
const LIGHT_TIME = 430;
const GAP_TIME = 140;
const FEEDBACK_TIME = 180;
const SWIPE_THRESHOLD = 8;

const neighbors = {
  0: [1, 2, 3, 4, 5, 6],
  1: [0, 6, 2],
  2: [0, 1, 3],
  3: [0, 2, 4],
  4: [0, 3, 5],
  5: [0, 4, 6],
  6: [0, 5, 1]
};

/* =================================
    Translations
================================= */
const translations = {
  en: {
    title: "Hexagon Simon",
    language: "Language",
    roundLabel: "Round:",
    watchSequence: "Watch the sequence",
    yourTurn: "Your turn",
    correct: "Correct!",
    wrongSequence: "Wrong sequence",
    start: "Start Game",
    restart: "Restart Game",
    tryAgain: "Try Again",
    boardLabel: "Simon game board"
  },
  es: {
    title: "Simón de Hexágonos",
    language: "Idioma",
    roundLabel: "Ronda:",
    watchSequence: "Observa la secuencia",
    yourTurn: "Tu turno",
    correct: "¡Correcto!",
    wrongSequence: "Secuencia incorrecta",
    start: "Iniciar juego",
    restart: "Reiniciar juego",
    tryAgain: "Intentar de nuevo",
    boardLabel: "Tablero del juego Simón"
  },
  "zh-Hant": {
    title: "六角西門",
    language: "語言",
    roundLabel: "回合：",
    watchSequence: "睇實喇",
    yourTurn: "輪到你",
    correct: "順利完成！",
    wrongSequence: "錯咗喇",
    start: "開始遊戲",
    restart: "重新開始",
    tryAgain: "再試一次",
    boardLabel: "西門遊戲板"
  }
};

let language = "en";
let text = translations[language];

function applyTranslations() {
  document.documentElement.lang = language;
  document.querySelectorAll("[data-i18n]").forEach(element => {
    const key = element.dataset.i18n;
    if (text[key]) element.textContent = text[key];
  });
  board.setAttribute("aria-label", text.boardLabel);
  hexagons.forEach((hex, index) => {
    const prefix = language === "zh-Hant" ? "六角形 " : language === "es" ? "Hexágono " : "Hexagon ";
    hex.setAttribute("aria-label", `${prefix}${index + 1}`);
  });
}

function changeLanguage(newLang) {
  language = translations[newLang] ? newLang : "en";
  text = translations[language];
  applyTranslations();
  if (!gameRunning) setMessage("watchSequence");
}

/* =================================
    Audio
================================= */
let audioContext = null;
const frequencies = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88];

function playHexSound(index) {
  if (!audioContext) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext();
  }
  if (audioContext.state === "suspended") audioContext.resume();

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = frequencies[index];

  const now = audioContext.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.start(now);
  oscillator.stop(now + 0.4);
}

/* =================================
    Game State & Flow
================================= */
let sequence = [];
let playerInput = [];
let round = 1;
let gameRunning = false;
let acceptingInput = false;
let gameId = 0;

const wait = ms => new Promise(res => setTimeout(res, ms));
const randomItem = arr => arr[Math.floor(Math.random() * arr.length)];
const setMessage = key => message.textContent = text[key];

function addNextSequenceItem() {
  if (sequence.length === 0) {
    sequence.push(Math.floor(Math.random() * HEX_COUNT));
    return;
  }
  sequence.push(randomItem(neighbors[sequence[sequence.length - 1]]));
}

async function lightHex(index) {
  const hex = hexagons[index];
  if (!hex) return;
  playHexSound(index);
  hex.classList.add("active");
  await wait(LIGHT_TIME);
  hex.classList.remove("active");
}

async function playSequence(currentGameId) {
  acceptingInput = false;
  setMessage("watchSequence");
  await wait(500);

  for (const index of sequence) {
    if (currentGameId !== gameId) return;
    await lightHex(index);
    await wait(GAP_TIME);
  }

  if (currentGameId !== gameId) return;
  playerInput = [];
  acceptingInput = true;
  setMessage("yourTurn");
}

function createNewGame() {
  gameId++;
  hexagons.forEach(h => h.classList.remove("active", "wrong"));
  sequence = [];
  playerInput = [];
  round = 1;
  gameRunning = true;
  acceptingInput = false;
  roundDisplay.textContent = round;
  startButton.disabled = true;
  startButton.textContent = text.restart;

  addNextSequenceItem();
  playSequence(gameId);
}

function flashHex(index) {
  const hex = hexagons[index];
  if (!hex) return;
  hex.classList.add("active");
  setTimeout(() => hex.classList.remove("active"), FEEDBACK_TIME);
}

function gameOver() {
  acceptingInput = false;
  gameRunning = false;
  setMessage("wrongSequence");
  startButton.disabled = false;
  startButton.textContent = text.tryAgain;

  hexagons.forEach(h => h.classList.add("wrong"));
  setTimeout(() => hexagons.forEach(h => h.classList.remove("wrong")), 350);
}

function roundComplete() {
  acceptingInput = false;
  setMessage("correct");
  round++;
  roundDisplay.textContent = round;
  const currentGameId = gameId;

  setTimeout(() => {
    if (currentGameId !== gameId || !gameRunning) return;
    addNextSequenceItem();
    playSequence(currentGameId);
  }, 700);
}

function selectHexagon(index) {
  if (!acceptingInput || !Number.isInteger(index) || !hexagons[index]) return;

  const expectedIndex = playerInput.length;
  const expectedHex = sequence[expectedIndex];

  playerInput.push(index);
  playHexSound(index);
  flashHex(index);

  if (index !== expectedHex) {
    gameOver();
    return;
  }

  if (playerInput.length === sequence.length) {
    roundComplete();
  }
}

/* =================================
    Pointer & Touch Input Handling
================================= */
let activePointerId = null;
let lastPointerHex = null;
let pointerStartX = 0;
let pointerStartY = 0;
let swipeStarted = false;

function getHexIndex(el) {
  const hex = el?.closest?.(".hex");
  if (!hex || !board.contains(hex)) return null;
  const idx = Number(hex.dataset.index);
  return Number.isInteger(idx) && idx >= 0 && idx < HEX_COUNT ? idx : null;
}

function getHexFromPoint(x, y) {
  const elements = document.elementsFromPoint(x, y);
  for (const el of elements) {
    const idx = getHexIndex(el);
    if (idx !== null) return idx;
  }
  return null;
}

function handlePointerDown(e) {
  if (!acceptingInput || activePointerId !== null) return;
  const startingHex = getHexIndex(e.target) ?? getHexFromPoint(e.clientX, e.clientY);
  if (startingHex === null) return;

  e.preventDefault();
  activePointerId = e.pointerId;
  lastPointerHex = startingHex;
  pointerStartX = e.clientX;
  pointerStartY = e.clientY;
  swipeStarted = false;

  if (board.setPointerCapture) board.setPointerCapture(e.pointerId);
  selectHexagon(startingHex);
}

function handlePointerMove(e) {
  if (e.pointerId !== activePointerId) return;
  if (!acceptingInput) {
    finishPointer(e);
    return;
  }

  e.preventDefault();
  const distance = Math.hypot(e.clientX - pointerStartX, e.clientY - pointerStartY);

  if (!swipeStarted && distance < SWIPE_THRESHOLD) return;

  const currentHex = getHexFromPoint(e.clientX, e.clientY);
  if (currentHex === null || currentHex === lastPointerHex) return;

  if (!neighbors[lastPointerHex].includes(currentHex)) return;

  swipeStarted = true;
  lastPointerHex = currentHex;
  selectHexagon(currentHex);
}

function handlePointerUp(e) {
  if (e.pointerId === activePointerId) finishPointer(e);
}

function handlePointerCancel(e) {
  if (e.pointerId === activePointerId) finishPointer(e);
}

function finishPointer(e) {
  if (board.releasePointerCapture && board.hasPointerCapture?.(e.pointerId)) {
    board.releasePointerCapture(e.pointerId);
  }
  activePointerId = null;
  lastPointerHex = null;
}

/* =================================
    Event Listeners & Init
================================= */
languageSelect.addEventListener("change", e => changeLanguage(e.target.value));
startButton.addEventListener("click", createNewGame);
board.addEventListener("pointerdown", handlePointerDown);
board.addEventListener("pointermove", handlePointerMove);
board.addEventListener("pointerup", handlePointerUp);
board.addEventListener("pointercancel", handlePointerCancel);

applyTranslations();