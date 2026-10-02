(() => {
  const waypointSymbols = [
    "❶",
    "❷",
    "❸",
    "❹",
    "❺",
    "❻",
    "❼",
    "❽",
    "❾"
  ];

  const translations = {
    en: {
      gameName: "Wooden Labyrinth",
      startTitle: "Ready to play?",
      startText:
        "Tilt the board to guide the ball through every waypoint and reach the endpoint. Avoid the holes.",
      holeTitle: "The ball fell into a hole",
      holeText:
        "Your progress has been reset. You can replay this board or start a new game.",
      winTitle: "You win!",
      winText:
        "You reached the endpoint successfully. You can replay this board or start a new game.",
      actions: {
        startGame: "Start game",
        replay: "Replay",
        newGame: "Start new game"
      }
    },

    es: {
      gameName: "Laberinto de Madera",
      startTitle: "¿Listo para jugar?",
      startText:
        "Inclina el tablero para guiar la bola por todos los puntos de paso y llegar al final. Evita los agujeros.",
      holeTitle: "La bola cayó en un agujero",
      holeText:
        "Tu progreso se ha reiniciado. Puedes volver a jugar este tablero o empezar una partida nueva.",
      winTitle: "¡Has ganado!",
      winText:
        "Has llegado al final correctamente. Puedes volver a jugar este tablero o empezar una partida nueva.",
      actions: {
        startGame: "Empezar partida",
        replay: "Volver a jugar",
        newGame: "Nueva partida"
      }
    },

    zh: {
      gameName: "木質迷宮",
      startTitle: "準備好未？",
      startText:
        "傾斜棋盤，引導粒子經過所有路點，直到終點。小心不要掉入洞中。",
      holeTitle: "粒子跌入洞中",
      holeText:
        "你的進度已被重設。你可以再玩這個棋盤或開始新的一局。",
      winTitle: "你贏了！",
      winText:
        "你成功到達終點。你可以再玩一次或開始新的一局。",
      actions: {
        startGame: "開始遊戲",
        replay: "再玩一次",
        newGame: "開始新一局"
      }
    }
  };

  function getLanguage() {
    const supported = ["en", "es", "zh"];
    const queryLanguage =
      new URLSearchParams(window.location.search).get("lang");

    if (supported.includes(queryLanguage)) {
      return queryLanguage;
    }

    const browserLanguages = [
      ...(navigator.languages || []),
      navigator.language
    ]
      .filter(Boolean)
      .map(language => language.toLowerCase());

    for (const language of browserLanguages) {
      if (language === "es" || language.startsWith("es-")) {
        return "es";
      }

      if (language === "zh" || language.startsWith("zh-")) {
        return "zh";
      }

      if (language === "en" || language.startsWith("en-")) {
        return "en";
      }
    }

    return "en";
  }

  const currentLocale = getLanguage();
  const text = translations[currentLocale];

  document.documentElement.lang =
    currentLocale === "zh" ? "zh-Hant" : currentLocale;

  document.title = text.gameName;

  const board = document.getElementById("board");
  const holesLayer = document.getElementById("holesLayer");
  const wallsLayer = document.getElementById("wallsLayer");
  const markersLayer = document.getElementById("markersLayer");
  const ballEl = document.getElementById("ball");

  const gameScreen = document.getElementById("gameScreen");
  const messageTitle = document.getElementById("messageTitle");
  const messageText = document.getElementById("messageText");
  const primaryAction = document.getElementById("primaryAction");
  const secondaryAction = document.getElementById("secondaryAction");

  let currentBoard;
  let startPos;
  let endPos;
  let waypointPositions;
  let holeCells;
  let vWalls;
  let hWalls;

  let startMarkerEl;
  let endMarkerEl;
  let waypointMarkerEls = [];

  let nextWaypointIndex = 0;
  let gameFinished = false;
  let ballFalling = false;
  let gameStarted = false;

  /*
   * Web Audio sound system.
   */
  let audioContext = null;
  let masterGain = null;

  function ensureAudio() {
    if (!audioContext) {
      const AudioContext =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContext) {
        return false;
      }

      audioContext = new AudioContext();
      masterGain = audioContext.createGain();
      masterGain.gain.value = 0.9;
      masterGain.connect(audioContext.destination);
    }

    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }

    return true;
  }

  function playTone({
    frequency,
    endFrequency = frequency,
    duration = 0.16,
    volume = 0.2,
    type = "sine",
    delay = 0
  }) {
    if (!ensureAudio()) {
      return;
    }

    const startTime = audioContext.currentTime + delay;
    const endTime = startTime + duration;

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = type;

    oscillator.frequency.setValueAtTime(
      frequency,
      startTime
    );

    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, endFrequency),
      endTime
    );

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, volume),
      startTime + Math.min(0.018, duration * 0.2)
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      endTime
    );

    oscillator.connect(gain);
    gain.connect(masterGain);

    oscillator.start(startTime);
    oscillator.stop(endTime + 0.02);
  }

  function playWaypointSound() {
    playTone({
      frequency: 620,
      endFrequency: 900,
      duration: 0.12,
      volume: 0.22,
      type: "sine"
    });

    playTone({
      frequency: 930,
      endFrequency: 1180,
      duration: 0.16,
      volume: 0.18,
      type: "sine",
      delay: 0.08
    });
  }

  function playWallBounceSound() {
    playTone({
      frequency: 115,
      endFrequency: 78,
      duration: 0.055,
      volume: 0.045,
      type: "triangle"
    });

    if ("vibrate" in navigator) {
      try {
        navigator.vibrate(18);
      } catch {
        // Vibration is optional and may be unavailable.
      }
    }
  }

  function playHoleSound() {
    playTone({
      frequency: 260,
      endFrequency: 75,
      duration: 0.55,
      volume: 0.28,
      type: "sawtooth"
    });

    playTone({
      frequency: 120,
      endFrequency: 42,
      duration: 0.7,
      volume: 0.16,
      type: "sine",
      delay: 0.03
    });
  }

  function playWinSound() {
    playTone({
      frequency: 523.25,
      endFrequency: 523.25,
      duration: 0.18,
      volume: 0.2,
      type: "sine"
    });

    playTone({
      frequency: 659.25,
      endFrequency: 659.25,
      duration: 0.18,
      volume: 0.22,
      type: "sine",
      delay: 0.13
    });

    playTone({
      frequency: 783.99,
      endFrequency: 783.99,
      duration: 0.3,
      volume: 0.25,
      type: "sine",
      delay: 0.26
    });
  }

  function cellId(id) {
    const number = Number(id);

    return {
      row: Math.floor(number / 10),
      col: number % 10
    };
  }

  function intersection(spec) {
    const [firstId, secondId] = spec.split("-");
    const first = cellId(firstId);
    const second = cellId(secondId);

    if (
      second.row !== first.row + 1 ||
      second.col !== first.col + 1
    ) {
      throw new Error(`Invalid intersection: ${spec}`);
    }

    return {
      x: first.col + 1,
      y: first.row + 1
    };
  }

  function parseVerticalWall(spec) {
    const [firstId, secondId] = spec.split("-");
    const first = cellId(firstId);
    const second = cellId(secondId);

    if (first.col !== second.col) {
      throw new Error(
        `Invalid vertical wall "${spec}": columns must match`
      );
    }

    return {
      x: first.col + 1,
      y: Math.min(first.row, second.row),
      height: Math.abs(second.row - first.row) + 1
    };
  }

  function parseHorizontalWall(spec) {
    const [firstId, secondId] = spec.split("-");
    const first = cellId(firstId);
    const second = cellId(secondId);

    if (first.row !== second.row) {
      throw new Error(
        `Invalid horizontal wall "${spec}": rows must match`
      );
    }

    return {
      x: Math.min(first.col, second.col),
      y: first.row + 1,
      width: Math.abs(second.col - first.col) + 1
    };
  }

  function holeCellRange(spec) {
    const [firstId, secondId] = spec.split("-");
    const first = cellId(firstId);
    const second = cellId(secondId);

    return {
      minRow: Math.min(first.row, second.row),
      maxRow: Math.max(first.row, second.row),
      minCol: Math.min(first.col, second.col),
      maxCol: Math.max(first.col, second.col)
    };
  }

  function randomHoleCell(range) {
    return {
      row:
        range.minRow +
        Math.floor(
          Math.random() * (range.maxRow - range.minRow + 1)
        ),

      col:
        range.minCol +
        Math.floor(
          Math.random() * (range.maxCol - range.minCol + 1)
        )
    };
  }

  function cellsAreAdjacent(first, second) {
    const rowDistance = Math.abs(first.row - second.row);
    const colDistance = Math.abs(first.col - second.col);

    return Math.max(rowDistance, colDistance) <= 1;
  }

  function generateHoleCells(specs) {
    const placed = [];

    for (const spec of specs) {
      const range = holeCellRange(spec);
      let selected = null;

      for (let attempt = 0; attempt < 1000; attempt++) {
        const candidate = randomHoleCell(range);

        const conflicts = placed.some(existing =>
          cellsAreAdjacent(candidate, existing)
        );

        if (!conflicts) {
          selected = candidate;
          break;
        }
      }

      if (selected) {
        placed.push(selected);
      }
    }

    return placed;
  }

  function makeMarker(textValue, className, x, y) {
    const element = document.createElement("div");

    element.className = `marker ${className}`;
    element.textContent = textValue;
    element.style.left = `${x * 10}%`;
    element.style.top = `${y * 10}%`;

    return element;
  }

  function renderMarkers() {
    markersLayer.replaceChildren();
    waypointMarkerEls = [];

    startMarkerEl = makeMarker(
      "◎",
      "start reached",
      startPos.x,
      startPos.y
    );

    markersLayer.appendChild(startMarkerEl);

    endMarkerEl = makeMarker(
      "◉",
      "end not-reached",
      endPos.x,
      endPos.y
    );

    markersLayer.appendChild(endMarkerEl);

    currentBoard.waypoints.forEach((spec, index) => {
      const position = intersection(spec);

      const marker = makeMarker(
        waypointSymbols[index],
        "waypoint not-reached",
        position.x,
        position.y
      );

      markersLayer.appendChild(marker);
      waypointMarkerEls.push(marker);
    });

    updateMarkerColors();
  }

  function updateMarkerColors() {
    startMarkerEl.className = "marker start reached";
    startMarkerEl.textContent = "◎";

    waypointMarkerEls.forEach((marker, index) => {
      marker.classList.remove(
        "reached",
        "next",
        "not-reached"
      );

      if (index < nextWaypointIndex) {
        marker.classList.add("reached");
      } else if (index === nextWaypointIndex) {
        marker.classList.add("next");
      } else {
        marker.classList.add("not-reached");
      }

      marker.textContent = waypointSymbols[index];
    });

    endMarkerEl.classList.remove(
      "reached",
      "next",
      "not-reached"
    );

    if (gameFinished) {
      endMarkerEl.classList.add("reached");
    } else if (
      nextWaypointIndex >= waypointPositions.length
    ) {
      endMarkerEl.classList.add("next");
    } else {
      endMarkerEl.classList.add("not-reached");
    }

    endMarkerEl.textContent = "◉";
  }

  function renderWalls() {
    wallsLayer.replaceChildren();

    vWalls.forEach(wall => {
      const element = document.createElement("div");

      element.className = "wall v";
      element.style.left = `${wall.x * 10}%`;
      element.style.top = `${wall.y * 10}%`;
      element.style.height = `${wall.height * 10}%`;

      wallsLayer.appendChild(element);
    });

    hWalls.forEach(wall => {
      const element = document.createElement("div");

      element.className = "wall h";
      element.style.left = `${wall.x * 10}%`;
      element.style.top = `${wall.y * 10}%`;
      element.style.width = `${wall.width * 10}%`;

      wallsLayer.appendChild(element);
    });
  }

  function renderHoles() {
    holesLayer.replaceChildren();

    holeCells.forEach(cell => {
      const element = document.createElement("div");

      element.className = "hole";
      element.style.left = `${(cell.col + 0.5) * 10}%`;
      element.style.top = `${(cell.row + 0.5) * 10}%`;

      holesLayer.appendChild(element);
    });
  }

  function renderBoard() {
    renderMarkers();
    renderWalls();
    renderHoles();
  }

  function setScreenContent(title, description) {
    messageTitle.textContent = title;
    messageText.textContent = description;
  }

  function showStartScreen() {
    setScreenContent(
      text.startTitle,
      text.startText
    );

    primaryAction.textContent = text.actions.startGame;
    primaryAction.dataset.action = "start";

    secondaryAction.hidden = true;
    gameScreen.hidden = false;
  }

  function showHoleScreen() {
    setScreenContent(
      text.holeTitle,
      text.holeText
    );

    primaryAction.textContent = text.actions.replay;
    primaryAction.dataset.action = "replay";

    secondaryAction.textContent = text.actions.newGame;
    secondaryAction.hidden = false;

    gameScreen.hidden = false;
  }

  function showWinScreen() {
    setScreenContent(
      text.winTitle,
      text.winText
    );

    primaryAction.textContent = text.actions.replay;
    primaryAction.dataset.action = "replay";

    secondaryAction.textContent = text.actions.newGame;
    secondaryAction.hidden = false;

    gameScreen.hidden = false;
  }

  function hideGameScreen() {
    gameScreen.hidden = true;
  }

  function updateBallVisual() {
    ballEl.style.left = `${ball.x * 10}%`;
    ballEl.style.top = `${ball.y * 10}%`;
  }

  function resetProgress() {
    nextWaypointIndex = 0;
    gameFinished = false;
    ballFalling = false;

    updateMarkerColors();
  }

  function resetBall() {
    ballEl.classList.remove("falling");

    ball.x = startPos.x;
    ball.y = startPos.y;
    ball.vx = 0;
    ball.vy = 0;

    updateBallVisual();
  }

  function startGame() {
    ensureAudio();

    resetProgress();
    resetBall();

    gameStarted = true;
    hideGameScreen();
  }

  function replayGame() {
    ensureAudio();

    resetProgress();
    resetBall();

    gameStarted = true;
    hideGameScreen();
  }

  function startNewGame() {
    loadRandomBoard();
    resetProgress();
    resetBall();

    gameStarted = false;
    showStartScreen();
  }

  function findTouchedHole() {
    return holeCells.find(hole => {
      const holeX = hole.col + 0.5;
      const holeY = hole.row + 0.5;

      const dx = ball.x - holeX;
      const dy = ball.y - holeY;

      return Math.hypot(dx, dy) < 0.38;
    });
  }

  function fallIntoHole(hole) {
    if (ballFalling || gameFinished) {
      return;
    }

    ballFalling = true;
    playHoleSound();

    ball.x = hole.col + 0.5;
    ball.y = hole.row + 0.5;
    ball.vx = 0;
    ball.vy = 0;

    updateBallVisual();

    requestAnimationFrame(() => {
      ballEl.classList.add("falling");
    });

    window.setTimeout(() => {
      ballFalling = false;
      gameStarted = false;

      ballEl.classList.remove("falling");
      resetBall();

      showHoleScreen();
    }, 550);
  }

  function checkGameProgress() {
    if (!gameStarted || ballFalling || gameFinished) {
      return;
    }

    const touchedHole = findTouchedHole();

    if (touchedHole) {
      fallIntoHole(touchedHole);
      return;
    }

    if (nextWaypointIndex < waypointPositions.length) {
      const target = waypointPositions[nextWaypointIndex];

      const dx = ball.x - target.x;
      const dy = ball.y - target.y;

      if (Math.hypot(dx, dy) < 0.9) {
        nextWaypointIndex++;
        playWaypointSound();
        updateMarkerColors();
      }

      return;
    }

    const dx = ball.x - endPos.x;
    const dy = ball.y - endPos.y;

    if (Math.hypot(dx, dy) < 0.9) {
      gameFinished = true;
      gameStarted = false;

      playWinSound();
      updateMarkerColors();
      showWinScreen();
    }
  }

  function resolveWalls(nextX, nextY) {
    const radius = ball.radius;
    let bounced = false;

    if (nextX - radius < 0) {
      nextX = radius;
      ball.vx = -ball.vx * 0.6;
      bounced = true;
    } else if (nextX + radius > 10) {
      nextX = 10 - radius;
      ball.vx = -ball.vx * 0.6;
      bounced = true;
    }

    if (nextY - radius < 0) {
      nextY = radius;
      ball.vy = -ball.vy * 0.6;
      bounced = true;
    } else if (nextY + radius > 10) {
      nextY = 10 - radius;
      ball.vy = -ball.vy * 0.6;
      bounced = true;
    }

    for (const wall of vWalls) {
      const crossed =
        (ball.x - radius < wall.x &&
          nextX + radius > wall.x) ||
        (ball.x + radius > wall.x &&
          nextX - radius < wall.x);

      if (!crossed) {
        continue;
      }

      const yCenter = (ball.y + nextY) / 2;

      if (
        yCenter >= wall.y &&
        yCenter <= wall.y + wall.height
      ) {
        nextX =
          ball.x < wall.x
            ? wall.x - radius
            : wall.x + radius;

        ball.vx = -ball.vx * 0.7;
        bounced = true;
      }
    }

    for (const wall of hWalls) {
      const crossed =
        (ball.y - radius < wall.y &&
          nextY + radius > wall.y) ||
        (ball.y + radius > wall.y &&
          nextY - radius < wall.y);

      if (!crossed) {
        continue;
      }

      const xCenter = (ball.x + nextX) / 2;

      if (
        xCenter >= wall.x &&
        xCenter <= wall.x + wall.width
      ) {
        nextY =
          ball.y < wall.y
            ? wall.y - radius
            : wall.y + radius;

        ball.vy = -ball.vy * 0.7;
        bounced = true;
      }
    }

    if (bounced) {
      playWallBounceSound();
    }

    return {
      x: nextX,
      y: nextY
    };
  }

  const ball = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,

    radius: 0.3,
    damping: 0.98,
    gravityScale: 0.0009
  };

  function stepPhysics() {
    if (gameStarted && !ballFalling) {
      const gravityX = rotateY * ball.gravityScale;
      const gravityY = -rotateX * ball.gravityScale;

      ball.vx += gravityX;
      ball.vy += gravityY;

      ball.vx *= ball.damping;
      ball.vy *= ball.damping;

      const resolved = resolveWalls(
        ball.x + ball.vx,
        ball.y + ball.vy
      );

      ball.x = resolved.x;
      ball.y = resolved.y;

      updateBallVisual();
      checkGameProgress();
    }

    requestAnimationFrame(stepPhysics);
  }

  // Board tilt
  let dragging = false;
  let pointerId = null;
  let originX = 0;
  let originY = 0;
  let rotateX = 0;
  let rotateY = 0;

  function applyTilt() {
    board.style.transform =
      `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  }

  board.addEventListener("pointerdown", event => {
    dragging = true;
    pointerId = event.pointerId;
    originX = event.clientX;
    originY = event.clientY;

    board.setPointerCapture(pointerId);
  });

  board.addEventListener("pointermove", event => {
    if (!dragging || event.pointerId !== pointerId) {
      return;
    }

    const dx = event.clientX - originX;
    const dy = event.clientY - originY;

    rotateY = Math.max(
      -28,
      Math.min(28, dx * 0.12)
    );

    rotateX = Math.max(
      -28,
      Math.min(28, -dy * 0.12)
    );

    applyTilt();
  });

  function stopDragging(event) {
    if (event.pointerId !== pointerId) {
      return;
    }

    dragging = false;

    if (board.hasPointerCapture(pointerId)) {
      board.releasePointerCapture(pointerId);
    }
  }

  board.addEventListener("pointerup", stopDragging);
  board.addEventListener("pointercancel", stopDragging);

  primaryAction.addEventListener("click", () => {
    if (primaryAction.dataset.action === "start") {
      startGame();
    } else if (primaryAction.dataset.action === "replay") {
      replayGame();
    }
  });

  secondaryAction.addEventListener("click", startNewGame);

  // Load board data
  async function loadRandomBoard() {
    const response = await fetch("board.json");
    const boards = await response.json();

    const index = Math.floor(Math.random() * boards.length);
    currentBoard = boards[index];

    startPos = intersection(currentBoard.start);
    endPos = intersection(currentBoard.end);

    waypointPositions =
      currentBoard.waypoints.map(intersection);

    holeCells = generateHoleCells(currentBoard.holes);

    vWalls =
      currentBoard["v-walls"].map(parseVerticalWall);

    hWalls =
      currentBoard["h-walls"].map(parseHorizontalWall);

    renderBoard();
  }

  loadRandomBoard().then(() => {
    resetBall();
    showStartScreen();
    requestAnimationFrame(stepPhysics);
  });
})();