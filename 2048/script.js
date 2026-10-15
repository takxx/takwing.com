(() => {
  const translations = {
    en: {
      title: "How to play",
      intro: "<p>Combine matching numbered tiles to reach <b>2048</b>. Each move slides all tiles in one direction; matching tiles merge once per move. A new tile appears after each valid move. Reach 2048 to win—you can keep playing afterwards.</p><ul><li>Use the arrow keys or WASD.</li><li>Swipe across the board on a touchscreen.</li><li>The game ends when no moves remain.</li></ul>",
      language: "Language",
      start: "Start game",
      score: "Score",
      best: "Best",
      newGame: "New game",
      won: "You reached 2048! You can keep playing.",
      over: "No moves left. Start a new game?",
      help: "Move with arrow keys or WASD, or swipe the board.",
      directions: { up:"Up", down:"Down", left:"Left", right:"Right" }
    },
    es: {
      title: "Cómo jugar",
      intro: "<p>Combina fichas con el mismo número para llegar a <b>2048</b>. Cada movimiento desliza todas las fichas en una dirección; las fichas iguales se fusionan una sola vez por movimiento. Después de cada movimiento válido aparece una ficha nueva. Llega a 2048 para ganar; puedes seguir jugando después.</p><ul><li>Usa las flechas o WASD.</li><li>Desliza el dedo sobre el tablero en una pantalla táctil.</li><li>La partida termina cuando no quedan movimientos.</li></ul>",
      language: "Idioma",
      start: "Empezar",
      score: "Puntuación",
      best: "Récord",
      newGame: "Nueva partida",
      won: "¡Has llegado a 2048! Puedes seguir jugando.",
      over: "No quedan movimientos. ¿Empezar otra partida?",
      help: "Usa las flechas o WASD, o desliza sobre el tablero.",
      directions: { up:"Arriba", down:"Abajo", left:"Izquierda", right:"Derecha" }
    },
    zh: {
      title: "遊戲玩法",
      intro: "<p>將相同數字的方塊合併，目標係砌出 <b>2048</b>。每次移動，所有方塊會向同一方向滑動；相同數字每回合只會合併一次。每次有效移動後會出現一個新方塊。砌出 2048 就算贏，之後仍可繼續玩。</p><ul><li>用方向鍵或 WASD 操作。</li><li>喺觸控螢幕上掃動棋盤。</li><li>冇剩餘移動時遊戲結束。</li></ul>",
      language: "語言",
      start: "開始遊戲",
      score: "分數",
      best: "最高分",
      newGame: "新遊戲",
      won: "你砌出 2048 啦！可以繼續玩。",
      over: "冇剩餘移動。要重新開始嗎？",
      help: "用方向鍵或 WASD、或者掃動棋盤。",
      directions: { up:"上", down:"下", left:"左", right:"右" }
    }
  };

  const validLang = value => ["en", "es", "zh"].includes(value) ? value : null;
  const params = new URLSearchParams(location.search);
  const queryLang = validLang(params.get("lang"));
  let lang = queryLang || validLang(localStorage.getItem("2048-lang"));
  if (!lang) {
    const prefs = navigator.languages || [navigator.language || "en"];
    const match = prefs.map(x => x.toLowerCase()).find(x =>
      x.startsWith("zh") || x.startsWith("es") || x.startsWith("en")
    );
    lang = match ? (match.startsWith("zh") ? "zh" : match.startsWith("es") ? "es" : "en") : "en";
  }
  localStorage.setItem("2048-lang", lang);

  const $ = id => document.getElementById(id);
  const intro = $("intro"), game = $("game"), boardEl = $("board");
  let t = translations[lang], grid, score = 0, won = false, ended = false;

  document.documentElement.lang = lang === "zh" ? "zh-HK" : lang === "es" ? "es-ES" : "en-GB";

  function renderLanguage() {
    t = translations[lang];
    $("intro-title").textContent = t.title;
    $("intro-copy").innerHTML = t.intro;
    $("language-label").textContent = t.language;
    $("language").value = lang;
    $("start").textContent = t.start;
    $("score-label").textContent = t.score;
    $("best-label").textContent = t.best;
    $("new-game").textContent = t.newGame;
    $("game-help").textContent = t.help;
    document.documentElement.lang = lang === "zh" ? "zh-HK" : lang === "es" ? "es-ES" : "en-GB";
  }

  $("language").addEventListener("change", e => {
    lang = e.target.value;
    localStorage.setItem("2048-lang", lang);
    renderLanguage();
  });

  $("start").addEventListener("click", () => {
    intro.classList.remove("active");
    game.classList.add("active");
    reset();
    boardEl.focus?.();
  });

  $("new-game").addEventListener("click", reset);

  function bestScore() {
    return Number(localStorage.getItem("2048-best") || 0);
  }

  function reset() {
    grid = Array.from({length:4}, () => Array(4).fill(0));
    score = 0; won = false; ended = false;
    addTile(); addTile();
    draw();
    $("status").textContent = "";
  }

  function addTile() {
    const empty = [];
    grid.forEach((row,r) => row.forEach((v,c) => { if (!v) empty.push([r,c]); }));
    if (!empty.length) return;
    const [r,c] = empty[Math.floor(Math.random() * empty.length)];
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

const colors = {
  2:    ["#6f9b9a", "#fff0d2"], // muted teal
  4:    ["#789b63", "#fff0d2"], // leafy green
  8:    ["#bd7358", "#fff0d2"], // warm red
  16:   ["#56819a", "#fff0d2"], // dusty blue
  32:   ["#a95e56", "#fff0d2"], // brick red
  64:   ["#82904f", "#fff0d2"], // olive green
  128:  ["#587d70", "#fff0d2"], // forest teal
  256:  ["#b47c47", "#fff0d2"], // ochre
  512:  ["#6c7390", "#fff0d2"], // slate blue
  1024: ["#a85e45", "#fff0d2"], // terracotta
  2048: ["#c29a4b", "#3e2915"]  // golden wood
};

  function draw() {
    boardEl.replaceChildren();
    grid.forEach((row,r) => row.forEach((value,c) => {
      const cell = document.createElement("div");
      cell.className = "cell" + (value ? " filled" : "");
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-label", value ? String(value) : "empty");
      if (value) {
        const [bg,fg] = colors[value] || ["#374151","#fff"];
        cell.style.setProperty("--fill", bg);
        cell.style.setProperty("--tile-text", fg);
        cell.textContent = value;
        if (value >= 1024) cell.style.fontSize = "clamp(16px,5vw,34px)";
      }
      boardEl.appendChild(cell);
    }));
    $("score").textContent = score;
    const best = Math.max(bestScore(), score);
    localStorage.setItem("2048-best", best);
    $("best").textContent = best;
  }

  function move(direction) {
    if (ended) return;
    const before = grid.map(row => row.slice());
    let gained = 0;
    for (let i=0; i<4; i++) {
      let line = [];
      for (let j=0; j<4; j++) {
        const r = direction === "up" ? j : direction === "down" ? 3-j : i;
        const c = direction === "left" ? j : direction === "right" ? 3-j : i;
        line.push(grid[r][c]);
      }
      const compact = line.filter(Boolean), out = [];
      for (let j=0; j<compact.length; j++) {
        if (compact[j] === compact[j+1]) {
          const merged = compact[j] * 2;
          out.push(merged); gained += merged; j++;
        } else out.push(compact[j]);
      }
      while (out.length < 4) out.push(0);
      for (let j=0; j<4; j++) {
        const r = direction === "up" ? j : direction === "down" ? 3-j : i;
        const c = direction === "left" ? j : direction === "right" ? 3-j : i;
        grid[r][c] = out[j];
      }
    }

    if (grid.some((row,r) => row.some((v,c) => v !== before[r][c]))) {
      score += gained;
      addTile();
      draw();
      if (!won && grid.some(row => row.includes(2048))) {
        won = true;
        $("status").textContent = t.won;
      }
      if (!hasMoves()) {
        ended = true;
        $("status").textContent = t.over;
      }
    }
  }

  function hasMoves() {
    for (let r=0; r<4; r++) for (let c=0; c<4; c++) {
      if (!grid[r][c]) return true;
      if (c < 3 && grid[r][c] === grid[r][c+1]) return true;
      if (r < 3 && grid[r][c] === grid[r+1][c]) return true;
    }
    return false;
  }

  document.addEventListener("keydown", e => {
    const keyMap = {
      ArrowUp:"up", w:"up", W:"up",
      ArrowDown:"down", s:"down", S:"down",
      ArrowLeft:"left", a:"left", A:"left",
      ArrowRight:"right", d:"right", D:"right"
    };
    const direction = keyMap[e.key];
    if (direction && game.classList.contains("active")) {
      e.preventDefault();
      move(direction);
    }
  });

  let touchStart = null;
  boardEl.addEventListener("pointerdown", e => {
    touchStart = [e.clientX, e.clientY];
  });
  boardEl.addEventListener("pointerup", e => {
    if (!touchStart) return;
    const dx = e.clientX - touchStart[0], dy = e.clientY - touchStart[1];
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 25) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
  });
  boardEl.addEventListener("pointercancel", () => { touchStart = null; });

  renderLanguage();
})();
