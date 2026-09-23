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


/*
  Hexagon adjacency map.

             1

         6       2

             0

         5       3

             4
*/

const neighbors = {
  0: [1, 2, 3, 4, 5, 6],
  1: [0, 2, 6],
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

function getInitialLanguage() {
  const savedLanguage = localStorage.getItem("hexSimonLanguage");

  if (savedLanguage && translations[savedLanguage]) {
    return savedLanguage;
  }

  const languages =
    navigator.languages || [navigator.language];

  for (const browserLanguage of languages) {
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

let language = getInitialLanguage();
let text = translations[language];

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
    if (language === "zh-Hant") {
      hex.setAttribute("aria-label", `六角形 ${index + 1}`);
    } else if (language === "es") {
      hex.setAttribute("aria-label", `Hexágono ${index + 1}`);
    } else {
      hex.setAttribute("aria-label", `Hexagon ${index + 1}`);
    }
  });
}

function changeLanguage(newLanguage) {
  language = translations[newLanguage]
    ? newLanguage
    : "en";

  text = translations[language];

  localStorage.setItem(
    "hexSimonLanguage",
    language
  );

  applyTranslations();

  if (!gameRunning) {
    setMessage("watchSequence");
  }
}


/* =================================
   Audio
================================= */

let audioContext = null;

const frequencies = [
  261.63,
  293.66,
  329.63,
  349.23,
  392.0,
  440.0,
  493.88
];

function getAudioContext() {
  if (!audioContext) {
    const AudioContext =
      window.AudioContext ||
      window.webkitAudioContext;

    audioContext = new AudioContext();
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

  gain.gain.exponentialRampToValueAtTime(
    0.25,
    now + 0.02
  );

  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    now + 0.38
  );

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(now);
  oscillator.stop(now + 0.4);
}


/* =================================
   Game state
================================= */

let sequence = [];
let playerInput = [];
let round = 1;
let gameRunning = false;
let acceptingInput = false;
let gameId = 0;

function wait(milliseconds) {
  return new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });
}

function randomItem(array) {
  return array[
    Math.floor(Math.random() * array.length)
  ];
}

function setMessage(key) {
  message.textContent = text[key];
}

function updateRound() {
  roundDisplay.textContent = round;
}

function clearHexStates() {
  hexagons.forEach(hex => {
    hex.classList.remove("active", "wrong");
  });
}

function addNextSequenceItem() {
  if (sequence.length === 0) {
    sequence.push(
      Math.floor(Math.random() * HEX_COUNT)
    );

    return;
  }

  const previous =
    sequence[sequence.length - 1];

  sequence.push(
    randomItem(neighbors[previous])
  );
}


/* =================================
   Sequence playback
================================= */

async function lightHex(index) {
  const hex = hexagons[index];

  if (!hex) {
    return;
  }

  playHexSound(index);
  hex.classList.add("active");

  await wait(LIGHT_TIME);

  hex.classList.remove("active");
}

async function playSequence(currentGameId) {
  acceptingInput = false;
  setMessage("watchSequence");

  await wait(500);

  if (currentGameId !== gameId) {
    return;
  }

  for (const index of sequence) {
    if (currentGameId !== gameId) {
      return;
    }

    await lightHex(index);
    await wait(GAP_TIME);
  }

  if (currentGameId !== gameId) {
    return;
  }

  playerInput = [];
  acceptingInput = true;
  setMessage("yourTurn");
}


/* =================================
   Game flow
================================= */

function createNewGame() {
  gameId++;

  clearHexStates();

  sequence = [];
  playerInput = [];
  round = 1;

  gameRunning = true;
  acceptingInput = false;

  updateRound();

  startButton.disabled = true;
  startButton.textContent = text.restart;

  addNextSequenceItem();
  playSequence(gameId);
}

function flashHex(index, className = "active") {
  const hex = hexagons[index];

  if (!hex) {
    return;
  }

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

  hexagons.forEach(hex => {
    hex.classList.add("wrong");
  });

  setTimeout(() => {
    hexagons.forEach(hex => {
      hex.classList.remove("wrong");
    });
  }, 350);
}

function roundComplete() {
  acceptingInput = false;
  setMessage("correct");

  round++;

  updateRound();

  const currentGameId = gameId;

  setTimeout(() => {
    if (
      currentGameId !== gameId ||
      !gameRunning
    ) {
      return;
    }

    addNextSequenceItem();
    playSequence(currentGameId);
  }, 700);
}

function selectHexagon(index) {
  /*
    This is the only function that can trigger gameOver().
  */
  if (!acceptingInput) {
    return;
  }

  if (
    !Number.isInteger(index) ||
    !hexagons[index]
  ) {
    return;
  }

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
   Pointer and swipe handling
================================= */

let pointerIsDown = false;
let swipeStarted = false;
let activePointerId = null;
let lastPointerHex = null;

let pointerStartX = 0;
let pointerStartY = 0;

function getHexIndex(element) {
  const hex = element?.closest?.(".hex");

  if (!hex || !board.contains(hex)) {
    return null;
  }

  const index = Number(hex.dataset.index);

  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= HEX_COUNT
  ) {
    return null;
  }

  return index;
}

function getHexFromPoint(x, y) {
  const elements = document.elementsFromPoint(x, y);

  for (const element of elements) {
    const index = getHexIndex(element);

    if (index !== null) {
      return index;
    }
  }

  return null;
}

function getHexFromEvent(event) {
  const targetHex = getHexIndex(event.target);

  if (targetHex !== null) {
    return targetHex;
  }

  return getHexFromPoint(
    event.clientX,
    event.clientY
  );
}

function handlePointerDown(event) {
  if (!acceptingInput) {
    return;
  }

  if (activePointerId !== null) {
    return;
  }

  const startingHex = getHexFromEvent(event);

  if (startingHex === null) {
    return;
  }

  event.preventDefault();

  pointerIsDown = true;
  swipeStarted = false;
  activePointerId = event.pointerId;
  lastPointerHex = startingHex;

  pointerStartX = event.clientX;
  pointerStartY = event.clientY;

  if (board.setPointerCapture) {
    board.setPointerCapture(event.pointerId);
  }

  /*
    Important fix:
    The starting hexagon must be entered immediately.
    Otherwise, dragging to the next hexagon skips the
    first item in the pattern.
  */
  selectHexagon(startingHex);
}

function handlePointerMove(event) {
  if (!pointerIsDown) {
    return;
  }

  if (event.pointerId !== activePointerId) {
    return;
  }

  /*
    If the sequence has completed or failed, stop
    processing this pointer gesture.
  */
  if (!acceptingInput) {
    finishPointer(event);
    return;
  }

  event.preventDefault();

  const distanceMoved = Math.hypot(
    event.clientX - pointerStartX,
    event.clientY - pointerStartY
  );

  /*
    Small movements do not begin a swipe.
    The starting hexagon has already been selected.
  */
  if (
    !swipeStarted &&
    distanceMoved < SWIPE_THRESHOLD
  ) {
    return;
  }

  const currentHex = getHexFromPoint(
    event.clientX,
    event.clientY
  );

  /*
    The pointer may be over the gap between hexagons.
    Ignore the gap instead of treating it as an error.
  */
  if (currentHex === null) {
    return;
  }

  /*
    Staying on the same hexagon is not a new selection.
  */
  if (currentHex === lastPointerHex) {
    return;
  }

  /*
    Only adjacent hexagons may be selected during a drag.
    Invalid movement is ignored and does not cause gameOver().
  */
  if (
    lastPointerHex === null ||
    !neighbors[lastPointerHex].includes(currentHex)
  ) {
    return;
  }

  swipeStarted = true;
  lastPointerHex = currentHex;

  selectHexagon(currentHex);
}

function handlePointerUp(event) {
  if (event.pointerId !== activePointerId) {
    return;
  }

  event.preventDefault();

  /*
    Do not select anything here.
    The starting hexagon was selected during pointerdown,
    and dragged hexagons were selected during pointermove.
  */

  finishPointer(event);
}

function handlePointerCancel(event) {
  if (event.pointerId !== activePointerId) {
    return;
  }

  finishPointer(event);
}

function finishPointer(event) {
  if (
    board.releasePointerCapture &&
    board.hasPointerCapture?.(event.pointerId)
  ) {
    board.releasePointerCapture(event.pointerId);
  }

  pointerIsDown = false;
  swipeStarted = false;
  activePointerId = null;
  lastPointerHex = null;

  pointerStartX = 0;
  pointerStartY = 0;
}


/* =================================
   Event listeners
================================= */

languageSelect.addEventListener("change", event => {
  changeLanguage(event.target.value);
});

startButton.addEventListener(
  "click",
  createNewGame
);

board.addEventListener(
  "pointerdown",
  handlePointerDown
);

board.addEventListener(
  "pointermove",
  handlePointerMove
);

board.addEventListener(
  "pointerup",
  handlePointerUp
);

board.addEventListener(
  "pointercancel",
  handlePointerCancel
);


/* =================================
   Initialization
================================= */

applyTranslations();

languageSelect.value = language;

updateRound();
setMessage("watchSequence");
