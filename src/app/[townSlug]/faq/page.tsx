import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function FaqPage({
  params,
}: {
  params: Promise<{ townSlug: string }>;
}) {
  const { townSlug } = await params;
  const town = await prisma.town.findUnique({ where: { slug: townSlug } });
  if (!town) return notFound();

  let faqs: { id: string; question: string; answer: string; sortOrder: number }[] = [];
  try {
    faqs = await prisma.faqEntry.findMany({
      where: { townId: town.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  } catch {
    // Table may not exist if migration hasn't been applied yet
  }

  const subject = encodeURIComponent(`關於${town.name}預算的問題`);
  const body = encodeURIComponent(
    `您好，\n\n我想詢問${town.name}預算資料\n\n[請在這裡填寫問題]\n\n謝謝`
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          常見問題
        </h1>
        <p className="text-gray-600 mt-1">
          說明{town.name}預算資料的定義、範圍與限制。
        </p>
      </div>

      {faqs.length > 0 ? (
        <div className="space-y-2">
          {faqs.map((faq) => (
            <details
              key={faq.id}
              className="group bg-white border border-gray-200 rounded-lg open:shadow-sm"
            >
              <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-3 text-sm font-medium text-gray-900">
                <span>{faq.question}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4 text-gray-400 shrink-0 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </summary>
              <div className="px-4 pb-4 -mt-1 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-sm text-gray-600">
            目前尚未發布常見問題。
          </p>
        </div>
      )}

      {town.contactEmail && (
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-5">
          <p className="text-sm text-blue-900 leading-relaxed mb-3">
            <strong>還有其他問題嗎？</strong> 可直接聯絡{town.name}財政或主計單位。
          </p>
          <a
            href={`mailto:${town.contactEmail}?subject=${subject}&body=${body}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
              aria-hidden="true"
            >
              <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
              <path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
            </svg>
            寄信至 {town.contactEmail}
          </a>
        </div>
      )}
    </div>
  );
}
