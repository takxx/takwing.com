'use strict';

document.addEventListener('DOMContentLoaded', () => {
  /* ---------- Internationalization ---------- */

  const translations = {
    en: {
      title: 'FreeCell',
      newGame: 'New',
      restart: 'Restart',
      undo: 'Undo',
      autoMove: 'Auto-move',
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
      autoMove: 'Auto-mover',
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
      autoMove: '自動移動',
      hint: '提示',
      freeCell: '自由格',
      hintText: '拖曳或點擊卡片來移動它們。',
      moves: '步數',
      foundations: '牌疊',
      youWon: '你贏了！',
      noHint: '找不到明顯的移動。',
      moveCardToFoundation: '將 {card} 移動到牌疊。',
      moveCardToColumn: '將 {card} 移動到第 {column} 列。',
      moveCardToFree: '將 {card} 移動到自由格 {free}。'
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
    let saved = null;

    try {
      saved = localStorage.getItem('freecell_lang');
    } catch {
      // Storage may be unavailable in private browsing contexts.
    }

    if (saved && translations[saved]) {
      return saved;
    }

    const browserLang =
      navigator.languages?.[0] ||
      navigator.language ||
      'en';

    if (
      browserLang.startsWith('zh-HK') ||
      browserLang.startsWith('zh-TW') ||
      browserLang === 'zh'
    ) {
      return 'zh-TW';
    }

    if (browserLang.startsWith('es')) {
      return 'es';
    }

    return 'en';
  }

  function setLanguage(lang) {
    currentLang = translations[lang] ? lang : 'en';

    try {
      localStorage.setItem('freecell_lang', currentLang);
    } catch {
      // Continue without persistence if storage is unavailable.
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

  /* ---------- DOM references ---------- */

  const board = document.getElementById('board');
  const status = document.getElementById('status');

  const newButton = document.getElementById('newBtn');
  const restartButton = document.getElementById('restartBtn');
  const undoButton = document.getElementById('undoBtn');
  const autoButton = document.getElementById('autoBtn');
  const hintButton = document.getElementById('hintBtn');
  const languageSelect = document.getElementById('langSelect');

  if (!board || !status) {
    console.error('FreeCell: required elements were not found.');
    return;
  }

  /* ---------- iOS gesture prevention ---------- */

  /*
   * Keep Safari pinch-zoom and gesture handling disabled.
   */
  for (const eventName of [
    'gesturestart',
    'gesturechange',
    'gestureend'
  ]) {
    document.addEventListener(
      eventName,
      event => {
        event.preventDefault();
      },
      { passive: false }
    );
  }

  /*
   * The board still cancels native touch behavior, except on
   * native controls. This is the key fix for iPhone buttons
   * and the language selector.
   */
  function isNativeControl(target) {
    return Boolean(
      target.closest(
        'button, select, option, input, textarea, a'
      )
    );
  }

  function preventBoardTouch(event) {
    if (isNativeControl(event.target)) {
      return;
    }

    event.preventDefault();
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

  /*
   * Prevent accidental double-tap zoom without suppressing
   * the click generated by a normal tap on a native control.
   *
   * This listener only acts on non-control content.
   */
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

  /* ---------- Game constants and state ---------- */

  const SUITS = ['♥', '♦', '♣', '♠'];

  const RANKS = [
    'A', '2', '3', '4', '5', '6', '7',
    '8', '9', '10', 'J', 'Q', 'K'
  ];

  const COLORS = {
    '♥': 'red',
    '♦': 'red',
    '♣': 'black',
    '♠': 'black'
  };

  let tableau = [];
  let frees = [];
  let homes = {};
  let history = [];
  let hasShownWinMessage = false;

  let pointerState = null;
  let dragState = null;

  /* ---------- Cards ---------- */

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

  /* ---------- State ---------- */

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
  }

  function saveSnapshot() {
    history.push(serialize());
    updateStatus();
  }

  function deal() {
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

    deck.forEach((card, index) => {
      tableau[index % 8].push(copyCard(card));
    });

    history = [];
    hasShownWinMessage = false;

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
    const foundationCount = Object.values(homes)
      .reduce(
        (total, count) => total + count,
        0
      );

    status.textContent =
      `${t('moves')}: ${Math.max(
        0,
        history.length - 1
      )} | ${t('foundations')}: ${foundationCount}/52`;
  }

  /* ---------- Rendering ---------- */

  function createCardElement(card, metadata = {}) {
    const normalized = copyCard(card);
    const element = document.createElement('div');

    element.className = 'card';

    if (COLORS[normalized.suit] === 'red') {
      element.classList.add('red');
    }

    element.innerHTML = `
      <div class="top">${normalized.rank}</div>
      <div class="suit">${normalized.suit}</div>
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

    element.style.width = '68px';
    element.style.height = '92px';
    element.style.cursor = 'default';

    return element;
  }

  function render() {
    document.querySelectorAll('.stack').forEach(stack => {
      stack.replaceChildren();
    });

    document
      .querySelectorAll('[data-type="free"]')
      .forEach((slot, index) => {
        slot.replaceChildren();

        const label = document.createElement('div');

        label.className = 'label';
        label.textContent = t('freeCell');

        slot.append(
          label,
          document.createTextNode(` ${index + 1}`)
        );

        if (frees[index]) {
          slot.appendChild(
            createCardElement(frees[index], {
              loc: 'free',
              idx: index
            })
          );
        }
      });

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

    tableau.forEach((column, columnIndex) => {
      const stack = document.querySelector(
        `.stack[data-index="${columnIndex}"]`
      );

      if (!stack) {
        return;
      }

      column.forEach((card, position) => {
        const element = createCardElement(card, {
          loc: 'tableau',
          idx: columnIndex,
          pos: position
        });

        element.style.top = `${position * 28}px`;
        stack.appendChild(element);
      });
    });

    updateStatus();
    checkWin();
  }

  function checkWin() {
    const won =
      Object.values(homes)
        .reduce(
          (total, count) => total + count,
          0
        ) === 52;

    if (!won || hasShownWinMessage) {
      return;
    }

    hasShownWinMessage = true;

    setTimeout(() => {
      alert(t('youWon'));
    }, 80);
  }

  /* ---------- Rules ---------- */

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

    const emptyFreeCells =
      frees.filter(card => !card).length;

    const emptyColumns =
      tableau.filter(column => column.length === 0).length;

    const destinationIsEmpty =
      destination.length === 0;

    const adjustedEmptyColumns =
      emptyColumns -
      (destinationIsEmpty ? 1 : 0);

    const maxMovable =
      (emptyFreeCells + 1) *
      (adjustedEmptyColumns + 1);

    return (
      sequence.length <= maxMovable &&
      canPlaceOnTableau(
        sequence[0],
        destination
      )
    );
  }

  /* ---------- Move operations ---------- */

  function moveFreeToHome(index) {
    const card = frees[index];

    if (!card || !canMoveToHome(card)) {
      return false;
    }

    frees[index] = null;
    homes[card.suit]++;

    saveSnapshot();
    render();

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

    saveSnapshot();
    render();

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

    const card =
      column[column.length - 1];

    if (!card || !canMoveToHome(card)) {
      return false;
    }

    column.pop();
    homes[card.suit]++;

    saveSnapshot();
    render();

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

    saveSnapshot();
    render();

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
      destination.concat(
        sequence.map(copyCard)
      );

    tableau[sourceIndex] =
      source.slice(0, position);

    saveSnapshot();
    render();

    return true;
  }

  /* ---------- Pointer interaction ---------- */

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
      !board.contains(cardElement)
    ) {
      return;
    }

    if (!cardElement.dataset.loc) {
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
      completedPointer.element
        .releasePointerCapture?.(
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
    const rect =
      original.getBoundingClientRect();

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

    original.classList.add(
      'dragging-source'
    );

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

        const card = frees[freeIndex];

        if (
          card &&
          destinationType === 'home'
        ) {
          moveFreeToHome(freeIndex);
        } else if (
          card &&
          destinationType === 'tableau'
        ) {
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
        } else if (
          destinationType === 'tableau'
        ) {
          moveTableauToTableau(
            sourceColumn,
            position,
            destinationIndex
          );
        } else if (
          destinationType === 'free'
        ) {
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

      for (
        let destination = 0;
        destination < 8;
        destination++
      ) {
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

  /* ---------- Event registration ---------- */

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

  /* ---------- Auto-move and hints ---------- */

  function autoMoveToHome() {
    for (let column = 0; column < 8; column++) {
      const source = tableau[column];

      if (!source.length) {
        continue;
      }

      const card =
        source[source.length - 1];

      if (canMoveToHome(card)) {
        source.pop();
        homes[card.suit]++;

        saveSnapshot();
        render();

        return true;
      }
    }

    for (let index = 0; index < 4; index++) {
      const card = frees[index];

      if (
        card &&
        canMoveToHome(card)
      ) {
        frees[index] = null;
        homes[card.suit]++;

        saveSnapshot();
        render();

        return true;
      }
    }

    return false;
  }

  function cardLabel(card) {
    return `${card.rank}${card.suit}`;
  }

  function findHint() {
    for (let column = 0; column < 8; column++) {
      const source = tableau[column];

      if (!source.length) {
        continue;
      }

      const card =
        source[source.length - 1];

      if (canMoveToHome(card)) {
        return t(
          'moveCardToFoundation',
          {
            card: cardLabel(card)
          }
        );
      }

      for (
        let destination = 0;
        destination < 8;
        destination++
      ) {
        if (
          destination !== column &&
          canPlaceOnTableau(
            card,
            tableau[destination]
          )
        ) {
          return t(
            'moveCardToColumn',
            {
              card: cardLabel(card),
              column: destination + 1
            }
          );
        }
      }

      for (let free = 0; free < 4; free++) {
        if (!frees[free]) {
          return t(
            'moveCardToFree',
            {
              card: cardLabel(card),
              free: free + 1
            }
          );
        }
      }
    }

    for (let free = 0; free < 4; free++) {
      const card = frees[free];

      if (!card) {
        continue;
      }

      if (canMoveToHome(card)) {
        return t(
          'moveCardToFoundation',
          {
            card: cardLabel(card)
          }
        );
      }

      for (let column = 0; column < 8; column++) {
        if (
          canPlaceOnTableau(
            card,
            tableau[column]
          )
        ) {
          return t(
            'moveCardToColumn',
            {
              card: cardLabel(card),
              column: column + 1
            }
          );
        }
      }
    }

    return t('noHint');
  }

  /* ---------- Buttons ---------- */

  newButton?.addEventListener(
    'click',
    deal
  );

  restartButton?.addEventListener(
    'click',
    restart
  );

  undoButton?.addEventListener(
    'click',
    undo
  );

  autoButton?.addEventListener(
    'click',
    () => {
      while (autoMoveToHome()) {
        // Continue moving available cards.
      }
    }
  );

  hintButton?.addEventListener(
    'click',
    () => {
      alert(findHint());
    }
  );

  languageSelect?.addEventListener(
    'change',
    event => {
      setLanguage(event.target.value);
      render();
    }
  );

  /* ---------- Initialize ---------- */

  setLanguage(detectLanguage());
  deal();
});