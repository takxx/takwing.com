(() => {
  const PUZZLE_MIN_ID = 100;
  const PUZZLE_MAX_ID = 108;

  const GRID = 25;
  const GAP = 12;
  const COLORS = [
    "#f43f5e", "#10b981", "#0ea5e9", "#8b5cf6",
    "#ec4899", "#f59e0b", "#6366f1"
  ];
  const LANGUAGES = ["en", "es", "zh"];
  const STORAGE_KEY = "tangram-language";

  const TEXT = {
    en: {
      title: "Tangram",
      hint: "Drag and drop the pieces onto the silhouette.",
      newPuzzle: "New puzzle",
      loading: "Loading…",
      complete: "Puzzle completed!",
      puzzle: id => `Puzzle ${id}`,
      loadError: status => `Could not load tan.svg (${status}).`,
      parseError: "tan.svg could not be parsed.",
      noPuzzles: `No puzzle symbols with IDs ${PUZZLE_MIN_ID}–${PUZZLE_MAX_ID} were found.`,
      canvasLabel: "Interactive tangram puzzle",
      languageLabel: "Language"
    },
    es: {
      title: "Tangram",
      hint: "Arrastra y suelta las piezas sobre la silueta.",
      newPuzzle: "Nuevo puzle",
      loading: "Cargando…",
      complete: "¡Puzle completado!",
      puzzle: id => `Puzle ${id}`,
      loadError: status => `No se ha podido cargar tan.svg (${status}).`,
      parseError: "No se ha podido procesar tan.svg.",
      noPuzzles: `No se han encontrado símbolos de puzle con ID ${PUZZLE_MIN_ID}–${PUZZLE_MAX_ID}.`,
      canvasLabel: "Puzle de tangram interactivo",
      languageLabel: "Idioma"
    },
    zh: {
      title: "七巧板",
      hint: "請將拼圖塊拖曳到剪影上面。",
      newPuzzle: "換個新拼圖",
      loading: "正在載入…",
      complete: "完成拼圖！",
      puzzle: id => `拼圖 ${id}`,
      loadError: status => `無法載入 tan.svg（${status}）。`,
      parseError: "無法解析 tan.svg。",
      noPuzzles: `找不到 ID 為 ${PUZZLE_MIN_ID}–${PUZZLE_MAX_ID} 的拼圖圖案。`,
      canvasLabel: "互動七巧板拼圖",
      languageLabel: "語言"
    }
  };

  const canvas = document.querySelector("#game");
  const ctx = canvas.getContext("2d");
  const message = document.querySelector("#message");
  const languageSelect = document.querySelector("#language");

  function normalizeLanguage(value) {
    if (!value) return null;
    const code = value.toLowerCase().split("-")[0];
    return LANGUAGES.includes(code) ? code : null;
  }

  function chooseLanguage() {
    const fromQuery = normalizeLanguage(
      new URLSearchParams(location.search).get("lang")
    );
    if (fromQuery) return fromQuery;

    try {
      const fromStorage = normalizeLanguage(
        localStorage.getItem(STORAGE_KEY)
      );
      if (fromStorage) return fromStorage;
    } catch {
      // Use browser preferences if storage is unavailable.
    }

    for (const preference of navigator.languages || [navigator.language]) {
      const language = normalizeLanguage(preference);
      if (language) return language;
    }

    return "en";
  }

  let language = chooseLanguage();
  let pieces = [];
  let worldW = 0;
  let worldH = 0;
  let shapeW = 0;
  let shapeH = 0;
  let targetX = 0;
  let targetY = 0;
  let dragging = null;

  function setMessage(type, value = "") {
    message.dataset.type = type;
    message.textContent = value;
  }

  function applyLanguage() {
    const text = TEXT[language];

    document.documentElement.lang = language;
    document.querySelector("#title").textContent = text.title;
    document.querySelector("#hint").textContent = text.hint;
    document.querySelector("#reset").textContent = text.newPuzzle;
    document.querySelector("#languageLabel").textContent = text.languageLabel;
    languageSelect.setAttribute("aria-label", text.languageLabel);
    canvas.setAttribute("aria-label", text.canvasLabel);
    document.title = text.title;

    if (message.dataset.type === "loading") {
      setMessage("loading", text.loading);
    } else if (message.dataset.type === "complete") {
      setMessage("complete", text.complete);
    }
  }

  languageSelect.value = language;
  applyLanguage();

  languageSelect.addEventListener("change", () => {
    language = normalizeLanguage(languageSelect.value) || "en";

    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // The selected language still applies for this page.
    }

    applyLanguage();
  });

  function overlaps(a, b) {
    return a.left < b.right + GAP &&
      a.right + GAP > b.left &&
      a.top < b.bottom + GAP &&
      a.bottom + GAP > b.top;
  }

  function rectFor(piece, x = piece.x, y = piece.y) {
    return {
      left: x + piece.bounds.left,
      top: y + piece.bounds.top,
      right: x + piece.bounds.right,
      bottom: y + piece.bounds.bottom
    };
  }

  function keepOnScreen(piece) {
    const b = piece.bounds;
    piece.x = Math.max(-b.left, Math.min(worldW - b.right, piece.x));
    piece.y = Math.max(-b.top, Math.min(worldH - b.bottom, piece.y));
  }

  function draw() {
    ctx.clearRect(0, 0, worldW, worldH);
    if (!pieces.length) return;

    // Draw all piece paths as one visible dark grey silhouette.
    ctx.save();
    ctx.translate(targetX, targetY);
    ctx.fillStyle = "#333333"; // Changed from #3d1c08 to visible dark grey

    const silhouette = new Path2D();
    for (const piece of pieces) silhouette.addPath(piece.path);

    ctx.shadowColor = "rgb(217 119 6 / 25%)";
    ctx.shadowBlur = 6;
    ctx.fill(silhouette);
    ctx.restore();

    // Draw the draggable pieces.
    for (const piece of pieces) {
      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.fillStyle = piece.color;
      ctx.fill(piece.path);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#170a03";
      ctx.stroke(piece.path);
      ctx.restore();
    }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const oldTargetX = targetX;
    const oldTargetY = targetY;

    worldW = rect.width;
    worldH = rect.height;
    canvas.width = Math.round(worldW * dpr);
    canvas.height = Math.round(worldH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    targetX = (worldW - shapeW) / 2;
    targetY = (worldH - shapeH) / 2;

    if (pieces.length) {
      const dx = targetX - oldTargetX;
      const dy = targetY - oldTargetY;

      for (const piece of pieces) {
        piece.x += dx;
        piece.y += dy;
        keepOnScreen(piece);
      }
    }

    draw();
  }

  function pointerWorld(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function contains(piece, x, y) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const hit = ctx.isPointInPath(piece.path, x - piece.x, y - piece.y);
    ctx.restore();
    return hit;
  }

  canvas.addEventListener("pointerdown", event => {
    const p = pointerWorld(event);

    for (let i = pieces.length - 1; i >= 0; i--) {
      const piece = pieces[i];
      if (!contains(piece, p.x, p.y)) continue;

      dragging = {
        piece,
        pointerId: event.pointerId,
        dx: p.x - piece.x,
        dy: p.y - piece.y
      };

      pieces.splice(i, 1);
      pieces.push(piece);
      canvas.setPointerCapture(event.pointerId);
      event.preventDefault();
      draw();
      break;
    }
  });

  canvas.addEventListener("pointermove", event => {
    if (!dragging || event.pointerId !== dragging.pointerId) return;

    const p = pointerWorld(event);
    dragging.piece.x = p.x - dragging.dx;
    dragging.piece.y = p.y - dragging.dy;
    keepOnScreen(dragging.piece);
    draw();
  });

  canvas.addEventListener("pointerup", event => {
    if (!dragging || event.pointerId !== dragging.pointerId) return;

    const piece = dragging.piece;
    piece.x = targetX + Math.round((piece.x - targetX) / GRID) * GRID;
    piece.y = targetY + Math.round((piece.y - targetY) / GRID) * GRID;
    keepOnScreen(piece);

    dragging = null;
    draw();
    checkCompletion();
  });

  canvas.addEventListener("pointercancel", event => {
    if (dragging && event.pointerId === dragging.pointerId) {
      dragging = null;
      draw();
    }
  });

  function checkCompletion() {
    const complete = pieces.every(piece =>
      Math.abs(piece.x - targetX) < 1 &&
      Math.abs(piece.y - targetY) < 1
    );

    if (complete) {
      setMessage("complete", TEXT[language].complete);
    } else {
      setMessage("", "");
    }
  }

  function getTranslate(element) {
    const transform = element.getAttribute("transform") || "";
    const match = transform.match(
      /translate\(\s*([-+.\d]+)(?:[\s,]+([-+.\d]+))?\s*\)/
    );

    return match
      ? { x: Number(match[1]), y: Number(match[2] || 0) }
      : { x: 0, y: 0 };
  }

  function scatterPieces() {
    const placed = [];
    const order = [...pieces].sort((a, b) =>
      (b.bounds.right - b.bounds.left) *
        (b.bounds.bottom - b.bounds.top) -
      (a.bounds.right - a.bounds.left) *
        (a.bounds.bottom - a.bounds.top)
    );

    for (const piece of order) {
      const b = piece.bounds;
      const minX = -b.left;
      const maxX = Math.max(minX, worldW - b.right);
      const minY = -b.top;
      const maxY = Math.max(minY, worldH - b.bottom);
      let found = false;

      for (let attempt = 0; attempt < 6000; attempt++) {
        piece.x = minX + Math.random() * (maxX - minX);
        piece.y = minY + Math.random() * (maxY - minY);
        const rect = rectFor(piece);

        if (!placed.some(other => overlaps(rect, other))) {
          placed.push(rect);
          found = true;
          break;
        }
      }

      if (!found) {
        piece.x = minX;
        piece.y = minY;
        keepOnScreen(piece);
        placed.push(rectFor(piece));
      }
    }

    draw();
  }

  function loadSymbol(symbol) {
    const paths = [...symbol.querySelectorAll("path")];
    if (!paths.length) {
      throw new Error(`Symbol ${symbol.id} has no paths.`);
    }

    const group = symbol.querySelector("g");
    const groupOffset = group ? getTranslate(group) : { x: 0, y: 0 };

    const temporarySvg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    temporarySvg.style.cssText =
      "position:absolute;left:-10000px;top:-10000px;visibility:hidden";
    document.body.appendChild(temporarySvg);

    const sourcePieces = paths.map((element, index) => {
      const d = element.getAttribute("d");
      const measurementPath = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );

      measurementPath.setAttribute("d", d);
      temporarySvg.appendChild(measurementPath);
      const box = measurementPath.getBBox();
      measurementPath.remove();

      return {
        d,
        color: element.getAttribute("fill") || COLORS[index % COLORS.length],
        left: box.x + groupOffset.x,
        top: box.y + groupOffset.y,
        right: box.x + box.width + groupOffset.x,
        bottom: box.y + box.height + groupOffset.y
      };
    });

    temporarySvg.remove();

    const minX = Math.min(...sourcePieces.map(piece => piece.left));
    const minY = Math.min(...sourcePieces.map(piece => piece.top));
    const maxX = Math.max(...sourcePieces.map(piece => piece.right));
    const maxY = Math.max(...sourcePieces.map(piece => piece.bottom));
    const sourceW = maxX - minX;
    const sourceH = maxY - minY;

    const targetSize = 0.9 * Math.min(worldW, worldH);
    const fitScale = targetSize / Math.max(sourceW, sourceH);
    const mirrored = Math.random() < 0.5;

    shapeW = sourceW * fitScale;
    shapeH = sourceH * fitScale;

    targetX = (worldW - shapeW) / 2;
    targetY = (worldH - shapeH) / 2;

    pieces = sourcePieces.map(source => {
      const path = new Path2D();

      const transform = mirrored
        ? new DOMMatrix([
            -fitScale, 0,
            0, fitScale,
            (maxX - groupOffset.x) * fitScale,
            (groupOffset.y - minY) * fitScale
          ])
        : new DOMMatrix([
            fitScale, 0,
            0, fitScale,
            (groupOffset.x - minX) * fitScale,
            (groupOffset.y - minY) * fitScale
          ]);

      path.addPath(new Path2D(source.d), transform);

      const bounds = mirrored
        ? {
            left: (maxX - source.right) * fitScale,
            top: (source.top - minY) * fitScale,
            right: (maxX - source.left) * fitScale,
            bottom: (source.bottom - minY) * fitScale
          }
        : {
            left: (source.left - minX) * fitScale,
            top: (source.top - minY) * fitScale,
            right: (source.right - minX) * fitScale,
            bottom: (source.bottom - minY) * fitScale
          };

      return {
        path,
        color: source.color,
        x: 0,
        y: 0,
        bounds
      };
    });

    setMessage("", "");
    scatterPieces();
  }

  async function newPuzzle() {
    setMessage("loading", TEXT[language].loading);

    try {
      const response = await fetch("tan.svg");
      if (!response.ok) {
        throw new Error(TEXT[language].loadError(response.status));
      }

      const text = await response.text();
      const doc = new DOMParser().parseFromString(text, "image/svg+xml");

      if (doc.querySelector("parsererror")) {
        throw new Error(TEXT[language].parseError);
      }

      const available = [];

      for (let id = PUZZLE_MIN_ID; id <= PUZZLE_MAX_ID; id++) {
        const symbol = doc.getElementById(String(id));
        if (symbol) available.push(symbol);
      }

      if (!available.length) {
        throw new Error(TEXT[language].noPuzzles);
      }

      const symbol = available[Math.floor(Math.random() * available.length)];
      loadSymbol(symbol);
    } catch (error) {
      pieces = [];
      shapeW = 0;
      shapeH = 0;
      draw();
      setMessage("error", error.message);
      console.error(error);
    }
  }

  document.querySelector("#reset").addEventListener("click", newPuzzle);
  window.addEventListener("resize", resize);

  resize();
  newPuzzle();
})();
