import type { DetectedMapping } from "@/types";

interface DetectionRule {
  patterns: RegExp[];
  priority: number;
}

const FIELD_RULES: Record<string, DetectionRule> = {
  department: {
    patterns: [/^dept$/i, /department/i, /division/i, /dept\s*code/i, /dept\s*name/i, /主管機關/, /機關名稱/, /局處/],
    priority: 1,
  },
  lineItem: {
    patterns: [/description/i, /line\s*item/i, /account\s*desc/i, /detail/i, /^name$/i, /^科目$/, /^名稱$/, /^項目$/],
    priority: 2,
  },
  objectCode: {
    patterns: [/object\s*code/i, /obj\s*code/i, /account\s*(number|#|no)/i, /^account$/i, /^款$/, /^項$/, /科目代碼/],
    priority: 3,
  },
  functionArea: {
    patterns: [/function/i, /func/i, /^program$/i, /歲出性質/, /政事別/],
    priority: 4,
  },
  fundCode: {
    patterns: [/fund\s*(code|#|no)/i, /^fund$/i],
    priority: 5,
  },
  fundName: {
    patterns: [/fund\s*name/i, /fund\s*desc/i],
    priority: 6,
  },
  category1: {
    patterns: [/rev.*cat.*1/i, /^category$/i, /^source$/i, /^type$/i, /revenue\s*type/i, /歲入來源/, /來源別/],
    priority: 7,
  },
  category2: {
    patterns: [/rev.*cat.*2/i, /sub.*cat/i, /歲入性質/],
    priority: 8,
  },
  purpose: {
    patterns: [/^purpose$/i, /^project$/i, /project\s*name/i, /^用途$/, /計畫名稱/],
    priority: 9,
  },
  fundingSource: {
    patterns: [/funding\s*source/i, /fund.*source/i, /資金來源/],
    priority: 10,
  },
  fiscalYear: {
    patterns: [/^fiscal\s*year$/i, /^fy$/i, /^year$/i, /^年度$/, /^統計期$/],
    priority: 11,
  },
  amount: {
    patterns: [/^amount$/i, /^金額$/, /預算金額/, /決算金額/],
    priority: 12,
  },
};

const FY_AMOUNT_PATTERN =
  /(?:fy\s*)?(\d{2,4})\s*(actual|budget|approp|request|recommended|adopted|estimate)/i;

const FY_ONLY_PATTERN = /^(?:fy\s*)?(\d{4})$/i;
const ROC_FY_AMOUNT_PATTERN = /(\d{2,3})\s*年度?\s*(預算|決算|實現)/;

function matchField(header: string): { field: string; confidence: number } | null {
  for (const [field, rule] of Object.entries(FIELD_RULES)) {
    for (const pattern of rule.patterns) {
      if (pattern.test(header)) {
        return { field, confidence: 0.9 };
      }
    }
  }
  return null;
}

function matchFYAmount(
  header: string
): { fiscalYear: string; amountType: string; confidence: number } | null {
  const match = header.match(FY_AMOUNT_PATTERN);
  if (match) {
    let year = match[1];
    if (year.length === 2) year = `20${year}`;
    const type = match[2].toLowerCase();
    const amountType =
      type === "actual" ? "actual" : type === "budget" || type === "approp" || type === "adopted" ? "budget" : type;
    return { fiscalYear: year, amountType, confidence: 0.95 };
  }

  const rocMatch = header.match(ROC_FY_AMOUNT_PATTERN);
  if (rocMatch) {
    return {
      fiscalYear: rocMatch[1],
      amountType: rocMatch[2] === "預算" ? "budget" : "actual",
      confidence: 0.95,
    };
  }

  const fyOnly = header.match(FY_ONLY_PATTERN);
  if (fyOnly) {
    return { fiscalYear: fyOnly[1], amountType: "budget", confidence: 0.5 };
  }

  return null;
}

export function detectColumns(headers: string[]): DetectedMapping[] {
  const mappings: DetectedMapping[] = [];
  const usedFields = new Set<string>();

  for (const header of headers) {
    // First check if it's a FY amount column
    const fyMatch = matchFYAmount(header);
    if (fyMatch) {
      mappings.push({
        sourceColumn: header,
        targetField: "fyAmount",
        confidence: fyMatch.confidence,
        fiscalYear: fyMatch.fiscalYear,
        amountType: fyMatch.amountType,
      });
      continue;
    }

    // Then check field patterns
    const fieldMatch = matchField(header);
    if (fieldMatch && !usedFields.has(fieldMatch.field)) {
      usedFields.add(fieldMatch.field);
      mappings.push({
        sourceColumn: header,
        targetField: fieldMatch.field,
        confidence: fieldMatch.confidence,
      });
      continue;
    }

    // Unmatched
    mappings.push({
      sourceColumn: header,
      targetField: "skip",
      confidence: 0,
    });
  }

  return mappings;
}

export const TARGET_FIELDS = [
  { value: "department", label: "主管機關" },
  { value: "lineItem", label: "科目／說明" },
  { value: "objectCode", label: "款項／科目代碼" },
  { value: "functionArea", label: "歲出性質／政事別" },
  { value: "fundCode", label: "基金代碼" },
  { value: "fundName", label: "基金名稱" },
  { value: "category1", label: "歲入來源" },
  { value: "category2", label: "歲入次分類" },
  { value: "purpose", label: "用途／計畫" },
  { value: "fundingSource", label: "資金來源" },
  { value: "fiscalYear", label: "年度" },
  { value: "amount", label: "金額" },
  { value: "fyAmount", label: "年度金額" },
  { value: "skip", label: "略過此欄" },
];
