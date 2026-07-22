import { FX } from "./i18n.js";

const initialLanguage = new URLSearchParams(location.search).get("lang") === "en" ? "en" : "zh";
const state = { cities: null, taipei: null, language: initialLanguage, selectedCity: null };

const copy = {
  zh: {
    skip: "跳到主要內容", siteName: "臺灣地方政府", baseline: "115 年度共同基準", nationwide: "全臺總覽",
    nationalEyebrow: "先比較，再進入各縣市", nationalTitle: "22 縣市預算<br /><em>一頁看懂差異</em>",
    nationalIntro: "官方資料回答可比較的預算數字，OpenFun 補上公開預算 bulk 檔與工作計畫，TwinkleAI 實際讀取候選資料列。每一層的採用範圍都會公開。",
    relationshipKicker: "資料從哪裡來", relationshipTitle: "先分清楚證據、整理與搜尋",
    relationshipCopy: "官方數字是底座。OpenFun 的搜尋 API 與公開預算 bulk 檔是兩條不同路徑，TwinkleAI 則透過 MCP 搜尋並讀取資料列。下表直接列出三者目前能做到什麼。",
    coverageKicker: "22 縣市逐一實測", coverageTitle: "每個縣市目前可以看到多深",
    coverageCopy: "點選任一列進入獨立縣市頁。TwinkleAI 欄會區分實際採用、讀取但未通過對帳，以及只有搜尋命中。",
    citySearch: "搜尋縣市", downloadCsv: "下載完整 CSV", columnCity: "縣市", columnOfficial: "官方 115 年總預算", columnQuestion: "本頁值得追問", openCity: "開啟縣市頁",
    expenseScale: "歲出規模", compareCities: "比較 22 縣市年度預算", compareCitiesCopy: "長條只表示主計總處共同表中的歲出規模，不代表施政品質或財政健康。",
    watchpointsKicker: "跨縣市線索", watchpointsTitle: "數字突出時，先提出可查證的問題", watchpointsCopy: "這些訊號用來安排回查順序，不代表違法、浪費或政策失敗。",
    nationalBoundary: "比較邊界", nationalBoundaryCopy: "預算、決算、採購契約與實際付款是不同階段。此站目前比較總預算與可取得的工作計畫，不把決標金額當成實際支出。",
    backOverview: "← 回到全臺比較", cityNavBudget: "預算結構", cityNavSources: "資料實測", cityNavQuestion: "值得追問", cityNavTaipei: "臺北進階明細",
    questionLabel: "本頁先問", questionBoundary: "這是資料驅動的查證起點，需回到預算書、表註與年度分類判讀。",
    officialBaseline: "官方共同基準", budgetStructure: "錢編在哪些政策領域", budgetStructureCopy: "以下數字都來自主計總處同一份 115 年度彙編，因此可以和其他縣市比較。",
    financingTitle: "收支如何平衡", financingCopy: "歲入加上舉借與以前年度賸餘，用於歲出、還本與預計賸餘。",
    cityAuditKicker: "三層資料實測", cityAuditTitle: "這個縣市的資料實際走到哪裡", cityAuditCopy: "先看官方基準，再辨認 OpenFun 資料來自公開 bulk 檔或 API，最後檢查 TwinkleAI 是純搜尋、已讀列，或已通過官方總額對帳。",
    roleEvidence: "證據底座", officialData: "官方資料", officialPrimary: "正式比較依據", roleNormalize: "bulk 整理＋API 目錄", roleDiscover: "搜尋、讀列與對帳",
    taipeiExtraKicker: "臺北額外官方明細", taipeiExtraTitle: "主管機關別歲出與歲入資料", taipeiExtraCopy: "臺北另有跨年度官方 XML，可在同一個臺北頁面補充主管機關別資料，不再拆成首頁上方的獨立分頁。",
    methodLabel: "如何閱讀", methodTitle: "來源越深，越需要交叉驗證",
    footerTitle: "讓每個縣市的預算，都能被找到、比較與追問。", footerCopy: "民間概念驗證，數字與定義仍以主計總處及地方政府原始資料為準。", reportLink: "研究報告", loading: "正在整理 22 縣市資料",
  },
  en: {
    skip: "Skip to main content", siteName: "Taiwan Local Governments", baseline: "FY2026 common baseline", nationwide: "National overview",
    nationalEyebrow: "Compare first, then open each locality", nationalTitle: "22 local budgets<br /><em>with their differences made clear</em>",
    nationalIntro: "Official data supplies comparable figures, OpenFun adds public budget bulk files and work-program detail, and TwinkleAI reads candidate rows. Each layer's actual use is disclosed.",
    relationshipKicker: "Where the data comes from", relationshipTitle: "Separate evidence, normalization, and discovery",
    relationshipCopy: "Official figures are the evidence base. OpenFun's search API and public budget bulk files are separate paths, while TwinkleAI searches and reads rows through MCP. The matrix below shows what each can currently do.",
    coverageKicker: "All 22 localities tested", coverageTitle: "How much detail is available for each locality",
    coverageCopy: "Open any row for its dedicated page. The TwinkleAI column separates actual use, rows rejected after reconciliation, and search-only hits.",
    citySearch: "Search local governments", downloadCsv: "Download full CSV", columnCity: "Local government", columnOfficial: "Official FY2026 budget", columnQuestion: "Question to investigate", openCity: "Open locality page",
    expenseScale: "Expense scale", compareCities: "Compare all 22 annual budgets", compareCitiesCopy: "Bars represent expense-budget size in the common DGBAS workbook, not policy quality or fiscal health.",
    watchpointsKicker: "Cross-locality leads", watchpointsTitle: "When a number stands out, start with a verifiable question", watchpointsCopy: "These signals prioritize source checks. They do not establish illegality, waste, or policy failure.",
    nationalBoundary: "Comparison boundary", nationalBoundaryCopy: "Budgets, final accounts, procurement contracts, and payments are different stages. This site compares budgets and available work programs; it does not treat awards as actual spending.",
    backOverview: "← Back to national comparison", cityNavBudget: "Budget structure", cityNavSources: "Data audit", cityNavQuestion: "Question", cityNavTaipei: "Taipei detail",
    questionLabel: "Start with this question", questionBoundary: "This data-driven lead must be checked against budget books, notes, and year-to-year classification changes.",
    officialBaseline: "Official common baseline", budgetStructure: "Where the budget is allocated", budgetStructureCopy: "All figures below come from the same FY2026 DGBAS workbook and can therefore be compared across localities.",
    financingTitle: "How the budget balances", financingCopy: "Revenue, borrowing, and prior surpluses fund expenses, debt repayment, and the projected surplus.",
    cityAuditKicker: "Three-layer data audit", cityAuditTitle: "How far the data actually goes for this locality", cityAuditCopy: "Start with the official baseline, distinguish OpenFun public bulk files from its API, then check whether TwinkleAI only searched, read rows, or passed official-total reconciliation.",
    roleEvidence: "Evidence base", officialData: "Official data", officialPrimary: "Primary comparison source", roleNormalize: "Bulk enrichment + API catalog", roleDiscover: "Search, rows, reconciliation",
    taipeiExtraKicker: "Additional Taipei official detail", taipeiExtraTitle: "Expenses and revenues by supervising agency", taipeiExtraCopy: "Taipei also publishes cross-year official XML. It is now included on the single Taipei page instead of occupying separate top navigation tabs.",
    methodLabel: "How to read this page", methodTitle: "Deeper data requires more cross-checking",
    footerTitle: "Make every local budget findable, comparable, and open to questions.", footerCopy: "An independent proof of concept. Official definitions and figures remain authoritative.", reportLink: "Research report", loading: "Organizing data for 22 localities",
  },
};

const twdNumber = new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 0 });
const usdNumber = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function isEnglish() { return state.language === "en"; }
function text(key) { return copy[state.language][key] ?? copy.zh[key] ?? key; }
function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function displayCity(row) { return isEnglish() ? row.city_en : row.city; }
function displayRegion(region) { return isEnglish() ? ({ 北部: "North", 中部: "Central", 南部: "South", 東部: "East", 外島: "Offshore islands" }[region] || region) : region; }
function displayMachine(value) { return isEnglish() ? ({ 完整: "Full structured data", 部分: "Partial structured data", 文件: "Documents" }[value] || value) : value; }
function displayInterface(value) { return isEnglish() ? ({ API: "API", 檔案: "Machine-readable files", 文件: "Document downloads" }[value] || value) : value; }
function displayUnitDetail(value) { return isEnglish() ? ({ 官方完整: "Complete official unit detail", 民代協助: "Detail obtained with councilor support", 尚未取得: "Unit detail not yet available" }[value] || value) : value; }
function percent(value, digits = 1) { return `${(Number(value || 0) * 100).toFixed(digits)}%`; }
function bytes(value) { return value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)} MB` : `${twdNumber.format(value || 0)} bytes`; }
function formatAmount(thousandTwd) {
  const twd = Number(thousandTwd || 0) * 1000;
  if (isEnglish()) {
    const usd = twd / FX.rate;
    if (Math.abs(usd) >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(2)}B`;
    if (Math.abs(usd) >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
    return `$${usdNumber.format(usd)}`;
  }
  if (Math.abs(twd) >= 1_000_000_000_000) return `${(twd / 1_000_000_000_000).toFixed(2)} 兆元`;
  if (Math.abs(twd) >= 100_000_000) return `${(twd / 100_000_000).toFixed(1)} 億元`;
  return `NT$${twdNumber.format(twd)}`;
}
function statCard(label, value, detail = "") { return `<article class="stat-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${detail ? `<small>${escapeHtml(detail)}</small>` : ""}</article>`; }
function sourceLink(url, label) { return url ? `<a class="source-link-inline" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)} ↗</a>` : ""; }
function groupSum(rows, key) {
  const groups = new Map();
  for (const row of rows) groups.set(row[key], (groups.get(row[key]) || 0) + row.amount);
  return [...groups.entries()].sort((a, b) => b[1] - a[1]);
}

function categoryRows(row) {
  const labels = isEnglish()
    ? ["Education, science & culture", "Economic development", "Social welfare", "General government", "Community & environment", "Pensions", "Debt service", "Grants & other"]
    : ["教育科學文化", "經濟發展", "社會福利", "一般政務", "社區與環境", "退休撫卹", "債務支出", "補助及其他"];
  const keys = ["education_science_culture_thousand_twd", "economic_development_thousand_twd", "social_welfare_thousand_twd", "general_government_thousand_twd", "community_environment_thousand_twd", "pension_thousand_twd", "debt_service_thousand_twd", "grants_other_thousand_twd"];
  return keys.map((key, index) => ({ label: labels[index], amount: row[key] })).sort((a, b) => b.amount - a.amount);
}

function cityQuestion(row) {
  if (row.metrics.financing_turnover_share >= .7) return isEnglish()
    ? `Borrowing plus debt repayment equals ${percent(row.metrics.financing_turnover_share)} of expenses. How much is refinancing, fund movement, or genuinely new debt?`
    : `舉借與還本毛額合計相當於歲出的 ${percent(row.metrics.financing_turnover_share)}，其中多少是換債、基金調度或真正新增債務？`;
  const increase = row.openfun?.largest_latest_increase;
  if (increase?.change_rate >= 1) return isEnglish()
    ? `OpenFun shows “${increase.program}” rising ${percent(increase.change_rate)}. Did classification, grants, funds, or a one-off project change?`
    : `OpenFun 顯示「${increase.program}」增加 ${percent(increase.change_rate)}，是否涉及分類、補助、基金或一次性計畫變動？`;
  if (row.metrics.prior_surplus_share >= .1) return isEnglish()
    ? `Prior surpluses fund ${percent(row.metrics.prior_surplus_share)} of expenses. Is this drawdown recurring, and what buffer remains?`
    : `以前年度賸餘支應歲出的 ${percent(row.metrics.prior_surplus_share)}，這種動用是否持續，還剩多少財政緩衝？`;
  if (row.openfun?.status !== "ok") return isEnglish()
    ? "OpenFun's generic work-program URL failed. Is the source missing, moved, or using a different naming rule?"
    : "OpenFun 通用工作計畫網址失敗，原始資料是缺漏、搬移，還是採用不同命名規則？";
  if (row.openfun?.latest_year && row.openfun.latest_year < 115) return isEnglish()
    ? `OpenFun stops at ROC ${row.openfun.latest_year}. Where are the newer files, and can the update chain be repaired?`
    : `OpenFun 資料停在民國 ${row.openfun.latest_year} 年，較新檔案在哪裡，更新鏈能否修復？`;
  const twinkleReconciliation = row.twinkle?.row_reconciliation;
  if (twinkleReconciliation?.attempted && !twinkleReconciliation.eligible_for_use) return isEnglish()
    ? `TwinkleAI read ${twdNumber.format(twinkleReconciliation.row_count_returned)} rows, but its total differs from the official baseline by ${percent(Math.abs(twinkleReconciliation.difference_share))}. Which year or scope caused the gap?`
    : `TwinkleAI 已讀取 ${twdNumber.format(twinkleReconciliation.row_count_returned)} 列，但總額與官方基準相差 ${percent(Math.abs(twinkleReconciliation.difference_share))}，差異來自年度還是資料範圍？`;
  if (!row.twinkle?.selected_is_citywide_expense_budget) return isEnglish()
    ? "TwinkleAI found the locality but not a citywide expense budget. Which exact dataset ID should become the verified source?"
    : "TwinkleAI 命中同縣市，但不是全縣市歲出總預算，應把哪個精確 dataset ID 列為驗證來源？";
  return isEnglish()
    ? "The three layers are available. Do OpenFun totals reconcile with the official budget before program-level interpretation?"
    : "三層資料都可用，進入計畫層判讀前，OpenFun 總額是否已和官方預算對帳？";
}

function openfunStatus(row) {
  if (row.openfun.status !== "ok") return { label: isEnglish() ? "CSV unavailable" : "CSV 無法取得", tone: "bad" };
  if (row.openfun.latest_year < 115) return { label: isEnglish() ? `Stale · ROC ${row.openfun.latest_year}` : `資料偏舊 · ${row.openfun.latest_year} 年`, tone: "warn" };
  if (row.openfun.detailed_plan_json?.substantive) return { label: isEnglish() ? "Programs + narratives" : "工作計畫＋用途文字", tone: "good" };
  return { label: isEnglish() ? "Work programs only" : "只有工作計畫表", tone: "warn" };
}

function twinkleStatus(row) {
  const reconciliation = row.twinkle.row_reconciliation;
  if (reconciliation?.eligible_for_use) return { label: isEnglish() ? "Rows used after reconciliation" : "實際列已對帳採用", tone: "good" };
  if (reconciliation?.attempted) return { label: isEnglish() ? "Rows read, not accepted" : "已讀列但未通過", tone: "bad" };
  if (row.twinkle.selected_is_exact_city_match) return { label: isEnglish() ? "Same locality, partial" : "同縣市但僅部分資料", tone: "warn" };
  return { label: isEnglish() ? "No precise locality hit" : "未精確命中縣市", tone: "bad" };
}

function applyTranslations() {
  document.documentElement.lang = isEnglish() ? "en" : "zh-Hant-TW";
  document.body.classList.toggle("lang-en", isEnglish());
  document.querySelectorAll("[data-copy]").forEach((node) => { node.textContent = text(node.dataset.copy); });
  document.querySelectorAll("[data-copy-html]").forEach((node) => { node.innerHTML = text(node.dataset.copyHtml); });
  document.querySelector("#city-search").placeholder = text("citySearch");
  document.querySelectorAll("[data-language]").forEach((button) => {
    const active = button.dataset.language === state.language;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const title = isEnglish() ? "Taiwan Local Government OpenBook" : "臺灣地方政府 OpenBook";
  const description = isEnglish()
    ? "Compare all 22 local budgets and inspect official data, OpenFun detail, and TwinkleAI row-level reconciliation for every locality."
    : "比較臺灣 22 縣市預算，逐縣市檢視官方資料、OpenFun 整理與 TwinkleAI 實際資料列對帳結果。";
  document.title = state.selectedCity ? `${displayCity(state.selectedCity)} | ${title}` : title;
  document.querySelector('meta[name="description"]').content = description;
  document.querySelector('meta[property="og:title"]').content = title;
  document.querySelector('meta[property="og:description"]').content = description;
}

function renderTabs() {
  const rows = state.cities.cities;
  document.querySelector("#city-tabs").innerHTML = rows.map((row) => `<button class="city-tab ${state.selectedCity?.city === row.city ? "active" : ""}" type="button" role="tab" aria-selected="${state.selectedCity?.city === row.city}" data-city="${escapeHtml(row.city)}">${escapeHtml(displayCity(row))}</button>`).join("");
  document.querySelector("#nationwide-tab").classList.toggle("active", !state.selectedCity);
}

function renderSourceRelationship() {
  const audit = state.cities.meta.interface_audit.summary;
  const services = state.cities.meta.interface_audit.services;
  const openFunApi = services.openfun.api_audit;
  const cards = isEnglish() ? [
    { step: "01", role: "Evidence base", name: "Official data", copy: "DGBAS and local governments publish the figures, definitions, and notes that remain authoritative.", use: "OpenBook uses this layer for all comparable totals.", tone: "official" },
    { step: "02", role: "Bulk enrichment + API catalog", name: "OpenFun", copy: "The API discovers budget datasets, but the budget datasets are public bulk files and currently reject records and agg.", use: `${audit.openfun_ok}/22 work-program CSVs load; ${audit.openfun_detail_json_substantive} include substantive narratives.`, tone: "openfun" },
    { step: "03", role: "Search, row retrieval, reconciliation", name: "TwinkleAI", copy: "TwinkleAI searches datasets and query_rows retrieves their actual rows through MCP.", use: `${audit.twinkle_query_rows_attempted} datasets were read; ${audit.twinkle_rows_reconciled} reconciled exactly and now supply agency detail.`, tone: "twinkle" },
  ] : [
    { step: "01", role: "證據底座", name: "官方資料", copy: "主計總處與地方政府發布數字、定義與表註，是最後可被追責的來源。", use: "OpenBook 的跨縣市總額全部以這一層為準。", tone: "official" },
    { step: "02", role: "bulk 整理＋API 目錄", name: "OpenFun", copy: "API 可以搜尋預算資料集，但預算資料目前是公開 bulk 檔，records 與 agg 都不支援。", use: `工作計畫 CSV 可讀 ${audit.openfun_ok}/22，另有 ${audit.openfun_detail_json_substantive} 縣市具實質用途文字。`, tone: "openfun" },
    { step: "03", role: "搜尋、讀列、對帳", name: "TwinkleAI", copy: "TwinkleAI 先搜尋資料集，再透過 MCP query_rows 讀取實際資料列。", use: `已讀取 ${audit.twinkle_query_rows_attempted} 個候選；${audit.twinkle_rows_reconciled} 個總額完全對上，開始供應機關別明細。`, tone: "twinkle" },
  ];
  document.querySelector("#source-flow").innerHTML = cards.map((item, index) => `<article class="source-flow-card ${item.tone}"><div><span>${item.step}</span><small>${escapeHtml(item.role)}</small></div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.copy)}</p><b>${escapeHtml(item.use)}</b>${index < cards.length - 1 ? `<i aria-hidden="true">→</i>` : ""}</article>`).join("");
  document.querySelector("#source-use-rule").innerHTML = isEnglish()
    ? `<strong>OpenBook decision rule</strong><span>Official totals remain authoritative. OpenFun bulk rows may add programs after year and stage checks. TwinkleAI rows are used only after exact-total reconciliation.</span>`
    : `<strong>OpenBook 使用規則</strong><span>官方總額維持正式依據。OpenFun bulk 資料確認年度與預算階段後補充工作計畫；TwinkleAI 資料列只有在總額完全對上時才採用。</span>`;

  const comparisonRows = isEnglish() ? [
    ["Access", "Public official files", openFunApi.access_label_en, "API key for production MCP"],
    ["Budget discovery", "Source pages and catalogs", "Search API works anonymously and with a token", "Semantic dataset search works"],
    ["Budget row query", "Depends on each official portal", "Not available through records for the two budget bulk datasets", `${audit.twinkle_query_rows_attempted} citywide candidates read`],
    ["Aggregation", "Defined by each source workbook", "Not available for budget bulk; a documented gov-org agg example also returned HTTP 400", "Computed after query_rows in the OpenBook audit"],
    ["Used on this site", "22/22 comparable totals", `${audit.openfun_ok}/22 work-program files; ${audit.openfun_detail_json_substantive} narrative files`, `${audit.twinkle_rows_reconciled}/22 locality agency details`],
    ["Best current role", "Authoritative baseline", "Deep normalized bulk detail and dataset guidance", "Cross-catalog discovery and selective row retrieval"],
  ] : [
    ["使用門檻", "官方公開檔案", openFunApi.access_label_zh, "正式 MCP 需 API key"],
    ["發現預算資料", "來源頁與資料目錄", "匿名與 Token 搜尋都成功", "語意搜尋資料集成功"],
    ["查詢預算資料列", "依各官方平臺而定", "兩份預算 bulk 資料都不支援 records", `已讀取 ${audit.twinkle_query_rows_attempted} 個全縣市候選`],
    ["統計聚合", "依官方工作簿欄位計算", "預算 bulk 不支援；機關代碼文件範例實測也回傳 HTTP 400", "由 OpenBook 在 query_rows 後自行計算"],
    ["本站實際採用", "22/22 縣市共同總額", `${audit.openfun_ok}/22 工作計畫檔，${audit.openfun_detail_json_substantive} 份用途文字`, `${audit.twinkle_rows_reconciled}/22 縣市機關別明細`],
    ["目前最適角色", "正式數字基準", "深度 bulk 明細與資料集使用指南", "跨目錄發現與選擇性讀列"],
  ];
  const headers = isEnglish() ? ["Capability", "Official", "OpenFun", "TwinkleAI"] : ["能力", "官方資料", "OpenFun", "TwinkleAI"];
  document.querySelector("#interface-comparison").innerHTML = `
    <div class="comparison-heading"><div><span>${isEnglish() ? "LIVE INTERFACE AUDIT" : "實際接口驗收"}</span><h3>${isEnglish() ? "Same topic, different capabilities" : "同樣談開放資料，三者能力並不相同"}</h3></div><p>${isEnglish() ? "Tested with a real OpenFun token and the production TwinkleAI MCP. No credential is stored in this site." : "使用真實 OpenFun Token 與 TwinkleAI 正式 MCP 測試，網站與快照均未保存金鑰。"}</p></div>
    <div class="comparison-table-wrap"><table class="comparison-table"><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${comparisonRows.map((row) => `<tr>${row.map((cell, index) => `<${index === 0 ? "th" : "td"}>${escapeHtml(cell)}</${index === 0 ? "th" : "td"}>`).join("")}</tr>`).join("")}</tbody></table></div>
    <div class="beta-note"><strong>${isEnglish() ? "OpenFun access note" : "OpenFun 使用註記"}</strong><span>${isEnglish() ? "Full and authorized datasets are in an invitation-only beta and require an account plus group authorization. Contact the OpenFun team if access is needed. The budget bulk files used by this site are public and require no token." : "完整與授權資料集目前為邀請制封測，需要帳號與群組授權；有使用需求可聯絡歐噴資料庫團隊。本站使用的預算 bulk 檔是公開資料，不需要 Token。"}</span></div>`;
}

function renderNationalWatchpoints() {
  const rows = state.cities.cities;
  const taichung = rows.find((row) => row.city === "臺中市");
  const newTaipei = rows.find((row) => row.city === "新北市");
  const hsinchu = rows.find((row) => row.city === "新竹市");
  const tainan = rows.find((row) => row.city === "臺南市");
  const kinmen = rows.find((row) => row.city === "金門縣");
  const items = isEnglish() ? [
    ["DGBAS", "Large gross financing flows in Taichung and New Taipei", `Borrowing plus repayment reaches ${percent(taichung.metrics.financing_turnover_share)} and ${percent(newTaipei.metrics.financing_turnover_share)} of expenses.`],
    ["OpenFun", "Hsinchu City shows a sharp industry-administration increase", `${hsinchu.openfun.largest_latest_increase.program} rose ${percent(hsinchu.openfun.largest_latest_increase.change_rate)}.`],
    ["OpenFun", "Tainan health programs shifted sharply", `${tainan.openfun.largest_latest_increase.program} rose ${percent(tainan.openfun.largest_latest_increase.change_rate)}.`],
    ["DGBAS", "Kinmen draws heavily on prior surpluses", `Prior surpluses fund ${percent(kinmen.metrics.prior_surplus_share)} of expenses.`],
    ["OpenFun", "Coverage includes empty, missing, and stale files", "Changhua returns 404, while Penghu work-program data stops at ROC 110."],
    ["TwinkleAI", "Eight datasets were read; only two passed reconciliation", "New Taipei and Chiayi City now use TwinkleAI agency rows. The other six remain excluded."],
  ] : [
    ["主計總處", "臺中與新北的融資毛流量特別大", `舉借加還本分別相當於歲出的 ${percent(taichung.metrics.financing_turnover_share)} 與 ${percent(newTaipei.metrics.financing_turnover_share)}。`],
    ["OpenFun", "新竹市工商管理出現大幅增加", `「${hsinchu.openfun.largest_latest_increase.program}」增加 ${percent(hsinchu.openfun.largest_latest_increase.change_rate)}。`],
    ["OpenFun", "臺南衛生工作計畫大幅移動", `「${tainan.openfun.largest_latest_increase.program}」增加 ${percent(tainan.openfun.largest_latest_increase.change_rate)}。`],
    ["主計總處", "金門大量動用以前年度賸餘", `以前年度賸餘支應歲出的 ${percent(kinmen.metrics.prior_surplus_share)}。`],
    ["OpenFun", "涵蓋清單包含空檔、缺檔與舊檔", "彰化回傳 404，澎湖工作計畫只到民國 110 年。"],
    ["TwinkleAI", "8 個候選已實際讀列，只有 2 個通過對帳", "新北市與嘉義市開始採用 TwinkleAI 機關別明細，其餘 6 個仍排除。"],
  ];
  document.querySelector("#national-watchpoints").innerHTML = items.map(([source, title, body]) => `<article class="watchpoint-card"><span class="watchpoint-source">${escapeHtml(source)}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></article>`).join("");
}

function renderNationwide() {
  const rows = state.cities.cities;
  const totalExpenses = rows.reduce((sum, row) => sum + row.expenditure_thousand_twd, 0);
  const totalCapital = rows.reduce((sum, row) => sum + row.capital_expenditure_thousand_twd, 0);
  const audit = state.cities.meta.interface_audit.summary;
  document.querySelector("#nationwide-stats").innerHTML = [
    statCard(isEnglish() ? "Local governments" : "地方政府", "22", isEnglish() ? "One common official workbook" : "同一份官方彙編"),
    statCard(isEnglish() ? "Combined expenses" : "歲出合計", formatAmount(totalExpenses), isEnglish() ? "Budget scale" : "預算規模"),
    statCard(isEnglish() ? "OpenFun programs" : "OpenFun 工作計畫", `${audit.openfun_ok}/22`, isEnglish() ? `${audit.openfun_detail_json_substantive} include narratives` : `${audit.openfun_detail_json_substantive} 縣市另有用途文字`),
    statCard(isEnglish() ? "TwinkleAI rows actually used" : "TwinkleAI 實際採用", `${audit.twinkle_rows_reconciled}/22`, isEnglish() ? `${audit.twinkle_query_rows_attempted} candidates read and reconciled` : `已讀取並對帳 ${audit.twinkle_query_rows_attempted} 個候選`),
  ].join("");
  renderSourceRelationship();

  const query = document.querySelector("#city-search").value.trim().toLowerCase();
  const filtered = rows.filter((row) => `${row.city} ${row.city_en}`.toLowerCase().includes(query));
  document.querySelector("#coverage-table-body").innerHTML = filtered.map((row) => {
    const openfun = openfunStatus(row);
    const twinkle = twinkleStatus(row);
    return `<tr>
      <td><button class="city-name-button" type="button" data-city="${escapeHtml(row.city)}"><span>${escapeHtml(displayRegion(row.region))}</span><strong>${escapeHtml(displayCity(row))}</strong></button></td>
      <td><strong>${escapeHtml(formatAmount(row.expenditure_thousand_twd))}</strong><small>${isEnglish() ? `Capital ${percent(row.metrics.capital_share)}` : `資本支出 ${percent(row.metrics.capital_share)}`}</small></td>
      <td><span class="audit-pill ${openfun.tone}">${escapeHtml(openfun.label)}</span><small>${row.openfun.status === "ok" ? `${twdNumber.format(row.openfun.row_count)} ${isEnglish() ? "historical rows" : "筆歷年資料"}` : (isEnglish() ? "Generic URL returned 404" : "通用網址回傳 404")}</small></td>
      <td><span class="audit-pill ${twinkle.tone}">${escapeHtml(twinkle.label)}</span><small>${row.twinkle.row_reconciliation?.eligible_for_use ? `${twdNumber.format(row.twinkle.row_reconciliation.row_count_returned)} ${isEnglish() ? "actual rows" : "筆實際資料列"}` : row.twinkle.row_reconciliation?.attempted ? `${isEnglish() ? "Difference" : "與官方差異"} ${percent(Math.abs(row.twinkle.row_reconciliation.difference_share))}` : `${twdNumber.format(row.twinkle.result_count)} ${isEnglish() ? "search candidates only" : "個搜尋候選，未用於數值"}`}</small></td>
      <td class="coverage-question">${escapeHtml(cityQuestion(row))}</td>
      <td><button class="row-open-button" type="button" data-city="${escapeHtml(row.city)}" aria-label="${escapeHtml(text("openCity"))}">→</button></td>
    </tr>`;
  }).join("");
  document.querySelector("#city-status").textContent = isEnglish() ? `Showing ${filtered.length} of 22 local governments.` : `顯示 ${filtered.length}／22 個縣市。`;

  const ranked = [...rows].sort((a, b) => b.expenditure_thousand_twd - a.expenditure_thousand_twd);
  const max = ranked[0].expenditure_thousand_twd;
  document.querySelector("#national-ranking").innerHTML = ranked.map((row, index) => `<button class="national-ranking-row" type="button" data-city="${escapeHtml(row.city)}"><span>${String(index + 1).padStart(2, "0")}</span><strong>${escapeHtml(displayCity(row))}</strong><div><i style="width:${(row.expenditure_thousand_twd / max) * 100}%"></i></div><b>${escapeHtml(formatAmount(row.expenditure_thousand_twd))}</b></button>`).join("");
  renderNationalWatchpoints();
}

function renderOfficialDetail(row) {
  document.querySelector("#official-detail").innerHTML = `
    <dl class="source-facts">
      <div><dt>${isEnglish() ? "Common fiscal year" : "共同年度"}</dt><dd>${isEnglish() ? "FY2026" : "民國 115 年"}</dd></div>
      <div><dt>${isEnglish() ? "Official machine data" : "官方機器資料"}</dt><dd>${escapeHtml(displayMachine(row.official_machine))}</dd></div>
      <div><dt>${isEnglish() ? "Local interface" : "地方接口"}</dt><dd>${escapeHtml(displayInterface(row.interface))}</dd></div>
      <div><dt>${isEnglish() ? "Unit-budget detail" : "單位預算明細"}</dt><dd>${escapeHtml(displayUnitDetail(row.unit_detail))}</dd></div>
    </dl>
    <div class="source-explanation"><strong>${escapeHtml(row.source_label)}</strong><p>${isEnglish() ? "The official national workbook supplies revenue, expenses, financing, eight policy functions, and capital-use categories. This is the source used for comparable numbers on this page." : "主計總處共同表提供歲入、歲出、融資、八類政事別與資本用途。本頁所有可比較總額都以官方資料為準。"}</p>${sourceLink(row.source_url, isEnglish() ? "Open official local source" : "開啟地方官方來源")}${sourceLink(state.cities.meta.source_page, isEnglish() ? "Open DGBAS workbook" : "開啟主計總處共同表")}</div>`;
}

function renderOpenfunDetail(row) {
  const data = row.openfun;
  const apiAudit = state.cities.meta.interface_audit.services.openfun.api_audit;
  const status = openfunStatus(row);
  const stateNode = document.querySelector("#openfun-state");
  stateNode.textContent = status.label;
  stateNode.className = `source-state state-${status.tone}`;
  if (data.status !== "ok") {
    document.querySelector("#openfun-detail").innerHTML = `<div class="openfun-api-notice"><span>${isEnglish() ? "API TEST" : "API 實測"}</span><strong>${isEnglish() ? "Budget datasets are public bulk files" : "預算資料目前走公開 bulk 檔"}</strong><p>${isEnglish() ? "The API finds both budget datasets, but their records and agg endpoints return HTTP 400. This locality therefore depends on its public static source file." : "API 可以找到兩份預算資料集，但 records 與 agg 都回傳 HTTP 400，因此各縣市仍依公開靜態檔讀取。"}</p></div><div class="source-empty"><strong>${isEnglish() ? "Work-program CSV unavailable" : "工作計畫 CSV 無法取得"}</strong><p>${escapeHtml(data.error || (isEnglish() ? "The generic source URL returned an error." : "通用來源網址回傳錯誤。"))}</p>${sourceLink(data.browser_url, isEnglish() ? "Open OpenFun budget page" : "開啟 OpenFun 預算頁")}</div>`;
    return;
  }
  const plans = data.largest_plans || [];
  const detailText = data.detailed_plan_json?.substantive
    ? (isEnglish() ? `Narrative JSON is substantive (${bytes(data.detailed_plan_json.bytes)}).` : `用途文字 JSON 有實際內容（${bytes(data.detailed_plan_json.bytes)}）。`)
    : (isEnglish() ? "Narrative JSON is empty or unavailable." : "用途文字 JSON 是空檔或無法取得。");
  const changeCards = [data.largest_latest_increase, data.largest_latest_decrease].filter(Boolean).map((item, index) => `<article class="change-card ${index === 0 ? "increase" : "decrease"}"><span>${index === 0 ? (isEnglish() ? "Largest increase" : "最大增加") : (isEnglish() ? "Largest decrease" : "最大減少")}</span><strong>${escapeHtml(item.program)}</strong><b>${item.change_rate > 0 ? "+" : ""}${escapeHtml(percent(item.change_rate))}</b><small>${escapeHtml(formatAmount(item.prior_thousand_twd))} → ${escapeHtml(formatAmount(item.current_thousand_twd))}</small></article>`).join("");
  document.querySelector("#openfun-detail").innerHTML = `
    <div class="openfun-api-notice"><span>${isEnglish() ? "API TEST" : "API 實測"}</span><strong>${isEnglish() ? "Token valid; budget data still comes from public bulk files" : "Token 有效，預算資料仍來自公開 bulk 檔"}</strong><p>${isEnglish() ? `Authenticated records work on the ${apiAudit.token_probe.dataset} probe (${twdNumber.format(apiAudit.token_probe.authenticated_total_records)} records), while both budget datasets reject records and agg. Full API access is in invitation-only beta.` : `受保護資料集 ${apiAudit.token_probe.dataset} 已成功查到 ${twdNumber.format(apiAudit.token_probe.authenticated_total_records)} 筆，但兩份預算資料都不支援 records 與 agg。完整 API 權限目前為邀請制封測。`}</p></div>
    <div class="source-metrics">
      ${statCard(isEnglish() ? "Latest ROC year" : "最新年度", String(data.latest_year), isEnglish() ? `${data.history_years} years covered` : `涵蓋 ${data.history_years} 年`)}
      ${statCard(isEnglish() ? "Historical rows" : "歷年列數", twdNumber.format(data.row_count), isEnglish() ? `${twdNumber.format(data.latest_row_count)} in latest year` : `最新年度 ${twdNumber.format(data.latest_row_count)} 列`)}
      ${statCard(isEnglish() ? "Latest-stage total" : "最新階段總額", formatAmount(data.latest_total_thousand_twd), data.latest_amount_stage || "")}
      ${statCard(isEnglish() ? "Program narratives" : "計畫用途文字", data.detailed_plan_json?.substantive ? (isEnglish() ? "Available" : "有內容") : (isEnglish() ? "Empty" : "空檔"), detailText)}
    </div>
    <div class="source-subsection"><div class="subsection-heading"><h4>${isEnglish() ? "Largest work programs in the latest year" : "最新年度最大工作計畫"}</h4><span>${isEnglish() ? "OpenFun normalized rows" : "OpenFun 正規化列"}</span></div><div class="table-wrap"><table class="detail-table"><thead><tr><th>${isEnglish() ? "Agency" : "機關"}</th><th>${isEnglish() ? "Program" : "工作計畫"}</th><th>${isEnglish() ? "Function" : "政事別"}</th><th>${isEnglish() ? "Amount" : "金額"}</th><th>${isEnglish() ? "Share" : "占比"}</th></tr></thead><tbody>${plans.map((item) => `<tr><td>${escapeHtml(item.agency)}</td><td><strong>${escapeHtml(item.program)}</strong><small>${escapeHtml(item.business_plan)}</small></td><td>${escapeHtml(item.function)}</td><td>${escapeHtml(formatAmount(item.amount_thousand_twd))}</td><td>${escapeHtml(percent(item.share_of_latest_rows))}</td></tr>`).join("")}</tbody></table></div></div>
    <div class="change-grid">${changeCards}</div>
    <div class="source-actions">${sourceLink(data.browser_url, isEnglish() ? "Open OpenFun browser" : "開啟 OpenFun 查詢頁")}${sourceLink(data.plans_url, isEnglish() ? "Download work-program CSV" : "下載工作計畫 CSV")}${data.detailed_plan_json?.available ? sourceLink(data.detail_url, isEnglish() ? "Open narrative JSON" : "開啟用途文字 JSON") : ""}</div>`;
}

function renderTwinkleDetail(row) {
  const data = row.twinkle;
  const status = twinkleStatus(row);
  const reconciliation = data.row_reconciliation || {};
  const stateNode = document.querySelector("#twinkle-state");
  stateNode.textContent = status.label;
  stateNode.className = `source-state state-${status.tone}`;
  const metadata = data.selected_metadata || {};
  const columns = metadata.columns || [];
  const interpretation = reconciliation.eligible_for_use
    ? (isEnglish()
      ? "OpenBook called query_rows, read the actual agency rows, and matched their reported total exactly to the official FY2026 baseline. These rows now supply agency detail; the official total remains authoritative."
      : "OpenBook 已呼叫 query_rows 讀取實際機關列，回傳總額與官方 115 年基準完全相符。這些資料列開始供應機關別明細，正式總額仍以官方資料為準。")
    : reconciliation.attempted
      ? (isEnglish()
        ? "OpenBook called query_rows and read the actual rows, but rejected them because the year was stale or the total did not match the official FY2026 baseline."
        : "OpenBook 已呼叫 query_rows 讀取實際資料列，但因年度過舊或總額與官方 115 年基準不符，因此未採用任何數值。")
      : data.selected_is_exact_city_match
        ? (isEnglish() ? "TwinkleAI found the locality, but no complete citywide candidate was approved for row retrieval. This remains search metadata only." : "TwinkleAI 找到同縣市資料，但沒有可核准讀列的全縣市候選，目前只使用搜尋 metadata。")
        : (isEnglish() ? "The best hit is not a precise locality match. TwinkleAI is not used for budget figures here." : "最佳命中不是精確縣市資料，TwinkleAI 在本頁沒有用於任何預算數值。");
  const topAgencies = reconciliation.top_agencies || [];
  const rowPanel = reconciliation.eligible_for_use
    ? `<div class="twinkle-row-panel accepted"><div><span>${isEnglish() ? "ACTUAL MCP DATA IN USE" : "實際 MCP 資料已採用"}</span><strong>${isEnglish() ? "Agency rows passed reconciliation" : "機關別資料列通過對帳"}</strong><p>${isEnglish() ? `${twdNumber.format(reconciliation.row_count_returned)} rows were read. The returned total equals ${formatAmount(reconciliation.official_total_thousand_twd)}.` : `已讀取 ${twdNumber.format(reconciliation.row_count_returned)} 列，回傳總額與官方 ${formatAmount(reconciliation.official_total_thousand_twd)} 完全相符。`}${reconciliation.status === "reconciled_year_unlabeled" ? (isEnglish() ? " The source does not label its fiscal year; exact-total reconciliation is disclosed as the year evidence." : " 來源未明示年度，目前以總額完全相符作為年度判斷依據。") : ""}</p></div><div class="table-wrap"><table class="detail-table"><thead><tr><th>${isEnglish() ? "Agency" : "TwinkleAI 實際機關列"}</th><th>${isEnglish() ? "Amount" : "金額"}</th><th>${isEnglish() ? "Share of official total" : "占官方總額"}</th></tr></thead><tbody>${topAgencies.map((item) => `<tr><td><strong>${escapeHtml(item.agency)}</strong></td><td>${escapeHtml(formatAmount(item.amount_thousand_twd))}</td><td>${escapeHtml(percent(item.amount_thousand_twd / reconciliation.official_total_thousand_twd))}</td></tr>`).join("")}</tbody></table></div></div>`
    : reconciliation.attempted
      ? `<div class="twinkle-row-panel rejected"><div><span>${isEnglish() ? "ACTUAL MCP ROWS REJECTED" : "實際 MCP 資料列未採用"}</span><strong>${reconciliation.status === "stale_year" ? (isEnglish() ? "The dataset year is stale" : "資料集年度過舊") : (isEnglish() ? "The returned total failed reconciliation" : "回傳總額未通過對帳")}</strong><p>${isEnglish() ? `TwinkleAI returned ${twdNumber.format(reconciliation.row_count_returned)} rows totaling ${formatAmount(reconciliation.reported_total_thousand_twd)}. The official FY2026 total is ${formatAmount(reconciliation.official_total_thousand_twd)}, a ${percent(Math.abs(reconciliation.difference_share))} gap.` : `TwinkleAI 回傳 ${twdNumber.format(reconciliation.row_count_returned)} 列，合計 ${formatAmount(reconciliation.reported_total_thousand_twd)}；官方 115 年總額為 ${formatAmount(reconciliation.official_total_thousand_twd)}，相差 ${percent(Math.abs(reconciliation.difference_share))}。`}</p><small>${escapeHtml(reconciliation.year_evidence || (isEnglish() ? "Fiscal year not labeled" : "資料未明示年度"))}</small></div></div>`
      : `<div class="twinkle-row-panel search-only"><div><span>${isEnglish() ? "SEARCH ONLY" : "只有搜尋結果"}</span><strong>${isEnglish() ? "No TwinkleAI rows are used on this page" : "本頁沒有使用 TwinkleAI 資料列"}</strong><p>${isEnglish() ? "The MCP search result is shown for discovery and source auditing only. It does not supply any displayed budget figure." : "MCP 搜尋結果只用於發現資料集與來源稽核，沒有供應本頁任何預算數字。"}</p></div></div>`;
  document.querySelector("#twinkle-detail").innerHTML = `
    <div class="source-metrics">
      ${statCard(isEnglish() ? "MCP status" : "MCP 狀態", data.status === "ok" ? (isEnglish() ? "Successful" : "成功") : (isEnglish() ? "Failed" : "失敗"), isEnglish() ? "Authenticated production call" : "正式服務認證呼叫")}
      ${statCard(isEnglish() ? "Unique candidates" : "不重複候選", twdNumber.format(data.result_count), isEnglish() ? `${data.exact_city_hits} exact-locality hits` : `${data.exact_city_hits} 個同縣市命中`)}
      ${statCard(isEnglish() ? "query_rows" : "實際資料列", reconciliation.attempted ? (isEnglish() ? `${twdNumber.format(reconciliation.row_count_returned)} read` : `已讀 ${twdNumber.format(reconciliation.row_count_returned)} 列`) : (isEnglish() ? "Not called" : "未呼叫"), reconciliation.attempted ? status.label : (isEnglish() ? "Search metadata only" : "只有搜尋 metadata"))}
      ${statCard(isEnglish() ? "Used by OpenBook" : "OpenBook 實際採用", reconciliation.eligible_for_use ? (isEnglish() ? "Agency detail" : "機關別明細") : (isEnglish() ? "No figures" : "未採用數值"), reconciliation.eligible_for_use ? (isEnglish() ? "Official total unchanged" : "官方總額不變") : (isEnglish() ? "Explicitly excluded" : "明確排除"))}
    </div>
    <div class="twinkle-selected"><span>${isEnglish() ? "Best semantic-search hit" : "語意搜尋最佳命中"}</span><h4>${escapeHtml(data.selected_title || (isEnglish() ? "No dataset selected" : "未選中資料集"))}</h4><p>${escapeHtml(interpretation)}</p><div class="dataset-meta"><span>Dataset ID <b>${escapeHtml(data.selected_dataset_id || "—")}</b></span><span>${isEnglish() ? "Agency" : "機關"} <b>${escapeHtml(data.selected_agency || metadata.agency || "—")}</b></span><span>${isEnglish() ? "License" : "授權"} <b>${escapeHtml(metadata.license || "—")}</b></span><span>${isEnglish() ? "Metadata updated" : "目錄更新"} <b>${escapeHtml(metadata.metadata_updated || "—")}</b></span></div>${sourceLink(metadata.source_url, isEnglish() ? "Open official dataset source" : "開啟資料集官方來源")}</div>
    ${rowPanel}
    <div class="schema-panel"><div class="subsection-heading"><h4>${isEnglish() ? "Schema returned by TwinkleAI" : "TwinkleAI 回傳欄位"}</h4><span>${columns.length} ${isEnglish() ? "columns" : "欄"}</span></div>${columns.length ? `<div class="schema-chips">${columns.slice(0, 12).map((column) => `<code>${escapeHtml(column)}</code>`).join("")}${columns.length > 12 ? `<span>${isEnglish() ? `+${columns.length - 12} more` : `另有 ${columns.length - 12} 欄`}</span>` : ""}</div>` : `<p>${isEnglish() ? "No schema was returned for the selected hit." : "選中資料沒有回傳 schema。"}</p>`}</div>`;
}

function renderTaipeiExtra(row) {
  const panel = document.querySelector("#city-taipei-extra");
  const nav = document.querySelector("#taipei-extra-nav");
  const isTaipei = row.city === "臺北市";
  panel.hidden = !isTaipei;
  nav.hidden = !isTaipei;
  if (!isTaipei) return;
  const year = state.taipei.meta.years.at(-1);
  const expenses = state.taipei.expenses.filter((item) => item.year === year);
  const revenues = state.taipei.revenues.filter((item) => item.year === year);
  const agencies = groupSum(expenses, "agency").slice(0, 8);
  const revenueGroups = groupSum(revenues, "category").slice(0, 6);
  const maxAgency = agencies[0]?.[1] || 1;
  const maxRevenue = revenueGroups[0]?.[1] || 1;
  document.querySelector("#taipei-extra-content").innerHTML = `<div class="taipei-extra-grid"><section><h3>${isEnglish() ? "Largest supervising agencies" : "歲出最大的主管機關"}</h3><div class="mini-ranking">${agencies.map(([name, amount]) => `<div><span>${escapeHtml(name)}</span><i><b style="width:${(amount / maxAgency) * 100}%"></b></i><strong>${escapeHtml(formatAmount(amount / 1000))}</strong></div>`).join("")}</div></section><section><h3>${isEnglish() ? "Largest revenue categories" : "主要歲入來源"}</h3><div class="mini-ranking">${revenueGroups.map(([name, amount]) => `<div><span>${escapeHtml(name)}</span><i><b style="width:${(amount / maxRevenue) * 100}%"></b></i><strong>${escapeHtml(formatAmount(amount / 1000))}</strong></div>`).join("")}</div></section></div><div class="source-actions">${state.taipei.meta.sources.map((source) => sourceLink(source.url, source.title)).join("")}</div>`;
}

function renderCity(row) {
  document.querySelector("#city-region").textContent = `${displayRegion(row.region)} · ${isEnglish() ? "FY2026" : "115 年度"}`;
  document.querySelector("#city-title").textContent = displayCity(row);
  document.querySelector("#city-summary").textContent = isEnglish()
    ? `Official common-budget figures, OpenFun program depth, and TwinkleAI ${row.twinkle.row_reconciliation?.eligible_for_use ? "reconciled agency rows" : row.twinkle.row_reconciliation?.attempted ? "rows rejected after reconciliation" : "search-only results"} for ${displayCity(row)} on one page.`
    : `把 ${displayCity(row)} 的官方共同預算、OpenFun 計畫深度，以及 TwinkleAI ${row.twinkle.row_reconciliation?.eligible_for_use ? "已對帳機關列" : row.twinkle.row_reconciliation?.attempted ? "讀取後未通過資料" : "純搜尋結果"}放在同一頁判讀。`;
  document.querySelector("#city-heading-badges").innerHTML = `<span>${escapeHtml(displayMachine(row.official_machine))}</span><span>${escapeHtml(displayInterface(row.interface))}</span><span>${isEnglish() ? "Readiness" : "資料工程成熟度"} ${escapeHtml(row.tier)}</span>`;
  document.querySelector("#city-primary-stats").innerHTML = [
    statCard(isEnglish() ? "Expense budget" : "歲出預算", formatAmount(row.expenditure_thousand_twd), isEnglish() ? "Official common baseline" : "官方共同基準"),
    statCard(isEnglish() ? "Revenue budget" : "歲入預算", formatAmount(row.revenue_thousand_twd), isEnglish() ? "Before financing" : "未含融資調節"),
    statCard(isEnglish() ? "Capital expenses" : "資本支出", formatAmount(row.capital_expenditure_thousand_twd), percent(row.metrics.capital_share)),
    statCard(isEnglish() ? "Largest function" : "最大政事別", categoryRows(row)[0].label, percent(categoryRows(row)[0].amount / row.expenditure_thousand_twd)),
  ].join("");
  document.querySelector("#city-question-title").textContent = cityQuestion(row);

  const categories = categoryRows(row);
  document.querySelector("#city-category-bars").innerHTML = categories.map((item, index) => `<div class="city-category-row"><span>${String(index + 1).padStart(2, "0")}</span><strong>${escapeHtml(item.label)}</strong><i><b style="width:${(item.amount / categories[0].amount) * 100}%"></b></i><em>${escapeHtml(formatAmount(item.amount))}</em><small>${escapeHtml(percent(item.amount / row.expenditure_thousand_twd))}</small></div>`).join("");
  const left = [[isEnglish() ? "Revenue" : "歲入", row.revenue_thousand_twd], [isEnglish() ? "Borrowing" : "舉借", row.borrowing_thousand_twd], [isEnglish() ? "Prior surplus" : "以前年度賸餘", row.prior_surplus_thousand_twd]];
  const right = [[isEnglish() ? "Expenses" : "歲出", row.expenditure_thousand_twd], [isEnglish() ? "Debt repayment" : "債務償還", row.debt_repayment_thousand_twd], [isEnglish() ? "Projected surplus" : "預計賸餘", row.budget_surplus_thousand_twd]];
  const equationSide = (items) => `<div>${items.map(([label, amount], index) => `<span>${index ? "＋" : ""}<small>${escapeHtml(label)}</small><strong>${escapeHtml(formatAmount(amount))}</strong></span>`).join("")}</div>`;
  document.querySelector("#financing-equation").innerHTML = `${equationSide(left)}<b>＝</b>${equationSide(right)}`;

  renderOfficialDetail(row);
  renderOpenfunDetail(row);
  renderTwinkleDetail(row);
  renderTaipeiExtra(row);
  document.querySelector("#city-method-copy").innerHTML = isEnglish()
    ? `<p><strong>Official</strong> answers comparable totals. <strong>OpenFun</strong> currently supplies this page through public bulk CSV and JSON, not the records API; program rows still require year and budget-stage checks. <strong>TwinkleAI</strong> searches datasets and query_rows retrieves actual rows; only exact-total matches may supply agency detail, never the official total.</p><p>Read unusual movements as questions. Classification changes, grants, funds, refinancing, and one-off projects can all produce large shifts.</p><p>USD figures are estimates at NT$${FX.rate} per US$1 (${FX.date}); the downloadable CSV retains official TWD amounts.</p>`
    : `<p><strong>官方資料</strong>回答可比較總額。<strong>OpenFun</strong>目前透過公開 bulk CSV／JSON 供應本頁，不是 records API；工作計畫仍需確認年度與預算階段。<strong>TwinkleAI</strong>先搜尋資料集，再用 query_rows 讀取實際資料列；只有總額完全相符時才能補充機關別明細，不能取代官方總額。</p><p>大幅變動先當問題閱讀。科目重分類、中央補助、基金、換債與一次性工程都可能造成數字跳動。</p>`;
}

function showNationwide(updateUrl = true) {
  state.selectedCity = null;
  document.body.classList.add("showing-nationwide");
  document.querySelector("#view-nationwide").hidden = false;
  document.querySelector("#view-city").hidden = true;
  renderTabs();
  applyTranslations();
  renderNationwide();
  if (updateUrl) setUrl(null);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openCity(cityName, updateUrl = true) {
  const row = state.cities.cities.find((item) => item.city === cityName);
  if (!row) return showNationwide(updateUrl);
  state.selectedCity = row;
  document.body.classList.remove("showing-nationwide");
  document.querySelector("#view-nationwide").hidden = true;
  document.querySelector("#view-city").hidden = false;
  renderTabs();
  applyTranslations();
  renderCity(row);
  if (updateUrl) setUrl(row.city);
  window.scrollTo({ top: 0, behavior: "smooth" });
  requestAnimationFrame(() => document.querySelector(`[data-city="${CSS.escape(row.city)}"]`)?.scrollIntoView({ inline: "center", block: "nearest" }));
}

function setUrl(cityName) {
  const url = new URL(location.href);
  if (isEnglish()) url.searchParams.set("lang", "en"); else url.searchParams.delete("lang");
  url.hash = cityName ? `city=${encodeURIComponent(cityName)}` : "";
  history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function setLanguage(language) {
  state.language = language === "en" ? "en" : "zh";
  renderTabs();
  applyTranslations();
  if (state.selectedCity) renderCity(state.selectedCity); else renderNationwide();
  renderGeneratedDate();
  setUrl(state.selectedCity?.city || null);
}

function renderGeneratedDate() {
  const date = new Date(state.cities.meta.generated_at);
  document.querySelector("#generated-date").textContent = isEnglish() ? `Data audit ${date.toLocaleDateString("en-US")}` : `資料實測 ${date.toLocaleDateString("zh-TW")}`;
}

function csvValue(value) {
  const string = String(value ?? "");
  return /[",\n]/.test(string) ? `"${string.replaceAll('"', '""')}"` : string;
}

function downloadCities() {
  const openFunApi = state.cities.meta.interface_audit.services.openfun.api_audit;
  const headers = isEnglish()
    ? ["Local government", "Expense TWD", "Revenue TWD", "Capital TWD", "Borrowing TWD", "Debt repayment TWD", "Prior surplus TWD", "OpenFun source channel", "OpenFun budget records API", "OpenFun latest ROC year", "OpenFun rows", "OpenFun narrative JSON", "Twinkle exact locality", "Twinkle citywide candidate", "Twinkle query_rows attempted", "Twinkle rows used", "Twinkle returned total TWD", "Twinkle difference TWD", "Twinkle selected dataset", "Official source"]
    : ["縣市", "歲出新臺幣", "歲入新臺幣", "資本支出新臺幣", "舉借新臺幣", "債務償還新臺幣", "以前年度賸餘新臺幣", "OpenFun 資料路徑", "OpenFun 預算 records API", "OpenFun 最新年度", "OpenFun 列數", "OpenFun 用途文字", "Twinkle 同縣市", "Twinkle 全縣市候選", "Twinkle 已呼叫 query_rows", "Twinkle 實際採用", "Twinkle 回傳總額新臺幣", "Twinkle 與官方差額新臺幣", "Twinkle 選中資料集", "官方來源"];
  const rows = state.cities.cities.map((row) => [displayCity(row), row.expenditure_thousand_twd * 1000, row.revenue_thousand_twd * 1000, row.capital_expenditure_thousand_twd * 1000, row.borrowing_thousand_twd * 1000, row.debt_repayment_thousand_twd * 1000, row.prior_surplus_thousand_twd * 1000, "public bulk CSV/JSON", openFunApi.budget_records_supported, row.openfun.latest_year || "", row.openfun.row_count || "", Boolean(row.openfun.detailed_plan_json?.substantive), row.twinkle.selected_is_exact_city_match, row.twinkle.selected_is_citywide_expense_budget, Boolean(row.twinkle.row_reconciliation?.attempted), Boolean(row.twinkle.row_reconciliation?.eligible_for_use), row.twinkle.row_reconciliation?.reported_total_thousand_twd == null ? "" : row.twinkle.row_reconciliation.reported_total_thousand_twd * 1000, row.twinkle.row_reconciliation?.difference_thousand_twd == null ? "" : row.twinkle.row_reconciliation.difference_thousand_twd * 1000, row.twinkle.selected_title || "", row.source_url]);
  const content = [headers, ...rows].map((row) => row.map(csvValue).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([`\ufeff${content}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = isEnglish() ? "taiwan-local-budget-audit-fy2026.csv" : "臺灣22縣市預算與資料實測-115.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function bindEvents() {
  document.querySelector("#home-button").addEventListener("click", () => showNationwide());
  document.querySelector("#nationwide-tab").addEventListener("click", () => showNationwide());
  document.querySelector("#back-overview").addEventListener("click", () => showNationwide());
  document.querySelector("#city-search").addEventListener("input", renderNationwide);
  document.querySelector("#download-cities").addEventListener("click", downloadCities);
  document.querySelectorAll("[data-language]").forEach((button) => button.addEventListener("click", () => setLanguage(button.dataset.language)));
  document.addEventListener("click", (event) => {
    const cityButton = event.target.closest("[data-city]");
    if (cityButton) openCity(cityButton.dataset.city);
    const sectionLink = event.target.closest(".city-section-nav a");
    if (sectionLink) {
      event.preventDefault();
      document.querySelector(sectionLink.getAttribute("href"))?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
  window.addEventListener("hashchange", () => {
    const match = location.hash.match(/^#city=(.+)$/);
    const cityName = match ? decodeURIComponent(match[1]) : null;
    if (cityName && state.selectedCity?.city !== cityName) openCity(cityName, false);
    if (!cityName && state.selectedCity) showNationwide(false);
  });
}

async function init() {
  applyTranslations();
  try {
    const [citiesResponse, taipeiResponse] = await Promise.all([fetch("./cities.json"), fetch("./data.json")]);
    if (!citiesResponse.ok || !taipeiResponse.ok) throw new Error(`${citiesResponse.status}/${taipeiResponse.status}`);
    state.cities = await citiesResponse.json();
    state.taipei = await taipeiResponse.json();
    renderTabs();
    bindEvents();
    const match = location.hash.match(/^#city=(.+)$/);
    const cityName = match ? decodeURIComponent(match[1]) : null;
    if (cityName) openCity(cityName, false); else showNationwide(false);
    renderGeneratedDate();
    document.querySelector("#loading-screen").classList.add("done");
  } catch (error) {
    document.querySelector("#loading-screen").innerHTML = `<strong>${isEnglish() ? "Budget data is temporarily unavailable" : "資料暫時無法載入"}</strong><span>${escapeHtml(error.message)}</span>`;
  }
}

init();
