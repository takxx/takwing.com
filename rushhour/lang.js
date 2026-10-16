export const SUPPORTED_LANGUAGES = ["en", "es", "zh-Hant"];

const translations = {
  en: {
    title: "Rush Hour",
    subtitle: "Move the red car to the exit.",
    moves: "Moves",
    best: "Best",
    reset: "Reset",
    newPuzzle: "New Puzzle",
    instructions: "Drag cars only in the direction they are facing.",
    solved: "Solved in {moves} moves!",
    youLabel: "YOU",
    solvedTitle: "🎉 Solved!",
    solvedMessage: "Great job! You solved it in {moves} moves.",
    newGameOk: "Another game?",
  },
  es: {
    title: "Hora punta",
    subtitle: "Mueve el coche rojo hasta la salida.",
    moves: "Movimientos",
    best: "Mejor",
    reset: "Reiniciar",
    newPuzzle: "Nuevo puzzle",
    instructions: "Arrastra los coches únicamente en la dirección en la que apuntan.",
    solved: "¡Resuelto en {moves} movimientos!",
    youLabel: "TÚ",
    solvedTitle: "🎉 ¡Resuelto!",
    solvedMessage: "¡Bien hecho! Lo resolviste en {moves} movimientos.",
    newGameOk: "¿Otro?",
  },
  "zh-Hant": {
    title: "繁忙時間",
    subtitle: "揸架紅車出去。",
    moves: "步數",
    best: "最佳",
    reset: "重設",
    newPuzzle: "新謎題",
    instructions: "汽車只可以前後移動。",
    solved: "用咗 {moves} 步出到去！",
    youLabel: "你",
    solvedTitle: "🎉 搞掂！",
    solvedMessage: "你用咗 {moves} 步。",
    newGameOk: "再玩多次？",
  },
};

export function getLanguageFromURL() {
  const langParam = new URLSearchParams(window.location.search).get("lang");
  if (!langParam) return null;

  const normalized = langParam.trim();
  if (SUPPORTED_LANGUAGES.includes(normalized)) return normalized;
  if (normalized === "zh") return "zh-Hant";

  const base = normalized.split("-")[0].toLowerCase();
  if (SUPPORTED_LANGUAGES.includes(base)) return base;
  if (base === "zh") return "zh-Hant";

  return null;
}

export function getInitialLanguage() {
  const fromURL = getLanguageFromURL();
  if (fromURL) return fromURL;

  const stored = localStorage.getItem("rush-hour-language");
  if (stored && SUPPORTED_LANGUAGES.includes(stored)) return stored;

  const browserLang =
    navigator.language || navigator.languages?.[0] || "en";

  if (SUPPORTED_LANGUAGES.includes(browserLang)) return browserLang;

  const base = browserLang.split("-")[0].toLowerCase();
  if (SUPPORTED_LANGUAGES.includes(base)) return base;
  if (base === "zh") return "zh-Hant";

  return "en";
}

export function translate(language, key) {
  return translations[language]?.[key] ?? translations.en[key] ?? key;
}

export function applyLanguage(language, cars, elements) {
  document.documentElement.lang = language;
  document.title = translate(language, "title");

  document.querySelectorAll("[data-i18n]").forEach(element => {
    element.textContent = translate(language, element.dataset.i18n);
  });

  for (const car of cars) {
    if (car.id === "target") {
      car.label = translate(language, "youLabel");
    }
  }

  elements.message.textContent = "";
}
