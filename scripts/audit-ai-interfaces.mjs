#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import Papa from "papaparse";

const projectRoot = path.resolve(import.meta.dirname, "..");
const outputPath = path.join(projectRoot, "data-sources", "ai-interface-audit.json");
const OPENFUN_ROOT = "https://local-budget-files.ronny-s3.click/files/merged-county";
const TWINKLE_ENDPOINT = "https://api.twinkleai.tw/mcp/";
const CITIES = [
  "臺北市", "新北市", "桃園市", "臺中市", "臺南市", "高雄市", "基隆市", "新竹市", "新竹縣", "宜蘭縣", "苗栗縣",
  "彰化縣", "南投縣", "雲林縣", "嘉義市", "嘉義縣", "屏東縣", "澎湖縣", "花蓮縣", "臺東縣", "金門縣", "連江縣",
];

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
  };
  if (!toolNames.search || !toolNames.get) throw new Error(`Required Twinkle tools missing. Available: ${[...names].join(", ")}`);
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
    selected_is_citywide_expense_budget: Boolean(best && selectedText.includes("總預算") && selectedText.includes("歲出") && !selectedText.includes("地方檢察署")),
    selected_metadata: dataset ? metadataShape(dataset) : null,
    dataset_error: datasetError,
    search_meta: searchPayloads.map(({ payload }) => payload?._meta ?? null),
  };
}

async function main() {
  const apiKey = process.env.TWINKLE_API_KEY;
  if (!apiKey) throw new Error("TWINKLE_API_KEY is required. Load it from ~/.config/secrets/twinkle.env before running.");

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
      methodology: "OpenFun 工作計劃 CSV 逐縣市讀取並檢查詳細歲出 JSON；Twinkle public_finance 逐縣市搜尋，再讀取最佳命中資料集 metadata。",
      boundary: "查詢命中代表服務可發現或整理該資料，不代表數值已和官方 115 年度共同表同口徑，也不代表任何異常構成不當支出。",
    },
    services: {
      openfun: {
        dataset: "tw.openfun~bulk~budget-detail",
        docs: "https://data.openfun.tw/datasets/tw.openfun~bulk~budget-detail/skill.md",
        attribution: "資料來源：歐噴資料庫（data.openfun.tw）／行政院主計總處與各縣市主計",
        authentication: "none for static CSV/JSON",
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
    },
    cities: records,
  };

  await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Wrote ${records.length} city audits to ${outputPath}`);
  console.log(JSON.stringify(output.summary));
}

await main();
