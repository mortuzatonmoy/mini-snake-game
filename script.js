(() => {
  "use strict";

  const GRID = 20;               // cells per side
  const BASE_SPEED = 140;        // ms per step at level 1
  const MIN_SPEED = 55;          // fastest possible
  const SPEED_STEP = 10;         // ms faster per level
  const POINTS_PER_LEVEL = 5;    // foods per level

  const canvas = document.getElementById("board");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const levelEl = document.getElementById("level");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayText = document.getElementById("overlay-text");
  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const restartBtn = document.getElementById("restartBtn");

  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  let snake, prevSnake, dir, dirQueue, food, score, level, stepMs;
  let state = "idle"; // idle | running | paused | over
  let lastTime = 0, acc = 0;
  let best = 0;
  try { best = Number(localStorage.getItem("snakeBest")) || 0; } catch (_) {}
  bestEl.textContent = best;

  function reset() {
    const mid = Math.floor(GRID / 2);
    snake = [{ x: mid, y: mid }, { x: mid - 1, y: mid }, { x: mid - 2, y: mid }];
    prevSnake = snake.map((s) => ({ ...s }));
    dir = DIRS.right;
    dirQueue = [];
    score = 0;
    level = 1;
    stepMs = BASE_SPEED;
    acc = 0;
    placeFood();
    updateHud();
  }

  function placeFood() {
    const free = [];
    for (let x = 0; x < GRID; x++)
      for (let y = 0; y < GRID; y++)
        if (!snake.some((s) => s.x === x && s.y === y)) free.push({ x, y });
    food = free[Math.floor(Math.random() * free.length)] || null;
  }

  function updateHud() {
    scoreEl.textContent = score;
    levelEl.textContent = level;
    bestEl.textContent = best;
  }

  function queueDir(name) {
    const d = DIRS[name];
    if (!d) return;
    const last = dirQueue.length ? dirQueue[dirQueue.length - 1] : dir;
    // Ignore reversing and duplicate inputs
    if (d.x === -last.x && d.y === -last.y) return;
    if (d.x === last.x && d.y === last.y) return;
    if (dirQueue.length < 3) dirQueue.push(d);
    if (state === "idle") start();
  }

  function step() {
    if (dirQueue.length) dir = dirQueue.shift();
    prevSnake = snake.map((s) => ({ ...s }));

    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    const willEat = food && head.x === food.x && head.y === food.y;
    // Tail moves away this step unless we eat, so exclude it from collision
    const body = willEat ? snake : snake.slice(0, -1);

    if (
      head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID ||
      body.some((s) => s.x === head.x && s.y === head.y)
    ) {
      return gameOver();
    }

    snake.unshift(head);
    if (willEat) {
      score++;
      prevSnake.push({ ...prevSnake[prevSnake.length - 1] });
      const newLevel = 1 + Math.floor(score / POINTS_PER_LEVEL);
      if (newLevel !== level) {
        level = newLevel;
        stepMs = Math.max(MIN_SPEED, BASE_SPEED - (level - 1) * SPEED_STEP);
      }
      if (score > best) {
        best = score;
        try { localStorage.setItem("snakeBest", best); } catch (_) {}
      }
      placeFood();
      updateHud();
      if (!food) return gameOver(true);
    } else {
      snake.pop();
    }
  }

  // ---------- Rendering (interpolated for smooth movement) ----------
  function cellSize() { return canvas.width / GRID; }

  function draw(t) {
    const c = cellSize();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // grid
    ctx.fillStyle = "rgba(255,255,255,0.025)";
    for (let x = 0; x < GRID; x++)
      for (let y = 0; y < GRID; y++)
        if ((x + y) % 2 === 0) ctx.fillRect(x * c, y * c, c, c);

    // food
    if (food) {
      const pulse = 0.8 + 0.12 * Math.sin(performance.now() / 150);
      ctx.fillStyle = "#f43f5e";
      ctx.shadowColor = "#f43f5e";
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc((food.x + 0.5) * c, (food.y + 0.5) * c, (c / 2) * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // snake
    const n = snake.length;
    for (let i = n - 1; i >= 0; i--) {
      const cur = snake[i];
      const prev = prevSnake[i] || cur;
      const x = prev.x + (cur.x - prev.x) * t;
      const y = prev.y + (cur.y - prev.y) * t;
      const ratio = 1 - i / Math.max(n, 1);
      ctx.fillStyle = i === 0 ? "#4ade80" : `hsl(142, 70%, ${30 + ratio * 20}%)`;
      if (i === 0) { ctx.shadowColor = "#22c55e"; ctx.shadowBlur = 12; }
      roundRect(x * c + 1, y * c + 1, c - 2, c - 2, c * 0.3);
      ctx.shadowBlur = 0;
    }

    // eyes
    const h = snake[0], ph = prevSnake[0] || h;
    const hx = (ph.x + (h.x - ph.x) * t + 0.5) * c;
    const hy = (ph.y + (h.y - ph.y) * t + 0.5) * c;
    const ex = dir.y !== 0 ? c * 0.2 : 0, ey = dir.x !== 0 ? c * 0.2 : 0;
    ctx.fillStyle = "#04130a";
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(hx + dir.x * c * 0.15 + ex * s, hy + dir.y * c * 0.15 + ey * s, c * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.fill();
  }

  function loop(now) {
    const dt = Math.min(now - lastTime, 250);
    lastTime = now;
    if (state === "running") {
      acc += dt;
      while (acc >= stepMs && state === "running") {
        acc -= stepMs;
        step();
      }
    }
    draw(state === "running" ? Math.min(acc / stepMs, 1) : 1);
    requestAnimationFrame(loop);
  }

  // ---------- State control ----------
  function showOverlay(title, text, cls = "") {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    overlay.className = "overlay " + cls;
  }
  function hideOverlay() { overlay.className = "overlay hidden"; }

  function start() {
    if (state === "running") return;
    if (state === "over") reset();
    state = "running";
    acc = 0;
    hideOverlay();
    startBtn.disabled = true;
    startBtn.textContent = "Start";
    pauseBtn.disabled = false;
    pauseBtn.textContent = "Pause";
  }

  function togglePause() {
    if (state === "running") {
      state = "paused";
      pauseBtn.textContent = "Resume";
      showOverlay("Paused", "Press Space or Resume to continue");
    } else if (state === "paused") {
      state = "running";
      pauseBtn.textContent = "Pause";
      hideOverlay();
    } else if (state === "idle" || state === "over") {
      start();
    }
  }

  function restart() {
    reset();
    state = "idle";
    start();
  }

  function gameOver(won = false) {
    state = "over";
    prevSnake = snake.map((s) => ({ ...s }));
    startBtn.disabled = false;
    startBtn.textContent = "Play Again";
    pauseBtn.disabled = true;
    showOverlay(
      won ? "You Win! 🎉" : "Game Over",
      `Score: ${score} · Best: ${best} — press Enter to restart`,
      "gameover"
    );
  }

  // ---------- Input ----------
  const KEYMAP = {
    ArrowUp: "up", w: "up", W: "up",
    ArrowDown: "down", s: "down", S: "down",
    ArrowLeft: "left", a: "left", A: "left",
    ArrowRight: "right", d: "right", D: "right",
  };

  document.addEventListener("keydown", (e) => {
    if (KEYMAP[e.key]) {
      e.preventDefault();
      if (state === "running" || state === "idle") queueDir(KEYMAP[e.key]);
    } else if (e.key === " ") {
      e.preventDefault();
      togglePause();
    } else if (e.key === "Enter") {
      e.preventDefault();
      restart();
    }
  });

  startBtn.addEventListener("click", start);
  pauseBtn.addEventListener("click", togglePause);
  restartBtn.addEventListener("click", restart);

  document.querySelectorAll(".pad").forEach((b) =>
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (state === "running" || state === "idle") queueDir(b.dataset.dir);
    })
  );

  // Swipe support
  let touchStart = null;
  canvas.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }, { passive: true });
  canvas.addEventListener("touchend", (e) => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x, dy = t.clientY - touchStart.y;
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    const name = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
    if (state === "running" || state === "idle") queueDir(name);
  });

  reset();
  requestAnimationFrame((t) => { lastTime = t; loop(t); });
})();
