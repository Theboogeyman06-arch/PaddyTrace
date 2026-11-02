import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import {
  ShieldCheck,
  QrCode,
  Scale,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Building2,
  FileCheck2,
} from "lucide-react";
import { db } from "@/lib/db";
import { formatPaiseToInr, formatWeight, maskName } from "@/lib/math/procurement";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });

  const mspRates = await db.mspRates.findMany();
  const recentTransactions = await db.transactions.findMany();
  const displayTransactions = recentTransactions.slice(0, 4);

  return (
    <div className="space-y-10 py-4">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#1b4332] via-[#2d6a4f] to-[#1b4332] rounded-2xl text-white p-6 sm:p-10 shadow-xl border border-[#52b788]/30 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-[#52b788]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-3xl relative z-10 space-y-4">
          <div className="inline-flex items-center space-x-2 bg-[#52b788]/20 border border-[#74c69d]/40 px-3 py-1 rounded-full text-xs font-semibold text-[#a7f3d0]">
            <ShieldCheck className="w-4 h-4 text-[#74c69d]" />
            <span>{t("deptOfFoodAndCivilSupplies")}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
            {locale === "kn"
              ? "ಭತ್ತ ಖರೀದಿ ಪಾರದರ್ಶಕತೆ ಮತ್ತು ಡಿಜಿಟಲ್ ವಹಿವಾಟು ದಾಖಲೆ"
              : "Paddy Procurement Transparency & Digital Transaction Record System"}
          </h1>

          <p className="text-emerald-100 text-sm sm:text-base leading-relaxed">
            {locale === "kn"
              ? "ಪ್ರತಿಯೊಬ್ಬ ರೈತರೂ ತಾವು ಮಾರಾಟ ಮಾಡಿದ ಭತ್ತದ ತೂಕ, ತೇವಾಂಶ ಕಡಿತ, ನಿವ್ವಳ ಮೌಲ್ಯ ಮತ್ತು ಬ್ಯಾಂಕ್ ಪಾವತಿಯನ್ನು ನೇರವಾಗಿ ಪರಿಶೀಲಿಸಬಹುದಾದ ಅಧಿಕೃತ ವ್ಯವಸ್ಥೆ."
              : "Empowering Karnataka farmers with tamper-evident, audit-grade procurement transaction records, instant QR verification, and 15-day statutory payment tracking."}
          </p>

          <div className="pt-4 flex flex-wrap gap-3">
            <Link
              href="/officer/procure"
              className="bg-[#d97706] hover:bg-[#b45309] text-white font-bold px-6 py-3 rounded-xl shadow-lg transition flex items-center space-x-2 text-sm sm:text-base"
            >
              <Scale className="w-5 h-5" />
              <span>{locale === "kn" ? "ಅಧಿಕಾರಿಗಳ ಖರೀದಿ ವಿಝಾರ್ಡ್" : "Officer Weighing Wizard"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/admin"
              className="bg-[#0f2e22] hover:bg-[#164332] text-emerald-200 border border-[#52b788]/40 font-semibold px-5 py-3 rounded-xl transition flex items-center space-x-2 text-sm sm:text-base"
            >
              <Building2 className="w-5 h-5" />
              <span>{locale === "kn" ? "ಆಡಳಿತ ಮಂಡಳಿ / ಲೆಕ್ಕಪರಿಶೋಧನೆ" : "Admin & Chain Audit"}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Statutory MSP Rates Card */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 mb-6 gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1b4332]" />
              <span>{locale === "kn" ? "ಕರ್ನಾಟಕ ಸರ್ಕಾರ — ಕನಿಷ್ಠ ಬೆಂಬಲ ಬೆಲೆ (MSP 2025-26)" : "Statutory Minimum Support Price (MSP 2025-26)"}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {locale === "kn" ? "ಆಹಾರ ಮತ್ತು ನಾಗರಿಕ ಸರಬರಾಜು ಇಲಾಖೆಯಿಂದ ನಿಗದಿಪಡಿಸಲಾಗಿದೆ" : "Notified by Department of Food, Civil Supplies & Consumer Affairs"}
            </p>
          </div>
          <div className="text-xs font-semibold bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-200 self-start">
            {locale === "kn" ? "ಗರಿಷ್ಠ ಅನುಮತಿಸಿದ ತೇವಾಂಶ: 17.0%" : "Max Base Moisture: 17.0%"}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mspRates.map((rate) => (
            <div
              key={rate.id}
              className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:border-emerald-500 transition flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider bg-emerald-100/80 px-2 py-0.5 rounded">
                  {rate.variety}
                </span>
                <h3 className="font-bold text-slate-900 mt-2 text-base">
                  {locale === "kn" ? rate.nameKn : rate.nameEn}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  100 {locale === "kn" ? "ಕೆಜಿ (ಕ್ವಿಂಟಾಲ್)" : "kg (1 Quintal)"}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-[#1b4332]">
                  {formatPaiseToInr(rate.ratePerQuintalPaise)}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  ₹{(rate.ratePerQuintalPaise / 10000).toFixed(2)} / kg
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Core Principles Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-[#1b4332]">
            <QrCode className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900">
            {locale === "kn" ? "ಲಾಗಿನ್ ಇಲ್ಲದೆ ಕ್ಯೂಆರ್ ಪರಿಶೀಲನೆ" : "Zero-Barrier QR Verification"}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            {locale === "kn"
              ? "ರೈತರು ಯಾವುದೇ ಮೊಬೈಲ್ ಕ್ಯಾಮೆರಾದಿಂದ ರಶೀದಿಯ ಕ್ಯೂಆರ್ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ ತಕ್ಷಣವೇ ತೂಕ ಮತ್ತು ಹಣದ ಲೆಕ್ಕಾಚಾರವನ್ನು ಪರಿಶೀಲಿಸಬಹುದು."
              : "Farmers scan the printed receipt QR using any smartphone to independently verify weights, deductions, and payment without logging in."}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900">
            {locale === "kn" ? "15 ದಿನಗಳ ಶಾಸನಬದ್ಧ ಪಾವತಿ ಗಡುವು" : "15-Day Statutory SLA"}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            {locale === "kn"
              ? "ಖರೀದಿ ನಡೆದ 15 ದಿನಗಳಲ್ಲಿ ನೇರ ನಗದು ವರ್ಗಾವಣೆ (DBT) ಮೂಲಕ ಹಣ ಜಮಾ ಆಗದಿದ್ದರೆ ವ್ಯವಸ್ಥೆಯು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರಕ್ಕೆ ರವಾನಿಸುತ್ತದೆ."
              : "Automated countdown tracking. If DBT disbursement exceeds 15 days, transactions are automatically escalated to RSK staff."}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-800">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900">
            {locale === "kn" ? "ಕ್ರಿಪ್ಟೋಗ್ರಾಫಿಕ್ ಹ್ಯಾಶ್ ಸರಪಳಿ" : "Cryptographic Hash Chain"}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            {locale === "kn"
              ? "ಪ್ರತಿ ಖರೀದಿ ಕೇಂದ್ರದಲ್ಲೂ SHA-256 ಹ್ಯಾಶ್ ಲಿಂಕ್ ಆಗಿದ್ದು, ಯಾವುದೇ ಹಂತದಲ್ಲೂ ತೂಕ ಅಥವಾ ಬೆಂಬಲ ಬೆಲೆಯನ್ನು ತಿದ್ದಲು ಸಾಧ್ಯವಿಲ್ಲ."
              : "Immutable per-centre linear SHA-256 hash chains detect any unauthorized modification or retroactive data tampering."}
          </p>
        </div>
      </section>

      {/* Demo / Sample Procurement Verification Section */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {locale === "kn" ? "ಇತ್ತೀಚಿನ ಖರೀದಿ ವಹಿವಾಟುಗಳು (ದೃಢೀಕರಣ ಪರೀಕ್ಷೆ)" : "Recent Procurement Records (Live Verification)"}
            </h2>
            <p className="text-xs text-slate-500">
              {locale === "kn"
                ? "ಪಾರದರ್ಶಕತೆ ಪರಿಶೀಲನೆ ಪುಟವನ್ನು ವೀಕ್ಷಿಸಲು ಯಾವುದೇ ದಾಖಲೆಯನ್ನು ಕ್ಲಿಕ್ ಮಾಡಿ"
                : "Click any transaction to experience the public farmer verification view and PDF passport"}
            </p>
          </div>
          <Link
            href="/officer/procure"
            className="text-xs font-bold text-[#1b4332] hover:underline flex items-center space-x-1"
          >
            <span>{locale === "kn" ? "+ ಹೊಸ ಖರೀದಿ ದಾಖಲಿಸಿ" : "+ Record New Transaction"}</span>
          </Link>
        </div>

        {displayTransactions.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            <FileCheck2 className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              {locale === "kn" ? "ಇನ್ನೂ ಯಾವುದೇ ವಹಿವಾಟು ದಾಖಲಾಗಿಲ್ಲ" : "No procurement transactions recorded yet"}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {locale === "kn"
                ? "ಖರೀದಿ ಅಧಿಕಾರಿಯ ವಿಝಾರ್ಡ್ ಬಳಸಿ ಮೊದಲ ಭತ್ತದ ತೂಕ ದಾಖಲಿಸಿ"
                : "Use the Officer Weighing Wizard to record the first transaction"}
            </p>
            <Link
              href="/officer/procure"
              className="mt-4 inline-block bg-[#1b4332] text-white text-xs font-bold px-4 py-2 rounded-lg"
            >
              {locale === "kn" ? "ವಿಝಾರ್ಡ್ ಪ್ರಾರಂಭಿಸಿ" : "Start Wizard"}
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displayTransactions.map((tx) => (
              <div
                key={tx.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 p-2 rounded-lg transition"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-[#1b4332]">
                      {tx.id}
                    </span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                      Seq #{tx.sequenceNumber}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    <span className="font-medium text-slate-900">
                      {tx.farmer ? maskName(tx.farmer.nameEn) : "Farmer"}
                    </span>{" "}
                    • {tx.centre?.nameEn || "Sindhanur APMC"} • {formatWeight(tx.netWeight)}
                  </div>
                </div>

                <div className="flex items-center space-x-4 justify-between sm:justify-end">
                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-800">
                      {formatPaiseToInr(tx.finalPayablePaise)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {new Date(tx.createdAt).toLocaleDateString("en-IN")}
                    </div>
                  </div>

                  <Link
                    href={`/verify/${tx.id}`}
                    className="bg-[#2d6a4f] hover:bg-[#1b4332] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition flex items-center space-x-1"
                  >
                    <span>{locale === "kn" ? "ಪರಿಶೀಲಿಸಿ" : "Verify"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

