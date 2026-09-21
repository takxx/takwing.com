const container = document.getElementById('game-container');
const board = document.getElementById('maze-board');
const ballElement = document.getElementById('ball');
const instructionModal = document.getElementById('instruction-modal');
const endModal = document.getElementById('end-modal');
const endTitle = document.getElementById('end-title');
const endMessage = document.getElementById('end-message');

const GRID_SIZE = 15; 
let boardWidth, boardHeight, cellSize;

let ball = { x: 0, y: 0, vx: 0, vy: 0, radius: 0 };
let tilt = { x: 0, y: 0 };
let walls = [];
let holes = [];
let goal = { x: 0, y: 0, radius: 0 };
let isGameActive = false;
let animationFrameId;

function initDimensions() {
    boardWidth = board.clientWidth;
    boardHeight = board.clientHeight;
    cellSize = boardWidth / GRID_SIZE;
    
    ball.radius = (cellSize * 0.35); 
    ballElement.style.width = `${ball.radius * 2}px`;
    ballElement.style.height = `${ball.radius * 2}px`;
}

function generateMaze() {
    let grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(1));
    let wallsList = [];

    const startX = 1, startY = 1;
    grid[startY][startX] = 0;

    if (startX > 1) wallsList.push([startX - 1, startY, startX - 2, startY]);
    if (startX < GRID_SIZE - 2) wallsList.push([startX + 1, startY, startX + 2, startY]);
    if (startY > 1) wallsList.push([startX, startY - 1, startX, startY - 2]);
    if (startY < GRID_SIZE - 2) wallsList.push([startX, startY + 1, startX, startY + 2]);

    while (wallsList.length > 0) {
        const randomIndex = Math.floor(Math.random() * wallsList.length);
        const [wx, wy, px, py] = wallsList[randomIndex];
        wallsList.splice(randomIndex, 1);

        if (grid[py][px] === 1) {
            grid[wy][wx] = 0;
            grid[py][px] = 0;

            if (px > 1 && grid[py][px - 2] === 1) wallsList.push([px - 1, py, px - 2, py]);
            if (px < GRID_SIZE - 2 && grid[py][px + 2] === 1) wallsList.push([px + 1, py, px + 2, py]);
            if (py > 1 && grid[py - 2][px] === 1) wallsList.push([px, py - 1, px, py - 2]);
            if (py < GRID_SIZE - 2 && grid[py + 2][px] === 1) wallsList.push([px, py + 1, px, py + 2]);
        }
    }

    // Dissolve interior walls to maintain open room design
    for (let y = 1; y < GRID_SIZE - 1; y++) {
        for (let x = 1; x < GRID_SIZE - 1; x++) {
            if (grid[y][x] === 1 && Math.random() < 0.45) {
                grid[y][x] = 0; 
            }
        }
    }

    ball.x = cellSize * 1.5;
    ball.y = cellSize * 1.5;

    const goalX = GRID_SIZE - 2;
    const goalY = GRID_SIZE - 2;
    goal = {
        x: (goalX + 0.5) * cellSize,
        y: (goalY + 0.5) * cellSize,
        radius: cellSize * 0.38
    };

    const solutionPath = solveMaze(grid, 1, 1, goalX, goalY);
    renderMapObjects(grid, goalX, goalY, solutionPath);
}

function solveMaze(grid, startX, startY, endX, endY) {
    const queue = [[startX, startY]];
    const visited = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(false));
    const parent = {};

    visited[startY][startX] = true;
    
    // FIXED TYPO: Properly fully declared direction coordinates array matrix structure
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

    while (queue.length > 0) {
        const [cx, cy] = queue.shift();

        if (cx === endX && cy === endY) {
            const path = new Set();
            let key = `${endX},${endY}`;
            while (key) {
                path.add(key);
                key = parent[key];
            }
            return path;
        }

        for (const [dx, dy] of dirs) {
            const nx = cx + dx;
            const ny = cy + dy;

            if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
                if (grid[ny][nx] === 0 && !visited[ny][nx]) {
                    visited[ny][nx] = true;
                    parent[`${nx},${ny}`] = `${cx},${cy}`;
                    queue.push([nx, ny]);
                }
            }
        }
    }
    return new Set();
}

function renderMapObjects(grid, goalX, goalY, solutionPath) {
    // Clear out any old game elements before rebuilding
    const oldWalls = board.querySelectorAll('.wall');
    const oldHoles = board.querySelectorAll('.hole');
    const oldZones = board.querySelectorAll('.endpoint');
    oldWalls.forEach(el => el.remove());
    oldHoles.forEach(el => el.remove());
    oldZones.forEach(el => el.remove());
    
    walls = [];
    holes = [];

    createZone(1, 1, 'START', 'start-zone');
    createZone(goalX, goalY, 'GOAL', 'goal-zone');

    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            const isOuterEdge = (y === 0 || y === GRID_SIZE - 1 || x === 0 || x === GRID_SIZE - 1);
            
            if (grid[y][x] === 1 || isOuterEdge) {
                const wallEl = document.createElement('div');
                wallEl.className = 'wall';
                wallEl.style.left = `${x * cellSize}px`;
                wallEl.style.top = `${y * cellSize}px`;
                wallEl.style.width = `${cellSize + 0.5}px`; 
                wallEl.style.height = `${cellSize + 0.5}px`;
                board.appendChild(wallEl);
                
                walls.push({
                    left: x * cellSize,
                    right: (x + 1) * cellSize,
                    top: y * cellSize,
                    bottom: (y + 1) * cellSize
                });
            } else {
                const isOnWinningPath = solutionPath.has(`${x},${y}`);
                let spawnChance = isOnWinningPath ? 0.04 : 0.32; 

                if ((x !== 1 || y !== 1) && (x !== goalX || y !== goalY) && Math.random() < spawnChance) {
                    const holeRadius = cellSize * 0.35; 
                    const hx = (x + 0.5) * cellSize;
                    const hy = (y + 0.5) * cellSize;

                    const holeEl = document.createElement('div');
                    holeEl.className = 'hole';
                    holeEl.style.width = `${holeRadius * 2}px`;
                    holeEl.style.height = `${holeRadius * 2}px`;
                    holeEl.style.left = `${hx - holeRadius}px`;
                    holeEl.style.top = `${hy - holeRadius}px`;
                    board.appendChild(holeEl);

                    holes.push({ x: hx, y: hy, radius: holeRadius });
                }
            }
        }
    }
}

function createZone(x, y, label, className) {
    const el = document.createElement('div');
    el.className = `endpoint ${className}`;
    el.style.width = `${cellSize}px`;
    el.style.height = `${cellSize}px`;
    el.style.left = `${x * cellSize}px`;
    el.style.top = `${y * cellSize}px`;
    el.innerText = label; 
    board.appendChild(el);
}

// --- Interaction Listeners ---
window.addEventListener('mousemove', (e) => {
    if (!isGameActive) return;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    tilt.x = (e.clientX - cx) / cx;
    tilt.y = (e.clientY - cy) / cy;
    applyVisualTilt();
});

function handleOrientation(e) {
    if (!isGameActive) return;
    tilt.x = Math.min(Math.max(e.gamma / 20, -1), 1);
    tilt.y = Math.min(Math.max(e.beta / 20, -1), 1);
    applyVisualTilt();
}

function applyVisualTilt() {
    container.style.transform = `rotateX(${-tilt.y * 14}deg) rotateY(${tilt.x * 14}deg)`;
}

// --- Core Physics Engine ---
function updatePhysics() {
    if (!isGameActive) return;

    ball.vx += tilt.x * 0.58;
    ball.vy += tilt.y * 0.58;

    ball.vx *= 0.96; 
    ball.vy *= 0.96;

    ball.x += ball.vx;
    checkWallCollision('x');

    ball.y += ball.vy;
    checkWallCollision('y');

    ballElement.style.left = `${ball.x - ball.radius}px`;
    ballElement.style.top = `${ball.y - ball.radius}px`;

    const shadowX = 6 + (tilt.x * 12);
    const shadowY = 10 + (tilt.y * 12);
    const blur = 14 - (Math.abs(tilt.x) + Math.abs(tilt.y)) * 4;
    ballElement.style.boxShadow = `${shadowX}px ${shadowY}px ${blur}px rgba(0,0,0,0.55), inset -3px -3px 7px rgba(0,0,0,0.6), inset 2px 2px 4px rgba(255,255,255,0.4)`;

    checkGameTriggers();

    animationFrameId = requestAnimationFrame(updatePhysics);
}

function checkWallCollision(axis) {
    for (let wall of walls) {
        if (ball.x + ball.radius > wall.left && ball.x - ball.radius < wall.right &&
            ball.y + ball.radius > wall.top && ball.y - ball.radius < wall.bottom) {
            
            if (axis === 'x') {
                ball.x -= ball.vx;
                ball.vx *= -0.40; 
            } else {
                ball.y -= ball.vy;
                ball.vy *= -0.40;
            }
        }
    }
}

function checkGameTriggers() {
    for (let hole of holes) {
        const dx = ball.x - hole.x;
        const dy = ball.y - hole.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < hole.radius + ball.radius * 0.3) {
            endGame(false, "You rolled into a pit trap!");
            return;
        }
    }

    const gdx = ball.x - goal.x;
    const gdy = ball.y - goal.y;
    const realDist = Math.sqrt(gdx * gdx + gdy * gdy);
    if (realDist < goal.radius * 1.1) {
        endGame(true, "Superb! You navigated the flats flawlessly.");
    }
}

function requestGyroscopePermissions() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    window.addEventListener('deviceorientation', handleOrientation);
                }
                startGame();
            })
            .catch(err => {
                console.error("Gyroscope authorization error:", err);
                startGame(); 
            });
    } else {
        window.addEventListener('deviceorientation', handleOrientation);
        startGame();
    }
}

function startGame() {instructionModal.classList.remove('active');initDimensions();generateMaze();isGameActive = true;updatePhysics();}function endGame(isWin, message) {isGameActive = false;cancelAnimationFrame(animationFrameId);endTitle.innerText = isWin ? "🎉 Victory!" : "💥 Defeat";endMessage.innerText = message;endModal.classList.add('active');}document.getElementById('start-btn').addEventListener('click', requestGyroscopePermissions);document.getElementById('reload-btn').addEventListener('click', () => location.reload());window.addEventListener('resize', () => {if (isGameActive) location.reload();});