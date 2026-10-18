import { Game } from "./game.js";
import { Renderer } from "./render.js";
import { chooseInitialLanguage, setLanguage, t } from "./lang.js";
import { getRecord, recordResult } from "./stats.js";

let game = null;
let renderer = null;

function refreshLanguage(language) {
  setLanguage(language);
  document.querySelector("#language").value = language;
  if (renderer) renderer.render();
}

function startGame(aiCount) {
  renderer = null;

  let thisGame;
  let resultRecorded = false;

  thisGame = new Game(aiCount, () => {
    // The game calls onChange during construction, before thisGame is assigned.
    if (thisGame?.finished && !resultRecorded) {
      resultRecorded = true;
      const record = recordResult(thisGame.winner === 0);
      renderer?.setRecord(record);
    }

    if (renderer) renderer.render();
  });

  game = thisGame;

  renderer = new Renderer(game, {
    record: getRecord(),

    onPlace(tileId, move) {
      if (!game.place(game.current, tileId, move)) {
        document.querySelector("#hint").textContent = t("invalid");
      }
    },

    onDraw() {
      if (!game.drawnThisTurn) {
        game.draw();
        if (!game.drawnThisTurn) return;
      }

      if (game.hasAnyMove(game.players[game.current])) {
        document.querySelector("#hint").textContent = t("drawnPlayable");
        renderer.render();
      } else {
        document.querySelector("#hint").textContent = t("drawnPass");
        setTimeout(() => game.endTurnAfterDraw(), 700);
      }
    },

    onCancel() {
      game.selected = null;
      renderer.render();
    }
  });
}

const initialLanguage = chooseInitialLanguage();
setLanguage(initialLanguage);
document.querySelector("#language").value = initialLanguage;

document.querySelector("#language").addEventListener("change", event => {
  refreshLanguage(event.target.value);
});

document.querySelector("#start-form").addEventListener("submit", event => {
  event.preventDefault();
  document.querySelector("#start-dialog").close();
  startGame(Number(document.querySelector("#ai-count").value));
});

document.querySelector("#new-game").addEventListener("click", () => {
  document.querySelector("#start-dialog").showModal();
});

document.querySelector("#start-dialog").showModal();
