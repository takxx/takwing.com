import { applyLanguage, messages } from "./lang.js";
import { createGame } from "./game.js";

applyLanguage();
const game = createGame(messages());

document.querySelector("#new-game").addEventListener("click", () => game.newGame());
const dialog = document.querySelector("#instructions");
document.querySelector("#open-instructions").addEventListener("click", event => {
  event.preventDefault();
  dialog.showModal();
});
document.querySelector("#close-instructions").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => {
  if (event.target === dialog) dialog.close();
});
