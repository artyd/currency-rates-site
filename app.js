const state = {
  rates: [],
  query: "",
  sort: "code",
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

async function loadRates() {
  const response = await fetch("data/rates.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Cannot load rates.json: ${response.status}`);
  }

  const data = await response.json();
  state.rates = Array.isArray(data.rates) ? data.rates : [];
  updatedAt.textContent = data.updatedAt || "Невідомо";
  render();
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

  ratesBody.innerHTML = rates
    .map((rate) => {
      const spread = getSpread(rate);
      return `
        <tr>
          <td><span class="code">${escapeHtml(rate.code)}</span></td>
          <td>${escapeHtml(rate.name)}</td>
          <td class="number">${formatRate.format(Number(rate.buy))}</td>
          <td class="number">${formatRate.format(Number(rate.sell))}</td>
          <td class="number">${formatRate.format(Number(rate.nbu))}</td>
          <td class="number spread">${formatRate.format(spread)}</td>
        </tr>
      `;
    })
    .join("");
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
