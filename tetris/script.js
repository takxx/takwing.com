(() => {
  "use strict";

  // === DOM references ===
  const langSelect = document.getElementById("lang");
  const muteBtn = document.getElementById("mute");
  const bgm = document.getElementById("bgm");

  const board = document.getElementById("board");
  const ctx = board.getContext("2d");

  const nextCanvas = document.getElementById("next");
  const nctx = nextCanvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const levelEl = document.getElementById("level");
  const linesEl = document.getElementById("lines");
  const startBtn = document.getElementById("start");
  const pauseBtn = document.getElementById("pause");

  const gameOverDialog = document.getElementById("game-over-dialog");
  const gameOverMessage = document.getElementById("game-over-message");
  const gameOverRestart = document.getElementById("game-over-restart");

  // === Internationalization ===
  const translations = {
    en: {
      title: "Tetris",
      score: "Score",
      level: "Level",
      lines: "Lines",
      startRestart: "(Re)start",
      pause: "Pause",
      resume: "Resume",
      keysHint: "Keys: ← → ↓ rotate: X/Z or ↑ • Space hard drop • P pause",
      ctrlTouch:
        "Touch: swipe left/right/up/down to move/rotate/soft drop; double-tap for hard drop",
      language: "Language",
      soundOn: "Sound On",
      soundOff: "Sound Off",
      gameOver: "Game Over"
    },

    es: {
      title: "Tetris",
      score: "Puntuación",
      level: "Nivel",
      lines: "Líneas",
      startRestart: "(Re)iniciar",
      pause: "Pausa",
      resume: "Continuar",
      keysHint:
        "Teclas: ← → ↓ rotar: X/Z o ↑ • Espacio caída rápida • P pausa",
      ctrlTouch:
        "Táctil: desliza izquierda/derecha/arriba/abajo para mover/rotar/caída suave; doble toque para caída rápida",
      language: "Idioma",
      soundOn: "Sonido activado",
      soundOff: "Sonido desactivado",
      gameOver: "Fin de la partida"
    },

    "zh-TW": {
      title: "俄羅斯方塊",
      score: "分數",
      level: "等級",
      lines: "行數",
      startRestart: "(重新)開始",
      pause: "暫停",
      resume: "繼續",
      keysHint: "按鍵：← → ↓ 旋轉：X/Z 或 ↑ • 空格快速落下 • P 暫停",
      ctrlTouch:
        "觸控：向左／右／上／下滑動來移動／旋轉／緩慢落下；輕點兩次快速落下",
      language: "語言",
      soundOn: "聲音開啟",
      soundOff: "聲音關閉",
      gameOver: "遊戲結束"
    }
  };

  function detectLanguage() {
    const navLang = (navigator.language || "").toLowerCase();

    if (
      navLang.startsWith("zh-tw") ||
      navLang.startsWith("zh-hant") ||
      navLang.startsWith("zh")
    ) {
      return "zh-TW";
    }

    if (navLang.startsWith("es")) {
      return "es";
    }

    return "en";
  }

  let currentLang = detectLanguage();

  function getTranslation(key) {
    const language = translations[currentLang] || translations.en;
    return language[key] || translations.en[key] || key;
  }

  function applyLanguage(lang) {
    currentLang = translations[lang] ? lang : "en";
    document.documentElement.lang = currentLang === "zh-TW" ? "zh-Hant" : currentLang;

    const t = translations[currentLang];

    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.getAttribute("data-i18n");
      if (t[key]) {
        element.textContent = t[key];
      }
    });

    updateMuteButtonText();
    updatePauseButtonText();

    if (!gameOverDialog.hidden) {
      gameOverMessage.textContent = getTranslation("gameOver");
      gameOverRestart.textContent = getTranslation("startRestart");
    }
  }

  // === Audio ===
  let audioCtx = null;
  let isMuted = true;
  let bgmStarted = false;

  function initAudio() {
    if (audioCtx) {
      return;
    }

    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    audioCtx = new AudioContextClass();
  }

  function resumeAudio() {
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
  }

  function updateMuteButtonText() {
    const t = translations[currentLang] || translations.en;

    if (!muteBtn) {
      return;
    }

    muteBtn.innerHTML = isMuted
      ? `🔇 <span>${t.soundOff}</span>`
      : `🔊 <span>${t.soundOn}</span>`;

    muteBtn.classList.toggle("muted", isMuted);
    muteBtn.setAttribute("aria-pressed", String(!isMuted));
  }

  function setMuted(muted) {
    isMuted = muted;

    if (bgm) {
      bgm.muted = muted;

      if (muted) {
        bgm.pause();
        bgmStarted = false;
      } else if (!gameOver && !paused) {
        ensureBGMPlaying();
      }
    }

    updateMuteButtonText();
  }

  function ensureBGMPlaying() {
    if (!bgm || isMuted || bgmStarted || gameOver || paused) {
      return;
    }

    bgm.play()
      .then(() => {
        bgmStarted = true;
      })
      .catch(() => {
        bgmStarted = false;
      });
  }

  function playTone(
    frequency,
    duration,
    type = "sine",
    volume = 0.12,
    delay = 0
  ) {
    if (!audioCtx || isMuted) {
      return;
    }

    const startTime = audioCtx.currentTime + delay;
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(volume, 0.001),
      startTime + 0.015
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      startTime + duration
    );

    oscillator.connect(gain);
    gain.connect(audioCtx.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.03);
  }

  function playClearSound() {
    if (!audioCtx || isMuted) {
      return;
    }

    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
      playTone(
        frequency,
        0.13,
        "sine",
        0.07,
        index * 0.06
      );
    });
  }

  function playGameOverSound() {
    if (!audioCtx || isMuted) {
      return 0;
    }

    const notes = [392.0, 349.23, 329.63, 261.63];
    const noteDuration = 0.28;
    const noteGap = 0.13;
    const totalDuration =
      (notes.length - 1) * noteGap + noteDuration;

    notes.forEach((frequency, index) => {
      playTone(
        frequency,
        noteDuration,
        "sine",
        0.18,
        index * noteGap
      );
    });

    return totalDuration;
  }

  if (muteBtn) {
    muteBtn.addEventListener("click", () => {
      initAudio();
      resumeAudio();
      setMuted(!isMuted);
    });
  }

  // === Game-over dialog ===
  function showGameOverDialog() {
    gameOverMessage.textContent = getTranslation("gameOver");
    gameOverRestart.textContent = getTranslation("startRestart");
    gameOverDialog.hidden = false;
    gameOverRestart.focus();
  }

  function hideGameOverDialog() {
    gameOverDialog.hidden = true;
  }

  gameOverRestart.addEventListener("click", () => {
    hideGameOverDialog();
    startGame();
  });

  // === Tetris constants and state ===
  const COLS = 10;
  const ROWS = 20;
  const CELL = 30;

  board.width = COLS * CELL;
  board.height = ROWS * CELL;

  nextCanvas.width = 96;
  nextCanvas.height = 72;

  // Modern, softer palette
  const COLORS = {
    I: "#48C6D9",
    J: "#6878D9",
    L: "#E9A15B",
    O: "#E7C75D",
    S: "#70B98A",
    T: "#B47CC7",
    Z: "#D97979"
  };

  const SHAPES = {
    I: [
      [[0, 1], [1, 1], [2, 1], [3, 1]],
      [[2, 0], [2, 1], [2, 2], [2, 3]]
    ],

    J: [
      [[0, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [2, 0], [1, 1], [1, 2]],
      [[0, 1], [1, 1], [2, 1], [2, 2]],
      [[1, 0], [1, 1], [1, 2], [0, 2]]
    ],

    L: [
      [[2, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [1, 1], [1, 2], [2, 2]],
      [[0, 1], [1, 1], [2, 1], [0, 2]],
      [[0, 0], [1, 0], [1, 1], [1, 2]]
    ],

    O: [
      [[1, 0], [2, 0], [1, 1], [2, 1]]
    ],

    S: [
      [[1, 0], [2, 0], [0, 1], [1, 1]],
      [[1, 0], [1, 1], [2, 1], [2, 2]]
    ],

    T: [
      [[1, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [1, 1], [2, 1], [1, 2]],
      [[0, 1], [1, 1], [2, 1], [1, 2]],
      [[1, 0], [0, 1], [1, 1], [1, 2]]
    ],

    Z: [
      [[0, 0], [1, 0], [1, 1], [2, 1]],
      [[2, 0], [1, 1], [2, 1], [1, 2]]
    ]
  };

  function makeEmptyBoard() {
    return Array.from(
      { length: ROWS },
      () => Array(COLS).fill(null)
    );
  }

  let grid = makeEmptyBoard();
  let cur = null;
  let next = null;

  let score = 0;
  let level = 1;
  let lines = 0;

  let dropInterval = 800;
  let dropTimer = 0;
  let lastTime = 0;

  let gameOver = false;
  let paused = false;
  let gameOverDialogPending = false;

  function randomPiece() {
    const types = Object.keys(SHAPES);
    const type = types[Math.floor(Math.random() * types.length)];

    return {
      type,
      rot: 0,
      x: 3,
      y: -1,
      shape: SHAPES[type]
    };
  }

  function clonePiece(piece) {
    return {
      type: piece.type,
      rot: piece.rot,
      x: piece.x,
      y: piece.y,
      shape: piece.shape
    };
  }

  function getBlocks(piece, rotation = piece.rot) {
    return piece.shape[rotation % piece.shape.length];
  }

  function collision(piece, dx = 0, dy = 0, drot = 0) {
    const rotation =
      (piece.rot + drot + piece.shape.length) %
      piece.shape.length;

    const blocks = getBlocks(piece, rotation);

    for (const [blockX, blockY] of blocks) {
      const x = piece.x + blockX + dx;
      const y = piece.y + blockY + dy;

      if (x < 0 || x >= COLS || y >= ROWS) {
        return true;
      }

      if (y >= 0 && grid[y][x]) {
        return true;
      }
    }

    return false;
  }

  function place(piece) {
    for (const [blockX, blockY] of getBlocks(piece)) {
      const x = piece.x + blockX;
      const y = piece.y + blockY;

      if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
        grid[y][x] = piece.type;
      }
    }

    clearLines();
    spawn();
  }

  function clearLines() {
    let removed = 0;

    outer:
    for (let y = ROWS - 1; y >= 0; y--) {
      for (let x = 0; x < COLS; x++) {
        if (!grid[y][x]) {
          continue outer;
        }
      }

      grid.splice(y, 1);
      grid.unshift(Array(COLS).fill(null));
      removed++;
      y++;
    }

    if (!removed) {
      return;
    }

    lines += removed;
    score += [0, 40, 100, 300, 1200][removed] * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(80, 800 - (level - 1) * 60);

    scoreEl.textContent = String(score);
    levelEl.textContent = String(level);
    linesEl.textContent = String(lines);

    playClearSound();
  }

  function stopBGM() {
    if (!bgm) {
      return;
    }

    bgm.pause();
    bgmStarted = false;
  }

  function spawn() {
    cur = next || randomPiece();
    next = randomPiece();

    cur.x = 3;
    cur.y = -1;
    cur.rot = 0;

    if (!collision(cur)) {
      return;
    }

    gameOver = true;
    paused = true;
    stopBGM();

    if (gameOverDialogPending) {
      return;
    }

    gameOverDialogPending = true;

    initAudio();
    resumeAudio();

    playGameOverSound();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        gameOverDialogPending = false;
        showGameOverDialog();
      });
    });
  }

  function rotate(direction = 1) {
    if (!cur || gameOver || paused) {
      return;
    }

    const length = cur.shape.length;
    const kicks = [
      [0, 0],
      [-1, 0],
      [1, 0],
      [-2, 0],
      [2, 0]
    ];

    for (const [dx] of kicks) {
      if (!collision(cur, dx, 0, direction)) {
        cur.x += dx;
        cur.rot =
          (cur.rot + direction + length) % length;
        return;
      }
    }
  }

  function hardDrop() {
    if (!cur || gameOver || paused) {
      return;
    }

    while (!collision(cur, 0, 1)) {
      cur.y++;
    }

    place(cur);
  }

  function move(dx) {
    if (!cur || gameOver || paused) {
      return;
    }

    if (!collision(cur, dx, 0)) {
      cur.x += dx;
    }
  }

  function softDrop() {
    if (!cur || gameOver || paused) {
      return;
    }

    if (!collision(cur, 0, 1)) {
      cur.y++;
    } else {
      place(cur);
    }
  }

  function startGame() {
    initAudio();
    resumeAudio();
    hideGameOverDialog();

    grid = makeEmptyBoard();
    score = 0;
    level = 1;
    lines = 0;

    dropInterval = 800;
    dropTimer = 0;
    lastTime = 0;

    gameOver = false;
    paused = false;
    gameOverDialogPending = false;

    scoreEl.textContent = "0";
    levelEl.textContent = "1";
    linesEl.textContent = "0";

    next = randomPiece();
    spawn();

    if (!isMuted) {
      ensureBGMPlaying();
    }

    updatePauseButtonText();
  }

  function updatePauseButtonText() {
    if (!pauseBtn) {
      return;
    }

    pauseBtn.textContent = paused
      ? getTranslation("resume")
      : getTranslation("pause");
  }

  function togglePause() {
    if (gameOver) {
      return;
    }

    paused = !paused;
    updatePauseButtonText();

    if (paused) {
      stopBGM();
    } else if (!isMuted) {
      ensureBGMPlaying();
    }
  }

  function tick(timestamp) {
    if (!lastTime) {
      lastTime = timestamp;
    }

    const delta = timestamp - lastTime;
    lastTime = timestamp;

    if (!paused && !gameOver && cur) {
      dropTimer += delta;

      if (dropTimer >= dropInterval) {
        dropTimer = 0;

        if (!collision(cur, 0, 1)) {
          cur.y++;
        } else {
          place(cur);
        }
      }
    }

    draw();
    requestAnimationFrame(tick);
  }

  // === Drawing helpers ===

  function drawCell(x, y, color, targetCtx = ctx, cellSize = CELL) {
    targetCtx.fillStyle = color;
    targetCtx.fillRect(
      x * cellSize + 1,
      y * cellSize + 1,
      cellSize - 2,
      cellSize - 2
    );

    targetCtx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    targetCtx.lineWidth = 1;
    targetCtx.strokeRect(
      x * cellSize + 0.5,
      y * cellSize + 0.5,
      cellSize - 1,
      cellSize - 1
    );
  }

  function withAlpha(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function drawNextSilhouetteOnBoard() {
    if (!next || !cur) {
      return;
    }

    // Place silhouette near the top of the board
    const silhouetteY = 1;
    const blocks = getBlocks(next, 0);

    const minX = Math.min(...blocks.map(([x]) => x));
    const maxX = Math.max(...blocks.map(([x]) => x));
    const pieceWidth = maxX - minX + 1;

    // Center horizontally
    const silhouetteX = Math.floor((COLS - pieceWidth) / 2) - minX;

    for (const [blockX, blockY] of blocks) {
      const x = silhouetteX + blockX;
      const y = silhouetteY + blockY;

      if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
        // Very subtle silhouette
        ctx.fillStyle = withAlpha(COLORS[next.type], 0.1);
        ctx.fillRect(
          x * CELL + 2,
          y * CELL + 2,
          CELL - 4,
          CELL - 4
        );

        ctx.strokeStyle = withAlpha(COLORS[next.type], 0.08);
        ctx.strokeRect(
          x * CELL + 1.5,
          y * CELL + 1.5,
          CELL - 3,
          CELL - 3
        );
      }
    }
  }

  function drawGrid() {
    ctx.clearRect(0, 0, board.width, board.height);

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const type = grid[y][x];

        if (type) {
          drawCell(x, y, COLORS[type]);
        } else {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.035)";
          ctx.strokeRect(
            x * CELL + 0.5,
            y * CELL + 0.5,
            CELL - 1,
            CELL - 1
          );
        }
      }
    }

    if (!cur) {
      return;
    }

    const ghost = clonePiece(cur);

    while (!collision(ghost, 0, 1)) {
      ghost.y++;
    }

    for (const [blockX, blockY] of getBlocks(ghost)) {
      const x = ghost.x + blockX;
      const y = ghost.y + blockY;

      if (y >= 0) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.075)";
        ctx.fillRect(
          x * CELL + 1,
          y * CELL + 1,
          CELL - 2,
          CELL - 2
        );
      }
    }

    for (const [blockX, blockY] of getBlocks(cur)) {
      const x = cur.x + blockX;
      const y = cur.y + blockY;

      if (y >= 0) {
        drawCell(x, y, COLORS[cur.type]);
      }
    }

    // Subtle silhouette of the next piece on the board
    drawNextSilhouetteOnBoard();
  }

  function drawNext() {
    nctx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);

    if (!next) {
      return;
    }

    const cellSize = 14;
    const blocks = getBlocks(next, 0);

    const minX = Math.min(...blocks.map(([x]) => x));
    const maxX = Math.max(...blocks.map(([x]) => x));
    const minY = Math.min(...blocks.map(([, y]) => y));
    const maxY = Math.max(...blocks.map(([, y]) => y));

    const pieceWidth = (maxX - minX + 1) * cellSize;
    const pieceHeight = (maxY - minY + 1) * cellSize;

    const offsetX =
      (nextCanvas.width - pieceWidth) / 2 - minX * cellSize;
    const offsetY =
      (nextCanvas.height - pieceHeight) / 2 - minY * cellSize;

    for (const [blockX, blockY] of blocks) {
      nctx.fillStyle = COLORS[next.type];
      nctx.fillRect(
        offsetX + blockX * cellSize + 1,
        offsetY + blockY * cellSize + 1,
        cellSize - 2,
        cellSize - 2
      );

      nctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
      nctx.strokeRect(
        offsetX + blockX * cellSize + 0.5,
        offsetY + blockY * cellSize + 0.5,
        cellSize - 1,
        cellSize - 1
      );
    }
  }

  function draw() {
    drawGrid();
    drawNext();
  }

  // === Keyboard controls ===
  window.addEventListener("keydown", (event) => {
    if (event.repeat) {
      return;
    }

    initAudio();
    resumeAudio();

    switch (event.key) {
      case "ArrowLeft":
        move(-1);
        break;

      case "ArrowRight":
        move(1);
        break;

      case "ArrowDown":
        softDrop();
        break;

      case " ":
        event.preventDefault();
        hardDrop();
        break;

      case "ArrowUp":
      case "x":
      case "X":
        rotate(1);
        break;

      case "z":
      case "Z":
        rotate(-1);
        break;

      case "p":
      case "P":
        togglePause();
        break;

      default:
        break;
    }
  });

  startBtn.addEventListener("click", startGame);
  pauseBtn.addEventListener("click", togglePause);

  langSelect.addEventListener("change", () => {
    applyLanguage(langSelect.value);
  });

// === Touch controls ===

let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

let longPressTimer = null;
let longPressSpeed = 200;
let longPressActive = false;

const SWIPE_THRESHOLD = 30;
const TAP_MAX_MOVE = 10;
const TAP_MAX_TIME = 250;
const LONGPRESS_DELAY = 350;

function clearLongPress() {
  if (longPressTimer !== null) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }

  longPressActive = false;
  longPressSpeed = 200;
}

function startLongPressDrop() {
  if (!cur || gameOver || paused) {
    clearLongPress();
    return;
  }

  if (!collision(cur, 0, 1)) {
    cur.y++;
  } else {
    place(cur);
    clearLongPress();
    return;
  }

  longPressSpeed = Math.max(60, longPressSpeed * 0.85);

  longPressTimer = setTimeout(
    startLongPressDrop,
    longPressSpeed
  );
}

function preventBoardGesture(event) {
  /*
   * This is deliberately called on every touch event.
   * On iOS, preventing only touchmove can be too late for a
   * stationary double tap.
   */
  event.preventDefault();
}

function handleBoardTouchStart(event) {
  preventBoardGesture(event);

  if (event.touches.length !== 1) {
    clearLongPress();
    return;
  }

  const touch = event.touches[0];

  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  touchStartTime = performance.now();

  clearLongPress();

  initAudio();
  resumeAudio();

  longPressTimer = setTimeout(() => {
    if (gameOver || paused) {
      clearLongPress();
      return;
    }

    longPressActive = true;
    startLongPressDrop();
  }, LONGPRESS_DELAY);
}

function handleBoardTouchMove(event) {
  preventBoardGesture(event);

  if (event.touches.length !== 1) {
    clearLongPress();
    return;
  }

  const touch = event.touches[0];

  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;

  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  if (absX > TAP_MAX_MOVE || absY > TAP_MAX_MOVE) {
    clearLongPress();
  }
}

function handleBoardTouchEnd(event) {
  preventBoardGesture(event);

  if (event.changedTouches.length !== 1) {
    clearLongPress();
    return;
  }

  const touch = event.changedTouches[0];

  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;

  const duration = performance.now() - touchStartTime;

  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  const wasLongPress = longPressActive;

  clearLongPress();

  /*
   * A long press is soft drop only. Do not also treat its release
   * as a tap or swipe.
   */
  if (wasLongPress) {
    return;
  }

  /*
   * One tap rotates once. Therefore two quick taps rotate twice.
   * preventDefault() above stops iOS from interpreting the pair
   * as page zoom.
   */
  if (
    duration < TAP_MAX_TIME &&
    absX < TAP_MAX_MOVE &&
    absY < TAP_MAX_MOVE
  ) {
    rotate(1);
    return;
  }

  /*
   * Swipes.
   */
  if (absX > SWIPE_THRESHOLD || absY > SWIPE_THRESHOLD) {
    if (absX > absY) {
      move(dx > 0 ? 1 : -1);
    } else if (dy > 0) {
      softDrop();
    } else {
      rotate(1);
    }
  }
}

function handleBoardTouchCancel(event) {
  preventBoardGesture(event);
  clearLongPress();
}

/*
 * The listeners must be passive: false, otherwise iOS may ignore
 * preventDefault().
 */
board.addEventListener(
  "touchstart",
  handleBoardTouchStart,
  { passive: false }
);

board.addEventListener(
  "touchmove",
  handleBoardTouchMove,
  { passive: false }
);

board.addEventListener(
  "touchend",
  handleBoardTouchEnd,
  { passive: false }
);

board.addEventListener(
  "touchcancel",
  handleBoardTouchCancel,
  { passive: false }
);

/*
 * Prevent Safari gesture events as an additional safeguard.
 * These are page-level listeners because Safari can dispatch
 * gesture events outside the canvas target.
 */
["gesturestart", "gesturechange", "gestureend"].forEach((type) => {
  document.addEventListener(
    type,
    (event) => {
      event.preventDefault();
    },
    { passive: false }
  );
});

  // === Initialization ===
  langSelect.value = currentLang;
  applyLanguage(currentLang);

  next = randomPiece();
  spawn();

  requestAnimationFrame(tick);
})();