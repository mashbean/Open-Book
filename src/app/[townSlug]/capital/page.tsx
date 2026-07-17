import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { groupAndSum, toChartData } from "@/lib/aggregator";
import { formatCurrency, abbreviateCurrency, formatFiscalYear } from "@/lib/format";
import SummaryTiles from "@/components/portal/SummaryTiles";
import PieChart from "@/components/portal/PieChart";
import BudgetTable from "@/components/portal/BudgetTable";
import ExportButton from "@/components/portal/ExportButton";

export default async function CapitalPage({
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
    where: { townId: town.id, dataCategory: "capital" },
  });

  const years = [...new Set(allRows.map((r) => r.fiscalYear))].sort().reverse();
  const latestYear = years[0] || "2026";
  const latestRows = allRows.filter((r) => r.fiscalYear === latestYear);

  const totalAll = allRows.reduce((s, r) => s + r.amount, 0);
  const totalLatest = latestRows.reduce((s, r) => s + r.amount, 0);

  const byDept = groupAndSum(latestRows, "department");
  const topDept = Object.entries(byDept).sort((a, b) => b[1] - a[1])[0];

  const bySource = groupAndSum(latestRows, "fundingSource");
  const topSource = Object.entries(bySource).sort((a, b) => b[1] - a[1])[0];

  const tiles = [
    { label: `${formatFiscalYear(latestYear)}資本門`, value: abbreviateCurrency(totalLatest) },
    { label: "已收錄年度合計", value: abbreviateCurrency(totalAll) },
    { label: "最大主管機關", value: topDept ? topDept[0] : "無資料" },
    { label: "資料來源", value: topSource ? topSource[0] : "無資料" },
  ];

  const deptChart = toChartData(byDept);

  // Table by fiscal year
  type TableRow = {
    id: string;
    cells: (string | number | null)[];
    isGroup?: boolean;
    isSubtotal?: boolean;
  };

  const tableRows: TableRow[] = [];
  for (const year of years) {
    const yearRows = allRows.filter((r) => r.fiscalYear === year);
    const yearTotal = yearRows.reduce((s, r) => s + r.amount, 0);
    tableRows.push({
      id: `year-${year}`,
      cells: [formatFiscalYear(year), "", yearTotal, ""],
      isGroup: true,
    });
    for (const row of yearRows) {
      tableRows.push({
        id: row.id,
        cells: [
          row.department || "",
          row.purpose || "",
          row.amount,
          row.fundingSource || "",
        ],
      });
    }
  }

  const exportData = allRows.map((r) => ({
    年度: r.fiscalYear,
    主管機關: r.department || "",
    資料層級: r.purpose || "",
    金額: formatCurrency(r.amount),
    資料來源: r.fundingSource || "",
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            資本門
          </h1>
          <p className="text-gray-600 mt-1">依主管機關查看形成資產或長期效益的預算</p>
        </div>
        <ExportButton data={exportData} filename={`${town.slug}-capital`} />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800 leading-relaxed">
          <strong>資本門通常用於公共工程、土地、設備與其他可形成資產的支出。</strong>{" "}
          目前開放資料只到主管機關彙總，沒有每一項工程或採購案名稱。
          因此本頁忠實標示資料層級，不把機關合計誤寫成個別專案。
        </p>
      </div>

      <SummaryTiles tiles={tiles} tooltips={categoryTooltips} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PieChart
          data={deptChart}
          title={`${formatFiscalYear(latestYear)}資本門主管機關分布`}
          townColor={town.primaryColor}
        />
      </div>

      <BudgetTable
        headers={["主管機關", "資料層級", "金額", "資料來源"]}
        rows={tableRows}
        categoryTooltips={categoryTooltips}
        lineItemTooltips={lineItemTooltips}
      />
    </div>
  );
}
