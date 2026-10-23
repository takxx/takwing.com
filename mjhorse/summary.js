export function renderGameSummary(state, t, tileNode, winningHorseTiles = []) {
  const existing = document.querySelector("#game-summary-overlay");

  if (!state.gameSummary) {
    if (existing) {
      if (existing.open) existing.close();
      existing.remove();
    }
    return;
  }

  const dialog = existing || document.createElement("dialog");
  dialog.id = "game-summary-overlay";
  dialog.className = "game-summary-overlay";
  dialog.setAttribute("aria-label", t.gameSummaryTitle || "本局總結");

  const panel = document.createElement("section");
  panel.className = "game-summary-panel";

  const title = document.createElement("h2");
  title.textContent = t.gameSummaryTitle || "本局總結";
  panel.append(title);

  const winner = state.winner;
  const winningHand = winner == null ? null : state.hands?.[winner];

  if (winningHand?.length) {
    const hand = document.createElement("div");
    hand.className = "summary-winning-hand";
    hand.setAttribute("aria-label", t.winningHand || "食糊牌型");

    winningHand.forEach((tile, i) => {
      hand.append(tileNode(tile, false, i === state.winningTileIndex));
    });

    // For a discard win, the winning tile is separate from the winner's hand.
    if (state.winningTile && state.winningTileIndex == null) {
      hand.append(tileNode(state.winningTile, false, true));
    }

    for (const meld of state.melds?.[winner] || []) {
      const group = document.createElement("span");
      group.className = "meld";

      for (const tile of meld.tiles) {
        group.append(tileNode(tile, true));
      }

      hand.append(group);
    }

    panel.append(hand);
  }

  const entries = Array.isArray(state.gameSummary)
    ? state.gameSummary
    : state.gameSummary.results || [];

  // Horses are stored on the self-draw round-log entry as `horseTiles`.
  // Render every drawn horse, not only horses matching the winner's wind.
  const horses = entries.flatMap(entry => entry.horseTiles || []);

  if (horses.length) {
    const section = document.createElement("section");
    section.className = "summary-horses";
    section.setAttribute("aria-label", t.horses || "馬牌");

    const heading = document.createElement("h3");
    heading.textContent = t.horses || "馬牌";
    section.append(heading);

    const tiles = document.createElement("div");
    tiles.className = "summary-horse-tiles";

    const winningTiles = new Set(
      winningHorseTiles.map(horse =>
        typeof horse === "string" ? horse : horse?.tile
      )
    );
    
    for (const horse of horses) {
      const tile = typeof horse === "string" ? horse : horse?.tile;
      if (tile) tiles.append(tileNode(tile, false, winningTiles.has(tile)));
    }

    section.append(tiles);
    panel.append(section);
  }

  const seats = [t.you, t.south, t.west, t.north];
  const table = document.createElement("table");
  table.className = "summary-table";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  const eventHeading = document.createElement("th");
  eventHeading.scope = "col";
  headerRow.append(eventHeading);

  for (const seat of seats) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = seat;
    headerRow.append(th);
  }

  thead.append(headerRow);
  table.append(thead);

  const tbody = document.createElement("tbody");
  const totals = [0, 0, 0, 0];

  for (const entry of entries) {
    const row = document.createElement("tr");

    const label = document.createElement("th");
    label.scope = "row";
    label.textContent = entry.label || entry.text || entry.reason || "";
    row.append(label);

    for (let seat = 0; seat < 4; seat++) {
      const amount = Number(entry.deltas?.[seat] ?? 0);
      totals[seat] += amount;

      const cell = document.createElement("td");
      cell.textContent = amount > 0 ? `+${amount}` : String(amount);
      row.append(cell);
    }

    tbody.append(row);
  }

  const totalRow = document.createElement("tr");
  totalRow.className = "summary-total-row";

  const totalLabel = document.createElement("th");
  totalLabel.scope = "row";
  totalLabel.textContent = t.roundTotal || "本局";
  totalRow.append(totalLabel);

  for (const total of totals) {
    const cell = document.createElement("td");
    cell.textContent = total > 0 ? `+${total}` : String(total);
    totalRow.append(cell);
  }

  tbody.append(totalRow);
  table.append(tbody);
  panel.append(table);

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "summary-close";
  closeButton.textContent = t.newGame;
  closeButton.addEventListener("click", () => {
    if (dialog.open) dialog.close();
    dialog.remove();
    state.onNewGame?.(winner);
  });
  panel.append(closeButton);

  dialog.replaceChildren(panel);

  if (!existing) {
    document.body.append(dialog);
    dialog.showModal();
  }
}
