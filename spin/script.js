"use strict";

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");
const wheelWrap = document.getElementById("wheelWrap");
const pointer = document.getElementById("pointer");
const optionInput = document.getElementById("optionInput");
const applyButton = document.getElementById("applyButton");
const result = document.getElementById("result");
const langSelect = document.getElementById("lang");

const translations = {
  en: {
    title: "Wheel of decision",
    language: "Language:",
    instructions: "Enter one option per line, then click or touch the wheel.",
    optionsLabel: "Wheel options",
    optionsPlaceholder: "Enter one option per line",
    apply: "Apply options",
    ready: "Ready",
    spinning: "Spinning…",
    addOptions: "Add at least two options.",
    result: "Result: {option}",
  },
  es: {
    title: "La ruleta de opciones",
    language: "Idioma:",
    instructions:
      "Escribe una opción por línea y luego haz clic o toca la ruleta.",
    optionsLabel: "Opciones de la ruleta",
    optionsPlaceholder: "Escribe una opción por línea",
    apply: "Aplicar opciones",
    ready: "Listo",
    spinning: "Girando…",
    addOptions: "Añade al menos dos opciones.",
    result: "Resultado: {option}",
  },
  "zh-Hant": {
    title: "幸運輪",
    language: "語言：",
    instructions: "每行輸入一個選項，然後點擊或觸碰轉盤。",
    optionsLabel: "轉盤選項",
    optionsPlaceholder: "每行輸入一個選項",
    apply: "套用選項",
    ready: "準備完成",
    spinning: "轉動中…",
    addOptions: "請至少加入兩個選項。",
    result: "結果：{option}",
  },
};

const supportedLanguages = ["en", "es", "zh-Hant"];
const languageStorageKey = "pinning-wheel-language";
const baseColors = [
  "#9e3f32",
  "#c1843e",
  "#d1ad67",
  "#65734a",
  "#3e6657",
  "#4b5d78",
  "#786071",
  "#ad7653",
];

let options = ["1", "2", "3", "4", "5", "6"];
let segmentColors = [];
let rotation = 0;
let previousRotation = 0;
let velocity = 0;
let spinning = false;
let lastBoundary = 0;
let audioContext = null;

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragStartTime = 0;
let hasDraggedEnough = false;

let currentLanguage = getInitialLanguage();

function normalizeLanguage(language) {
  if (!language) return null;

  const normalized = language.toLowerCase();

  if (normalized.startsWith("en")) return "en";
  if (normalized.startsWith("es")) return "es";
  if (
    normalized.startsWith("zh") ||
    normalized.startsWith("yue") ||
    normalized.startsWith("cmn")
  ) {
    return "zh-Hant";
  }

  return null;
}

function getLanguageFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return normalizeLanguage(params.get("lang"));
}

function getLanguageFromBrowser() {
  const browserLanguages =
    Array.isArray(navigator.languages) && navigator.languages.length
      ? navigator.languages
      : [navigator.language];

  for (const language of browserLanguages) {
    const normalized = normalizeLanguage(language);
    if (normalized) return normalized;
  }

  return "en";
}

function getInitialLanguage() {
  let savedLanguage = null;

  try {
    savedLanguage = normalizeLanguage(
      localStorage.getItem(languageStorageKey)
    );
  } catch {
    // Storage may be unavailable.
  }

  return savedLanguage || getLanguageFromUrl() || getLanguageFromBrowser();
}

function translate(key, values = {}) {
  const languagePack = translations[currentLanguage] || translations.en;
  let text = languagePack[key] ?? translations.en[key] ?? key;

  for (const [name, value] of Object.entries(values)) {
    text = text.replace(`{${name}}`, value);
  }

  return text;
}

function applyTranslations() {
  document.documentElement.lang =
    currentLanguage === "zh-Hant" ? "zh-Hant" : currentLanguage;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = translate(element.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.placeholder = translate(element.dataset.i18nPlaceholder);
  });

  if (langSelect) {
    langSelect.value = currentLanguage;
  }

  updateResultText();
}

function setLanguage(language) {
  if (!supportedLanguages.includes(language)) {
    language = "en";
  }

  currentLanguage = language;

  try {
    localStorage.setItem(languageStorageKey, currentLanguage);
  } catch {
    // Storage may be unavailable.
  }

  applyTranslations();
}

function updateResultText() {
  if (!result) return;

  if (spinning) {
    result.textContent = translate("spinning");
    return;
  }

  const option = result.dataset.resultOption;

  if (option) {
    result.textContent = translate("result", { option });
    return;
  }

  if (result.dataset.messageKey) {
    result.textContent = translate(result.dataset.messageKey);
  }
}

function showMessage(messageKey) {
  if (!result) return;

  result.dataset.resultOption = "";
  result.dataset.messageKey = messageKey;
  result.textContent = translate(messageKey);
}

function showResult(option) {
  if (!result) return;

  result.dataset.messageKey = "";
  result.dataset.resultOption = option;
  result.textContent = translate("result", { option });
}

function getEvenlySpacedIndices(count, paletteSize) {
  const indices = [];
  const step = paletteSize / count;

  for (let i = 0; i < count; i += 1) {
    indices.push(Math.round(i * step) % paletteSize);
  }

  return indices;
}

function getColorList(count) {
  if (count < 2) return [baseColors[0]];

  if (count <= baseColors.length) {
    return getEvenlySpacedIndices(count, baseColors.length).map(
      (index) => baseColors[index]
    );
  }

  let repeatingFactor = 1;

  for (
    let candidate = Math.min(baseColors.length, count - 1);
    candidate >= 2;
    candidate -= 1
  ) {
    if (count % candidate === 0) {
      repeatingFactor = candidate;
      break;
    }
  }

  if (repeatingFactor === 1) {
    return Array.from(
      { length: count },
      (_, index) => baseColors[index % baseColors.length]
    );
  }

  const palette = getEvenlySpacedIndices(
    repeatingFactor,
    baseColors.length
  ).map((index) => baseColors[index]);

  const repeats = count / repeatingFactor;
  return Array.from({ length: repeats }, () => palette).flat();
}

function refreshSegmentColors() {
  segmentColors = getColorList(options.length);
}

function shadeColor(hex, amount) {
  let color = hex.replace("#", "");

  if (color.length === 3) {
    color = color
      .split("")
      .map((character) => character + character)
      .join("");
  }

  const number = parseInt(color, 16);
  const red = Math.max(0, Math.min(255, (number >> 16) + amount));
  const green = Math.max(
    0,
    Math.min(255, ((number >> 8) & 255) + amount)
  );
  const blue = Math.max(0, Math.min(255, (number & 255) + amount));

  return `rgb(${red}, ${green}, ${blue})`;
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const pixelRatio = window.devicePixelRatio || 1;

  canvas.width = Math.round(rect.width * pixelRatio);
  canvas.height = Math.round(rect.height * pixelRatio);
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  drawWheel();
}

function drawWheel() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const size = Math.min(width, height);

  if (!width || !height || !size) return;

  const center = size / 2;
  const radius = size / 2 - 8;
  const segmentAngle = (Math.PI * 2) / options.length;

  ctx.clearRect(0, 0, width, height);

  if (segmentColors.length !== options.length) {
    refreshSegmentColors();
  }

  ctx.save();
  ctx.translate(center, center);
  ctx.rotate(rotation);

  for (let i = 0; i < options.length; i += 1) {
    const startAngle = -Math.PI / 2 + i * segmentAngle;
    const endAngle = startAngle + segmentAngle;
    const color = segmentColors[i];

    const gradient = ctx.createLinearGradient(
      -radius,
      -radius,
      radius,
      radius
    );
    gradient.addColorStop(0, shadeColor(color, 35));
    gradient.addColorStop(0.45, color);
    gradient.addColorStop(1, shadeColor(color, -35));

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = "rgba(245, 224, 185, 0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();

    drawOptionLabel(options[i], radius, segmentAngle, startAngle);
  }

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.lineWidth = 12;
  ctx.strokeStyle = "#9b7135";
  ctx.shadowColor = "rgba(24, 14, 6, 0.65)";
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.restore();

  drawFixedRimReflection(center, radius);
  drawFixedCenterHub(center, radius);
}

function drawOptionLabel(option, radius, segmentAngle, startAngle) {
  const labelRadius = radius * 0.82;

  // The usable width is based on the sector's chord at the label position,
  // so it gets narrower as the number of options increases.
  const maxTextWidth =
    2 * labelRadius * Math.sin(segmentAngle / 2) * 0.9;

  let fontSize = Math.min(96, Math.max(10, radius * 0.24));
  const fontFamily = 'Georgia, "Times New Roman", serif';

  ctx.save();

  const middleAngle = startAngle + segmentAngle / 2;
  ctx.rotate(middleAngle);
  ctx.translate(labelRadius, 0);
  ctx.rotate(Math.PI / 2);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";

  ctx.font = `900 ${fontSize}px ${fontFamily}`;

  while (
    ctx.measureText(option).width > maxTextWidth &&
    fontSize > 5
  ) {
    fontSize -= 1;
    ctx.font = `900 ${fontSize}px ${fontFamily}`;
  }

  ctx.lineWidth = Math.max(2, fontSize * 0.09);
  ctx.strokeStyle = "#f2cb72";
  ctx.shadowColor = "rgba(35, 15, 5, 0.7)";
  ctx.shadowBlur = 4;
  ctx.strokeText(option, 0, 0);

  ctx.fillStyle = "#9f2528";
  ctx.fillText(option, 0, 0);

  ctx.restore();
}

function drawFixedRimReflection(center, radius) {
  ctx.save();
  ctx.translate(center, center);

  const gradient = ctx.createLinearGradient(
    -radius,
    -radius,
    radius,
    radius
  );
  gradient.addColorStop(0, "#f4d99a");
  gradient.addColorStop(0.18, "#c79b50");
  gradient.addColorStop(0.42, "#8c642c");
  gradient.addColorStop(0.62, "#e1bd72");
  gradient.addColorStop(0.82, "#765023");
  gradient.addColorStop(1, "#d2aa60");

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.lineWidth = 10;
  ctx.strokeStyle = gradient;
  ctx.stroke();

  ctx.restore();
}

function drawFixedCenterHub(center, radius) {
  ctx.save();
  ctx.translate(center, center);

  const hubRadius = radius * 0.13;
  const gradient = ctx.createRadialGradient(
    -hubRadius * 0.4,
    -hubRadius * 0.45,
    1,
    0,
    0,
    hubRadius
  );

  gradient.addColorStop(0, "#fff0c7");
  gradient.addColorStop(0.22, "#d9b76f");
  gradient.addColorStop(0.52, "#a77938");
  gradient.addColorStop(0.82, "#68461f");
  gradient.addColorStop(1, "#382511");

  ctx.beginPath();
  ctx.arc(0, 0, hubRadius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.shadowColor = "rgba(24, 14, 6, 0.65)";
  ctx.shadowBlur = 7;
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#f0d89e";
  ctx.stroke();

  ctx.restore();
}

function playClick(direction) {
  const AudioContextClass =
    window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) return;

  audioContext ||= new AudioContextClass();

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  const now = audioContext.currentTime;
  const duration = 0.045;
  const sampleRate = audioContext.sampleRate;
  const buffer = audioContext.createBuffer(
    1,
    Math.floor(sampleRate * duration),
    sampleRate
  );
  const data = buffer.getChannelData(0);

  for (let i = 0; i < data.length; i += 1) {
    const fade = 1 - i / data.length;
    data[i] = (Math.random() * 2 - 1) * fade * fade;
  }

  const source = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();

  filter.type = "bandpass";
  filter.frequency.value = 1800;
  filter.Q.value = 1.8;

  gain.gain.setValueAtTime(0.16, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  source.buffer = buffer;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(audioContext.destination);
  source.start(now);
  source.stop(now + duration);

  pointer.classList.remove("hit-left", "hit-right");
  void pointer.offsetWidth;
  pointer.classList.add(direction > 0 ? "hit-right" : "hit-left");
}

function crossedBoundary() {
  const fullCircle = Math.PI * 2;
  const segmentAngle = fullCircle / options.length;
  const currentBoundary = Math.floor(rotation / segmentAngle);

  if (currentBoundary === lastBoundary) return;

  const numberOfClicks = Math.abs(currentBoundary - lastBoundary);
  const wheelDirection = rotation > previousRotation ? 1 : -1;
  const pointerDirection = -wheelDirection;

  for (let i = 0; i < Math.min(numberOfClicks, 4); i += 1) {
    setTimeout(() => playClick(pointerDirection), i * 18);
  }

  lastBoundary = currentBoundary;
}

function getSelectedOption() {
  const fullCircle = Math.PI * 2;
  const segmentAngle = fullCircle / options.length;
  let localAngle = (-rotation) % fullCircle;

  if (localAngle < 0) {
    localAngle += fullCircle;
  }

  const selectedIndex = Math.floor(localAngle / segmentAngle);
  return options[selectedIndex % options.length];
}

function animate() {
  if (!spinning) return;

  previousRotation = rotation;
  rotation += velocity;
  velocity *= 0.985;

  crossedBoundary();
  drawWheel();

  if (Math.abs(velocity) < 0.002) {
    spinning = false;
    velocity = 0;
    showResult(getSelectedOption());
    return;
  }

  requestAnimationFrame(animate);
}

function spin(direction, baseSpeed = null) {
  if (options.length < 2) {
    showMessage("addOptions");
    return;
  }

  if (spinning) return;

  const minSpeed = 0.28;
  const randomExtra = Math.random() * 0.14;

  if (baseSpeed == null) {
    velocity = direction * (minSpeed + randomExtra);
  } else {
    const speed = Math.max(minSpeed, Math.min(0.6, Math.abs(baseSpeed)));
    velocity = direction * speed;
  }

  spinning = true;
  result.dataset.resultOption = "";
  result.dataset.messageKey = "";
  result.textContent = translate("spinning");

  const segmentAngle = (Math.PI * 2) / options.length;
  lastBoundary = Math.floor(rotation / segmentAngle);

  animate();
}

function applyOptions() {
  const newOptions = optionInput.value
    .split("\n")
    .map((option) => option.trim())
    .filter(Boolean);

  if (newOptions.length < 2) {
    showMessage("addOptions");
    return;
  }

  options = newOptions;
  rotation = 0;
  previousRotation = 0;
  velocity = 0;
  spinning = false;

  showMessage("ready");
  refreshSegmentColors();
  drawWheel();
}

function getWheelRect() {
  return canvas.getBoundingClientRect();
}

function getWheelCenter(rect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function startDrag(clientX, clientY) {
  if (spinning) return;

  isDragging = true;
  hasDraggedEnough = false;
  dragStartX = clientX;
  dragStartY = clientY;
  dragStartTime = performance.now();
}

function moveDrag(clientX, clientY) {
  if (!isDragging) return;

  const dx = clientX - dragStartX;
  const dy = clientY - dragStartY;

  if (!hasDraggedEnough && Math.hypot(dx, dy) > 10) {
    hasDraggedEnough = true;
  }
}

function endDrag(clientX, clientY) {
  if (!isDragging) return;

  isDragging = false;

  const rect = getWheelRect();
  const center = getWheelCenter(rect);

  const startX = dragStartX - center.x;
  const startY = dragStartY - center.y;
  const endX = clientX - center.x;
  const endY = clientY - center.y;

  const dx = endX - startX;
  const dy = endY - startY;

  // Tangent to the wheel at the drag's starting point.
  const tangentX = -startY;
  const tangentY = startX;
  const tangentLength = Math.hypot(tangentX, tangentY);
  const totalDistance = Math.hypot(dx, dy);

  if (!hasDraggedEnough || totalDistance < 10 || tangentLength === 0) {
    spin(dragStartX < center.x ? -1 : 1);
    return;
  }

  const dotProduct = dx * tangentX + dy * tangentY;
  const direction = dotProduct > 0 ? 1 : -1;
  const elapsedTime = performance.now() - dragStartTime;
  const speed = totalDistance / Math.max(1, elapsedTime);

  spin(direction, speed * 0.6);
}

wheelWrap.addEventListener("mousedown", (event) => {
  event.preventDefault();
  startDrag(event.clientX, event.clientY);
});

window.addEventListener("mousemove", (event) => {
  moveDrag(event.clientX, event.clientY);
});

window.addEventListener("mouseup", (event) => {
  endDrag(event.clientX, event.clientY);
});

wheelWrap.addEventListener(
  "touchstart",
  (event) => {
    if (event.touches.length !== 1) return;

    event.preventDefault();
    const touch = event.touches[0];
    startDrag(touch.clientX, touch.clientY);
  },
  { passive: false }
);

window.addEventListener(
  "touchmove",
  (event) => {
    if (!isDragging || event.touches.length !== 1) return;

    event.preventDefault();
    const touch = event.touches[0];
    moveDrag(touch.clientX, touch.clientY);
  },
  { passive: false }
);

window.addEventListener(
  "touchend",
  (event) => {
    if (!isDragging) return;

    event.preventDefault();
    const touch = event.changedTouches[0];
    endDrag(touch.clientX, touch.clientY);
  },
  { passive: false }
);

langSelect.addEventListener("change", (event) => {
  setLanguage(event.target.value);
});

applyButton.addEventListener("click", applyOptions);
window.addEventListener("resize", resizeCanvas);

applyTranslations();
refreshSegmentColors();
resizeCanvas();
