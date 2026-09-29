// script.js v261029a

// ---------- Data loading ----------

async function loadWordData(language = "en") {
  const res = await fetch(`/util/wordlist/${language}.json`);
  if (!res.ok) throw new Error(`Failed to load ${language}.json`);

  const rawWords = await res.json(); // full dictionary, all lengths
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

  answersByWord: new Map(),
  wordByPathKey: new Map(),
  hintSlots: [],

  score: 0,
  timeRemaining: 80,
  wordsFound: 0,
  timerId: null,

  // Swipe state
  isSwiping: false,
  selectedPath: [],
  startHexIndex: null
};

let wordData = null;
let pathData = null;

// ---------- Initialization ----------

document.addEventListener("DOMContentLoaded", async () => {
  try {
    [wordData, pathData] = await Promise.all([
      loadWordData("en"),
      loadPathData()
    ]);

    gameState.boardSize = pathData.boardSize || 7;

    startRound();
    attachInputHandlers();
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

function createHintSlots(answersByWord) {
  return [...answersByWord.values()]
    .sort((a, b) => {
      if (a.length !== b.length) return a.length - b.length;
      return a.word.localeCompare(b.word);
    })
    .map((answer, index) => ({
      id: `word-hint-${index}`,
      word: answer.word,
      length: answer.length,
      found: false
    }));
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

  gameState.hintSlots = createHintSlots(round.answersByWord);

  gameState.timeRemaining = 80;
  gameState.wordsFound = 0;

  renderBoard(gameState.boardLetters);
  renderHintSlots(gameState.hintSlots);

  updateScoreDisplay(gameState.score);
  updateTimerDisplay(gameState.timeRemaining);
  showMessage("");

  startTimer();
}

function completeRound() {
  gameState.active = false;
  clearInterval(gameState.timerId);

  showMessage(
    `Buzzword solved: ${gameState.targetWord}! Total score: ${gameState.score}.`
  );

  disableBoardInput();

  setTimeout(() => {
    startRound();
  }, 1200);
}

function endGame() {
  gameState.active = false;
  clearInterval(gameState.timerId);

  showMessage(
    `Time is up. The hidden word was ${gameState.targetWord}.`
  );

  disableBoardInput();
}

// ---------- Timer ----------

function startTimer() {
  clearInterval(gameState.timerId);
  gameState.timerId = setInterval(() => {
    if (!gameState.active) return;

    gameState.timeRemaining -= 1;
    updateTimerDisplay(gameState.timeRemaining);

    if (gameState.timeRemaining <= 0) {
      endGame();
    }
  }, 1000);
}

// ---------- Rendering ----------

function renderBoard(boardLetters) {
  const boardEl = document.getElementById("board");
  boardEl.innerHTML = "";

  const positions = getHexPositions(gameState.boardSize);

  boardLetters.forEach((letter, index) => {
    const hex = document.createElement("div");
    hex.className = "hex";
    hex.textContent = letter;
    hex.dataset.index = index;

    const pos = positions[index];
    hex.style.left = `${pos.left}px`;
    hex.style.top = `${pos.top}px`;

    boardEl.appendChild(hex);
  });

  updateCurrentWordDisplay();
}

function getHexPositions(boardSize) {
  // 7-hex honeycomb (pointy-top), indices:
  //       [0] [1]
  //    [2] [3] [4]
  //       [5] [6]

  const hexSize = parseInt(
    getComputedStyle(document.documentElement)
      .getPropertyValue("--hex-size")
  ) || 60;

  const gap = parseInt(
    getComputedStyle(document.documentElement)
      .getPropertyValue("--hex-gap")
  ) || 6;

  const w = hexSize * 2;                 // full width of hex
  const h = hexSize * 1.732;             // full height (sqrt(3))
  const rowHeight = h * 0.75;            // vertical step
  const halfW = w / 2;

  const positions = [];

  // Row 0: 0,1
  positions[0] = { left: halfW + gap, top: gap };
  positions[1] = { left: halfW * 3 + gap * 2, top: gap };

  // Row 1: 2,3,4 (shifted left by halfW relative to row 0)
  positions[2] = { left: 0 + gap, top: rowHeight + gap };
  positions[3] = { left: halfW + gap, top: rowHeight + gap };
  positions[4] = { left: halfW * 3 + gap * 2, top: rowHeight + gap };

  // Row 2: 5,6 (aligned with row 0)
  positions[5] = { left: halfW + gap, top: rowHeight * 2 + gap };
  positions[6] = { left: halfW * 3 + gap * 2, top: rowHeight * 2 + gap };

  return positions;
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

function updateTimerDisplay(time) {
  document.getElementById("timerDisplay").textContent = Math.max(0, time);
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

  // Force reflow to restart animation
  // eslint-disable-next-line no-unused-expressions
  void feedbackEl.offsetWidth;

  feedbackEl.classList.add(isGood ? "show-good" : "show-bad");
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

  if (!hasExtension) {
    return;
  }

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

  if (path.length < 3) {
    return;
  }

  const result = submitPath(path);

  if (!result.accepted) {
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

  showFeedback(true);

  updateScoreDisplay(gameState.score);
  updateTimerDisplay(gameState.timeRemaining);

  showMessage(
    `${result.word}: +${result.points} points, +${result.bonusSeconds} seconds`
  );

  if (result.isTargetWord) {
    completeRound();
  }
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
  const bonusSeconds = Math.floor(points / 3);

  gameState.score += points;
  gameState.timeRemaining += bonusSeconds;
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
  const slot = hintSlots.find(item => !item.found && item.length === word.length);
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