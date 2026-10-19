import { createStandardBoard, BLACK, WHITE } from "./board4.js";
import { createHexagonalBoard } from "./board6.js";
import {
  findBestMove,
  getLegalMoves,
  applyMove,
  countPieces,
  chooseDepth
} from "./ai.js";
import { BoardRenderer } from "./render.js";
import {
  t,
  getCurrentLanguage,
  readRecord,
  saveRecord
} from "./lang.js";

const EMPTY = 0;

export class GameEngine {
  constructor() {
    this.boardElement = document.getElementById("board");
    this.elements = {
      statusText: document.getElementById("statusText"),
      hintMessage: document.getElementById("hintMessage"),
      hintButton: document.getElementById("hintButton"),
      playerOneLabel: document.getElementById("playerOneLabel"),
      playerTwoLabel: document.getElementById("playerTwoLabel"),
      playerOneScore: document.getElementById("playerOneScore"),
      playerTwoScore: document.getElementById("playerTwoScore"),
      wins: document.getElementById("wins"),
      losses: document.getElementById("losses"),
      draws: document.getElementById("draws"),
      recordSection: document.getElementById("recordSection")
    };

    this.renderer = new BoardRenderer(
      this.boardElement,
      cellId => this.handleCellClick(cellId)
    );

    this.record = readRecord();
    this.boardVariant = "board4";
    this.mode = "hva";
    this.humanColor = BLACK;
    this.aiColor = WHITE;
    this.currentPlayer = BLACK;
    this.board = new Map();
    this.boardDefinition = createStandardBoard();
    this.legalMoves = [];
    this.hintId = null;
    this.gameOver = false;
    this.aiThinking = false;

    this.refreshText();
  }

startGame({ mode, boardVariant }) {
    this.mode = mode === "hh" ? "hh" : "hva";
    this.boardVariant = boardVariant === "board6" ? "board6" : "board4";

    this.boardDefinition =
      this.boardVariant === "board6"
        ? createHexagonalBoard()
        : createStandardBoard();

    // Randomly assign human and AI colors if in human vs AI mode
    if (this.mode === "hva") {
      this.humanColor = Math.random() < 0.5 ? BLACK : WHITE;
      this.aiColor = -this.humanColor; // Assumes BLACK and WHITE are opposites (e.g., 1 and -1, or similar constants)
    } else {
      this.humanColor = BLACK;
      this.aiColor = WHITE;
    }

    this.currentPlayer = BLACK; // Usually, games start with Black
    this.board = new Map(this.boardDefinition.initial);
    this.legalMoves = getLegalMoves(this.boardDefinition, this.board, this.currentPlayer);
    this.hintId = null;
    this.gameOver = false;
    this.aiThinking = false;

    this.elements.hintMessage.textContent = "";
    this.render();

    this.updateStatus(
      this.currentPlayer === BLACK ? t("blackStarts") : t("whiteStarts")
    );

    // If it's AI's turn to move first, trigger the computer turn
    if (this.mode === "hva" && this.currentPlayer === this.aiColor) {
      window.setTimeout(() => this.makeComputerTurn(), 350);
    }
  }

  refreshText() {
    this.render();
    this.updateStatus();
  }

  handleCellClick(cellId) {
    if (
      this.gameOver ||
      this.aiThinking ||
      this.currentPlayer !== this.humanColor ||
      this.mode !== "hva"
    ) {
      return;
    }

    const move = this.legalMoves.find(candidate => candidate.id === cellId);

    if (!move) {
      return;
    }

    this.hintId = null;
    this.elements.hintMessage.textContent = "";

    this.board = applyMove(this.boardDefinition, this.board, move, this.humanColor);
    this.currentPlayer = this.aiColor;

    this.continueGame();
  }

  continueGame() {
    this.legalMoves = getLegalMoves(
      this.boardDefinition,
      this.board,
      this.currentPlayer
    );

    this.render();

    if (this.legalMoves.length > 0) {
      if (this.mode === "hva" && this.currentPlayer === this.aiColor) {
        this.aiThinking = true;
        this.updateStatus();
        window.setTimeout(() => this.makeComputerTurn(), 300);
      } else {
        this.aiThinking = false;
        this.updateStatus();
      }

      return;
    }

    const opponent = -this.currentPlayer;
    const opponentMoves = getLegalMoves(this.boardDefinition, this.board, opponent);

    if (opponentMoves.length === 0) {
      this.finishGame();
      return;
    }

    if (this.mode === "hva" && this.currentPlayer === this.humanColor) {
      this.updateStatus(t("youPassed"));
      this.currentPlayer = this.aiColor;
      this.aiThinking = true;

      window.setTimeout(() => this.makeComputerTurn(), 700);
      return;
    }

    const passingPlayer = this.playerName(this.currentPlayer);
    this.currentPlayer = opponent;
    this.legalMoves = opponentMoves;
    this.aiThinking = false;

    this.render();
    this.updateStatus(t("playerPassed", { player: passingPlayer }));
  }

  makeComputerTurn() {
    if (this.gameOver || this.currentPlayer !== this.aiColor || this.mode !== "hva") {
      return;
    }

    const move = findBestMove(
      this.boardDefinition,
      this.board,
      this.aiColor,
      chooseDepth(this.boardDefinition, this.board)
    );

    this.aiThinking = false;

    if (!move) {
      this.continueGame();
      return;
    }

    this.board = applyMove(this.boardDefinition, this.board, move, this.aiColor);
    this.currentPlayer = this.humanColor;
    this.hintId = null;
    this.elements.hintMessage.textContent = "";

    this.continueGame();
  }

  finishGame() {
    this.gameOver = true;
    this.aiThinking = false;
    this.legalMoves = [];
    this.hintId = null;

    const counts = countPieces(this.board);
    const blackCount = counts.black;
    const whiteCount = counts.white;

    this.render();

    if (this.mode === "hva") {
      const humanCount = this.humanColor === BLACK ? blackCount : whiteCount;
      const aiCount = this.aiColor === BLACK ? blackCount : whiteCount;

      if (humanCount > aiCount) {
        this.record.wins += 1;
      } else if (humanCount < aiCount) {
        this.record.losses += 1;
      } else {
        this.record.draws += 1;
      }

      saveRecord(this.record);

      const result =
        humanCount > aiCount ? t("youWin") :
        humanCount < aiCount ? t("youLose") :
        t("draw");

      this.updateStatus(`${t("gameOver")} ${result}`);
      return;
    }

    const result =
      blackCount > whiteCount ? t("blackWins") :
      blackCount < whiteCount ? t("whiteWins") :
      t("draw");

    this.updateStatus(`${t("gameOver")} ${result}`);
  }

  requestHint() {
    if (
      this.gameOver ||
      this.mode !== "hva" ||
      this.currentPlayer !== this.humanColor ||
      this.aiThinking
    ) {
      this.elements.hintMessage.textContent = t("noHint");
      return;
    }

    if (this.legalMoves.length === 0) {
      this.elements.hintMessage.textContent = t("noHint");
      return;
    }

    this.elements.hintMessage.textContent = t("thinkingHint");
    this.elements.hintButton.disabled = true;

    window.setTimeout(() => {
      const bestMove = findBestMove(
        this.boardDefinition,
        this.board,
        this.humanColor,
        chooseDepth(this.boardDefinition, this.board)
      );

      this.elements.hintButton.disabled = false;

      if (!bestMove) {
        this.elements.hintMessage.textContent = t("noHint");
        return;
      }

      this.hintId = bestMove.id;
      this.elements.hintMessage.textContent = t("hintMessage", {
        position: this.boardDefinition.positionName(bestMove.id)
      });

      this.render();
    }, 20);
  }

  playerName(color) {
    if (this.mode === "hh") {
      return color === BLACK ? t("black") : t("white");
    }

    return color === this.humanColor ? t("you") : t("computer");
  }

  updateStatus(message = null) {
    if (message !== null) {
      this.elements.statusText.textContent = message;
      return;
    }

    if (this.gameOver) {
      return;
    }

    if (this.mode === "hva") {
      if (this.aiThinking || this.currentPlayer === this.aiColor) {
        this.elements.statusText.textContent = t("computerTurn");
      } else {
        this.elements.statusText.textContent = t("yourTurn");
      }

      return;
    }

    this.elements.statusText.textContent =
      this.currentPlayer === BLACK ? t("blackTurn") : t("whiteTurn");
  }

  render() {
    this.renderer.render({
      boardDefinition: this.boardDefinition,
      board: this.board,
      legalMoveIds:
        this.gameOver ||
        this.aiThinking ||
        (this.mode === "hva" && this.currentPlayer !== this.humanColor)
          ? []
          : this.legalMoves.map(move => move.id),
      hintId: this.hintId
    });

    this.updateScores();
  }

  updateScores() {
    const counts = countPieces(this.board);

    this.elements.playerOneScore.textContent = String(counts.black);
    this.elements.playerTwoScore.textContent = String(counts.white);

    this.elements.playerOneLabel.textContent = t("black");
    this.elements.playerTwoLabel.textContent = t("white");

    const showRecord = this.mode === "hva";
    this.elements.recordSection.style.display = showRecord ? "" : "none";

    if (showRecord) {
      this.elements.wins.textContent = String(this.record.wins);
      this.elements.losses.textContent = String(this.record.losses);
      this.elements.draws.textContent = String(this.record.draws);
    }
  }
}