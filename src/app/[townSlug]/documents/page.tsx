import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

const CATEGORY_LABELS: Record<string, string> = {
  budget: "預算原始資料",
  meeting: "會議紀錄",
  report: "統計與執行資料",
  press: "新聞資料",
  other: "其他資料",
};

const CATEGORY_ORDER = ["budget", "meeting", "report", "press", "other"];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ townSlug: string }>;
}) {
  const { townSlug } = await params;
  const town = await prisma.town.findUnique({ where: { slug: townSlug } });
  if (!town) return notFound();

  const [links, pdfs] = await Promise.all([
    prisma.supportingLink.findMany({
      where: { townId: town.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.pdfDocument.findMany({
      where: { townId: town.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const hasContent = links.length > 0 || pdfs.length > 0;

  // Group links and PDFs by category
  const linksByCategory: Record<string, typeof links> = {};
  for (const link of links) {
    const cat = link.category || "other";
    if (!linksByCategory[cat]) linksByCategory[cat] = [];
    linksByCategory[cat].push(link);
  }

  const pdfsByCategory: Record<string, typeof pdfs> = {};
  for (const pdf of pdfs) {
    const cat = pdf.category || "other";
    if (!pdfsByCategory[cat]) pdfsByCategory[cat] = [];
    pdfsByCategory[cat].push(pdf);
  }

  // Determine which categories have content
  const activeCategories = CATEGORY_ORDER.filter(
    (cat) =>
      (linksByCategory[cat] && linksByCategory[cat].length > 0) ||
      (pdfsByCategory[cat] && pdfsByCategory[cat].length > 0)
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          資料來源
        </h1>
        <p className="text-gray-600 mt-1">
          核對{town.name}預算數字的官方資料與說明
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800 leading-relaxed">
          <strong>每個數字都應該回得到原始資料。</strong>{" "}
          本頁集中列出網站使用的官方資料集。連結會在新分頁開啟，
          可用來核對資料欄位、發布機關、更新時間與授權條款。
          資料可回答到什麼程度，請見{" "}
          <a href={`/${townSlug}/faq`} className="underline font-medium">常見問題</a>。
        </p>
      </div>

      {!hasContent && (
        <div className="text-center py-16">
          <svg
            className="mx-auto h-12 w-12 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          <p className="mt-4 text-gray-600">目前尚未加入資料來源。</p>
          <p className="text-sm text-gray-500 mt-1">
            請稍後再回來查看預算文件與統計資料。
          </p>
        </div>
      )}

      {activeCategories.map((cat) => {
        const catLinks = linksByCategory[cat] || [];
        const catPdfs = pdfsByCategory[cat] || [];

        return (
          <section key={cat}>
            <h2 className="text-lg font-medium mb-4">
              {CATEGORY_LABELS[cat] || cat}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {catLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <svg
                      className="h-5 w-5 text-gray-400 mt-0.5 shrink-0 group-hover:text-blue-500 transition-colors"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.04a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.343 8.07"
                      />
                    </svg>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                        {link.title}
                      </p>
                      {link.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {link.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        {link.url}
                      </p>
                    </div>
                  </div>
                </a>
              ))}

              {catPdfs.map((pdf) => (
                <a
                  key={pdf.id}
                  href={pdf.filePath}
                  download={pdf.fileName}
                  className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <svg
                      className="h-5 w-5 text-red-400 mt-0.5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                      />
                    </svg>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                        {pdf.title || pdf.fileName}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PDF &middot; {formatFileSize(pdf.fileSize)}
                      </p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
