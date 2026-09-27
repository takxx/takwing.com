// task.js
"use strict";


/* ==========================================================================
   1. Reusable constants and functions
   ========================================================================== */


/* ==========================================================================
   Shared task configuration
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
   Reusable character constants
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
   Reusable random functions
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
   Reusable character functions
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
   Reusable character matching
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
   Reusable cell conversion
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
        paths: pathsByLength
    } = PATH_DATA;

    const answerLength =
        difficulty === 0
            ? randomChoice([2, 6, 7])
            : randomInt(4, 6);

    const candidates =
        pathsByLength[String(answerLength)];

    if (
        !Array.isArray(candidates) ||
        candidates.length === 0
    ) {
        throw new Error(
            `generateTask01: no paths of length ${answerLength} in path.json.`
        );
    }

    const baseAnswerPath = [
        ...randomChoice(candidates)
    ];

    const answerPaths = candidates
        .filter((path) =>
            sameUnorderedCells(
                path,
                baseAnswerPath
            )
        )
        .map((path) => [...path]);

    if (answerPaths.length === 0) {
        throw new Error(
            "generateTask01: no valid answer paths found."
        );
    }

    const mode =
        difficulty < 2
            ? "HEX_COLOR"
            : randomChoice([
                  "HEX_COLOR",
                  "CIRCLE_CHARACTER",
                  "SQUARE_CHARACTER"
              ]);

    const colorCount =
        difficulty === 0
            ? 1
            : randomInt(1, 2);

    const targetColors =
        randomUniqueItems(
            TASK_COLORS,
            colorCount
        );

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
        createTaskCellsFromHexes(
            hexes
        );

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
            colors: targetColors
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
   3.02 Task 02
   ========================================================================== */

const TASK02_SHAPES = Object.freeze([
    "circle",
    "square"
]);

async function generateTask02(difficulty) {
    if (![0, 1, 2].includes(difficulty)) {
        throw new RangeError(
            "generateTask02: difficulty must be 0, 1, or 2."
        );
    }

    const {
        boardSize,
        paths: pathsByLength
    } = PATH_DATA;

    const answerLength = randomChoice([4, 5, 6]);

    const candidates =
        pathsByLength[String(answerLength)];

    if (
        !Array.isArray(candidates) ||
        candidates.length === 0
    ) {
        throw new Error(
            `generateTask02: no paths of length ${answerLength} found.`
        );
    }

    /*
     * Task 02 paths cannot include the centre.
     */
    const pathsWithoutCenter = candidates.filter(
        (path) => !path.includes(0)
    );

    if (pathsWithoutCenter.length === 0) {
        throw new Error(
            "generateTask02: no paths without centre found."
        );
    }

    /*
     * PATH_DATA stores paths clockwise.
     */
    const selectedClockwisePath = [
        ...randomChoice(pathsWithoutCenter)
    ];

    const direction = randomChoice([
        "clockwise",
        "anticlockwise"
    ]);

    /*
     * Convert the stored clockwise path into the
     * direction used by the instruction.
     */
    const directedSelectedPath =
        direction === "clockwise"
            ? [...selectedClockwisePath]
            : [...selectedClockwisePath].reverse();

    /*
     * Difficulty 0 uses hex colours.
     * Difficulties 1 and 2 use a circle or square anchor.
     */
    const shape =
        difficulty === 0
            ? "hex"
            : randomChoice(TASK02_SHAPES);

    const color = randomChoice(TASK_COLORS);

    /*
     * Difficulty 0 always starts from the anchor.
     * Difficulties 1 and 2 may start from or end on it.
     */
    const anchorType =
        difficulty === 0
            ? "startingFrom"
            : randomChoice([
                  "startingFrom",
                  "endingOn"
              ]);

    /*
     * The anchor is calculated from the directed path.
     */
    const anchorIndex =
        anchorType === "endingOn"
            ? directedSelectedPath[
                  directedSelectedPath.length - 1
              ]
            : directedSelectedPath[0];

    /*
     * Every valid answer:
     * - has the requested length,
     * - excludes the centre,
     * - shares at least one ordered pair with the
     *   directed selected path.
     */
    const validAnswerPaths = candidates
        .filter((path) => !path.includes(0))
        .filter((path) =>
            pathContainsOrderedPair(
                path,
                directedSelectedPath
            )
        )
        .map((path) => [...path]);

    /*
     * The selected path must always be an answer.
     */
    if (
        !validAnswerPaths.some((path) =>
            samePath(path, directedSelectedPath)
        )
    ) {
        validAnswerPaths.push([
            ...directedSelectedPath
        ]);
    }

    const answerPaths =
        deduplicatePaths(validAnswerPaths);

    if (answerPaths.length === 0) {
        throw new Error(
            "generateTask02: no answer paths found."
        );
    }

    const board = createTask02Board({
        boardSize,
        difficulty,
        color,
        shape,
        anchorIndex
    });

    const cells = convertTask02BoardToCells(board);

    const mode =
        difficulty === 0
            ? "HEX_COLOR"
            : difficulty === 1
                ? "SINGLE_SHAPE"
                : "MIXED_SHAPES";

    const template =
        anchorType === "endingOn"
            ? "task02_endingOn"
            : "task02_startingFrom";

    const task = {
        type: "findPath",

        data: {
            difficulty,
            answerLength,
            mode,
            shape,
            anchorType,
            direction,
            anchorIndex
        },

        instruction: {
            template,
            mode,
            negated: false,

            targetColors: [color],
            colors: [color],

            color,
            shape,
            length: answerLength,
            direction,
            anchorType
        },

        cells,
        answerPaths
    };

    if (
        !validateTask02(
            task,
            directedSelectedPath
        )
    ) {
        throw new Error(
            "generateTask02 created an invalid task."
        );
    }

    return task;
}


/* ==========================================================================
   3.02a Board generation
   ========================================================================== */

function createTask02Board({
    boardSize,
    difficulty,
    color,
    shape,
    anchorIndex
}) {
    const centerIndex = 0;

    return Array.from(
        { length: boardSize },
        (_, index) => {
            /*
             * The anchor always uses the requested
             * colour and requested shape.
             */
            if (index === anchorIndex) {
                return createTask02AnchorCell({
                    index,
                    color,
                    shape
                });
            }

            /*
             * The centre must not match the requested
             * colour and shape.
             */
            if (index === centerIndex) {
                return createTask02CenterCell({
                    index,
                    difficulty,
                    targetColor: color,
                    targetShape: shape
                });
            }

            /*
             * All other cells are fillers.
             */
            return createTask02FillerCell({
                index,
                difficulty,
                targetShape: shape
            });
        }
    );
}


/* ==========================================================================
   3.02b Anchor cell
   ========================================================================== */

function createTask02AnchorCell({
    index,
    color,
    shape
}) {
    if (shape === "hex") {
        return {
            index,
            backgroundColorKey: color,
            character: undefined,
            shape: "hex"
        };
    }

    return {
        index,
        backgroundColorKey:
            randomChoice(TASK_COLORS),
        character:
            getShapeCharacter(shape, color),
        shape
    };
}


/* ==========================================================================
   3.02c Centre cell
   ========================================================================== */

function createTask02CenterCell({
    index,
    difficulty,
    targetColor,
    targetShape
}) {
    /*
     * Difficulty 0 uses coloured hexes.
     */
    if (targetShape === "hex") {
        const otherColors =
            TASK_COLORS.filter(
                (candidateColor) =>
                    candidateColor !== targetColor
            );

        return {
            index,
            backgroundColorKey:
                randomChoice(otherColors),
            character: undefined,
            shape: "hex"
        };
    }

    /*
     * Difficulty 1:
     * the centre uses the same shape family as
     * the target, but not the target colour.
     *
     * Difficulty 2:
     * the centre can use either circle or square,
     * but never the target colour and target shape.
     */
    const centerShape =
        difficulty === 2
            ? randomChoice(TASK02_SHAPES)
            : targetShape;

    let centerColor =
        randomChoice(TASK_COLORS);

    /*
     * Prevent the exact target colour/shape
     * combination from appearing at the centre.
     */
    if (
        centerShape === targetShape &&
        centerColor === targetColor
    ) {
        const otherColors =
            TASK_COLORS.filter(
                (candidateColor) =>
                    candidateColor !== targetColor
            );

        centerColor =
            randomChoice(otherColors);
    }

    return {
        index,
        backgroundColorKey:
            randomChoice(TASK_COLORS),
        character:
            getShapeCharacter(
                centerShape,
                centerColor
            ),
        shape: centerShape
    };
}


/* ==========================================================================
   3.02d Filler cells
   ========================================================================== */

function createTask02FillerCell({
    index,
    difficulty,
    targetShape
}) {
    /*
     * Difficulty 0 has only hex-colour cells.
     */
    if (targetShape === "hex") {
        return {
            index,
            backgroundColorKey:
                randomChoice(TASK_COLORS),
            character: undefined,
            shape: "hex"
        };
    }

    /*
     * Difficulty 1:
     * all fillers use the selected shape.
     *
     * Difficulty 2:
     * each filler independently becomes either
     * a circle or a square.
     */
    const fillerShape =
        difficulty === 2
            ? randomChoice(TASK02_SHAPES)
            : targetShape;

    const fillerColor =
        randomChoice(TASK_COLORS);

    return {
        index,
        backgroundColorKey:
            randomChoice(TASK_COLORS),
        character:
            getShapeCharacter(
                fillerShape,
                fillerColor
            ),
        shape: fillerShape
    };
}


/* ==========================================================================
   3.02e Shape helpers
   ========================================================================== */

function getShapeCharacter(shape, color) {
    if (shape === "circle") {
        return TASK_CIRCLES[color];
    }

    if (shape === "square") {
        return TASK_SQUARES[color];
    }

    return undefined;
}


/* ==========================================================================
   3.02f Cell conversion
   ========================================================================== */

function convertTask02BoardToCells(board) {
    const colorMap = {
        red: HexTaskLoader.COLOR_HEX.red,
        green: HexTaskLoader.COLOR_HEX.green,
        blue: HexTaskLoader.COLOR_HEX.blue
    };

    const alphabet = "ABCDEFG".split("");

    return board.map((cell) => ({
        index: cell.index,

        /*
         * Characters are used for circle and square cells.
         * Hex-colour cells receive the normal fallback content.
         */
        content:
            cell.character !== undefined
                ? cell.character
                : alphabet[cell.index] ?? "",

        backgroundColor:
            colorMap[cell.backgroundColorKey] || "",

        shape: cell.shape
    }));
}


/* ==========================================================================
   3.02g Path helpers
   ========================================================================== */

function pathContainsOrderedPair(
    candidatePath,
    referencePath
) {
    if (
        !Array.isArray(candidatePath) ||
        !Array.isArray(referencePath)
    ) {
        return false;
    }

    if (
        candidatePath.length < 2 ||
        referencePath.length < 2
    ) {
        return false;
    }

    for (
        let referenceIndex = 0;
        referenceIndex < referencePath.length - 1;
        referenceIndex += 1
    ) {
        const firstReference =
            Number(
                referencePath[referenceIndex]
            );

        const secondReference =
            Number(
                referencePath[referenceIndex + 1]
            );

        for (
            let candidateIndex = 0;
            candidateIndex < candidatePath.length - 1;
            candidateIndex += 1
        ) {
            const firstCandidate =
                Number(
                    candidatePath[candidateIndex]
                );

            const secondCandidate =
                Number(
                    candidatePath[candidateIndex + 1]
                );

            if (
                firstCandidate === firstReference &&
                secondCandidate === secondReference
            ) {
                return true;
            }
        }
    }

    return false;
}


function samePath(pathA, pathB) {
    if (
        !Array.isArray(pathA) ||
        !Array.isArray(pathB)
    ) {
        return false;
    }

    if (pathA.length !== pathB.length) {
        return false;
    }

    return pathA.every(
        (cell, index) =>
            Number(cell) ===
            Number(pathB[index])
    );
}


function deduplicatePaths(paths) {
    const seen = new Set();
    const uniquePaths = [];

    for (const path of paths) {
        const key = path
            .map(Number)
            .join(",");

        if (!seen.has(key)) {
            seen.add(key);
            uniquePaths.push([...path]);
        }
    }

    return uniquePaths;
}


/* ==========================================================================
   3.02h Validation
   ========================================================================== */

function validateTask02(
    task,
    selectedAnswerPath
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

    /*
     * The selected path must be one of the answers.
     */
    if (
        !task.answerPaths.some((path) =>
            samePath(path, selectedAnswerPath)
        )
    ) {
        return false;
    }

    /*
     * Every answer must have the requested length,
     * exclude the centre, and share an ordered pair.
     */
    for (const answerPath of task.answerPaths) {
        if (
            answerPath.length !==
            task.data.answerLength
        ) {
            return false;
        }

        if (answerPath.includes(0)) {
            return false;
        }

        if (
            !pathContainsOrderedPair(
                answerPath,
                selectedAnswerPath
            )
        ) {
            return false;
        }
    }

    /*
     * Confirm that the anchor is calculated from
     * the directed path.
     */
    const expectedAnchorIndex =
        task.data.anchorType === "endingOn"
            ? selectedAnswerPath[
                  selectedAnswerPath.length - 1
              ]
            : selectedAnswerPath[0];

    if (
        Number(task.data.anchorIndex) !==
        Number(expectedAnchorIndex)
    ) {
        return false;
    }

    const anchorCell = task.cells.find(
        (cell) =>
            Number(cell.index) ===
            Number(task.data.anchorIndex)
    );

    const centerCell = task.cells.find(
        (cell) => Number(cell.index) === 0
    );

    if (!anchorCell || !centerCell) {
        return false;
    }

    /*
     * Difficulty 0: anchor is a colour-matching hex.
     */
    if (task.data.difficulty === 0) {
        const expectedBackground =
            HexTaskLoader.COLOR_HEX[
                task.instruction.color
            ];

        if (
            anchorCell.backgroundColor !==
            expectedBackground
        ) {
            return false;
        }

        if (
            centerCell.backgroundColor ===
            expectedBackground
        ) {
            return false;
        }

        return true;
    }

    /*
     * Difficulty 1 and 2:
     * anchor must be the requested colour/shape.
     */
    const expectedAnchorCharacter =
        getShapeCharacter(
            task.instruction.shape,
            task.instruction.color
        );

    if (
        anchorCell.content !==
        expectedAnchorCharacter
    ) {
        return false;
    }

    /*
     * Difficulty 1 requires the centre to use the
     * same shape family but a different colour.
     */
    if (task.data.difficulty === 1) {
        const otherCharacters =
            TASK_COLORS
                .filter(
                    (candidateColor) =>
                        candidateColor !==
                        task.instruction.color
                )
                .map((candidateColor) =>
                    getShapeCharacter(
                        task.instruction.shape,
                        candidateColor
                    )
                );

        return otherCharacters.includes(
            centerCell.content
        );
    }

    /*
     * Difficulty 2 allows either shape in the centre,
     * provided the exact target character is absent.
     */
    const allNonTargetCharacters = [
        ...Object.values(TASK_CIRCLES),
        ...Object.values(TASK_SQUARES)
    ].filter(
        (character) =>
            character !== expectedAnchorCharacter
    );

    return allNonTargetCharacters.includes(
        centerCell.content
    );
}

/* ==========================================================================
   4. Shared task engine
   ========================================================================== */


/*
 * This registry belongs to the engine.
 *
 * It is not part of Task 01 or Task 02.
 */
const taskGenerators = [
    {
        id: "task01",
        generator: generateTask01,
        difficulties: [0, 1, 2, 3]
    },

    {
        id: "task02",
        generator: generateTask02,
        difficulties: [0, 1]
    }

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