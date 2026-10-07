"use strict";

// ---------- DOM ----------

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

const wheelWrap = document.getElementById("wheelWrap");
const pointer = document.getElementById("pointer");
const optionInput = document.getElementById("optionInput");
const applyButton = document.getElementById("applyButton");
const result = document.getElementById("result");
const langSelect = document.getElementById("lang");

// ---------- Translation ----------

const translations = {
  en: {
    title: "Wheel options",
    language: "Language:",
    instructions:
      "Enter one option per line, then click or touch the wheel.",
    optionsLabel: "Wheel options",
    optionsPlaceholder: "Enter one option per line",
    apply: "Apply options",
    ready: "Ready",
    spinning: "Spinning…",
    addOptions: "Add at least two options.",
    result: "Result: {option}"
  },

  es: {
    title: "Opciones de la ruleta",
    language: "Idioma:",
    instructions:
      "Escribe una opción por línea y luego haz clic o toca la ruleta.",
    optionsLabel: "Opciones de la ruleta",
    optionsPlaceholder: "Escribe una opción por línea",
    apply: "Aplicar opciones",
    ready: "Listo",
    spinning: "Girando…",
    addOptions: "Añade al menos dos opciones.",
    result: "Resultado: {option}"
  },

  "zh-Hant": {
    title: "轉盤選項",
    language: "語言：",
    instructions:
      "每行輸入一個選項，然後點擊或觸碰轉盤。",
    optionsLabel: "轉盤選項",
    optionsPlaceholder: "每行輸入一個選項",
    apply: "套用選項",
    ready: "準備完成",
    spinning: "轉動中…",
    addOptions: "請至少加入兩個選項。",
    result: "結果：{option}"
  }
};

const supportedLanguages = ["en", "es", "zh-Hant"];
const languageStorageKey = "pinning-wheel-language";

let currentLanguage = getInitialLanguage();

function normalizeLanguage(language) {
  if (!language) return null;

  const normalized = language.toLowerCase();

  if (normalized.startsWith("en")) {
    return "en";
  }

  if (normalized.startsWith("es")) {
    return "es";
  }

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

    if (normalized) {
      return normalized;
    }
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
    // Storage may be unavailable in some browser contexts.
  }

  const urlLanguage = getLanguageFromUrl();

  return savedLanguage || urlLanguage || getLanguageFromBrowser();
}

function translate(key, values = {}) {
  const languagePack =
    translations[currentLanguage] || translations.en;

  let text =
    languagePack[key] ??
    translations.en[key] ??
    key;

  for (const [name, value] of Object.entries(values)) {
    text = text.replace(`{${name}}`, value);
  }

  return text;
}

function applyTranslations() {
  document.documentElement.lang =
    currentLanguage === "zh-Hant"
      ? "zh-Hant"
      : currentLanguage;

  document.querySelectorAll("[data-i18n]").forEach(element => {
    const key = element.dataset.i18n;
    element.textContent = translate(key);
  });

  document
    .querySelectorAll("[data-i18n-placeholder]")
    .forEach(element => {
      const key = element.dataset.i18nPlaceholder;
      element.placeholder = translate(key);
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
    localStorage.setItem(
      languageStorageKey,
      currentLanguage
    );
  } catch {
    // Continue normally if storage is unavailable.
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

// ---------- Wheel state ----------

let options = ["1", "2", "3", "4", "5", "6"];

let segmentColors = [];

let rotation = 0;
let previousRotation = 0;
let velocity = 0;
let spinning = false;
let lastBoundary = 0;
let audioContext = null;

// Ordered around the hue wheel.
const baseColors = [
  "#80ff00",
  "#00ff80",
  "#00ffff",
  "#0080ff",
  "#8000ff",
  "#ff00bf",
  "#ff0000",
  "#ff8000"
];

// ---------- Drag state ----------

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let lastDragX = 0;
let lastDragY = 0;
let dragStartTime = 0;
let hasDraggedEnough = false;

// ---------- Color assignment ----------

function getEvenlySpacedIndices(n, paletteSize) {
  const indices = [];
  const step = paletteSize / n;

  for (let i = 0; i < n; i++) {
    indices.push(Math.round(i * step) % paletteSize);
  }

  return indices;
}

function getColorList(n) {
  if (n < 2) {
    return [baseColors[0]];
  }

  if (n <= baseColors.length) {
    const indices = getEvenlySpacedIndices(
      n,
      baseColors.length
    );

    return indices.map(index => baseColors[index]);
  }

  let factor = 1;

  for (
    let candidate = Math.min(baseColors.length, n - 1);
    candidate >= 2;
    candidate--
  ) {
    if (n % candidate === 0) {
      factor = candidate;
      break;
    }
  }

  if (factor === 1) {
    const colors = [];

    for (let i = 0; i < n; i++) {
      colors.push(baseColors[i % baseColors.length]);
    }

    return colors;
  }

  const repeats = n / factor;
  const indices = getEvenlySpacedIndices(
    factor,
    baseColors.length
  );

  const palette = indices.map(index => baseColors[index]);
  const colors = [];

  for (let repeat = 0; repeat < repeats; repeat++) {
    for (let i = 0; i < factor; i++) {
      colors.push(palette[i]);
    }
  }

  return colors;
}

function refreshSegmentColors() {
  segmentColors = getColorList(options.length);
}

// ---------- Canvas and drawing ----------

function resizeCanvas() {
  const rectangle = canvas.getBoundingClientRect();
  const pixelRatio = window.devicePixelRatio || 1;

  canvas.width = Math.round(rectangle.width * pixelRatio);
  canvas.height = Math.round(rectangle.height * pixelRatio);

  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  drawWheel();
}

function drawWheel() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const size = Math.min(width, height);

  if (!width || !height || !size) {
    return;
  }

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

  for (let i = 0; i < options.length; i++) {
    const startAngle =
      -Math.PI / 2 + i * segmentAngle;
    const endAngle = startAngle + segmentAngle;
    const color = segmentColors[i];

    const segmentGradient = ctx.createLinearGradient(
      -radius,
      -radius,
      radius,
      radius
    );

    segmentGradient.addColorStop(
      0,
      shadeColor(color, 35)
    );

    segmentGradient.addColorStop(0.45, color);

    segmentGradient.addColorStop(
      1,
      shadeColor(color, -35)
    );

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(
      0,
      0,
      radius,
      startAngle,
      endAngle
    );
    ctx.closePath();

    ctx.fillStyle = segmentGradient;
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Segment label.
    ctx.save();

    const midAngle = startAngle + segmentAngle / 2;

    ctx.rotate(midAngle);
    ctx.translate(radius * 0.82, 0);
    ctx.rotate(Math.PI / 2);

    const maxTextWidth = radius * 0.55;
    const maxFontSize = 96;
    const baseFontSize = Math.min(
      maxFontSize,
      Math.max(26, radius * 0.24)
    );

    let fontSize = baseFontSize;

    ctx.font = `700 ${fontSize}px system-ui`;

    let textWidth = ctx.measureText(options[i]).width;

    while (
      textWidth > maxTextWidth &&
      fontSize > 10
    ) {
      fontSize -= 1;
      ctx.font = `700 ${fontSize}px system-ui`;
      textWidth = ctx.measureText(options[i]).width;
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#0009";
    ctx.shadowBlur = 4;

    ctx.fillText(options[i], 0, 0);

    ctx.restore();
  }

  // Rim base.
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);

  ctx.lineWidth = 10;
  ctx.strokeStyle = "#68737e";
  ctx.shadowColor = "#0009";
  ctx.shadowBlur = 8;
  ctx.stroke();

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;

  ctx.restore();

  drawFixedRimReflection(center, radius);
  drawFixedCenterHub(center, radius);
}

function drawFixedRimReflection(center, radius) {
  ctx.save();
  ctx.translate(center, center);

  const rimHighlight = ctx.createLinearGradient(
    -radius,
    -radius,
    radius,
    radius
  );

  rimHighlight.addColorStop(
    0,
    "rgba(255, 255, 255, 0.95)"
  );

  rimHighlight.addColorStop(
    0.25,
    "rgba(255, 255, 255, 0.35)"
  );

  rimHighlight.addColorStop(
    0.5,
    "rgba(255, 255, 255, 0.05)"
  );

  rimHighlight.addColorStop(
    0.75,
    "rgba(0, 0, 0, 0.2)"
  );

  rimHighlight.addColorStop(
    1,
    "rgba(0, 0, 0, 0.55)"
  );

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);

  ctx.lineWidth = 10;
  ctx.strokeStyle = rimHighlight;
  ctx.stroke();

  ctx.restore();
}

function drawFixedCenterHub(center, radius) {
  ctx.save();
  ctx.translate(center, center);

  const hubRadius = radius * 0.13;

  const hubGradient = ctx.createRadialGradient(
    -hubRadius * 0.45,
    -hubRadius * 0.5,
    1,
    0,
    0,
    hubRadius
  );

  hubGradient.addColorStop(0, "#ffffff");
  hubGradient.addColorStop(0.22, "#dce5ec");
  hubGradient.addColorStop(0.5, "#7f8c98");
  hubGradient.addColorStop(0.8, "#3d4752");
  hubGradient.addColorStop(1, "#151a21");

  ctx.beginPath();
  ctx.arc(0, 0, hubRadius, 0, Math.PI * 2);

  ctx.fillStyle = hubGradient;
  ctx.shadowColor = "#000a";
  ctx.shadowBlur = 7;
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;

  ctx.lineWidth = 3;
  ctx.strokeStyle = "#ffffffaa";
  ctx.stroke();

  ctx.restore();
}

// ---------- Audio ----------

function playClick(direction) {
  const AudioContext =
    window.AudioContext || window.webkitAudioContext;

  if (!AudioContext) {
    return;
  }

  audioContext ||= new AudioContext();

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

  for (let i = 0; i < data.length; i++) {
    const fade = 1 - i / data.length;
    data[i] =
      (Math.random() * 2 - 1) *
      fade *
      fade;
  }

  const source = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();

  filter.type = "bandpass";
  filter.frequency.value = 1800;
  filter.Q.value = 1.8;

  gain.gain.setValueAtTime(0.16, now);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    now + duration
  );

  source.buffer = buffer;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(audioContext.destination);

  source.start(now);
  source.stop(now + duration);

  pointer.classList.remove("hit-left", "hit-right");
  void pointer.offsetWidth;

  pointer.classList.add(
    direction > 0 ? "hit-right" : "hit-left"
  );
}

function crossedBoundary() {
  const fullCircle = Math.PI * 2;
  const segmentAngle = fullCircle / options.length;
  const currentBoundary = Math.floor(
    rotation / segmentAngle
  );

  if (currentBoundary === lastBoundary) {
    return;
  }

  const numberOfClicks = Math.abs(
    currentBoundary - lastBoundary
  );

  const wheelDirection =
    rotation > previousRotation ? 1 : -1;

  const pointerDirection = -wheelDirection;

  for (
    let i = 0;
    i < Math.min(numberOfClicks, 4);
    i++
  ) {
    setTimeout(
      () => playClick(pointerDirection),
      i * 18
    );
  }

  lastBoundary = currentBoundary;
}

function getSelectedOption() {
  const fullCircle = Math.PI * 2;
  const segmentAngle = fullCircle / options.length;

  let localAngle = -rotation % fullCircle;

  if (localAngle < 0) {
    localAngle += fullCircle;
  }

  const selectedIndex = Math.floor(
    localAngle / segmentAngle
  );

  return options[selectedIndex % options.length];
}

function animate() {
  if (!spinning) {
    return;
  }

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

  if (spinning) {
    return;
  }

  const minSpeed = 0.28;
  const randomExtra = Math.random() * 0.14;

  if (baseSpeed == null) {
    velocity = direction * (
      minSpeed + randomExtra
    );
  } else {
    const clamped = Math.max(
      minSpeed,
      Math.min(0.6, Math.abs(baseSpeed))
    );

    velocity = direction * clamped;
  }

  spinning = true;
  result.dataset.resultOption = "";
  result.dataset.messageKey = "";
  result.textContent = translate("spinning");

  const segmentAngle =
    (Math.PI * 2) / options.length;

  lastBoundary = Math.floor(
    rotation / segmentAngle
  );

  animate();
}

function applyOptions() {
  const newOptions = optionInput.value
    .split("\n")
    .map(option => option.trim())
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

function shadeColor(hex, amount) {
  let color = hex.replace("#", "");

  if (color.length === 3) {
    color = color
      .split("")
      .map(character => character + character)
      .join("");
  }

  const number = parseInt(color, 16);

  const red = Math.max(
    0,
    Math.min(255, (number >> 16) + amount)
  );

  const green = Math.max(
    0,
    Math.min(
      255,
      ((number >> 8) & 255) + amount
    )
  );

  const blue = Math.max(
    0,
    Math.min(255, (number & 255) + amount)
  );

  return `rgb(${red}, ${green}, ${blue})`;
}

// ---------- Input handling ----------

function getWheelRect() {
  return canvas.getBoundingClientRect();
}

function getWheelCenter(rect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

function startDrag(clientX, clientY) {
  if (spinning) {
    return;
  }

  isDragging = true;
  hasDraggedEnough = false;

  dragStartX = clientX;
  dragStartY = clientY;
  lastDragX = clientX;
  lastDragY = clientY;
  dragStartTime = performance.now();
}

function moveDrag(clientX, clientY) {
  if (!isDragging) {
    return;
  }

  const dxTotal = clientX - dragStartX;
  const dyTotal = clientY - dragStartY;

  if (
    !hasDraggedEnough &&
    Math.hypot(dxTotal, dyTotal) > 10
  ) {
    hasDraggedEnough = true;
  }

  lastDragX = clientX;
  lastDragY = clientY;
}

function endDrag(clientX, clientY) {
  if (!isDragging) {
    return;
  }

  isDragging = false;

  const rect = getWheelRect();
  const center = getWheelCenter(rect);

  const sx = dragStartX - center.x;
  const sy = dragStartY - center.y;
  const ex = clientX - center.x;
  const ey = clientY - center.y;

  const tx = -sy;
  const ty = sx;

  const dx = ex - sx;
  const dy = ey - sy;

  const dot = dx * tx + dy * ty;
  const tangentLengthSquared = tx * tx + ty * ty;

  if (tangentLengthSquared === 0) {
    const direction =
      dragStartX < center.x ? -1 : 1;

    spin(direction);
    return;
  }

  const movedAlongTangent =
    dot / Math.sqrt(tangentLengthSquared);

  const totalDistance = Math.hypot(dx, dy);
  const elapsedTime =
    performance.now() - dragStartTime;

  if (
    !hasDraggedEnough ||
    totalDistance < 10
  ) {
    const direction =
      dragStartX < center.x ? -1 : 1;

    spin(direction);
    return;
  }

  const direction = movedAlongTangent > 0 ? 1 : -1;
  const speed =
    totalDistance / Math.max(1, elapsedTime);

  const baseSpeed = speed * 0.6;

  spin(direction, baseSpeed);
}

// Mouse events.
wheelWrap.addEventListener("mousedown", event => {
  event.preventDefault();
  startDrag(event.clientX, event.clientY);
});

window.addEventListener("mousemove", event => {
  moveDrag(event.clientX, event.clientY);
});

window.addEventListener("mouseup", event => {
  endDrag(event.clientX, event.clientY);
});

// Touch events.
wheelWrap.addEventListener(
  "touchstart",
  event => {
    if (event.touches.length !== 1) {
      return;
    }

    const touch = event.touches[0];

    event.preventDefault();
    startDrag(touch.clientX, touch.clientY);
  },
  { passive: false }
);

window.addEventListener(
  "touchmove",
  event => {
    if (!isDragging || event.touches.length !== 1) {
      return;
    }

    const touch = event.touches[0];

    event.preventDefault();
    moveDrag(touch.clientX, touch.clientY);
  },
  { passive: false }
);

window.addEventListener(
  "touchend",
  event => {
    if (!isDragging) {
      return;
    }

    const touch = event.changedTouches[0];

    event.preventDefault();
    endDrag(touch.clientX, touch.clientY);
  },
  { passive: false }
);

// ---------- UI events ----------

langSelect.addEventListener("change", event => {
  setLanguage(event.target.value);
});

applyButton.addEventListener("click", applyOptions);

window.addEventListener("resize", resizeCanvas);

// ---------- Initial setup ----------

applyTranslations();
refreshSegmentColors();
resizeCanvas();