import { FX, agencyEn, faqEn, revenueCategoryEn, revenueItemEn, sourceEn, ui } from "./i18n.js";

const initialLanguage = new URLSearchParams(location.search).get("lang") === "en" ? "en" : "zh";

const state = {
  data: null,
  year: null,
  view: "overview",
  language: initialLanguage,
};

const twdCurrency = new Intl.NumberFormat("zh-TW", {
  style: "currency",
  currency: "TWD",
  currencyDisplay: "narrowSymbol",
  maximumFractionDigits: 0,
});

const usdCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const zhNumber = new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 0 });

function t(key, values = {}) {
  let result = ui[state.language][key] ?? ui.zh[key] ?? key;
  for (const [name, value] of Object.entries(values)) result = result.replaceAll(`{${name}}`, value);
  return result;
}

function isEnglish() {
  return state.language === "en";
}

function gregorianYear(rocYear) {
  return Number(rocYear) + 1911;
}

function displayYear(rocYear = state.year) {
  return isEnglish() ? `FY${gregorianYear(rocYear)}` : `${rocYear} 年度`;
}

function toUsd(value) {
  return value / FX.rate;
}

function formatCurrency(value) {
  if (isEnglish()) return usdCurrency.format(toUsd(value));
  return twdCurrency.format(value).replace(/^\$/, "NT$");
}

function formatCompact(value) {
  if (isEnglish()) {
    const usd = toUsd(value);
    const absolute = Math.abs(usd);
    if (absolute >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(2)}B`;
    if (absolute >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
    if (absolute >= 1_000) return `$${(usd / 1_000).toFixed(0)}K`;
    return usdCurrency.format(usd);
  }
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(2)} 兆元`;
  if (absolute >= 100_000_000) return `${(value / 100_000_000).toFixed(1)} 億元`;
  if (absolute >= 10_000) return `${zhNumber.format(Math.round(value / 10_000))} 萬元`;
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

function displayAgency(value) {
  return isEnglish() ? agencyEn[value] || value : value;
}

function displayRevenueCategory(value) {
  return isEnglish() ? revenueCategoryEn[value] || value : value;
}

function displayRevenueItem(value) {
  return isEnglish() ? revenueItemEn[value] || value : value;
}

function displayType(value) {
  if (!isEnglish()) return value;
  if (value === "經常門") return "Operating";
  if (value === "資本門") return "Capital";
  return value;
}

function displayExpenseItem(row) {
  if (!isEnglish()) return row.item;
  return `${displayAgency(row.agency)} ${row.type === "資本門" ? "capital" : "operating"} appropriation`;
}

function displayCapitalPurpose(value) {
  return isEnglish() ? "Capital appropriation (agency aggregate)" : value;
}

function displayCapitalSource(value) {
  return isEnglish() ? "Taipei City General Budget" : value;
}

function comparison(current, previous) {
  if (!previous) {
    return {
      value: isEnglish() ? "Not available" : "無法比較",
      detail: isEnglish() ? "Prior-year data is unavailable" : "缺少前一年度資料",
      className: "",
    };
  }
  const difference = current - previous;
  const rate = (difference / previous) * 100;
  return {
    value: `${rate > 0 ? "+" : ""}${rate.toFixed(1)}%`,
    detail: isEnglish()
      ? `${difference >= 0 ? "Up" : "Down"} ${formatCompact(Math.abs(difference))} from the prior year`
      : `較上年度${difference >= 0 ? "增加" : "減少"} ${formatCompact(Math.abs(difference))}`,
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

function applyStaticTranslations() {
  document.documentElement.lang = isEnglish() ? "en" : "zh-Hant-TW";
  document.body.classList.toggle("lang-en", isEnglish());
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-html]").forEach((element) => {
    element.innerHTML = t(element.dataset.i18nHtml);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((element) => {
    element.setAttribute("aria-label", t(element.dataset.i18nAria));
  });
  document.querySelectorAll("[data-language]").forEach((button) => {
    const active = button.dataset.language === state.language;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  const title = isEnglish() ? "Taipei City OpenBook" : "臺北市開放預算";
  const description = isEnglish()
    ? "Explore Taipei City's expenses, revenues, and capital budget using official open data, with USD estimates for international readers."
    : "探索臺北市歲出、歲入與資本門預算，回到官方資料核對每個數字。";
  document.title = title;
  document.querySelector('meta[name="description"]').content = description;
  document.querySelector('meta[property="og:title"]').content = title;
  document.querySelector('meta[property="og:description"]').content = description;
}

function renderYearSelect() {
  const yearSelect = document.querySelector("#year-select");
  yearSelect.innerHTML = [...state.data.meta.years]
    .reverse()
    .map((year) => `<option value="${escapeHtml(year)}">${escapeHtml(displayYear(year))}</option>`)
    .join("");
  yearSelect.value = state.year;
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
  const yearLabel = displayYear();

  document.querySelector("#hero-expense-cta").textContent = t("exploreBudget", { year: yearLabel });
  document.querySelector("#glance-title").textContent = t("glance", { year: yearLabel });
  document.querySelector("#glance-chart-title").textContent = isEnglish() ? `${yearLabel} Expenses` : `${state.year} 年度歲出`;
  document.querySelector("#investment-kicker").textContent = t("fiscalYearBudget", { year: yearLabel });
  document.querySelector("#capital-budget-label").innerHTML = t("capitalBudget", { year: yearLabel });

  const agencyCount = groupSum(expenses, "agency").length;
  document.querySelector("#overview-stats").innerHTML = [
    statCard(isEnglish() ? "Annual Expenses" : "年度歲出", formatCompact(expenseTotal), expenseChange.detail),
    statCard(isEnglish() ? "Annual Revenue" : "年度歲入", formatCompact(revenueTotal), comparison(revenueTotal, sum(previousRevenues)).detail),
    statCard(isEnglish() ? "Capital Investment" : "資本投資", formatCompact(capitalTotal), isEnglish() ? `${percentage(capitalTotal, expenseTotal)} of expenses` : `占歲出 ${percentage(capitalTotal, expenseTotal)}`),
    statCard(isEnglish() ? "Expense Records" : "歲出分類筆數", isEnglish() ? `${expenses.length} records` : `${expenses.length} 筆`, isEnglish() ? `${agencyCount} supervising agencies` : `${agencyCount} 個主管機關`),
  ].join("");

  const agencies = groupSum(expenses, "agency").slice(0, 7);
  const agencyMax = agencies[0]?.[1] || 1;
  const agencyColors = ["#d4a853", "#78a57c", "#4d8060", "#2f6946", "#26573b", "#204a34", "#173c29"];
  document.querySelector("#hero-budget-bars").innerHTML = agencies
    .map(([name, amount], index) => `<i title="${escapeHtml(displayAgency(name))} ${escapeHtml(formatCompact(amount))}" style="width:${(amount / expenseTotal) * 100}%;background:${agencyColors[index]}"></i>`)
    .join("");
  document.querySelector("#investment-total").textContent = formatCompact(expenseTotal);
  const largestAgency = displayAgency(agencies[0]?.[0] || "最大主管機關");
  document.querySelector("#investment-summary").textContent = isEnglish()
    ? `${largestAgency} is the largest supervising agency, representing ${percentage(agencies[0]?.[1] || 0, expenseTotal)} of annual expenses.`
    : `${largestAgency}是目前最大的歲出主管機關，占年度歲出 ${percentage(agencies[0]?.[1] || 0, expenseTotal)}。`;
  document.querySelector("#agency-bars").innerHTML = agencies
    .map(([name, amount], index) => `<div class="ranking-row">
      <span>${String(index + 1).padStart(2, "0")}</span>
      <strong>${escapeHtml(displayAgency(name))}</strong>
      <span class="ranking-value">${escapeHtml(formatCompact(amount))} · ${percentage(amount, expenseTotal)}</span>
      <div class="ranking-meter"><i style="width:${(amount / agencyMax) * 100}%"></i></div>
    </div>`)
    .join("");

  const revenueGroups = groupSum(revenues, "category");
  document.querySelector("#balance-revenue-total").textContent = formatCompact(revenueTotal);
  document.querySelector("#balance-expense-total").textContent = formatCompact(expenseTotal);
  document.querySelector("#balance-value").textContent = formatCompact(Math.abs(balance));
  document.querySelector("#balance-copy").textContent = isEnglish()
    ? balance >= 0 ? "Budgeted revenue exceeds expenses" : "Budgeted expenses exceed revenue"
    : balance >= 0 ? "歲入預算高於歲出預算" : "歲出預算高於歲入預算";
  document.querySelector("#revenue-overview").innerHTML = revenueGroups
    .slice(0, 4)
    .map(([name, amount]) => `<div class="balance-item"><span>${escapeHtml(displayRevenueCategory(name))}</span><b>${escapeHtml(formatCompact(amount))}</b></div>`)
    .join("");
  document.querySelector("#balance-expense-list").innerHTML = agencies
    .slice(0, 4)
    .map(([name, amount]) => `<div class="balance-item"><span>${escapeHtml(displayAgency(name))}</span><b>${escapeHtml(formatCompact(amount))}</b></div>`)
    .join("");

  const capitalAgencies = groupSum(capital, "agency").slice(0, 4);
  document.querySelector("#capital-highlight-total").textContent = formatCompact(capitalTotal);
  document.querySelector("#capital-highlight-list").innerHTML = capitalAgencies
    .map(([name, amount]) => `<div class="capital-highlight-card"><span>${escapeHtml(displayAgency(name))}</span><strong>${escapeHtml(formatCompact(amount))}</strong></div>`)
    .join("");

  document.querySelector("#summary-strip").innerHTML = [
    [isEnglish() ? "Annual Expenses" : "年度歲出", formatCompact(expenseTotal)],
    [isEnglish() ? "Annual Revenue" : "年度歲入", formatCompact(revenueTotal)],
    [isEnglish() ? "Fiscal Year" : "預算年度", yearLabel],
    [isEnglish() ? "Agencies" : "主管機關", isEnglish() ? `${agencyCount}` : `${agencyCount} 個`],
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
    statCard(isEnglish() ? `${displayYear()} Expenses` : `${state.year} 年度歲出`, formatCompact(total), isEnglish() ? `${rows.length} agency-class records` : `${rows.length} 筆機關分類資料`),
    statCard(displayType("經常門"), formatCompact(types.get("經常門") || 0), percentage(types.get("經常門") || 0, total)),
    statCard(displayType("資本門"), formatCompact(types.get("資本門") || 0), percentage(types.get("資本門") || 0, total)),
    statCard(isEnglish() ? "Annual Change" : "年度增減率", change.value, change.detail, change.className),
  ].join("");

  const query = document.querySelector("#expense-search").value.trim().toLowerCase();
  const filtered = rows
    .filter((row) => `${row.agency} ${agencyEn[row.agency] || ""} ${row.item} ${displayExpenseItem(row)} ${row.type} ${displayType(row.type)} ${row.code}`.toLowerCase().includes(query))
    .sort((left, right) => right.amount - left.amount);
  document.querySelector("#expense-table").innerHTML = filtered
    .map((row) => `<tr><td><strong>${escapeHtml(displayAgency(row.agency))}</strong><br><small>${escapeHtml(displayExpenseItem(row))}</small></td><td><span class="type-badge ${row.type === "資本門" ? "capital" : ""}">${escapeHtml(displayType(row.type))}</span></td><td>${isEnglish() ? "Section" : "款"}${escapeHtml(row.code)}</td><td class="number">${escapeHtml(formatCurrency(row.amount))}</td><td class="number">${percentage(row.amount, total)}</td></tr>`)
    .join("");
  document.querySelector("#expense-status").textContent = isEnglish()
    ? `Showing ${filtered.length} records across ${agencies.length} supervising agencies`
    : `顯示 ${filtered.length} 筆資料，共 ${agencies.length} 個主管機關`;
}

function renderRevenueView() {
  const rows = rowsFor("revenues");
  const total = sum(rows);
  const previous = previousYear();
  const previousTotal = previous ? sum(rowsFor("revenues", previous)) : 0;
  const change = comparison(total, previousTotal);
  const categories = groupSum(rows, "category");
  const largest = categories[0] || [isEnglish() ? "No data" : "無資料", 0];

  document.querySelector("#revenue-stats").innerHTML = [
    statCard(isEnglish() ? `${displayYear()} Revenue` : `${state.year} 年度歲入`, formatCompact(total), isEnglish() ? `${rows.length} source-item records` : `${rows.length} 筆來源科目`),
    statCard(isEnglish() ? "Largest Revenue Source" : "最大歲入來源", displayRevenueCategory(largest[0]), formatCompact(largest[1])),
    statCard(isEnglish() ? "Revenue Categories" : "歲入來源分類", isEnglish() ? `${categories.length}` : `${categories.length} 類`, isEnglish() ? "Official source classification" : "依官方來源別分類"),
    statCard(isEnglish() ? "Annual Change" : "年度增減率", change.value, change.detail, change.className),
  ].join("");

  const query = document.querySelector("#revenue-search").value.trim().toLowerCase();
  const filtered = rows
    .filter((row) => `${row.category} ${revenueCategoryEn[row.category] || ""} ${row.item} ${revenueItemEn[row.item] || ""} ${row.type} ${displayType(row.type)} ${row.code}`.toLowerCase().includes(query))
    .sort((left, right) => right.amount - left.amount);
  document.querySelector("#revenue-table").innerHTML = filtered
    .map((row) => `<tr><td><strong>${escapeHtml(displayRevenueCategory(row.category))}</strong></td><td>${escapeHtml(displayRevenueItem(row.item))}</td><td><span class="type-badge ${row.type === "資本門" ? "capital" : ""}">${escapeHtml(displayType(row.type))}</span></td><td class="number">${escapeHtml(formatCurrency(row.amount))}</td><td class="number">${percentage(row.amount, total)}</td></tr>`)
    .join("");
  document.querySelector("#revenue-status").textContent = isEnglish()
    ? `Showing ${filtered.length} records across ${categories.length} revenue categories`
    : `顯示 ${filtered.length} 筆資料，共 ${categories.length} 類歲入來源`;
}

function renderCapitalView() {
  const rows = rowsFor("capital");
  const total = sum(rows);
  const previous = previousYear();
  const previousTotal = previous ? sum(rowsFor("capital", previous)) : 0;
  const change = comparison(total, previousTotal);
  const agencies = groupSum(rows, "agency");
  const largest = agencies[0] || [isEnglish() ? "No data" : "無資料", 0];

  document.querySelector("#capital-stats").innerHTML = [
    statCard(isEnglish() ? `${displayYear()} Capital` : `${state.year} 年度資本門`, formatCompact(total), isEnglish() ? `${percentage(total, sum(rowsFor("expenses")))} of expenses` : `${percentage(total, sum(rowsFor("expenses")))} 的歲出預算`),
    statCard(isEnglish() ? "Largest Agency" : "最大主管機關", displayAgency(largest[0]), formatCompact(largest[1])),
    statCard(isEnglish() ? "Supervising Agencies" : "主管機關數", isEnglish() ? `${agencies.length}` : `${agencies.length} 個`, isEnglish() ? "Official agency aggregates" : "官方機關別彙總"),
    statCard(isEnglish() ? "Annual Change" : "年度增減率", change.value, change.detail, change.className),
  ].join("");

  const query = document.querySelector("#capital-search").value.trim().toLowerCase();
  const filtered = rows
    .filter((row) => `${row.agency} ${agencyEn[row.agency] || ""} ${row.purpose} ${displayCapitalPurpose(row.purpose)} ${row.source} ${displayCapitalSource(row.source)}`.toLowerCase().includes(query))
    .sort((left, right) => right.amount - left.amount);
  document.querySelector("#capital-table").innerHTML = filtered
    .map((row) => `<tr><td><strong>${escapeHtml(displayAgency(row.agency))}</strong></td><td>${escapeHtml(displayCapitalPurpose(row.purpose))}</td><td class="number">${escapeHtml(formatCurrency(row.amount))}</td><td>${escapeHtml(displayCapitalSource(row.source))}</td></tr>`)
    .join("");
  document.querySelector("#capital-status").textContent = isEnglish()
    ? `Showing ${filtered.length} agency aggregates`
    : `顯示 ${filtered.length} 筆主管機關彙總`;
}

function renderSources() {
  document.querySelector("#source-list").innerHTML = state.data.meta.sources
    .map((source, index) => {
      const localized = isEnglish() ? sourceEn[index] || source : source;
      return `<a class="source-card" href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer"><span class="source-org">${escapeHtml(localized.organization)}</span><h2>${escapeHtml(localized.title)}</h2><p>${escapeHtml(localized.description)}</p><span class="source-link">${isEnglish() ? "Open official dataset" : "開啟官方資料集"} ↗</span></a>`;
    })
    .join("");
}

function renderFaq() {
  const items = isEnglish() ? faqEn : state.data.meta.faqs;
  document.querySelector("#faq-list").innerHTML = items
    .map((item, index) => `<details ${index === 0 ? "open" : ""}><summary>${escapeHtml(item.question)}</summary><div class="faq-answer">${escapeHtml(item.answer)}</div></details>`)
    .join("");
}

function renderGeneratedDate() {
  const date = new Date(state.data.meta.generatedAt);
  document.querySelector("#generated-date").textContent = isEnglish()
    ? `Data build ${date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`
    : `資料建置 ${date.toLocaleDateString("zh-TW")}`;
}

function renderAll() {
  renderOverview();
  renderExpenseView();
  renderRevenueView();
  renderCapitalView();
}

function updateUrl(view = state.view) {
  const url = new URL(location.href);
  if (state.language === "en") url.searchParams.set("lang", "en");
  else url.searchParams.delete("lang");
  url.hash = view === "overview" ? "" : view;
  history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function showView(view, updateHistory = true) {
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
  if (updateHistory) updateUrl(view);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setLanguage(language) {
  state.language = language === "en" ? "en" : "zh";
  applyStaticTranslations();
  renderYearSelect();
  renderAll();
  renderSources();
  renderFaq();
  renderGeneratedDate();
  updateUrl();
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
  document.querySelectorAll("[data-language]").forEach((button) => {
    button.addEventListener("click", () => setLanguage(button.dataset.language));
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
    if (isEnglish()) {
      downloadCsv(`taipei-expenses-${gregorianYear(state.year)}-usd.csv`, ["Fiscal year", "Budget class", "Supervising agency", "Section", "Item", "Amount (USD estimate)", "Official amount (TWD)", "TWD per USD"], rows.map((row) => [gregorianYear(row.year), displayType(row.type), displayAgency(row.agency), row.code, displayExpenseItem(row), (row.amount / FX.rate).toFixed(2), row.amount, FX.rate]));
    } else {
      downloadCsv(`taipei-expenses-${state.year}.csv`, ["年度", "歲出性質", "主管機關", "款", "科目", "金額（新臺幣）"], rows.map((row) => [row.year, row.type, row.agency, row.code, row.item, row.amount]));
    }
  });
  document.querySelector("#download-revenues").addEventListener("click", () => {
    const rows = rowsFor("revenues");
    if (isEnglish()) {
      downloadCsv(`taipei-revenues-${gregorianYear(state.year)}-usd.csv`, ["Fiscal year", "Revenue source", "Item", "Class", "Section", "Amount (USD estimate)", "Official amount (TWD)", "TWD per USD"], rows.map((row) => [gregorianYear(row.year), displayRevenueCategory(row.category), displayRevenueItem(row.item), displayType(row.type), row.code, (row.amount / FX.rate).toFixed(2), row.amount, FX.rate]));
    } else {
      downloadCsv(`taipei-revenues-${state.year}.csv`, ["年度", "歲入來源", "科目", "歲入性質", "項", "金額（新臺幣）"], rows.map((row) => [row.year, row.category, row.item, row.type, row.code, row.amount]));
    }
  });
  document.querySelector("#download-capital").addEventListener("click", () => {
    const rows = rowsFor("capital");
    if (isEnglish()) {
      downloadCsv(`taipei-capital-${gregorianYear(state.year)}-usd.csv`, ["Fiscal year", "Supervising agency", "Data level", "Amount (USD estimate)", "Official amount (TWD)", "Source", "TWD per USD"], rows.map((row) => [gregorianYear(row.year), displayAgency(row.agency), displayCapitalPurpose(row.purpose), (row.amount / FX.rate).toFixed(2), row.amount, displayCapitalSource(row.source), FX.rate]));
    } else {
      downloadCsv(`taipei-capital-${state.year}.csv`, ["年度", "主管機關", "資料層級", "金額（新臺幣）", "資料來源"], rows.map((row) => [row.year, row.agency, row.purpose, row.amount, row.source]));
    }
  });
}

async function init() {
  applyStaticTranslations();
  try {
    const response = await fetch("./data.json");
    if (!response.ok) throw new Error(`${isEnglish() ? "Data failed to load" : "資料載入失敗"} ${response.status}`);
    state.data = await response.json();
    state.year = state.data.meta.years.at(-1);

    renderYearSelect();
    renderAll();
    renderSources();
    renderFaq();
    renderGeneratedDate();
    bindEvents();

    const initialView = location.hash.slice(1);
    showView(document.querySelector(`[data-view-panel="${initialView}"]`) ? initialView : "overview", false);
    document.querySelector("#loading-screen").classList.add("done");
  } catch (error) {
    const loading = document.querySelector("#loading-screen");
    loading.innerHTML = `<strong>${isEnglish() ? "Budget data is temporarily unavailable" : "資料暫時無法載入"}</strong><span>${escapeHtml(error.message)}</span>`;
  }
}

init();
