#!/usr/bin/env node

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import XLSX from "xlsx";

const DGBAS_XLSX_URL = "https://ws.dgbas.gov.tw/Download.ashx?n=MTE15bm05bqm55u06L2E5biC5Y%2BK57ijKOW4ginnuL3poJDnrpflvZnnt6goZXhjZWwpLnhsc3g%3D&u=LzAwMS9VcGxvYWQvNDYxL3JlbGZpbGUvMTA2OTQvMjM2MjcxLzExNeW5tOW6puebtOi9hOW4guWPiue4oyjluIIp57i96aCQ566X5b2Z57eoKGV4Y2VsKS54bHN4";
const SOURCE_PAGE = "https://www.dgbas.gov.tw/News_Content.aspx?n=1525&s=236271";
const projectRoot = path.resolve(import.meta.dirname, "..");
const outputPath = path.join(projectRoot, "pages-site", "cities.json");
const readinessPath = path.join(projectRoot, "data-sources", "city-readiness.json");

function getArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

async function resolveWorkbook() {
  const input = getArgument("--input");
  if (input) return path.resolve(input);
  const temporaryPath = path.join(os.tmpdir(), `openbook-dgbas-115-${Date.now()}.xlsx`);
  const curlResult = await new Promise((resolve) => {
    const child = spawn("curl", ["--fail", "--location", "--silent", "--show-error", DGBAS_XLSX_URL, "--output", temporaryPath]);
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => resolve({ ok: false, error: error.message }));
    child.on("close", (code) => resolve({ ok: code === 0, error: stderr.trim() || `exit ${code}` }));
  });
  if (!curlResult.ok) {
    try {
      const response = await fetch(DGBAS_XLSX_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await fs.writeFile(temporaryPath, Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      throw new Error(`DGBAS workbook download failed. curl: ${curlResult.error}; fetch: ${error.message}`);
    }
  }
  return temporaryPath;
}

function rows(workbook, sheetName, range) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Missing worksheet: ${sheetName}`);
  return XLSX.utils.sheet_to_json(sheet, { header: 1, range, defval: null, raw: true });
}

function number(value) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Unexpected numeric value: ${value}`);
  return parsed;
}

const workbookPath = await resolveWorkbook();
const workbook = XLSX.readFile(workbookPath);
const readiness = JSON.parse(await fs.readFile(readinessPath, "utf8"));
const readinessByCity = new Map(readiness.cities.map((entry) => [entry.city, entry]));
const cityData = new Map(readiness.cities.map(({ city }) => [city, { city }]));

for (const row of rows(workbook, "融資總(明細)", "A5:J29")) {
  const city = String(row[1] ?? "").trim();
  if (!cityData.has(city)) continue;
  Object.assign(cityData.get(city), {
    revenue_thousand_twd: number(row[3]),
    borrowing_thousand_twd: number(row[4]),
    prior_surplus_thousand_twd: number(row[5]),
    expenditure_thousand_twd: number(row[7]),
    debt_repayment_thousand_twd: number(row[8]),
  });
}

for (const row of rows(workbook, "用途別", "A6:O30")) {
  const city = String(row[0] ?? "").trim();
  if (!cityData.has(city)) continue;
  Object.assign(cityData.get(city), {
    current_expenditure_thousand_twd: number(row[7]),
    capital_expenditure_thousand_twd: number(row[14]),
  });
}

for (const row of rows(workbook, "政事別-經資", "A8:AN32")) {
  const city = String(row[0] ?? "").trim();
  if (!cityData.has(city)) continue;
  Object.assign(cityData.get(city), {
    general_government_thousand_twd: number(row[2]),
    education_science_culture_thousand_twd: number(row[8]),
    economic_development_thousand_twd: number(row[13]),
    social_welfare_thousand_twd: number(row[18]),
    community_environment_thousand_twd: number(row[25]),
    pension_thousand_twd: number(row[28]),
    debt_service_thousand_twd: number(row[31]),
    grants_other_thousand_twd: number(row[34]),
  });
}

for (const row of rows(workbook, "資本支出", "A7:L31")) {
  const city = String(row[0] ?? "").trim();
  if (!cityData.has(city)) continue;
  Object.assign(cityData.get(city), {
    capital_land_thousand_twd: number(row[2]),
    capital_buildings_thousand_twd: number(row[3]),
    capital_public_works_thousand_twd: number(row[4]),
    capital_machinery_thousand_twd: number(row[5]),
    capital_transport_thousand_twd: number(row[6]),
    capital_it_thousand_twd: number(row[7]),
    capital_misc_thousand_twd: number(row[8]),
    capital_rights_thousand_twd: number(row[9]),
    capital_investment_thousand_twd: number(row[10]),
    capital_other_thousand_twd: number(row[11]),
  });
}

const cities = [...cityData.values()].map((city) => {
  const profile = readinessByCity.get(city.city);
  if (!city.expenditure_thousand_twd || !city.revenue_thousand_twd) throw new Error(`Missing totals for ${city.city}`);
  const functionTotal = [
    city.general_government_thousand_twd,
    city.education_science_culture_thousand_twd,
    city.economic_development_thousand_twd,
    city.social_welfare_thousand_twd,
    city.community_environment_thousand_twd,
    city.pension_thousand_twd,
    city.debt_service_thousand_twd,
    city.grants_other_thousand_twd,
  ].reduce((total, value) => total + value, 0);
  if (functionTotal !== city.expenditure_thousand_twd) throw new Error(`Function total mismatch for ${city.city}`);
  if (city.current_expenditure_thousand_twd + city.capital_expenditure_thousand_twd !== city.expenditure_thousand_twd) {
    throw new Error(`Current and capital total mismatch for ${city.city}`);
  }
  return { ...profile, ...city };
});

const payload = {
  meta: {
    generated_at: new Date().toISOString(),
    fiscal_year_roc: 115,
    fiscal_year_gregorian: 2026,
    unit: "thousand TWD",
    source_page: SOURCE_PAGE,
    source_file: "115年度直轄市及縣(市)總預算彙編(excel)",
    source_download: DGBAS_XLSX_URL,
    caveat: "金門縣在主計總處彙編中為總預算案，其餘依來源表註。",
    readiness: readiness.methodology,
  },
  cities,
};

await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Built ${cities.length} city profiles at ${outputPath}`);
