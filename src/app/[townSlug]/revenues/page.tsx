import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  groupAndSum,
  toChartData,
  buildRevenueSummaryTiles,
  detectCurrentAndPreviousYear,
} from "@/lib/aggregator";
import { formatCurrency, formatFiscalYear } from "@/lib/format";
import SummaryTiles from "@/components/portal/SummaryTiles";
import PieChart from "@/components/portal/PieChart";
import BarChart from "@/components/portal/BarChart";
import BudgetTable from "@/components/portal/BudgetTable";
import ExportButton from "@/components/portal/ExportButton";

export default async function RevenuesPage({
  params,
}: {
  params: Promise<{ townSlug: string }>;
}) {
  const { townSlug } = await params;
  const town = await prisma.town.findUnique({ where: { slug: townSlug } });
  if (!town) return notFound();

  // Fetch tooltips
  const tooltipRows = await prisma.tooltip.findMany({
    where: { townId: town.id },
  });
  const categoryTooltips: Record<string, string> = {};
  const lineItemTooltips: Record<string, string> = {};
  for (const t of tooltipRows) {
    if (t.scope === "category") categoryTooltips[t.key] = t.text;
    else if (t.scope === "line-item") lineItemTooltips[t.key] = t.text;
  }

  const allRows = await prisma.budgetRow.findMany({
    where: { townId: town.id, dataCategory: "revenues" },
  });

  const { currentYear, previousYear, allYears } =
    detectCurrentAndPreviousYear(allRows);

  const current = allRows.filter(
    (r) => r.fiscalYear === currentYear && r.amountType === "budget"
  );
  const prev = previousYear
    ? allRows.filter(
        (r) =>
          r.fiscalYear === previousYear &&
          (r.amountType === "actual" || r.amountType === "budget")
      )
    : [];

  const hasPriorYear = previousYear !== null && prev.length > 0;
  const tiles = buildRevenueSummaryTiles(current, prev);
  const byCategory = toChartData(groupAndSum(current, "category1"));

  const years = allYears.length > 0 ? allYears : [currentYear];
  const categories = [...new Set(current.map((r) => r.category1 || "其他"))];
  const trendSeries = categories.slice(0, 8).map((cat) => ({
    label: cat,
    data: years.map((y) =>
      allRows
        .filter((r) => r.category1 === cat && r.fiscalYear === y)
        .reduce((s, r) => s + r.amount, 0)
    ),
  }));

  // Table grouped by category -> line item, showing the most recent 3 fiscal years.
  type TableRow = {
    id: string;
    cells: (string | number | null)[];
    isGroup?: boolean;
    isSubtotal?: boolean;
    depth?: number;
  };

  const tableYears = allYears.length > 0 ? allYears : [currentYear];

  const catTotalsByYear = new Map<string, Map<string, number>>();
  const lineTotalsByYear = new Map<string, Map<string, number>>();

  for (const year of tableYears) {
    const yearRows = allRows.filter(
      (r) =>
        r.fiscalYear === year &&
        (year === currentYear
          ? r.amountType === "budget"
          : r.amountType === "budget" || r.amountType === "actual")
    );
    const catMap = new Map<string, number>();
    const lineMap = new Map<string, number>();
    for (const row of yearRows) {
      const cat = row.category1 || "其他";
      const lineKey = `${cat}|${row.lineItem || row.category2 || ""}`;
      catMap.set(cat, (catMap.get(cat) || 0) + row.amount);
      lineMap.set(lineKey, (lineMap.get(lineKey) || 0) + row.amount);
    }
    catTotalsByYear.set(year, catMap);
    lineTotalsByYear.set(year, lineMap);
  }

  const tableRows: TableRow[] = [];
  const catGroups = new Map<string, typeof current>();

  for (const row of current) {
    const cat = row.category1 || "其他";
    if (!catGroups.has(cat)) catGroups.set(cat, []);
    catGroups.get(cat)!.push(row);
  }

  for (const [cat, catRows] of catGroups) {
    tableRows.push({
      id: `cat-${cat}`,
      cells: [
        cat,
        ...tableYears.map((y) => catTotalsByYear.get(y)?.get(cat) || 0),
      ],
      isGroup: true,
    });

    for (const row of catRows) {
      const lineKey = `${cat}|${row.lineItem || row.category2 || ""}`;
      tableRows.push({
        id: row.id,
        cells: [
          row.lineItem || row.category2 || "",
          ...tableYears.map((y) => lineTotalsByYear.get(y)?.get(lineKey) || 0),
        ],
        depth: 1,
      });
    }
  }

  const exportData = current.map((r) => {
    const cat = r.category1 || "其他";
    const lineKey = `${cat}|${r.lineItem || r.category2 || ""}`;
    const yearCols: Record<string, string> = {};
    for (const y of tableYears) {
      yearCols[formatFiscalYear(y)] = formatCurrency(
        lineTotalsByYear.get(y)?.get(lineKey) || 0
      );
    }
    return {
      歲入來源: r.category1 || "",
      歲入性質: r.category2 || "",
      科目: r.lineItem || "",
      ...yearCols,
    };
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">歲入</h1>
          <p className="text-gray-600 mt-1">依來源與科目查看年度收入預算</p>
        </div>
        <ExportButton
          data={exportData}
          filename={`${town.slug}-revenues-fy${currentYear}`}
        />
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <p className="text-sm text-emerald-800 leading-relaxed">
          <strong>歲入是政府為提供公共服務而取得的收入。</strong>{" "}
          主要來源包括各項稅課、中央統籌分配與補助、規費及財產收入。
          本頁同時納入經常門與資本門
          {hasPriorYear
            ? "，並顯示與上年度預算的變化。"
            : "。"}
        </p>
      </div>

      <SummaryTiles tiles={tiles} tooltips={categoryTooltips} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PieChart
          data={byCategory}
          title={`${formatFiscalYear(currentYear)}歲入來源`}
          townColor={town.primaryColor}
        />
        <BarChart
          categories={years.map(formatFiscalYear)}
          series={trendSeries}
          title="歲入來源年度比較"
          stacked
        />
      </div>

      <BudgetTable
        headers={["歲入來源／科目"]}
        rows={tableRows}
        categoryTooltips={categoryTooltips}
        lineItemTooltips={lineItemTooltips}
        yearColumns={{ years: tableYears }}
      />
    </div>
  );
}
