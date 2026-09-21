const TOTAL_DAYS = 30;
const CAPACITY = 100;
const STARTING_CASH = 2000;
const STARTING_DEBT = 5500;
const WIN_CASH = 25000;

// Declare language BEFORE text so it can be used safely.
let language = localStorage.getItem("canaryMarketLanguage") || "en";
let state;

const $ = id => document.getElementById(id);

function money(value) {
  return "€" + Math.max(0, Math.round(value)).toLocaleString(
    language === "es" ? "es-ES" : "en-US"
  );
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

const products = {
  Weed: { base: 180, volatility: 0.35 },
  Acid: { base: 300, volatility: 0.45 },
  Ludes: { base: 140, volatility: 0.30 },
  Speed: { base: 450, volatility: 0.40 },
  Cocaine: { base: 900, volatility: 0.50 },
  Heroin: { base: 1300, volatility: 0.58 },
  Ecstasy: { base: 650, volatility: 0.44 },
  Mushrooms: { base: 260, volatility: 0.38 },
  Ketamine: { base: 780, volatility: 0.50 },
  Fentanyl: { base: 1600, volatility: 0.70 }
};

const islands = {
  Tenerife: { modifier: 1.00, risk: 0.08 },
  "Gran Canaria": { modifier: 1.18, risk: 0.12 },
  Lanzarote: { modifier: 0.86, risk: 0.09 },
  Fuerteventura: { modifier: 0.76, risk: 0.07 },
  "La Palma": { modifier: 0.94, risk: 0.06 },
  "La Gomera": { modifier: 0.70, risk: 0.05 },
  "El Hierro": { modifier: 1.30, risk: 0.15 }
};

const text = {
  en: {
    title: "Dope Wars: Canary Market",
    subtitle: "Trade across the seven islands, clear your debt, and build a fortune.",
    language: "Language",
    day: "Day",
    cash: "Cash",
    debt: "Debt",
    capacity: "Carrying",
    island: "Island",
    market: "Today's Market",
    product: "Product",
    price: "Price",
    owned: "Owned",
    trade: "Trade",
    travel: "Travel Between Islands",
    destination: "Destination",
    travelButton: "Travel — Advance One Day",
    inventory: "Inventory",
    log: "Street Log",
    buy: "Buy",
    sell: "Sell",
    payDebt: "Pay Debt",
    newGame: "New Game",
    continue: "Continue",
    welcome: "Welcome to the Canary Market. Clear your debt and reach €25,000.",
    positive: "Enter a positive quantity.",
    noSpace: "You do not have enough carrying space.",
    cannotAfford: "You cannot afford that purchase.",
    bought: (n, p, v) => `Bought ${n} ${p} for ${money(v)}.`,
    onlyHave: (n, p) => `You only have ${n} ${p}.`,
    sold: (n, p, v) => `Sold ${n} ${p} for ${money(v)}.`,
    already: "You are already on that island.",
    arrived: i => `You arrived in ${i}.`,
    searchEmpty: "You were searched, but your bags were empty.",
    search: (n, v) => `A search cost you ${n} units and a ${money(v)} fine.`,
    demand: p => `${p} is suddenly in high demand here.`,
    crash: p => `${p} flooded the market and prices crashed.`,
    found: v => `You found ${money(v)} in an old travel bag.`,
    noDebtCash: "You do not have enough cash to pay the debt.",
    paid: v => `Paid ${money(v)} toward your debt.`,
    timeUp: (c, d) => `You finished with ${money(c)} cash and ${money(d)} debt.`,
    madeIt: "You Made It!",
    timeTitle: "Time's Up",
    winText: () => `You cleared your debt and reached ${money(WIN_CASH)} cash.`
  },

  es: {
    title: "Dope Wars: Mercado Canario",
    subtitle: "Compra y vende entre las siete islas, paga tus deudas y haz fortuna.",
    language: "Idioma",
    day: "Día",
    cash: "Dinero",
    debt: "Deuda",
    capacity: "Carga",
    island: "Isla",
    market: "Mercado de Hoy",
    product: "Producto",
    price: "Precio",
    owned: "Tienes",
    trade: "Comercio",
    travel: "Viajar entre Islas",
    destination: "Destino",
    travelButton: "Viajar — Avanzar un Día",
    inventory: "Inventario",
    log: "Registro",
    buy: "Comprar",
    sell: "Vender",
    payDebt: "Pagar Deuda",
    newGame: "Nueva Partida",
    continue: "Continuar",
    welcome: "Bienvenido al Mercado Canario. Paga tu deuda y consigue €25.000.",
    positive: "Introduce una cantidad positiva.",
    noSpace: "No tienes suficiente espacio de carga.",
    cannotAfford: "No puedes permitirte esa compra.",
    bought: (n, p, v) => `Compraste ${n} ${p} por ${money(v)}.`,
    onlyHave: (n, p) => `Solo tienes ${n} ${p}.`,
    sold: (n, p, v) => `Vendiste ${n} ${p} por ${money(v)}.`,
    already: "Ya estás en esa isla.",
    arrived: i => `Has llegado a ${i}.`,
    searchEmpty: "Te registraron, pero no encontraron nada.",
    search: (n, v) => `Un registro te costó ${n} unidades y una multa de ${money(v)}.`,
    demand: p => `${p} tiene mucha demanda en esta isla.`,
    crash: p => `El mercado se inundó de ${p} y los precios se desplomaron.`,
    found: v => `Encontraste ${money(v)} en una vieja bolsa de viaje.`,
    noDebtCash: "No tienes suficiente dinero para pagar la deuda.",
    paid: v => `Pagaste ${money(v)} de tu deuda.`,
    timeUp: (c, d) => `Terminaste con ${money(c)} y una deuda de ${money(d)}.`,
    madeIt: "¡Lo Conseguiste!",
    timeTitle: "Se Acabó el Tiempo",
    winText: () => `Pagaste tu deuda y conseguiste ${money(WIN_CASH)}.`
  }
};

const productNames = {
  en: {
    Weed: "Weed",
    Acid: "Acid",
    Ludes: "Ludes",
    Speed: "Speed",
    Cocaine: "Cocaine",
    Heroin: "Heroin",
    Ecstasy: "Ecstasy",
    Mushrooms: "Mushrooms",
    Ketamine: "Ketamine",
    Fentanyl: "Fentanyl"
  },
  es: {
    Weed: "Marihuana",
    Acid: "Ácido",
    Ludes: "Ludes",
    Speed: "Anfetamina",
    Cocaine: "Cocaína",
    Heroin: "Heroína",
    Ecstasy: "Éxtasis",
    Mushrooms: "Hongos",
    Ketamine: "Ketamina",
    Fentanyl: "Fentanilo"
  }
};

const islandNames = {
  en: {
    Tenerife: "Tenerife",
    "Gran Canaria": "Gran Canaria",
    Lanzarote: "Lanzarote",
    Fuerteventura: "Fuerteventura",
    "La Palma": "La Palma",
    "La Gomera": "La Gomera",
    "El Hierro": "El Hierro"
  },
  es: {
    Tenerife: "Tenerife",
    "Gran Canaria": "Gran Canaria",
    Lanzarote: "Lanzarote",
    Fuerteventura: "Fuerteventura",
    "La Palma": "La Palma",
    "La Gomera": "La Gomera",
    "El Hierro": "El Hierro"
  }
};

function currentText() {
  return text[language];
}

function productLabel(product) {
  return productNames[language][product];
}

function islandLabel(island) {
  return islandNames[language][island];
}

function createGame() {
  const inventory = {};

  Object.keys(products).forEach(product => {
    inventory[product] = 0;
  });

  state = {
    day: 1,
    cash: STARTING_CASH,
    debt: STARTING_DEBT,
    location: "Tenerife",
    prices: {},
    inventory,
    gameOver: false
  };

  $("modal").classList.add("hidden");
  $("log").innerHTML = "";

  generatePrices();
  writeLog(currentText().welcome, "notice");
  render();
}

function generatePrices() {
  const island = islands[state.location];

  Object.entries(products).forEach(([product, data]) => {
    const fluctuation = randomBetween(
      1 - data.volatility,
      1 + data.volatility
    );

    state.prices[product] = Math.max(
      20,
      Math.round(data.base * island.modifier * fluctuation)
    );
  });
}

function usedCapacity() {
  return Object.values(state.inventory)
    .reduce((sum, amount) => sum + amount, 0);
}

function getAmount(product) {
  const input = document.querySelector(
    `[data-product="${CSS.escape(product)}"]`
  );

  return Math.floor(Number(input?.value));
}

function buy(product) {
  if (state.gameOver) return;

  const t = currentText();
  const amount = getAmount(product);

  if (!Number.isFinite(amount) || amount <= 0) {
    writeLog(t.positive, "bad");
    return;
  }

  const cost = amount * state.prices[product];

  if (usedCapacity() + amount > CAPACITY) {
    writeLog(t.noSpace, "bad");
    return;
  }

  if (cost > state.cash) {
    writeLog(t.cannotAfford, "bad");
    return;
  }

  state.cash -= cost;
  state.inventory[product] += amount;

  writeLog(
    t.bought(amount, productLabel(product), cost),
    "good"
  );

  render();
}

function sell(product) {
  if (state.gameOver) return;

  const t = currentText();
  const amount = getAmount(product);

  if (!Number.isFinite(amount) || amount <= 0) {
    writeLog(t.positive, "bad");
    return;
  }

  if (amount > state.inventory[product]) {
    writeLog(
      t.onlyHave(
        state.inventory[product],
        productLabel(product)
      ),
      "bad"
    );
    return;
  }

  const revenue = amount * state.prices[product];

  state.inventory[product] -= amount;
  state.cash += revenue;

  writeLog(
    t.sold(amount, productLabel(product), revenue),
    "good"
  );

  checkWin();
  render();
}

function travel() {
  if (state.gameOver) return;

  const t = currentText();
  const destination = $("destinationSelect").value;

  if (!destination || destination === state.location) {
    writeLog(t.already, "bad");
    return;
  }

  state.location = destination;
  state.day++;
  state.debt = Math.round(state.debt * 1.035);

  generatePrices();

  writeLog(t.arrived(islandLabel(destination)), "notice");
  randomEvent();

  if (state.day > TOTAL_DAYS && !state.gameOver) {
    endGame(
      t.timeTitle,
      t.timeUp(state.cash, state.debt)
    );
  }

  render();
}

function randomEvent() {
  const t = currentText();
  const island = islands[state.location];
  const roll = Math.random();

  if (Math.random() < island.risk) {
    const total = usedCapacity();

    if (total > 0) {
      const confiscated = Math.max(
        1,
        Math.floor(total * randomBetween(0.2, 0.7))
      );

      let remaining = confiscated;

      Object.keys(state.inventory).forEach(product => {
        if (remaining <= 0) return;

        const taken = Math.min(
          state.inventory[product],
          Math.ceil(remaining * randomBetween(0.2, 0.65))
        );

        state.inventory[product] -= taken;
        remaining -= taken;
      });

      const fine = Math.min(
        state.cash,
        Math.round(randomBetween(100, 600))
      );

      state.cash -= fine;

      writeLog(t.search(confiscated, fine), "bad");
    } else {
      writeLog(t.searchEmpty, "notice");
    }
  }

  if (roll < 0.14) {
    const product = randomItem(Object.keys(products));

    state.prices[product] = Math.round(
      state.prices[product] * randomBetween(1.7, 2.8)
    );

    writeLog(t.demand(productLabel(product)), "good");
  } else if (roll < 0.28) {
    const product = randomItem(Object.keys(products));

    state.prices[product] = Math.max(
      20,
      Math.round(state.prices[product] * randomBetween(0.25, 0.6))
    );

    writeLog(t.crash(productLabel(product)), "notice");
  } else if (roll < 0.38) {
    const found = Math.round(randomBetween(100, 500));

    state.cash += found;
    writeLog(t.found(found), "good");
  }
}

function payDebt() {
  if (state.gameOver) return;

  const t = currentText();
  const payment = Math.min(state.cash, state.debt);

  if (payment <= 0) {
    writeLog(t.noDebtCash, "bad");
    return;
  }

  state.cash -= payment;
  state.debt -= payment;

  writeLog(t.paid(payment), "good");

  checkWin();
  render();
}

function checkWin() {
  if (state.cash >= WIN_CASH && state.debt <= 0) {
    endGame(currentText().madeIt, currentText().winText());
  }
}

function endGame(title, message) {
  state.gameOver = true;
  $("modalTitle").textContent = title;
  $("modalText").textContent = message;
  $("modalButton").textContent = currentText().continue;
  $("modal").classList.remove("hidden");
  render();
}

function writeLog(message, type = "") {
  const entry = document.createElement("p");
  entry.className = type;
  entry.textContent = `[${currentText().day} ${state.day}] ${message}`;
  $("log").prepend(entry);
}

function render() {
  const t = currentText();

  document.documentElement.lang = language;
  document.title = t.title;

  $("gameTitle").textContent = t.title;
  $("subtitle").textContent = t.subtitle;
  $("languageLabel").textContent = t.language;
  $("dayLabel").textContent = t.day;
  $("cashLabel").textContent = t.cash;
  $("debtLabel").textContent = t.debt;
  $("capacityLabel").textContent = t.capacity;
  $("islandLabel").textContent = t.island;
  $("marketTitle").textContent = t.market;
  $("productHeader").textContent = t.product;
  $("priceHeader").textContent = t.price;
  $("ownedHeader").textContent = t.owned;
  $("tradeHeader").textContent = t.trade;
  $("travelTitle").textContent = t.travel;
  $("destinationLabel").textContent = t.destination;
  $("travelButton").textContent = t.travelButton;
  $("inventoryTitle").textContent = t.inventory;
  $("logTitle").textContent = t.log;
  $("newGameButton").textContent = t.newGame;

  $("dayStat").textContent =
    `${Math.min(state.day, TOTAL_DAYS)} / ${TOTAL_DAYS}`;

  $("cashStat").textContent = money(state.cash);
  $("debtStat").textContent = money(state.debt);
  $("spaceStat").textContent = `${usedCapacity()} / ${CAPACITY}`;
  $("locationStat").textContent = islandLabel(state.location);

  $("destinationSelect").innerHTML = Object.keys(islands)
    .filter(island => island !== state.location)
    .map(island => `
      <option value="${island}">
        ${islandLabel(island)}
      </option>
    `)
    .join("");

  $("marketBody").innerHTML = Object.keys(products)
    .map(product => `
      <tr>
        <td class="item-name">${productLabel(product)}</td>
        <td>${money(state.prices[product])}</td>
        <td class="owned">${state.inventory[product]}</td>
        <td>
          <div class="trade">
            <input
              data-product="${product}"
              type="number"
              min="1"
              value="1"
              aria-label="${productLabel(product)} quantity"
            >

            <button
              type="button"
              data-action="buy"
              data-product="${product}"
            >
              ${t.buy}
            </button>

            <button
              type="button"
              data-action="sell"
              data-product="${product}"
            >
              ${t.sell}
            </button>
          </div>
        </td>
      </tr>
    `)
    .join("");

  $("inventory").innerHTML =
    Object.entries(state.inventory)
      .map(([product, amount]) => `
        <div class="inventory-row">
          <span>${productLabel(product)}</span>
          <b>${amount}</b>
        </div>
      `)
      .join("") +
    `
      <button
        id="payDebtButton"
        type="button"
        style="width: 100%; margin-top: 10px"
      >
        ${t.payDebt}
      </button>
    `;

  $("travelButton").disabled = state.gameOver;
  $("destinationSelect").disabled = state.gameOver;

  const payDebtButton = $("payDebtButton");
  payDebtButton.disabled = state.gameOver || state.cash <= 0;
  payDebtButton.addEventListener("click", payDebt);
}

// Language handling
$("languageSelect").value = language;

$("languageSelect").addEventListener("change", event => {
  language = event.target.value;
  localStorage.setItem("canaryMarketLanguage", language);
  render();
});

$("travelButton").addEventListener("click", travel);
$("newGameButton").addEventListener("click", createGame);

$("modalButton").addEventListener("click", () => {
  $("modal").classList.add("hidden");
});

$("marketBody").addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");

  if (!button) return;

  const product = button.dataset.product;
  const action = button.dataset.action;

  if (action === "buy") {
    buy(product);
  } else if (action === "sell") {
    sell(product);
  }
});

// Start game
createGame();