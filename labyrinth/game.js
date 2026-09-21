const container = document.getElementById('game-container');
const board = document.getElementById('maze-board');
const ballElement = document.getElementById('ball');

const instructionModal =
    document.getElementById('instruction-modal');

const endModal =
    document.getElementById('end-modal');

const endTitle =
    document.getElementById('end-title');

const endMessage =
    document.getElementById('end-message');

const startButton =
    document.getElementById('start-btn');

const reloadButton =
    document.getElementById('reload-btn');

const GRID_SIZE = 15;

let boardWidth = 0;
let boardHeight = 0;
let cellSize = 0;

const ball = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: 0
};

const tilt = {
    x: 0,
    y: 0
};

const orientationBase = {
    beta: 0,
    gamma: 0,
    calibrated: false
};

let walls = [];
let holes = [];
let checkpoints = [];

let goal = {
    x: 0,
    y: 0,
    radius: 0
};

let nextCheckpoint = 0;
let isGameActive = false;
let animationFrameId = null;


/* =========================
   Dimensions
========================= */

function initDimensions() {
    boardWidth = board.clientWidth;
    boardHeight = board.clientHeight;
    cellSize = boardWidth / GRID_SIZE;

    ball.radius = cellSize * 0.30;

    ballElement.style.width =
        `${ball.radius * 2}px`;

    ballElement.style.height =
        `${ball.radius * 2}px`;
}


/* =========================
   Maze generation
========================= */

function generateMaze() {
    const startX = 1;
    const startY = 1;
    const goalX = GRID_SIZE - 2;
    const goalY = GRID_SIZE - 2;

    const grid = Array.from(
        { length: GRID_SIZE },
        () => Array(GRID_SIZE).fill(0)
    );

    const guaranteedPath = new Set();

    function addPathCell(x, y) {
        if (
            x >= 1 &&
            x < GRID_SIZE - 1 &&
            y >= 1 &&
            y < GRID_SIZE - 1
        ) {
            guaranteedPath.add(`${x},${y}`);
        }
    }

    function addPathSegment(x1, y1, x2, y2) {
        let x = x1;
        let y = y1;

        addPathCell(x, y);

        if (Math.random() < 0.5) {
            while (x !== x2) {
                x += Math.sign(x2 - x);
                addPathCell(x, y);
            }

            while (y !== y2) {
                y += Math.sign(y2 - y);
                addPathCell(x, y);
            }
        } else {
            while (y !== y2) {
                y += Math.sign(y2 - y);
                addPathCell(x, y);
            }

            while (x !== x2) {
                x += Math.sign(x2 - x);
                addPathCell(x, y);
            }
        }
    }

    const checkpointCells = [
        {
            x: 3 + Math.floor(Math.random() * 2),
            y: 3 + Math.floor(Math.random() * 2)
        },
        {
            x: 8 + Math.floor(Math.random() * 2),
            y: 7 + Math.floor(Math.random() * 2)
        }
    ];

    const waypoints = [
        { x: startX, y: startY },
        checkpointCells[0],
        checkpointCells[1],
        { x: goalX, y: goalY }
    ];

    for (let i = 0; i < waypoints.length - 1; i++) {
        addPathSegment(
            waypoints[i].x,
            waypoints[i].y,
            waypoints[i + 1].x,
            waypoints[i + 1].y
        );
    }

    const obstacleChance = 0.20;

    for (let y = 1; y < GRID_SIZE - 1; y++) {
        for (let x = 1; x < GRID_SIZE - 1; x++) {
            const key = `${x},${y}`;

            if (
                !guaranteedPath.has(key) &&
                Math.random() < obstacleChance
            ) {
                grid[y][x] = 1;
            }
        }
    }

    for (const key of guaranteedPath) {
        const [x, y] = key.split(',').map(Number);
        grid[y][x] = 0;
    }

    ball.x = cellSize * 1.5;
    ball.y = cellSize * 1.5;
    ball.vx = 0;
    ball.vy = 0;

    checkpoints = checkpointCells.map((checkpoint) => ({
        x: (checkpoint.x + 0.5) * cellSize,
        y: (checkpoint.y + 0.5) * cellSize,
        cellX: checkpoint.x,
        cellY: checkpoint.y,
        radius: cellSize * 0.42,
        reached: false
    }));

    nextCheckpoint = 0;

    goal = {
        x: (goalX + 0.5) * cellSize,
        y: (goalY + 0.5) * cellSize,
        radius: cellSize * 0.38
    };

    let solutionPath = solveMaze(
        grid,
        startX,
        startY,
        goalX,
        goalY
    );

    if (solutionPath.size === 0) {
        for (const key of guaranteedPath) {
            const [x, y] = key.split(',').map(Number);
            grid[y][x] = 0;
        }

        solutionPath = solveMaze(
            grid,
            startX,
            startY,
            goalX,
            goalY
        );
    }

    renderMapObjects(
        grid,
        goalX,
        goalY,
        solutionPath
    );

    positionBall();
}


/* =========================
   Maze solving
========================= */

function solveMaze(grid, startX, startY, endX, endY) {
    const queue = [[startX, startY]];
    const visited = Array.from(
        { length: GRID_SIZE },
        () => Array(GRID_SIZE).fill(false)
    );

    const parent = {};

    const directions = [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0]
    ];

    visited[startY][startX] = true;

    while (queue.length > 0) {
        const [currentX, currentY] = queue.shift();

        if (
            currentX === endX &&
            currentY === endY
        ) {
            const path = new Set();
            let currentKey = `${endX},${endY}`;

            while (currentKey) {
                path.add(currentKey);
                currentKey = parent[currentKey];
            }

            return path;
        }

        for (const [dx, dy] of directions) {
            const nextX = currentX + dx;
            const nextY = currentY + dy;

            const isInside =
                nextX >= 0 &&
                nextX < GRID_SIZE &&
                nextY >= 0 &&
                nextY < GRID_SIZE;

            if (!isInside) {
                continue;
            }

            if (
                grid[nextY][nextX] === 0 &&
                !visited[nextY][nextX]
            ) {
                visited[nextY][nextX] = true;

                parent[`${nextX},${nextY}`] =
                    `${currentX},${currentY}`;

                queue.push([nextX, nextY]);
            }
        }
    }

    return new Set();
}


/* =========================
   Rendering
========================= */

function renderMapObjects(
    grid,
    goalX,
    goalY,
    solutionPath
) {
    board.querySelectorAll(
        '.wall, .hole, .endpoint'
    ).forEach((element) => {
        element.remove();
    });

    walls = [];
    holes = [];

    createZone(1, 1, 'START', 'start-zone');

    checkpoints.forEach((checkpoint, index) => {
        createZone(
            checkpoint.cellX,
            checkpoint.cellY,
            String(index + 1),
            'checkpoint-zone'
        );
    });

    createZone(
        goalX,
        goalY,
        'GOAL',
        'goal-zone'
    );

    const safeCells = new Set();

    for (const key of solutionPath) {
        const [x, y] = key.split(',').map(Number);

        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const safeX = x + dx;
                const safeY = y + dy;

                if (
                    safeX >= 1 &&
                    safeX < GRID_SIZE - 1 &&
                    safeY >= 1 &&
                    safeY < GRID_SIZE - 1
                ) {
                    safeCells.add(`${safeX},${safeY}`);
                }
            }
        }
    }

    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            const isOuterEdge =
                x === 0 ||
                y === 0 ||
                x === GRID_SIZE - 1 ||
                y === GRID_SIZE - 1;

            if (grid[y][x] === 1 || isOuterEdge) {
                createWall(x, y);
                continue;
            }

            const cellKey = `${x},${y}`;

            const isStart = x === 1 && y === 1;
            const isGoal = x === goalX && y === goalY;

            const isCheckpoint = checkpoints.some((checkpoint) => {
                return (
                    checkpoint.cellX === x &&
                    checkpoint.cellY === y
                );
            });

            if (
                !isStart &&
                !isGoal &&
                !isCheckpoint &&
                !safeCells.has(cellKey) &&
                Math.random() < 0.18
            ) {
                createHole(x, y);
            }
        }
    }
}

function createWall(x, y) {
    const wallElement = document.createElement('div');

    wallElement.className = 'wall';
    wallElement.style.left = `${x * cellSize}px`;
    wallElement.style.top = `${y * cellSize}px`;
    wallElement.style.width = `${cellSize + 0.5}px`;
    wallElement.style.height = `${cellSize + 0.5}px`;

    board.appendChild(wallElement);

    walls.push({
        left: x * cellSize,
        right: (x + 1) * cellSize,
        top: y * cellSize,
        bottom: (y + 1) * cellSize
    });
}

function createHole(x, y) {
    const holeRadius = cellSize * 0.29;
    const holeX = (x + 0.5) * cellSize;
    const holeY = (y + 0.5) * cellSize;

    const holeElement = document.createElement('div');

    holeElement.className = 'hole';
    holeElement.style.width = `${holeRadius * 2}px`;
    holeElement.style.height = `${holeRadius * 2}px`;
    holeElement.style.left = `${holeX - holeRadius}px`;
    holeElement.style.top = `${holeY - holeRadius}px`;

    board.appendChild(holeElement);

    holes.push({
        x: holeX,
        y: holeY,
        radius: holeRadius
    });
}

function createZone(x, y, label, className) {
    const zoneElement = document.createElement('div');

    zoneElement.className =
        `endpoint ${className}`;

    zoneElement.style.width = `${cellSize}px`;
    zoneElement.style.height = `${cellSize}px`;
    zoneElement.style.left = `${x * cellSize}px`;
    zoneElement.style.top = `${y * cellSize}px`;
    zoneElement.innerText = label;

    board.appendChild(zoneElement);
}


/* =========================
   Controls
========================= */

window.addEventListener('mousemove', (event) => {
    if (!isGameActive) {
        return;
    }

    const rect = board.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    tilt.x = clamp(
        (event.clientX - centerX) / (rect.width / 2),
        -1,
        1
    );

    tilt.y = clamp(
        (event.clientY - centerY) / (rect.height / 2),
        -1,
        1
    );

    applyVisualTilt();
});

function handleOrientation(event) {
    if (!isGameActive) {
        return;
    }

    const beta = event.beta || 0;
    const gamma = event.gamma || 0;

    if (!orientationBase.calibrated) {
        orientationBase.beta = beta;
        orientationBase.gamma = gamma;
        orientationBase.calibrated = true;
    }

    tilt.x = clamp(
        (gamma - orientationBase.gamma) / 20,
        -1,
        1
    );

    tilt.y = clamp(
        (beta - orientationBase.beta) / 20,
        -1,
        1
    );

    applyVisualTilt();
}

function applyVisualTilt() {
    container.style.transform =
        `rotateX(${-tilt.y * 14}deg)
         rotateY(${tilt.x * 14}deg)`;
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}


/* =========================
   Physics
========================= */

function updatePhysics() {
    if (!isGameActive) {
        return;
    }

    ball.vx += tilt.x * 0.58;
    ball.vy += tilt.y * 0.58;

    ball.vx *= 0.96;
    ball.vy *= 0.96;

    ball.x += ball.vx;
    checkWallCollision('x');

    ball.y += ball.vy;
    checkWallCollision('y');

    positionBall();

    checkGameTriggers();

    animationFrameId =
        requestAnimationFrame(updatePhysics);
}

function positionBall() {
    ballElement.style.left =
        `${ball.x - ball.radius}px`;

    ballElement.style.top =
        `${ball.y - ball.radius}px`;

    const shadowX = 6 + tilt.x * 12;
    const shadowY = 10 + tilt.y * 12;
    const blur =
        14 - (Math.abs(tilt.x) + Math.abs(tilt.y)) * 4;

    ballElement.style.boxShadow =
        `${shadowX}px ${shadowY}px ${blur}px rgba(0, 0, 0, .55),
         inset -3px -3px 7px rgba(0, 0, 0, .6),
         inset 2px 2px 4px rgba(255, 255, 255, .4)`;
}

function checkWallCollision(axis) {
    for (const wall of walls) {
        const overlaps =
            ball.x + ball.radius > wall.left &&
            ball.x - ball.radius < wall.right &&
            ball.y + ball.radius > wall.top &&
            ball.y - ball.radius < wall.bottom;

        if (!overlaps) {
            continue;
        }

        if (axis === 'x') {
            if (ball.vx > 0) {
                ball.x = wall.left - ball.radius;
            } else if (ball.vx < 0) {
                ball.x = wall.right + ball.radius;
            }

            ball.vx *= -0.4;
        } else {
            if (ball.vy > 0) {
                ball.y = wall.top - ball.radius;
            } else if (ball.vy < 0) {
                ball.y = wall.bottom + ball.radius;
            }

            ball.vy *= -0.4;
        }
    }
}


/* =========================
   Waypoints and goal
========================= */

function checkGameTriggers() {
    for (const hole of holes) {
        const dx = ball.x - hole.x;
        const dy = ball.y - hole.y;
        const distance = Math.hypot(dx, dy);

        if (
            distance <
            hole.radius + ball.radius * 0.3
        ) {
            endGame(
                false,
                'You rolled into a pit trap!'
            );

            return;
        }
    }

    if (nextCheckpoint < checkpoints.length) {
        const checkpoint =
            checkpoints[nextCheckpoint];

        const distance = Math.hypot(
            ball.x - checkpoint.x,
            ball.y - checkpoint.y
        );

        if (distance < checkpoint.radius) {
            checkpoint.reached = true;
            markCheckpointReached(nextCheckpoint);

            nextCheckpoint++;

            if (nextCheckpoint < checkpoints.length) {
                endMessage.innerText =
                    `Waypoint ${nextCheckpoint} reached. ` +
                    `Find waypoint ${nextCheckpoint + 1}.`;
            } else {
                endMessage.innerText =
                    'All waypoints reached! Now find the goal.';
            }
        }

        return;
    }

    const goalDistance = Math.hypot(
        ball.x - goal.x,
        ball.y - goal.y
    );

    if (goalDistance < goal.radius * 1.1) {
        endGame(
            true,
            'Superb! You reached both waypoints ' +
            'and completed the maze.'
        );
    }
}

function markCheckpointReached(index) {
    const checkpointElements =
        board.querySelectorAll('.checkpoint-zone');

    const checkpointElement =
        checkpointElements[index];

    if (checkpointElement) {
        checkpointElement.classList.add(
            'checkpoint-reached'
        );

        checkpointElement.innerText = '✓';
        checkpointElement.setAttribute(
            'aria-label',
            `Waypoint ${index + 1} reached`
        );
    }
}


/* =========================
   Game state
========================= */

function resetOrientationCalibration() {
    orientationBase.beta = 0;
    orientationBase.gamma = 0;
    orientationBase.calibrated = false;
}

function startGame() {
    instructionModal.classList.remove('active');

    resetOrientationCalibration();
    initDimensions();
    generateMaze();

    isGameActive = true;
    updatePhysics();
}

function endGame(isWin, message) {
    isGameActive = false;

    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    endTitle.innerText =
        isWin ? '🎉 Victory!' : '💥 Defeat';

    endMessage.innerText = message;
    endModal.classList.add('active');
}

function requestGyroscopePermissions() {
    if (
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission ===
            'function'
    ) {
        DeviceOrientationEvent
            .requestPermission()
            .then((permissionState) => {
                if (permissionState === 'granted') {
                    window.addEventListener(
                        'deviceorientation',
                        handleOrientation
                    );
                }

                startGame();
            })
            .catch((error) => {
                console.error(
                    'Gyroscope authorization error:',
                    error
                );

                startGame();
            });

        return;
    }

    window.addEventListener(
        'deviceorientation',
        handleOrientation
    );

    startGame();
}


/* =========================
   Events
========================= */

startButton.addEventListener(
    'click',
    requestGyroscopePermissions
);

reloadButton.addEventListener(
    'click',
    () => {
        window.location.reload();
    }
);

window.addEventListener('resize', () => {
    if (!isGameActive) {
        return;
    }

    initDimensions();
    generateMaze();
});
