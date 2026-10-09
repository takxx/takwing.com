"use strict";

/* ------------------------------------------------------------------
   Constants
------------------------------------------------------------------ */

const STARTING_CREDITS = 100;

const SUPPORTED_LANGUAGES = [
  "en",
  "es",
  "zh-Hant"
];

const URL_LANGUAGE_MAP = {
  en: "en",
  es: "es",
  zh: "zh-Hant"
};

const LANGUAGE_STORAGE_KEY =
  "ocean-treasures-language";

const CREDITS_STORAGE_KEY =
  "ocean-treasures-credits";

const symbols = [
  { icon: "🐚", payout: 5, name: "shell" },
  { icon: "🦑", payout: 8, name: "cuttlefish" },
  { icon: "🐠", payout: 18, name: "fish" },
  { icon: "🪸", payout: 28, name: "coral" },
  { icon: "🐢", payout: 38, name: "turtle" },
  { icon: "🪎", payout: 88, name: "treasure" }
];

const paylines = {
  1: [[3, 4, 5]],

  3: [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8]
  ],

  5: [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 4, 8],
    [6, 4, 2]
  ]
};

const activeLines = {
  1: [".line-centre"],

  3: [
    ".line-top",
    ".line-centre",
    ".line-bottom"
  ],

  5: [
    ".line-top",
    ".line-centre",
    ".line-bottom",
    ".line-diagonal-down",
    ".line-diagonal-up"
  ]
};

/* ------------------------------------------------------------------
   Translations
------------------------------------------------------------------ */

const translations = {
  en: {
    languageLabel: "Language",
    eyebrow: "UNDERWATER ADVENTURE",
    title: "OCEAN TREASURES",
    subtitle: "Dive in and discover your lucky catch!",
    credits: "Credits",
    lines: "Lines",
    lastWin: "Last Win",
    selectedLine: "Selected line",
    winningLine: "Winning line",
    lineCost: "Choose paylines — 1 credit per line",
    spin: "DIVE IN",
    reset: "Reset Credits",
    goodLuck: "Good luck, explorer!",
    soundOn: "Sound on",
    soundOff: "Sound off",
    paytableTitle: "Treasure map",
    paytableIntro: "Three matching treasures on a line pays:",
    expectedValueTitle: "Current dive statistics",

    expectedWin: value =>
      `Expected gross win: ${value} credits per spin`,

    expectedNet: value =>
      `Expected net result: ${value} credits per spin`,

    insufficientCredits:
      "Not enough credits for this dive!",

    spinning:
      "Searching the depths...",

    won: value =>
      `🎉 You found ${value} credits!`,

    noWin:
      "No treasure this time. Dive again!",

    linesSelected: value =>
      `${value} payline${value === 1 ? "" : "s"} selected`,

    creditsReset:
      "Credits restored!",

    line: value =>
      `${value} Line${value === 1 ? "" : "s"}`,

    footerNote:
      "A relaxing ocean game of chance"
  },

  es: {
    languageLabel: "Idioma",
    eyebrow: "AVENTURA SUBMARINA",
    title: "TESOROS DEL OCÉANO",
    subtitle: "¡Sumérgete y descubre tu captura de la suerte!",
    credits: "Créditos",
    lines: "Líneas",
    lastWin: "Última ganancia",
    selectedLine: "Línea seleccionada",
    winningLine: "Línea ganadora",
    lineCost: "Elige líneas de pago — 1 crédito por línea",
    spin: "SUMÉRGETE",
    reset: "Restablecer créditos",
    goodLuck: "¡Buena suerte, explorador!",
    soundOn: "Sonido activado",
    soundOff: "Sonido desactivado",
    paytableTitle: "Mapa del tesoro",
    paytableIntro: "Tres tesoros iguales en una línea pagan:",
    expectedValueTitle: "Estadísticas de la inmersión",

    expectedWin: value =>
      `Ganancia bruta esperada: ${value} créditos por giro`,

    expectedNet: value =>
      `Resultado neto esperado: ${value} créditos por giro`,

    insufficientCredits:
      "¡No tienes créditos suficientes para bucear!",

    spinning:
      "Buscando en las profundidades...",

    won: value =>
      `🎉 ¡Has encontrado ${value} créditos!`,

    noWin:
      "No hay tesoro esta vez. ¡Vuelve a bucear!",

    linesSelected: value =>
      `${value} línea${value === 1 ? "" : "s"} seleccionada${value === 1 ? "" : "s"}`,

    creditsReset:
      "¡Créditos restaurados!",

    line: value =>
      `${value} línea${value === 1 ? "" : "s"}`,

    footerNote:
      "Un relajante juego de azar oceánico"
  },

  "zh-Hant": {
    languageLabel: "語言",
    eyebrow: "深海探險",
    title: "海洋寶藏",
    subtitle: "潛入深海，尋找你的幸運寶藏！",
    credits: "點數",
    lines: "線數",
    lastWin: "上次獎金",
    selectedLine: "已選線",
    winningLine: "中獎線",
    lineCost: "選擇賠付線 — 每條線 1 點",
    spin: "潛入深海",
    reset: "重設點數",
    goodLuck: "祝你好運，探險家！",
    soundOn: "音效開啟",
    soundOff: "音效關閉",
    paytableTitle: "寶藏地圖",
    paytableIntro: "同一條線上有三個相同寶藏可得：",
    expectedValueTitle: "本次潛水統計",

    expectedWin: value =>
      `每次旋轉的期望總獎金：${value} 點`,

    expectedNet: value =>
      `每次旋轉的期望淨結果：${value} 點`,

    insufficientCredits:
      "點數不足，無法潛水！",

    spinning:
      "正在探索深海……",

    won: value =>
      `🎉 你找到 ${value} 點寶藏！`,

    noWin:
      "這次沒有找到寶藏，再潛一次吧！",

    linesSelected: value =>
      `已選擇 ${value} 條賠付線`,

    creditsReset:
      "點數已恢復！",

    line: value =>
      `${value} 條線`,

    footerNote:
      "輕鬆愉快的海洋機會遊戲"
  }
};

/* ------------------------------------------------------------------
   Safe localStorage helpers
------------------------------------------------------------------ */

function readStorage(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);

    return value === null
      ? fallback
      : value;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(
      key,
      String(value)
    );
  } catch {
    /*
      The game still works during the current page
      session if storage is unavailable.
    */
  }
}

function loadCredits() {
  const savedCredits = Number(
    readStorage(
      CREDITS_STORAGE_KEY,
      STARTING_CREDITS
    )
  );

  if (
    !Number.isFinite(savedCredits) ||
    savedCredits < 0
  ) {
    return STARTING_CREDITS;
  }

  return Math.floor(savedCredits);
}

function saveCredits() {
  writeStorage(
    CREDITS_STORAGE_KEY,
    credits
  );
}

/* ------------------------------------------------------------------
   Language functions
------------------------------------------------------------------ */

function detectQueryLanguage() {
  const params = new URLSearchParams(
    window.location.search
  );

  const requestedLanguage =
    params.get("lang")?.toLowerCase();

  return URL_LANGUAGE_MAP[requestedLanguage]
    || null;
}

function detectSavedLanguage() {
  const savedLanguage = readStorage(
    LANGUAGE_STORAGE_KEY
  );

  return SUPPORTED_LANGUAGES.includes(savedLanguage)
    ? savedLanguage
    : null;
}

function detectBrowserLanguage() {
  const languages =
    navigator.languages?.length
      ? navigator.languages
      : [navigator.language];

  for (const language of languages) {
    const normalized = String(language)
      .toLowerCase()
      .replace("_", "-");

    if (normalized.startsWith("zh")) {
      return "zh-Hant";
    }

    if (normalized.startsWith("es")) {
      return "es";
    }

    if (normalized.startsWith("en")) {
      return "en";
    }
  }

  return "en";
}

function detectInitialLanguage() {
  return (
    detectQueryLanguage() ||
    detectSavedLanguage() ||
    detectBrowserLanguage() ||
    "en"
  );
}

function saveLanguage(language) {
  writeStorage(
    LANGUAGE_STORAGE_KEY,
    language
  );
}

/* ------------------------------------------------------------------
   DOM references
------------------------------------------------------------------ */

const cells = [
  ...document.querySelectorAll(".cell")
];

const lineButtons = [
  ...document.querySelectorAll(".line-button")
];

const paylineElements = [
  ...document.querySelectorAll(".payline")
];

const creditsDisplay =
  document.getElementById("credits");

const selectedLinesDisplay =
  document.getElementById("selectedLines");

const lastWinDisplay =
  document.getElementById("lastWin");

const message =
  document.getElementById("message");

const spinButton =
  document.getElementById("spinButton");

const resetButton =
  document.getElementById("resetButton");

const soundButton =
  document.getElementById("soundButton");

const languageSelect =
  document.getElementById("languageSelect");

const soundIcon =
  soundButton?.querySelector(".sound-icon");

const soundLabel =
  soundButton?.querySelector(".sound-label");

const expectedWinDisplay =
  document.getElementById("expectedWin");

const expectedNetDisplay =
  document.getElementById("expectedNet");

/* ------------------------------------------------------------------
   State
------------------------------------------------------------------ */

let credits = loadCredits();
let selectedLines = 1;
let isSpinning = false;
let currentLanguage = detectInitialLanguage();

let audioContext = null;
let masterGain = null;
let soundEnabled = true;

/* ------------------------------------------------------------------
   Translation functions
------------------------------------------------------------------ */

function t(key, value) {
  const language =
    translations[currentLanguage] ||
    translations.en;

  const translation = language[key];

  return typeof translation === "function"
    ? translation(value)
    : translation ?? key;
}

function formatNumber(value) {
  return new Intl.NumberFormat(
    currentLanguage
  ).format(value);
}

function applyTranslations() {
  document.documentElement.lang =
    currentLanguage;

  if (languageSelect) {
    languageSelect.value =
      currentLanguage;
  }

  document
    .querySelectorAll("[data-i18n]")
    .forEach(element => {
      element.textContent =
        t(element.dataset.i18n);
    });

  document
    .querySelectorAll("[data-line-count]")
    .forEach(element => {
      const count =
        Number(element.dataset.lineCount);

      element.textContent =
        t("line", count);
    });

  updateSoundButton();
  updateExpectedValue();
  updateDisplays();

  if (isSpinning && message) {
    message.textContent =
      t("spinning");
  }
}

function setLanguage(language) {
  currentLanguage =
    SUPPORTED_LANGUAGES.includes(language)
      ? language
      : "en";

  saveLanguage(currentLanguage);
  applyTranslations();
}

/* ------------------------------------------------------------------
   Display and payline functions
------------------------------------------------------------------ */

function updateDisplays() {
  if (creditsDisplay) {
    creditsDisplay.textContent =
      formatNumber(credits);
  }

  if (selectedLinesDisplay) {
    selectedLinesDisplay.textContent =
      formatNumber(selectedLines);
  }
}

function updateSoundButton() {
  if (!soundButton) {
    return;
  }

  if (soundIcon) {
    soundIcon.textContent =
      soundEnabled
        ? "🔊"
        : "🔇";
  }

  if (soundLabel) {
    soundLabel.textContent =
      soundEnabled
        ? t("soundOn")
        : t("soundOff");
  }

  soundButton.setAttribute(
    "aria-pressed",
    String(soundEnabled)
  );
}

function updatePaylineIndicators() {
  paylineElements.forEach(line => {
    line.classList.remove(
      "active",
      "winner"
    );
  });

  activeLines[selectedLines].forEach(
    selector => {
      const line =
        document.querySelector(selector);

      if (line) {
        line.classList.add("active");
      }
    }
  );
}

function clearWinningCells() {
  cells.forEach(cell => {
    cell.classList.remove("win");
  });

  paylineElements.forEach(line => {
    line.classList.remove("winner");
  });

  updatePaylineIndicators();
}

/* ------------------------------------------------------------------
   Game logic
------------------------------------------------------------------ */

function randomSymbol() {
  const index = Math.floor(
    Math.random() * symbols.length
  );

  return symbols[index];
}

function findWinningLines(results) {
  const winningLines = [];

  paylines[selectedLines].forEach(line => {
    const [a, b, c] = line;

    const matching =
      results[a].icon === results[b].icon &&
      results[b].icon === results[c].icon;

    if (matching) {
      winningLines.push({
        line,
        payout: results[a].payout,
        symbol: results[a].icon
      });
    }
  });

  return winningLines;
}

function highlightWinningLine(line) {
  line.forEach(index => {
    cells[index].classList.add("win");
  });

  const lineSelectors = {
    "0,1,2": ".line-top",
    "3,4,5": ".line-centre",
    "6,7,8": ".line-bottom",
    "0,4,8": ".line-diagonal-down",
    "6,4,2": ".line-diagonal-up"
  };

  const selector =
    lineSelectors[line.join(",")];

  if (!selector) {
    return;
  }

  const lineElement =
    document.querySelector(selector);

  if (lineElement) {
    lineElement.classList.remove("active");
    lineElement.classList.add("winner");
  }
}

/* ------------------------------------------------------------------
   Expected value
------------------------------------------------------------------ */

function calculateExpectedValue(lineCount) {
  const expectedWinPerLine =
    symbols.reduce((sum, symbol) => {
      return sum + symbol.payout;
    }, 0) / Math.pow(symbols.length, 3);

  const gross =
    expectedWinPerLine * lineCount;

  const net =
    gross - lineCount;

  return { gross, net };
}

function updateExpectedValue() {
  if (
    !expectedWinDisplay ||
    !expectedNetDisplay
  ) {
    return;
  }

  const expected =
    calculateExpectedValue(selectedLines);

  expectedWinDisplay.textContent =
    t(
      "expectedWin",
      formatNumber(expected.gross)
    );

  expectedNetDisplay.textContent =
    t(
      "expectedNet",
      formatNumber(expected.net)
    );
}

/* ------------------------------------------------------------------
   Audio
------------------------------------------------------------------ */

function getAudioContext() {
  if (!audioContext) {
    const AudioContextClass =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioContextClass) {
      console.warn(
        "Web Audio API is not supported."
      );

      return null;
    }

    audioContext =
      new AudioContextClass();

    masterGain =
      audioContext.createGain();

    masterGain.gain.value = 0.8;
    masterGain.connect(
      audioContext.destination
    );
  }

  return audioContext;
}

function resumeAudio() {
  const context =
    getAudioContext();

  if (!context) {
    return null;
  }

  if (context.state === "suspended") {
    context.resume().catch(error => {
      console.warn(
        "Unable to resume audio:",
        error
      );
    });
  }

  return context;
}

function createTone({
  frequency,
  endFrequency = frequency,
  duration = 0.15,
  type = "sine",
  volume = 0.08,
  startTime = null,
  attack = 0.01,
  release = 0.08
}) {
  const context =
    resumeAudio();

  if (!context || !masterGain) {
    return;
  }

  const now =
    startTime ?? context.currentTime;

  const oscillator =
    context.createOscillator();

  const gain =
    context.createGain();

  oscillator.type = type;

  oscillator.frequency.setValueAtTime(
    frequency,
    now
  );

  if (endFrequency !== frequency) {
    oscillator.frequency
      .exponentialRampToValueAtTime(
        Math.max(20, endFrequency),
        now + duration
      );
  }

  gain.gain.setValueAtTime(
    0.001,
    now
  );

  gain.gain.linearRampToValueAtTime(
    volume,
    now + attack
  );

  gain.gain.exponentialRampToValueAtTime(
    0.001,
    now + duration + release
  );

  oscillator.connect(gain);
  gain.connect(masterGain);

  oscillator.start(now);
  oscillator.stop(
    now + duration + release
  );
}

function playSound(type) {
  if (!soundEnabled) {
    return;
  }

  const context =
    resumeAudio();

  if (!context) {
    return;
  }

  const now =
    context.currentTime;

  if (type === "spin") {
    createTone({
      frequency: 220,
      endFrequency: 120,
      duration: 0.12,
      type: "triangle",
      volume: 0.08,
      startTime: now
    });

    return;
  }

  if (type === "stop") {
    createTone({
      frequency: 420,
      endFrequency: 240,
      duration: 0.16,
      type: "sine",
      volume: 0.1,
      startTime: now
    });

    return;
  }

  if (type === "win") {
    const notes = [
      { frequency: 392, delay: 0 },
      { frequency: 494, delay: 0.13 },
      { frequency: 587, delay: 0.26 },
      { frequency: 784, delay: 0.4 }
    ];

    notes.forEach(note => {
      createTone({
        frequency: note.frequency,
        duration: 0.22,
        type: "sine",
        volume: 0.14,
        startTime:
          now + note.delay,
        attack: 0.015,
        release: 0.12
      });
    });

    return;
  }

  if (type === "bigWin") {
    const notes = [
      { frequency: 392, delay: 0 },
      { frequency: 494, delay: 0.12 },
      { frequency: 587, delay: 0.24 },
      { frequency: 784, delay: 0.38 },
      { frequency: 988, delay: 0.54 }
    ];

    notes.forEach(note => {
      createTone({
        frequency: note.frequency,
        duration: 0.28,
        type: "sine",
        volume: 0.16,
        startTime:
          now + note.delay,
        attack: 0.015,
        release: 0.14
      });
    });

    return;
  }

  if (type === "lose") {
    createTone({
      frequency: 220,
      endFrequency: 110,
      duration: 0.35,
      type: "triangle",
      volume: 0.09,
      startTime: now
    });
  }
}

/* ------------------------------------------------------------------
   Reel animation
------------------------------------------------------------------ */

function spinCell(cell, duration, index) {
  return new Promise(resolve => {
    cell.classList.add("spinning");

    const column = index % 3;

    const direction =
      column === 1
        ? "down"
        : "up";

    const reelSymbols = [
      ...symbols,
      ...symbols
    ];

    const reel =
      document.createElement("div");

    reel.className =
      `reel ${direction}`;

    reel.innerHTML =
      reelSymbols
        .map(symbol => {
          return `
            <div
              class="reel-symbol"
              aria-hidden="true"
            >
              ${symbol.icon}
            </div>
          `;
        })
        .join("");

    cell.replaceChildren(reel);

    const soundInterval =
      setInterval(() => {
        playSound("spin");
      }, 180);

    setTimeout(() => {
      clearInterval(soundInterval);

      const result =
        randomSymbol();

      cell.replaceChildren(
        document.createTextNode(
          result.icon
        )
      );

      cell.classList.remove("spinning");

      playSound("stop");
      resolve(result);
    }, duration);
  });
}

/* ------------------------------------------------------------------
   Spin
------------------------------------------------------------------ */

async function spin() {
  if (isSpinning) {
    return;
  }

  resumeAudio();

  const spinCost =
    selectedLines;

  if (credits < spinCost) {
    message.textContent =
      t("insufficientCredits");

    playSound("lose");
    return;
  }

  isSpinning = true;

  spinButton.disabled = true;
  resetButton.disabled = true;

  lineButtons.forEach(button => {
    button.disabled = true;
  });

  clearWinningCells();

  // Deduct and immediately persist the spin cost.
  credits -= spinCost;
  saveCredits();

  lastWinDisplay.textContent = "0";

  updateDisplays();

  message.textContent =
    t("spinning");

  const columnDurations = [
    1100,
    1550,
    2000
  ];

  const results = [];

  for (
    let column = 0;
    column < 3;
    column += 1
  ) {
    const columnResults =
      await Promise.all(
        cells
          .map((cell, index) => ({
            cell,
            index
          }))
          .filter(({ index }) => {
            return index % 3 === column;
          })
          .map(({ cell, index }) => {
            return spinCell(
              cell,
              columnDurations[column],
              index
            );
          })
      );

    columnResults.forEach(
      (result, row) => {
        results[row * 3 + column] =
          result;
      }
    );
  }

  const winningLines =
    findWinningLines(results);

  const totalWin =
    winningLines.reduce(
      (sum, winningLine) => {
        return sum + winningLine.payout;
      },
      0
    );

  winningLines.forEach(
    winningLine => {
      highlightWinningLine(
        winningLine.line
      );
    }
  );

  if (totalWin > 0) {
    credits += totalWin;

    // Persist winnings when the spin is complete.
    saveCredits();

    lastWinDisplay.textContent =
      formatNumber(totalWin);

    message.textContent =
      t(
        "won",
        formatNumber(totalWin)
      );

    playSound(
      totalWin >= 50
        ? "bigWin"
        : "win"
    );
  } else {
    lastWinDisplay.textContent = "0";

    message.textContent =
      t("noWin");

    playSound("lose");
  }

  // This also covers a losing spin.
  saveCredits();
  updateDisplays();

  spinButton.disabled = false;
  resetButton.disabled = false;

  lineButtons.forEach(button => {
    button.disabled = false;
  });

  isSpinning = false;
}

/* ------------------------------------------------------------------
   Event listeners
------------------------------------------------------------------ */

lineButtons.forEach(button => {
  button.addEventListener("click", () => {
    if (isSpinning) {
      return;
    }

    lineButtons.forEach(item => {
      item.classList.remove("selected");
      item.setAttribute(
        "aria-pressed",
        "false"
      );
    });

    button.classList.add("selected");
    button.setAttribute(
      "aria-pressed",
      "true"
    );

    selectedLines =
      Number(button.dataset.lines);

    clearWinningCells();
    updateDisplays();
    updateExpectedValue();

    message.textContent =
      t(
        "linesSelected",
        selectedLines
      );
  });
});

if (languageSelect) {
  languageSelect.addEventListener(
    "change",
    event => {
      setLanguage(
        event.target.value
      );
    }
  );
}

if (soundButton) {
  soundButton.addEventListener(
    "click",
    () => {
      resumeAudio();

      soundEnabled =
        !soundEnabled;

      updateSoundButton();

      if (soundEnabled) {
        playSound("stop");
      }
    }
  );
}

if (resetButton) {
  resetButton.addEventListener(
    "click",
    () => {
      if (isSpinning) {
        return;
      }

      credits =
        STARTING_CREDITS;

      // Persist the reset balance.
      saveCredits();

      lastWinDisplay.textContent =
        "0";

      clearWinningCells();
      updateDisplays();

      message.textContent =
        t("creditsReset");
    }
  );
}

if (spinButton) {
  spinButton.addEventListener(
    "click",
    spin
  );
}

document.addEventListener(
  "keydown",
  event => {
    const target =
      event.target;

    const typing =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement;

    if (
      event.code === "Space" &&
      !typing
    ) {
      event.preventDefault();
      spin();
    }
  }
);

/* ------------------------------------------------------------------
   Initialization
------------------------------------------------------------------ */

applyTranslations();
updateDisplays();
updatePaylineIndicators();