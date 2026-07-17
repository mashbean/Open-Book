export function formatCurrency(value: number): string {
  return `NT$${new Intl.NumberFormat("zh-TW", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)}`;
}

export function abbreviateCurrency(value: number): string {
  const abs = Math.abs(value);
  const compact = (amount: number, suffix: string) =>
    `${new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 1 }).format(amount)} ${suffix}`;
  if (abs >= 1_000_000_000_000) return compact(value / 1_000_000_000_000, "兆元");
  if (abs >= 100_000_000) return compact(value / 100_000_000, "億元");
  if (abs >= 10_000) return compact(value / 10_000, "萬元");
  return formatCurrency(value);
}

export function formatFiscalYear(year: string): string {
  return /^\d{2,3}$/.test(year) ? `${year} 年度` : `FY${year}`;
}

export function calculateChange(
  previous: number,
  current: number
): { absolute: number; percent: number } {
  const absolute = current - previous;
  const percent = previous !== 0 ? (absolute / previous) * 100 : 0;
  return { absolute, percent };
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function parseAmount(value: string): number {
  if (!value) return 0;
  const cleaned = value.toString().replace(/[$,\s()]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
