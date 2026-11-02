(() => {
  const PUZZLE_MIN_ID = 100;
  const PUZZLE_MAX_ID = 147;

  const GRID = 25;
  const GAP = 12;
  const ROTATION_STEP = Math.PI / 4;
  const COLORS = [
    "#C9E891", "#68C0D2", "#EF3D61", "#F0F223",
    "#A796C2", "#F195C8", "#F8C82C"
  ];
  const LANGUAGES = ["en", "es", "zh"];
  const STORAGE_KEY = "tangram-language";

  const TEXT = {
    en: {
      title: "Tangram",
      hint: "Drag and drop the pieces onto the silhouette. Click/touch to rotate.",
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
      hint: "Arrastra las piezas sobre la silueta. Haz clic o toca para girarlas.",
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
      hint: "將拼圖塊拖曳到剪影上，點擊或觸碰即可旋轉。",
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

  function pieceCenter(piece) {
    return piece.center;
  }

  function rotatedBounds(piece, x = piece.x, y = piece.y) {
    const { x: cx, y: cy } = pieceCenter(piece);
    const cos = Math.abs(Math.cos(piece.rotation));
    const sin = Math.abs(Math.sin(piece.rotation));

    // The unrotated bounds are centered on the centroid pivot.
    const halfW = Math.max(
      cx - piece.bounds.left,
      piece.bounds.right - cx
    );
    const halfH = Math.max(
      cy - piece.bounds.top,
      piece.bounds.bottom - cy
    );

    const halfRotatedW = cos * halfW + sin * halfH;
    const halfRotatedH = sin * halfW + cos * halfH;

    return {
      left: x + cx - halfRotatedW,
      top: y + cy - halfRotatedH,
      right: x + cx + halfRotatedW,
      bottom: y + cy + halfRotatedH
    };
  }

  function keepOnScreen(piece) {
    const b = rotatedBounds(piece);

    const dx = Math.max(-b.left, Math.min(0, worldW - b.right));
    const dy = Math.max(-b.top, Math.min(0, worldH - b.bottom));

    piece.x += dx;
    piece.y += dy;
  }

  function overlaps(a, b) {
    return a.left < b.right + GAP &&
      a.right + GAP > b.left &&
      a.top < b.bottom + GAP &&
      a.bottom + GAP > b.top;
  }
  
  function darkenHex(color, amount = 0.35) {
    const hex = color.replace("#", "");
    if (!/^[0-9a-f]{6}$/i.test(hex)) return color;
  
    const channels = [0, 2, 4].map(i =>
      Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - amount))
    );
  
    return `rgb(${channels[0]} ${channels[1]} ${channels[2]})`;
  }

  function draw() {
    ctx.clearRect(0, 0, worldW, worldH);
    if (!pieces.length) return;
  
    // Keep the silhouette drawing unchanged.
    ctx.save();
    ctx.translate(targetX, targetY);
  
    const silhouette = new Path2D();
    for (const piece of pieces) {
      silhouette.addPath(piece.path);
    }
  
    ctx.shadowColor = "rgb(51 51 51 / 25%)";
    ctx.shadowBlur = 6;
    ctx.fillStyle = "#333333";
    ctx.strokeStyle = "#333333";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
  
    ctx.fill(silhouette);
    ctx.stroke(silhouette);
    ctx.restore();
  
    // Draw each piece in its original painted color, with wood-toy detailing.
    for (const piece of pieces) {
      const { x: cx, y: cy } = pieceCenter(piece);
  
      ctx.save();
      ctx.translate(piece.x + cx, piece.y + cy);
      ctx.rotate(piece.rotation);
      ctx.translate(-cx, -cy);
  
      // Raised shadow.
      ctx.save();
      ctx.shadowColor = "rgb(0 0 0 / 55%)";
      ctx.shadowBlur = 1;
      ctx.shadowOffsetX = 0.5;
      ctx.shadowOffsetY = 1;
      ctx.fillStyle = piece.color;
      ctx.fill(piece.path);
      ctx.restore();
  
      // Restrict surface details to the piece itself.
      ctx.save();
      ctx.clip(piece.path);
  
      // Substantial painted-surface shading, without replacing the piece color.
      const shading = ctx.createLinearGradient(0, 0, 0, worldH);
      shading.addColorStop(0, "rgb(255 255 255 / 35%)");
      shading.addColorStop(0.18, "rgb(255 255 255 / 12%)");
      shading.addColorStop(0.55, "rgb(255 255 255 / 0%)");
      shading.addColorStop(1, "rgb(35 18 5 / 28%)");
      ctx.fillStyle = shading;
      ctx.fillRect(-worldW, -worldH, worldW * 3, worldH * 3);
  
      // Visible fine grain, clipped inside the piece.
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = "#fff3d6";
      ctx.lineWidth = 1;
  
      for (let y = -worldH; y < worldH * 2; y += 5) {
        ctx.beginPath();
        ctx.moveTo(-worldW, y);
        ctx.lineTo(worldW * 2, y + 2);
        ctx.stroke();
      }  
      ctx.restore();
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
    const { x: cx, y: cy } = pieceCenter(piece);

    // Convert the pointer into the piece's unrotated local coordinates.
    const dx = x - (piece.x + cx);
    const dy = y - (piece.y + cy);
    const cos = Math.cos(-piece.rotation);
    const sin = Math.sin(-piece.rotation);
    const localX = cx + dx * cos - dy * sin;
    const localY = cy + dx * sin + dy * cos;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const hit = ctx.isPointInPath(piece.path, localX, localY);
    ctx.restore();
    return hit;
  }

  function rotatePiece(piece, direction) {
    piece.rotation =
      (piece.rotation + direction * ROTATION_STEP + Math.PI * 2) %
      (Math.PI * 2);
  
    draw();
    checkCompletion();
  }
  
  function checkCompletion() { 
    if (!pieces.length || !shapeW || !shapeH) return;
  
    const testCanvas = document.createElement("canvas");
    testCanvas.width = canvas.width;
    testCanvas.height = canvas.height;
  
    const testCtx = testCanvas.getContext("2d", {
      willReadFrequently: true
    });
  
    const dpr = window.devicePixelRatio || 1;
    testCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  
    // Draw the target silhouette.
    const silhouette = new Path2D();
    for (const piece of pieces) silhouette.addPath(piece.path);
  
    testCtx.save();
    testCtx.translate(targetX, targetY);
    testCtx.fillStyle = "#000";
    testCtx.fill(silhouette);
    testCtx.restore();
  
    const target = testCtx.getImageData(
      0, 0, testCanvas.width, testCanvas.height
    ).data;
  
    // Draw all placed pieces as one combined mask.
    testCtx.clearRect(0, 0, worldW, worldH);
  
    for (const piece of pieces) {
      const { x: cx, y: cy } = piece.center;
  
      testCtx.save();
      testCtx.translate(piece.x + cx, piece.y + cy);
      testCtx.rotate(piece.rotation);
      testCtx.translate(-cx, -cy);
      testCtx.fillStyle = "#000";
      testCtx.fill(piece.path);
      testCtx.restore();
    }
  
    const placed = testCtx.getImageData(
      0, 0, testCanvas.width, testCanvas.height
    ).data;
  
    let silhouettePixels = 0;
    let coveredPixels = 0;
  
    for (let i = 3; i < target.length; i += 4) {
      if (target[i] > 32) {
        silhouettePixels++;
        if (placed[i] > 32) coveredPixels++;
      }
    }
  
    const percent = silhouettePixels
      ? (coveredPixels / silhouettePixels) * 100
      : 0;
  
    if (percent >= 95) {
      setMessage("complete", TEXT[language].complete);
    }  
  }

  canvas.addEventListener("contextmenu", event => {
    event.preventDefault();
  });

  canvas.addEventListener("pointerdown", event => {
    const p = pointerWorld(event);

    for (let i = pieces.length - 1; i >= 0; i--) {
      const piece = pieces[i];
      if (!contains(piece, p.x, p.y)) continue;

      // Right-click rotates counterclockwise.
      if (event.button === 2) {
        rotatePiece(piece, -1);
        event.preventDefault();
        return;
      }

      dragging = {
        piece,
        pointerId: event.pointerId,
        dx: p.x - piece.x,
        dy: p.y - piece.y,
        startX: p.x,
        startY: p.y,
        moved: false
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
  
    if (Math.hypot(p.x - dragging.startX, p.y - dragging.startY) > 5) {
      dragging.moved = true;
    }
  
    dragging.piece.x = p.x - dragging.dx;
    dragging.piece.y = p.y - dragging.dy;
  
    // Don't clamp to the canvas; that can stop a piece reaching the
    // bottom edge of the silhouette.
    draw();
  });
  
  canvas.addEventListener("pointerup", event => {
    if (!dragging || event.pointerId !== dragging.pointerId) return;
  
  const { piece, moved } = dragging;
  dragging = null;
  
  if (!moved) {
    rotatePiece(piece, 1);
    return;
  }
  
  // Snap correctly rotated pieces to the silhouette when they're close.
  const snapDistance = 20;
  const fullTurn = Math.PI * 2;
  const angle = ((piece.rotation % fullTurn) + fullTurn) % fullTurn;
  const rotationError = Math.min(angle, fullTurn - angle);
  
  if (
    Math.hypot(piece.x - targetX, piece.y - targetY) <= snapDistance &&
    rotationError < 0.01
  ) {
    piece.x = targetX;
    piece.y = targetY;
  }
  
  draw();
  checkCompletion();
    });

  canvas.addEventListener("pointercancel", event => {
    if (dragging && event.pointerId === dragging.pointerId) {
      dragging = null;
      draw();
    }
  });

  function getTranslate(element) {
    const transform = element.getAttribute("transform") || "";
    const match = transform.match(
      /translate\(\s*([-+.\d]+)(?:[\s,]+([-+.\d]+))?\s*\)/
    );

    return match
      ? { x: Number(match[1]), y: Number(match[2] || 0) }
      : { x: 0, y: 0 };
  }

  function polygonCentroid(svgPath, length) {
    // Sample the path outline. This is exact for straight-sided polygons
    // when samples land on vertices, and approximates curved outlines.
    const samples = Math.max(64, Math.ceil(length / 2));
    const points = [];

    for (let i = 0; i < samples; i++) {
      points.push(svgPath.getPointAtLength(length * i / samples));
    }

    let twiceArea = 0;
    let cx = 0;
    let cy = 0;

    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      const cross = a.x * b.y - b.x * a.y;

      twiceArea += cross;
      cx += (a.x + b.x) * cross;
      cy += (a.y + b.y) * cross;
    }

    if (Math.abs(twiceArea) < 1e-10) {
      throw new Error("Could not calculate the centroid of an SVG path.");
    }

    return {
      x: cx / (3 * twiceArea),
      y: cy / (3 * twiceArea)
    };
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
      let found = false;

      for (let attempt = 0; attempt < 6000; attempt++) {
        const bounds = rotatedBounds(piece);
        const minX = -bounds.left + piece.x;
        const maxX = Math.max(minX, worldW - bounds.right + piece.x);
        const minY = -bounds.top + piece.y;
        const maxY = Math.max(minY, worldH - bounds.bottom + piece.y);

        piece.x = minX + Math.random() * (maxX - minX);
        piece.y = minY + Math.random() * (maxY - minY);

        const rect = rotatedBounds(piece);

        if (!placed.some(other => overlaps(rect, other))) {
          placed.push(rect);
          found = true;
          break;
        }
      }

      if (!found) {
        keepOnScreen(piece);
        placed.push(rotatedBounds(piece));
      }
    }

    draw();
  }

function loadSymbol(symbol) {
  const paths = [...symbol.querySelectorAll("path")];

  if (!paths.length) {
    throw new Error(`Symbol ${symbol.id} has no paths.`);
  }

  // Read the full transform on the group's <g>, including its matrix.
  const group = symbol.querySelector("g");
  const svgMatrix =
    group && group.transform.baseVal.consolidate()
      ? group.transform.baseVal.consolidate().matrix
      : { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

  // Apply an SVG matrix without relying on transformPoint().
  function transformPoint(x, y) {
    return {
      x: svgMatrix.a * x + svgMatrix.c * y + svgMatrix.e,
      y: svgMatrix.b * x + svgMatrix.d * y + svgMatrix.f
    };
  }

  const temporarySvg = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  temporarySvg.style.cssText =
    "position:absolute;left:-10000px;top:-10000px;visibility:hidden";
  document.body.appendChild(temporarySvg);

  let sourcePieces;

  try {
    sourcePieces = paths.map((element, index) => {
      const d = element.getAttribute("d");
      const measurementPath = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );

      measurementPath.setAttribute("d", d);
      temporarySvg.appendChild(measurementPath);

      const box = measurementPath.getBBox();
      const rawCenter = polygonCentroid(
        measurementPath,
        measurementPath.getTotalLength()
      );

      measurementPath.remove();

      const corners = [
        transformPoint(box.x, box.y),
        transformPoint(box.x + box.width, box.y),
        transformPoint(box.x, box.y + box.height),
        transformPoint(box.x + box.width, box.y + box.height)
      ];

      const center = transformPoint(rawCenter.x, rawCenter.y);

      return {
        d,
        color:
          element.getAttribute("fill") ||
          COLORS[index % COLORS.length],
        left: Math.min(...corners.map(point => point.x)),
        top: Math.min(...corners.map(point => point.y)),
        right: Math.max(...corners.map(point => point.x)),
        bottom: Math.max(...corners.map(point => point.y)),
        center
      };
    });
  } finally {
    temporarySvg.remove();
  }

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

  const { a, b, c, d, e, f } = svgMatrix;

  pieces = sourcePieces.map(source => {
    const path = new Path2D();

    // Combine the SVG group's transform with the game's scale and offset.
    const pathTransform = mirrored
      ? new DOMMatrix([
          -fitScale * a,
          fitScale * b,
          -fitScale * c,
          fitScale * d,
          fitScale * (maxX - e),
          fitScale * (f - minY)
        ])
      : new DOMMatrix([
          fitScale * a,
          fitScale * b,
          fitScale * c,
          fitScale * d,
          fitScale * (e - minX),
          fitScale * (f - minY)
        ]);

    path.addPath(new Path2D(source.d), pathTransform);

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

    const center = mirrored
      ? {
          x: (maxX - source.center.x) * fitScale,
          y: (source.center.y - minY) * fitScale
        }
      : {
          x: (source.center.x - minX) * fitScale,
          y: (source.center.y - minY) * fitScale
        };

    return {
      path,
      color: source.color,
      x: 0,
      y: 0,
      bounds,
      center,
      rotation: Math.floor(Math.random() * 8) * ROTATION_STEP
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
