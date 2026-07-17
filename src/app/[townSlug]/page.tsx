import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { groupAndSum, toChartData, buildExpenseSummaryTiles, buildRevenueSummaryTiles, detectCurrentAndPreviousYear } from "@/lib/aggregator";
import SummaryTiles from "@/components/portal/SummaryTiles";
import PieChart from "@/components/portal/PieChart";
import BarChart from "@/components/portal/BarChart";
import { formatFiscalYear } from "@/lib/format";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ townSlug: string }>;
}) {
  const { townSlug } = await params;
  const town = await prisma.town.findUnique({ where: { slug: townSlug } });
  if (!town) return notFound();

  // Fetch tooltips
  const tooltipRows = await prisma.tooltip.findMany({
    where: { townId: town.id, scope: "category" },
  });
  const categoryTooltips: Record<string, string> = {};
  for (const t of tooltipRows) {
    categoryTooltips[t.key] = t.text;
  }

  // Get expense data
  const expenseRows = await prisma.budgetRow.findMany({
    where: { townId: town.id, dataCategory: "expenses" },
  });

  const { currentYear, previousYear, allYears } = detectCurrentAndPreviousYear(expenseRows);

  const currentExpenses = expenseRows.filter(
    (r) => r.fiscalYear === currentYear && r.amountType === "budget"
  );
  const prevExpenses = expenseRows.filter(
    (r) => r.fiscalYear === previousYear && (r.amountType === "budget" || r.amountType === "actual")
  );

  const expenseTiles = buildExpenseSummaryTiles(currentExpenses, prevExpenses);
  const expenseByFunction = toChartData(
    groupAndSum(currentExpenses, "functionArea")
  );

  // Get revenue data
  const revenueRows = await prisma.budgetRow.findMany({
    where: { townId: town.id, dataCategory: "revenues" },
  });

  const revYears = detectCurrentAndPreviousYear(revenueRows);
  const currentRevenues = revenueRows.filter(
    (r) => r.fiscalYear === revYears.currentYear && r.amountType === "budget"
  );
  const prevRevenues = revenueRows.filter(
    (r) => r.fiscalYear === revYears.previousYear && (r.amountType === "actual" || r.amountType === "budget")
  );

  const revenueTiles = buildRevenueSummaryTiles(currentRevenues, prevRevenues);
  const revenueByCategory = toChartData(
    groupAndSum(currentRevenues, "category1")
  );

  const years: string[] = allYears.length > 0
    ? allYears
    : [previousYear, currentYear].filter((year): year is string => Boolean(year));
  const byFunctionByYear = new Map<string, number[]>();
  const functions = [...new Set(currentExpenses.map((r) => r.functionArea || "其他"))];

  for (const fn of functions) {
    byFunctionByYear.set(
      fn,
      years.map((y) =>
        expenseRows
          .filter(
            (r) =>
              r.functionArea === fn &&
              r.fiscalYear === y &&
              (r.amountType === "budget" || r.amountType === "actual")
          )
          .reduce((s, r) => s + r.amount, 0)
      )
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {formatFiscalYear(currentYear)}預算總覽
        </h1>
        <p className="text-gray-600 mt-1">
          {town.name}正式總預算的居民版摘要
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800 leading-relaxed">
          <strong>先看懂一座城市一年準備怎麼用錢。</strong>{" "}
          這裡把主計處發布的機器可讀資料整理成歲出、歲入與資本門圖表。
          金額均為新臺幣，內容是正式總預算彙總，並非逐筆付款紀錄。
          可在表格頁下載 CSV，或產生一份適合列印的{" "}
          <a href={`/${town.slug}/budget-book`} className="underline font-medium">預算書</a>。
          資料定義與限制請見{" "}
          <a href={`/${town.slug}/faq`} className="underline font-medium">常見問題</a>。
        </p>
      </div>

      <section>
        <h2 className="text-lg font-medium mb-1">歲出</h2>
        <p className="text-sm text-gray-600 mb-4">
          城市準備把錢用在哪裡，依經常門、資本門與主管機關呈現。
        </p>
        <SummaryTiles tiles={expenseTiles} tooltips={categoryTooltips} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <PieChart
            data={expenseByFunction}
            title={`${formatFiscalYear(currentYear)}歲出性質`}
            townColor={town.primaryColor}
          />
          <BarChart
            categories={years.map(formatFiscalYear)}
            series={functions.slice(0, 6).map((fn) => ({
              label: fn,
              data: byFunctionByYear.get(fn) || [],
            }))}
            title="歲出性質年度比較"
            stacked
          />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-1">歲入</h2>
        <p className="text-sm text-gray-600 mb-4">
          城市的錢從哪裡來，包含稅課收入、補助與其他來源。
        </p>
        <SummaryTiles tiles={revenueTiles} tooltips={categoryTooltips} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <PieChart
            data={revenueByCategory}
            title={`${formatFiscalYear(revYears.currentYear)}歲入來源`}
            townColor={town.primaryColor}
          />
        </div>
      </section>
    </div>
  );
}
