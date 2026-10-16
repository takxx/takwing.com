import { chooseComputerMove } from "./ai.js";

export class HexGame {
  constructor({ size = 11, mode = "human" } = {}) {
    this.listeners = new Set();
    this.newGame({ size, mode });
  }

  newGame({ size = 11, mode = "human" } = {}) {
    this.size = Number(size) === 13 ? 13 : 11;
    this.mode = mode === "computer" ? "computer" : "human";

    if (this.mode === "computer") {
      this.computerPlayer = Math.random() < 0.5 ? "red" : "blue";
      this.humanPlayer = this.computerPlayer === "red" ? "blue" : "red";
    } else {
      this.computerPlayer = null;
      this.humanPlayer = null;
    }

    this.board = Array.from(
      { length: this.size },
      () => Array(this.size).fill(null)
    );
    this.currentPlayer = "red";
    this.winner = null;
    this.winningPath = [];
    this.aiThinking = false;
    this.generation = (this.generation || 0) + 1;

    this.notify();

    // Red moves first. If the computer is red, it takes the first turn.
    if (this.mode === "computer" && this.currentPlayer === this.computerPlayer) {
      this.runComputerTurn();
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  getState() {
    return {
      size: this.size,
      mode: this.mode,
      humanPlayer: this.humanPlayer,
      computerPlayer: this.computerPlayer,
      board: this.board.map((row) => [...row]),
      currentPlayer: this.currentPlayer,
      winner: this.winner,
      winningPath: this.winningPath.map(([row, col]) => [row, col]),
      aiThinking: this.aiThinking
    };
  }

  play(row, col) {
    if (this.winner || this.aiThinking) return false;
    if (!this.board[row] || this.board[row][col] !== null) return false;

    // In computer mode, only allow the human to make a move.
    if (this.mode === "computer" && this.currentPlayer !== this.humanPlayer) {
      return false;
    }

    this.place(row, col, this.currentPlayer);
    return true;
  }

  place(row, col, player) {
    this.board[row][col] = player;

    const path = this.findWinningPath(player);
    if (path) {
      this.winner = player;
      this.winningPath = path;
      this.notify();
      return;
    }

    this.currentPlayer = player === "red" ? "blue" : "red";
    this.notify();

    if (this.mode === "computer" && this.currentPlayer === this.computerPlayer) {
      this.runComputerTurn();
    }
  }

  runComputerTurn() {
    this.aiThinking = true;
    this.notify();

    const generation = this.generation;

    window.setTimeout(() => {
      // Ignore a pending move if a new game has started.
      if (generation !== this.generation || this.winner) return;

      const move = chooseComputerMove(this.board, this.computerPlayer);

      if (move) {
        this.aiThinking = false;
        this.place(move[0], move[1], this.computerPlayer);
      } else {
        this.aiThinking = false;
        this.notify();
      }
    }, 350);
  }

  findWinningPath(player) {
    const stack = [];
    const previous = new Map();
    const visited = new Set();
    const key = (row, col) => `${row},${col}`;

    if (player === "red") {
      for (let row = 0; row < this.size; row++) {
        if (this.board[row][0] === player) {
          stack.push([row, 0]);
        }
      }
    } else {
      for (let col = 0; col < this.size; col++) {
        if (this.board[0][col] === player) {
          stack.push([0, col]);
        }
      }
    }

    for (const [row, col] of stack) {
      visited.add(key(row, col));
    }

    while (stack.length) {
      const [row, col] = stack.pop();
      const reachedGoal =
        player === "red"
          ? col === this.size - 1
          : row === this.size - 1;

      if (reachedGoal) {
        const path = [];
        let current = [row, col];

        while (current) {
          path.push(current);
          current = previous.get(key(current[0], current[1])) || null;
        }

        return path.reverse();
      }

      const adjacent = [
        [row - 1, col],
        [row + 1, col],
        [row, col - 1],
        [row, col + 1],
        [row - 1, col + 1],
        [row + 1, col - 1]
      ];

      for (const [nextRow, nextCol] of adjacent) {
        if (
          nextRow < 0 ||
          nextRow >= this.size ||
          nextCol < 0 ||
          nextCol >= this.size ||
          this.board[nextRow][nextCol] !== player ||
          visited.has(key(nextRow, nextCol))
        ) {
          continue;
        }

        visited.add(key(nextRow, nextCol));
        previous.set(key(nextRow, nextCol), [row, col]);
        stack.push([nextRow, nextCol]);
      }
    }

    return null;
  }
}
