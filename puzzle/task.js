// task.js
"use strict";


/* ==========================================================================
   1. Reusable constants and functions
   ========================================================================== */


/* ==========================================================================
   1a Shared task configuration
   ========================================================================== */

const TASK_COLORS = Object.freeze([
    "red",
    "green",
    "blue"
]);


const TASK_CIRCLES = Object.freeze({
    red: "🔴",
    green: "🟢",
    blue: "🔵"
});


const TASK_SQUARES = Object.freeze({
    red: "🟥",
    green: "🟩",
    blue: "🟦"
});


/* ==========================================================================
   1b Reusable character constants
   ========================================================================== */

const TASK_DIGITS = Object.freeze({
    "0": ["0", "0️⃣"],
    "1": ["1", "1️⃣"],
    "2": ["2", "2️⃣"],
    "3": ["3", "3️⃣"],
    "4": ["4", "4️⃣"],
    "5": ["5", "5️⃣"],
    "6": ["6", "6️⃣"],
    "7": ["7", "7️⃣"],
    "8": ["8", "8️⃣"],
    "9": ["9", "9️⃣"]
});


const TASK_ALPHABETS = Object.freeze({
    A: ["A", "a", "🅰️"],
    B: ["B", "b", "🅱️"],
    C: ["C", "c"],
    D: ["D", "d"],
    E: ["E", "e"],
    F: ["F", "f"],
    G: ["G", "g"],
    H: ["H", "h"],
    I: ["I", "i"],
    J: ["J", "j"],
    K: ["K", "k"],
    L: ["L", "l"],
    M: ["M", "m", "Ⓜ️"],
    N: ["N", "n"],
    O: ["O", "o", "🅾️"],
    P: ["P", "p", "🅿️"],
    Q: ["Q", "q"],
    R: ["R", "r"],
    S: ["S", "s"],
    T: ["T", "t"],
    U: ["U", "u"],
    V: ["V", "v"],
    W: ["W", "w"],
    X: ["X", "x", "❎"],
    Y: ["Y", "y"],
    Z: ["Z", "z"]
});


const TASK_DIGIT_KEYS = Object.freeze(
    Object.keys(TASK_DIGITS)
);


const TASK_ALPHABET_KEYS = Object.freeze(
    Object.keys(TASK_ALPHABETS)
);


/* ==========================================================================
   1c Reusable random functions
   ========================================================================== */

function randomChoice(array) {
    if (
        !Array.isArray(array) ||
        array.length === 0
    ) {
        throw new Error(
            "randomChoice: array is empty or not an array."
        );
    }

    return array[
        Math.floor(
            Math.random() * array.length
        )
    ];
}


function randomInt(min, max) {
    if (
        !Number.isInteger(min) ||
        !Number.isInteger(max) ||
        min > max
    ) {
        throw new RangeError(
            "randomInt: invalid range."
        );
    }

    return Math.floor(
        Math.random() * (max - min + 1)
    ) + min;
}


function randomBoolean() {
    return Math.random() < 0.5;
}


function randomUniqueItems(array, count) {
    if (!Array.isArray(array)) {
        throw new TypeError(
            "randomUniqueItems: array is required."
        );
    }

    if (
        !Number.isInteger(count) ||
        count < 0 ||
        count > array.length
    ) {
        throw new RangeError(
            "randomUniqueItems: invalid count."
        );
    }

    const available = [...array];
    const result = [];

    while (result.length < count) {
        const index =
            randomInt(0, available.length - 1);

        result.push(
            available.splice(index, 1)[0]
        );
    }

    return result;
}


function sameUnorderedCells(a, b) {
    if (
        !Array.isArray(a) ||
        !Array.isArray(b) ||
        a.length !== b.length
    ) {
        return false;
    }

    const setA = new Set(a);
    const setB = new Set(b);

    if (setA.size !== setB.size) {
        return false;
    }

    for (const value of setA) {
        if (!setB.has(value)) {
            return false;
        }
    }

    return true;
}


function hasRepeatedValue(values) {
    return new Set(values).size !== values.length;
}


/* ==========================================================================
   1d Reusable character functions
   ========================================================================== */

function getTaskDigitVariants(digit) {
    const key = String(digit);

    if (!TASK_DIGITS[key]) {
        throw new RangeError(
            `Unknown task digit: ${digit}`
        );
    }

    return TASK_DIGITS[key];
}


function getTaskAlphabetVariants(letter) {
    const key =
        String(letter).toUpperCase();

    if (!TASK_ALPHABETS[key]) {
        throw new RangeError(
            `Unknown task letter: ${letter}`
        );
    }

    return TASK_ALPHABETS[key];
}


function getAllTaskDigitCharacters() {
    return Object.values(TASK_DIGITS).flat();
}


function getAllTaskAlphabetCharacters() {
    return Object.values(TASK_ALPHABETS).flat();
}


function getRandomTaskDigit() {
    return randomChoice(TASK_DIGIT_KEYS);
}


function getRandomTaskDigitCharacter() {
    return randomChoice(
        getTaskDigitVariants(
            getRandomTaskDigit()
        )
    );
}


function getRandomTaskLetter() {
    return randomChoice(TASK_ALPHABET_KEYS);
}


function getRandomTaskLetterCharacter() {
    return randomChoice(
        getTaskAlphabetVariants(
            getRandomTaskLetter()
        )
    );
}


function getRandomTaskCharacter() {
    return randomChoice([
        getRandomTaskDigitCharacter(),
        getRandomTaskLetterCharacter()
    ]);
}


function getRandomTaskNumberCharacter() {
    return getRandomTaskDigitCharacter();
}


function getRandomTaskAlphabetCharacter() {
    return getRandomTaskLetterCharacter();
}


function createRandomTaskAlphabetCharacters(count) {
    return Array.from(
        { length: count },
        () => getRandomTaskLetterCharacter()
    );
}


function createRandomTaskDigitCharacters(count) {
    return Array.from(
        { length: count },
        () => getRandomTaskDigitCharacter()
    );
}


function createRandomTaskCharacters(count) {
    return Array.from(
        { length: count },
        () => getRandomTaskCharacter()
    );
}


function createUniqueRandomTaskAlphabetCharacters(count) {
    if (count > TASK_ALPHABET_KEYS.length) {
        throw new RangeError(
            "Cannot create more unique alphabet characters than available letters."
        );
    }

    const availableLetters = [
        ...TASK_ALPHABET_KEYS
    ];

    const characters = [];

    while (characters.length < count) {
        const index =
            randomInt(
                0,
                availableLetters.length - 1
            );

        const letter =
            availableLetters.splice(index, 1)[0];

        characters.push(
            randomChoice(
                getTaskAlphabetVariants(letter)
            )
        );
    }

    return characters;
}

/* ==========================================================================
   1e Shape character helper
   ========================================================================== */

function getShapeCharacter(shape, color) {
    if (shape === "circle") {
        if (!TASK_CIRCLES[color]) {
            throw new RangeError(
                `getShapeCharacter: unknown circle color "${color}".`
            );
        }
        return TASK_CIRCLES[color];
    }

    if (shape === "square") {
        if (!TASK_SQUARES[color]) {
            throw new RangeError(
                `getShapeCharacter: unknown square color "${color}".`
            );
        }
        return TASK_SQUARES[color];
    }

    throw new RangeError(
        `getShapeCharacter: unknown shape "${shape}".`
    );
}

/* ==========================================================================
   1f Reusable character matching
   ========================================================================== */

function canonicalizeTaskCharacter(character) {
    if (
        character === undefined ||
        character === null
    ) {
        return undefined;
    }

    const value = String(character);

    for (const digit of TASK_DIGIT_KEYS) {
        if (
            TASK_DIGITS[digit].includes(value)
        ) {
            return digit;
        }
    }

    for (const letter of TASK_ALPHABET_KEYS) {
        if (
            TASK_ALPHABETS[letter].includes(value)
        ) {
            return letter;
        }
    }

    return value;
}


function taskCharactersMatch(
    characterA,
    characterB
) {
    return (
        canonicalizeTaskCharacter(characterA) ===
        canonicalizeTaskCharacter(characterB)
    );
}


function taskCharacterInGroup(
    character,
    characters
) {
    const canonicalCharacter =
        canonicalizeTaskCharacter(character);

    return characters.some(
        (candidate) =>
            canonicalizeTaskCharacter(candidate) ===
            canonicalCharacter
    );
}


/* ==========================================================================
   1g Reusable cell conversion
   ========================================================================== */

function createTaskCellsFromHexes(
    hexes,
    options = {}
) {
    if (!Array.isArray(hexes)) {
        throw new TypeError(
            "createTaskCellsFromHexes: hexes must be an array."
        );
    }

    const {
        useUniqueAlphabet = false
    } = options;

    const fallbackCharacters =
        useUniqueAlphabet
            ? createUniqueRandomTaskAlphabetCharacters(
                  hexes.length
              )
            : createRandomTaskAlphabetCharacters(
                  hexes.length
              );

    return hexes.map((hex, index) => ({
        index: hex.index,

        content:
            hex.character !== undefined
                ? hex.character
                : fallbackCharacters[index] ?? "",

        backgroundColor:
            HexTaskLoader.COLOR_HEX[
                hex.backgroundColorKey
            ] || ""
    }));
}


/* ==========================================================================
   2. Startup loading
   ========================================================================== */

const HexTaskLoader = {
    currentLanguage: "en",

    COLOR_HEX: {
        red: "#e74c3c",
        green: "#27ae60",
        blue: "#2980b9"
    },

    neighbors: {
        0: [1, 2, 3, 4, 5, 6],
        1: [0, 2, 6],
        2: [0, 1, 3],
        3: [0, 2, 4],
        4: [0, 3, 5],
        5: [0, 4, 6],
        6: [0, 5, 1]
    },

    async loadData() {
        return {};
    }
};


let PATH_DATA = null;


async function loadPathData() {
    try {
        const response =
            await fetch("path.json");

        if (!response.ok) {
            throw new Error(
                `Failed to load path.json: ` +
                `${response.status} ` +
                `${response.statusText}`
            );
        }

        const data =
            await response.json();

        if (
            !data ||
            typeof data.boardSize !== "number" ||
            !data.paths ||
            typeof data.paths !== "object"
        ) {
            throw new Error(
                "path.json has an invalid structure."
            );
        }

        PATH_DATA = data;
    } catch (error) {
        console.error(
            "Error loading path.json:",
            error
        );

        throw error;
    }
}


const pathDataReady =
    loadPathData();


/* ==========================================================================
   3.01 Task 01 — Select All Colour/Shape
   ========================================================================== */

const TASK01_SHAPES = Object.freeze([
    "circle",
    "square"
]);


/* ==========================================================================
   3.01a Task 01 generator
   ========================================================================== */

async function generateTask01(difficulty) {
    if (![0, 1, 2, 3].includes(difficulty)) {
        throw new RangeError(
            "generateTask01: difficulty must be 0, 1, 2, or 3."
        );
    }

    await pathDataReady;

    const {
        boardSize,
        paths
    } = PATH_DATA;

    /*
     * Difficulty 0 uses the specified lengths.
     * Difficulties 1–3 use paths of length 4, 5, or 6.
     */
    const answerLength =
        difficulty === 0
            ? randomChoice([2, 6, 7])
            : randomInt(4, 6);

    const candidates =
        paths[String(answerLength)];

    if (
        !Array.isArray(candidates) ||
        candidates.length === 0
    ) {
        throw new Error(
            `generateTask01: no paths of length ${answerLength} in path.json.`
        );
    }

    /*
     * Select one canonical path, then retain every candidate
     * containing the same cells. This allows equivalent path
     * representations while preventing unrelated answers.
     */
    const baseAnswerPath = [
        ...randomChoice(candidates)
    ];

    const answerPaths = candidates
        .filter(path =>
            sameUnorderedCells(
                path,
                baseAnswerPath
            )
        )
        .map(path => [...path]);

    if (answerPaths.length === 0) {
        throw new Error(
            "generateTask01: no valid answer paths found."
        );
    }

    /*
     * Difficulties 0 and 1 use coloured hexes only.
     * Difficulties 2 and 3 may use hexes, circles, or squares.
     */
    const mode =
        difficulty < 2
            ? "HEX_COLOR"
            : randomChoice([
                  "HEX_COLOR",
                  "CIRCLE_CHARACTER",
                  "SQUARE_CHARACTER"
              ]);

    /*
     * Difficulty 0 always has one target colour.
     * Other difficulties can use one or two target colours.
     */
    const colorCount =
        difficulty === 0
            ? 1
            : randomInt(1, 2);

    const targetColors =
        randomUniqueItems(
            TASK_COLORS,
            colorCount
        );

    /*
     * Difficulty 0 never uses negation.
     * Difficulties 1–3 may ask for target items or all except targets.
     */
    const negated =
        difficulty >= 1 &&
        randomBoolean();

    const hexes = createTask01Hexes({
        boardSize,
        answerPath: baseAnswerPath,
        mode,
        target: {
            colors: targetColors,
            negated
        },
        difficulty
    });

    const cells =
        createTaskCellsFromHexes(hexes);

    const targetCell =
        cells[baseAnswerPath[0]];

    const task = {
        type: "findPath",

        data: {
            difficulty,
            target: targetCell.content,
            answerLength
        },

        instruction: {
            template: getTask01Template(
                mode,
                negated
            ),

            mode,
            negated,

            targetColors,
            colors: targetColors,

            tokenSources: {
                colors: "tasks.colors"
            }
        },

        cells,
        answerPaths
    };

    if (
        !validateTask01(
            task,
            baseAnswerPath
        )
    ) {
        throw new Error(
            "generateTask01 created an invalid task."
        );
    }

    return task;
}

/* ==========================================================================
   3.01b Task 01 templates
   ========================================================================== */

function getTask01Template(
    mode,
    negated
) {
    if (mode === "HEX_COLOR") {
        return negated
            ? "hexesExcept"
            : "hexes";
    }

    if (mode === "CIRCLE_CHARACTER") {
        return negated
            ? "circlesExcept"
            : "circles";
    }

    if (mode === "SQUARE_CHARACTER") {
        return negated
            ? "squaresExcept"
            : "squares";
    }

    throw new Error(
        `Unknown Task 01 mode: ${mode}`
    );
}


/* ==========================================================================
   3.01c Task 01 hex generation
   ========================================================================== */

function createTask01Hexes({
    boardSize,
    answerPath,
    mode,
    target,
    difficulty
}) {
    const answerSet =
        new Set(answerPath);

    if (mode === "HEX_COLOR") {
        return createTask01ColorHexes({
            boardSize,
            answerSet,
            target,
            difficulty
        });
    }

    if (mode === "CIRCLE_CHARACTER") {
        if (difficulty === 3) {
            return createTask01Difficulty3ShapeHexes({
                boardSize,
                answerSet,
                target,
                targetShape: "circle"
            });
        }

        return createTask01SingleShapeHexes({
            boardSize,
            answerSet,
            target,
            shape: "circle"
        });
    }

    if (mode === "SQUARE_CHARACTER") {
        if (difficulty === 3) {
            return createTask01Difficulty3ShapeHexes({
                boardSize,
                answerSet,
                target,
                targetShape: "square"
            });
        }

        return createTask01SingleShapeHexes({
            boardSize,
            answerSet,
            target,
            shape: "square"
        });
    }

    throw new Error(
        `Unsupported Task 01 mode: ${mode}`
    );
}


function createTask01ColorHexes({
    boardSize,
    answerSet,
    target,
    difficulty
}) {
    return Array.from(
        { length: boardSize },
        (_, index) => {
            const isAnswer =
                answerSet.has(index);

            const backgroundColorKey =
                isAnswer
                    ? chooseTask01AnswerColor(target)
                    : chooseTask01FillerColor(target);

            return {
                index,
                backgroundColorKey,

                character:
                    difficulty === 3
                        ? createRandomShapeCharacter()
                        : undefined
            };
        }
    );
}


function chooseTask01AnswerColor(target) {
    if (!target.negated) {
        return randomChoice(target.colors);
    }

    const allowedColors =
        TASK_COLORS.filter(
            (color) =>
                !target.colors.includes(color)
        );

    if (allowedColors.length === 0) {
        throw new Error(
            "Negated target has no possible answer color."
        );
    }

    return randomChoice(allowedColors);
}


function chooseTask01FillerColor(target) {
    if (!target.negated) {
        const fillerColors =
            TASK_COLORS.filter(
                (color) =>
                    !target.colors.includes(color)
            );

        if (fillerColors.length === 0) {
            throw new Error(
                "Positive target has no possible filler color."
            );
        }

        return randomChoice(fillerColors);
    }

    return randomChoice(target.colors);
}


function createTask01SingleShapeHexes({
    boardSize,
    answerSet,
    target,
    shape
}) {
    const answerCharacters =
        getTask01MatchingCharacters(
            shape,
            target
        );

    const fillerCharacters =
        getTask01NonMatchingCharacters(
            shape,
            target
        );

    if (answerCharacters.length === 0) {
        throw new Error(
            "Target has no possible answer characters."
        );
    }

    if (fillerCharacters.length === 0) {
        throw new Error(
            "Target has no possible filler characters."
        );
    }

    return Array.from(
        { length: boardSize },
        (_, index) => ({
            index,

            backgroundColorKey:
                randomChoice(TASK_COLORS),

            character:
                answerSet.has(index)
                    ? randomChoice(answerCharacters)
                    : randomChoice(fillerCharacters)
        })
    );
}


function createTask01Difficulty3ShapeHexes({
    boardSize,
    answerSet,
    target,
    targetShape
}) {
    const answerColors =
        getTask01AnswerColors(target);

    const fillerOptions =
        getTask01Difficulty3FillerOptions(
            target,
            targetShape
        );

    if (answerColors.length === 0) {
        throw new Error(
            "Difficulty 3 has no possible answer colours."
        );
    }

    if (fillerOptions.length === 0) {
        throw new Error(
            "Difficulty 3 has no possible filler characters."
        );
    }

    return Array.from(
        { length: boardSize },
        (_, index) => {
            const isAnswer =
                answerSet.has(index);

            if (isAnswer) {
                const color =
                    randomChoice(answerColors);

                return {
                    index,
                    backgroundColorKey: color,
                    character:
                        getTask01ShapeCharacter(
                            targetShape,
                            color
                        )
                };
            }

            const filler =
                randomChoice(fillerOptions);

            return {
                index,
                backgroundColorKey:
                    filler.backgroundColorKey,
                character:
                    filler.character
            };
        }
    );
}


function getTask01AnswerColors(target) {
    if (!target.negated) {
        return [...target.colors];
    }

    return TASK_COLORS.filter(
        (color) =>
            !target.colors.includes(color)
    );
}


function getTask01Difficulty3FillerOptions(
    target,
    targetShape
) {
    const otherShape =
        targetShape === "circle"
            ? "square"
            : "circle";

    const options = [];

    const sameShapeWrongColor =
        target.negated
            ? target.colors
            : TASK_COLORS.filter(
                  (color) =>
                      !target.colors.includes(color)
              );

    for (const color of sameShapeWrongColor) {
        options.push({
            backgroundColorKey: color,
            character:
                getTask01ShapeCharacter(
                    targetShape,
                    color
                )
        });
    }

    const wrongShapeSameColor =
        target.negated
            ? TASK_COLORS.filter(
                  (color) =>
                      !target.colors.includes(color)
              )
            : target.colors;

    for (const color of wrongShapeSameColor) {
        options.push({
            backgroundColorKey: color,
            character:
                getTask01ShapeCharacter(
                    otherShape,
                    color
                )
        });
    }

    return options;
}


/* ==========================================================================
   3.01d Task 01 character helpers
   ========================================================================== */

function createRandomShapeCharacter() {
    const shape =
        randomChoice(TASK01_SHAPES);

    const color =
        randomChoice(TASK_COLORS);

    return getTask01ShapeCharacter(
        shape,
        color
    );
}


function getTask01ShapeCharacter(
    shape,
    color
) {
    if (shape === "circle") {
        return TASK_CIRCLES[color];
    }

    if (shape === "square") {
        return TASK_SQUARES[color];
    }

    throw new Error(
        `Unknown Task 01 shape: ${shape}`
    );
}


function getTask01MatchingCharacters(
    shape,
    target
) {
    const matchingColors =
        target.negated
            ? TASK_COLORS.filter(
                  (color) =>
                      !target.colors.includes(color)
              )
            : target.colors;

    return matchingColors.map(
        (color) =>
            getTask01ShapeCharacter(
                shape,
                color
            )
    );
}


function getTask01NonMatchingCharacters(
    shape,
    target
) {
    const nonMatchingColors =
        target.negated
            ? target.colors
            : TASK_COLORS.filter(
                  (color) =>
                      !target.colors.includes(color)
              );

    return nonMatchingColors.map(
        (color) =>
            getTask01ShapeCharacter(
                shape,
                color
            )
    );
}


/* ==========================================================================
   3.01e Task 01 validation
   ========================================================================== */

function validateTask01(
    task,
    answerPath
) {
    if (
        !task ||
        !Array.isArray(task.cells) ||
        !Array.isArray(task.answerPaths)
    ) {
        return false;
    }

    if (task.answerPaths.length === 0) {
        return false;
    }

    const answerSet =
        new Set(answerPath);

    for (const path of task.answerPaths) {
        if (
            !sameUnorderedCells(
                path,
                answerPath
            )
        ) {
            return false;
        }
    }

    for (const cell of task.cells) {
        const isAnswer =
            answerSet.has(Number(cell.index));

        const matches =
            matchesTask01Target(
                cell,
                task.instruction
            );

        if (isAnswer !== matches) {
            return false;
        }
    }

    return true;
}


function matchesTask01Target(
    cell,
    instruction
) {
    if (instruction.mode === "HEX_COLOR") {
        const color =
            getTask01ColorFromBackground(
                cell.backgroundColor
            );

        if (color === undefined) {
            return false;
        }

        const matches =
            instruction.colors.includes(color);

        return instruction.negated
            ? !matches
            : matches;
    }

    if (
        instruction.mode ===
        "CIRCLE_CHARACTER"
    ) {
        return matchesTask01ShapeTarget(
            cell.content,
            "circle",
            instruction.colors,
            instruction.negated
        );
    }

    if (
        instruction.mode ===
        "SQUARE_CHARACTER"
    ) {
        return matchesTask01ShapeTarget(
            cell.content,
            "square",
            instruction.colors,
            instruction.negated
        );
    }

    return false;
}


function matchesTask01ShapeTarget(
    character,
    shape,
    targetColors,
    negated
) {
    const targetCharacters =
        targetColors.map(
            (color) =>
                getTask01ShapeCharacter(
                    shape,
                    color
                )
        );

    const matches =
        targetCharacters.includes(character);

    return negated
        ? !matches
        : matches;
}


function getTask01ColorFromBackground(
    backgroundColor
) {
    return Object.keys(
        HexTaskLoader.COLOR_HEX
    ).find(
        (color) =>
            HexTaskLoader.COLOR_HEX[color] ===
            backgroundColor
    );
}

/* ==========================================================================
   3.02 TASK 02 — FIND PATH
   ========================================================================== */

const TASK02_SHAPES = Object.freeze([
    "circle",
    "square"
]);

const TASK02_DIRECTIONS = Object.freeze([
    "clockwise",
    "anticlockwise"
]);

const TASK02_ANCHOR_TYPES = Object.freeze([
    "startingFrom",
    "endingOn"
]);


const TASK02_ANTICLOCKWISE_RING = Object.freeze([
    6, 5, 4, 3, 2, 1,
    6, 5, 4, 3, 2, 1
]);

const TASK02_CLOCKWISE_RING = Object.freeze([
    1, 2, 3, 4, 5, 6,
    1, 2, 3, 4, 5, 6
]);


/* ==========================================================================
   3.02a Utility functions
   ========================================================================== */

function task02RandomChoice(items) {
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error(
            "task02RandomChoice: items must be a non-empty array."
        );
    }

    return items[
        Math.floor(Math.random() * items.length)
    ];
}


function task02RandomBoolean() {
    return Math.random() < 0.5;
}


function task02SamePath(pathA, pathB) {
    if (
        !Array.isArray(pathA) ||
        !Array.isArray(pathB) ||
        pathA.length !== pathB.length
    ) {
        return false;
    }

    return pathA.every(
        (value, index) =>
            Number(value) === Number(pathB[index])
    );
}


function task02DeduplicatePaths(paths) {
    const seen = new Set();
    const uniquePaths = [];

    for (const path of paths) {
        const key = path.join("-");

        if (!seen.has(key)) {
            seen.add(key);
            uniquePaths.push([...path]);
        }
    }

    return uniquePaths;
}


/* ==========================================================================
   3.02b Directional circular paths
   ========================================================================== */

function getTask02DirectionalPaths(
    length,
    direction
) {
    if (
        !Number.isInteger(length) ||
        length < 2 ||
        length > 6
    ) {
        return [];
    }

    const ring =
        direction === "clockwise"
            ? TASK02_CLOCKWISE_RING
            : direction === "anticlockwise"
                ? TASK02_ANTICLOCKWISE_RING
                : null;

    if (!ring) {
        return [];
    }

    const paths = [];

    /*
     * There are six possible starting positions around the outer ring.
     * The doubled ring allows paths to wrap around.
     */
    for (let start = 0; start < 6; start += 1) {
        const path =
            ring.slice(start, start + length);

        if (
            path.length === length &&
            new Set(path).size === path.length
        ) {
            paths.push([...path]);
        }
    }

    return task02DeduplicatePaths(paths);
}


function getTask02PathDirection(path) {
    if (!Array.isArray(path) || path.length < 2) {
        return null;
    }

    const numericPath = path.map(Number);

    const clockwise =
        getTask02DirectionalPaths(
            numericPath.length,
            "clockwise"
        );

    const anticlockwise =
        getTask02DirectionalPaths(
            numericPath.length,
            "anticlockwise"
        );

    if (
        clockwise.some(candidatePath =>
            task02SamePath(
                candidatePath,
                numericPath
            )
        )
    ) {
        return "clockwise";
    }

    if (
        anticlockwise.some(candidatePath =>
            task02SamePath(
                candidatePath,
                numericPath
            )
        )
    ) {
        return "anticlockwise";
    }

    return null;
}


/* ==========================================================================
   3.02c Cell condition generation
   ========================================================================== */

function createTask02CellConditions({
    boardSize,
    originalPath,
    anchorIndex
}) {
    if (boardSize !== 7) {
        throw new Error(
            "createTask02CellConditions: boardSize must be 7."
        );
    }

    if (
        !Array.isArray(originalPath) ||
        originalPath.length === 0 ||
        !originalPath.includes(anchorIndex)
    ) {
        throw new Error(
            "createTask02CellConditions: invalid originalPath or anchorIndex."
        );
    }

    const conditions = {};

    /*
     * The center hex always defies the condition.
     */
    conditions[0] = false;

    for (let index = 1; index < boardSize; index += 1) {
        /*
         * The original path's designated anchor is always true.
         */
        if (index === anchorIndex) {
            conditions[index] = true;
            continue;
        }

        /*
         * Every other hex is independently true or false.
         */
        conditions[index] = task02RandomBoolean();
    }

    return conditions;
}


/* ==========================================================================
   3.02d Board generation
   ========================================================================== */

function createTask02Board({
    boardSize,
    difficulty,
    targetColor,
    targetShape,
    cellConditions
}) {
    return Array.from(
        { length: boardSize },
        (_, index) => {
            const followsCondition =
                cellConditions[index] === true;

            return followsCondition
                ? createTask02TrueCell({
                    index,
                    difficulty,
                    targetColor,
                    targetShape
                })
                : createTask02FalseCell({
                    index,
                    difficulty,
                    targetColor,
                    targetShape
                });
        }
    );
}


function createTask02TrueCell({
    index,
    difficulty,
    targetColor,
    targetShape
}) {
    if (difficulty === 0) {
        return {
            index,
            backgroundColorKey: targetColor,
            character: undefined,
            shape: "hex",
            followsCondition: true
        };
    }

    return {
        index,
        backgroundColorKey:
            task02RandomChoice(TASK_COLORS),

        character:
            getShapeCharacter(
                targetShape,
                targetColor
            ),

        shape: targetShape,
        followsCondition: true
    };
}


function createTask02FalseCell({
    index,
    difficulty,
    targetColor,
    targetShape
}) {
    if (difficulty === 0) {
        const nonTargetColors =
            TASK_COLORS.filter(
                color => color !== targetColor
            );

        return {
            index,
            backgroundColorKey:
                task02RandomChoice(nonTargetColors),

            character: undefined,
            shape: "hex",
            followsCondition: false
        };
    }

    const nonTargetShapes =
        TASK02_SHAPES.filter(
            shape => shape !== targetShape
        );

    const nonTargetColors =
        TASK_COLORS.filter(
            color => color !== targetColor
        );

    const falseShape =
        task02RandomChoice(nonTargetShapes);

    const falseColor =
        task02RandomChoice(nonTargetColors);

    return {
        index,
        backgroundColorKey:
            task02RandomChoice(TASK_COLORS),

        character:
            getShapeCharacter(
                falseShape,
                falseColor
            ),

        shape: falseShape,
        followsCondition: false
    };
}


/* ==========================================================================
   3.02e Cell conversion
   ========================================================================== */

function convertTask02BoardToCells(board) {
    const colorMap = {
        red: HexTaskLoader.COLOR_HEX.red,
        green: HexTaskLoader.COLOR_HEX.green,
        blue: HexTaskLoader.COLOR_HEX.blue
    };

    const alphabetCharacters =
        createRandomTaskAlphabetCharacters(
            board.length
        );

    return board.map((cell, index) => ({
        index: cell.index,

        content:
            cell.character !== undefined
                ? cell.character
                : alphabetCharacters[index] ?? "",

        backgroundColor:
            colorMap[cell.backgroundColorKey] || "",

        shape: cell.shape
    }));
}


/* ==========================================================================
   3.02f Answer-path generation
   ========================================================================== */

function findTask02AnswerPaths({
    originalPath,
    cellConditions,
    answerLength,
    direction,
    anchorType
}) {
    if (
        !Array.isArray(originalPath) ||
        originalPath.length !== answerLength
    ) {
        throw new Error(
            "findTask02AnswerPaths: invalid originalPath length."
        );
    }

    const candidatePaths =
        getTask02DirectionalPaths(
            answerLength,
            direction
        );

    const answerPaths = [];

    /*
     * The original path is always included.
     *
     * Its anchor was forced true during condition generation.
     */
    answerPaths.push([
        ...originalPath
    ]);

    for (const path of candidatePaths) {
        const pathAnchorIndex =
            anchorType === "startingFrom"
                ? path[0]
                : path[path.length - 1];

        /*
         * A path is an answer when its relevant anchor is true.
         *
         * Other cells in the path may be true or false.
         */
        if (
            cellConditions[pathAnchorIndex] !== true
        ) {
            continue;
        }

        answerPaths.push([...path]);
    }

    return task02DeduplicatePaths(answerPaths);
}


/* ==========================================================================
   3.02g Task generation
   ========================================================================== */

async function generateTask02(difficulty) {
    if (![0, 1, 2].includes(difficulty)) {
        throw new RangeError(
            "generateTask02: difficulty must be 0, 1, or 2."
        );
    }

    await pathDataReady;

    const { boardSize } = PATH_DATA;

    if (boardSize !== 7) {
        throw new Error(
            "generateTask02 requires a seven-cell board."
        );
    }

    const answerLength =
        task02RandomChoice([4, 5, 6]);

    const direction =
        task02RandomChoice(TASK02_DIRECTIONS);

    const anchorType =
        difficulty === 0
            ? "startingFrom"
            : task02RandomChoice(TASK02_ANCHOR_TYPES);

    const targetColor =
        task02RandomChoice(TASK_COLORS);

    const targetShape =
        difficulty === 0
            ? "hex"
            : task02RandomChoice(TASK02_SHAPES);

    const mode =
        difficulty === 0
            ? "HEX_COLOR"
            : difficulty === 1
                ? "SINGLE_SHAPE"
                : "MIXED_SHAPES";

    /*
     * Choose the original path.
     *
     * This path is always included in answerPaths.
     */
    const candidatePaths =
        getTask02DirectionalPaths(
            answerLength,
            direction
        );

    if (candidatePaths.length === 0) {
        throw new Error(
            "generateTask02: no candidate paths available."
        );
    }

    const originalPath =
        [...task02RandomChoice(candidatePaths)];

    const anchorIndex =
        anchorType === "startingFrom"
            ? originalPath[0]
            : originalPath[originalPath.length - 1];

    /*
     * Generate true/false conditions.
     *
     * - Hex 0 is always false.
     * - The original anchor is always true.
     * - Every other hex is random.
     */
    const cellConditions =
        createTask02CellConditions({
            boardSize,
            originalPath,
            anchorIndex
        });

    /*
     * Generate the visible board from those conditions.
     */
    const board =
        createTask02Board({
            boardSize,
            difficulty,
            targetColor,
            targetShape,
            cellConditions
        });

    const cells =
        convertTask02BoardToCells(board);

    /*
     * Generate all same-length, same-direction paths whose anchor is true.
     */
    const answerPaths =
        findTask02AnswerPaths({
            originalPath,
            cellConditions,
            answerLength,
            direction,
            anchorType
        });

    if (answerPaths.length === 0) {
        throw new Error(
            "generateTask02: no answer paths were generated."
        );
    }

    if (
        !answerPaths.some(path =>
            task02SamePath(path, originalPath)
        )
    ) {
        throw new Error(
            "generateTask02: original path is missing from answer paths."
        );
    }

    const task = {
        type: "findPath",

        data: {
            difficulty,
            answerLength,
            mode,
            shape: targetShape,
            anchorType,
            direction,
            anchorIndex
        },

        instruction: {
            template:
                anchorType === "endingOn"
                    ? "task02_endingOn"
                    : "task02_startingFrom",

            mode,
            negated: false,

            targetColors: [targetColor],
            colors: [targetColor],

            color: targetColor,
            shape: targetShape,
            length: answerLength,
            direction,
            anchorType,

            tokenSources: {
                color: "tasks.colors",
                colors: "tasks.colors",
                shape: "tasks.shapes",
                direction: "tasks.directions",
                anchorType: "tasks.anchors"
            }
        },

        cells,

        answerPaths: answerPaths.map(path => [
            ...path
        ])
    };

    /*
     * Validate against the exact conditions used to create the board.
     */
    if (
        !validateTask02({
            task,
            originalPath,
            cellConditions
        })
    ) {
        console.error(
            "Task 02 validation failed:",
            {
                task,
                originalPath,
                cellConditions
            }
        );

        throw new Error(
            "generateTask02 created an invalid task."
        );
    }

    return task;
}


/* ==========================================================================
   3.02h Validation
   ========================================================================== */

function validateTask02({
    task,
    originalPath,
    cellConditions
}) {
    if (!task) {
        return false;
    }

    if (
        !task.data ||
        !task.instruction ||
        !Array.isArray(task.cells) ||
        !Array.isArray(task.answerPaths)
    ) {
        return false;
    }

    const {
        answerLength,
        direction,
        anchorType
    } = task.data;

    if (
        !Array.isArray(originalPath) ||
        originalPath.length !== answerLength
    ) {
        return false;
    }

    if (
        getTask02PathDirection(originalPath) !==
        direction
    ) {
        return false;
    }

    /*
     * The center cell must always be false.
     */
    if (cellConditions[0] !== false) {
        return false;
    }

    /*
     * The original path must be included.
     */
    if (
        !task.answerPaths.some(path =>
            task02SamePath(path, originalPath)
        )
    ) {
        return false;
    }

    /*
     * Every answer path must:
     * - have the requested length;
     * - use the requested direction;
     * - have a true anchor.
     */
    for (const path of task.answerPaths) {
        if (
            !Array.isArray(path) ||
            path.length !== answerLength
        ) {
            return false;
        }

        if (
            getTask02PathDirection(path) !==
            direction
        ) {
            return false;
        }

        const pathAnchorIndex =
            anchorType === "startingFrom"
                ? path[0]
                : path[path.length - 1];

        if (
            cellConditions[pathAnchorIndex] !== true
        ) {
            return false;
        }
    }

    return true;
}


/* ==========================================================================
   3.02i Registration
   ========================================================================== */

/*
 * Do not declare a new taskGenerators object here.
 *
 * Register into the existing one defined elsewhere in task.js:
 *
 *     const taskGenerators = { ... };
 */
if (
    typeof window !== "undefined" &&
    typeof window.taskGenerators === "object" &&
    window.taskGenerators !== null
) {
    window.taskGenerators[2] =
        generateTask02;
}

/* ==========================================================================
   3.03 Task 03
   ========================================================================== */


/* ==========================================================================
   3.03a Configuration
   ========================================================================== */

const TASK03_VALUE_TYPES = Object.freeze([
    "numbers",
    "alphabets"
]);

const TASK03_ORDERS = Object.freeze([
    "ascending",
    "descending"
]);


/* ==========================================================================
   3.03b Task generation
   ========================================================================== */

function generateTask03(difficulty) {
    if (![0, 1, 2, 3].includes(difficulty)) {
        throw new RangeError(
            "generateTask03: difficulty must be 0, 1, 2, or 3."
        );
    }

    const {
        boardSize,
        paths
    } = PATH_DATA;

    const answerLength =
        getTask03AnswerLength(difficulty);

    const pathCandidates =
        paths[String(answerLength)];

    if (
        !Array.isArray(pathCandidates) ||
        pathCandidates.length === 0
    ) {
        throw new Error(
            `generateTask03: no paths found for length ${answerLength}.`
        );
    }

    const answerPath = [
        ...randomChoice(pathCandidates)
    ];

    if (
        new Set(answerPath).size !==
        answerPath.length
    ) {
        throw new Error(
            "generateTask03: answer path contains repeated cells."
        );
    }

    const valueType =
        getTask03ValueType(difficulty);

    const order =
        getTask03Order(difficulty);

    const answerValues =
        createTask03AnswerValues({
            valueType,
            order,
            count: answerLength
        });

    const answerCells =
        createTask03AnswerCells({
            answerPath,
            answerValues,
            valueType
        });

    const answerCellMap =
        new Map(
            answerCells.map(cell => [
                Number(cell.index),
                cell
            ])
        );

    const hexes =
        Array.from(
            { length: boardSize },
            (_, index) => {
                if (answerCellMap.has(index)) {
                    return answerCellMap.get(index);
                }

                return createTask03FillerHex({
                    difficulty,
                    answerValueType: valueType
                });
            }
        ).map((hex, index) => ({
            ...hex,
            index
        }));

    const cells =
        createTaskCellsFromHexes(hexes);

    const task = {
        type: "task03",

        data: {
            difficulty,
            answerLength,
            valueType,
            order,
            answerPath: [...answerPath],
            answerValues: [...answerValues]
        },

        instruction: {
            template: "task03_orderValues",

                valueType,
                    order,
                    length: answerLength,

            tokenSources: {
                valueType: "tasks.valueTypes",
                order: "tasks.orders"
            }
        },

        cells,

        answerPaths: [
            [...answerPath]
        ]
    };

    if (
        !validateTask03(
            task,
            answerPath
        )
    ) {
        throw new Error(
            "generateTask03: generated task failed validation."
        );
    }

    return task;
}


/* ==========================================================================
   3.03c Difficulty rules
   ========================================================================== */

function getTask03AnswerLength(difficulty) {
    if (difficulty === 0) {
        return 3;
    }

    if (difficulty === 1) {
        return randomChoice([4, 5]);
    }

    return randomChoice([6, 7]);
}


function getTask03ValueType(difficulty) {
    if (difficulty === 0) {
        return "numbers";
    }

    return randomChoice(TASK03_VALUE_TYPES);
}


function getTask03Order(difficulty) {
    if (
        difficulty === 0 ||
        difficulty === 1
    ) {
        return "ascending";
    }

    return randomChoice(TASK03_ORDERS);
}


/* ==========================================================================
   3.03d Answer-value generation
   ========================================================================== */

function createTask03AnswerValues({
    valueType,
    order,
    count
}) {
    if (
        !TASK03_VALUE_TYPES.includes(valueType)
    ) {
        throw new RangeError(
            `Unknown Task03 value type: ${valueType}`
        );
    }

    if (
        !TASK03_ORDERS.includes(order)
    ) {
        throw new RangeError(
            `Unknown Task03 order: ${order}`
        );
    }

    if (
        !Number.isInteger(count) ||
        count < 1
    ) {
        throw new RangeError(
            "createTask03AnswerValues: invalid count."
        );
    }

    const keys =
        valueType === "numbers"
            ? TASK_DIGIT_KEYS
            : TASK_ALPHABET_KEYS;

    if (count > keys.length) {
        throw new RangeError(
            "createTask03AnswerValues: not enough unique values."
        );
    }

    const selectedKeys =
        randomUniqueItems(keys, count);

    selectedKeys.sort((a, b) => {
        if (valueType === "numbers") {
            return Number(a) - Number(b);
        }

        return a.localeCompare(b);
    });

    if (order === "descending") {
        selectedKeys.reverse();
    }

    return selectedKeys;
}


/* ==========================================================================
   3.03e Answer-cell generation
   ========================================================================== */

function createTask03AnswerCells({
    answerPath,
    answerValues,
    valueType
}) {
    if (
        !Array.isArray(answerPath) ||
        !Array.isArray(answerValues) ||
        answerPath.length !== answerValues.length
    ) {
        throw new Error(
            "createTask03AnswerCells: path/value length mismatch."
        );
    }

    return answerPath.map((index, position) => {
        const value =
            answerValues[position];

        const character =
            valueType === "numbers"
                ? randomChoice(
                    getTaskDigitVariants(value)
                )
                : randomChoice(
                    getTaskAlphabetVariants(value)
                );

        return {
            index: Number(index),
            character,
            backgroundColorKey:
                randomChoice(TASK_COLORS)
        };
    });
}


/* ==========================================================================
   3.03f Filler generation
   ========================================================================== */

function createTask03FillerHex({
    difficulty,
    answerValueType
}) {
    const fillerMode =
        getTask03FillerMode({
            difficulty,
            answerValueType
        });

    if (fillerMode === "shapes") {
        const shape =
            randomChoice(["circle", "square"]);

        const color =
            randomChoice(TASK_COLORS);

        return {
            character:
                shape === "circle"
                    ? TASK_CIRCLES[color]
                    : TASK_SQUARES[color],

            backgroundColorKey:
                color,

            shape
        };
    }

    const fillerValueType =
        fillerMode === "numbers"
            ? "numbers"
            : "alphabets";

    const character =
        fillerValueType === "numbers"
            ? getRandomTaskNumberCharacter()
            : getRandomTaskAlphabetCharacter();

    return {
        character,
        backgroundColorKey:
            randomChoice(TASK_COLORS)
    };
}


function getTask03FillerMode({
    difficulty,
    answerValueType
}) {
    if (difficulty === 0) {
        return "shapes";
    }

    if (difficulty === 1) {
        return randomChoice([
            "shapes",
            answerValueType === "numbers"
                ? "alphabets"
                : "numbers"
        ]);
    }

    return answerValueType === "numbers"
        ? "alphabets"
        : "numbers";
}


/* ==========================================================================
   3.03g Validation
   ========================================================================== */

function validateTask03(
    task,
    userPath
) {
    if (
        !task ||
        !task.data ||
        !task.instruction ||
        !Array.isArray(task.cells) ||
        !Array.isArray(task.answerPaths) ||
        !Array.isArray(userPath)
    ) {
        return false;
    }

    const {
        difficulty,
        answerLength,
        valueType,
        order,
        answerPath
    } = task.data;

    if (
        ![0, 1, 2, 3].includes(difficulty) ||
        !Number.isInteger(answerLength) ||
        !TASK03_VALUE_TYPES.includes(valueType) ||
        !TASK03_ORDERS.includes(order) ||
        !Array.isArray(answerPath)
    ) {
        return false;
    }

    if (
        userPath.length !== answerLength ||
        answerPath.length !== answerLength
    ) {
        return false;
    }

    /*
     * Task03 accepts only the originally selected path,
     * in the originally selected order.
     */
    if (!sameOrderedTask03Path(userPath, answerPath)) {
        return false;
    }

    /*
     * The task must expose only one valid answer path.
     */
    if (task.answerPaths.length !== 1) {
        return false;
    }

    if (
        !sameOrderedTask03Path(
            task.answerPaths[0],
            answerPath
        )
    ) {
        return false;
    }

    const values = [];

    for (const index of userPath) {
        const cell =
            task.cells.find(
                candidate =>
                    Number(candidate.index) ===
                    Number(index)
            );

        if (!cell) {
            return false;
        }

        const canonicalValue =
            getTask03CellValue(
                cell.content,
                valueType
            );

        if (canonicalValue === undefined) {
            return false;
        }

        values.push(canonicalValue);
    }

    if (hasRepeatedValue(values)) {
        return false;
    }

    return isTask03OrderedValues(
        values,
        valueType,
        order
    );
}


function sameOrderedTask03Path(pathA, pathB) {
    if (
        !Array.isArray(pathA) ||
        !Array.isArray(pathB) ||
        pathA.length !== pathB.length
    ) {
        return false;
    }

    return pathA.every(
        (value, index) =>
            Number(value) === Number(pathB[index])
    );
}


/* ==========================================================================
   3.03h Value extraction and ordering
   ========================================================================== */

function getTask03CellValue(
    character,
    valueType
) {
    const canonical =
        canonicalizeTaskCharacter(character);

    if (canonical === undefined) {
        return undefined;
    }

    if (
        valueType === "numbers" &&
        TASK_DIGIT_KEYS.includes(canonical)
    ) {
        return canonical;
    }

    if (
        valueType === "alphabets" &&
        TASK_ALPHABET_KEYS.includes(canonical)
    ) {
        return canonical;
    }

    return undefined;
}


function isTask03OrderedValues(
    values,
    valueType,
    order
) {
    if (
        !Array.isArray(values) ||
        values.length < 2
    ) {
        return true;
    }

    for (
        let index = 1;
        index < values.length;
        index += 1
    ) {
        const previous =
            values[index - 1];

        const current =
            values[index];

        const comparison =
            valueType === "numbers"
                ? Number(current) - Number(previous)
                : current.localeCompare(previous);

        if (
            order === "ascending" &&
            comparison <= 0
        ) {
            return false;
        }

        if (
            order === "descending" &&
            comparison >= 0
        ) {
            return false;
        }
    }

    return true;
}


/* ==========================================================================
   3.03i Rendering helpers
   ========================================================================== */

function getRenderedTask03AnswerPaths(task) {
    if (
        !task ||
        !Array.isArray(task.answerPaths)
    ) {
        return [];
    }

    return task.answerPaths.map(path => [...path]);
}

/* ==========================================================================
   3.04. Task 04
   ========================================================================== */


/* ==========================================================================
   3.04a Configuration
   ========================================================================== */

const TASK04_WORDS = Object.freeze([
    "TORONTO",
    "MEXICO",
    "CARACAS",
    "LIMA",
    "HAVANA",
    "MADRID",
    "BILBAO",
    "MALTA",
    "PARIS",
    "BERLIN",
    "EDAM",
    "GOUDA",
    "OSLO",
    "DUBAI",
    "NAIROBI",
    "BANGKOK",
    "MANILA",
    "TAIPEI",
    "OKINAWA",
    "OSAKA"
]);


/* ==========================================================================
   3.04b Task generation
   ========================================================================== */

function generateTask04(difficulty) {
    if (![0, 1].includes(difficulty)) {
        throw new RangeError(
            "generateTask04: difficulty must be 0 or 1."
        );
    }

    const {
        boardSize,
        paths
    } = PATH_DATA;

    const target =
        getTask04Target(difficulty);

    const answerLength =
        target.length;

    const pathCandidates =
        paths[String(answerLength)];

    if (
        !Array.isArray(pathCandidates) ||
        pathCandidates.length === 0
    ) {
        throw new Error(
            `generateTask04: no paths found for length ${answerLength}.`
        );
    }

    const answerPath = [
        ...randomChoice(pathCandidates)
    ];

    if (
        new Set(answerPath).size !==
        answerPath.length
    ) {
        throw new Error(
            "generateTask04: answer path contains repeated cells."
        );
    }

    const answerCharacters =
        createTask04AnswerCharacters({
            target,
            answerPath
        });

    const answerCellMap =
        new Map(
            answerCharacters.map(cell => [
                Number(cell.index),
                cell
            ])
        );

    const hexes =
        Array.from(
            { length: boardSize },
            (_, index) => {
                if (answerCellMap.has(index)) {
                    return answerCellMap.get(index);
                }

                return createTask04FillerHex({
                    difficulty,
                    target
                });
            }
        ).map((hex, index) => ({
            ...hex,
            index
        }));

    const cells =
        createTaskCellsFromHexes(hexes);

    const candidatePaths =
        createTask04CandidatePaths({
            target,
            answerPath,
            pathCandidates
        });

    const answerPaths =
        candidatePaths.filter(candidatePath =>
            pathCandidates.some(path =>
                sameOrderedTask04Path(
                    path,
                    candidatePath
                )
            )
        );

    if (answerPaths.length === 0) {
        throw new Error(
            "generateTask04: no valid answer paths were generated."
        );
    }

    const task = {
        type: "task04",

        data: {
            difficulty,
            target,
            answerLength,
            answerPath: [...answerPath]
        },

        instruction: {
            template: "task04_swipeWord",
            target,
            length: answerLength,

            // No tokenSources for word list; it's pure game data.
            tokenSources: {}
        },

        cells,

        answerPaths: answerPaths.map(path => [...path])
    };

    if (
        !validateTask04(task)
    ) {
        throw new Error(
            "generateTask04: generated task failed validation."
        );
    }

    return task;
}


/* ==========================================================================
   3.04c Difficulty rules
   ========================================================================== */

function getTask04Target(difficulty) {
    /*
     * No length-based difficulty mapping.
     * Just pick a random word from the curated list.
     */
    return randomChoice(TASK04_WORDS);
}


/* ==========================================================================
   3.04d Answer-cell generation
   ========================================================================== */

function createTask04AnswerCharacters({
    target,
    answerPath
}) {
    if (
        typeof target !== "string" ||
        !Array.isArray(answerPath) ||
        target.length !== answerPath.length
    ) {
        throw new Error(
            "createTask04AnswerCharacters: target/path length mismatch."
        );
    }

    return answerPath.map((index, position) => ({
        index: Number(index),

        character:
            getRandomTask04Character(
                target[position]
            ),

        backgroundColorKey:
            randomChoice(TASK_COLORS)
    }));
}


function getRandomTask04Character(character) {
    const canonical =
        canonicalizeTaskCharacter(character);

    if (
        TASK_ALPHABET_KEYS.includes(canonical)
    ) {
        return randomChoice(
            getTaskAlphabetVariants(canonical)
        );
    }

    throw new Error(
        `getRandomTask04Character: "${character}" is not an alphabet character.`
    );
}


/* ==========================================================================
   3.04e Candidate-path generation
   ========================================================================== */

function createTask04CandidatePaths({
    target,
    answerPath,
    pathCandidates
}) {
    const targetCharacters =
        target.split("");

    const indicesByCharacter =
        new Map();

    for (
        let position = 0;
        position < targetCharacters.length;
        position += 1
    ) {
        const canonical =
            canonicalizeTaskCharacter(
                targetCharacters[position]
            );

        if (!indicesByCharacter.has(canonical)) {
            indicesByCharacter.set(canonical, []);
        }

        indicesByCharacter
            .get(canonical)
            .push(Number(answerPath[position]));
    }

    const characterKeys =
        [...indicesByCharacter.keys()];

    const permutationsByCharacter =
        characterKeys.map(character => {
        const indices =
            indicesByCharacter.get(character);

        return createUniquePermutations(indices);
    });

    const combinations =
        createTask04CartesianProduct(
            permutationsByCharacter
        );

    const candidates = [];

    for (const combination of combinations) {
        const permutationMap =
            new Map();

        characterKeys.forEach(
            (character, characterIndex) => {
                permutationMap.set(
                    character,
                    [...combination[characterIndex]]
                );
            }
        );

        const usageCounters =
            new Map();

        const candidatePath =
            targetCharacters.map(character => {
                const canonical =
                    canonicalizeTaskCharacter(
                        character
                    );

                const values =
                    permutationMap.get(canonical);

                const usageCount =
                    usageCounters.get(canonical) || 0;

                usageCounters.set(
                    canonical,
                    usageCount + 1
                );

                return values[usageCount];
            });

        if (
            pathCandidates.some(path =>
                sameOrderedTask04Path(
                    path,
                    candidatePath
                )
            )
        ) {
            candidates.push(candidatePath);
        }
    }

    return removeDuplicateTask04Paths(candidates);
}


function createUniquePermutations(values) {
    const result = [];
    const seen = new Set();

    function visit(remaining, current) {
        if (remaining.length === 0) {
            const key =
                JSON.stringify(current);

            if (!seen.has(key)) {
                seen.add(key);
                result.push([...current]);
            }

            return;
        }

        for (
            let index = 0;
            index < remaining.length;
            index += 1
        ) {
            const nextRemaining =
                [
                    ...remaining.slice(0, index),
                    ...remaining.slice(index + 1)
                ];

            visit(
                nextRemaining,
                [
                    ...current,
                    remaining[index]
                ]
            );
        }
    }

    visit([...values], []);

    return result;
}


function createTask04CartesianProduct(groups) {
    if (groups.length === 0) {
        return [[]];
    }

    const [first, ...rest] =
        groups;

    const suffixes =
        createTask04CartesianProduct(rest);

    const result = [];

    for (const value of first) {
        for (const suffix of suffixes) {
            result.push([
                value,
                ...suffix
            ]);
        }
    }

    return result;
}


function removeDuplicateTask04Paths(paths) {
    const seen = new Set();
    const result = [];

    for (const path of paths) {
        const key =
            JSON.stringify(path);

        if (!seen.has(key)) {
            seen.add(key);
            result.push([...path]);
        }
    }

    return result;
}


/* ==========================================================================
   3.04f Filler generation
   ========================================================================== */

function createTask04FillerHex({
    difficulty,
    target
}) {
    const targetCharacters =
        target
            .split("")
            .map(character =>
                canonicalizeTaskCharacter(character)
            );

    const availableCharacters =
        getAllTaskAlphabetCharacters()
            .filter(character =>
                !targetCharacters.includes(
                    canonicalizeTaskCharacter(character)
                )
            );

    const characterPool =
        availableCharacters.length > 0
            ? availableCharacters
            : getAllTaskAlphabetCharacters();

    return {
        character:
            randomChoice(characterPool),

        backgroundColorKey:
            randomChoice(TASK_COLORS)
    };
}


/* ==========================================================================
   3.04g Validation
   ========================================================================== */

function validateTask04(task) {
    if (
        !task ||
        task.type !== "task04" ||
        !task.data ||
        !task.instruction ||
        !Array.isArray(task.cells) ||
        !Array.isArray(task.answerPaths)
    ) {
        return false;
    }

    const {
        difficulty,
        target,
        answerLength,
        answerPath
    } = task.data;

    if (
        ![0, 1].includes(difficulty) ||
        typeof target !== "string" ||
        target.length === 0 ||
        !Number.isInteger(answerLength) ||
        answerLength !== target.length ||
        !Array.isArray(answerPath) ||
        answerPath.length !== answerLength
    ) {
        return false;
    }

    if (
        !sameOrderedTask04Path(
            task.answerPaths[0],
            answerPath
        )
    ) {
        return false;
    }

    if (
        task.answerPaths.length < 1
    ) {
        return false;
    }

    const boardCells =
        new Map(
            task.cells.map(cell => [
                Number(cell.index),
                cell
            ])
        );

    for (const path of task.answerPaths) {
        if (
            !Array.isArray(path) ||
            path.length !== answerLength
        ) {
            return false;
        }

        if (
            new Set(path).size !== path.length
        ) {
            return false;
        }

        const values =
            path.map(index => {
                const cell =
                    boardCells.get(Number(index));

                return cell
                    ? canonicalizeTaskCharacter(
                        cell.content
                    )
                    : undefined;
            });

        if (
            values.some(value => value === undefined)
        ) {
            return false;
        }

        if (
            !sameUnorderedTask04Characters(
                values,
                target
            )
        ) {
            return false;
        }
    }

    return true;
}


function sameOrderedTask04Path(pathA, pathB) {
    if (
        !Array.isArray(pathA) ||
        !Array.isArray(pathB) ||
        pathA.length !== pathB.length
    ) {
        return false;
    }

    return pathA.every(
        (value, index) =>
            Number(value) === Number(pathB[index])
    );
}


function sameUnorderedTask04Characters(
    values,
    target
) {
    if (
        !Array.isArray(values) ||
        typeof target !== "string" ||
        values.length !== target.length
    ) {
        return false;
    }

    const expected =
        target
            .split("")
            .map(character =>
                canonicalizeTaskCharacter(character)
            )
            .sort();

    const actual =
        [...values].sort();

    return expected.every(
        (value, index) =>
            value === actual[index]
    );
}


/* ==========================================================================
   3.04h Rendering helpers
   ========================================================================== */

function getRenderedTask04AnswerPaths(task) {
    if (
        !task ||
        !Array.isArray(task.answerPaths)
    ) {
        return [];
    }

    return task.answerPaths.map(path => [...path]);
}

/* ==========================================================================
   4. Shared task engine
   ========================================================================== */


/*
 * This registry belongs to the engine.
 *
 */
const taskGenerators = [
    { id: "task01", generator: generateTask01, difficulties: [0,1,2,3]},
    { id: "task02", generator: generateTask02, difficulties: [0,1,2]},
    { id: "task03", generator: generateTask03, difficulties: [0,1,2,3]},
    { id: "task04", generator: generateTask04, difficulties: [0,1]}

    // Add future task generators here.
];


function validateGeneratedTask(
    task,
    generatorId
) {
    if (
        !task ||
        typeof task !== "object"
    ) {
        throw new Error(
            `${generatorId} did not return a task object.`
        );
    }

    if (!Array.isArray(task.cells)) {
        throw new Error(
            `${generatorId} did not return cells.`
        );
    }

    if (!Array.isArray(task.answerPaths)) {
        throw new Error(
            `${generatorId} did not return answerPaths.`
        );
    }

    if (task.answerPaths.length === 0) {
        throw new Error(
            `${generatorId} returned no answer paths.`
        );
    }

    const cellIndexes = new Set();

    for (const cell of task.cells) {
        if (
            !cell ||
            typeof cell !== "object"
        ) {
            throw new Error(
                `${generatorId} returned an invalid cell.`
            );
        }

        const index =
            Number(cell.index);

        if (!Number.isInteger(index)) {
            throw new Error(
                `${generatorId} returned a cell without a valid index.`
            );
        }

        if (cellIndexes.has(index)) {
            throw new Error(
                `${generatorId} returned duplicate cell index ${index}.`
            );
        }

        cellIndexes.add(index);

        if (!("content" in cell)) {
            throw new Error(
                `${generatorId} returned a cell without content.`
            );
        }
    }

    for (const answerPath of task.answerPaths) {
        if (!Array.isArray(answerPath)) {
            throw new Error(
                `${generatorId} returned an invalid answer path.`
            );
        }

        if (answerPath.length < 2) {
            throw new Error(
                `${generatorId} returned an answer path shorter than two hexes.`
            );
        }

        if (hasRepeatedValue(answerPath)) {
            throw new Error(
                `${generatorId} returned an answer path with repeated hexes.`
            );
        }

        for (const index of answerPath) {
            if (!cellIndexes.has(Number(index))) {
                throw new Error(
                    `${generatorId} returned an answer path containing ` +
                    `unknown cell ${index}.`
                );
            }
        }
    }
}


async function generateRandomTask(difficulty) {
    await pathDataReady;

    const eligibleGenerators =
        taskGenerators.filter(
            (entry) =>
                entry.difficulties.includes(
                    difficulty
                )
        );

    if (eligibleGenerators.length === 0) {
        throw new Error(
            `No task generator is available for difficulty ${difficulty}.`
        );
    }

    const selectedEntry =
        randomChoice(eligibleGenerators);

    const task =
        await selectedEntry.generator(
            difficulty
        );

    validateGeneratedTask(
        task,
        selectedEntry.id
    );

    return task;
}



/* ==========================================================================
   5. Public exports
   ========================================================================== */

export {
    generateRandomTask
};