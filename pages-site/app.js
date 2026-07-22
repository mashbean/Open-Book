import { FX, agencyEn, faqEn, revenueCategoryEn, revenueItemEn, sourceEn, ui } from "./i18n.js";

const initialLanguage = new URLSearchParams(location.search).get("lang") === "en" ? "en" : "zh";

const state = {
  data: null,
  cities: null,
  year: null,
  view: "nationwide",
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

function displayCity(row) {
  return isEnglish() ? row.city_en : row.city;
}

function displayRegion(region) {
  if (!isEnglish()) return region;
  return { 北部: "North", 中部: "Central", 南部: "South", 東部: "East", 外島: "Offshore islands" }[region] || region;
}

function displayMachineLevel(level) {
  if (!isEnglish()) return level;
  return { 完整: "Full structured", 部分: "Partial structured", 文件: "Documents" }[level] || level;
}

function displayUnitDetail(level) {
  if (!isEnglish()) return level;
  return { 官方完整: "Complete official detail", 民代協助: "Obtained with councilor support", 尚未取得: "Not yet available" }[level] || level;
}

function displayInterface(value) {
  if (!isEnglish()) return value;
  return { API: "API", 檔案: "Machine-readable files", 文件: "Document downloads" }[value] || value;
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

  const title = isEnglish() ? "Taiwan Local Government OpenBook" : "臺灣地方政府 OpenBook";
  const description = isEnglish()
    ? "Compare FY2026 budgets across Taiwan's 22 local governments, then explore Taipei's detailed official open data with USD estimates."
    : "比較 22 縣市預算規模、功能分類、資本支出與資料開放成熟度，再深入探索臺北市官方資料。";
  document.title = title;
  document.querySelector('meta[name="description"]').content = description;
  document.querySelector('meta[property="og:title"]').content = title;
  document.querySelector('meta[property="og:description"]').content = description;
}

function nationalAmount(thousandTwd) {
  return formatCompact(thousandTwd * 1000);
}

function nationalCategoryRows(city) {
  return [
    [isEnglish() ? "Education, science & culture" : "教育科學文化", city.education_science_culture_thousand_twd],
    [isEnglish() ? "Economic development" : "經濟發展", city.economic_development_thousand_twd],
    [isEnglish() ? "Social welfare" : "社會福利", city.social_welfare_thousand_twd],
    [isEnglish() ? "General government" : "一般政務", city.general_government_thousand_twd],
    [isEnglish() ? "Community & environment" : "社區與環境", city.community_environment_thousand_twd],
  ].sort((left, right) => right[1] - left[1]);
}

function percentNumber(value, digits = 1) {
  return `${(Number(value || 0) * 100).toFixed(digits)}%`;
}

function cityWatchpoint(row) {
  if (row.metrics.financing_turnover_share >= .7) {
    return isEnglish()
      ? `Borrowing plus debt repayment equals ${percentNumber(row.metrics.financing_turnover_share)} of expenses. Compare gross refinancing with the much smaller net change.`
      : `舉借與還本合計相當於歲出的 ${percentNumber(row.metrics.financing_turnover_share)}，需把毛額換債和較小的淨變動分開看。`;
  }
  const increase = row.openfun?.largest_latest_increase;
  if (increase?.change_rate >= 1) {
    return isEnglish()
      ? `OpenFun shows “${increase.program}” up ${percentNumber(increase.change_rate)} year over year. Check reclassification, grants, and one-off projects.`
      : `OpenFun 顯示「${increase.program}」較前一年增加 ${percentNumber(increase.change_rate)}，應回查重分類、補助與一次性工程。`;
  }
  if (row.openfun?.status !== "ok") {
    return isEnglish() ? "OpenFun's documented work-program CSV returns 404 for this locality." : "OpenFun 文件所列的工作計畫 CSV 在此縣市回傳 404。";
  }
  if (row.openfun?.latest_year < 115) {
    return isEnglish() ? `OpenFun's latest work-program year is ROC ${row.openfun.latest_year}, behind the FY2026 common baseline.` : `OpenFun 工作計畫最新只到 ${row.openfun.latest_year} 年，落後 115 年共同基準。`;
  }
  if (!row.twinkle?.selected_is_citywide_expense_budget) {
    return isEnglish() ? "Twinkle returned data for the locality, but its best hit was not a citywide expense budget." : "Twinkle 找到同縣市資料，但最佳命中並非全縣市歲出總預算。";
  }
  return isEnglish()
    ? `Capital expenses are ${percentNumber(row.metrics.capital_share)} of the budget. Open the source before inferring project priorities.`
    : `資本支出占歲出 ${percentNumber(row.metrics.capital_share)}，判讀建設優先順序前仍需回到原表。`;
}

function renderInterfaceAudit(all) {
  const audit = state.cities.meta.interface_audit;
  const summary = audit.summary;
  const cards = [
    ["OpenFun CSV", `${summary.openfun_ok}/22`, isEnglish() ? "Work-program files readable; Changhua returns 404" : "工作計畫可讀，彰化縣回傳 404"],
    [isEnglish() ? "Plan narratives" : "計畫文字", `${summary.openfun_detail_json_substantive}/22`, isEnglish() ? "Non-empty detailed JSON; the rest are empty or unavailable" : "詳細 JSON 有實際內容，其餘為空或無法取得"],
    ["Twinkle MCP", `${summary.twinkle_ok}/22`, isEnglish() ? "All searches completed with authenticated MCP calls" : "22 次認證 MCP 查詢都完成"],
    [isEnglish() ? "Citywide hits" : "全市歲出命中", `${summary.twinkle_citywide_expense_budget}/22`, isEnglish() ? "Best result is genuinely a citywide expense budget" : "最佳結果確實是全縣市歲出總預算"],
  ];
  document.querySelector("#interface-audit-stats").innerHTML = cards.map(([label, value, detail]) => `<div class="interface-audit-stat"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(detail)}</small></div>`).join("");

  const taichung = all.find((row) => row.city === "臺中市");
  const newTaipei = all.find((row) => row.city === "新北市");
  const hsinchu = all.find((row) => row.city === "新竹市");
  const tainan = all.find((row) => row.city === "臺南市");
  const kinmen = all.find((row) => row.city === "金門縣");
  const tainanIncrease = tainan.openfun.largest_latest_increase;
  const tainanDecrease = tainan.openfun.largest_latest_decrease;
  const hsinchuIncrease = hsinchu.openfun.largest_latest_increase;
  const watchpoints = isEnglish() ? [
    { source: "DGBAS", title: "Taichung and New Taipei show unusually large gross financing flows", copy: `Taichung budgeted ${nationalAmount(taichung.borrowing_thousand_twd)} of borrowing and ${nationalAmount(taichung.debt_repayment_thousand_twd)} of repayment. New Taipei budgeted ${nationalAmount(newTaipei.borrowing_thousand_twd)} and ${nationalAmount(newTaipei.debt_repayment_thousand_twd)} respectively.`, question: "Ask how much is refinancing, fund scheduling, and genuinely new debt." },
    { source: "OpenFun", title: "Hsinchu's industry-management program jumped from a small base", copy: `The work-program table rises from ${nationalAmount(hsinchuIncrease.prior_thousand_twd)} to ${nationalAmount(hsinchuIncrease.current_thousand_twd)}, a ${percentNumber(hsinchuIncrease.change_rate)} increase.`, question: "Check account reclassification and one-off economic-development projects." },
    { source: "OpenFun", title: "Tainan shows a large shift between health and social-welfare programs", copy: `Health operations rose ${percentNumber(tainanIncrease.change_rate)} while the largest social-welfare line fell ${percentNumber(Math.abs(tainanDecrease.change_rate))}.`, question: "Return to the budget books to test whether grants, funds, or classification changed." },
    { source: "DGBAS", title: "Kinmen funds nearly one-fifth of expenses from prior surpluses", copy: `${nationalAmount(kinmen.prior_surplus_thousand_twd)} equals ${percentNumber(kinmen.metrics.prior_surplus_share)} of expenses, while capital expenses reach ${percentNumber(kinmen.metrics.capital_share)}.`, question: "Ask whether the drawdown is recurring and what reserves remain." },
    { source: "OpenFun", title: "Coverage claims hide empty and stale files", copy: `Changhua's work-program CSV returns 404, only ${summary.openfun_detail_json_substantive} localities have non-empty plan-narrative JSON, and Penghu's work-program data stops at ROC 110.`, question: "Treat a listed folder as a lead, not proof of usable coverage." },
    { source: "Twinkle", title: "A successful MCP call does not guarantee a usable budget table", copy: `Only ${summary.twinkle_citywide_expense_budget} of 22 best hits are citywide expense budgets. Hsinchu County's selected CSV also exposes mojibake column names.`, question: "Grade semantic relevance, encoding, row count, and source links separately." },
  ] : [
    { source: "主計總處", title: "臺中與新北的融資毛流量特別大", copy: `臺中編列舉借 ${nationalAmount(taichung.borrowing_thousand_twd)}、還本 ${nationalAmount(taichung.debt_repayment_thousand_twd)}；新北分別為 ${nationalAmount(newTaipei.borrowing_thousand_twd)} 與 ${nationalAmount(newTaipei.debt_repayment_thousand_twd)}。`, question: "應追問多少屬換債、基金調度與真正新增債務。" },
    { source: "OpenFun", title: "新竹市工商管理從低基期大幅跳升", copy: `工作計畫由 ${nationalAmount(hsinchuIncrease.prior_thousand_twd)} 增至 ${nationalAmount(hsinchuIncrease.current_thousand_twd)}，增幅 ${percentNumber(hsinchuIncrease.change_rate)}。`, question: "需查科目重分類與一次性產業發展計畫。" },
    { source: "OpenFun", title: "臺南衛生與社福計畫出現大幅反向移動", copy: `衛生業務增加 ${percentNumber(tainanIncrease.change_rate)}，最大社福項目則減少 ${percentNumber(Math.abs(tainanDecrease.change_rate))}。`, question: "需回預算書查中央補助、基金與分類是否改變。" },
    { source: "主計總處", title: "金門近兩成歲出靠以前年度賸餘調節", copy: `${nationalAmount(kinmen.prior_surplus_thousand_twd)} 相當於歲出的 ${percentNumber(kinmen.metrics.prior_surplus_share)}，同時資本支出占 ${percentNumber(kinmen.metrics.capital_share)}。`, question: "應追問動用是否持續，以及剩餘財政緩衝。" },
    { source: "OpenFun", title: "涵蓋清單裡仍有空檔與舊資料", copy: `彰化工作計畫 CSV 回傳 404，只有 ${summary.openfun_detail_json_substantive} 縣市的計畫文字 JSON 不是空檔，澎湖工作計畫停在 110 年。`, question: "資料夾存在只能當線索，不能當成可用資料證明。" },
    { source: "Twinkle", title: "MCP 成功不等於命中可用的總預算", copy: `22 縣市中只有 ${summary.twinkle_citywide_expense_budget} 個最佳命中是全縣市歲出總預算；新竹縣命中的 CSV 欄位還出現亂碼。`, question: "語意相關性、編碼、列數與來源回鏈必須分開驗收。" },
  ];
  document.querySelector("#national-watchpoints").innerHTML = watchpoints.map((item) => `<article class="watchpoint-card"><span class="watchpoint-source">${escapeHtml(item.source)}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.copy)}</p><b>${escapeHtml(item.question)}</b></article>`).join("");

  document.querySelector("#interface-matrix-body").innerHTML = all.map((row) => {
    const openfunOk = row.openfun.status === "ok";
    const detail = row.openfun.detailed_plan_json?.substantive;
    const twinkleCitywide = row.twinkle.selected_is_citywide_expense_budget;
    const twinkleExact = row.twinkle.selected_is_exact_city_match;
    const sourceUrl = row.twinkle.selected_metadata?.source_url;
    const selectedTitle = row.twinkle.selected_title || (isEnglish() ? "No result" : "沒有結果");
    const selected = sourceUrl ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(selectedTitle)} ↗</a>` : escapeHtml(selectedTitle);
    const openfunText = openfunOk
      ? `${row.openfun.latest_year} · ${zhNumber.format(row.openfun.row_count)} ${isEnglish() ? "rows" : "列"}`
      : (isEnglish() ? "CSV 404" : "CSV 回傳 404");
    const twinkleText = twinkleCitywide ? (isEnglish() ? "Citywide budget" : "全縣市總預算") : twinkleExact ? (isEnglish() ? "Same locality, partial" : "同縣市，部分資料") : (isEnglish() ? "No same-locality hit" : "未命中同縣市");
    return `<tr><td><strong>${escapeHtml(displayCity(row))}</strong></td><td><span class="${openfunOk ? "matrix-ok" : "matrix-gap"}">${escapeHtml(openfunText)}</span></td><td><span class="${detail ? "matrix-ok" : "matrix-gap"}">${detail ? (isEnglish() ? "Available" : "有內容") : (isEnglish() ? "Empty / unavailable" : "空檔或無資料")}</span></td><td><span class="${twinkleCitywide ? "matrix-ok" : "matrix-gap"}">${escapeHtml(twinkleText)}</span><small>${row.twinkle.result_count} ${isEnglish() ? "unique search hits" : "個不重複命中"}</small></td><td>${selected}<small>${escapeHtml(row.twinkle.selected_agency || "")}</small></td></tr>`;
  }).join("");
}

function renderNationwide() {
  if (!state.cities) return;
  const all = state.cities.cities;
  const totalExpenses = all.reduce((total, row) => total + row.expenditure_thousand_twd, 0);
  const totalCapital = all.reduce((total, row) => total + row.capital_expenditure_thousand_twd, 0);
  const tierACount = all.filter((row) => row.tier === "A").length;
  document.querySelector("#nationwide-stats").innerHTML = [
    statCard(isEnglish() ? "Local governments" : "地方政府", isEnglish() ? "22" : "22 縣市", isEnglish() ? "One official national workbook" : "同一份官方彙編"),
    statCard(isEnglish() ? "Combined expenses" : "歲出合計", nationalAmount(totalExpenses), isEnglish() ? "Budget scale, not consolidated government spending" : "預算規模，非政府合併支出"),
    statCard(isEnglish() ? "Capital expenses" : "資本支出", nationalAmount(totalCapital), `${percentage(totalCapital, totalExpenses)} ${isEnglish() ? "of expenses" : "的歲出"}`),
    statCard(isEnglish() ? "Tier A cities" : "A 級城市", isEnglish() ? `${tierACount} cities` : `${tierACount} 個`, isEnglish() ? "Broad structured local data and APIs" : "地方結構化資料與 API 較完整"),
  ].join("");
  renderInterfaceAudit(all);

  const query = document.querySelector("#city-search")?.value.trim().toLowerCase() || "";
  const region = document.querySelector("#region-filter")?.value || "";
  const tier = document.querySelector("#tier-filter")?.value || "";
  const filtered = all
    .filter((row) => `${row.city} ${row.city_en}`.toLowerCase().includes(query))
    .filter((row) => !region || row.region === region)
    .filter((row) => !tier || row.tier === tier)
    .sort((left, right) => right.expenditure_thousand_twd - left.expenditure_thousand_twd);

  document.querySelector("#city-budget-grid").innerHTML = filtered.map((row) => {
    const categories = nationalCategoryRows(row).slice(0, 3);
    const openBudgetUrl = `https://budget.openfun.app/budget/show/${encodeURIComponent(row.city)}/115`;
    return `<article class="city-budget-card">
      <div class="city-card-heading"><div><span>${escapeHtml(displayRegion(row.region))}</span><h2>${escapeHtml(displayCity(row))}</h2></div><span class="tier-badge tier-${row.tier.toLowerCase()}">${row.tier}</span></div>
      <div class="city-primary-number"><strong>${escapeHtml(nationalAmount(row.expenditure_thousand_twd))}</strong><span>${isEnglish() ? "FY2026 expense budget" : "115 年度歲出預算"}</span></div>
      <div class="city-finance-grid"><span><small>${isEnglish() ? "Revenue" : "歲入"}</small><b>${escapeHtml(nationalAmount(row.revenue_thousand_twd))}</b></span><span><small>${isEnglish() ? "Capital" : "資本支出"}</small><b>${escapeHtml(nationalAmount(row.capital_expenditure_thousand_twd))}</b></span></div>
      <div class="city-category-list">${categories.map(([label, amount]) => `<div><span>${escapeHtml(label)}</span><b>${percentage(amount, row.expenditure_thousand_twd)}</b><i><em style="width:${(amount / row.expenditure_thousand_twd) * 100}%"></em></i></div>`).join("")}</div>
      <dl class="readiness-facts"><div><dt>${isEnglish() ? "Official machine data" : "官方機器資料"}</dt><dd>${escapeHtml(displayMachineLevel(row.official_machine))}</dd></div><div><dt>${isEnglish() ? "OpenFun history" : "OpenFun 歷年"}</dt><dd>${row.history_years} ${isEnglish() ? "years" : "年"}</dd></div><div><dt>${isEnglish() ? "Unit-budget detail" : "單位預算明細"}</dt><dd>${escapeHtml(displayUnitDetail(row.unit_detail))}</dd></div><div><dt>${isEnglish() ? "Interface" : "介面"}</dt><dd>${escapeHtml(displayInterface(row.interface))}</dd></div></dl>
      <div class="city-service-status"><span class="service-pill ${row.openfun.status === "ok" ? "" : "warn"}">OpenFun ${row.openfun.status === "ok" ? `${row.openfun.latest_year} · ${zhNumber.format(row.openfun.row_count)}` : "404"}</span><span class="service-pill ${row.twinkle.selected_is_citywide_expense_budget ? "" : "warn"}">Twinkle ${row.twinkle.selected_is_citywide_expense_budget ? (isEnglish() ? "citywide" : "總預算") : (isEnglish() ? "partial" : "部分")}</span></div>
      <p class="city-watchpoint"><strong>${isEnglish() ? "Question to pursue" : "值得追問"}</strong><br />${escapeHtml(cityWatchpoint(row))}</p>
      <div class="city-card-links"><a href="${escapeHtml(row.source_url)}" target="_blank" rel="noopener noreferrer">${isEnglish() ? "Official source" : "官方來源"} ↗</a><a href="${openBudgetUrl}" target="_blank" rel="noopener noreferrer">OpenFun ↗</a>${row.city === "臺北市" ? `<button type="button" data-city-detail="taipei">${isEnglish() ? "Open Taipei detail" : "進入臺北深度頁"} →</button>` : ""}</div>
    </article>`;
  }).join("");
  document.querySelector("#city-status").textContent = isEnglish()
    ? `Showing ${filtered.length} of 22 local governments. Readiness scores describe maintenance effort for deep city pages.`
    : `顯示 ${filtered.length}／22 縣市。成熟度評分描述維護深度城市頁所需的工程量。`;
  document.querySelectorAll("[data-city-detail]").forEach((button) => button.addEventListener("click", () => showView("overview")));

  const ranking = [...all].sort((left, right) => right.expenditure_thousand_twd - left.expenditure_thousand_twd);
  const max = ranking[0].expenditure_thousand_twd;
  document.querySelector("#national-ranking").innerHTML = ranking.map((row, index) => `<div class="national-ranking-row"><span>${String(index + 1).padStart(2, "0")}</span><strong>${escapeHtml(displayCity(row))}</strong><div><i style="width:${(row.expenditure_thousand_twd / max) * 100}%"></i></div><b>${escapeHtml(nationalAmount(row.expenditure_thousand_twd))}</b></div>`).join("");
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
  renderNationwide();
  renderOverview();
  renderExpenseView();
  renderRevenueView();
  renderCapitalView();
}

function updateUrl(view = state.view) {
  const url = new URL(location.href);
  if (state.language === "en") url.searchParams.set("lang", "en");
  else url.searchParams.delete("lang");
  url.hash = view === "nationwide" ? "" : view;
  history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function showView(view, updateHistory = true) {
  const target = document.querySelector(`[data-view-panel="${view}"]`);
  if (!target) return;
  state.view = view;
  document.body.classList.toggle("showing-nationwide", view === "nationwide");
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
  document.querySelector("#city-search").addEventListener("input", renderNationwide);
  document.querySelector("#region-filter").addEventListener("change", renderNationwide);
  document.querySelector("#tier-filter").addEventListener("change", renderNationwide);

  document.querySelector("#download-cities").addEventListener("click", () => {
    const rows = state.cities.cities;
    if (isEnglish()) {
      downloadCsv("taiwan-local-budgets-fy2026-usd.csv", ["Fiscal year", "Local government", "Region", "Readiness tier", "Expense budget (USD estimate)", "Revenue budget (USD estimate)", "Capital expenses (USD estimate)", "Official expense budget (TWD)", "Borrowing (TWD)", "Debt repayment (TWD)", "Prior surplus used (TWD)", "Capital share", "OpenFun latest ROC year", "OpenFun work-program rows", "OpenFun plan narratives", "Twinkle same-locality hit", "Twinkle citywide expense-budget hit", "Twinkle selected dataset", "Twinkle source", "TWD per USD", "Official source"], rows.map((row) => [2026, row.city_en, displayRegion(row.region), row.tier, (row.expenditure_thousand_twd * 1000 / FX.rate).toFixed(2), (row.revenue_thousand_twd * 1000 / FX.rate).toFixed(2), (row.capital_expenditure_thousand_twd * 1000 / FX.rate).toFixed(2), row.expenditure_thousand_twd * 1000, row.borrowing_thousand_twd * 1000, row.debt_repayment_thousand_twd * 1000, row.prior_surplus_thousand_twd * 1000, row.metrics.capital_share, row.openfun.latest_year || "", row.openfun.row_count || "", Boolean(row.openfun.detailed_plan_json?.substantive), row.twinkle.selected_is_exact_city_match, row.twinkle.selected_is_citywide_expense_budget, row.twinkle.selected_title || "", row.twinkle.selected_metadata?.source_url || "", FX.rate, row.source_url]));
    } else {
      downloadCsv("taiwan-local-budgets-115.csv", ["年度", "縣市", "區域", "實作成熟度", "歲出預算（新臺幣元）", "歲入預算（新臺幣元）", "資本支出（新臺幣元）", "債務舉借（新臺幣元）", "債務償還（新臺幣元）", "移用以前年度賸餘（新臺幣元）", "預計收支賸餘（新臺幣元）", "資本支出占比", "官方機器資料", "OpenFun 最新年度", "OpenFun 工作計畫列數", "OpenFun 計畫文字", "Twinkle 同縣市命中", "Twinkle 全縣市歲出命中", "Twinkle 最佳資料集", "Twinkle 來源", "官方來源"], rows.map((row) => [115, row.city, row.region, row.tier, row.expenditure_thousand_twd * 1000, row.revenue_thousand_twd * 1000, row.capital_expenditure_thousand_twd * 1000, row.borrowing_thousand_twd * 1000, row.debt_repayment_thousand_twd * 1000, row.prior_surplus_thousand_twd * 1000, row.budget_surplus_thousand_twd * 1000, row.metrics.capital_share, row.official_machine, row.openfun.latest_year || "", row.openfun.row_count || "", Boolean(row.openfun.detailed_plan_json?.substantive), row.twinkle.selected_is_exact_city_match, row.twinkle.selected_is_citywide_expense_budget, row.twinkle.selected_title || "", row.twinkle.selected_metadata?.source_url || "", row.source_url]));
    }
  });

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
    const [response, citiesResponse] = await Promise.all([fetch("./data.json"), fetch("./cities.json")]);
    if (!response.ok || !citiesResponse.ok) throw new Error(`${isEnglish() ? "Data failed to load" : "資料載入失敗"} ${response.status}/${citiesResponse.status}`);
    state.data = await response.json();
    state.cities = await citiesResponse.json();
    state.year = state.data.meta.years.at(-1);

    renderYearSelect();
    renderAll();
    renderSources();
    renderFaq();
    renderGeneratedDate();
    bindEvents();

    const initialView = location.hash.slice(1);
    showView(document.querySelector(`[data-view-panel="${initialView}"]`) ? initialView : "nationwide", false);
    document.querySelector("#loading-screen").classList.add("done");
  } catch (error) {
    const loading = document.querySelector("#loading-screen");
    loading.innerHTML = `<strong>${isEnglish() ? "Budget data is temporarily unavailable" : "資料暫時無法載入"}</strong><span>${escapeHtml(error.message)}</span>`;
  }
}

init();
