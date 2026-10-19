const translations = {
  en: {
    title: "Connect 4",
    restart: "New Game",
    you: "You",
    computer: "Computer",
    yourTurn: "Your turn",
    computerStarts: "Computer starts",
    computerThinking: "Computer is thinking...",
    youWin: "You win!",
    computerWins: "The computer wins!",
    draw: "It's a draw!",
    language: "Language"
  },
  es: {
    title: "Conecta 4",
    restart: "Nuevo juego",
    you: "Tú",
    computer: "Ordenadór",
    yourTurn: "Tu turno",
    computerStarts: "Empieza el ordenadór",
    computerThinking: "El ordenadór está pensando...",
    youWin: "¡Ganaste!",
    computerWins: "¡Gana el ordenadór!",
    draw: "¡Es un empate!",
    language: "Idioma"
  },
  zh: {
    title: "四子棋",
    restart: "新遊戲",
    you: "你",
    computer: "電腦",
    yourTurn: "到你",
    computerStarts: "電腦先手",
    computerThinking: "電腦諗緊...",
    youWin: "你贏咗！",
    computerWins: "電腦贏咗！",
    draw: "和局！",
    language: "語言"
  }
};

let currentLang = detectLanguage();
localStorage.setItem("connect4_lang", currentLang);

let languageChangedCallback = null;

function getLanguageFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const lang = (params.get("lang") || "").toLowerCase();

  if (lang === "en" || lang === "es" || lang === "zh") {
    return lang;
  }

  return null;
}

function getLanguageFromStorage() {
  const stored = localStorage.getItem("connect4_lang");

  if (stored === "en" || stored === "es" || stored === "zh") {
    return stored;
  }

  return null;
}

function getLanguageFromBrowser() {
  const navLang = (navigator.language || "").toLowerCase();

  if (navLang.startsWith("es")) return "es";
  if (navLang.startsWith("zh")) return "zh";
  if (navLang.startsWith("en")) return "en";

  return null;
}

function detectLanguage() {
  return (
    getLanguageFromQuery() ||
    getLanguageFromStorage() ||
    getLanguageFromBrowser() ||
    "en"
  );
}

export function t(key) {
  return translations[currentLang]?.[key] || translations.en[key] || key;
}

export function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach(element => {
    const key = element.getAttribute("data-i18n");
    element.textContent = t(key);
  });

  document.documentElement.lang = currentLang;

  const langSelect = document.getElementById("lang-select");

  if (langSelect) {
    langSelect.value = currentLang;
  }
}

export function initLanguage({ onLanguageChanged }) {
  languageChangedCallback = onLanguageChanged;
  applyTranslations();
}

export function onLanguageChange() {
  const langSelect = document.getElementById("lang-select");

  langSelect.addEventListener("change", () => {
    const newLang = langSelect.value;

    if (newLang === "en" || newLang === "es" || newLang === "zh") {
      currentLang = newLang;
      localStorage.setItem("connect4_lang", currentLang);

      applyTranslations();

      if (languageChangedCallback) {
        languageChangedCallback();
      }
    }
  });
}