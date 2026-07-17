"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface PortalHeaderProps {
  townName: string;
  townSlug: string;
  primaryColor: string;
  logoUrl?: string | null;
}

const NAV_ITEMS = [
  { label: "總覽", path: "" },
  { label: "歲出", path: "/expenses" },
  { label: "歲入", path: "/revenues" },
  { label: "資本門", path: "/capital" },
  { label: "資料來源", path: "/documents" },
  { label: "預算書", path: "/budget-book" },
  { label: "常見問題", path: "/faq" },
];

export default function PortalHeader({
  townName,
  townSlug,
  primaryColor,
  logoUrl,
}: PortalHeaderProps) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    const fullPath = `/${townSlug}${path}`;
    if (path === "") return pathname === `/${townSlug}`;
    return pathname.startsWith(fullPath);
  };

  return (
    <header
      className="text-white sticky top-0 z-40"
      style={{ backgroundColor: primaryColor }}
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <Link
            href={`/${townSlug}`}
            className="flex items-center gap-2.5 font-display font-semibold text-lg shrink-0"
            aria-label={`${townName} OpenBook 首頁`}
          >
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- Logos can be local uploads or arbitrary municipal URLs.
              <img
                src={logoUrl}
                alt={`${townName} logo`}
                className="h-7 w-7 rounded object-contain bg-white/10"
              />
            )}
            <span className="tracking-tight">{townName}</span>
            <span className="text-white/55 font-normal text-sm hidden sm:inline">開放預算</span>
          </Link>

          <nav
            className="hidden md:flex items-center gap-0.5"
            aria-label="主要導覽"
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                href={`/${townSlug}${item.path}`}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-100 ${
                  isActive(item.path)
                    ? "bg-white/20 text-white"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
                aria-current={isActive(item.path) ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <nav
        className="md:hidden border-t border-white/15 px-4 py-1.5 flex gap-0.5 overflow-x-auto"
        aria-label="主要導覽"
      >
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.label}
            href={`/${townSlug}${item.path}`}
            className={`px-2.5 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors duration-100 ${
              isActive(item.path)
                ? "bg-white/20 text-white"
                : "text-white/75 hover:text-white hover:bg-white/10"
            }`}
            aria-current={isActive(item.path) ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
