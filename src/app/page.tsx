import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const towns = await prisma.town.findMany({
    where: { published: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-5 sm:py-7">
          <p className="text-xs font-display font-medium uppercase tracking-widest text-gray-500 mb-2">
            地方政府預算透明
          </p>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-gray-900">
            OpenBook
          </h1>
          <p className="text-gray-500 mt-1.5 text-lg max-w-xl leading-relaxed">
            把散落在政府資料平台的預算表，整理成居民看得懂、查得到、
            能回到原始資料核對的公共財政入口。
          </p>
        </div>
      </header>

      <main id="main-content" className="flex-1">
        <div className="max-w-3xl mx-auto w-full px-4 py-6">
        {towns.length === 0 ? (
          <div>
            <p className="text-gray-500 text-lg mb-6">目前尚未發布地方政府入口。</p>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <p className="text-sm font-display font-semibold text-gray-800 mb-3">
                開始使用
              </p>
              <ol className="text-sm text-gray-600 space-y-2.5 list-none">
                <li className="flex gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-display font-semibold flex items-center justify-center">1</span>
                  <span><Link href="/admin/register" className="underline font-medium text-gray-900">建立管理者帳號</Link></span>
                </li>
                <li className="flex gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-xs font-display font-semibold flex items-center justify-center">2</span>
                  <span>設定地方政府名稱、識別色與聯絡資訊</span>
                </li>
                <li className="flex gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-xs font-display font-semibold flex items-center justify-center">3</span>
                  <span>上傳 CSV 或 Excel 預算資料</span>
                </li>
                <li className="flex gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-xs font-display font-semibold flex items-center justify-center">4</span>
                  <span>發布居民可以使用的預算入口</span>
                </li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-sm font-display font-semibold uppercase tracking-wide text-gray-500">
              已發布的預算入口
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {towns.map((town) => (
                <Link
                  key={town.id}
                  href={`/${town.slug}`}
                  className="group block bg-white border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-all duration-150"
                >
                  <div className="flex items-center gap-3">
                    {town.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- Logos can be local uploads or arbitrary municipal URLs.
                      <img
                        src={town.logoUrl}
                        alt={`${town.name} logo`}
                        className="h-8 w-8 rounded object-contain"
                      />
                    ) : (
                      <div
                        className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-display font-bold"
                        style={{ backgroundColor: town.primaryColor }}
                      >
                        {town.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <span className="font-display font-semibold text-gray-900 group-hover:text-gray-700">
                        {town.name}
                      </span>
                      <p className="text-xs text-gray-500">查看預算資料</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        </div>

        <div className="max-w-5xl mx-auto w-full px-4 pb-6">
          <div className="pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 flex flex-col">
                <h3 className="text-sm font-display font-semibold text-blue-900 mb-2">
                  想了解政府怎麼用錢
                </h3>
                <p className="text-sm text-blue-800 leading-relaxed flex-1">
                  從歲出、歲入與資本門開始探索，搜尋主管機關與科目，
                  下載整理後的 CSV，並回到官方來源核對。
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col">
                <h3 className="text-sm font-display font-semibold text-gray-900 mb-2">
                  負責整理政府預算資料
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed flex-1">
                  上傳預算資料、設定入口識別、管理來源文件與白話說明。
                </p>
                <div className="flex flex-wrap gap-2 mt-2.5">
                  <Link
                    href="/admin/login"
                    className="inline-flex items-center px-3 py-1.5 bg-gray-900 text-white rounded-md text-xs font-display font-medium hover:bg-gray-800 transition-colors"
                  >
                    管理者登入
                  </Link>
                  <Link
                    href="/admin/register"
                    className="inline-flex items-center px-3 py-1.5 border border-gray-200 text-gray-600 rounded-md text-xs font-display font-medium hover:bg-gray-50 transition-colors"
                  >
                    建立管理者帳號
                  </Link>
                  <Link
                    href="/docs"
                    className="inline-flex items-center text-xs text-gray-500 hover:text-gray-700 transition-colors underline underline-offset-2"
                  >
                    設定指南
                  </Link>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col">
                <h3 className="text-sm font-display font-semibold text-gray-900 mb-2">
                  機關內部提案人員
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed flex-1">
                  提交資本支出需求並查看審核狀態。請向管理者索取入口代碼。
                </p>
                <div className="flex flex-wrap gap-2 mt-2.5">
                  <Link
                    href="/staff/login"
                    className="inline-flex items-center px-3 py-1.5 border border-gray-200 text-gray-600 rounded-md text-xs font-display font-medium hover:bg-gray-50 transition-colors"
                  >
                    人員登入
                  </Link>
                  <Link
                    href="/staff/register"
                    className="inline-flex items-center text-xs text-gray-500 hover:text-gray-700 transition-colors underline underline-offset-2"
                  >
                    建立人員帳號
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 py-4">
        <div className="max-w-3xl mx-auto px-4">
          <p className="text-xs text-gray-500">
            OpenBook 是地方政府預算透明的開源概念驗證。
          </p>
        </div>
      </footer>
    </div>
  );
}
