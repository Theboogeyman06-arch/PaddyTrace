import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { ArrowLeft, AlertCircle, FileCheck, ShieldAlert, MessageSquare } from "lucide-react";
import { db } from "@/lib/db";
import { formatPaiseToInr, formatWeight } from "@/lib/math/procurement";
import { DisputeForm } from "@/components/DisputeForm";

export default async function DisputePage({
  params,
}: {
  params: Promise<{ locale: string; transactionId: string }>;
}) {
  const { locale, transactionId } = await params;
  const t = await getTranslations({ locale, namespace: "dispute" });
  const tCommon = await getTranslations({ locale, namespace: "common" });

  let transaction = await db.transactions.findUnique({
    where: { id: transactionId },
  });

  if (!transaction) {
    const all = await db.transactions.findMany();
    transaction = all[0] || null;
  }

  if (!transaction) {
    notFound();
  }

  const allDisputes = await db.disputes.findMany();
  const existingDisputes = allDisputes.filter((d) => d.transactionId === transaction.id);

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      {/* Top Navigation Links */}
      <div className="flex items-center justify-between text-xs">
        <Link
          href={`/verify/${transaction.id}`}
          className="inline-flex items-center space-x-1.5 font-semibold text-[#1b4332] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{locale === "kn" ? "ವಹಿವಾಟು ಪರಿಶೀಲನೆಗೆ ಹಿಂತಿರುಗಿ" : "Back to Verification"}</span>
        </Link>
        <Link
          href="/grievances"
          className="text-slate-600 hover:text-slate-900 font-semibold hover:underline"
        >
          {locale === "kn" ? "ಎಲ್ಲಾ ಕುಂದುಕೊರತೆಗಳ ವೇದಿಕೆ →" : "Official Grievance Desk →"}
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">{t("title")}</h1>
            <p className="text-xs text-slate-500">
              {locale === "kn"
                ? "ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರ ಮತ್ತು ತಹಶೀಲ್ದಾರ್ ಕಚೇರಿಯಿಂದ ನೇರ ಪರಿಶೀಲನೆ"
                : "Reviewed directly by Raitha Samparka Kendra (RSK) and Tahsildar"}
            </p>
          </div>
        </div>

        {/* Transaction Summary Box */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-500">{locale === "kn" ? "ವಹಿವಾಟು ಐಡಿ" : "Transaction ID"}:</span>
            <span className="font-mono font-bold text-slate-900">{transaction.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">{tCommon("centre")}:</span>
            <span className="font-semibold text-slate-900">{transaction.centre?.nameEn}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">{locale === "kn" ? "ಸ್ವೀಕರಿಸಿದ ತೂಕ" : "Net Weight"}:</span>
            <span className="font-semibold text-slate-900">{formatWeight(transaction.netWeight)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2">
            <span className="text-slate-700 font-bold">{locale === "kn" ? "ಅಂತಿಮ ಪಾವತಿ ಮೌಲ್ಯ" : "Total Value"}:</span>
            <span className="font-black text-emerald-800 text-sm">{formatPaiseToInr(transaction.finalPayablePaise)}</span>
          </div>
        </div>
      </div>

      {/* Existing Disputes list if any */}
      {existingDisputes.length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>{locale === "kn" ? "ಈಗಾಗಲೇ ಸಲ್ಲಿಸಲಾದ ದೂರುಗಳು" : "Existing Grievances for this Transaction"}</span>
          </h2>

          <div className="space-y-3">
            {existingDisputes.map((d) => (
              <div key={d.id} className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-amber-900">{d.disputeRef}</span>
                  <span className="bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded text-[10px]">
                    {d.status}
                  </span>
                </div>
                <div className="font-semibold text-slate-800">
                  {locale === "kn" ? "ವರ್ಗ" : "Category"}: {d.category}
                </div>
                <p className="text-slate-600">{d.description}</p>
                <div className="text-[10px] text-slate-400">
                  {new Date(d.createdAt).toLocaleString("en-IN")}
                </div>

                {d.comments && d.comments.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-amber-200 space-y-1">
                    <span className="font-bold text-slate-700 flex items-center space-x-1">
                      <MessageSquare className="w-3 h-3 text-slate-500" />
                      <span>{locale === "kn" ? "ಅಧಿಕಾರಿಗಳ ಟಿಪ್ಪಣಿಗಳು" : "Officer Comments"}:</span>
                    </span>
                    {d.comments.map((c) => (
                      <div key={c.id} className="bg-white p-2 rounded border border-slate-200 text-[11px]">
                        <span className="font-semibold text-slate-900">{c.authorName || "RSK Staff"}:</span> {c.comment}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dispute Submission Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <DisputeForm
          transactionId={transaction.id}
          farmerFruitsId={transaction.farmer?.fruitsId || "1002345678"}
          locale={locale}
        />
      </div>
    </div>
  );
}

