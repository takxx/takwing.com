const board = document.getElementById("board");
const hexagons = [...document.querySelectorAll(".hex")];
const startButton = document.getElementById("startButton");
const roundDisplay = document.getElementById("round");
const message = document.getElementById("message");

const neighbors = {
  0: [1, 2, 3, 4, 5, 6],
  1: [0, 2, 6],
  2: [0, 1, 3],
  3: [0, 2, 4],
  4: [0, 3, 5],
  5: [0, 4, 6],
  6: [0, 5, 1]
};

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

const languageSelect = document.getElementById("languageSelect");

let language = getInitialLanguage();
let text = translations[language];

languageSelect.value = language;

function getInitialLanguage() {
  const savedLanguage = localStorage.getItem("hexSimonLanguage");

  if (savedLanguage && translations[savedLanguage]) {
    return savedLanguage;
  }

  const browserLanguages = navigator.languages || [navigator.language];

  for (const browserLanguage of browserLanguages) {
    const normalized = browserLanguage.toLowerCase();

    if (
      normalized === "zh-tw" ||
      normalized === "zh-hk" ||
      normalized === "zh-mo" ||
      normalized.startsWith("zh-hant")
    ) {
      return "zh-Hant";
    }

    if (normalized.startsWith("es")) {
      return "es";
    }
  }

  return "en";
}

function changeLanguage(newLanguage) {
  if (!translations[newLanguage]) {
    newLanguage = "en";
  }

  language = newLanguage;
  text = translations[language];

  localStorage.setItem("hexSimonLanguage", language);

  applyTranslations();

  if (!gameRunning) {
    setMessage("watchSequence");
  }
}

languageSelect.addEventListener("change", event => {
  changeLanguage(event.target.value);
});


function getLanguage() {
  const languages = navigator.languages || [navigator.language];

  for (const language of languages) {
    const normalized = language.toLowerCase();

    if (
      normalized === "zh-tw" ||
      normalized === "zh-hk" ||
      normalized === "zh-mo" ||
      normalized.startsWith("zh-hant")
    ) {
      return "zh-Hant";
    }

    if (normalized.startsWith("es")) {
      return "es";
    }
  }

  return "en";
}

function applyTranslations() {
  document.documentElement.lang = language;

  document.querySelectorAll("[data-i18n]").forEach(element => {
    const key = element.dataset.i18n;

    if (text[key]) {
      element.textContent = text[key];
    }
  });

  board.setAttribute("aria-label", text.boardLabel);

  hexagons.forEach((hex, index) => {
    hex.setAttribute(
      "aria-label",
      language === "zh-Hant"
        ? `六角形 ${index + 1}`
        : language === "es"
          ? `Hexágono ${index + 1}`
          : `Hexagon ${index + 1}`
    );
  });
}

let audioContext = null;

/*
  Do, re, mi, fa, so, la, ti.
  These are the C major notes C4 through B4.
*/
const frequencies = [
  261.63, // Do
  293.66, // Re
  329.63, // Mi
  349.23, // Fa
  392.00, // So
  440.00, // La
  493.88  // Ti
];

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (
      window.AudioContext ||
      window.webkitAudioContext
    )();
  }

  return audioContext;
}

function playHexSound(index) {
  const context = getAudioContext();

  if (context.state === "suspended") {
    context.resume();
  }

  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = frequencies[index];

  const now = context.currentTime;

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(now);
  oscillator.stop(now + 0.4);
}


let sequence = [];
let playerInput = [];
let round = 1;
let acceptingInput = false;
let gameRunning = false;

let pointerIsDown = false;
let swipeStarted = false;
let lastPointerHex = null;
let activePointerId = null;

const LIGHT_TIME = 430;
const GAP_TIME = 140;
const FEEDBACK_TIME = 180;

function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function setMessage(key) {
  message.textContent = text[key];
}

function updateRound() {
  roundDisplay.textContent = round;
}

function addNextSequenceItem() {
  if (sequence.length === 0) {
    sequence.push(Math.floor(Math.random() * 7));
    return;
  }

  const previous = sequence[sequence.length - 1];
  sequence.push(randomItem(neighbors[previous]));
}

async function lightHex(index, duration = LIGHT_TIME) {
  const hex = hexagons[index];

  playHexSound(index);
  hex.classList.add("active");

  await wait(duration);

  hex.classList.remove("active");
}

async function playSequence() {
  acceptingInput = false;
  setMessage("watchSequence");

  await wait(500);

  for (const index of sequence) {
    await lightHex(index);
    await wait(GAP_TIME);
  }

  playerInput = [];
  acceptingInput = true;
  setMessage("yourTurn");
}

function createNewGame() {
  sequence = [];
  playerInput = [];
  round = 1;
  gameRunning = true;

  updateRound();
  startButton.textContent = text.restart;
  startButton.disabled = true;

  addNextSequenceItem();
  playSequence();
}

function flashHex(index, className = "active") {
  const hex = hexagons[index];

  hex.classList.add(className);

  setTimeout(() => {
    hex.classList.remove(className);
  }, FEEDBACK_TIME);
}

function gameOver() {
  acceptingInput = false;
  gameRunning = false;

  setMessage("wrongSequence");
  startButton.disabled = false;
  startButton.textContent = text.tryAgain;

  hexagons.forEach(hex => hex.classList.add("wrong"));

  setTimeout(() => {
    hexagons.forEach(hex => hex.classList.remove("wrong"));
  }, 350);
}

function roundComplete() {
  acceptingInput = false;
  setMessage("correct");

  round++;
  updateRound();

  setTimeout(() => {
    addNextSequenceItem();
    playSequence();
  }, 700);
}

function selectHexagon(index) {
  if (!acceptingInput) return;

  playHexSound(index);
  flashHex(index);

  const expectedIndex = playerInput.length;
  const expectedHex = sequence[expectedIndex];

  playerInput.push(index);

  if (index !== expectedHex) {
    gameOver();
    return;
  }

  if (playerInput.length === sequence.length) {
    roundComplete();
  }
}

function getHexFromPoint(x, y) {
  const element = document.elementFromPoint(x, y);
  const hex = element?.closest(".hex");

  if (!hex || !board.contains(hex)) {
    return null;
  }

  return Number(hex.dataset.index);
}

function handlePointerDown(event) {
  if (!acceptingInput) return;

  event.preventDefault();

  pointerIsDown = true;
  swipeStarted = false;
  activePointerId = event.pointerId;
  lastPointerHex = getHexFromPoint(event.clientX, event.clientY);

  board.setPointerCapture?.(event.pointerId);
}

function handlePointerMove(event) {
  if (!pointerIsDown || !acceptingInput) return;
  if (event.pointerId !== activePointerId) return;

  event.preventDefault();

  const currentHex = getHexFromPoint(event.clientX, event.clientY);

  if (currentHex === null || currentHex === lastPointerHex) {
    return;
  }

  if (lastPointerHex !== null) {
    swipeStarted = true;

    if (!neighbors[lastPointerHex].includes(currentHex)) {
      gameOver();
      return;
    }

    selectHexagon(currentHex);
  }

  lastPointerHex = currentHex;
}

function handlePointerUp(event) {
  if (!pointerIsDown) return;
  if (event.pointerId !== activePointerId) return;

  event.preventDefault();

  const endingHex = getHexFromPoint(event.clientX, event.clientY);

  // No movement means this was a tap or click.
  if (!swipeStarted && endingHex !== null) {
    selectHexagon(endingHex);
  }

  pointerIsDown = false;
  swipeStarted = false;
  lastPointerHex = null;
  activePointerId = null;

  board.releasePointerCapture?.(event.pointerId);
}

function handlePointerCancel(event) {
  if (event.pointerId !== activePointerId) return;

  pointerIsDown = false;
  swipeStarted = false;
  lastPointerHex = null;
  activePointerId = null;
}

applyTranslations();

startButton.addEventListener("click", createNewGame);

board.addEventListener("pointerdown", handlePointerDown);
board.addEventListener("pointermove", handlePointerMove);
board.addEventListener("pointerup", handlePointerUp);
board.addEventListener("pointercancel", handlePointerCancel);
