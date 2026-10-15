"use strict";

import {
  LANGUAGE_STORAGE_KEY,
  VALID_LANGUAGES,
  getLanguage,
  setLanguage,
  text
} from "./lang.js";

import { music, playHitSound } from "./audio.js";
import { drawFloor } from "./background.js";

const game = document.querySelector("#game");
const floor = document.querySelector("#floor");
const floorContext = floor.getContext("2d");
const roachLayer = document.querySelector("#roaches");
const sandal = document.querySelector("#sandal");

const stageDisplay = document.querySelector("#stage");
const targetDisplay = document.querySelector("#target");
const scoreDisplay = document.querySelector("#score");
const timerDisplay = document.querySelector("#timer");
const roachesKilledDisplay = document.querySelector("#high-score");
const message = document.querySelector("#message");

const STAGE_TIME = 30;
const INITIAL_ROACHES = 5;
const INITIAL_SPEED = 95;
const SPEED_PER_STAGE = 12;
const HIT_RADIUS = 58;
const NEAR_MISS_RADIUS = 130;
const NEAR_MISS_SPEED_MULTIPLIER = 2;
const NEAR_MISS_DURATION = 1000;
const ROACH_SPEED_VARIATION = 0.08;
const ROACH_SIZE = 48;

const ROACHES_KILLED_STORAGE_KEY = "roachPatrolRoachesKilled";

let stage = 1;
let score = 0;
let target = INITIAL_ROACHES;
let timeLeft = STAGE_TIME;
let roachSpeed = INITIAL_SPEED;
let roachesKilled =
  Number(localStorage.getItem(ROACHES_KILLED_STORAGE_KEY)) || 0;
let roaches = [];
let running = false;
let lastFrame = 0;
let clockTimer = null;
let sandalTimeout = null;
let overlayElement = null;

function updateLabels() {
  const language = getLanguage();

  document.documentElement.lang =
    language === "zh" ? "zh-Hant-HK" : language;

  document.querySelector("#stage-label").textContent = text("stage");
  document.querySelector("#target-label").textContent = text("target");
  document.querySelector("#hit-label").textContent = text("hit");
  document.querySelector("#time-label").textContent = text("time");
  document.querySelector("#high-score-label").textContent = text("best");
  message.textContent = text("instructions");
}

function updateDisplays() {
  stageDisplay.textContent = stage;
  targetDisplay.textContent = target;
  scoreDisplay.textContent = score;
  timerDisplay.textContent = timeLeft;
  roachesKilledDisplay.textContent = roachesKilled;
}

function updateOverlayLanguage() {
  if (!overlayElement) return;

  const title = overlayElement.querySelector(".game-dialog-title");
  const body = overlayElement.querySelector(".game-dialog-message");
  const languageLabel = overlayElement.querySelector("#language-label");
  const musicLabel = overlayElement.querySelector(".music-toggle > span");

  if (title?.dataset.dialogType === "start") {
    title.textContent = text("gameTitle");
    body.textContent = text("ready");
  }

  if (languageLabel) languageLabel.textContent = text("language");
  if (musicLabel) musicLabel.textContent = text("music");

  const languageSelect = overlayElement.querySelector("#language");
  if (languageSelect) languageSelect.value = getLanguage();

  const buttons = [
    ...overlayElement.querySelectorAll(".game-dialog-buttons button")
  ];

  for (const button of buttons) {
    const key = button.dataset.translationKey;
    if (key) button.textContent = text(key);
  }
}

function handleLanguageChange(nextLanguage) {
  if (!VALID_LANGUAGES.includes(nextLanguage)) return;

  setLanguage(nextLanguage);
  updateLabels();
  updateDisplays();
  updateOverlayLanguage();
}

function showImpact(x, y) {
  const impact = document.createElement("span");

  impact.className = "impact";
  impact.textContent = "💥";
  impact.setAttribute("aria-hidden", "true");
  impact.style.left = `${x}px`;
  impact.style.top = `${y}px`;

  game.appendChild(impact);
  window.setTimeout(() => impact.remove(), 450);
}

function showOverlay({
  title,
  body,
  buttons,
  musicToggle = false,
  languagePicker = false,
  dialogType = ""
}) {
  overlayElement?.remove();

  const overlay = document.createElement("div");
  overlay.className = "game-dialog-overlay";

  const dialog = document.createElement("section");
  dialog.className = "game-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");

  const heading = document.createElement("h2");
  heading.className = "game-dialog-title";
  heading.textContent = title;
  heading.dataset.dialogType = dialogType;

  const content = document.createElement("p");
  content.className = "game-dialog-message";
  content.textContent = body;

  dialog.append(heading, content);

  if (languagePicker) {
    const languageControl = document.createElement("label");
    languageControl.className = "language-control";
    languageControl.htmlFor = "language";

    const labelText = document.createElement("span");
    labelText.id = "language-label";
    labelText.textContent = text("language");

    const select = document.createElement("select");
    select.id = "language";
    select.setAttribute("aria-labelledby", "language-label");

    const options = [
      ["en", "English"],
      ["es", "Español"],
      ["zh", "繁體中文"]
    ];

    for (const [value, label] of options) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.append(option);
    }

    select.value = getLanguage();
    select.addEventListener("change", () =>
      handleLanguageChange(select.value)
    );

    languageControl.append(labelText, select);
    dialog.append(languageControl);
  }

  if (musicToggle) {
    const toggleLabel = document.createElement("label");
    toggleLabel.className = "music-toggle";

    const toggleText = document.createElement("span");
    toggleText.textContent = text("music");

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = !music.paused;
    input.setAttribute("aria-label", text("music"));

    const slider = document.createElement("span");
    slider.className = "music-slider";
    slider.setAttribute("aria-hidden", "true");

    input.addEventListener("change", () => {
      if (input.checked) {
        music.play().catch(() => {
          input.checked = false;
        });
      } else {
        music.pause();
        music.currentTime = 0;
      }
    });

    toggleLabel.append(toggleText, input, slider);
    dialog.append(toggleLabel);
  }

  const buttonRow = document.createElement("div");
  buttonRow.className = "game-dialog-buttons";

  for (const button of buttons) {
    const element = document.createElement("button");
    element.type = "button";
    element.textContent = button.label;

    if (button.translationKey) {
      element.dataset.translationKey = button.translationKey;
    }

    if (button.primary) {
      element.classList.add("primary");
    }

    element.addEventListener("click", () => {
      overlay.remove();
      overlayElement = null;
      button.onClick?.();
    });

    buttonRow.append(element);
  }

  dialog.append(buttonRow);
  overlay.append(dialog);
  document.body.append(overlay);
  overlayElement = overlay;

  dialog.querySelector("button")?.focus();
}

function showStart() {
  showOverlay({
    title: text("gameTitle"),
    body: text("ready"),
    musicToggle: true,
    languagePicker: true,
    dialogType: "start",
    buttons: [
      {
        label: text("start"),
        translationKey: "start",
        primary: true,
        onClick: startNewGame
      }
    ]
  });
}

function startNewGame() {
  stage = 1;
  startStage();
}

function getAdditionalRoachCount() {
  const roll = Math.random();

  if (roll < 1 / 3) return 1;
  if (roll < 1 / 3 + 1 / 2) return 2;
  return 3;
}

function startStage() {
  const additionalRoaches = stage === 1 ? 0 : (stage - 1) + getAdditionalRoachCount();

  target = INITIAL_ROACHES + additionalRoaches;
  timeLeft = STAGE_TIME;
  roachSpeed = INITIAL_SPEED + (stage - 1) * SPEED_PER_STAGE;
  score = 0;
  running = true;

  clearInterval(clockTimer);
  removeAllRoaches();

  updateDisplays();
  message.textContent = text("instructions");

  for (let i = 0; i < target; i++) {
    spawnRoach();
  }

  lastFrame = performance.now();
  requestAnimationFrame(updateRoaches);
  clockTimer = window.setInterval(tick, 1000);
}

function tick() {
  if (!running) return;

  timeLeft = Math.max(0, timeLeft - 1);
  timerDisplay.textContent = timeLeft;

  if (timeLeft === 0) {
    endStage(false);
  }
}

function endStage(won) {
  if (!running) return;

  running = false;
  clearInterval(clockTimer);
  removeAllRoaches();

  if (won) {
    stage += 1;

    showOverlay({
      title: text("stageCleared", { stage }),
      body: text("stageClearedBody", { score }),
      buttons: [
        {
          label: text("continue"),
          translationKey: "continue",
          primary: true,
          onClick: startStage
        }
      ]
    });

    return;
  }

  const remaining = target - score;

  showOverlay({
    title: text("timeUp"),
    body: text(remaining === 1 ? "timeUpBodyOne" : "timeUpBodyMany", {remaining}),
    buttons: [
      {
        label: text("tryAgain"),
        translationKey: "tryAgain",
        primary: true,
        onClick: showStart
      },
      {
        label: text("done"),
        translationKey: "done",
        onClick: showStart
      }
    ]
  });
}

function spawnRoach() {
  const bounds = game.getBoundingClientRect();
  const halfSize = ROACH_SIZE / 2;
  const minX = halfSize;
  const maxX = Math.max(minX, bounds.width - halfSize);
  const minY = halfSize;
  const maxY = Math.max(minY, bounds.height - halfSize);
  const x = minX + Math.random() * (maxX - minX);
  const y = minY + Math.random() * (maxY - minY);
  const angle = Math.random() * Math.PI * 2;

  const speedVariation =
    1 + (Math.random() * 2 - 1) * ROACH_SPEED_VARIATION;
  const speed = roachSpeed * speedVariation;

  const element = document.createElement("div");
  element.className = "roach";
  element.textContent = "🪳";
  roachLayer.appendChild(element);

  roaches.push({
    element,
    x,
    y,
    baseSpeed: speed,
    boostedUntil: 0,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed
  });

  positionRoach(roaches[roaches.length - 1]);
}

function positionRoach(roach) {
  const angle =
    Math.atan2(roach.vy, roach.vx) * (180 / Math.PI) + 90;

  roach.element.style.transform =
    `translate(${roach.x - ROACH_SIZE / 2}px, ${
      roach.y - ROACH_SIZE / 2
    }px) rotate(${angle}deg)`;
}

function triggerNearMissBoost(roach, now) {
  if (now < roach.boostedUntil) return;

  roach.boostedUntil = now + NEAR_MISS_DURATION;

  const currentAngle = Math.atan2(roach.vy, roach.vx);
  const boostedSpeed = roach.baseSpeed * NEAR_MISS_SPEED_MULTIPLIER;

  roach.vx = Math.cos(currentAngle) * boostedSpeed;
  roach.vy = Math.sin(currentAngle) * boostedSpeed;
}

function updateRoaches(now) {
  if (!running) return;

  const delta = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;

  const bounds = game.getBoundingClientRect();
  const halfSize = ROACH_SIZE / 2;
  const maxX = Math.max(halfSize, bounds.width - halfSize);
  const maxY = Math.max(halfSize, bounds.height - halfSize);

  for (const roach of roaches) {
    if (roach.boostedUntil && now >= roach.boostedUntil) {
      roach.boostedUntil = 0;

      const currentAngle = Math.atan2(roach.vy, roach.vx);

      roach.vx = Math.cos(currentAngle) * roach.baseSpeed;
      roach.vy = Math.sin(currentAngle) * roach.baseSpeed;
    }

    roach.x += roach.vx * delta;
    roach.y += roach.vy * delta;

    if (roach.x < halfSize) {
      roach.x = halfSize;
      roach.vx = Math.abs(roach.vx);
    } else if (roach.x > maxX) {
      roach.x = maxX;
      roach.vx = -Math.abs(roach.vx);
    }

    if (roach.y < halfSize) {
      roach.y = halfSize;
      roach.vy = Math.abs(roach.vy);
    } else if (roach.y > maxY) {
      roach.y = maxY;
      roach.vy = -Math.abs(roach.vy);
    }

    positionRoach(roach);
  }

  requestAnimationFrame(updateRoaches);
}

function removeAllRoaches() {
  for (const roach of roaches) {
    roach.element.remove();
  }

  roaches = [];
}

function showSandal(x, y) {
  sandal.style.left = `${x}px`;
  sandal.style.top = `${y}px`;
  sandal.style.display = "block";

  sandal.style.animation = "none";
  void sandal.offsetWidth;
  sandal.style.animation = "";

  window.clearTimeout(sandalTimeout);
  sandalTimeout = window.setTimeout(() => {
    sandal.style.display = "none";
  }, 220);
}

game.addEventListener("pointerdown", (event) => {
  const bounds = game.getBoundingClientRect();
  const x = event.clientX - bounds.left;
  const y = event.clientY - bounds.top;

  showSandal(x, y);

  if (!running) return;

  const hitIndex = roaches.findIndex(
    (roach) => Math.hypot(roach.x - x, roach.y - y) < HIT_RADIUS
  );

  if (hitIndex === -1) {
    const now = performance.now();

    for (const roach of roaches) {
      const distance = Math.hypot(roach.x - x, roach.y - y);

      if (distance < NEAR_MISS_RADIUS) {
        triggerNearMissBoost(roach, now);
      }
    }

    return;
  }

  roaches[hitIndex].element.remove();
  roaches.splice(hitIndex, 1);

  score += 1;
  roachesKilled += 1;

  scoreDisplay.textContent = score;
  roachesKilledDisplay.textContent = roachesKilled;

  localStorage.setItem(
    ROACHES_KILLED_STORAGE_KEY,
    String(roachesKilled)
  );

  showImpact(x, y);
  playHitSound();

  if ("vibrate" in navigator) {
    navigator.vibrate(45);
  }

  if (roaches.length === 0) {
    endStage(true);
  }
});

function initialize() {
  updateLabels();
  updateDisplays();
  drawFloor(game, floor, floorContext);
  window.addEventListener("resize", () =>
    drawFloor(game, floor, floorContext)
  );
  showStart();
}

initialize();