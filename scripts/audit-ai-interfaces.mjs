#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import Papa from "papaparse";

const projectRoot = path.resolve(import.meta.dirname, "..");
const outputPath = path.join(projectRoot, "data-sources", "ai-interface-audit.json");
const OPENFUN_ROOT = "https://local-budget-files.ronny-s3.click/files/merged-county";
const OPENFUN_API_BASE = "https://data.openfun.tw/api/v1";
const TWINKLE_ENDPOINT = "https://api.twinkleai.tw/mcp/";
const CITIES = [
  "臺北市", "新北市", "桃園市", "臺中市", "臺南市", "高雄市", "基隆市", "新竹市", "新竹縣", "宜蘭縣", "苗栗縣",
  "彰化縣", "南投縣", "雲林縣", "嘉義市", "嘉義縣", "屏東縣", "澎湖縣", "花蓮縣", "臺東縣", "金門縣", "連江縣",
];

const TWINKLE_ROW_PROFILES = new Map(Object.entries({
  "177273": { city: "新北市", agency_column: "field1", amount_column: "amounts unit dollars4", total_label: "總計", fiscal_year_roc: 115, year_evidence: "資料集標題明示 115 年度" },
  "46434": { city: "桃園市", agency_column: "科目名稱", amount_column: "合計_千元", fiscal_year_roc: null, year_evidence: "資料列與標題未明示年度" },
  "89337": { city: "臺中市", agency_column: "欄位名稱", amount_column: "數值", unit_divisor: 1000, fiscal_year_roc: 108, year_evidence: "資料列日期為 2019-01-01" },
  "53336": { city: "臺南市", agency_column: "名稱", amount_column: "本年度預算數", total_label: "合計", fiscal_year_roc: null, year_evidence: "資料列與標題未明示年度" },
  "101171": { city: "高雄市", agency_column: "名稱", amount_column: "合計金額", total_label: "合計", fiscal_year_roc: null, year_evidence: "資料列與標題未明示年度" },
  "168463": { city: "南投縣", agency_column: "項目", amount_column: "本年度預算數金額（千元）", total_label: "歲出合計", fiscal_year_roc: null, year_evidence: "資料列與標題未明示年度" },
  "52350": { city: "嘉義市", agency_column: "名稱", amount_column: "合計金額", fiscal_year_roc: null, year_evidence: "資料列與標題未明示年度" },
  "148048": { city: "花蓮縣", agency_column: "名稱", amount_column: "107年度預算數(經資門併計)(千元)", fiscal_year_roc: 107, year_evidence: "金額欄位明示 107 年度" },
}));

function normalizeText(value) {
  return String(value ?? "").replaceAll("台", "臺").replaceAll(/\s+/g, "").toLowerCase();
}

function number(value) {
  const normalized = String(value ?? "").replaceAll(",", "").trim();
  if (!normalized || normalized === "-") return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function amountForRow(row) {
  return number(row["法定預算"]) ?? number(row["預算案"]) ?? number(row["調整後預算"]);
}

function descendingAmount(left, right) {
  return (right.amount ?? -Infinity) - (left.amount ?? -Infinity);
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { "user-agent": "OpenBook-Taiwan/1.0 (+https://github.com/mashbean/Open-Book)" } });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return { text: await response.text(), response };
}

async function fetchJsonResult(url, options = {}) {
  const startedAt = performance.now();
  const response = await fetch(url, {
    ...options,
    headers: {
      "user-agent": "OpenBook-Taiwan/1.0 (+https://github.com/mashbean/Open-Book)",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 500) };
  }
  return {
    ok: response.ok,
    http_status: response.status,
    elapsed_ms: Math.round(performance.now() - startedAt),
    body,
  };
}

function openFunSearchUrl(query) {
  const url = new URL(`${OPENFUN_API_BASE}/search`);
  url.searchParams.set("q", query);
  return url;
}

function openFunDatasetSummary(result) {
  return {
    slug: result.slug,
    title: result.title || result.name || null,
    skill_md_url: result.skill_md_url || null,
  };
}

async function inspectOpenFunApi(token) {
  const authorization = { authorization: `Bearer ${token}` };
  const searchQueries = ["地方預算", "政府預算"];
  const searches = [];

  for (const query of searchQueries) {
    const [anonymous, authenticated] = await Promise.all([
      fetchJsonResult(openFunSearchUrl(query)),
      fetchJsonResult(openFunSearchUrl(query), { headers: authorization }),
    ]);
    const anonymousDatasets = (anonymous.body.datasets?.results || []).map(openFunDatasetSummary);
    const authenticatedDatasets = (authenticated.body.datasets?.results || []).map(openFunDatasetSummary);
    searches.push({
      query,
      anonymous_http_status: anonymous.http_status,
      authenticated_http_status: authenticated.http_status,
      anonymous_datasets: anonymousDatasets,
      authenticated_datasets: authenticatedDatasets,
      same_dataset_slugs: anonymousDatasets.map((item) => item.slug).join("|") === authenticatedDatasets.map((item) => item.slug).join("|"),
    });
  }

  const budgetSlugs = ["tw.openfun~bulk~budget-local", "tw.openfun~bulk~budget-detail"];
  const budgetEndpoints = [];
  for (const slug of budgetSlugs) {
    const encodedSlug = encodeURIComponent(slug);
    const [records, aggregation] = await Promise.all([
      fetchJsonResult(`${OPENFUN_API_BASE}/datasets/${encodedSlug}/records?per_page=1`, { headers: authorization }),
      fetchJsonResult(`${OPENFUN_API_BASE}/datasets/${encodedSlug}/agg?group_by=${encodeURIComponent("縣市")}`, { headers: authorization }),
    ]);
    budgetEndpoints.push({
      slug,
      records: { http_status: records.http_status, supported: records.ok, error: records.body.error || records.body.message || null },
      aggregation: { http_status: aggregation.http_status, supported: aggregation.ok, error: aggregation.body.error || aggregation.body.message || null },
    });
  }

  const probeSlug = "tw.gov.dgpa~ref~gov-org";
  const probeBase = `${OPENFUN_API_BASE}/datasets/${encodeURIComponent(probeSlug)}`;
  const [anonymousProbe, authenticatedProbe, nameSearch, exactFilter, aggregationProbe] = await Promise.all([
    fetchJsonResult(`${probeBase}/records?per_page=1`),
    fetchJsonResult(`${probeBase}/records?per_page=1`, { headers: authorization }),
    fetchJsonResult(`${probeBase}/records?${new URLSearchParams({ "q[機關名稱]": "臺北市政府", per_page: "1" })}`, { headers: authorization }),
    fetchJsonResult(`${probeBase}/records?${new URLSearchParams({ 機關層級: "1", per_page: "1" })}`, { headers: authorization }),
    fetchJsonResult(`${probeBase}/agg?group_by=${encodeURIComponent("機關層級")}`, { headers: authorization }),
  ]);

  return {
    tested_at: new Date().toISOString(),
    endpoint: OPENFUN_API_BASE,
    access_label_zh: "邀請制封測中，完整權限需帳號與群組授權",
    access_label_en: "Invitation-only beta; full access requires an account and group authorization",
    search: searches,
    budget_dataset_type: "bulk",
    budget_endpoints: budgetEndpoints,
    budget_records_supported: budgetEndpoints.every((item) => item.records.supported),
    budget_aggregation_supported: budgetEndpoints.every((item) => item.aggregation.supported),
    token_probe: {
      dataset: probeSlug,
      anonymous_http_status: anonymousProbe.http_status,
      authenticated_http_status: authenticatedProbe.http_status,
      authenticated_total_records: authenticatedProbe.body.total ?? null,
      schema_field_count: authenticatedProbe.body.schema?.length ?? null,
      name_search_http_status: nameSearch.http_status,
      name_search_total: nameSearch.body.total ?? null,
      exact_filter_http_status: exactFilter.http_status,
      exact_filter_total: exactFilter.body.total ?? null,
      aggregation_http_status: aggregationProbe.http_status,
      aggregation_error: aggregationProbe.body.error || aggregationProbe.body.message || null,
      documented_aggregation_example_currently_works: aggregationProbe.ok,
    },
    conclusion: "搜尋與受保護 records 查詢可用；地方預算目前以公開 bulk CSV/JSON 供應，不能透過 records 或 agg 查詢。",
  };
}

async function inspectOpenFunCity(city) {
  const cityPath = `${OPENFUN_ROOT}/${encodeURIComponent(city)}`;
  const plansUrl = `${cityPath}/${encodeURIComponent("工作計劃.csv")}`;
  const detailUrl = `${cityPath}/${encodeURIComponent("歲出分支列表.json")}`;
  const { text, response } = await fetchText(plansUrl);
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  if (parsed.errors.length) {
    const fatal = parsed.errors.filter((error) => error.type !== "FieldMismatch");
    if (fatal.length) throw new Error(`${city} CSV parse error: ${fatal[0].message}`);
  }

  const rows = parsed.data.filter((row) => normalizeText(row["縣市"] || city) === normalizeText(city));
  const years = [...new Set(rows.map((row) => number(row["年"])).filter((year) => year >= 90 && year <= 130))].sort((a, b) => a - b);
  const latestYear = years.at(-1) ?? null;
  const latestRows = rows
    .filter((row) => number(row["年"]) === latestYear)
    .map((row) => ({ ...row, amount: amountForRow(row) }))
    .filter((row) => row.amount !== null && row.amount >= 0);
  const amountStage = latestRows.some((row) => number(row["法定預算"]) !== null) ? "法定預算優先" : "預算案";
  const total = latestRows.reduce((sum, row) => sum + row.amount, 0);
  const largestPlans = [...latestRows]
    .sort(descendingAmount)
    .slice(0, 5)
    .map((row) => ({
      agency: row["機關名"],
      supervising_agency: row["主管機關"],
      business_plan: row["業務計劃"],
      program: row["名稱"],
      function: row["政事別"],
      amount_thousand_twd: row.amount,
      share_of_latest_rows: total > 0 ? row.amount / total : null,
    }));

  const movements = rows
    .map((row) => {
      const current = amountForRow(row);
      const change = number(row["與去年差異"]);
      const prior = current !== null && change !== null ? current - change : null;
      return { row, current, change, prior, rate: prior > 0 ? change / prior : null };
    })
    .filter(({ row, current, change, prior }) => number(row["年"]) === latestYear && current > 0 && prior > 0 && change !== null)
    .filter(({ current, prior }) => Math.max(current, prior) >= 10_000);
  const increases = [...movements].filter(({ change }) => change > 0).sort((left, right) => right.change - left.change);
  const decreases = [...movements].filter(({ change }) => change < 0).sort((left, right) => left.change - right.change);
  const movement = ({ row, current, change, prior, rate } = {}) => row ? ({
    agency: row["機關名"],
    program: row["名稱"],
    function: row["政事別"],
    current_thousand_twd: current,
    prior_thousand_twd: prior,
    change_thousand_twd: change,
    change_rate: rate,
  }) : null;

  let detailStatus = { available: false, status: null, bytes: null, last_modified: null, etag: null };
  try {
    const detailResponse = await fetch(detailUrl, { method: "HEAD" });
    const etag = detailResponse.headers.get("etag");
    const etagBytes = etag ? Number.parseInt(etag.replace(/^W\//, "").replaceAll('"', "").split("-")[0], 16) : null;
    const headerBytes = number(detailResponse.headers.get("content-length"));
    const bytes = headerBytes ?? (Number.isFinite(etagBytes) ? etagBytes : null);
    detailStatus = {
      available: detailResponse.ok,
      substantive: detailResponse.ok && bytes !== null ? bytes > 2 : null,
      status: detailResponse.status,
      bytes,
      last_modified: detailResponse.headers.get("last-modified"),
      etag,
    };
  } catch (error) {
    detailStatus.error = error.message;
  }

  return {
    status: "ok",
    plans_url: plansUrl,
    detail_url: detailUrl,
    browser_url: `https://budget.openfun.app/budget/show/${encodeURIComponent(city)}/${latestYear ?? 115}`,
    csv_last_modified: response.headers.get("last-modified"),
    row_count: rows.length,
    years,
    history_years: years.length,
    latest_year: latestYear,
    latest_row_count: latestRows.length,
    latest_amount_stage: amountStage,
    latest_total_thousand_twd: total,
    largest_plans: largestPlans,
    largest_latest_increase: movement(increases[0]),
    largest_latest_decrease: movement(decreases[0]),
    detailed_plan_json: detailStatus,
  };
}

function parseSseOrJson(text) {
  const dataLines = text.split(/\r?\n/).filter((line) => line.startsWith("data:"));
  if (dataLines.length) return JSON.parse(dataLines.at(-1).slice(5).trim());
  return JSON.parse(text);
}

function unwrapToolResult(payload) {
  if (payload.error) throw new Error(payload.error.message || JSON.stringify(payload.error));
  const content = payload.result?.content;
  const text = Array.isArray(content) ? content.find((item) => item.type === "text")?.text : null;
  if (!text) return payload.result;
  const parsed = JSON.parse(text);
  if (payload.result?._meta && !parsed._meta) parsed._meta = payload.result._meta;
  return parsed;
}

function findArray(payload, depth = 0) {
  if (Array.isArray(payload)) return payload;
  for (const key of ["results", "datasets", "data", "items", "rows"]) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  if (payload && typeof payload === "object" && depth < 4) {
    for (const value of Object.values(payload)) {
      const nested = findArray(value, depth + 1);
      if (nested.length) return nested;
    }
  }
  return [];
}

async function createTwinkleClient(apiKey) {
  const headers = {
    authorization: `Bearer ${apiKey}`,
    accept: "application/json, text/event-stream",
    "content-type": "application/json",
  };
  const initializeResponse = await fetch(TWINKLE_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "OpenBook-Taiwan-audit", version: "1.0.0" } } }),
  });
  if (!initializeResponse.ok) throw new Error(`Twinkle initialize failed: HTTP ${initializeResponse.status}`);
  const sessionId = initializeResponse.headers.get("mcp-session-id");
  if (!sessionId) throw new Error("Twinkle did not issue mcp-session-id");
  const initialize = parseSseOrJson(await initializeResponse.text());
  let requestId = 2;
  async function request(method, params = {}) {
    const response = await fetch(TWINKLE_ENDPOINT, {
      method: "POST",
      headers: { ...headers, "mcp-session-id": sessionId },
      body: JSON.stringify({ jsonrpc: "2.0", id: requestId++, method, params }),
    });
    if (!response.ok) throw new Error(`Twinkle ${method} failed: HTTP ${response.status}`);
    return parseSseOrJson(await response.text());
  }
  await request("notifications/initialized");
  const toolsPayload = await request("tools/list");
  const tools = toolsPayload.result?.tools ?? [];
  const names = new Set(tools.map((tool) => tool.name));
  const resolveTool = (base) => names.has(base) ? base : names.has(`opendata-${base}`) ? `opendata-${base}` : null;
  const toolNames = {
    search: resolveTool("search_datasets"),
    get: resolveTool("get_dataset"),
    query: resolveTool("query_rows"),
  };
  if (!toolNames.search || !toolNames.get || !toolNames.query) throw new Error(`Required Twinkle tools missing. Available: ${[...names].join(", ")}`);
  async function call(name, argumentsValue) {
    return unwrapToolResult(await request("tools/call", { name, arguments: argumentsValue }));
  }
  return { initialize, tools, toolNames, call };
}

function twinkleDatasetId(row) {
  return row?.dataset_id ?? row?.id ?? row?.datasetId ?? null;
}

function twinkleTitle(row) {
  return row?.title ?? row?.name ?? row?.dataset_title ?? "";
}

function twinkleAgency(row) {
  return row?.agency ?? row?.publisher ?? row?.organization ?? row?.provider ?? "";
}

function twinkleRelevance(city, row) {
  const haystack = normalizeText(`${twinkleTitle(row)} ${twinkleAgency(row)}`);
  const cityMatch = haystack.includes(normalizeText(city));
  const budgetMatch = ["預算", "決算", "歲入", "歲出", "會計"].some((term) => haystack.includes(term));
  const totalBudget = haystack.includes("總預算") ? 6 : 0;
  const expense = haystack.includes("歲出") ? 3 : 0;
  const centralAgencyPenalty = ["地方檢察署", "國稅", "預算員額", "圖書館"].some((term) => haystack.includes(term)) ? -8 : 0;
  const planPenalty = haystack.includes("施政計畫") ? -4 : 0;
  return (cityMatch ? 20 : 0) + (budgetMatch ? 3 : 0) + totalBudget + expense + centralAgencyPenalty + planPenalty + (number(row?.score) ?? 0);
}

function metadataShape(payload) {
  const dataset = payload?.dataset ?? payload?.data?.dataset ?? payload?.data ?? payload;
  const metadata = dataset?.metadata ?? {};
  const schema = payload?.schema ?? dataset?.schema ?? metadata?.schema ?? payload?.columns ?? dataset?.columns ?? null;
  const columns = Array.isArray(schema) ? schema : Array.isArray(schema?.columns) ? schema.columns : [];
  return {
    title: dataset?.title ?? dataset?.name ?? payload?.title ?? payload?.name ?? null,
    agency: dataset?.agency ?? dataset?.publisher ?? payload?.agency ?? payload?.publisher ?? null,
    source_url: dataset?.source_url ?? dataset?.url ?? metadata?.source?.url ?? dataset?.download_urls?.[0] ?? payload?.source_url ?? payload?.url ?? null,
    license: dataset?.license ?? payload?.license ?? null,
    row_count: number(dataset?.row_count ?? dataset?.count ?? metadata?.schema?.row_count ?? dataset?.data_volume_total ?? payload?.row_count ?? payload?.count),
    columns: columns.map((column) => typeof column === "string" ? column : column.name ?? column.label ?? column.key).filter(Boolean),
    description: dataset?.description ?? metadata?.description ?? null,
    metadata_updated: dataset?.metadata_updated ?? metadata?.updated_at ?? null,
    update_freq: dataset?.update_freq ?? metadata?.update_freq ?? null,
    quality_tier: dataset?.quality_tier ?? metadata?.quality_tier ?? null,
    normalised_at: dataset?.provenance?.normalised_at ?? metadata?.provenance?.normalised_at ?? null,
  };
}

function queryRowsShape(payload) {
  const data = payload?.data ?? payload;
  return {
    columns: Array.isArray(data?.columns) ? data.columns : [],
    rows: Array.isArray(data?.rows) ? data.rows : [],
    row_count_returned: number(data?.row_count_returned) ?? (Array.isArray(data?.rows) ? data.rows.length : 0),
  };
}

function inspectTwinkleAmount(value) {
  const parsed = number(String(value ?? "").replaceAll(",", ""));
  return parsed === null ? null : parsed;
}

async function inspectTwinkleRows(client, city, datasetId, metadata) {
  const profile = TWINKLE_ROW_PROFILES.get(String(datasetId));
  if (!profile || profile.city !== city) {
    return { attempted: false, status: "no_row_profile", reason: "候選資料集尚未建立可重現的欄位讀取規則" };
  }
  const payload = await client.call(client.toolNames.query, { dataset_id: String(datasetId), limit: 100 });
  const result = queryRowsShape(payload);
  const agencyIndex = result.columns.indexOf(profile.agency_column);
  const amountIndex = result.columns.indexOf(profile.amount_column);
  if (agencyIndex < 0 || amountIndex < 0) {
    return {
      attempted: true,
      status: "schema_mismatch",
      row_count_returned: result.row_count_returned,
      columns: result.columns,
      reason: `預期欄位不存在：${profile.agency_column}／${profile.amount_column}`,
    };
  }
  const divisor = profile.unit_divisor ?? 1;
  const parsedRows = result.rows.map((row) => ({
    agency: String(row[agencyIndex] ?? "").trim(),
    amount_thousand_twd: inspectTwinkleAmount(row[amountIndex]) === null ? null : inspectTwinkleAmount(row[amountIndex]) / divisor,
  }));
  const totalRow = profile.total_label ? parsedRows.find((row) => row.agency === profile.total_label) : null;
  const reportedTotal = totalRow?.amount_thousand_twd ?? parsedRows.reduce((sum, row) => sum + (row.amount_thousand_twd ?? 0), 0);
  const excludedLabels = new Set(["合計", "總計", "歲出合計", "歲入合計", "歲入歲出餘絀"]);
  const topAgencies = parsedRows
    .filter((row) => row.agency && !excludedLabels.has(row.agency) && row.amount_thousand_twd > 0)
    .sort((left, right) => right.amount_thousand_twd - left.amount_thousand_twd)
    .slice(0, 5);
  return {
    attempted: true,
    status: "ok",
    tool: client.toolNames.query,
    row_count_returned: result.row_count_returned,
    expected_row_count: metadata?.row_count ?? null,
    row_complete: metadata?.row_count == null ? null : result.row_count_returned === metadata.row_count,
    columns: result.columns,
    agency_column: profile.agency_column,
    amount_column: profile.amount_column,
    reported_total_thousand_twd: reportedTotal,
    fiscal_year_roc: profile.fiscal_year_roc,
    year_evidence: profile.year_evidence,
    top_agencies: topAgencies,
    meta: payload?._meta ?? null,
  };
}

async function inspectTwinkleCity(client, city) {
  const queries = [`${city} 預算`, `${city} 總預算 歲出機關別`];
  const searchPayloads = [];
  for (const query of queries) {
    searchPayloads.push({ query, payload: await client.call(client.toolNames.search, { query, domain: "public_finance", limit: 10 }) });
  }
  if (process.env.DEBUG_TWINKLE === "1" && city === CITIES[0]) console.log(JSON.stringify(searchPayloads, null, 2));
  const seen = new Set();
  const results = searchPayloads.flatMap(({ payload }) => findArray(payload)).filter((row) => {
    const key = String(twinkleDatasetId(row) ?? `${twinkleTitle(row)}|${twinkleAgency(row)}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const ranked = results
    .map((row) => {
      const title = twinkleTitle(row);
      const yearMatch = title.match(/(\d{2,3})年度/);
      const year = yearMatch ? Number(yearMatch[1]) : null;
      const freshness = year === 115 ? 8 : year && year >= 100 ? year / 100 : 0;
      return { row, relevance: twinkleRelevance(city, row) + freshness };
    })
    .sort((left, right) => right.relevance - left.relevance);
  const best = ranked[0]?.row ?? null;
  const datasetId = twinkleDatasetId(best);
  let dataset = null;
  let datasetError = null;
  if (datasetId !== null) {
    try {
      dataset = await client.call(client.toolNames.get, { dataset_id: String(datasetId) });
    } catch (error) {
      datasetError = error.message;
    }
  }
  if (process.env.DEBUG_TWINKLE === "1" && city === CITIES[0]) console.log(JSON.stringify(dataset, null, 2));
  const exactCityHits = results.filter((row) => normalizeText(`${twinkleTitle(row)} ${twinkleAgency(row)}`).includes(normalizeText(city)));
  const selectedText = normalizeText(`${twinkleTitle(best)} ${twinkleAgency(best)}`);
  const selectedIsCitywideExpenseBudget = Boolean(best && selectedText.includes("總預算") && selectedText.includes("歲出") && !selectedText.includes("地方檢察署"));
  const selectedMetadata = dataset ? metadataShape(dataset) : null;
  let rowData = { attempted: false, status: "search_only", reason: "最佳命中不是全縣市歲出總預算，未讀取資料列" };
  if (selectedIsCitywideExpenseBudget && datasetId !== null) {
    try {
      rowData = await inspectTwinkleRows(client, city, datasetId, selectedMetadata);
    } catch (error) {
      rowData = { attempted: true, status: "error", error: error.message };
    }
  }
  return {
    status: "ok",
    queries: searchPayloads.map(({ query, payload }) => ({ query, result_count: findArray(payload).length, meta: payload?._meta ?? null })),
    result_count: results.length,
    exact_city_hits: exactCityHits.length,
    selected_dataset_id: datasetId,
    selected_title: twinkleTitle(best) || null,
    selected_agency: twinkleAgency(best) || null,
    selected_score: number(best?.score),
    selected_is_exact_city_match: best ? normalizeText(`${twinkleTitle(best)} ${twinkleAgency(best)}`).includes(normalizeText(city)) : false,
    selected_is_citywide_expense_budget: selectedIsCitywideExpenseBudget,
    selected_metadata: selectedMetadata,
    dataset_error: datasetError,
    row_data: rowData,
    search_meta: searchPayloads.map(({ payload }) => payload?._meta ?? null),
  };
}

async function main() {
  const apiKey = process.env.TWINKLE_API_KEY;
  const openFunToken = process.env.OPENFUN_API_TOKEN;
  if (!apiKey) throw new Error("TWINKLE_API_KEY is required. Load it from ~/.config/secrets/twinkle.env before running.");
  if (!openFunToken) throw new Error("OPENFUN_API_TOKEN is required. Load it from ~/.config/secrets/openfun.env before running.");

  console.log("Testing OpenFun search, authenticated records, filters, aggregation, and budget endpoint support");
  const openFunApi = await inspectOpenFunApi(openFunToken);

  console.log("Connecting to Twinkle MCP and reading the production tool registry");
  const twinkle = await createTwinkleClient(apiKey);
  const serverInfo = twinkle.initialize.result?.serverInfo ?? null;
  const records = [];

  for (const [index, city] of CITIES.entries()) {
    console.log(`[${index + 1}/${CITIES.length}] ${city}: OpenFun`);
    let openfun;
    try {
      openfun = await inspectOpenFunCity(city);
    } catch (error) {
      openfun = { status: "error", error: error.message };
    }

    console.log(`[${index + 1}/${CITIES.length}] ${city}: Twinkle`);
    let twinkleResult;
    try {
      twinkleResult = await inspectTwinkleCity(twinkle, city);
    } catch (error) {
      twinkleResult = { status: "error", error: error.message, query: `${city} 預算` };
    }
    records.push({ city, openfun, twinkle: twinkleResult });
  }

  const output = {
    meta: {
      generated_at: new Date().toISOString(),
      cities_expected: CITIES.length,
      cities_audited: records.length,
      methodology: "OpenFun API 實測搜尋、認證 records、篩選、聚合與預算端點，再以公開 bulk CSV/JSON 逐縣市讀取工作計劃；Twinkle public_finance 逐縣市搜尋、讀取 metadata，對全縣市候選再以 query_rows 取得實際資料列。",
      boundary: "OpenFun Token 有效不等於預算 bulk 資料支援 records 或 agg。Twinkle 查詢命中也不代表可用；實際資料列仍須和官方 115 年度共同表對帳，未通過者不得供應正式數字。",
    },
    services: {
      openfun: {
        dataset: "tw.openfun~bulk~budget-detail",
        docs: "https://data.openfun.tw/datasets/tw.openfun~bulk~budget-detail/skill.md",
        attribution: "資料來源：歐噴資料庫（data.openfun.tw）／行政院主計總處與各縣市主計",
        authentication: "Bearer token for queryable API datasets; none for public budget bulk CSV/JSON",
        api_audit: openFunApi,
      },
      twinkle: {
        endpoint: TWINKLE_ENDPOINT,
        server: serverInfo,
        protocol_version: twinkle.initialize.result?.protocolVersion ?? null,
        production_tool_count: twinkle.tools.length,
        resolved_tools: twinkle.toolNames,
        docs_tool_names_match_production: Object.values(twinkle.toolNames).every((name) => name.startsWith("opendata-")),
      },
    },
    summary: {
      openfun_ok: records.filter((row) => row.openfun.status === "ok").length,
      openfun_detail_json_available: records.filter((row) => row.openfun.detailed_plan_json?.available).length,
      openfun_detail_json_substantive: records.filter((row) => row.openfun.detailed_plan_json?.substantive).length,
      twinkle_ok: records.filter((row) => row.twinkle.status === "ok").length,
      twinkle_with_results: records.filter((row) => row.twinkle.result_count > 0).length,
      twinkle_exact_city_match: records.filter((row) => row.twinkle.selected_is_exact_city_match).length,
      twinkle_citywide_expense_budget: records.filter((row) => row.twinkle.selected_is_citywide_expense_budget).length,
      twinkle_query_rows_attempted: records.filter((row) => row.twinkle.row_data?.attempted).length,
      twinkle_query_rows_succeeded: records.filter((row) => row.twinkle.row_data?.status === "ok").length,
    },
    cities: records,
  };

  await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Wrote ${records.length} city audits to ${outputPath}`);
  console.log(JSON.stringify(output.summary));
}

await main();
