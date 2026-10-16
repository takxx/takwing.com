(() => {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";

  const workspace = document.querySelector("#workspace");
  const info = document.querySelector("#info");
  const langSelect = document.querySelector("#lang");

  if (!workspace) return;

  const translations = {
    en: {
      title: "Tangram",
      language: "Language:",
      instructions:
        "Drag the pieces to form a shape. Tap to rotate; double-tap to flip."
    },
    es: {
      title: "Tangram",
      language: "Idioma:",
      instructions:
        "Arrastra las piezas para formar una figura. Toca para rotar; toca dos veces para voltear."
    },
    "zh-Hant": {
      title: "七巧板",
      language: "語言：",
      instructions:
        "拖曳碎片組成圖形。輕點一下旋轉；連續輕點兩下翻轉。"
    }
  };

  const shapes = [
    {
      name: "large-triangle-1",
      color: "#f97316",
      points: "0,0 200,0 0,200"
    },
    {
      name: "large-triangle-2",
      color: "#ef4444",
      points: "0,0 200,0 200,200"
    },
    {
      name: "medium-triangle",
      color: "#22c55e",
      points: "0,0 100,100 0,200"
    },
    {
      name: "small-triangle-1",
      color: "#38bdf8",
      points: "0,0 100,0 0,100"
    },
    {
      name: "small-triangle-2",
      color: "#06b6d4",
      points: "0,0 100,0 100,100"
    },
    {
      name: "square",
      color: "#eab308",
      points: "0,0 100,0 100,100 0,100"
    },
    {
      name: "parallelogram",
      color: "#ec4899",
      points: "0,0 100,0 200,100 100,100"
    }
  ];

  const homePositions = [
    [100, 560],
    [340, 560],
    [650, 530],
    [120, 790],
    [270, 790],
    [450, 780],
    [700, 760]
  ];

  let pieces = [];
  let selected = null;
  let currentLang = detectLanguage();

  let dragging = null;
  let activePointerId = null;
  let dragStartPoint = null;
  let dragStartPosition = null;
  let didDrag = false;
  let pendingDragPoint = null;
  let dragFrame = 0;

  let lastTapPiece = null;
  let lastTapTime = 0;
  let tapTimer = null;
  let lastTouchTapTime = 0;

  function detectLanguage() {
    const urlLang = new URLSearchParams(window.location.search)
      .get("lang")
      ?.toLowerCase();

    if (urlLang === "es") return "es";
    if (urlLang?.startsWith("zh")) return "zh-Hant";
    if (urlLang === "en") return "en";

    const browserLanguages = Array.isArray(navigator.languages)
      ? navigator.languages
      : [navigator.language || "en"];

    for (const language of browserLanguages) {
      const normalized = language?.toLowerCase();
      if (!normalized) continue;

      if (
        normalized.startsWith("zh-hant") ||
        normalized.startsWith("zh-hk") ||
        normalized.startsWith("zh-mo") ||
        normalized.startsWith("zh-tw") ||
        normalized === "zh"
      ) {
        return "zh-Hant";
      }

      if (normalized.startsWith("es")) return "es";
      if (normalized.startsWith("en")) return "en";
    }

    return "en";
  }

  function getTranslation(key) {
    return translations[currentLang]?.[key] ?? translations.en[key] ?? key;
  }

  function applyTranslations() {
    document.documentElement.lang = currentLang;

    document.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = getTranslation(
        element.getAttribute("data-i18n")
      );
    });

    if (langSelect) {
      langSelect.value = currentLang;
    }
  }

  function makeSvgElement(name, attributes = {}) {
    const element = document.createElementNS(SVG_NS, name);

    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, value);
    }

    return element;
  }

  function updatePiece(piece) {
    piece.setAttribute(
      "transform",
      `translate(${piece.dataset.x} ${piece.dataset.y}) ` +
        `rotate(${piece.dataset.rotation}) ` +
        `scale(${piece.dataset.flip} 1)`
    );
  }

  function selectPiece(piece) {
    pieces.forEach((item) => item.classList.remove("selected"));

    selected = piece;
    selected.classList.add("selected");

    // Append last so the selected piece appears above the others.
    workspace.appendChild(selected);
  }

  function rotatePiece(piece) {
    if (!piece) return;

    piece.dataset.rotation = Number(piece.dataset.rotation) + 45;
    updatePiece(piece);
  }

  function flipPiece(piece) {
    if (!piece) return;

    piece.dataset.flip = Number(piece.dataset.flip) * -1;
    updatePiece(piece);
  }

  function getSvgPoint(event) {
    const screenMatrix = workspace.getScreenCTM();

    if (!screenMatrix) {
      return { x: event.clientX, y: event.clientY };
    }

    const point = new DOMPoint(event.clientX, event.clientY);
    return point.matrixTransform(screenMatrix.inverse());
  }

  function startDragging(event) {
    if (event.button !== undefined && event.button !== 0) return;

    event.preventDefault();

    const piece = event.currentTarget;
    selectPiece(piece);

    const point = getSvgPoint(event);

    dragging = piece;
    activePointerId = event.pointerId;
    didDrag = false;
    pendingDragPoint = null;

    dragStartPoint = { x: point.x, y: point.y };
    dragStartPosition = {
      x: Number(piece.dataset.x),
      y: Number(piece.dataset.y)
    };

    try {
      piece.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture may be unavailable in some browsers.
    }

    window.addEventListener("pointermove", dragPiece, { passive: false });
    window.addEventListener("pointerup", finishDragging);
    window.addEventListener("pointercancel", finishDragging);
  }

  function dragPiece(event) {
    if (!dragging || event.pointerId !== activePointerId) return;

    event.preventDefault();
    pendingDragPoint = getSvgPoint(event);

    if (!dragFrame) {
      dragFrame = requestAnimationFrame(applyDrag);
    }
  }

  function applyDrag() {
    dragFrame = 0;

    if (!dragging || !pendingDragPoint) return;

    const dx = pendingDragPoint.x - dragStartPoint.x;
    const dy = pendingDragPoint.y - dragStartPoint.y;

    if (Math.hypot(dx, dy) <= 5) return;

    didDrag = true;

    if (info) {
      info.classList.add("hidden");
    }

    dragging.dataset.x = dragStartPosition.x + dx;
    dragging.dataset.y = dragStartPosition.y + dy;
    updatePiece(dragging);
  }

  function finishDragging(event) {
    if (!dragging || event.pointerId !== activePointerId) return;

    // Apply the last pointer position before ending the drag.
    if (dragFrame) {
      cancelAnimationFrame(dragFrame);
      dragFrame = 0;
    }
    applyDrag();

    const piece = dragging;
    const wasDragged = didDrag;
    const pointerType = event.pointerType;

    try {
      piece.releasePointerCapture(activePointerId);
    } catch {
      // Capture may already have ended.
    }

    window.removeEventListener("pointermove", dragPiece);
    window.removeEventListener("pointerup", finishDragging);
    window.removeEventListener("pointercancel", finishDragging);

    dragging = null;
    activePointerId = null;
    dragStartPoint = null;
    dragStartPosition = null;
    pendingDragPoint = null;
    didDrag = false;

    if (wasDragged) {
      lastTapPiece = null;
      lastTapTime = 0;
      clearTimeout(tapTimer);
      return;
    }

    if (pointerType === "touch") {
      handleTouchTap(piece);
    }
  }

  function handleTouchTap(piece) {
    const now = Date.now();
    selectPiece(piece);

    const isDoubleTap =
      lastTapPiece === piece &&
      now - lastTapTime < 320;

    clearTimeout(tapTimer);

    if (isDoubleTap) {
      lastTapPiece = null;
      lastTapTime = 0;
      lastTouchTapTime = now;
      flipPiece(piece);
      return;
    }

    lastTapPiece = piece;
    lastTapTime = now;
    lastTouchTapTime = now;

    tapTimer = setTimeout(() => {
      rotatePiece(piece);
      lastTapPiece = null;
      lastTapTime = 0;
    }, 320);
  }

  function handleContextMenu(event) {
    event.preventDefault();

    const piece = event.currentTarget;
    selectPiece(piece);
    rotatePiece(piece);
  }

  function handleDoubleClick(event) {
    event.preventDefault();

    // Touch double-taps are handled by handleTouchTap.
    if (Date.now() - lastTouchTapTime < 500) return;

    const piece = event.currentTarget;
    selectPiece(piece);
    flipPiece(piece);
  }

  function createPieces() {
    workspace.replaceChildren();
    pieces = [];

    shapes.forEach((shape, index) => {
      const piece = makeSvgElement("polygon", {
        points: shape.points,
        fill: shape.color,
        class: "piece",
        "data-name": shape.name
      });

      piece.dataset.x = homePositions[index][0];
      piece.dataset.y = homePositions[index][1];
      piece.dataset.rotation = 0;
      piece.dataset.flip = 1;

      updatePiece(piece);
      workspace.appendChild(piece);
      pieces.push(piece);

      piece.addEventListener("pointerdown", startDragging);
      piece.addEventListener("contextmenu", handleContextMenu);
      piece.addEventListener("dblclick", handleDoubleClick);
    });
  }

  langSelect?.addEventListener("change", (event) => {
    const language = event.target.value;
    if (translations[language]) {
      currentLang = language;
      applyTranslations();
    }
  });

  applyTranslations();
  createPieces();
})();
