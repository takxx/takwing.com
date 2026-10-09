'use strict';

document.addEventListener('DOMContentLoaded', () => {
  /* =========================================================
     TRANSLATIONS
  ========================================================= */

  const translations = {
    en: {
      title: 'FreeCell',
      newGame: 'New',
      restart: 'Restart',
      undo: 'Undo',
      hint: 'Hint',
      freeCell: 'Free',
      hintText: 'Drag or click cards to move them.',
      moves: 'Moves',
      foundations: 'Foundations',
      youWon: 'You won!',
      noHint: 'No obvious move found.',
      moveCardToFoundation: 'Move {card} to a foundation.',
      moveCardToColumn: 'Move {card} to column {column}.',
      moveCardToFree: 'Move {card} to Free {free}.'
    },

    es: {
      title: 'FreeCell',
      newGame: 'Nuevo',
      restart: 'Reiniciar',
      undo: 'Deshacer',
      hint: 'Sugerencia',
      freeCell: 'Libre',
      hintText: 'Arrastra o haz clic en las cartas para moverlas.',
      moves: 'Movimientos',
      foundations: 'Fundaciones',
      youWon: '¡Ganaste!',
      noHint: 'No se encontró ningún movimiento obvio.',
      moveCardToFoundation: 'Mueve {card} a una fundación.',
      moveCardToColumn: 'Mueve {card} a la columna {column}.',
      moveCardToFree: 'Mueve {card} a Libre {free}.'
    },

    'zh-TW': {
      title: '接龍',
      newGame: '新遊戲',
      restart: '重新開始',
      undo: '還原',
      hint: '提示',
      freeCell: '空格',
      hintText: '拖曳或點擊卡片來移動卡牌。',
      moves: '步數',
      foundations: '牌疊',
      youWon: '你贏了！',
      noHint: '找不到明顯的移動。',
      moveCardToFoundation: '將 {card} 移動到牌疊。',
      moveCardToColumn: '將 {card} 移動到第 {column} 列。',
      moveCardToFree: '將 {card} 移動到空格 {free}。'
    }
  };

  let currentLang = 'en';

  function t(key, params = {}) {
    let text =
      translations[currentLang]?.[key] ??
      translations.en[key] ??
      key;

    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }

    return text;
  }

function detectLanguage() {
  // 1. Query-string language has highest priority.
  // Supported examples: ?lang=en, ?lang=es, ?lang=zh
  const queryLanguage =
    new URLSearchParams(window.location.search)
      .get('lang')
      ?.toLowerCase();

  const queryLanguageMap = {
    en: 'en',
    es: 'es',
    zh: 'zh-TW'
  };

  const languageFromQuery =
    queryLanguageMap[queryLanguage];

  if (languageFromQuery) {
    return languageFromQuery;
  }

  // 2. Fall back to the saved language.
  try {
    const saved = localStorage.getItem('freecell_lang');

    if (saved && translations[saved]) {
      return saved;
    }
  } catch {
    // Ignore unavailable storage.
  }

  // 3. Fall back to the browser language.
  const browserLanguage =
    navigator.languages?.[0] ||
    navigator.language ||
    'en';

  if (
    browserLanguage.startsWith('zh-HK') ||
    browserLanguage.startsWith('zh-TW') ||
    browserLanguage === 'zh'
  ) {
    return 'zh-TW';
  }

  if (browserLanguage.startsWith('es')) {
    return 'es';
  }

  return 'en';
}

  function setLanguage(language) {
    currentLang = translations[language] ? language : 'en';

    try {
      localStorage.setItem('freecell_lang', currentLang);
    } catch {
      // Continue without persistence.
    }

    document.documentElement.lang = currentLang;

    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.dataset.i18n;
      const translated = t(key);

      if (element.tagName === 'INPUT') {
        element.value = translated;
      } else {
        element.textContent = translated;
      }
    });

    if (languageSelect) {
      languageSelect.value = currentLang;
    }

    updateStatus();
  }

  /* =========================================================
     DOM
  ========================================================= */

  const board = document.getElementById('board');
  const status = document.getElementById('status');

  const newButton = document.getElementById('newBtn');
  const restartButton = document.getElementById('restartBtn');
  const undoButton = document.getElementById('undoBtn');
  const hintButton = document.getElementById('hintBtn');
  const languageSelect = document.getElementById('langSelect');

  if (!board || !status) {
    console.error('FreeCell: required elements were not found.');
    return;
  }

  /* =========================================================
     TOUCH AND GESTURE HANDLING
  ========================================================= */

  for (const eventName of [
    'gesturestart',
    'gesturechange',
    'gestureend'
  ]) {
    document.addEventListener(
      eventName,
      event => event.preventDefault(),
      { passive: false }
    );
  }

  function isNativeControl(target) {
    return Boolean(
      target.closest(
        'button, select, option, input, textarea, a'
      )
    );
  }

  function preventBoardTouch(event) {
    if (!isNativeControl(event.target)) {
      event.preventDefault();
    }
  }

  board.addEventListener(
    'touchstart',
    preventBoardTouch,
    { passive: false }
  );

  board.addEventListener(
    'touchmove',
    preventBoardTouch,
    { passive: false }
  );

  board.addEventListener(
    'touchend',
    preventBoardTouch,
    { passive: false }
  );

  let lastNonControlTouchEnd = 0;

  document.addEventListener(
    'touchend',
    event => {
      if (isNativeControl(event.target)) {
        return;
      }

      const now = Date.now();

      if (now - lastNonControlTouchEnd <= 350) {
        event.preventDefault();
      }

      lastNonControlTouchEnd = now;
    },
    { passive: false }
  );

  /* =========================================================
     GAME CONSTANTS
  ========================================================= */

  const SUITS = ['♥', '♦', '♣', '♠'];

  const RANKS = [
    'A', '2', '3', '4', '5', '6', '7',
    '8', '9', '10', 'J', 'Q', 'K'
  ];

  const COLORS = Object.freeze({
    '♥': 'red',
    '♦': 'red',
    '♣': 'black',
    '♠': 'black'
  });

  /* =========================================================
     GAME STATE
  ========================================================= */

  let tableau = [];
  let frees = [];
  let homes = {};
  let history = [];
  let foundationCount = 0;
  let hasShownWinMessage = false;

  let pointerState = null;
  let dragState = null;

  let cachedFreeCells = null;
  let cachedEmptyColumns = null;

  function invalidateBoardCache() {
    cachedFreeCells = null;
    cachedEmptyColumns = null;
  }

  function getBoardMetrics() {
    if (cachedFreeCells === null) {
      cachedFreeCells = frees.filter(card => !card).length;
    }

    if (cachedEmptyColumns === null) {
      cachedEmptyColumns = tableau.filter(
        column => column.length === 0
      ).length;
    }

    return {
      freeCells: cachedFreeCells,
      emptyColumns: cachedEmptyColumns
    };
  }

  /* =========================================================
     CARD HELPERS
  ========================================================= */

  function makeCard(suit, rank) {
    return {
      suit,
      rank,
      rankN: RANKS.indexOf(rank) + 1
    };
  }

  function copyCard(card) {
    if (!card) {
      return null;
    }

    return {
      suit: card.suit,
      rank: card.rank,
      rankN: Number(card.rankN)
    };
  }

  function buildDeck() {
    const deck = [];

    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push(makeCard(suit, rank));
      }
    }

    return deck;
  }

  function shuffle(deck) {
    for (let index = deck.length - 1; index > 0; index--) {
      const randomIndex = Math.floor(
        Math.random() * (index + 1)
      );

      [deck[index], deck[randomIndex]] = [
        deck[randomIndex],
        deck[index]
      ];
    }

    return deck;
  }

  /* =========================================================
     HISTORY AND GAME SETUP
  ========================================================= */

  function serialize() {
    return JSON.stringify({
      tableau: tableau.map(column =>
        column.map(copyCard)
      ),
      frees: frees.map(copyCard),
      homes: { ...homes }
    });
  }

  function restoreSnapshot(snapshot) {
    const state = JSON.parse(snapshot);

    tableau = state.tableau.map(column =>
      column.map(copyCard)
    );

    frees = state.frees.map(copyCard);
    homes = { ...state.homes };

    foundationCount = Object.values(homes).reduce(
      (total, value) => total + Number(value),
      0
    );

    invalidateBoardCache();
  }

  function saveSnapshot() {
    history.push(serialize());
    updateStatus();
  }

  function createNewGame() {
    const deck = shuffle(buildDeck());

    tableau = Array.from(
      { length: 8 },
      () => []
    );

    frees = [null, null, null, null];

    homes = {
      '♥': 0,
      '♦': 0,
      '♣': 0,
      '♠': 0
    };

    foundationCount = 0;
    hasShownWinMessage = false;

    deck.forEach((card, index) => {
      tableau[index % 8].push(copyCard(card));
    });

    history = [];
    invalidateBoardCache();

    saveSnapshot();
    render();
  }

  function restart() {
    if (!history.length) {
      return;
    }

    restoreSnapshot(history[0]);
    history = [history[0]];
    hasShownWinMessage = false;

    render();
  }

  function undo() {
    if (history.length <= 1) {
      return;
    }

    history.pop();
    restoreSnapshot(history[history.length - 1]);
    hasShownWinMessage = false;

    render();
  }

  function updateStatus() {
    status.textContent =
      `${foundationCount}/52`;
  }

  /* =========================================================
     RENDERING
  ========================================================= */

  function createCardElement(card, metadata = {}) {
    const normalized = copyCard(card);
    const element = document.createElement('div');

    element.className = 'card';

    if (COLORS[normalized.suit] === 'red') {
      element.classList.add('red');
    }

    element.innerHTML = `
      <div class="top">${normalized.rank}</div>
      <div class="suit" aria-hidden="true">${normalized.suit}</div>
      <div class="bottom" aria-hidden="true">${normalized.rank}</div>
    `;

    element.dataset.loc = metadata.loc ?? '';
    element.dataset.idx = metadata.idx ?? '';

    if (metadata.pos !== undefined) {
      element.dataset.pos = metadata.pos;
    }

    element.dataset.suit = normalized.suit;
    element.dataset.rank = normalized.rank;
    element.dataset.rankN = normalized.rankN;

    return element;
  }

  function createFoundationCard(card) {
    const element = createCardElement(card);

//    element.style.width = '68px';
//    element.style.height = '92px';
//    element.style.cursor = 'default';

    return element;
  }

  function renderFreeCells() {
    document
      .querySelectorAll('[data-type="free"]')
      .forEach((slot, index) => {
        slot.replaceChildren();

        const label = document.createElement('div');
        label.className = 'label';
        label.textContent = `${t('freeCell')} ${index + 1}`;

        slot.appendChild(label);

        if (frees[index]) {
          slot.appendChild(
            createCardElement(frees[index], {
              loc: 'free',
              idx: index
            })
          );
        }
      });
  }

  function renderFoundations() {
    document
      .querySelectorAll('[data-type="home"]')
      .forEach((slot, index) => {
        const suit = SUITS[index];

        slot.replaceChildren();

        const label = document.createElement('div');
        label.className = 'label';
        label.textContent = suit;

        slot.appendChild(label);

        if (homes[suit] > 0) {
          slot.appendChild(
            createFoundationCard(
              makeCard(
                suit,
                RANKS[homes[suit] - 1]
              )
            )
          );
        }
      });
  }

  function renderTableau() {
    tableau.forEach((column, columnIndex) => {
      const stack = document.querySelector(
        `.stack[data-index="${columnIndex}"]`
      );

      if (!stack) {
        return;
      }

      const fragment = document.createDocumentFragment();

      column.forEach((card, position) => {
        const element = createCardElement(card, {
          loc: 'tableau',
          idx: columnIndex,
          pos: position
        });

        element.style.top = `${position * 28}px`;
        fragment.appendChild(element);
      });

      stack.replaceChildren(fragment);
    });
  }

  function render() {
    renderFreeCells();
    renderFoundations();
    renderTableau();

    updateStatus();
    checkWin();
  }

  function checkWin() {
    if (
      foundationCount !== 52 ||
      hasShownWinMessage
    ) {
      return;
    }

    hasShownWinMessage = true;

    setTimeout(() => {
      alert(t('youWon'));
    }, 80);
  }

  /* =========================================================
     RULES
  ========================================================= */

  function canMoveToHome(card) {
    return Boolean(
      card &&
      homes[card.suit] === Number(card.rankN) - 1
    );
  }

  function canPlaceOnTableau(card, destination) {
    if (!card || !destination) {
      return false;
    }

    if (!destination.length) {
      return true;
    }

    const top =
      destination[destination.length - 1];

    return (
      top.rankN === Number(card.rankN) + 1 &&
      COLORS[top.suit] !== COLORS[card.suit]
    );
  }

  function canPlaceSequence(sequence, destination) {
    if (!sequence.length) {
      return false;
    }

    for (
      let index = 0;
      index < sequence.length - 1;
      index++
    ) {
      const current = sequence[index];
      const next = sequence[index + 1];

      if (
        current.rankN !== next.rankN + 1 ||
        COLORS[current.suit] === COLORS[next.suit]
      ) {
        return false;
      }
    }

    const {
      freeCells,
      emptyColumns
    } = getBoardMetrics();

    const destinationIsEmpty =
      destination.length === 0;

    const adjustedEmptyColumns =
      emptyColumns - (destinationIsEmpty ? 1 : 0);

    const maxMovable =
      (freeCells + 1) *
      (adjustedEmptyColumns + 1);

    return (
      sequence.length <= maxMovable &&
      canPlaceOnTableau(sequence[0], destination)
    );
  }

  /* =========================================================
     CONSERVATIVE AUTO-MOVE
  ========================================================= */

  function getOppositeColorSuits(suit) {
    if (suit === '♥' || suit === '♦') {
      return ['♣', '♠'];
    }

    return ['♥', '♦'];
  }

  function isSafeToAutoMove(card) {
    if (!card) {
      return false;
    }

    const rank = Number(card.rankN);
    const currentHomeRank =
      Number(homes[card.suit]) || 0;

    // It must be the next card for its suit.
    if (rank !== currentHomeRank + 1) {
      return false;
    }

    // Aces are always safe.
    if (rank === 1) {
      return true;
    }

    // Twos are safe after their own Ace.
    if (rank === 2) {
      return currentHomeRank >= 1;
    }

    /*
      For rank 3 and higher, both opposite-colour
      cards one rank lower must already be home.

      Example:
      5♥ is safe only when both 4♣ and 4♠
      are already in their foundations.
    */
    const previousRank = rank - 1;
    const oppositeSuits =
      getOppositeColorSuits(card.suit);

    return (
      Number(homes[oppositeSuits[0]]) >= previousRank &&
      Number(homes[oppositeSuits[1]]) >= previousRank
    );
  }

  function findSafeExposedCard() {
    // Check tableau cards.
    for (let column = 0; column < tableau.length; column++) {
      const pile = tableau[column];

      if (!pile.length) {
        continue;
      }

      const card = pile[pile.length - 1];

      if (isSafeToAutoMove(card)) {
        return {
          type: 'tableau',
          column,
          card
        };
      }
    }

    // Check free cells.
    for (let index = 0; index < frees.length; index++) {
      const card = frees[index];

      if (card && isSafeToAutoMove(card)) {
        return {
          type: 'free',
          index,
          card
        };
      }
    }

    return null;
  }

  function autoMove() {
    let movedAny = false;

    while (true) {
      const exposed = findSafeExposedCard();

      if (!exposed) {
        break;
      }

      if (exposed.type === 'tableau') {
        tableau[exposed.column].pop();
      } else {
        frees[exposed.index] = null;
      }

      homes[exposed.card.suit]++;
      foundationCount++;
      movedAny = true;

      invalidateBoardCache();
    }

    if (movedAny) {
      render();
    }
  }

  /*
    This is called after every successful player move.
    The timeout allows the drag/click interaction to finish
    before the board is automatically changed.
  */
  function finishPlayerMove() {
    render();

    setTimeout(() => {
      autoMove();
    }, 0);
  }

  /* =========================================================
     MOVE OPERATIONS
  ========================================================= */

  function moveFreeToHome(index) {
    const card = frees[index];

    if (!card || !canMoveToHome(card)) {
      return false;
    }

    frees[index] = null;
    homes[card.suit]++;
    foundationCount++;

    invalidateBoardCache();
    saveSnapshot();
    finishPlayerMove();

    return true;
  }

  function moveFreeToTableau(index, destinationIndex) {
    const card = frees[index];
    const destination = tableau[destinationIndex];

    if (
      !card ||
      !canPlaceOnTableau(card, destination)
    ) {
      return false;
    }

    destination.push(copyCard(card));
    frees[index] = null;

    invalidateBoardCache();
    saveSnapshot();
    finishPlayerMove();

    return true;
  }

  function moveTableauToHome(columnIndex, position) {
    const column = tableau[columnIndex];

    if (
      !column ||
      position !== column.length - 1
    ) {
      return false;
    }

    const card = column[column.length - 1];

    if (!card || !canMoveToHome(card)) {
      return false;
    }

    column.pop();
    homes[card.suit]++;
    foundationCount++;

    invalidateBoardCache();
    saveSnapshot();
    finishPlayerMove();

    return true;
  }

  function moveTableauToFree(
    columnIndex,
    position,
    freeIndex
  ) {
    const column = tableau[columnIndex];

    if (
      !column ||
      position !== column.length - 1 ||
      frees[freeIndex]
    ) {
      return false;
    }

    frees[freeIndex] = copyCard(column.pop());

    invalidateBoardCache();
    saveSnapshot();
    finishPlayerMove();

    return true;
  }

  function moveTableauToTableau(
    sourceIndex,
    position,
    destinationIndex
  ) {
    if (sourceIndex === destinationIndex) {
      return false;
    }

    const source = tableau[sourceIndex];
    const destination = tableau[destinationIndex];
    const sequence = source.slice(position);

    if (!canPlaceSequence(sequence, destination)) {
      return false;
    }

    tableau[destinationIndex] =
      destination.concat(sequence.map(copyCard));

    tableau[sourceIndex] =
      source.slice(0, position);

    invalidateBoardCache();
    saveSnapshot();
    finishPlayerMove();

    return true;
  }

  /* =========================================================
     POINTER AND DRAG HANDLING
  ========================================================= */

  function getPointerSource(element) {
    const location = element.dataset.loc;

    if (location === 'tableau') {
      const column = Number(element.dataset.idx);
      const position = Number(element.dataset.pos);

      return {
        type: 'tableau',
        column,
        position,
        sequence: tableau[column]
          .slice(position)
          .map(copyCard)
      };
    }

    if (location === 'free') {
      const index = Number(element.dataset.idx);

      return {
        type: 'free',
        index,
        card: copyCard(frees[index])
      };
    }

    return null;
  }

  function onPointerDown(event) {
    if (isNativeControl(event.target)) {
      return;
    }

    if (
      event.pointerType === 'mouse' &&
      event.button !== 0
    ) {
      return;
    }

    const cardElement =
      event.target.closest('.card');

    if (
      !cardElement ||
      !board.contains(cardElement) ||
      !cardElement.dataset.loc
    ) {
      return;
    }

    const source =
      getPointerSource(cardElement);

    if (!source) {
      return;
    }

    event.preventDefault();

    pointerState = {
      element: cardElement,
      source,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false
    };

    cardElement.setPointerCapture?.(
      event.pointerId
    );
  }

  function onPointerMove(event) {
    if (
      !pointerState ||
      event.pointerId !== pointerState.pointerId
    ) {
      return;
    }

    event.preventDefault();

    const distance = Math.hypot(
      event.clientX - pointerState.startX,
      event.clientY - pointerState.startY
    );

    if (
      !pointerState.moved &&
      distance >= 8
    ) {
      pointerState.moved = true;
      beginDrag(event);
    }

    if (pointerState.moved) {
      moveDrag(event);
    }
  }

  function onPointerUp(event) {
    if (
      !pointerState ||
      event.pointerId !== pointerState.pointerId
    ) {
      return;
    }

    event.preventDefault();

    const completedPointer = pointerState;

    try {
      completedPointer.element.releasePointerCapture?.(
        event.pointerId
      );
    } catch {
      // Pointer capture may already be released.
    }

    if (completedPointer.moved) {
      dropDrag(event);
    } else {
      clickMove(completedPointer.source);
    }

    cleanupPointer();
  }

  function onPointerCancel(event) {
    if (
      !pointerState ||
      event.pointerId !== pointerState.pointerId
    ) {
      return;
    }

    cleanupDrag();
    cleanupPointer();
  }

  function cleanupPointer() {
    pointerState = null;
  }

  function beginDrag(event) {
    if (!pointerState || dragState) {
      return;
    }

    const original = pointerState.element;
    const rect = original.getBoundingClientRect();
    const ghost = original.cloneNode(true);

    ghost.classList.add('drag-ghost');

    Object.assign(ghost.style, {
      position: 'fixed',
      left: '0px',
      top: '0px',
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      zIndex: '9999',
      pointerEvents: 'none'
    });

    dragState = {
      original,
      ghost,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top
    };

    original.classList.add('dragging-source');
    document.body.appendChild(ghost);

    moveDrag(event);
  }

  function moveDrag(event) {
    if (!dragState) {
      return;
    }

    dragState.ghost.style.left =
      `${event.clientX - dragState.offsetX}px`;

    dragState.ghost.style.top =
      `${event.clientY - dragState.offsetY}px`;
  }

  function dropDrag(event) {
    if (!dragState) {
      return;
    }

    const destinationElement =
      document.elementFromPoint(
        event.clientX,
        event.clientY
      );

    const destination =
      destinationElement?.closest(
        '.stack, .slot.small'
      );

    if (destination) {
      const destinationType =
        destination.classList.contains('stack')
          ? 'tableau'
          : destination.dataset.type;

      const destinationIndex =
        Number(destination.dataset.index);

      const source = pointerState?.source;
      const original = dragState.original;

      if (source?.type === 'free') {
        const freeIndex =
          Number(original.dataset.idx);

        if (destinationType === 'home') {
          moveFreeToHome(freeIndex);
        } else if (destinationType === 'tableau') {
          moveFreeToTableau(
            freeIndex,
            destinationIndex
          );
        }
      }

      if (source?.type === 'tableau') {
        const sourceColumn =
          Number(original.dataset.idx);

        const position =
          Number(original.dataset.pos);

        if (destinationType === 'home') {
          moveTableauToHome(
            sourceColumn,
            position
          );
        } else if (destinationType === 'tableau') {
          moveTableauToTableau(
            sourceColumn,
            position,
            destinationIndex
          );
        } else if (destinationType === 'free') {
          moveTableauToFree(
            sourceColumn,
            position,
            destinationIndex
          );
        }
      }
    }

    cleanupDrag();
  }

  function cleanupDrag() {
    if (!dragState) {
      return;
    }

    dragState.original.classList.remove(
      'dragging-source'
    );

    dragState.ghost.remove();
    dragState = null;
  }

  /* =========================================================
     CLICK-TO-MOVE
  ========================================================= */

  function clickMove(source) {
    if (!source) {
      return;
    }

    if (source.type === 'free') {
      const card = frees[source.index];

      if (!card) {
        return;
      }

      if (canMoveToHome(card)) {
        moveFreeToHome(source.index);
        return;
      }

      for (let column = 0; column < 8; column++) {
        if (
          canPlaceOnTableau(
            card,
            tableau[column]
          )
        ) {
          moveFreeToTableau(
            source.index,
            column
          );

          return;
        }
      }

      return;
    }

    if (source.type === 'tableau') {
      const {
        column,
        position,
        sequence
      } = source;

      if (!sequence.length) {
        return;
      }

      if (
        sequence.length === 1 &&
        canMoveToHome(sequence[0])
      ) {
        moveTableauToHome(
          column,
          position
        );

        return;
      }

      for (let destination = 0; destination < 8; destination++) {
        if (
          destination !== column &&
          canPlaceSequence(
            sequence,
            tableau[destination]
          )
        ) {
          moveTableauToTableau(
            column,
            position,
            destination
          );

          return;
        }
      }

      if (sequence.length === 1) {
        for (let free = 0; free < 4; free++) {
          if (!frees[free]) {
            moveTableauToFree(
              column,
              position,
              free
            );

            return;
          }
        }
      }
    }
  }

  /* =========================================================
     HINTS
  ========================================================= */

  function cardLabel(card) {
    return `${card.rank}${card.suit}`;
  }

  function findHint() {
    for (let column = 0; column < 8; column++) {
      const source = tableau[column];

      if (!source.length) {
        continue;
      }

      const card = source[source.length - 1];

      if (canMoveToHome(card)) {
        return t('moveCardToFoundation', {
          card: cardLabel(card)
        });
      }

      for (let destination = 0; destination < 8; destination++) {
        if (
          destination !== column &&
          canPlaceOnTableau(
            card,
            tableau[destination]
          )
        ) {
          return t('moveCardToColumn', {
            card: cardLabel(card),
            column: destination + 1
          });
        }
      }

      for (let free = 0; free < 4; free++) {
        if (!frees[free]) {
          return t('moveCardToFree', {
            card: cardLabel(card),
            free: free + 1
          });
        }
      }
    }

    for (let free = 0; free < 4; free++) {
      const card = frees[free];

      if (!card) {
        continue;
      }

      if (canMoveToHome(card)) {
        return t('moveCardToFoundation', {
          card: cardLabel(card)
        });
      }

      for (let column = 0; column < 8; column++) {
        if (
          canPlaceOnTableau(
            card,
            tableau[column]
          )
        ) {
          return t('moveCardToColumn', {
            card: cardLabel(card),
            column: column + 1
          });
        }
      }
    }

    return t('noHint');
  }

  /* =========================================================
     EVENTS
  ========================================================= */

  board.addEventListener(
    'pointerdown',
    onPointerDown,
    { passive: false }
  );

  document.addEventListener(
    'pointermove',
    onPointerMove,
    { passive: false }
  );

  document.addEventListener(
    'pointerup',
    onPointerUp,
    { passive: false }
  );

  document.addEventListener(
    'pointercancel',
    onPointerCancel,
    { passive: false }
  );

  newButton?.addEventListener(
    'click',
    createNewGame
  );

  restartButton?.addEventListener(
    'click',
    restart
  );

  undoButton?.addEventListener(
    'click',
    undo
  );

  hintButton?.addEventListener(
    'click',
    () => alert(findHint())
  );

  languageSelect?.addEventListener(
    'change',
    event => {
      setLanguage(event.target.value);
      render();
    }
  );

  /* =========================================================
     START GAME
  ========================================================= */

  setLanguage(detectLanguage());
  createNewGame();
});