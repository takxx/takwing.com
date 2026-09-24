'use strict';

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
    hintText: 'Drag or click cards to move them. Double-click a card to move it to a foundation.',
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
    hintText: 'Arrastra o haz clic en las cartas para moverlas. Haz doble clic en una carta para moverla a una fundación.',
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
    hintText: '拖曳或點擊卡片來移動它們。雙擊卡片可將其移動到牌疊。',
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

function detectLanguage() {
  const saved = localStorage.getItem('freecell_lang');
  if (saved && translations[saved]) {
    return saved;
  }

  const browserLang = navigator.languages?.[0] || navigator.language || 'en';
  
  if (browserLang.startsWith('zh-HK') || browserLang.startsWith('zh-TW') || browserLang === 'zh') {
    return 'zh-TW';
  }
  
  if (browserLang.startsWith('es')) {
    return 'es';
  }

  return 'en';
}

function setLanguage(lang) {
  if (!translations[lang]) {
    lang = 'en';
  }
  
  currentLang = lang;
  localStorage.setItem('freecell_lang', lang);
  document.documentElement.lang = lang;
  
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (translations[lang][key]) {
      if (el.tagName === 'INPUT' || el.tagName === 'BUTTON') {
        el.textContent = translations[lang][key];
      } else {
        el.textContent = translations[lang][key];
      }
    }
  });
  
  const langSelect = document.getElementById('langSelect');
  if (langSelect) {
    langSelect.value = lang;
  }
  
  updateStatus();
}

function t(key, params = {}) {
  let text = translations[currentLang][key] || translations.en[key] || key;
  
  for (const [param, value] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), value);
  }
  
  return text;
}

/* ---------- Game constants and state ---------- */

const SUITS = ['♥', '♦', '♣', '♠'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const COLORS = {
  '♥': 'red',
  '♦': 'red',
  '♣': 'black',
  '♠': 'black'
};

let tableau;
let frees;
let homes;
let history = [];

let pointer = {
  el: null,
  from: null,
  startX: 0,
  startY: 0,
  pointerId: null,
  moved: false
};

let dragState = null;

const status = document.getElementById('status');

/* ---------- Card and game helpers ---------- */

function makeCard(suit, rank) {
  return {
    suit,
    rank,
    rankN: RANKS.indexOf(rank) + 1
  };
}

function copyCard(card) {
  return card
    ? {
        suit: card.suit,
        rank: card.rank,
        rankN: Number(card.rankN)
      }
    : null;
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
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

function deal() {
  const deck = shuffle(buildDeck());

  tableau = Array.from({ length: 8 }, () => []);
  frees = [null, null, null, null];
  homes = {
    '♥': 0,
    '♦': 0,
    '♣': 0,
    '♠': 0
  };

  for (let i = 0; i < deck.length; i++) {
    tableau[i % 8].push(copyCard(deck[i]));
  }

  history = [];
  saveSnapshot();
  render();
}

function serialize() {
  return JSON.stringify({
    tableau: tableau.map(column => column.map(copyCard)),
    frees: frees.map(copyCard),
    homes: { ...homes }
  });
}

function restoreSnapshot(snapshot) {
  const state = JSON.parse(snapshot);

  tableau = state.tableau.map(column => column.map(copyCard));
  frees = state.frees.map(copyCard);
  homes = { ...state.homes };
}

function saveSnapshot() {
  history.push(serialize());
  updateStatus();
}

function restart() {
  if (!history.length) return;

  restoreSnapshot(history[0]);
  history = [history[0]];
  render();
}

function updateStatus() {
  const foundationCount = Object.values(homes)
    .reduce((total, count) => total + count, 0);

  status.textContent =
    `${t('moves')}: ${Math.max(0, history.length - 1)} | ${t('foundations')}: ${foundationCount}/52`;
}

/* ---------- Rendering ---------- */

function createCardElement(card, meta = {}) {
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

  element.dataset.loc = meta.loc || '';
  element.dataset.idx = meta.idx ?? '';

  if (meta.pos !== undefined) {
    element.dataset.pos = meta.pos;
  }

  element.dataset.suit = normalized.suit;
  element.dataset.rank = normalized.rank;
  element.dataset.rankN = normalized.rankN;

  element.addEventListener('pointerdown', onCardPointerDown);
  element.addEventListener('dblclick', onDoubleClick);

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

  document.querySelectorAll('[data-type="free"]').forEach((slot, index) => {
    slot.innerHTML = `<div class="label">${t('freeCell')}</div> ${index + 1}`;

    if (frees[index]) {
      slot.appendChild(
        createCardElement(frees[index], {
          loc: 'free',
          idx: index
        })
      );
    }
  });

  document.querySelectorAll('[data-type="home"]').forEach((slot, index) => {
    const suit = SUITS[index];

    slot.innerHTML = `<div class="label">${suit}</div>`;

    if (homes[suit] > 0) {
      slot.appendChild(
        createFoundationCard(
          makeCard(suit, RANKS[homes[suit] - 1])
        )
      );
    }
  });

  tableau.forEach((column, columnIndex) => {
    const stack = document.querySelector(
      `.stack[data-index="${columnIndex}"]`
    );

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

  const won = Object.values(homes)
    .reduce((total, count) => total + count, 0) === 52;

  if (won) {
    setTimeout(() => alert(t('youWon')), 80);
  }
}

/* ---------- Rules ---------- */

function canMoveToHome(card) {
  return card &&
    homes[card.suit] === Number(card.rankN) - 1;
}

function canPlaceOnTableau(card, destination) {
  if (!card) return false;
  if (!destination.length) return true;

  const top = destination[destination.length - 1];

  return (
    top.rankN === Number(card.rankN) + 1 &&
    COLORS[top.suit] !== COLORS[card.suit]
  );
}

function canPlaceSequence(sequence, destination) {
  if (!sequence.length) return false;

  for (let i = 0; i < sequence.length - 1; i++) {
    const current = sequence[i];
    const next = sequence[i + 1];

    if (
      current.rankN !== next.rankN + 1 ||
      COLORS[current.suit] === COLORS[next.suit]
    ) {
      return false;
    }
  }

  const emptyFreeCells = frees.filter(card => !card).length;
  const emptyColumns = tableau.filter(column => column.length === 0).length;

  const destinationIsEmpty = destination.length === 0;
  const adjustedEmptyColumns =
    emptyColumns - (destinationIsEmpty ? 1 : 0);

  const maxMovable =
    (emptyFreeCells + 1) * (adjustedEmptyColumns + 1);

  if (sequence.length > maxMovable) {
    return false;
  }

  return canPlaceOnTableau(sequence[0], destination);
}

/* ---------- Move operations ---------- */

function moveFreeToHome(index) {
  const card = frees[index];

  if (!card || !canMoveToHome(card)) return;

  homes[card.suit]++;
  frees[index] = null;

  saveSnapshot();
  render();
}

function moveFreeToTableau(index, destinationIndex) {
  const card = frees[index];

  if (!card || !canPlaceOnTableau(card, tableau[destinationIndex])) {
    return;
  }

  tableau[destinationIndex].push(copyCard(card));
  frees[index] = null;

  saveSnapshot();
  render();
}

function moveTableauToHome(columnIndex, position) {
  const column = tableau[columnIndex];

  if (position !== column.length - 1) return;

  const card = column[column.length - 1];

  if (!card || !canMoveToHome(card)) return;

  column.pop();
  homes[card.suit]++;

  saveSnapshot();
  render();
}

function moveTableauToFree(columnIndex, position, freeIndex) {
  const column = tableau[columnIndex];

  if (position !== column.length - 1) return;
  if (frees[freeIndex]) return;

  frees[freeIndex] = copyCard(column.pop());

  saveSnapshot();
  render();
}

function moveTableauToTableau(
  sourceIndex,
  position,
  destinationIndex
) {
  if (sourceIndex === destinationIndex) return;

  const source = tableau[sourceIndex];
  const destination = tableau[destinationIndex];
  const sequence = source.slice(position);

  if (!canPlaceSequence(sequence, destination)) return;

  tableau[destinationIndex] = destination.concat(
    sequence.map(copyCard)
  );

  tableau[sourceIndex] = source.slice(0, position);

  saveSnapshot();
  render();
}

/* ---------- Pointer and drag handling ---------- */

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

function onCardPointerDown(event) {
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return;
  }

  const element = event.currentTarget;
  const source = getPointerSource(element);

  if (!source) return;

  event.preventDefault();

  pointer = {
    el: element,
    from: source,
    startX: event.clientX,
    startY: event.clientY,
    pointerId: event.pointerId,
    moved: false
  };

  element.setPointerCapture?.(event.pointerId);

  element.addEventListener('pointermove', onPointerMove);
  element.addEventListener('pointerup', onPointerUp, { once: true });
  element.addEventListener('pointercancel', onPointerCancel, { once: true });
}

function onPointerMove(event) {
  if (!pointer.el || event.pointerId !== pointer.pointerId) {
    return;
  }

  const distance = Math.hypot(
    event.clientX - pointer.startX,
    event.clientY - pointer.startY
  );

  if (!pointer.moved && distance >= 8) {
    pointer.moved = true;
    beginDrag(event);
  }

  if (pointer.moved) {
    moveDrag(event);
  }
}

function onPointerUp(event) {
  if (!pointer.el || event.pointerId !== pointer.pointerId) {
    return;
  }

  const sourcePointer = { ...pointer };

  pointer.el.releasePointerCapture?.(event.pointerId);
  pointer.el.removeEventListener('pointermove', onPointerMove);
  pointer.el.removeEventListener('pointercancel', onPointerCancel);

  if (sourcePointer.moved) {
    dropDrag(event);
  } else {
    clickMove(sourcePointer);
  }

  resetPointer();
}

function onPointerCancel(event) {
  if (!pointer.el || event.pointerId !== pointer.pointerId) {
    return;
  }

  pointer.el.releasePointerCapture?.(event.pointerId);
  pointer.el.removeEventListener('pointermove', onPointerMove);
  pointer.el.removeEventListener('pointerup', onPointerUp);

  cleanupDrag();
  resetPointer();
}

function resetPointer() {
  pointer = {
    el: null,
    from: null,
    startX: 0,
    startY: 0,
    pointerId: null,
    moved: false
  };
}

function beginDrag(event) {
  if (!pointer.el || dragState) return;

  const rect = pointer.el.getBoundingClientRect();
  const ghost = pointer.el.cloneNode(true);

  ghost.classList.add('drag-ghost');

  ghost.style.position = 'fixed';
  ghost.style.left = '0';
  ghost.style.top = '0';
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  ghost.style.zIndex = '9999';
  ghost.style.pointerEvents = 'none';

  dragState = {
    ghost,
    original: pointer.el,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top
  };

  pointer.el.classList.add('dragging-source');
  document.body.appendChild(ghost);

  moveDrag(event);
}

function moveDrag(event) {
  if (!dragState) return;

  dragState.ghost.style.left =
    `${event.clientX - dragState.offsetX}px`;

  dragState.ghost.style.top =
    `${event.clientY - dragState.offsetY}px`;
}

function dropDrag(event) {
  if (!dragState) return;

  const destinationElement = document.elementFromPoint(
    event.clientX,
    event.clientY
  );

  const destination = destinationElement?.closest(
    '.stack, .slot.small'
  );

  const sourceElement = dragState.original;
  const sourceLocation = sourceElement.dataset.loc;

  if (destination) {
    const destinationType =
      destination.classList.contains('stack')
        ? 'tableau'
        : destination.dataset.type;

    const destinationIndex =
      Number(destination.dataset.index);

    if (sourceLocation === 'free') {
      const freeIndex = Number(sourceElement.dataset.idx);
      const card = frees[freeIndex];

      if (card && destinationType === 'home') {
        moveFreeToHome(freeIndex);
      } else if (card && destinationType === 'tableau') {
        moveFreeToTableau(
          freeIndex,
          destinationIndex
        );
      }
    }

    if (sourceLocation === 'tableau') {
      const sourceColumn =
        Number(sourceElement.dataset.idx);

      const position =
        Number(sourceElement.dataset.pos);

      if (destinationType === 'home') {
        moveTableauToHome(sourceColumn, position);
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
  if (!dragState) return;

  dragState.original.classList.remove('dragging-source');
  dragState.ghost.remove();
  dragState = null;
}

/* ---------- Click movement ---------- */

function clickMove(sourcePointer) {
  const source = sourcePointer.from;

  if (!source) return;

  if (source.type === 'free') {
    const card = frees[source.index];

    if (!card) return;

    if (canMoveToHome(card)) {
      moveFreeToHome(source.index);
      return;
    }

    for (let column = 0; column < 8; column++) {
      if (canPlaceOnTableau(card, tableau[column])) {
        moveFreeToTableau(source.index, column);
        return;
      }
    }

    return;
  }

  if (source.type === 'tableau') {
    const { column, position, sequence } = source;

    if (!sequence.length) return;

    if (
      sequence.length === 1 &&
      canMoveToHome(sequence[0])
    ) {
      moveTableauToHome(column, position);
      return;
    }

    for (let destination = 0; destination < 8; destination++) {
      if (
        destination !== column &&
        canPlaceSequence(sequence, tableau[destination])
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
          moveTableauToFree(column, position, free);
          return;
        }
      }
    }
  }
}

function onDoubleClick(event) {
  const card = event.currentTarget;
  const location = card.dataset.loc;

  if (location === 'free') {
    const index = Number(card.dataset.idx);

    if (frees[index] && canMoveToHome(frees[index])) {
      moveFreeToHome(index);
    }

    return;
  }

  if (location === 'tableau') {
    const column = Number(card.dataset.idx);
    const position = Number(card.dataset.pos);
    const source = tableau[column];

    if (
      position === source.length - 1 &&
      canMoveToHome(source[position])
    ) {
      moveTableauToHome(column, position);
    }
  }
}

/* ---------- Auto-move and hints ---------- */

function autoMoveToHome() {
  for (let column = 0; column < 8; column++) {
    const source = tableau[column];

    if (!source.length) continue;

    const card = source[source.length - 1];

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

    if (card && canMoveToHome(card)) {
      frees[index] = null;
      homes[card.suit]++;
      saveSnapshot();
      render();
      return true;
    }
  }

  return false;
}

function findHint() {
  for (let column = 0; column < 8; column++) {
    const source = tableau[column];

    if (!source.length) continue;

    const card = source[source.length - 1];

    if (canMoveToHome(card)) {
      return t('moveCardToFoundation', { card: `${card.rank}${card.suit}` });
    }

    for (let destination = 0; destination < 8; destination++) {
      if (
        destination !== column &&
        canPlaceOnTableau(card, tableau[destination])
      ) {
        return t('moveCardToColumn', { 
          card: `${card.rank}${card.suit}`, 
          column: destination + 1 
        });
      }
    }

    for (let free = 0; free < 4; free++) {
      if (!frees[free]) {
        return t('moveCardToFree', { 
          card: `${card.rank}${card.suit}`, 
          free: free + 1 
        });
      }
    }
  }

  for (let free = 0; free < 4; free++) {
    const card = frees[free];

    if (!card) continue;

    if (canMoveToHome(card)) {
      return t('moveCardToFoundation', { card: `${card.rank}${card.suit}` });
    }

    for (let column = 0; column < 8; column++) {
      if (canPlaceOnTableau(card, tableau[column])) {
        return t('moveCardToColumn', { 
          card: `${card.rank}${card.suit}`, 
          column: column + 1 
        });
      }
    }
  }

  return t('noHint');
}

/* ---------- Buttons and language switcher ---------- */

document.getElementById('newBtn').addEventListener('click', deal);
document.getElementById('restartBtn').addEventListener('click', restart);

document.getElementById('undoBtn').addEventListener('click', () => {
  if (history.length <= 1) return;

  history.pop();
  restoreSnapshot(history[history.length - 1]);
  render();
});

document.getElementById('autoBtn').addEventListener('click', () => {
  while (autoMoveToHome()) {}
  render();
});

document.getElementById('hintBtn').addEventListener('click', () => {
  alert(findHint());
});

document.getElementById('langSelect').addEventListener('change', (event) => {
  setLanguage(event.target.value);
  render();
});

/* ---------- Initialize ---------- */

setLanguage(detectLanguage());
deal();