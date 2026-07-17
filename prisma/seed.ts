import { prisma } from "../src/lib/db.js";
import * as fs from "fs";
import * as path from "path";
import Papa from "papaparse";

function parseCSV(filePath: string): Record<string, string>[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim(),
  });
  return result.data;
}

function parseAmount(value: string): number {
  if (!value) return 0;
  const number = Number(value.toString().replace(/[$,\s()]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

async function main() {
  console.log("正在載入臺北市開放預算資料...");

  await prisma.budgetRow.deleteMany();
  await prisma.columnMapping.deleteMany();
  await prisma.upload.deleteMany();
  await prisma.town.deleteMany();

  const taipei = await prisma.town.create({
    data: {
      name: "臺北市",
      slug: "taipei",
      primaryColor: "#176B5B",
      inviteCode: "taipei-open-data",
      published: true,
      aboutText:
        "民間概念驗證版本。資料來自臺北市政府主計處公開的正式總預算 XML，金額以新臺幣計算。",
    },
  });

  const sampleDir = path.join(__dirname, "..", "sample-data");

  const expenseRows = parseCSV(path.join(sampleDir, "taipei-expenses.csv"));
  const expenseUpload = await prisma.upload.create({
    data: {
      townId: taipei.id,
      fileName: "taipei-expenses.csv",
      fileType: "csv",
      dataCategory: "expenses",
      rowCount: expenseRows.length,
      status: "published",
      rawHeaders: JSON.stringify(["年度", "歲出性質", "主管機關", "款", "科目", "金額"]),
    },
  });

  await prisma.budgetRow.createMany({
    data: expenseRows.map((row) => ({
      townId: taipei.id,
      uploadId: expenseUpload.id,
      dataCategory: "expenses",
      department: row["主管機關"] || null,
      functionArea: row["歲出性質"] || null,
      lineItem: row["科目"] || null,
      objectCode: row["款"] ? `款${row["款"]}` : null,
      fiscalYear: row["年度"],
      amount: parseAmount(row["金額"]),
      amountType: "budget",
    })),
  });

  const revenueRows = parseCSV(path.join(sampleDir, "taipei-revenues.csv"));
  const revenueUpload = await prisma.upload.create({
    data: {
      townId: taipei.id,
      fileName: "taipei-revenues.csv",
      fileType: "csv",
      dataCategory: "revenues",
      rowCount: revenueRows.length,
      status: "published",
      rawHeaders: JSON.stringify(["年度", "歲入來源", "科目", "歲入性質", "項", "金額"]),
    },
  });

  await prisma.budgetRow.createMany({
    data: revenueRows.map((row) => ({
      townId: taipei.id,
      uploadId: revenueUpload.id,
      dataCategory: "revenues",
      category1: row["歲入來源"] || null,
      category2: row["歲入性質"] || null,
      lineItem: row["科目"] || null,
      objectCode: row["項"] ? `項${row["項"]}` : null,
      fiscalYear: row["年度"],
      amount: parseAmount(row["金額"]),
      amountType: "budget",
    })),
  });

  const capitalRows = parseCSV(path.join(sampleDir, "taipei-capital.csv"));
  const capitalUpload = await prisma.upload.create({
    data: {
      townId: taipei.id,
      fileName: "taipei-capital.csv",
      fileType: "csv",
      dataCategory: "capital",
      rowCount: capitalRows.length,
      status: "published",
      rawHeaders: JSON.stringify(["年度", "主管機關", "用途", "金額", "資金來源"]),
    },
  });

  await prisma.budgetRow.createMany({
    data: capitalRows.map((row) => ({
      townId: taipei.id,
      uploadId: capitalUpload.id,
      dataCategory: "capital",
      department: row["主管機關"] || null,
      purpose: row["用途"] || null,
      fundingSource: row["資金來源"] || null,
      fiscalYear: row["年度"],
      amount: parseAmount(row["金額"]),
      amountType: "budget",
    })),
  });

  await prisma.tooltip.createMany({
    data: [
      {
        townId: taipei.id,
        scope: "category",
        key: "經常門",
        text: "維持政府日常運作與公共服務所需的支出，例如人事、業務與補助。",
      },
      {
        townId: taipei.id,
        scope: "category",
        key: "資本門",
        text: "可形成資產或長期效益的支出，例如公共工程、設備與土地。",
      },
      {
        townId: taipei.id,
        scope: "category",
        key: "稅課收入",
        text: "由各項地方稅、統籌分配稅與依法分配的國稅所構成。",
      },
    ],
  });

  await prisma.supportingLink.createMany({
    data: [
      {
        townId: taipei.id,
        title: "臺北市總預算歲出機關別預算總表",
        url: "https://data.gov.tw/dataset/132907",
        description: "114、115 年度歲出來源，包含主管機關、經常門與資本門。",
        category: "budget",
        sortOrder: 1,
      },
      {
        townId: taipei.id,
        title: "臺北市總預算歲入來源別預算總表",
        url: "https://data.gov.tw/dataset/132917",
        description: "114、115 年度歲入來源，包含經常門與資本門。",
        category: "budget",
        sortOrder: 2,
      },
      {
        townId: taipei.id,
        title: "臺北市總預決算歲出按政事別",
        url: "https://data.gov.tw/dataset/138490",
        description: "108 年度以後的歲出預算與決算時間序列。",
        category: "report",
        sortOrder: 3,
      },
      {
        townId: taipei.id,
        title: "臺北市政府歲入預算執行情形",
        url: "https://data.gov.tw/dataset/121177",
        description: "依主管機關及來源分類的預算與實收累計數。",
        category: "report",
        sortOrder: 4,
      },
    ],
  });

  await prisma.faqEntry.createMany({
    data: [
      {
        townId: taipei.id,
        question: "這些金額是實際花掉的錢嗎？",
        answer:
          "目前頁面呈現正式總預算，不代表最後實際支出。決算、實現數與保留數會在年度結束後才能完整比較。",
        sortOrder: 1,
      },
      {
        townId: taipei.id,
        question: "為什麼看不到收款廠商或每一筆付款？",
        answer:
          "臺北市目前公開的機器可讀資料是機關與科目彙總，並非逐筆支付明細。政府採購決標金額也不等同實際付款，因此本網站不把兩者混在一起。",
        sortOrder: 2,
      },
      {
        townId: taipei.id,
        question: "資料多久更新一次？",
        answer:
          "總預算資料通常按年度更新。網站內的原始資料頁會保留來源與更新資訊，可用來核對最新版本。",
        sortOrder: 3,
      },
      {
        townId: taipei.id,
        question: "這是臺北市政府的官方網站嗎？",
        answer:
          "不是。本網站是以官方開放資料製作的民間概念驗證，原始資料仍以臺北市政府與政府資料開放平臺發布內容為準。",
        sortOrder: 4,
      },
    ],
  });

  console.log(`已載入 ${expenseRows.length} 筆歲出資料`);
  console.log(`已載入 ${revenueRows.length} 筆歲入資料`);
  console.log(`已載入 ${capitalRows.length} 筆資本門資料`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
