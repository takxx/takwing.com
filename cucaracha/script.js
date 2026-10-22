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

const STAGE_TIME = 15;
const INITIAL_ROACHES = 5;
const INITIAL_SPEED = 140;
const SPEED_PER_STAGE = 20;
const HIT_RADIUS = 58;
const NEAR_MISS_RADIUS = 130;
const NEAR_MISS_SPEED_MULTIPLIER = 2;
const NEAR_MISS_DURATION = 1000;
const ROACH_SPEED_VARIATION = 0.2;
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

const SVGs = {
  "🪳": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36"><g fill="#662113"><path d="M4.272 35.837c-.253.083-.486.003-.567-.167-.153-.318.466-.978.833-1.571 2.055-3.325 2.213-9.287 2.213-9.35.001-.32.137-.624.375-.837.239-.214.555-.316.874-.28l10.125 1.125c.618.069 1.062.625.994 1.243-.068.618-.616 2.183-1.243 2.12L8.941 26c-.175 2.23-.588 5.993-3.362 8.767-.219.22-.942.886-1.307 1.07z"/><path d="M31.729 35.837c.252.083.486.002.567-.167.153-.318-.466-.978-.833-1.571-2.055-3.325-2.213-9.287-2.213-9.35 0-.32-.137-.624-.375-.837-.239-.214-.555-.316-.874-.28l-10.125 1.125c-.617.069-1.062.625-.994 1.243.068.618.616 2.183 1.243 2.12L27.059 26c.175 2.23.588 5.993 3.362 8.767.22.22.942.886 1.308 1.07zM2.348 23.08c-.621 0-1.272-.127-1.223-.58.046-.422.629-.52 1.248-.573 3.258-.276 4.476-4.392 4.495-4.431.227-.454.734-.7 1.227-.6l5.625 1.125c.609.122 1.004.714.882 1.324-.121.609-.715 2.136-1.324 2.008l-4.831-2.092c-.887 1.431-2.989 3.819-6.099 3.819zm31.304 0c.621 0 1.272-.127 1.223-.58-.046-.422-.629-.52-1.249-.573-3.258-.276-4.476-4.392-4.495-4.431-.227-.454-.734-.7-1.227-.6l-5.625 1.125c-.609.122-1.004.714-.882 1.324.121.609.715 2.136 1.324 2.008l4.831-2.092c.888 1.431 2.99 3.819 6.1 3.819zm-19.028-6.205c-.235 0-.471-.074-.674-.225l-4.008-3.67c-.803-.052-3.108-.15-4.511-1.303-.48-.394-.868-.872-.727-1.178.161-.348.847-.078 1.403.201 1.968.984 4 .55 4.02.55.242.001.479.08.672.225l4.5 3.375c.497.373.598 1.078.225 1.574-.22.296-.558.451-.9.451zm6.752 0c.235 0 .471-.074.674-.225l4.008-3.67c.803-.052 3.108-.15 4.511-1.303.48-.394.868-.872.727-1.178-.161-.348-.847-.078-1.404.201-1.968.984-4 .55-4.02.55-.242.001-.479.08-.672.225l-4.5 3.375c-.497.373-.598 1.078-.225 1.574.221.296.559.451.901.451z"/></g><path fill="#662113" d="M18 32.625L12.375 36 18 27l5.625 9z"/><path fill="#C1694F" d="M11.25 22.5c0-6.75 3.022-10.125 6.75-10.125s6.75 3.375 6.75 10.125c0 7.875-3.022 13.5-6.75 13.5s-6.75-5.625-6.75-13.5z"/><path fill="#662113" d="M12 22c0-6.75 2.957-9.625 6-9.625S24 15.25 24 22c0 7.875-2.957 11-6 11s-6-3.125-6-11z"/><path fill="#D99E82" d="M13.5 12.375c0-2.25 2.015-4.5 4.5-4.5s4.5 2.25 4.5 4.5c0 2.485-2.015 3.375-4.5 3.375s-4.5-.89-4.5-3.375z"/><path fill="#662113" d="M13.5 12.375c0-2.25 2.015-4.5 4.5-4.5s4.5 2.25 4.5 4.5c0 1.125-2.015 2.25-4.5 2.25s-4.5-1.125-4.5-2.25z"/><ellipse fill="#662113" cx="18" cy="7.875" rx="1.688" ry="1.125"/><path d="M16.938 12.812c-.276 0-.5-.224-.5-.5 0-4.474-5.55-11.875-11.875-11.875-.276 0-.5-.224-.5-.5s.224-.5.5-.5c6.983 0 12.875 7.908 12.875 12.875 0 .277-.224.5-.5.5zm2.062.063c-.276 0-.5-.224-.5-.5C18.5 7.408 24.393-.5 31.375-.5c.276 0 .5.224.5.5s-.224.5-.5.5C25.05.5 19.5 7.901 19.5 12.375c0 .276-.224.5-.5.5z" fill="#662113"/></svg>`,
  "💥": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36"><path fill="#BB1A34" d="M22 0l-4 8.028-5-5.018v7.024L3 8.028l8 8.028-11 6.02h12L6 34.118l12-8.028 11 10.035-3-14.049h10l-8-6.021 8-9.031-12 3.01L22 0z"/><path fill="#FCAB40" d="M22.914 12.924l1.86-.467L30 11.146l-3.381 3.816-1.319 1.49 1.59 1.195 2.925 2.202h-5.918l.473 2.218 1.551 7.26-5.845-5.332-1.056-.964-1.188.795-5.24 3.506 2.406-4.828 1.322-2.655H9.564l3.759-2.059 2.145-1.172-1.727-1.735-3.044-3.053 3.221.646 2.186.439V8.686l1.45 1.455 1.794 1.799 1.133-2.276 1.273-2.556"/><path fill="#F5F8FA" d="M21.512 14.301l.767-.193 2.158-.541-1.396 1.576-.545.615.656.493 1.208.909h-2.443l.195.916.641 2.997-2.413-2.201-.437-.398-.49.328-2.163 1.448.993-1.994.546-1.096H16l1.553-.85.885-.484-.713-.716-1.257-1.261 1.329.267.903.181v-1.745l.599.6.74.743.468-.939.525-1.056"/></svg>`
};

function createEmojiImage(emoji, alt = "") {
  const image = document.createElement("img");
  const svg = SVGs[emoji];

  if (!svg) {
    throw new Error(`No embedded SVG found for ${emoji}`);
  }

  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  image.alt = alt;
  image.setAttribute("aria-hidden", "true");
  return image;
}

function showImpact(x, y) {
  const impact = createEmojiImage("💥");
  impact.className = "impact";
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
      ["zh", "中文"]
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
  element.appendChild(createEmojiImage("🪳"));
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