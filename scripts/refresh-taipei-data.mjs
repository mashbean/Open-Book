import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = resolve(ROOT, "sample-data");

const SOURCES = {
  expenses: {
    "114":
      "https://data.taipei/api/dataset/5d3c107e-4c8e-469c-a094-e4ebb9b0945a/resource/f0231bbc-67d1-4198-a4ea-d9c09058dfd5/download",
    "115":
      "https://data.taipei/api/dataset/5d3c107e-4c8e-469c-a094-e4ebb9b0945a/resource/ffb6280b-268a-474b-9e35-081722e8486d/download",
  },
  revenues: {
    "114":
      "https://data.taipei/api/dataset/38457687-1988-4aff-a0c6-e037d9bfa658/resource/a9bdc7d7-2f23-4593-985b-dab59b238f76/download",
    "115":
      "https://data.taipei/api/dataset/38457687-1988-4aff-a0c6-e037d9bfa658/resource/fa2edf9c-2a92-4c91-ba14-1d9c649fea00/download",
  },
};

function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .trim();
}

function field(block, tag) {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return match ? decodeXml(match[1]) : "";
}

function parseRows(xml) {
  return [...xml.matchAll(/<Row>([\s\S]*?)<\/Row>/g)].map((match) => ({
    code: field(match[1], "款"),
    itemCode: field(match[1], "項"),
    name: field(match[1], "名稱"),
    recurrent: Number(field(match[1], "經常門")) || 0,
    capital: Number(field(match[1], "資本門")) || 0,
    total: Number(field(match[1], "合計")) || 0,
  }));
}

async function fetchXml(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`資料下載失敗 ${response.status} ${url}`);
  }
  return response.text();
}

function cleanAgency(name) {
  const cleaned = name
    .replace(/^臺北市政府/, "")
    .replace(/^臺北市/, "")
    .replace(/主管$/, "")
    .trim();
  return cleaned || "市政府";
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(headers, rows) {
  return `${[headers, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n")}\n`;
}

function normalizeExpenseRows(year, rows) {
  const normalized = [];
  for (const row of rows) {
    if (!row.code || row.name === "合計") continue;
    const agency = cleanAgency(row.name);
    for (const [kind, amount] of [
      ["經常門", row.recurrent],
      ["資本門", row.capital],
    ]) {
      if (amount <= 0) continue;
      normalized.push([year, kind, agency, row.code, `${agency}${kind}`, amount]);
    }
  }
  return normalized;
}

function normalizeRevenueRows(year, rows) {
  const groups = [];
  let current = null;

  for (const row of rows) {
    if (!row.code && !row.itemCode) continue;
    if (row.code) {
      current = { category: row.name, parent: row, children: [] };
      groups.push(current);
    } else if (current && row.itemCode) {
      current.children.push(row);
    }
  }

  const normalized = [];
  for (const group of groups) {
    const entries = group.children.length > 0 ? group.children : [group.parent];
    for (const entry of entries) {
      for (const [kind, amount] of [
        ["經常門", entry.recurrent],
        ["資本門", entry.capital],
      ]) {
        if (amount <= 0) continue;
        normalized.push([
          year,
          group.category,
          entry.name,
          kind,
          entry.itemCode || entry.code,
          amount,
        ]);
      }
    }
  }
  return normalized;
}

await mkdir(OUTPUT_DIR, { recursive: true });

const expenseRows = [];
const revenueRows = [];
const capitalRows = [];

for (const year of Object.keys(SOURCES.expenses).sort()) {
  const rows = parseRows(await fetchXml(SOURCES.expenses[year]));
  expenseRows.push(...normalizeExpenseRows(year, rows));
  for (const row of rows) {
    if (!row.code || row.name === "合計" || row.capital <= 0) continue;
    const agency = cleanAgency(row.name);
    capitalRows.push([
      year,
      agency,
      "資本門預算（機關別彙總）",
      row.capital,
      "臺北市總預算",
    ]);
  }
}

for (const year of Object.keys(SOURCES.revenues).sort()) {
  const rows = parseRows(await fetchXml(SOURCES.revenues[year]));
  revenueRows.push(...normalizeRevenueRows(year, rows));
}

await writeFile(
  resolve(OUTPUT_DIR, "taipei-expenses.csv"),
  toCsv(["年度", "歲出性質", "主管機關", "款", "科目", "金額"], expenseRows),
  "utf8",
);
await writeFile(
  resolve(OUTPUT_DIR, "taipei-revenues.csv"),
  toCsv(["年度", "歲入來源", "科目", "歲入性質", "項", "金額"], revenueRows),
  "utf8",
);
await writeFile(
  resolve(OUTPUT_DIR, "taipei-capital.csv"),
  toCsv(["年度", "主管機關", "用途", "金額", "資金來源"], capitalRows),
  "utf8",
);

console.log(`已產生 ${expenseRows.length} 筆歲出資料`);
console.log(`已產生 ${revenueRows.length} 筆歲入資料`);
console.log(`已產生 ${capitalRows.length} 筆資本門資料`);
