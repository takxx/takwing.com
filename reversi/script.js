import { GameEngine } from "./game.js";
import { applyTranslations, setLanguage, getInitialLanguage } from "./lang.js";

const elements = {
  newGameButton: document.getElementById("newGameButton"),
  hintButton: document.getElementById("hintButton"),
  setupOverlay: document.getElementById("setupOverlay"),
  modeSelect: document.getElementById("modeSelect"),
  boardSelect: document.getElementById("boardSelect"),
  languageSelect: document.getElementById("languageSelect"),
  startGameButton: document.getElementById("startGameButton")
};

const engine = new GameEngine();

function showSetup() {
  elements.setupOverlay.classList.remove("hidden");
}

function hideSetup() {
  elements.setupOverlay.classList.add("hidden");
}

elements.newGameButton.addEventListener("click", showSetup);

elements.startGameButton.addEventListener("click", () => {
  setLanguage(elements.languageSelect.value);

  engine.startGame({
    mode: elements.modeSelect.value,
    boardVariant: elements.boardSelect.value
  });

  hideSetup();
});

elements.languageSelect.addEventListener("change", event => {
  setLanguage(event.target.value);
  engine.refreshText();
});

elements.hintButton.addEventListener("click", () => {
  engine.requestHint();
});

elements.languageSelect.value = getInitialLanguage();
applyTranslations();
showSetup();