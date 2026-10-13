// script.js — bilingual Buzzword, with Spanish Ñ support

// ---------- Configuration ----------

const GAME_NAME = "buzzword";
const DISPLAY_NAME = "Buzzword";

const SUPPORTED_LANGUAGES = ["en", "es"];
const DEFAULT_LANGUAGE = "en";

// For Spanish: preserve Ñ, but treat Á É Í Ó Ü as A E I O U.
const NORMALIZE_ACCENTS = {
  es: true,
  en: false
};

const TRANSLATIONS = {
  en: {
    loadError: "Unable to load Buzzword.",
    hexAria: index => `Hexagon ${index + 1}`,
    greatJob: "Great job!",
    foundSeven: score =>
      `You found a 7-letter word. Score: ${score}.`,
    nextRound: "Next round",
    gameOver: "Game over",
    noSeven: score =>
      `No 7-letter word found. Final score: ${score}.`,
    newGame: "New game",
    roundComplete: "Round complete!",
    allFound: (bonus, score) =>
      `All words found! +${bonus} bonus. Score: ${score}.`,
    alreadyFound: word => `${word} has already been found.`,
    notAWord: "That path does not make a valid word.",
    invalidPath: "Invalid path.",
    wordPoints: (word, points, seconds) =>
      `${word}: +${points} points, +${seconds} seconds`,
    foundWord: word => `Found word: ${word}`,
    unfoundWord: word => `Unfound word: ${word}`
  },

  es: {
    loadError: "No se pudo cargar Buzzword.",
    hexAria: index => `Hexágono ${index + 1}`,
    greatJob: "¡Buen trabajo!",
    foundSeven: score =>
      `Encontraste una palabra de 7 letras. Puntuación: ${score}.`,
    nextRound: "Siguiente ronda",
    gameOver: "Fin del juego",
    noSeven: score =>
      `No se encontró una palabra de 7 letras. Puntuación final: ${score}.`,
    newGame: "Nuevo juego",
    roundComplete: "¡Ronda completada!",
    allFound: (bonus, score) =>
      `¡Encontraste todas las palabras! +${bonus} de bonificación. Puntuación: ${score}.`,
    alreadyFound: word => `${word} ya se ha encontrado.`,
    notAWord: "Ese recorrido no forma una palabra válida.",
    invalidPath: "Recorrido no válido.",
    wordPoints: (word, points, seconds) =>
      `${word}: +${points} puntos, +${seconds} segundos`,
    foundWord: word => `Palabra encontrada: ${word}`,
    unfoundWord: word => `Palabra no encontrada: ${word}`
  }
};

let currentLanguage = DEFAULT_LANGUAGE;
let t = TRANSLATIONS[currentLanguage];

// ---------- Language selection ----------

function detectLanguage() {
  const urlLanguage = new URLSearchParams(window.location.search)
    .get("lang")
    ?.toLowerCase();

  if (urlLanguage && SUPPORTED_LANGUAGES.includes(urlLanguage)) {
    return urlLanguage;
  }

  const storedLanguage = localStorage.getItem(`${GAME_NAME}Language`);
  if (storedLanguage && SUPPORTED_LANGUAGES.includes(storedLanguage)) {
    return storedLanguage;
  }

  const browserLanguage = navigator.language
    ?.slice(0, 2)
    .toLowerCase();

  if (SUPPORTED_LANGUAGES.includes(browserLanguage)) {
    return browserLanguage;
  }

  return DEFAULT_LANGUAGE;
}

function setLanguage(language) {
  currentLanguage = SUPPORTED_LANGUAGES.includes(language)
    ? language
    : DEFAULT_LANGUAGE;

  t = TRANSLATIONS[currentLanguage];

  localStorage.setItem(`${GAME_NAME}Language`, currentLanguage);
  document.documentElement.lang = currentLanguage;
}

// ---------- Data loading ----------

async function loadWordData(language = DEFAULT_LANGUAGE) {
  const res = await fetch(`/util/wordlist/${language}.json`);

  if (!res.ok) {
    throw new Error(`Failed to load ${language}.json`);
  }

  const rawWords = await res.json();
  return buildWordDataForHive(rawWords, 3, 7);
}

async function loadPathData() {
  const res = await fetch("path.json");

  if (!res.ok) {
    throw new Error("Failed to load path.json");
  }

  return res.json();
}

function normalizeWord(rawWord, language) {
  let word = String(rawWord).trim();

  // Uppercase using the active language's rules.
  word = word.toLocaleUpperCase(language);

  if (NORMALIZE_ACCENTS[language]) {
    // Preserve Ñ, but remove accents from other letters.
    word = word
      .normalize("NFD")
      .replace(/(?<![Nn])\u0303/g, "")
      .normalize("NFC");
  }

  return word;
}

function buildWordDataForHive(rawWords, minLength = 3, maxLength = 7) {
  const setsByLength = new Map();
  const arraysByLength = new Map();

  for (let length = minLength; length <= maxLength; length++) {
    setsByLength.set(length, new Set());
    arraysByLength.set(length, []);
  }

  // Accept English A-Z and Spanish A-Z plus Ñ.
  const validWordPattern = /^[A-ZÑ]+$/;

  for (const rawWord of rawWords) {
    const word = normalizeWord(rawWord, currentLanguage);

    if (!validWordPattern.test(word)) continue;

    const length = word.length;

    if (length < minLength || length > maxLength) continue;

    const set = setsByLength.get(length);

    if (set.has(word)) continue;

    set.add(word);
    arraysByLength.get(length).push(word);
  }

  return { setsByLength, arraysByLength };
}

// ---------- Game state ----------

const gameState = {
  active: false,
  boardSize: 7,

  targetWord: "",
  targetPath: [],
  boardLetters: [],

  answersByWord: new Map(),
  wordByPathKey: new Map(),
  wordToSlotIndex: new Map(),
  hintSlots: [],

  score: 0,
  highScore: 0,
  timeRemaining: 80,
  wordsFound: 0,
  timerId: null,

  isSwiping: false,
  selectedPath: [],
  startHexIndex: null,

  overlayMode: null
};

let wordData = null;
let pathData = null;

// ---------- Audio ----------

const AudioSFX = (() => {
  let ctx = null;
  let enabled = true;

  const HEX_NOTES = [
    329.63,
    261.63,
    293.66,
    261.63,
    293.66,
    261.63,
    293.66
  ];

  function ensureContext() {
    if (!ctx) {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      if (AudioContextClass) {
        ctx = new AudioContextClass();
      }
    }

    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  }

  function setEnabled(value) {
    enabled = Boolean(value);
  }

  function isEnabled() {
    return enabled;
  }

  function playTone(
    frequency,
    duration = 0.08,
    type = "sine",
    volume = 0.07
  ) {
    if (!enabled) return;

    ensureContext();

    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      ctx.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
  }

  function playChord(notes, noteGap, noteDuration, volume) {
    if (!enabled) return;

    ensureContext();

    if (!ctx) return;

    const now = ctx.currentTime;

    notes.forEach((frequency, index) => {
      const time = now + index * noteGap;

      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = frequency;

      gain.gain.setValueAtTime(volume, time);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        time + noteDuration
      );

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start(time);
      oscillator.stop(time + noteDuration);
    });
  }

  function playGood() {
    playChord(
      [523.25, 659.25, 783.99, 1046.5],
      0.06,
      0.12,
      0.05
    );
  }

  function playBad() {
    if (!enabled) return;

    playTone(200, 0.09, "triangle", 0.06);
    setTimeout(() => playTone(150, 0.12, "triangle", 0.06), 70);
  }

  function playRoundComplete() {
    playChord(
      [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5],
      0.07,
      0.15,
      0.06
    );
  }

  function playGameOver() {
    if (!enabled) return;

    playTone(180, 0.12, "triangle", 0.07);
    setTimeout(() => playTone(140, 0.14, "triangle", 0.07), 110);
    setTimeout(() => playTone(110, 0.18, "triangle", 0.07), 240);
  }

  function playClick() {
    if (!enabled) return;

    playTone(900, 0.04, "square", 0.03);
  }

  function playHexTone(index) {
    const frequency = HEX_NOTES[index];

    if (frequency == null) return;

    playTone(frequency, 0.07, "sine", 0.05);
  }

  return {
    setEnabled,
    isEnabled,
    playGood,
    playBad,
    playRoundComplete,
    playGameOver,
    playClick,
    playHexTone,

    get enabled() {
      return enabled;
    }
  };
})();

// ---------- Initialization ----------

document.addEventListener("DOMContentLoaded", async () => {
  try {
    setLanguage(detectLanguage());

    [wordData, pathData] = await Promise.all([
      loadWordData(currentLanguage),
      loadPathData()
    ]);

    gameState.boardSize = pathData.boardSize || 7;

    const storedHighScore = localStorage.getItem(
      `${GAME_NAME}HighScore`
    );

    if (storedHighScore) {
      gameState.highScore =
        parseInt(storedHighScore, 10) || 0;
    }

    updateHighScoreDisplay(gameState.highScore);
    updateScoreDisplay(0);
    updateTimerDisplay(80);

    attachInputHandlers();
    attachOverlayHandlers();
    attachMuteHandler();
    attachLanguageHandler();
  } catch (error) {
    console.error(error);
    showMessage(t.loadError);
  }
});

// ---------- Round logic ----------

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function isUsablePath(path, expectedLength, boardSize) {
  if (!Array.isArray(path) || path.length !== expectedLength) {
    return false;
  }

  const used = new Set(path);

  if (used.size !== expectedLength) return false;

  return path.every(
    index =>
      Number.isInteger(index) &&
      index >= 0 &&
      index < boardSize
  );
}

function choosePuzzle(words, paths) {
  const boardSize = paths.boardSize || 7;
  const candidateWords = words.arraysByLength.get(boardSize);

  const candidatePaths = (
    paths.paths[String(boardSize)] || []
  ).filter(path =>
    isUsablePath(path, boardSize, boardSize)
  );

  if (!candidateWords || candidateWords.length === 0) {
    throw new Error(
      `No ${boardSize}-letter words in the ${currentLanguage} dictionary.`
    );
  }

  if (candidatePaths.length === 0) {
    throw new Error(
      `No valid ${boardSize}-hex paths in path.json.`
    );
  }

  return {
    targetWord: randomItem(candidateWords),
    targetPath: randomItem(candidatePaths)
  };
}

function createBoardLetters(targetWord, targetPath, boardSize) {
  const boardLetters = Array(boardSize).fill("");

  targetPath.forEach((hexIndex, letterPosition) => {
    boardLetters[hexIndex] = targetWord[letterPosition];
  });

  if (boardLetters.some(letter => !letter)) {
    throw new Error("Target path did not fill all hexes.");
  }

  return boardLetters;
}

function pathKey(path) {
  return path.join("-");
}

function scoreForLength(length) {
  return (length * (length + 1)) / 2;
}

function findAllValidAnswers(boardLetters, words, paths) {
  const boardSize = paths.boardSize || 7;

  const answersByWord = new Map();
  const wordByPathKey = new Map();

  for (let length = 3; length <= boardSize; length++) {
    const validWords = words.setsByLength.get(length);

    if (!validWords || validWords.size === 0) continue;

    const candidatePaths = paths.paths[String(length)] || [];

    for (const path of candidatePaths) {
      if (path.length !== length) continue;
      if (new Set(path).size !== length) continue;

      if (
        !path.every(
          index => index >= 0 && index < boardSize
        )
      ) {
        continue;
      }

      const word = path
        .map(index => boardLetters[index])
        .join("");

      if (!validWords.has(word)) continue;

      const key = pathKey(path);
      wordByPathKey.set(key, word);

      if (!answersByWord.has(word)) {
        answersByWord.set(word, {
          word,
          length,
          score: scoreForLength(length),
          paths: [],
          found: false
        });
      }

      answersByWord.get(word).paths.push(path);
    }
  }

  return { answersByWord, wordByPathKey };
}

function blankBar(length) {
  return Array(length).fill("_").join("");
}

function createHintSlots(answersByWord) {
  const uniqueWords = [...answersByWord.keys()].sort((a, b) => {
    const lengthA = answersByWord.get(a).length;
    const lengthB = answersByWord.get(b).length;

    if (lengthA !== lengthB) {
      return lengthA - lengthB;
    }

    return a.localeCompare(b, currentLanguage);
  });

  const slots = uniqueWords.map((word, index) => {
    const entry = answersByWord.get(word);

    return {
      id: `word-hint-${index}`,
      word,
      length: entry.length,
      found: false
    };
  });

  const wordToSlotIndex = new Map();

  slots.forEach((slot, index) => {
    wordToSlotIndex.set(slot.word, index);
  });

  return { slots, wordToSlotIndex };
}

function buildRound() {
  const { targetWord, targetPath } = choosePuzzle(
    wordData,
    pathData
  );

  const boardLetters = createBoardLetters(
    targetWord,
    targetPath,
    gameState.boardSize
  );

  const { answersByWord, wordByPathKey } =
    findAllValidAnswers(
      boardLetters,
      wordData,
      pathData
    );

  if (!answersByWord.has(targetWord)) {
    throw new Error(
      `Target word "${targetWord}" is not reachable.`
    );
  }

  return {
    targetWord,
    targetPath,
    boardLetters,
    answersByWord,
    wordByPathKey
  };
}

function startRound() {
  const round = buildRound();

  gameState.active = true;
  gameState.targetWord = round.targetWord;
  gameState.targetPath = round.targetPath;
  gameState.boardLetters = round.boardLetters;
  gameState.answersByWord = round.answersByWord;
  gameState.wordByPathKey = round.wordByPathKey;

  const { slots, wordToSlotIndex } = createHintSlots(
    round.answersByWord
  );

  gameState.hintSlots = slots;
  gameState.wordToSlotIndex = wordToSlotIndex;

  gameState.timeRemaining = 80;
  gameState.wordsFound = 0;
  gameState.overlayMode = null;

  renderBoard(gameState.boardLetters);
  renderHintSlots(gameState.hintSlots);

  updateScoreDisplay(gameState.score);
  updateHighScoreDisplay(gameState.highScore);
  updateTimerDisplay(gameState.timeRemaining);

  hideRoundOverlay();
  showMessage("");

  startTimer();
}

function nextRound() {
  gameState.overlayMode = "nextRound";
  revealUnfoundWords();

  showRoundOverlay({
    title: t.greatJob,
    message: t.foundSeven(gameState.score),
    buttonLabel: t.nextRound
  });
}

function endGame() {
  gameState.active = false;
  clearInterval(gameState.timerId);

  saveHighScoreIfNeeded();

  gameState.overlayMode = "gameOver";
  revealUnfoundWords();

  showRoundOverlay({
    title: t.gameOver,
    message: t.noSeven(gameState.score),
    buttonLabel: t.newGame
  });
}

function roundComplete() {
  gameState.active = false;
  clearInterval(gameState.timerId);

  const bonus = 100;
  gameState.score += bonus;

  updateScoreDisplay(gameState.score);
  saveHighScoreIfNeeded();

  gameState.overlayMode = "roundComplete";
  revealUnfoundWords();

  showRoundOverlay({
    title: t.roundComplete,
    message: t.allFound(bonus, gameState.score),
    buttonLabel: t.nextRound
  });
}

function saveHighScoreIfNeeded() {
  if (gameState.score <= gameState.highScore) return;

  gameState.highScore = gameState.score;

  localStorage.setItem(
    `${GAME_NAME}HighScore`,
    String(gameState.highScore)
  );

  updateHighScoreDisplay(gameState.highScore);
}

// ---------- Timer ----------

function clampTimer(value) {
  if (value < 0) return 0;
  if (value > 99) return 99;

  return value;
}

function formatTimer(value) {
  return String(clampTimer(value)).padStart(2, "0");
}

function startTimer() {
  clearInterval(gameState.timerId);

  gameState.timerId = setInterval(() => {
    if (!gameState.active) return;

    gameState.timeRemaining -= 1;
    gameState.timeRemaining = clampTimer(
      gameState.timeRemaining
    );

    updateTimerDisplay(gameState.timeRemaining);

    if (gameState.timeRemaining <= 0) {
      handleTimeUp();
    }
  }, 1000);
}

function handleTimeUp() {
  clearInterval(gameState.timerId);

  const hasSevenLetterWord = [
    ...gameState.answersByWord.values()
  ].some(answer => answer.length === 7 && answer.found);

  if (hasSevenLetterWord) {
    AudioSFX.playRoundComplete();
    nextRound();
  } else {
    AudioSFX.playGameOver();
    endGame();
  }
}

function checkRoundComplete() {
  const allFound = gameState.hintSlots.every(
    slot => slot.found
  );

  if (allFound && gameState.active) {
    AudioSFX.playRoundComplete();
    roundComplete();
  }
}

// ---------- Rendering ----------

function renderBoard(boardLetters) {
  const boardElement = document.getElementById("board");
  boardElement.innerHTML = "";

  boardLetters.forEach((letter, index) => {
    const hex = document.createElement("button");

    hex.type = "button";
    hex.className = `hex hex-${index}`;
    hex.dataset.index = index;
    hex.textContent = letter;
    hex.setAttribute("aria-label", t.hexAria(index));

    boardElement.appendChild(hex);
  });

  updateCurrentWordDisplay();
}

function renderHintSlots(hintSlots) {
  const hintList = document.getElementById("hintList");
  hintList.innerHTML = "";

  hintSlots.forEach(slot => {
    const element = document.createElement("div");

    element.id = slot.id;
    element.className = "word-hint";
    element.dataset.word = slot.word;
    element.dataset.length = slot.length;
    element.textContent = blankBar(slot.length);

    hintList.appendChild(element);
  });
}

function updateScoreDisplay(score) {
  document.getElementById("scoreDisplay").textContent = score;
}

function updateHighScoreDisplay(score) {
  document.getElementById("highScoreDisplay").textContent = score;
}

function updateTimerDisplay(time) {
  document.getElementById("timerDisplay").textContent =
    formatTimer(time);
}

function updateCurrentWordDisplay() {
  const currentWordElement =
    document.getElementById("currentWord");

  if (
    !gameState.isSwiping ||
    gameState.selectedPath.length === 0
  ) {
    currentWordElement.textContent = "";
    return;
  }

  const word = gameState.selectedPath
    .map(index => gameState.boardLetters[index])
    .join("");

  currentWordElement.textContent = word;
}

function showMessage(text) {
  document.getElementById("message").textContent = text || "";
}

function showFeedback(isGood) {
  const feedbackElement =
    document.getElementById("feedback");

  feedbackElement.textContent = isGood ? "🐝" : "👎🏾";
  feedbackElement.classList.remove("show-good", "show-bad");

  void feedbackElement.offsetWidth;

  feedbackElement.classList.add(
    isGood ? "show-good" : "show-bad"
  );
}

function revealUnfoundWords() {
  gameState.hintSlots.forEach(slot => {
    const element = document.getElementById(slot.id);

    if (!element || slot.found) return;

    element.textContent = slot.word;
    element.classList.add("word-hint--unfound");
    element.setAttribute(
      "aria-label",
      t.unfoundWord(slot.word)
    );
  });
}

// ---------- Overlays ----------

function showRoundOverlay({
  title,
  message,
  buttonLabel
}) {
  const overlay =
    document.getElementById("roundOverlay");

  document.getElementById("roundOverlayTitle").textContent =
    title;

  document.getElementById("roundOverlayMessage").textContent =
    message;

  document.getElementById("roundOverlayButton").textContent =
    buttonLabel;

  overlay.hidden = false;
}

function hideRoundOverlay() {
  document.getElementById("roundOverlay").hidden = true;
}

function attachOverlayHandlers() {
  const startButton =
    document.getElementById("startButton");

  startButton.addEventListener("click", () => {
    AudioSFX.playClick();

    document.getElementById("startOverlay").hidden = true;
    startRound();
  });

  const roundButton =
    document.getElementById("roundOverlayButton");

  roundButton.addEventListener("click", () => {
    AudioSFX.playClick();

    const restartModes = [
      "gameOver",
      "nextRound",
      "roundComplete"
    ];

    if (!restartModes.includes(gameState.overlayMode)) {
      return;
    }

    if (gameState.overlayMode === "gameOver") {
      gameState.score = 0;
      updateScoreDisplay(0);
    }

    startRound();
  });
}

// ---------- Language handler ----------

function attachLanguageHandler() {
  const languageButton =
    document.getElementById("languageButton");

  if (!languageButton) return;

  languageButton.textContent =
    currentLanguage === "en" ? "ES" : "EN";

  languageButton.addEventListener("click", () => {
    AudioSFX.playClick();

    const nextLanguage =
      currentLanguage === "en" ? "es" : "en";

    setLanguage(nextLanguage);
    location.reload();
  });
}

// ---------- Mute handler ----------

function attachMuteHandler() {
  const muteButton =
    document.getElementById("muteButton");

  if (!muteButton) return;

  const storedMuted = localStorage.getItem(
    `${GAME_NAME}Muted`
  );

  const initiallyMuted = storedMuted === "true";

  AudioSFX.setEnabled(!initiallyMuted);
  updateMuteButtonState(muteButton, initiallyMuted);

  muteButton.addEventListener("click", () => {
    const newMuted = !AudioSFX.isEnabled();

    AudioSFX.setEnabled(!newMuted);

    localStorage.setItem(
      `${GAME_NAME}Muted`,
      String(newMuted)
    );

    updateMuteButtonState(muteButton, newMuted);
  });
}

function updateMuteButtonState(button, isMuted) {
  button.textContent = isMuted ? "🔇" : "🔊";
  button.setAttribute("aria-pressed", String(isMuted));
}

// ---------- Input handling ----------

function attachInputHandlers() {
  const board = document.getElementById("board");

  board.addEventListener("mousedown", handlePointerDown);
  board.addEventListener(
    "touchstart",
    handlePointerDown,
    { passive: false }
  );

  window.addEventListener("mousemove", handlePointerMove);
  window.addEventListener(
    "touchmove",
    handlePointerMove,
    { passive: false }
  );

  window.addEventListener("mouseup", handlePointerUp);
  window.addEventListener("touchend", handlePointerUp);
}

function getHexIndexFromEvent(event) {
  const target = event.type.startsWith("touch")
    ? document.elementFromPoint(
        event.touches[0].clientX,
        event.touches[0].clientY
      )
    : event.target;

  if (!target || !target.classList.contains("hex")) {
    return null;
  }

  const index = parseInt(target.dataset.index, 10);

  return Number.isNaN(index) ? null : index;
}

function handlePointerDown(event) {
  if (!gameState.active) return;

  event.preventDefault();

  const index = getHexIndexFromEvent(event);

  if (index === null) return;

  AudioSFX.playHexTone(index);

  gameState.isSwiping = true;
  gameState.selectedPath = [index];
  gameState.startHexIndex = index;

  highlightSelectedPath();
  updateCurrentWordDisplay();
}

function handlePointerMove(event) {
  if (!gameState.isSwiping || !gameState.active) return;

  if (event.type.startsWith("touch")) {
    event.preventDefault();
  }

  const index = getHexIndexFromEvent(event);

  if (index === null) return;

  const path = gameState.selectedPath;
  const lastIndex = path[path.length - 1];

  if (index === lastIndex) return;

  const previousIndex =
    path.length > 1 ? path[path.length - 2] : null;

  if (index === previousIndex) {
    path.pop();
    highlightSelectedPath();
    updateCurrentWordDisplay();
    return;
  }

  if (path.includes(index)) return;

  const candidate = [...path, index];

  if (!canPathBeExtended(candidate)) return;

  AudioSFX.playHexTone(index);

  path.push(index);
  highlightSelectedPath();
  updateCurrentWordDisplay();
}

function canPathBeExtended(candidate) {
  const maxLength = gameState.boardSize;

  for (
    let length = candidate.length;
    length <= maxLength;
    length++
  ) {
    const pathsOfLength =
      pathData.paths[String(length)] || [];

    for (const possiblePath of pathsOfLength) {
      const matches = candidate.every(
        (value, position) =>
          value === possiblePath[position]
      );

      if (matches) return true;
    }
  }

  return false;
}

function handlePointerUp(event) {
  if (!gameState.isSwiping || !gameState.active) return;

  event.preventDefault();

  const path = gameState.selectedPath.slice();

  gameState.isSwiping = false;
  gameState.selectedPath = [];
  gameState.startHexIndex = null;

  clearHexHighlights();
  document.getElementById("currentWord").textContent = "";

  if (path.length < 3) return;

  const result = submitPath(path);

  if (!result.accepted) {
    AudioSFX.playBad();
    showFeedback(false);

    if (result.reason === "alreadyFound") {
      showMessage(t.alreadyFound(result.word));
    } else if (result.reason === "notAValidWord") {
      showMessage(t.notAWord);
    } else {
      showMessage(t.invalidPath);
    }

    return;
  }

  AudioSFX.playGood();
  showFeedback(true);

  updateScoreDisplay(gameState.score);
  updateTimerDisplay(gameState.timeRemaining);

  showMessage(
    t.wordPoints(
      result.word,
      result.points,
      result.bonusSeconds
    )
  );

  checkRoundComplete();
}

function highlightSelectedPath() {
  clearHexHighlights();

  const hexes = document.querySelectorAll(".hex");

  gameState.selectedPath.forEach(index => {
    const hex = hexes[index];

    if (hex) {
      hex.classList.add("is-highlighted");
    }
  });
}

function clearHexHighlights() {
  document
    .querySelectorAll(".hex.is-highlighted")
    .forEach(hex =>
      hex.classList.remove("is-highlighted")
    );
}

// ---------- Path submission ----------

function submitPath(selectedPath) {
  if (!gameState.active) {
    return { accepted: false, reason: "inactive" };
  }

  const boardSize = gameState.boardSize;

  if (
    selectedPath.length < 3 ||
    selectedPath.length > boardSize
  ) {
    return { accepted: false, reason: "invalidLength" };
  }

  if (
    new Set(selectedPath).size !== selectedPath.length
  ) {
    return { accepted: false, reason: "reusedHex" };
  }

  const key = pathKey(selectedPath);
  const word = gameState.wordByPathKey.get(key);

  if (!word) {
    return { accepted: false, reason: "notAValidWord" };
  }

  const answer = gameState.answersByWord.get(word);

  if (!answer || answer.found) {
    return {
      accepted: false,
      reason: "alreadyFound",
      word
    };
  }

  answer.found = true;

  const points = answer.score;
  const bonusSeconds = Math.min(
    99 - gameState.timeRemaining,
    Math.floor(points / 3)
  );

  gameState.timeRemaining = clampTimer(
    gameState.timeRemaining + bonusSeconds
  );

  gameState.score += points;
  gameState.wordsFound += 1;

  revealFirstHintForLength(gameState.hintSlots, word);

  return {
    accepted: true,
    word,
    points,
    bonusSeconds,
    isTargetWord: word === gameState.targetWord
  };
}

function revealFirstHintForLength(hintSlots, word) {
  const slotIndex = gameState.wordToSlotIndex.get(word);

  if (slotIndex == null) return false;

  const slot = hintSlots[slotIndex];

  if (!slot) return false;

  slot.found = true;

  const element = document.getElementById(slot.id);

  if (element) {
    element.textContent = word;
    element.classList.add("word-hint--found");
    element.setAttribute(
      "aria-label",
      t.foundWord(word)
    );
  }

  return true;
}