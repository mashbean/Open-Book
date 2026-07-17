const state = {
  data: null,
  year: null,
  view: "overview",
};

const currency = new Intl.NumberFormat("zh-TW", {
  style: "currency",
  currency: "TWD",
  currencyDisplay: "narrowSymbol",
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 0 });

function formatCurrency(value) {
  return currency.format(value).replace(/^\$/, "NT$");
}

function formatCompact(value) {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(2)} 兆元`;
  if (absolute >= 100_000_000) return `${(value / 100_000_000).toFixed(1)} 億元`;
  if (absolute >= 10_000) return `${number.format(Math.round(value / 10_000))} 萬元`;
  return formatCurrency(value);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sum(rows) {
  return rows.reduce((total, row) => total + row.amount, 0);
}

function groupSum(rows, key) {
  const groups = new Map();
  for (const row of rows) {
    const name = row[key] || "其他";
    groups.set(name, (groups.get(name) || 0) + row.amount);
  }
  return [...groups.entries()].sort((left, right) => right[1] - left[1]);
}

function percentage(value, total) {
  return total > 0 ? `${((value / total) * 100).toFixed(1)}%` : "0%";
}

function comparison(current, previous) {
  if (!previous) return { value: "無法比較", detail: "缺少前一年度資料", className: "" };
  const difference = current - previous;
  const rate = (difference / previous) * 100;
  return {
    value: `${rate > 0 ? "+" : ""}${rate.toFixed(1)}%`,
    detail: `較上年度${difference >= 0 ? "增加" : "減少"} ${formatCompact(Math.abs(difference))}`,
    className: difference >= 0 ? "up" : "down",
  };
}

function statCard(label, value, detail = "", className = "") {
  return `<article class="stat-card"><span>${escapeHtml(label)}</span><strong class="${className}">${escapeHtml(value)}</strong>${detail ? `<small>${escapeHtml(detail)}</small>` : ""}</article>`;
}

function rowsFor(collection, year = state.year) {
  return state.data[collection].filter((row) => row.year === year);
}

function previousYear() {
  const years = state.data.meta.years;
  const index = years.indexOf(state.year);
  return index > 0 ? years[index - 1] : null;
}

function renderOverview() {
  const expenses = rowsFor("expenses");
  const revenues = rowsFor("revenues");
  const capital = rowsFor("capital");
  const previous = previousYear();
  const previousExpenses = previous ? rowsFor("expenses", previous) : [];
  const previousRevenues = previous ? rowsFor("revenues", previous) : [];
  const expenseTotal = sum(expenses);
  const revenueTotal = sum(revenues);
  const capitalTotal = sum(capital);
  const balance = revenueTotal - expenseTotal;
  const expenseChange = comparison(expenseTotal, sum(previousExpenses));

  ["#hero-year", "#glance-year", "#glance-chart-year", "#investment-year", "#capital-feature-year"].forEach((selector) => {
    document.querySelector(selector).textContent = state.year;
  });
  document.querySelector("#overview-stats").innerHTML = [
    statCard("年度歲出", formatCompact(expenseTotal), expenseChange.detail),
    statCard("年度歲入", formatCompact(revenueTotal), comparison(revenueTotal, sum(previousRevenues)).detail),
    statCard("資本投資", formatCompact(capitalTotal), `占歲出 ${percentage(capitalTotal, expenseTotal)}`),
    statCard("歲出分類筆數", `${expenses.length} 筆`, `${groupSum(expenses, "agency").length} 個主管機關`),
  ].join("");

  const agencies = groupSum(expenses, "agency").slice(0, 7);
  const agencyMax = agencies[0]?.[1] || 1;
  const agencyColors = ["#d4a853", "#78a57c", "#4d8060", "#2f6946", "#26573b", "#204a34", "#173c29"];
  document.querySelector("#hero-budget-bars").innerHTML = agencies
    .map(
      ([name, amount], index) => `<i title="${escapeHtml(name)} ${escapeHtml(formatCompact(amount))}" style="width:${(amount / expenseTotal) * 100}%;background:${agencyColors[index]}"></i>`,
    )
    .join("");
  document.querySelector("#investment-total").textContent = formatCompact(expenseTotal);
  document.querySelector("#investment-summary").textContent = `${agencies[0]?.[0] || "最大主管機關"}是目前最大的歲出主管機關，占年度歲出 ${percentage(agencies[0]?.[1] || 0, expenseTotal)}。`;
  document.querySelector("#agency-bars").innerHTML = agencies
    .map(
      ([name, amount], index) => `<div class="ranking-row">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <strong>${escapeHtml(name)}</strong>
        <span class="ranking-value">${escapeHtml(formatCompact(amount))} · ${percentage(amount, expenseTotal)}</span>
        <div class="ranking-meter"><i style="width:${(amount / agencyMax) * 100}%"></i></div>
      </div>`,
    )
    .join("");

  const revenueGroups = groupSum(revenues, "category");
  document.querySelector("#balance-revenue-total").textContent = formatCompact(revenueTotal);
  document.querySelector("#balance-expense-total").textContent = formatCompact(expenseTotal);
  document.querySelector("#balance-value").textContent = formatCompact(Math.abs(balance));
  document.querySelector("#balance-copy").textContent = balance >= 0 ? "歲入預算高於歲出預算" : "歲出預算高於歲入預算";
  document.querySelector("#revenue-overview").innerHTML = revenueGroups
    .slice(0, 4)
    .map(
      ([name, amount]) => `<div class="balance-item"><span>${escapeHtml(name)}</span><b>${escapeHtml(formatCompact(amount))}</b></div>`,
    )
    .join("");
  document.querySelector("#balance-expense-list").innerHTML = agencies
    .slice(0, 4)
    .map(([name, amount]) => `<div class="balance-item"><span>${escapeHtml(name)}</span><b>${escapeHtml(formatCompact(amount))}</b></div>`)
    .join("");

  const capitalAgencies = groupSum(capital, "agency").slice(0, 4);
  document.querySelector("#capital-highlight-total").textContent = formatCompact(capitalTotal);
  document.querySelector("#capital-highlight-list").innerHTML = capitalAgencies
    .map(([name, amount]) => `<div class="capital-highlight-card"><span>${escapeHtml(name)}</span><strong>${escapeHtml(formatCompact(amount))}</strong></div>`)
    .join("");

  document.querySelector("#summary-strip").innerHTML = [
    ["年度歲出", formatCompact(expenseTotal)],
    ["年度歲入", formatCompact(revenueTotal)],
    ["預算年度", `民國 ${state.year} 年`],
    ["主管機關", `${groupSum(expenses, "agency").length} 個`],
  ].map(([label, value]) => `<div class="summary-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
}

function renderExpenseView() {
  const rows = rowsFor("expenses");
  const total = sum(rows);
  const previous = previousYear();
  const previousTotal = previous ? sum(rowsFor("expenses", previous)) : 0;
  const change = comparison(total, previousTotal);
  const types = new Map(groupSum(rows, "type"));
  const agencies = groupSum(rows, "agency");

  document.querySelector("#expense-stats").innerHTML = [
    statCard(`${state.year} 年度歲出`, formatCompact(total), `${rows.length} 筆機關分類資料`),
    statCard("經常門", formatCompact(types.get("經常門") || 0), percentage(types.get("經常門") || 0, total)),
    statCard("資本門", formatCompact(types.get("資本門") || 0), percentage(types.get("資本門") || 0, total)),
    statCard("年度增減率", change.value, change.detail, change.className),
  ].join("");

  const query = document.querySelector("#expense-search").value.trim().toLowerCase();
  const filtered = rows
    .filter((row) => `${row.agency} ${row.item} ${row.type} ${row.code}`.toLowerCase().includes(query))
    .sort((left, right) => right.amount - left.amount);
  document.querySelector("#expense-table").innerHTML = filtered
    .map(
      (row) => `<tr><td><strong>${escapeHtml(row.agency)}</strong><br><small>${escapeHtml(row.item)}</small></td><td><span class="type-badge ${row.type === "資本門" ? "capital" : ""}">${escapeHtml(row.type)}</span></td><td>款${escapeHtml(row.code)}</td><td class="number">${escapeHtml(formatCurrency(row.amount))}</td><td class="number">${percentage(row.amount, total)}</td></tr>`,
    )
    .join("");
  document.querySelector("#expense-status").textContent = `顯示 ${filtered.length} 筆資料，共 ${agencies.length} 個主管機關`;
}

function renderRevenueView() {
  const rows = rowsFor("revenues");
  const total = sum(rows);
  const previous = previousYear();
  const previousTotal = previous ? sum(rowsFor("revenues", previous)) : 0;
  const change = comparison(total, previousTotal);
  const categories = groupSum(rows, "category");
  const largest = categories[0] || ["無資料", 0];

  document.querySelector("#revenue-stats").innerHTML = [
    statCard(`${state.year} 年度歲入`, formatCompact(total), `${rows.length} 筆來源科目`),
    statCard("最大歲入來源", largest[0], formatCompact(largest[1])),
    statCard("歲入來源分類", `${categories.length} 類`, "依官方來源別分類"),
    statCard("年度增減率", change.value, change.detail, change.className),
  ].join("");

  const query = document.querySelector("#revenue-search").value.trim().toLowerCase();
  const filtered = rows
    .filter((row) => `${row.category} ${row.item} ${row.type} ${row.code}`.toLowerCase().includes(query))
    .sort((left, right) => right.amount - left.amount);
  document.querySelector("#revenue-table").innerHTML = filtered
    .map(
      (row) => `<tr><td><strong>${escapeHtml(row.category)}</strong></td><td>${escapeHtml(row.item)}</td><td><span class="type-badge ${row.type === "資本門" ? "capital" : ""}">${escapeHtml(row.type)}</span></td><td class="number">${escapeHtml(formatCurrency(row.amount))}</td><td class="number">${percentage(row.amount, total)}</td></tr>`,
    )
    .join("");
  document.querySelector("#revenue-status").textContent = `顯示 ${filtered.length} 筆資料，共 ${categories.length} 類歲入來源`;
}

function renderCapitalView() {
  const rows = rowsFor("capital");
  const total = sum(rows);
  const previous = previousYear();
  const previousTotal = previous ? sum(rowsFor("capital", previous)) : 0;
  const change = comparison(total, previousTotal);
  const agencies = groupSum(rows, "agency");
  const largest = agencies[0] || ["無資料", 0];

  document.querySelector("#capital-stats").innerHTML = [
    statCard(`${state.year} 年度資本門`, formatCompact(total), `${percentage(total, sum(rowsFor("expenses")))} 的歲出預算`),
    statCard("最大主管機關", largest[0], formatCompact(largest[1])),
    statCard("主管機關數", `${agencies.length} 個`, "官方機關別彙總"),
    statCard("年度增減率", change.value, change.detail, change.className),
  ].join("");

  const query = document.querySelector("#capital-search").value.trim().toLowerCase();
  const filtered = rows
    .filter((row) => `${row.agency} ${row.purpose} ${row.source}`.toLowerCase().includes(query))
    .sort((left, right) => right.amount - left.amount);
  document.querySelector("#capital-table").innerHTML = filtered
    .map(
      (row) => `<tr><td><strong>${escapeHtml(row.agency)}</strong></td><td>${escapeHtml(row.purpose)}</td><td class="number">${escapeHtml(formatCurrency(row.amount))}</td><td>${escapeHtml(row.source)}</td></tr>`,
    )
    .join("");
  document.querySelector("#capital-status").textContent = `顯示 ${filtered.length} 筆主管機關彙總`;
}

function renderSources() {
  document.querySelector("#source-list").innerHTML = state.data.meta.sources
    .map(
      (source) => `<a class="source-card" href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer"><span class="source-org">${escapeHtml(source.organization)}</span><h2>${escapeHtml(source.title)}</h2><p>${escapeHtml(source.description)}</p><span class="source-link">開啟官方資料集 ↗</span></a>`,
    )
    .join("");
}

function renderFaq() {
  document.querySelector("#faq-list").innerHTML = state.data.meta.faqs
    .map(
      (item, index) => `<details ${index === 0 ? "open" : ""}><summary>${escapeHtml(item.question)}</summary><div class="faq-answer">${escapeHtml(item.answer)}</div></details>`,
    )
    .join("");
}

function renderAll() {
  renderOverview();
  renderExpenseView();
  renderRevenueView();
  renderCapitalView();
}

function showView(view, updateHash = true) {
  const target = document.querySelector(`[data-view-panel="${view}"]`);
  if (!target) return;
  state.view = view;
  document.querySelectorAll("[data-view-panel]").forEach((panel) => {
    const active = panel === target;
    panel.hidden = !active;
    panel.classList.toggle("active", active);
  });
  document.querySelectorAll(".primary-nav .nav-trigger").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  if (updateHash) history.replaceState(null, "", view === "overview" ? location.pathname : `#${view}`);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function csvValue(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadCsv(filename, headers, rows) {
  const content = [headers, ...rows].map((row) => row.map(csvValue).join(",")).join("\n");
  const blob = new Blob([`\ufeff${content}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function bindEvents() {
  document.querySelectorAll(".nav-trigger").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });
  document.querySelector("#year-select").addEventListener("change", (event) => {
    state.year = event.target.value;
    renderAll();
  });
  document.querySelector("#expense-search").addEventListener("input", renderExpenseView);
  document.querySelector("#revenue-search").addEventListener("input", renderRevenueView);
  document.querySelector("#capital-search").addEventListener("input", renderCapitalView);

  document.querySelector("#download-expenses").addEventListener("click", () => {
    const rows = rowsFor("expenses");
    downloadCsv(`taipei-expenses-${state.year}.csv`, ["年度", "歲出性質", "主管機關", "款", "科目", "金額"], rows.map((row) => [row.year, row.type, row.agency, row.code, row.item, row.amount]));
  });
  document.querySelector("#download-revenues").addEventListener("click", () => {
    const rows = rowsFor("revenues");
    downloadCsv(`taipei-revenues-${state.year}.csv`, ["年度", "歲入來源", "科目", "歲入性質", "項", "金額"], rows.map((row) => [row.year, row.category, row.item, row.type, row.code, row.amount]));
  });
  document.querySelector("#download-capital").addEventListener("click", () => {
    const rows = rowsFor("capital");
    downloadCsv(`taipei-capital-${state.year}.csv`, ["年度", "主管機關", "資料層級", "金額", "資料來源"], rows.map((row) => [row.year, row.agency, row.purpose, row.amount, row.source]));
  });
}

async function init() {
  try {
    const response = await fetch("./data.json");
    if (!response.ok) throw new Error(`資料載入失敗 ${response.status}`);
    state.data = await response.json();
    state.year = state.data.meta.years.at(-1);

    const yearSelect = document.querySelector("#year-select");
    yearSelect.innerHTML = [...state.data.meta.years]
      .reverse()
      .map((year) => `<option value="${escapeHtml(year)}">${escapeHtml(year)} 年度</option>`)
      .join("");
    yearSelect.value = state.year;

    renderAll();
    renderSources();
    renderFaq();
    bindEvents();
    document.querySelector("#generated-date").textContent =
      `資料建置 ${new Date(state.data.meta.generatedAt).toLocaleDateString("zh-TW")}`;

    const initialView = location.hash.slice(1);
    showView(document.querySelector(`[data-view-panel="${initialView}"]`) ? initialView : "overview", false);
    document.querySelector("#loading-screen").classList.add("done");
  } catch (error) {
    const loading = document.querySelector("#loading-screen");
    loading.innerHTML = `<strong>資料暫時無法載入</strong><span>${escapeHtml(error.message)}</span>`;
  }
}

init();
