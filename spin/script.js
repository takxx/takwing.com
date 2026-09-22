const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

const wheelWrap = document.getElementById("wheelWrap");
const pointer = document.getElementById("pointer");
const optionInput = document.getElementById("optionInput");
const applyButton = document.getElementById("applyButton");
const result = document.getElementById("result");

let options = ["1", "2", "3", "4", "5", "6"];

let rotation = 0;
let previousRotation = 0;
let velocity = 0;
let spinning = false;
let lastBoundary = 0;
let audioContext = null;

const colors = [
  "#ff6b6b",
  "#ffd166",
  "#06d6a0",
  "#4cc9f0",
  "#9b5de5",
  "#f15bb5",
  "#ff924c",
  "#8ac926"
];

function resizeCanvas() {
  const rectangle = canvas.getBoundingClientRect();
  const pixelRatio = window.devicePixelRatio || 1;

  canvas.width = rectangle.width * pixelRatio;
  canvas.height = rectangle.height * pixelRatio;

  ctx.setTransform(
    pixelRatio,
    0,
    0,
    pixelRatio,
    0,
    0
  );

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

  /*
    Rotating wheel body.
    The segments and their borders rotate, but no reflective
    rim gradient is drawn inside this block.
  */
  ctx.save();
  ctx.translate(center, center);
  ctx.rotate(rotation);

  for (let i = 0; i < options.length; i++) {
    const startAngle = -Math.PI / 2 + i * segmentAngle;
    const endAngle = startAngle + segmentAngle;
    const color = colors[i % colors.length];

    const segmentGradient = ctx.createLinearGradient(
      -radius,
      -radius,
      radius,
      radius
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
    ctx.rotate(startAngle + segmentAngle / 2);

    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 ${Math.max(16, radius * 0.105)}px system-ui`;
    ctx.shadowColor = "#0009";
    ctx.shadowBlur = 4;

    ctx.fillText(options[i], radius * 0.82, 0);

    ctx.restore();
  }

  // Plain rim base
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

  /*
    Fixed rim reflection.
    This is deliberately drawn outside the rotated canvas block.
  */
  drawFixedRimReflection(center, radius);

  /*
    Fixed center hub and reflection.
  */
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

function playClick(direction) {
  audioContext ||= new (
    window.AudioContext || window.webkitAudioContext
  )();

  const now = audioContext.currentTime;
  const duration = 0.045;
  const sampleRate = audioContext.sampleRate;

  const buffer = audioContext.createBuffer(
    1,
    sampleRate * duration,
    sampleRate
  );

  const data = buffer.getChannelData(0);

  // Short filtered noise burst for a mechanical click
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

  // Make the pointer flex in the travel direction
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
  const currentBoundary = Math.floor(
    rotation / segmentAngle
  );

  if (currentBoundary !== lastBoundary) {
    const numberOfClicks = Math.abs(
      currentBoundary - lastBoundary
    );

    const direction = rotation > previousRotation ? 1 : -1;

    for (let i = 0; i < Math.min(numberOfClicks, 4); i++) {
      setTimeout(() => {
        playClick(direction);
      }, i * 18);
    }

    lastBoundary = currentBoundary;
  }
}

function getSelectedOption() {
  const fullCircle = Math.PI * 2;
  const segmentAngle = fullCircle / options.length;

  /*
    The first segment starts at -90 degrees,
    exactly where the pointer is located.
  */
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

    result.textContent = `Result: ${getSelectedOption()}`;
    return;
  }

  requestAnimationFrame(animate);
}

function spin() {
  if (options.length < 2) {
    result.textContent = "Add at least two options.";
    return;
  }

  if (spinning) {
    return;
  }

  const direction = Math.random() > 0.5 ? 1 : -1;

  velocity = direction * (0.28 + Math.random() * 0.14);
  spinning = true;

  result.textContent = "Spinning…";

  const segmentAngle = Math.PI * 2 / options.length;

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
    result.textContent = "Add at least two options.";
    return;
  }

  options = newOptions;
  rotation = 0;
  previousRotation = 0;
  velocity = 0;
  spinning = false;

  result.textContent = "Ready";

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
    Math.min(255, ((number >> 8) & 255) + amount)
  );

  const blue = Math.max(
    0,
    Math.min(255, (number & 255) + amount)
  );

  return `rgb(${red}, ${green}, ${blue})`;
}

wheelWrap.addEventListener("click", spin);
applyButton.addEventListener("click", applyOptions);
window.addEventListener("resize", resizeCanvas);

resizeCanvas();
