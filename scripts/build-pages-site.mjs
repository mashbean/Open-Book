import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = resolve(ROOT, "pages-site");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/, ""));
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const [headers, ...dataRows] = rows;
  return dataRows.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
  );
}

async function loadCsv(name) {
  const text = await readFile(resolve(ROOT, "sample-data", name), "utf8");
  return parseCsv(text);
}

const [expenseRows, revenueRows, capitalRows] = await Promise.all([
  loadCsv("taipei-expenses.csv"),
  loadCsv("taipei-revenues.csv"),
  loadCsv("taipei-capital.csv"),
]);

const data = {
  meta: {
    city: "臺北市",
    title: "臺北市開放預算",
    description: "把官方開放預算資料整理成居民看得懂、查得到的公共財政入口。",
    generatedAt: new Date().toISOString(),
    years: [...new Set(expenseRows.map((row) => row["年度"]))].sort(),
    sources: [
      {
        title: "臺北市總預算歲出機關別預算總表",
        organization: "臺北市政府主計處",
        url: "https://data.gov.tw/dataset/132907",
        description: "主管機關、經常門、資本門與合計。",
      },
      {
        title: "臺北市總預算歲入來源別預算總表",
        organization: "臺北市政府主計處",
        url: "https://data.gov.tw/dataset/132917",
        description: "歲入來源、經常門、資本門與合計。",
      },
      {
        title: "臺北市總預決算歲出按政事別",
        organization: "臺北市政府主計處",
        url: "https://data.gov.tw/dataset/138490",
        description: "108 年度以後的預算、決算與實現數時間序列。",
      },
      {
        title: "臺北市政府歲入預算執行情形",
        organization: "臺北市政府財政局",
        url: "https://data.gov.tw/dataset/121177",
        description: "依主管機關與來源分類的預算及實收累計數。",
      },
    ],
    faqs: [
      {
        question: "這些金額是實際花掉的錢嗎？",
        answer: "目前呈現的是正式總預算，不代表最後實際支出。決算、實現數與保留數需要在年度結束後才能完整比較。",
      },
      {
        question: "為什麼看不到收款廠商或每一筆付款？",
        answer: "官方機器可讀資料目前只到機關與科目彙總，並非逐筆支付明細。政府採購決標金額也不等於實際付款，因此網站不把兩者混在同一欄位。",
      },
      {
        question: "經常門與資本門有什麼不同？",
        answer: "經常門主要維持政府日常運作與公共服務，資本門通常用於公共工程、土地、設備與其他可形成資產的支出。",
      },
      {
        question: "這是臺北市政府官方網站嗎？",
        answer: "這是使用官方開放資料製作的民間概念驗證。數字與欄位定義仍以臺北市政府及政府資料開放平臺發布內容為準。",
      },
    ],
  },
  expenses: expenseRows.map((row) => ({
    year: row["年度"],
    type: row["歲出性質"],
    agency: row["主管機關"],
    code: row["款"],
    item: row["科目"],
    amount: Number(row["金額"]),
  })),
  revenues: revenueRows.map((row) => ({
    year: row["年度"],
    category: row["歲入來源"],
    item: row["科目"],
    type: row["歲入性質"],
    code: row["項"],
    amount: Number(row["金額"]),
  })),
  capital: capitalRows.map((row) => ({
    year: row["年度"],
    agency: row["主管機關"],
    purpose: row["用途"],
    amount: Number(row["金額"]),
    source: row["資金來源"],
  })),
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(resolve(OUTPUT_DIR, "data.json"), `${JSON.stringify(data)}\n`, "utf8");
console.log(
  `GitHub Pages data built with ${data.expenses.length} expense, ${data.revenues.length} revenue, and ${data.capital.length} capital rows.`,
);
