const translations = {
    en: {
        title: "Rummiqub",
        subtitle: "Make groups of the same number or runs of consecutive numbers.",
        table: "Table",
        yourTiles: "👤 Your tiles",
        draftArea: "Draft",
        play: "Play selected tiles",
        draw: "Draw a tile",
        newGame: "New game",
        
        draftHint: "Draft — drag rack or board tiles here",
        validateDraft: "Draft is not a valid set or run",
        validDraft: "Add this valid set or run to the board",
        validateDraftHint: "The tick checks only the tiles currently in Draft.",
        validDraftHint: "Valid set or run. Click to place it on the board.",
        finishTurn: "Finish Turn",
        cancelDraft: "Cancel draft",
        boardDropHint: "Drop a Draft tile here to add it to this set.",
        joker: "Joker",
        tileTitle: "{color} {value}",
        pink: "Pink",
        orange: "Orange",
        green: "Green",
        azure: "Blue",
        opponentTiles: "{count} tiles",
        playerName: "👤 You",

        yourTurn: "👤 Your turn",
        opponentTurn: "{name}'s turn",
        gameOver: "Game over",

        stock: "Tiles left: {count}",
        selected: "{count} selected",

        invalid: "⚠️ Those tiles don't make a valid group or run.",
        played: "👤 Nice move!",
        youDrew: "👤 You drew:",
        youPlayed: "👤 You played:",
        youWin: "👤 You win!",
        opponentWins: "{name} wins!",
        youWinLowest: "👤 You win with {points} hand points (lowest score).",
        opponentWinsLowest: "{name} wins with {points} hand points (lowest score).",
        tieLowest: "Tie: {names} share the lowest score at {points} points.",
        drawEmpty: "No tiles left to draw. Turn passed.",
        newGameMessage: "New game started.",

        aiDrew: "{name} drew a tile.",
        aiPlayed: "{name} played:",

        invalidTable: "⚠️ Every set on the table must be valid.",
        mustPlayFromHand: "⚠️ Play at least one tile from your rack.",
        openingMeld: "⚠️ Your opening play must total at least 30 points.",
        looseTiles: "⚠️ Place all Draft tiles before finishing your turn.",
        noDraft: "⚠️ There is no active turn to finish.",
        selectedTileError: "⚠️ Couldn't move one of the selected rack tiles.",
        draftCancelled: "❌ Draft cancelled.",
        invalidMove: "⚠️ That move isn't valid.",

        scoresTitle: "Final scores",
        scoreRow: "{name}: {points} points ({tileCount} tiles)",
        instructionsLink: "Click for instructions",
        instructionsTitle: "How to play",
        instructionsGoalTitle: "Goal",
        instructionsGoal: "Be the first player to play all the tiles from your rack.",
        instructionsSetsTitle: "Valid sets",
        instructionsSets: "A group is 3 or 4 tiles with the same number in different colours. A run is 3 or more consecutive numbers in the same colour.",
        instructionsFirstTurnTitle: "Your opening play",
        instructionsFirstTurn: "Your first play must total at least 30 points using tiles from your rack. You cannot use tiles already on the table to meet this total.",
        instructionsTurnsTitle: "Taking a turn",
        instructionsTurns: "Play at least one tile from your rack. You may add tiles to sets on the table or rearrange them, but every set must be valid when you finish. If you cannot or do not want to play, draw a tile to end your turn.",
        instructionsControlsTitle: "Controls",
        instructionsControls: "Click a tile on the table to move it into the Draft area. Drag tiles from your rack or the table into Draft, and drag Draft tiles onto a table set to add them. Use the tick to place a valid Draft set on the board. Finish Turn commits your move; Cancel draft restores the turn.",
        closeInstructions: "Close"
    },

    es: {
        title: "Rummiqub",
        subtitle: "Forma grupos con el mismo número o escaleras de números consecutivos.",
        table: "Mesa",
        yourTiles: "👤 Tus fichas",
        draftArea: "Zona temporal",
        play: "Jugar las fichas seleccionadas",
        draw: "Robar una ficha",
        newGame: "Nueva partida",
        
        draftHint: "Zona temporal: arrastra aquí las fichas del soporte o de la mesa",        validateDraft: "El borrador no es un grupo ni una escalera válidos",
        validDraft: "Añadir esta combinación válida a la mesa",
        validateDraftHint: "La marca solo comprueba las fichas del borrador.",
        validDraftHint: "Grupo o escalera válidos. Pulsa para añadirlos a la mesa.",
        finishTurn: "Terminar turno",
        cancelDraft: "Cancelar borrador",
        boardDropHint: "Suelta aquí una ficha del borrador para añadirla a este grupo.",
        joker: "Comodín",
        tileTitle: "{color} {value}",
        pink: "Rosa",
        orange: "Naranja",
        green: "Verde",
        azure: "Azul",
        opponentTiles: "{count} fichas",
        playerName: "👤 Tú",

        yourTurn: "👤 Tu turno",
        opponentTurn: "Turno de {name}",
        gameOver: "Fin de la partida",

        stock: "Fichas restantes: {count}",
        selected: "{count} seleccionadas",

        invalid: "⚠️ Esas fichas no forman un grupo ni una escalera válidos.",
        played: "👤 ¡Buena jugada!",
        youDrew: "👤 Has robado:",
        youPlayed: "👤 Has jugado:",
        youWin: "👤 ¡Has ganado!",
        opponentWins: "¡{name} gana!",
        youWinLowest: "👤 Ganas con {points} puntos en la mano (la puntuación más baja).",
        opponentWinsLowest: "{name} gana con {points} puntos en la mano (la puntuación más baja).",
        tieLowest: "Empate: {names} comparten la puntuación más baja, con {points} puntos.",
        drawEmpty: "No quedan fichas para robar. Se pasa el turno.",
        newGameMessage: "Ha comenzado una nueva partida.",

        aiDrew: "{name} ha robado una ficha.",
        aiPlayed: "{name} ha jugado:",

        invalidTable: "⚠️ Todos los grupos de la mesa deben ser válidos.",
        mustPlayFromHand: "⚠️ Juega al menos una ficha de tu soporte.",
        openingMeld: "⚠️ Tu primera jugada debe sumar al menos 30 puntos.",
        looseTiles: "⚠️ Coloca todas las fichas del borrador antes de terminar el turno.",
        noDraft: "⚠️ No hay ningún turno activo que terminar.",
        selectedTileError: "⚠️ No se pudo mover una de las fichas seleccionadas del soporte.",
        draftCancelled: "❌ Borrador cancelado.",
        invalidMove: "⚠️ Esa jugada no es válida.",

        scoresTitle: "Puntuaciones finales",
        scoreRow: "{name}: {points} puntos ({tileCount} fichas)",
        instructionsLink: "Ver instrucciones",
        instructionsTitle: "Cómo jugar",
        instructionsGoalTitle: "Objetivo",
        instructionsGoal: "Sé el primer jugador en jugar todas las fichas de tu soporte.",
        instructionsSetsTitle: "Combinaciones válidas",
        instructionsSets: "Un grupo son 3 o 4 fichas con el mismo número y distintos colores. Una escalera son 3 o más números consecutivos del mismo color.",
        instructionsFirstTurnTitle: "Tu primera jugada",
        instructionsFirstTurn: "Tu primera jugada debe sumar al menos 30 puntos con fichas de tu soporte. No puedes usar fichas de la mesa para alcanzar esa puntuación.",
        instructionsTurnsTitle: "Tu turno",
        instructionsTurns: "Juega al menos una ficha de tu soporte. Puedes añadir fichas a las combinaciones de la mesa o reorganizarlas, pero todas deben ser válidas al terminar. Si no puedes o no quieres jugar, roba una ficha para terminar tu turno.",
        instructionsControlsTitle: "Controles",
        instructionsControls: "Pulsa una ficha de la mesa para moverla al borrador. Arrastra fichas de tu soporte o de la mesa al borrador; arrastra fichas del borrador sobre una combinación para añadirlas. Usa la marca para colocar en la mesa una combinación válida del borrador. «Terminar turno» confirma tu jugada; «Cancelar borrador» restaura el turno.",
        closeInstructions: "Cerrar"
    },

    zh: {
        title: "巴別橋",
        subtitle: "將相同數字組成一組，或將連續數字排成一列。",
        table: "牌桌",
        yourTiles: "👤 你的牌磚",
        draftArea: "暫存區",
        play: "打出已選牌磚",
        draw: "摸牌",
        newGame: "新遊戲",
        
        draftHint: "暫存區 — 將牌架或牌桌上的牌磚拖到這裏",
        validateDraft: "暫存區的牌磚未能組成有效牌組或順序",
        validDraft: "將這組有效牌磚加入牌桌",
        validateDraftHint: "剔號只會檢查暫存區內的牌磚。",
        validDraftHint: "有效牌組或順序。按一下即可放到牌桌。",
        finishTurn: "結束回合",
        cancelDraft: "取消暫存",
        boardDropHint: "將暫存區的牌磚拖到這裏，加入此牌組。",
        joker: "百搭牌",
        tileTitle: "{color} {value}",
        pink: "粉紅色",
        orange: "橙色",
        green: "綠色",
        azure: "藍色",
        opponentTiles: "{count} 隻牌磚",
        playerName: "👤 你",

        yourTurn: "👤 輪到你",
        opponentTurn: "{name}嘅回合",
        gameOver: "遊戲結束",

        stock: "剩餘牌磚：{count}",
        selected: "已選取 {count} 隻",

        invalid: "⚠️ 這些牌磚未能組成有效牌組或順序。",
        played: "打得好！",
        youDrew: "👤 你摸咗：",
        youPlayed: "👤 你打出咗：",
        youWin: "👤 你贏咗！",
        opponentWins: "{name}贏咗！",
        youWinLowest: "👤 你以手上牌磚總分 {points} 分獲勝（最低分）。",
        opponentWinsLowest: "{name}以手上牌磚總分 {points} 分獲勝（最低分）。",
        tieLowest: "平手：{names}同得最低分，均為 {points} 分。",
        drawEmpty: "已沒有牌磚可摸。回合結束。",
        newGameMessage: "新遊戲開始。",

        aiDrew: "{name}摸了一隻牌磚。",
        aiPlayed: "{name}打出咗：",

        invalidTable: "⚠️ 牌桌上每個牌組都必須有效。",
        mustPlayFromHand: "⚠️ 你必須至少從自己嘅牌架打出一隻牌磚。",
        openingMeld: "⚠️ 你首次出牌總分必須至少為 30 分。",
        looseTiles: "⚠️ 結束回合前，請將暫存區所有牌磚放好。",
        noDraft: "⚠️ 沒有可供結束的進行中回合。",
        selectedTileError: "⚠️ 無法移動其中一隻已選取嘅牌架牌磚。",
        draftCancelled: "❌ 已取消暫存。",
        invalidMove: "⚠️ 這步棋無效。",

        scoresTitle: "最終分數",
        scoreRow: "{name}：{points} 分（{tileCount} 隻牌磚）",
        instructionsLink: "按此查看玩法",
        instructionsTitle: "玩法說明",
        instructionsGoalTitle: "遊戲目標",
        instructionsGoal: "最快打出手上所有牌磚的玩家獲勝。",
        instructionsSetsTitle: "有效牌組",
        instructionsSets: "組合由 3 或 4 隻數字相同、顏色各異的牌磚組成。順序由 3 隻或以上同色、數字連續的牌磚組成。",
        instructionsFirstTurnTitle: "首次出牌",
        instructionsFirstTurn: "首次出牌必須只用自己牌架上嘅牌磚，總分至少 30 分。不能用牌桌上嘅牌磚計算這個分數。",
        instructionsTurnsTitle: "回合玩法",
        instructionsTurns: "每回合至少要打出一隻自己牌架上嘅牌磚。你可以將牌磚加入牌桌上嘅牌組，或重新排列牌組；回合結束時，所有牌組都必須有效。如果你無法或不想出牌，就摸一隻牌磚來結束回合" +
            "。",
        instructionsControlsTitle: "操作方法",
        instructionsControls: "按一下牌桌上嘅牌磚即可將它移到暫存區。將牌架或牌桌上嘅牌磚拖到暫存區；將暫存區嘅牌磚拖到牌桌上的牌組即可加入。按剔號將有效牌組放上牌桌。「結束回合」會確認你嘅行" +
            "動；「取消暫存」會還原本回合。",
        closeInstructions: "關閉"
    }
};

const LANGUAGE_KEY = "tile-rummy-language";
const supportedLanguages = ["en", "es", "zh"];

function normalizeLanguage(value) {
    if (!value) {
        return null;
    }

    const language = String(value).toLowerCase().split("-")[0];
    return supportedLanguages.includes(language) ? language : null;
}

function languageFromBrowserPreferences() {
    const preferences = navigator.languages?.length
        ? navigator.languages
        : [navigator.language];

    for (const preference of preferences) {
        const language = normalizeLanguage(preference);
        if (language) {
            return language;
        }
    }

    return null;
}

function getInitialLanguage() {
    const queryLanguage = new URLSearchParams(location.search).get("lang");

    if (queryLanguage !== null) {
        return normalizeLanguage(queryLanguage) ?? "en";
    }

    try {
        const savedLanguage = normalizeLanguage(localStorage.getItem(LANGUAGE_KEY));
        if (savedLanguage) {
            return savedLanguage;
        }
    } catch {
        // Storage may be unavailable; continue with browser preferences.
    }

    return languageFromBrowserPreferences() ?? "en";
}

export let currentLanguage = getInitialLanguage();

export function setLanguage(language, { persist = true } = {}) {
    const normalized = normalizeLanguage(language);
    if (!normalized) {
        return false;
    }

    currentLanguage = normalized;

    if (persist) {
        try {
            localStorage.setItem(LANGUAGE_KEY, normalized);
        } catch {
            // The current page can still use the selected language.
        }
    }

    updateDraftHint();
    return true;
}

function updateDraftHint() {
    document.documentElement.style.setProperty(
        "--draft-hint",
        JSON.stringify(t("draftHint"))
    );
}

updateDraftHint();

export function t(key, values = {}) {
    let text = translations[currentLanguage][key] ?? translations.en[key] ?? key;

    for (const [name, value] of Object.entries(values)) {
        text = text.replaceAll(`{${name}}`, String(value));
    }

    return text;
}

export function playerName(playerIndex) {
    if (playerIndex === 0) {
        return t("playerName");
    }

    return ["🤖", "👾", "🧞"][playerIndex - 1] ?? "🤖";
}
