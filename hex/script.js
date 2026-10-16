import { HexGame } from "./game.js";
import {
  applyTranslations,
  chooseInitialLanguage,
  saveLanguage
} from "./lang.js";
import { renderGame } from "./render.js";

let language = chooseInitialLanguage();
let game = new HexGame();

const overlay = document.querySelector("#start-overlay");
const languageSelect = document.querySelector("#language-select");
const sizeSelect = document.querySelector("#size-select");
const modeSelect = document.querySelector("#mode-select");

languageSelect.value = language;
applyTranslations(language);

function draw() {
  renderGame(game, language);
}

game.subscribe(draw);
draw();

languageSelect.addEventListener("change", () => {
  language = languageSelect.value;
  saveLanguage(language);
  applyTranslations(language);
  draw();
});

document.querySelector("#start-game").addEventListener("click", () => {
  game.newGame({
    size: Number(sizeSelect.value),
    mode: modeSelect.value
  });
  overlay.hidden = true;
});

document.querySelector("#new-game").addEventListener("click", () => {
  sizeSelect.value = String(game.size);
  modeSelect.value = game.mode;
  overlay.hidden = false;
  document.querySelector("#start-game").focus();
});

document.querySelector("#board").addEventListener("click", (event) => {
  const cell = event.target.closest(".cell");
  if (!cell) return;
  game.play(Number(cell.dataset.row), Number(cell.dataset.col));
});

document.querySelector("#board").addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const cell = event.target.closest(".cell");
  if (!cell) return;
  event.preventDefault();
  game.play(Number(cell.dataset.row), Number(cell.dataset.col));
});
