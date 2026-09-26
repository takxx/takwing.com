// task.js
"use strict";

/* ==========================================================================
   Shared task configuration (used by all tasks)
   ========================================================================== */

const TASK_COLORS = ["red", "green", "blue"];

const TASK_CIRCLES = {
    red: "🔴",
    green: "🟢",
    blue: "🔵"
};

/* ==========================================================================
   HexTaskLoader (static config, no translation loading here)
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
        // If you need to load other JSON here, do it.
        // Do NOT load lang.json or path.json here anymore.
        return {};
    }
};

/* ==========================================================================
   Path data (loaded once)
   ========================================================================== */

let PATH_DATA = null;

(async function loadPathData() {
    try {
        const res = await fetch("path.json");
        if (!res.ok) {
            throw new Error(
                `Failed to load path.json: ${res.status} ${res.statusText}`
            );
        }
        PATH_DATA = await res.json();

        if (
            !PATH_DATA ||
            typeof PATH_DATA.boardSize !== "number" ||
            !PATH_DATA.paths ||
            typeof PATH_DATA.paths !== "object"
        ) {
            throw new Error("path.json has an invalid structure.");
        }
    } catch (err) {
        // Re-throw so the game can detect that tasks cannot be generated.
        console.error("Error loading path.json:", err);
        throw err;
    }
})();

function randomChoice(array) {
    if (!Array.isArray(array) || array.length === 0) {
        throw new Error(
            "randomChoice: array is empty or not an array."
        );
    }
    return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomBoolean() {
    return Math.random() < 0.5;
}

function randomUniqueItems(array, count) {
    if (count > array.length) {
        throw new Error(
            "Cannot select more unique items than available."
        );
    }
    const copy = [...array];
    const result = [];
    while (result.length < count) {
        const index = Math.floor(Math.random() * copy.length);
        result.push(copy[index]);
        copy.splice(index, 1);
    }
    return result;
}

function sameUnorderedCells(a, b) {
    if (a.length !== b.length) return false;
    const setA = new Set(a);
    const setB = new Set(b);
    if (setA.size !== setB.size) return false;
    for (const v of setA) {
        if (!setB.has(v)) return false;
    }
    return true;
}

/* ==========================================================================
   Generator registry
   ========================================================================== */

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
    // Add future generators here.
];

/* ==========================================================================
   Public random task dispatcher
   ========================================================================== */

async function generateRandomTask(difficulty) {
    if (PATH_DATA === null) {
        throw new Error("path.json has not been loaded yet.");
    }

    const eligibleGenerators = taskGenerators.filter(
        (entry) => entry.difficulties.includes(difficulty)
    );

    if (eligibleGenerators.length === 0) {
        throw new Error(
            `No task generator is available for difficulty ${difficulty}.`
        );
    }

    const selectedEntry =
        eligibleGenerators[
            Math.floor(Math.random() * eligibleGenerators.length)
        ];

    const task = await selectedEntry.generator(difficulty);

    validateGeneratedTask(task, selectedEntry.id);

    return task;
}

/* ==========================================================================
   Generator output validation
   ========================================================================== */

function validateGeneratedTask(task, generatorId) {
    if (!task || typeof task !== "object") {
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
        if (!cell || typeof cell !== "object") {
            throw new Error(
                `${generatorId} returned an invalid cell.`
            );
        }

        if (!Number.isInteger(Number(cell.index))) {
            throw new Error(
                `${generatorId} returned a cell without a valid index.`
            );
        }

        const index = Number(cell.index);

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

function hasRepeatedValue(values) {
    return new Set(values).size !== values.length;
}

/* ==========================================================================
   Task 01 Select all colour
   ========================================================================== */

async function generateTask01(difficulty) {
    if (![0, 1, 2, 3].includes(difficulty)) {
        throw new RangeError(
            "generateTask01: difficulty must be 0, 1, 2, or 3."
        );
    }

    const pathData = PATH_DATA;
    const boardSize = pathData.boardSize; // 7
    const pathsByLength = pathData.paths;

    // Choose answer length
    let answerLength;
    if (difficulty === 0) {
        answerLength = randomChoice([2, 6, 7]);
    } else {
        answerLength = randomInt(4, 6);
    }

    const candidates = pathsByLength[String(answerLength)];
    if (!Array.isArray(candidates) || candidates.length === 0) {
        throw new Error(
            `generateTask01: no paths of length ${answerLength} in path.json.`
        );
    }

    const baseAnswerPath = [...randomChoice(candidates)];
    const answerCellSet = new Set(baseAnswerPath);

    // All permutations of these cells that exist in path.json
    const answerPaths = candidates
        .filter((path) => sameUnorderedCells(path, baseAnswerPath))
        .map((p) => [...p]);

    if (answerPaths.length === 0) {
        throw new Error(
            "generateTask01: no valid answer paths found for chosen cells."
        );
    }

    // Choose mode
    const mode =
        difficulty < 2
            ? "HEX_COLOR"
            : randomChoice(["HEX_COLOR", "CIRCLE_CHARACTER"]);

    // Choose target colors (1 or 2)
    const colorCount = difficulty === 0 ? 1 : randomInt(1, 2);
    const targetColors = randomUniqueItems(TASK_COLORS, colorCount);

    // Negated condition allowed for difficulty >= 1
    const negated = difficulty >= 1 && randomBoolean();

    // Build hexes (internal representation)
    const hexes = createHexes({
        boardSize,
        answerPath: baseAnswerPath,
        mode,
        target: { colors: targetColors, negated }
    });

    // Convert to engine format: cells + answerPaths
    const colorMap = {
        red: HexTaskLoader.COLOR_HEX.red,
        green: HexTaskLoader.COLOR_HEX.green,
        blue: HexTaskLoader.COLOR_HEX.blue
    };

    const alphabet = "ABCDEFG".split("");

    const cells = hexes.map((hex) => {
        const content =
            hex.character !== undefined
                ? hex.character
                : alphabet[hex.index] ?? "";

        return {
            index: hex.index,
            content,
            backgroundColor: colorMap[hex.backgroundColorKey] || ""
        };
    });

    // For the engine, "target" is just the first cell's content.
    const targetChar = cells[baseAnswerPath[0]].content;

	const task = {
		type: "findPath",
	
		data: {
			difficulty,
			target: targetChar,
			answerLength
		},
	
		instruction: {
			// Choose the correct template key:
			template: negated
				? (mode === "HEX_COLOR"
					? "hexesExcept"
					: "circlesExcept")
				: (mode === "HEX_COLOR"
					? "hexes"
					: "circles"),
	
			mode,
			negated,
			targetColors,
			colors: targetColors // renderer expects "colors" for {colors}
		},
	
		cells,
		answerPaths
	};

    if (
        !validateTask01Internals(
            task,
            baseAnswerPath,
            mode,
            targetColors,
            negated
        )
    ) {
        throw new Error(
            "generateTask01 created an invalid task."
        );
    }

    return task;
}

function createHexes({ boardSize, answerPath, mode, target }) {
    const answerSet = new Set(answerPath);

    if (mode === "HEX_COLOR") {
        return createColorHexes(boardSize, answerSet, target);
    }

    return createCircleHexes(boardSize, answerSet, target);
}

function createColorHexes(boardSize, answerSet, target) {
    return Array.from({ length: boardSize }, (_, index) => {
        const isAnswer = answerSet.has(index);
        return {
            index,
            backgroundColorKey: isAnswer
                ? chooseAnswerColor(target)
                : chooseFillerColor(target)
        };
    });
}

function chooseAnswerColor(target) {
    if (!target.negated) {
        return randomChoice(target.colors);
    }

    const allowed = TASK_COLORS.filter(
        (color) => !target.colors.includes(color)
    );

    if (allowed.length === 0) {
        throw new Error(
            "Negated target has no possible answer color."
        );
    }

    return randomChoice(allowed);
}

function chooseFillerColor(target) {
    if (!target.negated) {
        const fillers = TASK_COLORS.filter(
            (color) => !target.colors.includes(color)
        );

        if (fillers.length === 0) {
            throw new Error(
                "Positive target has no possible filler color."
            );
        }

        return randomChoice(fillers);
    }

    return randomChoice(target.colors);
}

function createCircleHexes(boardSize, answerSet, target) {
    const answerCharacters = target.negated
        ? Object.entries(TASK_CIRCLES)
            .filter(([color]) => !target.colors.includes(color))
            .map(([, ch]) => ch)
        : target.colors.map((color) => TASK_CIRCLES[color]);

    const fillerCharacters = target.negated
        ? target.colors.map((color) => TASK_CIRCLES[color])
        : Object.entries(TASK_CIRCLES)
            .filter(([color]) => !target.colors.includes(color))
            .map(([, ch]) => ch);

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

    return Array.from({ length: boardSize }, (_, index) => ({
        index,
        backgroundColorKey: randomChoice(TASK_COLORS),
        character: answerSet.has(index)
            ? randomChoice(answerCharacters)
            : randomChoice(fillerCharacters)
    }));
}

function validateTask01Internals(
    task,
    answerPath,
    mode,
    targetColors,
    negated
) {
    const answerSet = new Set(answerPath);

    if (task.answerPaths.length === 0) return false;

    for (const hexLike of task.cells) {
        const index = Number(hexLike.index);
        const expected = answerSet.has(index);

        const isCircleMode = mode === "CIRCLE_CHARACTER";
        const hex = isCircleMode
            ? {
                  index,
                  backgroundColorKey: TASK_COLORS[0], // irrelevant for logic check
                  character: hexLike.content
              }
            : {
                  index,
                  backgroundColorKey: Object.keys(
                      HexTaskLoader.COLOR_HEX
                  ).find(
                      (key) =>
                          HexTaskLoader.COLOR_HEX[key] ===
                          hexLike.backgroundColor
                  ),
                  character: undefined
              };

        const actual = matchesTask01Target(hex, {
            mode,
            colors: targetColors,
            negated
        });

        if (expected !== actual) return false;
    }

    return true;
}

function matchesTask01Target(hex, target) {
    if (target.mode === "HEX_COLOR") {
        const matches = target.colors.includes(hex.backgroundColorKey);
        return target.negated ? !matches : matches;
    }

    if (target.mode === "CIRCLE_CHARACTER") {
        const targetChars = target.colors.map(
            (c) => TASK_CIRCLES[c]
        );
        const matches = targetChars.includes(hex.character);
        return target.negated ? !matches : matches;
    }

    return false;
}

/* ==========================================================================
   Task 02 edge paths (with "startingFrom" / "endingOn")
   ========================================================================== */

/* ==========================================================================
   Task 02 — Find an ordered matching path
   ========================================================================== */

async function generateTask02(difficulty) {
    if (![0, 1].includes(difficulty)) {
        throw new RangeError(
            "generateTask02: difficulty must be 0 or 1."
        );
    }

    const pathData = PATH_DATA;
    const boardSize = pathData.boardSize;
    const pathsByLength = pathData.paths;

    const answerLength = randomChoice([4, 5, 6]);
    const candidates = pathsByLength[String(answerLength)];

    if (!Array.isArray(candidates) || candidates.length === 0) {
        throw new Error(
            `generateTask02: no paths of length ${answerLength} in path.json.`
        );
    }

    /*
     * Select the random reference answer.
     *
     * Task02 paths cannot contain the centre cell.
     */
    const pathsWithoutCenter = candidates.filter(
        (path) => !path.includes(0)
    );

    if (pathsWithoutCenter.length === 0) {
        throw new Error(
            "generateTask02: no paths without center cell found."
        );
    }

    const selectedAnswerPath = [
        ...randomChoice(pathsWithoutCenter)
    ];

    const direction = randomChoice([
        "clockwise",
        "anticlockwise"
    ]);

    const color = randomChoice(TASK_COLORS);
    const shape = randomChoice(["hex", "circle"]);

    const anchorType =
        difficulty === 1
            ? randomChoice(["startingFrom", "endingOn"])
            : "startingFrom";

    /*
     * PATH_DATA paths are treated as ordered paths.
     *
     * If PATH_DATA stores its paths clockwise, reverse the selected
     * path only when the instruction says anticlockwise.
     */
    const directedSelectedPath =
        direction === "clockwise"
            ? [...selectedAnswerPath]
            : [...selectedAnswerPath].reverse();

    const anchorIndex =
        anchorType === "endingOn"
            ? directedSelectedPath[directedSelectedPath.length - 1]
            : directedSelectedPath[0];

    /*
     * Find every candidate that contains at least two consecutive cells
     * from the selected answer, in the same order.
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
     * The selected answer must always be valid.
     */
    if (
        !validAnswerPaths.some((path) =>
            samePath(path, directedSelectedPath)
        )
    ) {
        validAnswerPaths.push([...directedSelectedPath]);
    }

    /*
     * Remove duplicate paths while preserving order.
     */
    const uniqueAnswerPaths = deduplicatePaths(validAnswerPaths);

    if (uniqueAnswerPaths.length === 0) {
        throw new Error(
            "generateTask02: no valid ordered answer paths found."
        );
    }

    const hexes = createTask02Hexes({
        boardSize,
        answerPath: directedSelectedPath,
        color,
        shape,
        anchorIndex
    });

    const colorMap = {
        red: HexTaskLoader.COLOR_HEX.red,
        green: HexTaskLoader.COLOR_HEX.green,
        blue: HexTaskLoader.COLOR_HEX.blue
    };

    const alphabet = "ABCDEFG".split("");

    const cells = hexes.map((hex) => {
        const content =
            hex.character !== undefined
                ? hex.character
                : alphabet[hex.index] ?? "";

        return {
            index: hex.index,
            content,
            backgroundColor:
                colorMap[hex.backgroundColorKey] || ""
        };
    });

    const mode =
        shape === "hex"
            ? "HEX_COLOR"
            : "CIRCLE_CHARACTER";

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
            anchorType,
            direction
        },

        instruction: {
            template,
            mode,
            negated: false,

            targetColors: [color],
            colors: [color],

            color,
            length: answerLength,
            direction,
            shape,
            anchorType
        },

        cells,
        answerPaths: uniqueAnswerPaths
    };

    if (
        !validateTask02Internals(
            task,
            directedSelectedPath,
            color,
            shape,
            anchorType,
            direction
        )
    ) {
        throw new Error(
            "generateTask02 created an invalid task."
        );
    }

    return task;
}


/* ==========================================================================
   Task 02 board generation
   ========================================================================== */

function createTask02Hexes({
    boardSize,
    answerPath,
    color,
    shape,
    anchorIndex
}) {
    const centerIndex = 0;

    return Array.from({ length: boardSize }, (_, index) => {
        let backgroundColorKey;
        let character;

        if (index === anchorIndex) {
            /*
             * The anchor identifies the required colour or shape.
             */
            if (shape === "hex") {
                backgroundColorKey = color;
                character = undefined;
            } else {
                backgroundColorKey = randomChoice(TASK_COLORS);
                character = TASK_CIRCLES[color];
            }
        } else if (index === centerIndex) {
            /*
             * The centre is deliberately not a matching cell.
             */
            if (shape === "hex") {
                const otherColors = TASK_COLORS.filter(
                    (candidateColor) => candidateColor !== color
                );

                backgroundColorKey = randomChoice(otherColors);
                character = undefined;
            } else {
                backgroundColorKey = randomChoice(TASK_COLORS);

                const otherCharacters = Object.entries(TASK_CIRCLES)
                    .filter(
                        ([candidateColor]) =>
                            candidateColor !== color
                    )
                    .map(([, circleCharacter]) => circleCharacter);

                character = randomChoice(otherCharacters);
            }
        } else {
            /*
             * Non-anchor cells are random.
             */
            backgroundColorKey = randomChoice(TASK_COLORS);
            character = randomChoice(
                Object.values(TASK_CIRCLES)
            );
        }

        return {
            index,
            backgroundColorKey,
            character
        };
    });
}


/* ==========================================================================
   Task 02 path matching
   ========================================================================== */

/**
 * Returns true when candidatePath contains at least two consecutive
 * cells that also occur consecutively in referencePath in the same order.
 *
 * Example:
 *
 * referencePath: [1, 2, 3, 4]
 * candidatePath: [6, 1, 2, 5]
 *
 * Result: true, because [1, 2] matches in order.
 *
 * Reverse-order matches do not count:
 *
 * referencePath: [1, 2, 3, 4]
 * candidatePath: [6, 2, 1, 5]
 *
 * Result: false.
 */
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
        const first = Number(
            referencePath[referenceIndex]
        );

        const second = Number(
            referencePath[referenceIndex + 1]
        );

        for (
            let candidateIndex = 0;
            candidateIndex < candidatePath.length - 1;
            candidateIndex += 1
        ) {
            const candidateFirst = Number(
                candidatePath[candidateIndex]
            );

            const candidateSecond = Number(
                candidatePath[candidateIndex + 1]
            );

            if (
                candidateFirst === first &&
                candidateSecond === second
            ) {
                return true;
            }
        }
    }

    return false;
}


/**
 * Compares two paths in exact order.
 */
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
            Number(cell) === Number(pathB[index])
    );
}


/**
 * Removes duplicate paths while preserving their original order.
 */
function deduplicatePaths(paths) {
    const seen = new Set();
    const uniquePaths = [];

    for (const path of paths) {
        const key = path.map(Number).join(",");

        if (!seen.has(key)) {
            seen.add(key);
            uniquePaths.push([...path]);
        }
    }

    return uniquePaths;
}


/* ==========================================================================
   Task 02 validation
   ========================================================================== */

function validateTask02Internals(
    task,
    selectedAnswerPath,
    color,
    shape,
    anchorType,
    direction
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
     * Every stored answer must satisfy the ordered-overlap rule.
     */
    for (const answerPath of task.answerPaths) {
        if (
            !pathContainsOrderedPair(
                answerPath,
                selectedAnswerPath
            )
        ) {
            return false;
        }

        if (answerPath.includes(0)) {
            return false;
        }
    }

    /*
     * The selected answer must be included exactly.
     */
    if (
        !task.answerPaths.some((path) =>
            samePath(path, selectedAnswerPath)
        )
    ) {
        return false;
    }

    /*
     * Confirm the direction metadata is present.
     */
    if (
        direction !== "clockwise" &&
        direction !== "anticlockwise"
    ) {
        return false;
    }

    const anchorIndex =
        anchorType === "endingOn"
            ? selectedAnswerPath[
                  selectedAnswerPath.length - 1
              ]
            : selectedAnswerPath[0];

    const anchorCell = task.cells.find(
        (cell) => Number(cell.index) === Number(anchorIndex)
    );

    const centerCell = task.cells.find(
        (cell) => Number(cell.index) === 0
    );

    if (!anchorCell || !centerCell) {
        return false;
    }

    if (shape === "hex") {
        const expectedBackground =
            HexTaskLoader.COLOR_HEX[color];

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

    if (shape === "circle") {
        const expectedCharacter = TASK_CIRCLES[color];

        if (anchorCell.content !== expectedCharacter) {
            return false;
        }

        const otherCharacters = Object.entries(TASK_CIRCLES)
            .filter(
                ([candidateColor]) =>
                    candidateColor !== color
            )
            .map(([, circleCharacter]) => circleCharacter);

        return otherCharacters.includes(centerCell.content);
    }

    return false;
}

/* ==========================================================================
   Task 03
   ========================================================================== */

async function generateTask03(difficulty) {
    throw new Error("generateTask03 not implemented.");
}

/* ==========================================================================
   Exports
   ========================================================================== */

window.HexTaskLoader = HexTaskLoader;
window.TASK_COLORS = TASK_COLORS;
window.TASK_CIRCLES = TASK_CIRCLES;
window.generateRandomTask = generateRandomTask;