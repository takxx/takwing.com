// script.js
"use strict";

import {
    generateRandomTask
} from "./task.js";

/* ==========================================================================
   DOM
   ========================================================================== */

const board = document.getElementById("board");
const startButton = document.getElementById("startButton");
const roundDisplay = document.getElementById("round");
const timeDisplay = document.getElementById("time");
const highScoreDisplay = document.getElementById("highScore");
const message = document.getElementById("message");
const languageSelect = document.getElementById("languageSelect");
const feedbackThumb = document.getElementById("feedbackThumb");

let hexagons = [];

/* ==========================================================================
   Configuration
   ========================================================================== */

const HEX_COUNT = 7;
const SWIPE_THRESHOLD = 8;
const FEEDBACK_TIME = 180;
const NEXT_TASK_DELAY = 250;
const WRONG_TASK_DELAY = 250;

const GAME_CONFIG = {
    startingTime: 60,
    maxTime: 99,
    timeBonusPerCorrectTask: 3,
    timePenaltyPerWrongTask: 3,
    pointsPerCorrectTask: 1
};

const STORAGE_KEY = "hexSwipeHighScore";
const LANGUAGE_STORAGE_KEY = "hexSwipeLanguage";

/* ==========================================================================
   Language state
   ========================================================================== */

let language = "en";
let uiText = {};
let languageData = {};
let translations = {};

async function loadTranslations() {
    const response = await fetch("lang.json", {
        cache: "no-cache"
    });

    if (!response.ok) {
        throw new Error(
            `Failed to load lang.json: ${response.status}`
        );
    }

    translations = await response.json();

    if (
        !translations ||
        typeof translations !== "object"
    ) {
        throw new Error(
            "lang.json has an invalid structure."
        );
    }

    window.taskTranslations = translations;
}

function getInitialLanguage() {
    let savedLanguage = null;

    try {
        savedLanguage = localStorage.getItem(
            LANGUAGE_STORAGE_KEY
        );
    } catch {
        savedLanguage = null;
    }

    if (
        savedLanguage &&
        translations[savedLanguage]
    ) {
        return savedLanguage;
    }

    const browserLanguages =
        navigator.languages || [navigator.language];

    for (const browserLanguage of browserLanguages) {
        const normalized =
            String(browserLanguage).toLowerCase();

        if (
            normalized === "zh-tw" ||
            normalized === "zh-hk" ||
            normalized === "zh-mo" ||
            normalized.startsWith("zh-hant")
        ) {
            if (translations["zh-Hant"]) {
                return "zh-Hant";
            }
        }

        if (
            normalized.startsWith("es") &&
            translations.es
        ) {
            return "es";
        }

        if (
            normalized.startsWith("en") &&
            translations.en
        ) {
            return "en";
        }
    }

    return translations.en
        ? "en"
        : Object.keys(translations)[0] || "en";
}

function setLanguage(newLanguage) {
    language = translations[newLanguage]
        ? newLanguage
        : "en";

    languageData =
        translations[language] ||
        translations.en ||
        {};

    uiText = languageData.ui || {};

    try {
        localStorage.setItem(
            LANGUAGE_STORAGE_KEY,
            language
        );
    } catch {
        // Local storage may be unavailable.
    }

    if (languageSelect) {
        languageSelect.value = language;
    }

    applyTranslations();

    if (!gameRunning) {
        setMessageKey("watchSequence");
    } else if (currentTask) {
        renderTaskInstruction(currentTask);
    }
}

function applyTranslations() {
    document.documentElement.lang = language;

    document
        .querySelectorAll("[data-i18n]")
        .forEach(element => {
            const key = element.dataset.i18n;
            const translated = getUiText(key);

            if (translated) {
                element.textContent = translated;
            }
        });

    if (board) {
        board.setAttribute(
            "aria-label",
            uiText.boardLabel || ""
        );
    }

    hexagons.forEach((hex, index) => {
        const label =
            language === "zh-Hant"
                ? `六角形 ${index + 1}`
                : language === "es"
                    ? `Hexágono ${index + 1}`
                    : `Hexagon ${index + 1}`;

        hex.setAttribute("aria-label", label);
    });
}

function getUiText(key) {
    return getNestedValue(uiText, key);
}

function getNestedValue(object, path) {
    if (!object || !path) {
        return "";
    }

    return path
        .split(".")
        .reduce(
            (value, key) => value?.[key],
            object
        ) || "";
}

function setMessageKey(key) {
    if (message) {
        message.textContent = getUiText(key);
    }
}

/* ==========================================================================
   Audio
   ========================================================================== */

let audioContext = null;

const HEX_FREQUENCIES = [
    261.63,
    293.66,
    329.63,
    349.23,
    392.0,
    440.0,
    493.88
];

function getAudioContext() {
    if (audioContext) {
        return audioContext;
    }

    const AudioContextClass =
        window.AudioContext ||
        window.webkitAudioContext;

    if (!AudioContextClass) {
        return null;
    }

    audioContext = new AudioContextClass();
    return audioContext;
}

function resumeAudioContext() {
    const context = getAudioContext();

    if (
        context &&
        context.state === "suspended"
    ) {
        context.resume().catch(() => {});
    }

    return context;
}

function playHexSound(index) {
    const context = resumeAudioContext();

    if (
        !context ||
        !HEX_FREQUENCIES[index]
    ) {
        return;
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.value =
        HEX_FREQUENCIES[index];

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(
        0.22,
        now + 0.02
    );
    gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + 0.24
    );

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.26);
}

function playResultSound(isCorrect) {
    const context = resumeAudioContext();

    if (!context) {
        return;
    }

    const notes = isCorrect
        ? [523.25, 659.25, 783.99]
        : [220.0, 164.81];

    const startTime = context.currentTime;

    notes.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        const noteStart =
            startTime + index * 0.09;
        const noteEnd = noteStart + 0.16;

        oscillator.type = isCorrect
            ? "sine"
            : "sawtooth";

        oscillator.frequency.setValueAtTime(
            frequency,
            noteStart
        );

        gain.gain.setValueAtTime(
            0.0001,
            noteStart
        );

        gain.gain.exponentialRampToValueAtTime(
            isCorrect ? 0.22 : 0.16,
            noteStart + 0.015
        );

        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            noteEnd
        );

        oscillator.connect(gain);
        gain.connect(context.destination);

        oscillator.start(noteStart);
        oscillator.stop(noteEnd);
    });
}

/* ==========================================================================
   Game state
   ========================================================================== */

let round = 0;
let highScore = 0;
let timeRemaining =
    GAME_CONFIG.startingTime;

let timerId = null;
let gameId = 0;
let gameRunning = false;
let acceptingInput = false;

let currentTask = null;
let currentPath = [];

let nextTask = null;
let nextTaskGenerating = false;
let tasksCompletedTotal = 0;

/* ==========================================================================
   Score and timer
   ========================================================================== */

function loadHighScore() {
    try {
        const stored = Number(
            localStorage.getItem(STORAGE_KEY)
        );

        return Number.isFinite(stored) && stored >= 0
            ? stored
            : 0;
    } catch {
        return 0;
    }
}

function saveHighScore() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            String(highScore)
        );
    } catch {
        // Local storage may be unavailable.
    }
}

function updateScoreDisplay() {
    if (roundDisplay) {
        roundDisplay.textContent = round;
    }

    if (timeDisplay) {
        timeDisplay.textContent = timeRemaining;
    }

    if (highScoreDisplay) {
        highScoreDisplay.textContent = highScore;
    }
}

function clampTime(value) {
    return Math.max(
        0,
        Math.min(
            GAME_CONFIG.maxTime,
            value
        )
    );
}

function startTimer() {
    stopTimer();

    timerId = window.setInterval(() => {
        if (!gameRunning) {
            return;
        }

        timeRemaining -= 1;
        updateScoreDisplay();

        if (timeRemaining <= 0) {
            endGame();
        }
    }, 1000);
}

function stopTimer() {
    if (timerId !== null) {
        window.clearInterval(timerId);
        timerId = null;
    }
}

/* ==========================================================================
   Game lifecycle
   ========================================================================== */

function createNewGame() {
    gameId += 1;

    finishActivePointer();
    clearHexStates();
    clearCurrentPath();

    round = 0;
    timeRemaining =
        GAME_CONFIG.startingTime;
    tasksCompletedTotal = 0;

    currentTask = null;
    nextTask = null;
    nextTaskGenerating = false;

    gameRunning = true;
    acceptingInput = false;

    highScore = loadHighScore();
    updateScoreDisplay();

    if (startButton) {
        startButton.disabled = true;
        startButton.textContent =
            getUiText("restart") ||
            "Restart Game";
    }

    setMessageKey("yourTurn");
    startTimer();
    requestNextTask();
}

function endGame() {
    gameRunning = false;
    acceptingInput = false;
    currentTask = null;

    stopTimer();
    finishActivePointer();

    if (round > highScore) {
        highScore = round;
        saveHighScore();
    }

    updateScoreDisplay();
    setMessageKey("gameOver");

    if (startButton) {
        startButton.disabled = false;
        startButton.textContent =
            getUiText("tryAgain") ||
            "Try Again";
    }

    hexagons.forEach(hex => {
        hex.classList.add("wrong");
    });

    window.setTimeout(() => {
        hexagons.forEach(hex => {
            hex.classList.remove("wrong");
        });
    }, 350);
}

/* ==========================================================================
   Task loading
   ========================================================================== */

function calculateNextDifficulty() {
    if (tasksCompletedTotal < 3) {
        return 0;
    }

    if (timeRemaining >= 70) {
        return 3;
    }

    if (timeRemaining >= 20) {
        return 2;
    }

    return 1;
}

async function requestNextTask() {
    if (!gameRunning) {
        return;
    }

    const requestGameId = gameId;

    disableBoard();
    clearCurrentPath();
    clearHexStates();

    let task;

    if (nextTask) {
        task = nextTask;
        nextTask = null;
    } else {
        try {
            task = await generateRandomTask(
                calculateNextDifficulty()
            );
        } catch (error) {
            console.error(
                "Task generation failed:",
                error
            );

            if (
                requestGameId === gameId &&
                gameRunning
            ) {
                endGame();
            }

            return;
        }
    }

    if (
        !gameRunning ||
        requestGameId !== gameId
    ) {
        return;
    }

    try {
        validateTaskResponse(task);
    } catch (error) {
        console.error(error);
        endGame();
        return;
    }

    currentTask = task;

    renderTaskInstruction(task);
    renderGeneratedCells(task.cells);
    enableBoard();

    preGenerateNextTask(requestGameId);
}

async function preGenerateNextTask(
    requestGameId = gameId
) {
    if (
        nextTaskGenerating ||
        !gameRunning
    ) {
        return;
    }

    nextTaskGenerating = true;

    try {
        const task =
            await generateRandomTask(
                calculateNextDifficulty()
            );

        if (
            gameRunning &&
            requestGameId === gameId
        ) {
            nextTask = task;
        }
    } catch (error) {
        console.error(
            "Pre-generation failed:",
            error
        );
    } finally {
        nextTaskGenerating = false;
    }
}

function validateTaskResponse(task) {
    if (!task || typeof task !== "object") {
        throw new Error(
            "Generated task is invalid."
        );
    }

    if (!Array.isArray(task.cells)) {
        throw new Error(
            "Generated task has no cells."
        );
    }

    if (!Array.isArray(task.answerPaths)) {
        throw new Error(
            "Generated task has no answer paths."
        );
    }

    if (
        !task.instruction ||
        typeof task.instruction !== "object"
    ) {
        throw new Error(
            "Generated task has no instruction."
        );
    }
}

/* ==========================================================================
   Instruction rendering
   ========================================================================== */

function renderTaskInstruction(task) {
    if (!message) {
        return;
    }

    const instruction = task?.instruction;

    if (
        !instruction ||
        typeof instruction !== "object"
    ) {
        setMessageKey("yourTurn");
        return;
    }

    const template =
        getInstructionTemplate(instruction);

    if (!template) {
        console.warn(
            "Instruction template not found:",
            instruction.template
        );

        setMessageKey("yourTurn");
        return;
    }

    const nodes = renderTemplate(
        template,
        instruction
    );

    message.replaceChildren(...nodes);
}

function getInstructionTemplate(instruction) {
    const templateKey =
        instruction.template ||
        instruction.templateKey ||
        instruction.type;

    if (!templateKey) {
        return "";
    }

    return getNestedValue(
        languageData,
        `tasks.templates.${templateKey}`
    );
}

function renderTemplate(template, instruction) {
    const nodes = [];
    const tokenPattern = /\{([^{}]+)\}/g;

    let lastIndex = 0;
    let match;

    while (
        (match = tokenPattern.exec(template))
    ) {
        if (match.index > lastIndex) {
            nodes.push(
                document.createTextNode(
                    template.slice(
                        lastIndex,
                        match.index
                    )
                )
            );
        }

        const tokenName = match[1];

        nodes.push(
            ...renderInstructionToken(
                tokenName,
                instruction
            )
        );

        lastIndex =
            match.index + match[0].length;
    }

    if (lastIndex < template.length) {
        nodes.push(
            document.createTextNode(
                template.slice(lastIndex)
            )
        );
    }

    return nodes;
}

function renderInstructionToken(
    tokenName,
    instruction
) {
    if (tokenName === "colors") {
        return renderColorList(
            getInstructionColors(instruction)
        );
    }

    if (tokenName === "color") {
        const colorKey =
            instruction.color || "";

        const colorText =
            getNestedValue(
                languageData,
                `tasks.colors.${colorKey}`
            ) || colorKey;

        return [
            createInstructionTerm(
                "color",
                colorKey,
                colorText
            )
        ];
    }

    const value = getInstructionTokenValue(
        tokenName,
        instruction
    );

    if (
        value === null ||
        value === undefined
    ) {
        return [];
    }

    const displayValue =
        getLocalizedInstructionValue(
            tokenName,
            value,
            instruction
        );

    return [
        createInstructionTerm(
            tokenName,
            value,
            displayValue
        )
    ];
}

function getInstructionTokenValue(
    tokenName,
    instruction
) {
    if (
        Object.prototype.hasOwnProperty.call(
            instruction,
            tokenName
        )
    ) {
        return instruction[tokenName];
    }

    if (
        instruction.parameters &&
        Object.prototype.hasOwnProperty.call(
            instruction.parameters,
            tokenName
        )
    ) {
        return instruction.parameters[tokenName];
    }

    return "";
}

function getInstructionColors(instruction) {
    if (Array.isArray(instruction.targetColors)) {
        return instruction.targetColors;
    }

    if (Array.isArray(instruction.colors)) {
        return instruction.colors;
    }

    if (instruction.color) {
        return [instruction.color];
    }

    return [];
}

function getLocalizedInstructionValue(
    tokenName,
    value,
    instruction
) {
    const sources = [];

    if (tokenName === "shape") {
        sources.push("tasks.shapes");
    }

    if (tokenName === "direction") {
        sources.push("tasks.directions");
    }

    if (tokenName === "anchorType") {
        sources.push("tasks.anchors");
    }

    if (
        instruction.tokenSources &&
        instruction.tokenSources[tokenName]
    ) {
        sources.unshift(
            instruction.tokenSources[tokenName]
        );
    }

    for (const source of sources) {
        const translated =
            getNestedValue(
                languageData,
                `${source}.${value}`
            );

        if (translated) {
            return translated;
        }
    }

    return String(value);
}

function createInstructionTerm(
    tokenName,
    tokenValue,
    displayValue
) {
    const element =
        document.createElement("span");

    const safeTokenName =
        String(tokenName)
            .replace(/[^a-zA-Z0-9_-]/g, "");

    const safeTokenValue =
        String(tokenValue)
            .replace(/[^a-zA-Z0-9_-]/g, "");

    element.className =
        `instruction-term instruction-${safeTokenName}`;

    if (safeTokenValue) {
        element.classList.add(
            `instruction-${safeTokenName}-${safeTokenValue}`
        );
    }

    element.dataset.token = tokenName;
    element.dataset.value = String(tokenValue);
    element.textContent = displayValue;

    return element;
}

function renderColorList(colorKeys) {
    const elements = colorKeys.map(colorKey => {
        const colorText =
            getNestedValue(
                languageData,
                `tasks.colors.${colorKey}`
            ) || colorKey;

        return createInstructionTerm(
            "color",
            colorKey,
            colorText
        );
    });

    const listData =
        languageData.tasks?.list;

    if (
        elements.length <= 1 ||
        !listData
    ) {
        return elements;
    }

    const pattern =
        elements.length === 2
            ? listData.two
            : listData.many;

    if (!pattern) {
        return elements;
    }

    const result = [];
    const tokenPattern =
        /(\{0\}|\{1\}|\{last\})/g;

    let lastIndex = 0;
    let match;

    while (
        (match = tokenPattern.exec(pattern))
    ) {
        if (match.index > lastIndex) {
            result.push(
                document.createTextNode(
                    pattern.slice(
                        lastIndex,
                        match.index
                    )
                )
            );
        }

        let element = null;

        if (match[0] === "{last}") {
            element =
                elements[elements.length - 1];
        } else {
            const index = Number(
                match[0].slice(1, -1)
            );

            element = elements[index];
        }

        if (element) {
            result.push(
                element.cloneNode(true)
            );
        }

        lastIndex =
            match.index + match[0].length;
    }

    if (lastIndex < pattern.length) {
        result.push(
            document.createTextNode(
                pattern.slice(lastIndex)
            )
        );
    }

    return result;
}

/* ==========================================================================
   Cell rendering
   ========================================================================== */

function renderGeneratedCells(cells) {
    hexagons.forEach((hex, index) => {
        hex.textContent = "";

        hex.style.backgroundColor = "";
        hex.style.color = "";

        hex.className = "hex";
        hex.classList.add(`hex-${index}`);
        hex.dataset.index = String(index);
    });

    for (const cell of cells) {
        if (
            !cell ||
            !Number.isInteger(
                Number(cell.index)
            )
        ) {
            continue;
        }

        const index = Number(cell.index);
        const hex = hexagons[index];

        if (!hex) {
            continue;
        }

        hex.textContent =
            cell.content === null ||
            cell.content === undefined
                ? ""
                : String(cell.content);

        if (cell.backgroundColor) {
            hex.style.backgroundColor =
                cell.backgroundColor;
        }

        if (cell.color) {
            hex.style.color = cell.color;
        }

        if (cell.className) {
            hex.classList.add(
                cell.className
            );
        }
    }
}

/* ==========================================================================
   Path validation
   ========================================================================== */

function validatePath(
    attemptedPath,
    answerPaths
) {
    if (
        !Array.isArray(attemptedPath) ||
        attemptedPath.length < 2
    ) {
        return {
            valid: false,
            reason: "tooShort"
        };
    }

    if (hasRepeatedValue(attemptedPath)) {
        return {
            valid: false,
            reason: "repeatedHex"
        };
    }

    const valid = answerPaths.some(
        answerPath =>
            samePath(
                attemptedPath,
                answerPath
            )
    );

    return {
        valid,
        reason: valid
            ? "accepted"
            : "notAccepted"
    };
}

function hasRepeatedValue(values) {
    return new Set(values).size !== values.length;
}

function samePath(a, b) {
    return (
        Array.isArray(a) &&
        Array.isArray(b) &&
        a.length === b.length &&
        a.every(
            (value, index) =>
                Number(value) ===
                Number(b[index])
        )
    );
}

function isPrefixPossible(
    prefix,
    answerPaths
) {
    if (
        !Array.isArray(prefix) ||
        prefix.length === 0
    ) {
        return false;
    }

    return answerPaths.some(answerPath => {
        if (
            !Array.isArray(answerPath) ||
            answerPath.length < prefix.length
        ) {
            return false;
        }

        return prefix.every(
            (value, index) =>
                Number(value) ===
                Number(answerPath[index])
        );
    });
}

/* ==========================================================================
   Feedback
   ========================================================================== */

let feedbackTimerId = null;

function showFeedbackThumb(
    isCorrect,
    endingHexIndex
) {
    const hex =
        hexagons[endingHexIndex];

    if (
        !hex ||
        !feedbackThumb ||
        !board
    ) {
        return;
    }

    const hexRect =
        hex.getBoundingClientRect();

    const boardRect =
        board.getBoundingClientRect();

    const x =
        hexRect.left -
        boardRect.left +
        hexRect.width / 2;

    const y =
        hexRect.top -
        boardRect.top +
        hexRect.height / 2;

    feedbackThumb.textContent =
        isCorrect ? "👍" : "👎";

    feedbackThumb.style.left = `${x}px`;
    feedbackThumb.style.top = `${y}px`;
    feedbackThumb.style.display = "block";

    if (feedbackTimerId !== null) {
        window.clearTimeout(
            feedbackTimerId
        );
    }

    feedbackTimerId =
        window.setTimeout(() => {
            feedbackThumb.style.display =
                "none";
            feedbackTimerId = null;
        }, FEEDBACK_TIME);
}

function flashHex(index, className) {
    const hex = hexagons[index];

    if (!hex) {
        return;
    }

    hex.classList.add(className);

    window.setTimeout(() => {
        hex.classList.remove(className);
    }, FEEDBACK_TIME);
}

function clearHexStates() {
    hexagons.forEach(hex => {
        hex.classList.remove(
            "active",
            "wrong"
        );
    });
}

function clearCurrentPath() {
    currentPath = [];
}

/* ==========================================================================
   Accept/reject path
   ========================================================================== */

function acceptPath() {
    if (
        !acceptingInput ||
        !gameRunning
    ) {
        return;
    }

    const endingHexIndex =
        currentPath[
            currentPath.length - 1
        ];

    acceptingInput = false;
    finishActivePointer();

    currentPath.forEach(index => {
        flashHex(index, "active");
    });

    round +=
        GAME_CONFIG.pointsPerCorrectTask;

    timeRemaining = clampTime(
        timeRemaining +
        GAME_CONFIG.timeBonusPerCorrectTask
    );

    tasksCompletedTotal += 1;

    updateScoreDisplay();
    playResultSound(true);
    showFeedbackThumb(
        true,
        endingHexIndex
    );

    disableBoard();

    const completedGameId = gameId;

    window.setTimeout(() => {
        if (
            gameRunning &&
            completedGameId === gameId
        ) {
            requestNextTask();
        }
    }, NEXT_TASK_DELAY);
}

function rejectPath() {
    if (
        !acceptingInput ||
        !gameRunning
    ) {
        return;
    }

    const endingHexIndex =
        currentPath[
            currentPath.length - 1
        ];

    acceptingInput = false;
    finishActivePointer();

    currentPath.forEach(index => {
        flashHex(index, "wrong");
    });

    timeRemaining = clampTime(
        timeRemaining -
        GAME_CONFIG.timePenaltyPerWrongTask
    );

    updateScoreDisplay();
    playResultSound(false);
    showFeedbackThumb(
        false,
        endingHexIndex
    );

    if (timeRemaining <= 0) {
        endGame();
        return;
    }

    disableBoard();

    const failedGameId = gameId;

    window.setTimeout(() => {
        if (
            gameRunning &&
            failedGameId === gameId
        ) {
            requestNextTask();
        }
    }, WRONG_TASK_DELAY);
}

/* ==========================================================================
   Pointer and swipe handling
   ========================================================================== */

const neighbors = {
    0: [1, 2, 3, 4, 5, 6],
    1: [0, 2, 6],
    2: [0, 1, 3],
    3: [0, 2, 4],
    4: [0, 3, 5],
    5: [0, 4, 6],
    6: [0, 5, 1]
};

let pointerIsDown = false;
let swipeStarted = false;
let activePointerId = null;
let lastPointerHex = null;
let pointerStartX = 0;
let pointerStartY = 0;

function getHexIndex(element) {
    const hex =
        element?.closest?.(".hex");

    if (
        !hex ||
        !board.contains(hex)
    ) {
        return null;
    }

    const index = Number(
        hex.dataset.index
    );

    if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= HEX_COUNT
    ) {
        return null;
    }

    return index;
}

function getHexFromPoint(x, y) {
    const elements =
        document.elementsFromPoint(x, y);

    for (const element of elements) {
        const index =
            getHexIndex(element);

        if (index !== null) {
            return index;
        }
    }

    return null;
}

function getHexFromEvent(event) {
    const targetIndex =
        getHexIndex(event.target);

    return targetIndex !== null
        ? targetIndex
        : getHexFromPoint(
            event.clientX,
            event.clientY
        );
}

function handlePointerDown(event) {
    if (
        !acceptingInput ||
        !currentTask ||
        activePointerId !== null
    ) {
        return;
    }

    const startingHex =
        getHexFromEvent(event);

    if (startingHex === null) {
        return;
    }

    event.preventDefault();

    pointerIsDown = true;
    swipeStarted = false;
    activePointerId = event.pointerId;
    lastPointerHex = startingHex;

    pointerStartX = event.clientX;
    pointerStartY = event.clientY;

    if (board.setPointerCapture) {
        try {
            board.setPointerCapture(
                event.pointerId
            );
        } catch {
            // Pointer capture unavailable.
        }
    }

    currentPath = [startingHex];

    hexagons[startingHex].classList.add(
        "active"
    );

    playHexSound(startingHex);
}

function handlePointerMove(event) {
    if (
        !pointerIsDown ||
        event.pointerId !== activePointerId
    ) {
        return;
    }

    if (
        !acceptingInput ||
        !currentTask
    ) {
        finishPointer(event);
        return;
    }

    event.preventDefault();

    const distanceMoved = Math.hypot(
        event.clientX - pointerStartX,
        event.clientY - pointerStartY
    );

    if (
        !swipeStarted &&
        distanceMoved < SWIPE_THRESHOLD
    ) {
        return;
    }

    const currentHex =
        getHexFromPoint(
            event.clientX,
            event.clientY
        );

    if (
        currentHex === null ||
        currentHex === lastPointerHex
    ) {
        return;
    }

    if (
        lastPointerHex === null ||
        !neighbors[lastPointerHex]?.includes(
            currentHex
        )
    ) {
        addHexToPath(currentHex);
        rejectPath();
        return;
    }

    if (currentPath.includes(currentHex)) {
        addHexToPath(currentHex);
        rejectPath();
        return;
    }

    swipeStarted = true;
    lastPointerHex = currentHex;

    addHexToPath(currentHex);

    if (
        !isPrefixPossible(
            currentPath,
            currentTask.answerPaths
        )
    ) {
        rejectPath();
        return;
    }

    const result = validatePath(
        currentPath,
        currentTask.answerPaths
    );

    if (result.valid) {
        acceptPath();
    }
}

function addHexToPath(index) {
    currentPath.push(index);

    hexagons[index].classList.add(
        "active"
    );

    playHexSound(index);
}

function handlePointerUp(event) {
    if (
        event.pointerId !== activePointerId
    ) {
        return;
    }

    event.preventDefault();

    if (
        acceptingInput &&
        currentTask &&
        currentPath.length >= 2
    ) {
        const result = validatePath(
            currentPath,
            currentTask.answerPaths
        );

        if (result.valid) {
            acceptPath();
        } else {
            rejectPath();
        }
    }

    finishPointer(event);
}

function handlePointerCancel(event) {
    if (
        event.pointerId === activePointerId
    ) {
        finishPointer(event);
    }
}

function finishPointer(event) {
    if (
        event &&
        board.releasePointerCapture &&
        board.hasPointerCapture?.(
            event.pointerId
        )
    ) {
        try {
            board.releasePointerCapture(
                event.pointerId
            );
        } catch {
            // Pointer capture already released.
        }
    }

    pointerIsDown = false;
    swipeStarted = false;
    activePointerId = null;
    lastPointerHex = null;

    pointerStartX = 0;
    pointerStartY = 0;
}

function finishActivePointer() {
    if (activePointerId === null) {
        pointerIsDown = false;
        swipeStarted = false;
        lastPointerHex = null;
        return;
    }

    finishPointer({
        pointerId: activePointerId
    });
}

function enableBoard() {
    if (!board) {
        return;
    }

    board.classList.remove(
        "is-disabled"
    );

    board.setAttribute(
        "aria-disabled",
        "false"
    );

    acceptingInput = true;
}

function disableBoard() {
    if (!board) {
        return;
    }

    board.classList.add(
        "is-disabled"
    );

    board.setAttribute(
        "aria-disabled",
        "true"
    );

    acceptingInput = false;
}

/* ==========================================================================
   Event listeners
   ========================================================================== */

if (languageSelect) {
    languageSelect.addEventListener(
        "change",
        event => {
            setLanguage(event.target.value);
        }
    );
}

if (startButton) {
    startButton.addEventListener(
        "click",
        createNewGame
    );
}

if (board) {
    board.addEventListener(
        "pointerdown",
        handlePointerDown
    );

    board.addEventListener(
        "pointermove",
        handlePointerMove
    );

    board.addEventListener(
        "pointerup",
        handlePointerUp
    );

    board.addEventListener(
        "pointercancel",
        handlePointerCancel
    );

    board.addEventListener(
        "lostpointercapture",
        handlePointerCancel
    );
}

/* ==========================================================================
   Initialization
   ========================================================================== */

async function initialize() {
    hexagons = [
        ...document.querySelectorAll(".hex")
    ];

    hexagons.forEach((hex, index) => {
        hex.dataset.index = String(index);
    });

    highScore = loadHighScore();
    updateScoreDisplay();

    try {
        await loadTranslations();

        setLanguage(
            getInitialLanguage()
        );

        setMessageKey("watchSequence");
    } catch (error) {
        console.error(
            "Failed to initialize translations:",
            error
        );

        if (message) {
            message.textContent =
                "Error loading translations.";
        }
    }
}

initialize();