// script.js v260929h

// ---------- Data loading ----------

async function loadWordData(language = "en") {
  const res = await fetch(`/util/wordlist/${language}.json`);
  if (!res.ok) throw new Error(`Failed to load ${language}.json`);

  const rawWords = await res.json();
  return buildWordDataForHive(rawWords, 3, 7);
}

async function loadPathData() {
  const res = await fetch("path.json");
  if (!res.ok) throw new Error("Failed to load path.json");
  return res.json();
}

function buildWordDataForHive(rawWords, minLength = 3, maxLength = 7) {
  const setsByLength = new Map();
  const arraysByLength = new Map();

  for (let len = minLength; len <= maxLength; len++) {
    setsByLength.set(len, new Set());
    arraysByLength.set(len, []);
  }

  for (const raw of rawWords) {
    const word = String(raw).trim().toUpperCase();
    if (!/^[A-Z]+$/.test(word)) continue;

    const len = word.length;
    if (len < minLength || len > maxLength) continue;

    const set = setsByLength.get(len);
    if (set.has(word)) continue;

    set.add(word);
    arraysByLength.get(len).push(word);
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

  answersByWord: new Map(),      // word -> answer entry
  wordByPathKey: new Map(),      // pathKey -> word
  wordToSlotIndex: new Map(),    // word -> index in hintSlots
  hintSlots: [],                 // [{ id, word, length, found }]

  score: 0,
  highScore: 0,
  timeRemaining: 80,
  wordsFound: 0,
  timerId: null,

  isSwiping: false,
  selectedPath: [],
  startHexIndex: null,

  // Overlay state
  overlayMode: null // "gameOver" | "nextRound" | "roundComplete" | null
};

let wordData = null;
let pathData = null;

// ---------- Audio (built‑in beeps) ----------

const AudioSFX = (function () {
  let ctx = null;
  let enabled = true;

  function ensureContext() {
    if (!ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        ctx = new Ctx();
      }
    }
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  }

  function setEnabled(value) {
    enabled = !!value;
  }

  function playTone(freq, duration = 0.08, type = "sine", volume = 0.07) {
    if (!enabled) return;
    ensureContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  function playGood() {
    if (!enabled) return;
    ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const t = now + i * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    });
  }

  function playBad() {
    if (!enabled) return;
    playTone(200, 0.09, "triangle", 0.06);
    setTimeout(() => playTone(150, 0.12, "triangle", 0.06), 70);
  }

  function playRoundComplete() {
    if (!enabled) return;
    ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      const t = now + i * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    });
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

  // Hex touch tones: index -> note
  // 0: mi (E4), 1: do (C4), 2: re (D4), 3: do, 4: re, 5: do, 6: re
  const HEX_NOTES = [
    329.63, // E4 (mi)
    261.63, // C4 (do)
    293.66, // D4 (re)
    261.63, // C4
    293.66, // D4
    261.63, // C4
    293.66  // D4
  ];

  function playHexTone(index) {
    const freq = HEX_NOTES[index];
    if (freq == null) return;
    playTone(freq, 0.07, "sine", 0.05);
  }

  return {
    setEnabled,
    playGood,
    playBad,
    playRoundComplete,
    playGameOver,
    playClick,
    playHexTone
  };
})();

// ---------- Initialization ----------

document.addEventListener("DOMContentLoaded", async () => {
  try {
    [wordData, pathData] = await Promise.all([
      loadWordData("en"),
      loadPathData()
    ]);

    gameState.boardSize = pathData.boardSize || 7;

    const storedHigh = localStorage.getItem("buzzwordHighScore");
    if (storedHigh) {
      gameState.highScore = parseInt(storedHigh, 10) || 0;
    }

    updateHighScoreDisplay(gameState.highScore);
    updateScoreDisplay(0);
    updateTimerDisplay(80);

    attachInputHandlers();
    attachOverlayHandlers();
  } catch (error) {
    console.error(error);
    showMessage("Unable to load Buzzword.");
  }
});

// ---------- Round logic ----------

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function isUsablePath(path, expectedLength, boardSize) {
  if (!Array.isArray(path) || path.length !== expectedLength) return false;
  const used = new Set(path);
  if (used.size !== expectedLength) return false;
  return path.every(
    i => Number.isInteger(i) && i >= 0 && i < boardSize
  );
}

function choosePuzzle(wordData, pathData) {
  const boardSize = pathData.boardSize || 7;
  const candidateWords = wordData.arraysByLength.get(boardSize);
  const candidatePaths = (pathData.paths[String(boardSize)] || []).filter(
    p => isUsablePath(p, boardSize, boardSize)
  );

  if (!candidateWords || candidateWords.length === 0) {
    throw new Error(`No ${boardSize}-letter words in dictionary.`);
  }
  if (candidatePaths.length === 0) {
    throw new Error(`No valid ${boardSize}-hex paths in path.json.`);
  }

  return {
    targetWord: randomItem(candidateWords),
    targetPath: randomItem(candidatePaths)
  };
}

function createBoardLetters(targetWord, targetPath, boardSize) {
  const boardLetters = Array(boardSize).fill("");
  targetPath.forEach((hexIndex, letterPos) => {
    boardLetters[hexIndex] = targetWord[letterPos];
  });
  if (boardLetters.some(l => !l)) {
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

function findAllValidAnswers(boardLetters, wordData, pathData) {
  const boardSize = pathData.boardSize || 7;
  const answersByWord = new Map();
  const wordByPathKey = new Map();

  for (let length = 3; length <= boardSize; length++) {
    const validWords = wordData.setsByLength.get(length);
    if (!validWords || validWords.size === 0) continue;

    const candidatePaths = pathData.paths[String(length)] || [];

    for (const path of candidatePaths) {
      if (path.length !== length) continue;
      if (new Set(path).size !== length) continue;
      if (!path.every(i => i >= 0 && i < boardSize)) continue;

      const word = path.map(i => boardLetters[i]).join("");
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
  return Array(length).fill("_").join(" ");
}

// FIXED: build hint slots from unique words only, and map word -> slot index
function createHintSlots(answersByWord) {
  const uniqueWords = [...answersByWord.keys()].sort((a, b) => {
    const lenA = answersByWord.get(a).length;
    const lenB = answersByWord.get(b).length;
    if (lenA !== lenB) return lenA - lenB;
    return a.localeCompare(b);
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

  // Build word -> slot index map
  const wordToSlotIndex = new Map();
  slots.forEach((slot, i) => {
    wordToSlotIndex.set(slot.word, i);
  });

  return { slots, wordToSlotIndex };
}

function buildRound() {
  const { targetWord, targetPath } = choosePuzzle(wordData, pathData);
  const boardLetters = createBoardLetters(
    targetWord,
    targetPath,
    gameState.boardSize
  );

  const { answersByWord, wordByPathKey } = findAllValidAnswers(
    boardLetters,
    wordData,
    pathData
  );

  if (!answersByWord.has(targetWord)) {
    throw new Error(`Target word "${targetWord}" not reachable.`);
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

  const { slots, wordToSlotIndex } = createHintSlots(round.answersByWord);
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
    title: "Great job!",
    message: `You found a 7‑letter word. Score: ${gameState.score}.`,
    buttonLabel: "Next round"
  });
}

function endGame() {
  gameState.active = false;
  clearInterval(gameState.timerId);

  if (gameState.score > gameState.highScore) {
    gameState.highScore = gameState.score;
    localStorage.setItem("buzzwordHighScore", String(gameState.highScore));
    updateHighScoreDisplay(gameState.highScore);
  }

  gameState.overlayMode = "gameOver";
  revealUnfoundWords();

  showRoundOverlay({
    title: "Game over",
    message: `No 7‑letter word found. Final score: ${gameState.score}.`,
    buttonLabel: "New game"
  });
}

// Round completed by finding all words before time runs out
function roundComplete() {
  gameState.active = false;
  clearInterval(gameState.timerId);

  const bonus = 100;
  gameState.score += bonus;
  updateScoreDisplay(gameState.score);

  if (gameState.score > gameState.highScore) {
    gameState.highScore = gameState.score;
    localStorage.setItem("buzzwordHighScore", String(gameState.highScore));
    updateHighScoreDisplay(gameState.highScore);
  }

  gameState.overlayMode = "roundComplete";
  revealUnfoundWords();

  showRoundOverlay({
    title: "Round complete!",
    message: `All words found! +${bonus} bonus. Score: ${gameState.score}.`,
    buttonLabel: "Next round"
  });
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
    gameState.timeRemaining = clampTimer(gameState.timeRemaining);
    updateTimerDisplay(gameState.timeRemaining);

    if (gameState.timeRemaining <= 0) {
      handleTimeUp();
    }
  }, 1000);
}

function handleTimeUp() {
  clearInterval(gameState.timerId);

  const hasSevenLetterWord = [...gameState.answersByWord.values()].some(
    a => a.length === 7 && a.found
  );

  if (hasSevenLetterWord) {
    AudioSFX.playRoundComplete();
    nextRound();
  } else {
    AudioSFX.playGameOver();
    endGame();
  }
}

// Check if all words are found
function checkRoundComplete() {
  const allFound = gameState.hintSlots.every(slot => slot.found);
  if (allFound && gameState.active) {
    AudioSFX.playRoundComplete();
    roundComplete();
  }
}

// ---------- Rendering ----------

function renderBoard(boardLetters) {
  const boardEl = document.getElementById("board");
  boardEl.innerHTML = "";

  boardLetters.forEach((letter, index) => {
    const hex = document.createElement("button");
    hex.type = "button";
    hex.className = `hex hex-${index}`;
    hex.dataset.index = index;
    hex.textContent = letter;
    hex.setAttribute("aria-label", `Hexagon ${index + 1}`);

    boardEl.appendChild(hex);
  });

  updateCurrentWordDisplay();
}

function renderHintSlots(hintSlots) {
  const hintList = document.getElementById("hintList");
  hintList.innerHTML = "";

  hintSlots.forEach(slot => {
    const el = document.createElement("div");
    el.id = slot.id;
    el.className = "word-hint";
    el.dataset.word = slot.word;
    el.dataset.length = slot.length;
    el.textContent = blankBar(slot.length);
    hintList.appendChild(el);
  });
}

function updateScoreDisplay(score) {
  document.getElementById("scoreDisplay").textContent = score;
}

function updateHighScoreDisplay(score) {
  document.getElementById("highScoreDisplay").textContent = score;
}

function updateTimerDisplay(time) {
  const el = document.getElementById("timerDisplay");
  el.textContent = formatTimer(time);
}

function updateCurrentWordDisplay() {
  const currentWordEl = document.getElementById("currentWord");
  if (!gameState.isSwiping || gameState.selectedPath.length === 0) {
    currentWordEl.textContent = "";
    return;
  }

  const word = gameState.selectedPath
    .map(i => gameState.boardLetters[i])
    .join("");

  currentWordEl.textContent = word;
}

function showMessage(text) {
  const msgEl = document.getElementById("message");
  msgEl.textContent = text || "";
}

function showFeedback(isGood) {
  const feedbackEl = document.getElementById("feedback");

  feedbackEl.textContent = isGood ? "🐝" : "👎🏾";

  feedbackEl.classList.remove("show-good", "show-bad");

  // Force reflow
  // eslint-disable-next-line no-unused-expressions
  void feedbackEl.offsetWidth;

  feedbackEl.classList.add(isGood ? "show-good" : "show-bad");
}

function revealUnfoundWords() {
  gameState.hintSlots.forEach(slot => {
    const el = document.getElementById(slot.id);
    if (!el) return;

    if (!slot.found) {
      el.textContent = slot.word;
      el.classList.add("word-hint--unfound");
      el.setAttribute("aria-label", `Unfound word: ${slot.word}`);
    }
  });
}

// ---------- Overlays ----------

function showRoundOverlay({ title, message, buttonLabel }) {
  const overlay = document.getElementById("roundOverlay");
  const titleEl = document.getElementById("roundOverlayTitle");
  const messageEl = document.getElementById("roundOverlayMessage");
  const buttonEl = document.getElementById("roundOverlayButton");

  titleEl.textContent = title;
  messageEl.textContent = message;
  buttonEl.textContent = buttonLabel;

  overlay.hidden = false;
}

function hideRoundOverlay() {
  const overlay = document.getElementById("roundOverlay");
  overlay.hidden = true;
}

function attachOverlayHandlers() {
  const startButton = document.getElementById("startButton");
  startButton.addEventListener("click", () => {
    AudioSFX.playClick();
    const startOverlay = document.getElementById("startOverlay");
    startOverlay.hidden = true;
    startRound();
  });

  const buttonEl = document.getElementById("roundOverlayButton");
  buttonEl.addEventListener("click", () => {
    AudioSFX.playClick();
    if (
      gameState.overlayMode === "gameOver" ||
      gameState.overlayMode === "nextRound" ||
      gameState.overlayMode === "roundComplete"
    ) {
      if (gameState.overlayMode === "gameOver") {
        gameState.score = 0;
        updateScoreDisplay(0);
      }
      startRound();
    }
  });
}

// ---------- Input handling ----------

function attachInputHandlers() {
  const board = document.getElementById("board");

  board.addEventListener("mousedown", handlePointerDown);
  board.addEventListener("touchstart", handlePointerDown, { passive: false });

  window.addEventListener("mousemove", handlePointerMove);
  window.addEventListener("touchmove", handlePointerMove, { passive: false });

  window.addEventListener("mouseup", handlePointerUp);
  window.addEventListener("touchend", handlePointerUp);
}

function getHexIndexFromEvent(e) {
  const target =
    e.type.startsWith("touch")
      ? document.elementFromPoint(
          e.touches[0].clientX,
          e.touches[0].clientY
        )
      : e.target;

  if (!target || !target.classList.contains("hex")) return null;
  const index = parseInt(target.dataset.index, 10);
  return Number.isNaN(index) ? null : index;
}

function handlePointerDown(e) {
  if (!gameState.active) return;
  e.preventDefault();

  const index = getHexIndexFromEvent(e);
  if (index === null) return;

  // Play per-hex tone
  AudioSFX.playHexTone(index);

  gameState.isSwiping = true;
  gameState.selectedPath = [index];
  gameState.startHexIndex = index;

  highlightSelectedPath();
  updateCurrentWordDisplay();
}

function handlePointerMove(e) {
  if (!gameState.isSwiping || !gameState.active) return;
  if (e.type.startsWith("touch")) e.preventDefault();

  const index = getHexIndexFromEvent(e);
  if (index === null) return;

  const path = gameState.selectedPath;
  const last = path[path.length - 1];

  if (index === last) return;

  const prevIndex = path.length > 1 ? path[path.length - 2] : null;
  if (index === prevIndex) {
    path.pop();
    highlightSelectedPath();
    updateCurrentWordDisplay();
    return;
  }

  if (path.includes(index)) return;

  const candidate = [...path, index];
  const maxLen = gameState.boardSize;

  let hasExtension = false;

  for (let len = candidate.length; len <= maxLen; len++) {
    const pathsOfLen = pathData.paths[String(len)] || [];
    for (const p of pathsOfLen) {
      if (candidate.every((v, i) => v === p[i])) {
        hasExtension = true;
        break;
      }
    }
    if (hasExtension) break;
  }

  if (!hasExtension) return;

  // Play tone for the new hex
  AudioSFX.playHexTone(index);

  path.push(index);
  highlightSelectedPath();
  updateCurrentWordDisplay();
}

function handlePointerUp(e) {
  if (!gameState.isSwiping || !gameState.active) return;
  e.preventDefault();

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
      showMessage(`${result.word} has already been found.`);
    } else if (result.reason === "notAValidWord") {
      showMessage("That path does not make a valid word.");
    } else {
      showMessage("Invalid path.");
    }
    return;
  }

  AudioSFX.playGood();
  showFeedback(true);

  updateScoreDisplay(gameState.score);
  updateTimerDisplay(gameState.timeRemaining);

  showMessage(
    `${result.word}: +${result.points} points, +${result.bonusSeconds} seconds`
  );

  checkRoundComplete();
}

function highlightSelectedPath() {
  clearHexHighlights();
  const hexes = document.querySelectorAll(".hex");

  gameState.selectedPath.forEach(index => {
    const hex = hexes[index];
    if (hex) hex.classList.add("is-highlighted");
  });
}

function clearHexHighlights() {
  document.querySelectorAll(".hex.is-highlighted").forEach(hex => {
    hex.classList.remove("is-highlighted");
  });
}

function disableBoardInput() {
  gameState.active = false;
  gameState.isSwiping = false;
  gameState.selectedPath = [];
  clearHexHighlights();
}

// ---------- Path submission ----------

function submitPath(selectedPath) {
  if (!gameState.active) {
    return { accepted: false, reason: "inactive" };
  }

  const boardSize = gameState.boardSize;
  if (selectedPath.length < 3 || selectedPath.length > boardSize) {
    return { accepted: false, reason: "invalidLength" };
  }

  if (new Set(selectedPath).size !== selectedPath.length) {
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
  const bonusSeconds = Math.min(99 - gameState.timeRemaining, Math.floor(points / 3));
  gameState.timeRemaining = clampTimer(gameState.timeRemaining + bonusSeconds);

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

// FIXED: use wordToSlotIndex to mark the correct slot as found
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
    element.setAttribute("aria-label", `Found word: ${word}`);
  }

  return true;
}