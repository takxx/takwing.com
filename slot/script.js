const STARTING_CREDITS = 100;
const SUPPORTED_LANGUAGES = ["en", "es", "zh-Hant"];

const symbols = [
  { icon: "🍒", payout: 5 },
  { icon: "🍋", payout: 10 },
  { icon: "🍊", payout: 15 },
  { icon: "🔔", payout: 20 },
  { icon: "7️⃣", payout: 50 }
];

const paylines = {
  1: [
    [3, 4, 5]
  ],

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

const translations = {
  en: {
    languageLabel: "Language",
    title: "LUCKY 7",
    subtitle: "Choose your paylines and spin!",
    credits: "Credits",
    lines: "Lines",
    lastWin: "Last Win",
    selectedLine: "Selected line",
    winningLine: "Winning line",
    lineCost: "Choose paylines — 1 credit per line",
    spin: "SPIN",
    reset: "Reset Credits",
    goodLuck: "Good luck!",
    soundOn: "Sound on",
    soundOff: "Sound off",
    paytableIntro: "Three matching symbols on a line pays:",
    expectedValueTitle: "Expected win",
    expectedWin: value => `Expected gross win: ${value} credits per spin`,
    expectedNet: value => `Expected net result: ${value} credits per spin`,
    insufficientCredits: "Not enough credits!",
    spinning: "Spinning...",
    won: value => `🎉 You won ${value} credits!`,
    noWin: "No win this time. Try again!",
    linesSelected: value =>
      `${value} payline${value === 1 ? "" : "s"} selected`,
    creditsReset: "Credits reset!",
    line: value => `${value} Line${value === 1 ? "" : "s"}`
  },

  es: {
    languageLabel: "Idioma",
    title: "SIETE DE LA SUERTE",
    subtitle: "¡Elige tus líneas de pago y gira!",
    credits: "Créditos",
    lines: "Líneas",
    lastWin: "Última ganancia",
    selectedLine: "Línea seleccionada",
    winningLine: "Línea ganadora",
    lineCost: "Elige líneas de pago — 1 crédito por línea",
    spin: "GIRAR",
    reset: "Restablecer créditos",
    goodLuck: "¡Buena suerte!",
    soundOn: "Sonido activado",
    soundOff: "Sonido desactivado",
    paytableIntro: "Tres símbolos iguales en una línea pagan:",
    expectedValueTitle: "Ganancia esperada",
    expectedWin: value =>
      `Ganancia bruta esperada: ${value} créditos por giro`,
    expectedNet: value =>
      `Resultado neto esperado: ${value} créditos por giro`,
    insufficientCredits: "¡No tienes suficientes créditos!",
    spinning: "Girando...",
    won: value => `🎉 ¡Has ganado ${value} créditos!`,
    noWin: "No has ganado esta vez. ¡Inténtalo de nuevo!",
    linesSelected: value =>
      `${value} línea${value === 1 ? "" : "s"} seleccionada${value === 1 ? "" : "s"}`,
    creditsReset: "¡Créditos restablecidos!",
    line: value => `${value} línea${value === 1 ? "" : "s"}`
  },

  "zh-Hant": {
    languageLabel: "語言",
    title: "幸運 7",
    subtitle: "選擇賠付線並開始旋轉！",
    credits: "點數",
    lines: "線數",
    lastWin: "上次獎金",
    selectedLine: "已選線",
    winningLine: "中獎線",
    lineCost: "選擇賠付線 — 每條線 1 點",
    spin: "旋轉",
    reset: "重設點數",
    goodLuck: "祝你好運！",
    soundOn: "音效開啟",
    soundOff: "音效關閉",
    paytableIntro: "同一條線上有三個相同符號可得：",
    expectedValueTitle: "期望獎金",
    expectedWin: value => `每次旋轉的期望總獎金：${value} 點`,
    expectedNet: value => `每次旋轉的期望淨結果：${value} 點`,
    insufficientCredits: "點數不足！",
    spinning: "旋轉中……",
    won: value => `🎉 你贏得了 ${value} 點！`,
    noWin: "這次沒有中獎，再試一次吧！",
    linesSelected: value => `已選擇 ${value} 條賠付線`,
    creditsReset: "點數已重設！",
    line: value => `${value} 條線`
  }
};

const cells = [...document.querySelectorAll(".cell")];
const lineButtons = [...document.querySelectorAll(".line-button")];
const paylineElements = [...document.querySelectorAll(".payline")];

const creditsDisplay = document.getElementById("credits");
const selectedLinesDisplay = document.getElementById("selectedLines");
const lastWinDisplay = document.getElementById("lastWin");
const message = document.getElementById("message");
const spinButton = document.getElementById("spinButton");
const resetButton = document.getElementById("resetButton");
const soundButton = document.getElementById("soundButton");
const languageSelect = document.getElementById("languageSelect");
const expectedWinDisplay = document.getElementById("expectedWin");
const expectedNetDisplay = document.getElementById("expectedNet");

let credits = STARTING_CREDITS;
let selectedLines = 1;
let isSpinning = false;
let audioContext;
let soundEnabled = true;
let currentLanguage = detectBrowserLanguage();

function detectBrowserLanguage() {
  const browserLanguages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];

  for (const browserLanguage of browserLanguages) {
    const normalized = browserLanguage.toLowerCase();

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

function t(key, value) {
  const translation = translations[currentLanguage][key];

  return typeof translation === "function"
    ? translation(value)
    : translation;
}

function formatNumber(value) {
  return new Intl.NumberFormat(currentLanguage).format(value);
}

function applyTranslations() {
  document.documentElement.lang = currentLanguage;
  languageSelect.value = currentLanguage;

  document.querySelectorAll("[data-i18n]").forEach(element => {
    const key = element.dataset.i18n;
    element.textContent = t(key);
  });

  document.querySelectorAll("[data-line-count]").forEach(element => {
    const count = Number(element.dataset.lineCount);
    element.textContent = t("line", count);
  });

  updateSoundButton();
  updateExpectedValue();
}

function setLanguage(language) {
  currentLanguage = SUPPORTED_LANGUAGES.includes(language)
    ? language
    : "en";

  localStorage.setItem("lucky7-language", currentLanguage);
  applyTranslations();
  updateMessageForCurrentState();
}

function updateMessageForCurrentState() {
  if (isSpinning) {
    message.textContent = t("spinning");
  }
}

function randomSymbol() {
  return symbols[
    Math.floor(Math.random() * symbols.length)
  ];
}

function updateDisplays() {
  creditsDisplay.textContent = formatNumber(credits);
  selectedLinesDisplay.textContent = formatNumber(selectedLines);
}

function updatePaylineIndicators() {
  paylineElements.forEach(line => {
    line.classList.remove("active", "winner");
  });

  activeLines[selectedLines].forEach(selector => {
    document.querySelector(selector).classList.add("active");
  });
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

function getAudioContext() {
  if (!audioContext) {
    const AudioContext =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContext) {
      return null;
    }

    audioContext = new AudioContext();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  return audioContext;
}

function playSound(type) {
  if (!soundEnabled) return;

  const context = getAudioContext();

  if (!context) return;

  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.connect(gain);
  gain.connect(context.destination);

  const now = context.currentTime;

  if (type === "spin") {
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(180, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      70,
      now + 0.12
    );

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      now + 0.12
    );

    oscillator.start(now);
    oscillator.stop(now + 0.12);
  }

  if (type === "win") {
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(500, now);
    oscillator.frequency.setValueAtTime(700, now + 0.12);
    oscillator.frequency.setValueAtTime(950, now + 0.24);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      now + 0.45
    );

    oscillator.start(now);
    oscillator.stop(now + 0.45);
  }

  if (type === "lose") {
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(180, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      80,
      now + 0.3
    );

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      now + 0.3
    );

    oscillator.start(now);
    oscillator.stop(now + 0.3);
  }
}

function updateSoundButton() {
  soundButton.innerHTML = soundEnabled
    ? `🔊 <span>${t("soundOn")}</span>`
    : `🔇 <span>${t("soundOff")}</span>`;
}

function spinCell(cell, duration, index) {
  return new Promise(resolve => {
    cell.classList.add("spinning");

    const column = index % 3;
    const direction = column === 1 ? "down" : "up";

    const reelSymbols = [...symbols, ...symbols];

    const reel = document.createElement("div");
    reel.className = `reel ${direction}`;

    reel.innerHTML = reelSymbols
      .map(symbol => {
        return `
          <div class="reel-symbol">
            ${symbol.icon}
          </div>
        `;
      })
      .join("");

    cell.innerHTML = "";
    cell.appendChild(reel);

    const soundInterval = window.setInterval(() => {
      playSound("spin");
    }, 180);

    window.setTimeout(() => {
      window.clearInterval(soundInterval);

      const result = randomSymbol();

      cell.innerHTML = result.icon;
      cell.classList.remove("spinning");

      resolve(result);
    }, duration);
  });
}

function highlightWinningLine(line) {
  line.forEach(index => {
    cells[index].classList.add("win");
  });

  const lineIndicators = {
    "0,1,2": ".line-top",
    "3,4,5": ".line-centre",
    "6,7,8": ".line-bottom",
    "0,4,8": ".line-diagonal-down",
    "6,4,2": ".line-diagonal-up"
  };

  const indicator = lineIndicators[line.join(",")];

  if (indicator) {
    const lineElement = document.querySelector(indicator);
    lineElement.classList.remove("active");
    lineElement.classList.add("winner");
  }
}

function findWinningLines(results) {
  const winningLines = [];

  paylines[selectedLines].forEach(line => {
    const [a, b, c] = line;

    const isMatch =
      results[a].icon === results[b].icon &&
      results[b].icon === results[c].icon;

    if (isMatch) {
      winningLines.push({
        line,
        payout: results[a].payout,
        symbol: results[a].icon
      });
    }
  });

  return winningLines;
}

/*
  Assumptions:
  - Every symbol is equally likely: 1 / 5.
  - Each payline is evaluated independently.
  - A winning line pays its symbol payout.
  - The spin cost is one credit per selected line.

  For one line:
  E[line] =
    (5 + 10 + 15 + 20 + 50) / 5^3
    = 100 / 125
    = 0.8 credits

  Therefore:
  - 1 selected line: gross EV = 0.8, net EV = -0.2
  - 3 selected lines: gross EV = 2.4, net EV = -0.6
  - 5 selected lines: gross EV = 4.0, net EV = -1.0
*/
function calculateExpectedValue(lineCount) {
  const expectedWinPerLine =
    symbols.reduce((sum, symbol) => {
      return sum + symbol.payout;
    }, 0) / Math.pow(symbols.length, 3);

  const expectedGrossWin =
    expectedWinPerLine * lineCount;

  const spinCost = lineCount;
  const expectedNetResult =
    expectedGrossWin - spinCost;

  return {
    gross: expectedGrossWin,
    net: expectedNetResult
  };
}

function updateExpectedValue() {
  const expected = calculateExpectedValue(selectedLines);

  expectedWinDisplay.textContent = t(
    "expectedWin",
    formatNumber(expected.gross)
  );

  expectedNetDisplay.textContent = t(
    "expectedNet",
    formatNumber(expected.net)
  );
}

async function spin() {
  if (isSpinning) return;

  const spinCost = selectedLines;

  if (credits < spinCost) {
    message.textContent = t("insufficientCredits");
    playSound("lose");
    return;
  }

  isSpinning = true;
  spinButton.disabled = true;
  resetButton.disabled = true;

  clearWinningCells();

  credits -= spinCost;
  lastWinDisplay.textContent = "0";
  updateDisplays();

  message.textContent = t("spinning");

  const columnDurations = [
    1400,
    1900,
    2400
  ];

  const results = await Promise.all(
    cells.map((cell, index) => {
      const column = index % 3;
      const duration = columnDurations[column];

      return spinCell(cell, duration, index);
    })
  );

  const winningLines = findWinningLines(results);

  let totalWin = 0;

  winningLines.forEach(winningLine => {
    totalWin += winningLine.payout;
    highlightWinningLine(winningLine.line);
  });

  if (totalWin > 0) {
    credits += totalWin;
    lastWinDisplay.textContent = formatNumber(totalWin);
    message.textContent = t("won", formatNumber(totalWin));
    playSound("win");
  } else {
    lastWinDisplay.textContent = "0";
    message.textContent = t("noWin");
    playSound("lose");
  }

  updateDisplays();

  spinButton.disabled = false;
  resetButton.disabled = false;
  isSpinning = false;
}

lineButtons.forEach(button => {
  button.addEventListener("click", () => {
    if (isSpinning) return;

    lineButtons.forEach(item => {
      item.classList.remove("selected");
    });

    button.classList.add("selected");
    selectedLines = Number(button.dataset.lines);

    clearWinningCells();
    updateDisplays();
    updateExpectedValue();

    message.textContent = t(
      "linesSelected",
      selectedLines
    );
  });
});

languageSelect.addEventListener("change", event => {
  setLanguage(event.target.value);
});

soundButton.addEventListener("click", () => {
  soundEnabled = !soundEnabled;

  if (soundEnabled) {
    getAudioContext();
  }

  updateSoundButton();
});

resetButton.addEventListener("click", () => {
  if (isSpinning) return;

  credits = STARTING_CREDITS;
  lastWinDisplay.textContent = "0";

  clearWinningCells();
  updateDisplays();

  message.textContent = t("creditsReset");
});

spinButton.addEventListener("click", spin);

const savedLanguage = localStorage.getItem("lucky7-language");

if (savedLanguage && SUPPORTED_LANGUAGES.includes(savedLanguage)) {
  currentLanguage = savedLanguage;
}

applyTranslations();
updateDisplays();
updatePaylineIndicators();