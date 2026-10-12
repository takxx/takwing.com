export const language = {
  title: "Tile Rummy",
  subtitle: "Make groups of the same number or runs of consecutive numbers.",
  table: "Table",
  yourTiles: "Your tiles",
  play: "Play selected tiles",
  draw: "Draw a tile",
  newGame: "New game",

  yourTurn: "Your turn",
  opponentTurn: "{name}'s turn",
  gameOver: "Game over",

  stock: "Tiles left: {count}",
  selected: "{count} selected",

  invalid: "Those tiles don't make a valid group or run.",
  played: "Nice move!",
  drew: "You drew a tile.",
  youWin: "You win!",
  opponentWins: "{name} wins!",
  drawEmpty: "No tiles left to draw. Turn passed.",
  newGameMessage: "New game started.",

  aiDrew: "{name} drew a tile.",
  aiPlayed: "{name} made a play.",

  invalidTable: "Every set on the table must be valid.",
  mustPlayFromHand: "Play at least one tile from your rack.",
  openingMeld: "Your opening play must total at least 30 points.",
  looseTiles: "Place all loose tiles before finishing your turn.",
  noDraft: "There is no active turn to finish.",
  selectedTileError: "Couldn't move one of the selected rack tiles.",
  draftCancelled: "Draft cancelled.",
  invalidMove: "That move isn't valid."
};

export function t(key, values = {}) {
  let text = language[key] ?? key;

  for (const [name, value] of Object.entries(values)) {
    text = text.replaceAll(`{${name}}`, String(value));
  }

  return text;
}
