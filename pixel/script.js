"use strict";

const SIZE = 20;
const CANVAS_SIZE = 600;
const CELL = CANVAS_SIZE / SIZE;
const MAX_COLORS = 18;
const PREVIEW_SIZE = 60;
const SYMBOLS = [..."ABCDEFGHJKLMNPRSTU"];
const MIN_IMAGE_ID = 126;
const MAX_IMAGE_ID = 228;
const LANGUAGE_KEY = "pixel-perfect-language";

const translations = {
  en: {
    title: "Pixel Perfect",
    reset: "Reset Puzzle",
    instructions: "Choose a color, then fill squares with its letters.",
    languageLabel: "Language",
    loading: "Loading puzzle…",
    loadError: "Could not load the puzzle images. Check that images.svg is available.",
    chooseColor: "Choose a color, then fill squares with its letters.",
    squaresLeft: "{count} squares left",
    complete: "Puzzle complete!",
    finishedPicture: "Here’s your finished picture.",
    newPuzzle: "Start a new puzzle"
  },
  es: {
    title: "Píxel perfecto",
    reset: "Reiniciar el puzle",
    instructions: "Elige un color y rellena las casillas con sus letras.",
    languageLabel: "Idioma",
    loading: "Cargando el puzle…",
    loadError: "No se pudieron cargar las imágenes. Comprueba que images.svg esté disponible.",
    chooseColor: "Elige un color y rellena las casillas con sus letras.",
    squaresLeft: "Quedan {count} casillas",
    complete: "¡Puzle completado!",
    finishedPicture: "Aquí tienes la imagen terminada.",
    newPuzzle: "Empezar un puzle nuevo"
  },
  zh: {
    title: "完美像素",
    reset: "重設拼圖",
    instructions: "揀一種顏色，再填上有相同字母嘅格仔。",
    languageLabel: "語言",
    loading: "載入拼圖中⋯",
    loadError: "未能載入拼圖圖片。請檢查 images.svg 是否可用。",
    chooseColor: "揀一種顏色，再填上有相同字母嘅格仔。",
    squaresLeft: "仲有 {count} 格",
    complete: "拼圖完成！",
    finishedPicture: "完成嘅圖片喺呢度。",
    newPuzzle: "開始新拼圖"
  }
};

const canvas = document.querySelector("#canvas");
const ctx = canvas.getContext("2d");
const paletteElement = document.querySelector("#palette");
const statusElement = document.querySelector("#status");
const resetButton = document.querySelector("#resetButton");
const languageSelect = document.querySelector("#languageSelect");
const completionOverlay = document.querySelector("#completionOverlay");
const previewCanvas = document.querySelector("#completedPreview");
const previewCtx = previewCanvas.getContext("2d");
const newPuzzleButton = document.querySelector("#newPuzzleButton");

let spriteText = "";
let cells = [];
let colors = [];
let selectedColor = -1;
let dragging = false;
let currentLanguage = "en";
let currentImageId = null;

function showCompletionOverlay() {
  previewCtx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);

  cells.forEach((cell, index) => {
    const x = (index % SIZE) * PREVIEW_SIZE / SIZE;
    const y = Math.floor(index / SIZE) * PREVIEW_SIZE / SIZE;
    previewCtx.fillStyle = colorCss(colors[cell.color]);
    previewCtx.fillRect(x, y, PREVIEW_SIZE / SIZE, PREVIEW_SIZE / SIZE);
  });

  completionOverlay.hidden = false;
}

function playCompletionSound() {
  const audioContext = new AudioContext();

  // A bright, retro PC-style three-note flourish.
  const notes = [
    { frequency: 523.25, start: 0.00, duration: 0.13 }, // C5
    { frequency: 659.25, start: 0.12, duration: 0.13 }, // E5
    { frequency: 783.99, start: 0.24, duration: 0.30 }  // G5
  ];

  for (const note of notes) {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const startTime = audioContext.currentTime + note.start;

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(note.frequency, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.07, startTime + 0.01);
    gain.gain.setValueAtTime(0.07, startTime + note.duration * 0.65);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      startTime + note.duration
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + note.duration);
  }

  setTimeout(() => audioContext.close(), 800);
}

function normalizeLanguage(value) {
  const code = String(value || "").toLowerCase();

  if (code === "es" || code.startsWith("es-")) return "es";
  if (code === "zh" || code.startsWith("zh-")) return "zh";
  if (code === "en" || code.startsWith("en-")) return "en";

  return null;
}

function chooseLanguage() {
  const queryLanguage = new URLSearchParams(location.search).get("lang");
  const fromQuery = normalizeLanguage(queryLanguage);

  if (fromQuery) return fromQuery;

  try {
    const storedLanguage = normalizeLanguage(
      localStorage.getItem(LANGUAGE_KEY)
    );
    if (storedLanguage) return storedLanguage;
  } catch {
    // Storage may be unavailable; continue to browser preference.
  }

  for (const preference of navigator.languages || [navigator.language]) {
    const language = normalizeLanguage(preference);
    if (language) return language;
  }

  return "en";
}

function t(key, values = {}) {
  let text = translations[currentLanguage][key] || translations.en[key];

  for (const [name, value] of Object.entries(values)) {
    text = text.replaceAll(`{${name}}`, String(value));
  }

  return text;
}

function setLanguage(language, persist = true) {
  currentLanguage = normalizeLanguage(language) || "en";
  document.documentElement.lang = currentLanguage;
  languageSelect.value = currentLanguage;

  document.querySelectorAll("[data-i18n]").forEach(element => {
    const key = element.dataset.i18n;
    const value = translations[currentLanguage][key];
    if (value) element.textContent = value;
  });

  if (persist) {
    try {
      localStorage.setItem(LANGUAGE_KEY, currentLanguage);
    } catch {
      // The selected language still applies for this page view.
    }
  }

  updateStatus();
}

function makePalette(imageData) {
  const points = [];

  for (let i = 0; i < imageData.length; i += 4) {
    points.push([imageData[i], imageData[i + 1], imageData[i + 2]]);
  }

  const count = Math.min(MAX_COLORS, points.length);
  if (count === 0) return [];

  let centers = [];

  for (let i = 0; i < count; i++) {
    centers.push([...points[Math.floor(i * points.length / count)]]);
  }

  for (let round = 0; round < 8; round++) {
    const sums = centers.map(() => [0, 0, 0, 0]);

    for (const point of points) {
      let nearest = 0;
      let bestDistance = Infinity;

      centers.forEach((center, index) => {
        const distance =
          (point[0] - center[0]) ** 2 +
          (point[1] - center[1]) ** 2 +
          (point[2] - center[2]) ** 2;

        if (distance < bestDistance) {
          bestDistance = distance;
          nearest = index;
        }
      });

      sums[nearest][0] += point[0];
      sums[nearest][1] += point[1];
      sums[nearest][2] += point[2];
      sums[nearest][3]++;
    }

    centers = centers.map((center, index) => {
      const [r, g, b, total] = sums[index];
      return total
        ? [Math.round(r / total), Math.round(g / total), Math.round(b / total)]
        : center;
    });
  }

  const unique = [];

  for (const color of centers) {
    if (!unique.some(existing =>
      existing.every((value, index) => value === color[index])
    )) {
      unique.push(color);
    }
  }

  return unique;
}

function nearestColorIndex(r, g, b) {
  let nearest = 0;
  let bestDistance = Infinity;

  colors.forEach((color, index) => {
    const distance =
      (r - color[0]) ** 2 +
      (g - color[1]) ** 2 +
      (b - color[2]) ** 2;

    if (distance < bestDistance) {
      bestDistance = distance;
      nearest = index;
    }
  });

  return nearest;
}

function colorCss(color) {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}

function draw() {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  if (cells.length === 0) return;

  const complete = cells.every(cell => cell.filled);

  cells.forEach((cell, index) => {
    const x = (index % SIZE) * CELL;
    const y = Math.floor(index / SIZE) * CELL;

    ctx.fillStyle = cell.filled ? colorCss(colors[cell.color]) : "#fff";
    ctx.fillRect(x, y, CELL, CELL);

    if (!cell.filled) {
      ctx.fillStyle = "#222";
      ctx.font = "bold 12px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(SYMBOLS[cell.color], x + CELL / 2, y + CELL / 2);
    }
  });

  if (!complete) {
    ctx.beginPath();
    ctx.strokeStyle = "#777";
    ctx.lineWidth = 1;

    for (let i = 0; i <= SIZE; i++) {
      const position = i * CELL;
      ctx.moveTo(position, 0);
      ctx.lineTo(position, CANVAS_SIZE);
      ctx.moveTo(0, position);
      ctx.lineTo(CANVAS_SIZE, position);
    }

    ctx.stroke();
  }
}

function buildPalette() {
  paletteElement.replaceChildren();

  colors.forEach((color, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "color-button";
    button.style.backgroundColor = colorCss(color);
    button.textContent = SYMBOLS[index];
    button.setAttribute("aria-label", `${SYMBOLS[index]}`);

    button.addEventListener("click", () => {
      selectedColor = index;

      paletteElement.querySelectorAll(".color-button").forEach((item, i) => {
        item.classList.toggle("selected", i === selectedColor);
        item.setAttribute("aria-pressed", String(i === selectedColor));
      });
    });

    button.setAttribute("aria-pressed", "false");
    paletteElement.append(button);
  });
}

function updateStatus() {
  if (cells.length === 0) {
    statusElement.textContent = t("loading");
    completionOverlay.hidden = true;
    return;
  }

  const remaining = cells.filter(cell => !cell.filled).length;

  if (remaining === 0) {
    statusElement.textContent = t("complete");
      if (completionOverlay.hidden) {
        playCompletionSound();
      }
    showCompletionOverlay();
  } else {
    statusElement.textContent = t("squaresLeft", { count: remaining });
    completionOverlay.hidden = true;
  }
}

function grayscaleColor() {
  const gray = Math.floor(Math.random() * 32) + 224;
  return [gray, gray, gray, 255];
}

function loadPuzzleImage(id, spriteText) {
  const documentXml = new DOMParser().parseFromString(
    spriteText,
    "image/svg+xml"
  );

  if (documentXml.querySelector("parsererror")) {
    throw new Error("Invalid SVG sprite");
  }

  const element = documentXml.getElementById(id);
  if (!element) throw new Error(`SVG sprite has no element with id ${id}`);

  const svgRoot = documentXml.documentElement;
  const viewBox = element.getAttribute("viewBox") || svgRoot.getAttribute("viewBox");

  if (!viewBox) {
    throw new Error(`SVG element ${id} needs a viewBox`);
  }

  const standalone = documentXml.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  standalone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  standalone.setAttribute("viewBox", viewBox);
  standalone.setAttribute("width", String(SIZE));
  standalone.setAttribute("height", String(SIZE));

  const content = element.tagName.toLowerCase() === "symbol"
    ? [...element.childNodes]
    : [element];

  content.forEach(node => standalone.appendChild(node.cloneNode(true)));

  const svgBlob = new Blob(
    [new XMLSerializer().serializeToString(standalone)],
    { type: "image/svg+xml" }
  );
  const objectUrl = URL.createObjectURL(svgBlob);
  const image = new Image();

  image.onload = () => {
    try {
      const smallCanvas = document.createElement("canvas");
      smallCanvas.width = SIZE;
      smallCanvas.height = SIZE;

      const smallCtx = smallCanvas.getContext("2d", {
        willReadFrequently: true
      });

      smallCtx.drawImage(image, 0, 0, SIZE, SIZE);

      const imageData = smallCtx.getImageData(0, 0, SIZE, SIZE);
      const pixels = imageData.data;

      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] === 0) {
          const gray = grayscaleColor();
          pixels[i] = gray[0];
          pixels[i + 1] = gray[1];
          pixels[i + 2] = gray[2];
          pixels[i + 3] = 255;
        }
      }

      imageData.data.set(pixels);
      colors = makePalette(pixels);
      cells = [];

      for (let i = 0; i < pixels.length; i += 4) {
        cells.push({
          color: nearestColorIndex(pixels[i], pixels[i + 1], pixels[i + 2]),
          filled: false
        });
      }

      selectedColor = -1;
      buildPalette();
      draw();
      updateStatus();
    } catch {
      showLoadError();
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    showLoadError();
  };

  image.src = objectUrl;
}

function showLoadError() {
  cells = [];
  colors = [];
  paletteElement.replaceChildren();
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  statusElement.textContent = t("loadError");
}

function loadRandomPuzzle(spriteText) {
  let id;

  do {
    id = Math.floor(
      Math.random() * (MAX_IMAGE_ID - MIN_IMAGE_ID + 1)
    ) + MIN_IMAGE_ID;
  } while (id === currentImageId && MAX_IMAGE_ID > MIN_IMAGE_ID);

  currentImageId = id;
  loadPuzzleImage(String(id), spriteText);
}

function fillAtPointer(event) {
  if (selectedColor < 0 || cells.length === 0) return;

  const rect = canvas.getBoundingClientRect();
  const x = Math.floor(((event.clientX - rect.left) / rect.width) * SIZE);
  const y = Math.floor(((event.clientY - rect.top) / rect.height) * SIZE);

  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;

  const cell = cells[y * SIZE + x];

  if (!cell.filled && cell.color === selectedColor) {
    cell.filled = true;
    draw();
    updateStatus();
  }
}

canvas.addEventListener("pointerdown", event => {
  dragging = true;
  canvas.setPointerCapture(event.pointerId);
  fillAtPointer(event);
});

canvas.addEventListener("pointermove", event => {
  if (dragging) fillAtPointer(event);
});

canvas.addEventListener("pointerup", () => {
  dragging = false;
});

canvas.addEventListener("pointercancel", () => {
  dragging = false;
});

resetButton.addEventListener("click", () => {
  cells.forEach(cell => {
    cell.filled = false;
  });

  draw();
  updateStatus();
});

languageSelect.addEventListener("change", () => {
  setLanguage(languageSelect.value);
});

setLanguage(chooseLanguage(), false);
statusElement.textContent = t("loading");

fetch("/util/images.svg")
  .then(response => {
    if (!response.ok) throw new Error("Could not fetch images.svg");
    return response.text();
  })
  .then(text => {
    spriteText = text;
    loadRandomPuzzle(spriteText);
  })
  .catch(showLoadError);

newPuzzleButton.addEventListener("click", () => {
  completionOverlay.hidden = true;
  loadRandomPuzzle(spriteText);
});
