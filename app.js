const state = {
  rates: [],
  previousRates: new Map(),
  query: "",
  sort: "code",
  tick: 0,
};

const formatRate = new Intl.NumberFormat("uk-UA", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

const updatedAt = document.querySelector("#updatedAt");
const ratesCount = document.querySelector("#ratesCount");
const ratesBody = document.querySelector("#ratesBody");
const emptyState = document.querySelector("#emptyState");
const searchInput = document.querySelector("#searchInput");
const sortSelect = document.querySelector("#sortSelect");
const marketCards = document.querySelector("#marketCards");
const tickerTrack = document.querySelector("#tickerTrack");

async function loadRates() {
  const response = await fetch("data/rates.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Cannot load rates.json: ${response.status}`);
  }

  const data = await response.json();
  state.rates = Array.isArray(data.rates)
    ? data.rates.map((rate) => ({
        ...rate,
        buy: Number(rate.buy),
        sell: Number(rate.sell),
        nbu: Number(rate.nbu),
        lastChange: 0,
      }))
    : [];
  updatedAt.textContent = data.updatedAt || "Невідомо";
  render();
  window.setInterval(updateLiveRates, 2400);
}

function getSpread(rate) {
  return Number(rate.sell) - Number(rate.buy);
}

function getFilteredRates() {
  const query = state.query.trim().toLowerCase();
  const filtered = query
    ? state.rates.filter((rate) => {
        return [rate.code, rate.name, rate.country]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      })
    : [...state.rates];

  return filtered.sort((a, b) => {
    if (state.sort === "buy" || state.sort === "sell") {
      return Number(b[state.sort]) - Number(a[state.sort]);
    }

    if (state.sort === "spread") {
      return getSpread(b) - getSpread(a);
    }

    return String(a.code).localeCompare(String(b.code), "uk");
  });
}

function render() {
  const rates = getFilteredRates();
  ratesCount.textContent = `${state.rates.length} валют`;
  emptyState.hidden = rates.length > 0;
  renderCards();
  renderTicker();

  ratesBody.innerHTML = rates
    .map((rate) => {
      const spread = getSpread(rate);
      const previous = state.previousRates.get(rate.code);
      const buyClass = getMoveClass(previous?.buy, rate.buy);
      const sellClass = getMoveClass(previous?.sell, rate.sell);
      return `
        <tr>
          <td><span class="code">${escapeHtml(rate.code)}</span></td>
          <td>${escapeHtml(rate.name)}</td>
          <td class="number price-cell ${buyClass}">${formatRate.format(Number(rate.buy))}</td>
          <td class="number price-cell ${sellClass}">${formatRate.format(Number(rate.sell))}</td>
          <td class="number">${formatRate.format(Number(rate.nbu))}</td>
          <td class="number spread">${formatRate.format(spread)}</td>
        </tr>
      `;
    })
    .join("");

  snapshotRates();
}

function updateLiveRates() {
  state.tick += 1;
  state.rates = state.rates.map((rate, index) => {
    const wave = Math.sin((state.tick + index) * 0.74);
    const drift = (Math.random() - 0.48) * 0.08 + wave * 0.015;
    const nextBuy = clampRate(rate.buy + drift);
    const nextSell = clampRate(rate.sell + drift + 0.02 * Math.cos(state.tick + index));

    return {
      ...rate,
      buy: nextBuy,
      sell: Math.max(nextSell, nextBuy + 0.04),
      lastChange: nextSell - rate.sell,
    };
  });

  updatedAt.textContent = new Intl.DateTimeFormat("uk-UA", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
  render();
}

function renderCards() {
  const featured = state.rates.slice(0, 4);
  marketCards.innerHTML = featured
    .map((rate) => {
      const direction = rate.lastChange >= 0 ? "up" : "down";
      const sign = rate.lastChange >= 0 ? "+" : "";
      return `
        <article class="market-card">
          <div class="card-top">
            <div>
              <div class="card-code">${escapeHtml(rate.code)}</div>
              <div class="card-name">${escapeHtml(rate.name)}</div>
            </div>
            <span class="change-pill ${direction}">${sign}${formatRate.format(rate.lastChange)}</span>
          </div>
          <div class="card-price">${formatRate.format(rate.sell)}</div>
        </article>
      `;
    })
    .join("");
}

function renderTicker() {
  const items = state.rates
    .map((rate) => {
      const direction = rate.lastChange >= 0 ? "ticker-up" : "ticker-down";
      const sign = rate.lastChange >= 0 ? "+" : "";
      return `
        <span class="ticker-item">
          <span class="ticker-code">${escapeHtml(rate.code)}</span>
          <span>${formatRate.format(rate.sell)}</span>
          <span class="${direction}">${sign}${formatRate.format(rate.lastChange)}</span>
        </span>
      `;
    })
    .join("");

  tickerTrack.innerHTML = `${items}${items}`;
}

function snapshotRates() {
  state.previousRates = new Map(
    state.rates.map((rate) => [
      rate.code,
      {
        buy: rate.buy,
        sell: rate.sell,
      },
    ]),
  );
}

function getMoveClass(previous, current) {
  if (previous === undefined || Math.abs(current - previous) < 0.001) {
    return "";
  }

  return current > previous ? "flash-up" : "flash-down";
}

function clampRate(value) {
  return Math.max(0.01, Math.round(value * 10000) / 10000);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  render();
});

sortSelect.addEventListener("change", (event) => {
  state.sort = event.target.value;
  render();
});

loadRates().catch((error) => {
  updatedAt.textContent = "Помилка завантаження";
  emptyState.hidden = false;
  emptyState.textContent = error.message;
});
