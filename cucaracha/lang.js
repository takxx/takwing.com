"use strict";

export const LANGUAGE_STORAGE_KEY = "roachPatrolLanguage";
export const VALID_LANGUAGES = ["en", "es", "zh"];

export const translations = {
  en: {
    gameTitle: "Roach Patrol",
    language: "Language",
    stage: "Stage",
    target: "Target",
    hit: "Hit",
    time: "Time",
    best: "dead",
    instructions: "Click or tap to swat the roaches!",
    ready:
      "Clear all the roaches before the 15-second timer runs out. Use the music switch if you want background music.",
    start: "Start game",
    music: "Background music",
    stageCleared: "Stage cleared! Ready for stage {stage}?",
    stageClearedBody:
      "Thank you for clearing the space. {score} roaches exterminated.",
    continue: "Continue",
    done: "Done",
    timeUp: "Time's up!",
    timeUpBodyOne:
      "Mission failed. A roach left roaming.",
    timeUpBodyMany:
      "Mission failed. {remaining} roaches left roaming.",
    tryAgain: "Try again?"
  },
  es: {
    gameTitle: "Putas cucarachas",
    language: "Idioma",
    stage: "Fase",
    target: "Objetivo",
    hit: "Aciertos",
    time: "Tiempo",
    best: "eliminadas",
    instructions: "¡Haz clic o toca para aplastar las cucarachas!",
    ready:
      "Elimina todas las cucarachas antes de que termine el límite de 15 segundos. Usa el interruptor si quieres música de fondo.",
    start: "Empezar",
    music: "Música de fondo",
    stageCleared: "¡Fase superada! ¿Listo para la fase {stage}?",
    stageClearedBody:
      "Gracias por limpiar el espacio. {score} cucarachas exterminadas.",
    continue: "Continuar",
    done: "Listo",
    timeUp: "¡Se acabó el tiempo!",
    timeUpBodyOne:
      "Misión fallida. Quedan una cucaracha rondando.",
    timeUpBodyMany:
      "Misión fallida. Quedan {remaining} cucarachas rondando.",
    tryAgain: "¿Lo intentas de nuevo?"
  },
  zh: {
    gameTitle: "打曱甴",
    language: "語言",
    stage: "關卡",
    target: "目標",
    hit: "擊中",
    time: "時間",
    best: "隻死曱甴",
    instructions: "撳一下或點一下，打曱甴！",
    ready: "喺15秒內清除所有曱甴。想播背景音樂就開啟音樂掣。",
    start: "開始遊戲",
    music: "背景音樂",
    stageCleared: "過關喇！準備好玩第 {stage} 關未？",
    stageClearedBody: "多謝你清理咗個空間。已經消滅咗 {score} 隻曱甴。",
    continue: "繼續",
    done: "完成",
    timeUp: "時間到！",
    timeUpBodyOne: "任務失敗。仲有 {remaining} 隻曱甴周圍走。",
    timeUpBodyMany: "任務失敗。仲有 {remaining} 隻曱甴周圍走。",
    tryAgain: "再玩一次？"
  }
};

let language = getInitialLanguage();

export function getInitialLanguage() {
  const queryLanguage = new URLSearchParams(window.location.search).get("lang");

  if (VALID_LANGUAGES.includes(queryLanguage)) {
    return queryLanguage;
  }

  const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);

  if (VALID_LANGUAGES.includes(savedLanguage)) {
    return savedLanguage;
  }

  const browserLanguage = (navigator.language || "").toLowerCase();

  if (browserLanguage.startsWith("es")) return "es";

  if (
    browserLanguage.startsWith("zh-hk") ||
    browserLanguage.startsWith("zh-tw") ||
    browserLanguage.startsWith("zh-hant") ||
    browserLanguage.startsWith("yue")
  ) {
    return "zh";
  }

  return "en";
}

export function getLanguage() {
  return language;
}

export function text(key, values = {}) {
  let result =
    translations[language][key] ?? translations.en[key] ?? key;

  for (const [name, value] of Object.entries(values)) {
    result = result.replaceAll(`{${name}}`, String(value));
  }

  return result;
}

export function setLanguage(nextLanguage) {
  if (!VALID_LANGUAGES.includes(nextLanguage)) return false;

  language = nextLanguage;
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);

  return true;
}