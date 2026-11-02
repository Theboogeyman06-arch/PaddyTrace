"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { ShieldCheck, Wifi, WifiOff, Globe, UserCheck, Layers, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { offlineDb } from "@/lib/offline/db";

export function Navbar() {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Poll pending offline queue count
    const interval = setInterval(async () => {
      try {
        if (offlineDb) {
          const count = await offlineDb.offlineTransactions
            .where("syncStatus")
            .equals("PENDING")
            .count();
          setPendingCount(count);
        }
      } catch {
        // Ignore
      }
    }, 3000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  const switchLocale = (newLocale: "kn" | "en") => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <header className="sticky top-0 z-50 bg-[#1b4332] text-white shadow-md border-b border-[#2d6a4f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Emblem */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="bg-[#2d6a4f] p-2 rounded-lg border border-[#52b788]/40 group-hover:bg-[#52b788]/20 transition">
              <ShieldCheck className="w-6 h-6 text-[#74c69d]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-wide text-white">PaddyTrace</span>
                <span className="bg-[#d97706] text-black text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
                  Karnataka
                </span>
              </div>
              <p className="text-[11px] text-[#74c69d] font-medium leading-none">
                {locale === "kn" ? "ಭತ್ತ ಖರೀದಿ ಪಾರದರ್ಶಕತೆ" : "Procurement Transparency"}
              </p>
            </div>
          </Link>

          {/* Quick Nav Links */}
          <nav className="hidden md:flex items-center space-x-1 text-sm font-medium">
            <Link
              href="/officer/procure"
              className="px-3 py-2 rounded-md hover:bg-[#2d6a4f] transition flex items-center space-x-1.5"
            >
              <UserCheck className="w-4 h-4 text-[#74c69d]" />
              <span>{t("newProcurement")}</span>
            </Link>
            <Link
              href="/admin"
              className="px-3 py-2 rounded-md hover:bg-[#2d6a4f] transition flex items-center space-x-1.5"
            >
              <Layers className="w-4 h-4 text-[#74c69d]" />
              <span>{t("dashboard")}</span>
            </Link>
          </nav>

          {/* Right Controls: Online Status & Language Switcher */}
          <div className="flex items-center space-x-3">
            {/* Offline / Online Pill */}
            <div
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                isOnline
                  ? "bg-[#2d6a4f] text-[#74c69d] border border-[#52b788]/30"
                  : "bg-red-900/60 text-red-200 border border-red-500/40"
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">{t("online")}</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-red-400" />
                  <span>{t("offlineMode")}</span>
                </>
              )}
              {pendingCount > 0 && (
                <span className="ml-1 bg-amber-500 text-black px-1.5 py-0.2 rounded-full font-bold text-[10px]">
                  {pendingCount}
                </span>
              )}
            </div>

            {/* Language Toggle */}
            <div className="flex items-center bg-[#0d281e] p-1 rounded-lg border border-[#2d6a4f]">
              <button
                onClick={() => switchLocale("kn")}
                className={`px-2.5 py-1 text-xs font-bold rounded transition ${
                  locale === "kn"
                    ? "bg-[#2d6a4f] text-white shadow-sm"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                ಕನ್ನಡ
              </button>
              <button
                onClick={() => switchLocale("en")}
                className={`px-2.5 py-1 text-xs font-bold rounded transition ${
                  locale === "en"
                    ? "bg-[#2d6a4f] text-white shadow-sm"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

