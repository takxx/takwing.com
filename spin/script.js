const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

const wheelWrap = document.getElementById("wheelWrap");
const pointer = document.getElementById("pointer");
const optionInput = document.getElementById("optionInput");
const applyButton = document.getElementById("applyButton");
const result = document.getElementById("result");

let options = ["1", "2", "3", "4", "5", "6"];

// Cached color list — computed once per option-set change, never per frame
let segmentColors = [];

let rotation = 0;
let previousRotation = 0;
let velocity = 0;
let spinning = false;
let lastBoundary = 0;
let audioContext = null;

// Ordered around the hue wheel so even spacing looks natural
const baseColors = [
  "#80ff00", // 90°  — neon orange‑green
  "#00ff80", // 135° — neon green‑cyan
  "#00ffff", // 180° — neon cyan
  "#0080ff", // 225° — neon blue
  "#8000ff", // 270° — neon purple
  "#ff00bf", // 315° — neon magenta‑pink
  "#ff0000", // 0°   — neon red
  "#ff8000"  // 45°  — neon orange
];

// Swipe / drag state
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let lastDragX = 0;
let lastDragY = 0;
let dragStartTime = 0;
let hasDraggedEnough = false;

// ---------- Color assignment ----------

/*
  Picks n colors spread as evenly as possible around the 8-color palette.
  No randomness — the same n always produces the same well-spaced set.

  Examples:
    n=3 -> indices 0, 3, 5  (red, green, blue)
    n=4 -> indices 0, 2, 4, 6 (red, yellow, cyan, purple)
    n=5 -> indices 0, 2, 3, 5, 7 (spread across the wheel)
*/
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

  // Case 1: n fits within the palette — pick n evenly spaced colors
  if (n <= baseColors.length) {
    const indices = getEvenlySpacedIndices(n, baseColors.length);
    return indices.map(i => baseColors[i]);
  }

  // Case 2: n exceeds the palette — find the largest usable factor
  // and repeat a well-spaced subset of colors around the wheel.
  let factor = 1;
  for (let f = Math.min(baseColors.length, n - 1); f >= 2; f--) {
    if (n % f === 0) {
      factor = f;
      break;
    }
  }

  // If n is prime (no factor found), fall back to cycling the full palette
  if (factor === 1) {
    const result = [];
    for (let i = 0; i < n; i++) {
      result.push(baseColors[i % baseColors.length]);
    }
    return result;
  }

  const repeats = n / factor;
  const indices = getEvenlySpacedIndices(factor, baseColors.length);
  const palette = indices.map(i => baseColors[i]);

  // Interleave: [c0, c1, ..., c(factor-1)] repeated `repeats` times
  const result = [];
  for (let r = 0; r < repeats; r++) {
    for (let i = 0; i < factor; i++) {
      result.push(palette[i]);
    }
  }

  return result;
}

function refreshSegmentColors() {
  segmentColors = getColorList(options.length);
}

// ---------- Canvas and drawing ----------

function resizeCanvas() {
  const rectangle = canvas.getBoundingClientRect();
  const pixelRatio = window.devicePixelRatio || 1;

  canvas.width = rectangle.width * pixelRatio;
  canvas.height = rectangle.height * pixelRatio;

  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  drawWheel();
}

function drawWheel() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const size = Math.min(width, height);

  const center = size / 2;
  const radius = size / 2 - 8;
  const segmentAngle = Math.PI * 2 / options.length;

  ctx.clearRect(0, 0, width, height);

  // Safety net: if cache is stale (e.g., options changed without refresh),
  // rebuild it once rather than every frame.
  if (segmentColors.length !== options.length) {
    refreshSegmentColors();
  }

  const colors = segmentColors;

  ctx.save();
  ctx.translate(center, center);
  ctx.rotate(rotation);

  for (let i = 0; i < options.length; i++) {
    const startAngle = -Math.PI / 2 + i * segmentAngle;
    const endAngle = startAngle + segmentAngle;
    const color = colors[i];

    const segmentGradient = ctx.createLinearGradient(
      -radius, -radius, radius, radius
    );

    segmentGradient.addColorStop(0, shadeColor(color, 35));
    segmentGradient.addColorStop(0.45, color);
    segmentGradient.addColorStop(1, shadeColor(color, -35));

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, startAngle, endAngle);
    ctx.closePath();

    ctx.fillStyle = segmentGradient;
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Segment label
    ctx.save();

    const midAngle = startAngle + segmentAngle / 2;

    ctx.rotate(midAngle);
    ctx.translate(radius * 0.82, 0);
    ctx.rotate(Math.PI / 2);

    const maxTextWidth = radius * 0.55;
    const maxFontSize = 96;
    const baseFontSize = Math.min(maxFontSize, Math.max(26, radius * 0.24));

    let fontSize = baseFontSize;
    ctx.font = `700 ${fontSize}px system-ui`;

    let textWidth = ctx.measureText(options[i]).width;

    while (textWidth > maxTextWidth && fontSize > 10) {
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

  // Rim base
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
    -radius, -radius, radius, radius
  );

  rimHighlight.addColorStop(0, "rgba(255, 255, 255, 0.95)");
  rimHighlight.addColorStop(0.25, "rgba(255, 255, 255, 0.35)");
  rimHighlight.addColorStop(0.5, "rgba(255, 255, 255, 0.05)");
  rimHighlight.addColorStop(0.75, "rgba(0, 0, 0, 0.2)");
  rimHighlight.addColorStop(1, "rgba(0, 0, 0, 0.55)");

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
    -hubRadius * 0.45, -hubRadius * 0.5, 1,
    0, 0, hubRadius
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

// ---------- Audio click ----------

function playClick(direction) {
  audioContext ||= new (
    window.AudioContext || window.webkitAudioContext
  )();

  const now = audioContext.currentTime;
  const duration = 0.045;
  const sampleRate = audioContext.sampleRate;

  const buffer = audioContext.createBuffer(
    1, sampleRate * duration, sampleRate
  );

  const data = buffer.getChannelData(0);

  for (let i = 0; i < data.length; i++) {
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

  if (direction > 0) {
    pointer.classList.add("hit-right");
  } else {
    pointer.classList.add("hit-left");
  }
}

function crossedBoundary() {
  const fullCircle = Math.PI * 2;
  const segmentAngle = fullCircle / options.length;
  const currentBoundary = Math.floor(rotation / segmentAngle);

  if (currentBoundary !== lastBoundary) {
    const numberOfClicks = Math.abs(currentBoundary - lastBoundary);
    const wheelDirection = rotation > previousRotation ? 1 : -1;
    const pointerDirection = -wheelDirection;

    for (let i = 0; i < Math.min(numberOfClicks, 4); i++) {
      setTimeout(() => playClick(pointerDirection), i * 18);
    }

    lastBoundary = currentBoundary;
  }
}

function getSelectedOption() {
  const fullCircle = Math.PI * 2;
  const segmentAngle = fullCircle / options.length;

  let localAngle = -rotation % fullCircle;
  if (localAngle < 0) localAngle += fullCircle;

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
    result.textContent = `Result: ${getSelectedOption()}`;
    return;
  }

  requestAnimationFrame(animate);
}

function spin(direction, baseSpeed = null) {
  if (options.length < 2) {
    result.textContent = "Add at least two options.";
    return;
  }

  if (spinning) return;

  // Colors are already cached from applyOptions/init — no need to refresh here
  const minSpeed = 0.28;
  const randomExtra = Math.random() * 0.14;

  if (baseSpeed == null) {
    velocity = direction * (minSpeed + randomExtra);
  } else {
    const clamped = Math.max(minSpeed, Math.min(0.6, Math.abs(baseSpeed)));
    velocity = direction * clamped;
  }

  spinning = true;
  result.textContent = "Spinning…";

  const segmentAngle = Math.PI * 2 / options.length;
  lastBoundary = Math.floor(rotation / segmentAngle);

  animate();
}

function applyOptions() {
  const newOptions = optionInput.value
    .split("\n")
    .map(option => option.trim())
    .filter(Boolean);

  if (newOptions.length < 2) {
    result.textContent = "Add at least two options.";
    return;
  }

  options = newOptions;
  rotation = 0;
  previousRotation = 0;
  velocity = 0;
  spinning = false;

  result.textContent = "Ready";

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

  const red = Math.max(0, Math.min(255, (number >> 16) + amount));
  const green = Math.max(0, Math.min(255, ((number >> 8) & 255) + amount));
  const blue = Math.max(0, Math.min(255, (number & 255) + amount));

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
  if (spinning) return;

  isDragging = true;
  hasDraggedEnough = false;
  dragStartX = clientX;
  dragStartY = clientY;
  lastDragX = clientX;
  lastDragY = clientY;
  dragStartTime = performance.now();
}

function moveDrag(clientX, clientY) {
  if (!isDragging) return;

  const dxTotal = clientX - dragStartX;
  const dyTotal = clientY - dragStartY;

  if (!hasDraggedEnough && Math.hypot(dxTotal, dyTotal) > 10) {
    hasDraggedEnough = true;
  }

  lastDragX = clientX;
  lastDragY = clientY;
}

function endDrag(clientX, clientY) {
  if (!isDragging) return;
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
  const tangentLen2 = tx * tx + ty * ty;

  if (tangentLen2 === 0) {
    const direction = dragStartX < center.x ? -1 : 1;
    spin(direction, null);
    return;
  }

  const movedAlongTangent = dot / Math.sqrt(tangentLen2);
  const totalDist = Math.hypot(dx, dy);
  const dt = performance.now() - dragStartTime;

  if (!hasDraggedEnough || totalDist < 10) {
    const direction = dragStartX < center.x ? -1 : 1;
    spin(direction, null);
    return;
  }

  const direction = movedAlongTangent > 0 ? 1 : -1;
  const speed = totalDist / Math.max(1, dt);
  const baseSpeed = speed * 0.6;

  spin(direction, baseSpeed);
}

// Mouse events
wheelWrap.addEventListener("mousedown", (e) => {
  e.preventDefault();
  startDrag(e.clientX, e.clientY);
});

window.addEventListener("mousemove", (e) => {
  moveDrag(e.clientX, e.clientY);
});

window.addEventListener("mouseup", (e) => {
  endDrag(e.clientX, e.clientY);
});

// Touch events
wheelWrap.addEventListener("touchstart", (e) => {
  if (e.touches.length !== 1) return;
  const t = e.touches[0];
  e.preventDefault();
  startDrag(t.clientX, t.clientY);
}, { passive: false });

window.addEventListener("touchmove", (e) => {
  if (!isDragging || e.touches.length !== 1) return;
  const t = e.touches[0];
  e.preventDefault();
  moveDrag(t.clientX, t.clientY);
}, { passive: false });

window.addEventListener("touchend", (e) => {
  if (!isDragging) return;
  const t = e.changedTouches[0];
  e.preventDefault();
  endDrag(t.clientX, t.clientY);
}, { passive: false });

applyButton.addEventListener("click", applyOptions);
window.addEventListener("resize", resizeCanvas);

// Initial setup
refreshSegmentColors();
resizeCanvas();