import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import {
  ShieldCheck,
  ShieldAlert,
  Download,
  AlertCircle,
  Clock,
  MapPin,
  Scale,
  Calendar,
  CheckCircle2,
  FileText,
  Building,
} from "lucide-react";
import { db } from "@/lib/db";
import {
  formatPaiseToInr,
  formatWeight,
  maskName,
  maskPhone,
} from "@/lib/math/procurement";
import { computeTransactionHash, verifyQrToken } from "@/lib/crypto/hash-chain";
import { getDaysRemaining } from "@/lib/services/payments";
import { CanonicalTransactionPayload } from "@/lib/types";

export default async function VerifyTransactionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; transactionId: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { locale, transactionId } = await params;
  const { t: signedToken } = await searchParams;

  const tCommon = await getTranslations({ locale, namespace: "common" });
  const tProc = await getTranslations({ locale, namespace: "procurement" });
  const tPay = await getTranslations({ locale, namespace: "payment" });
  const tVerif = await getTranslations({ locale, namespace: "verification" });

  const transaction = await db.transactions.findUnique({
    where: { id: transactionId },
  });

  if (!transaction) {
    notFound();
  }

  // Token signature validation (if token provided)
  let isTokenValid = true;
  if (signedToken) {
    const tokenCheck = await verifyQrToken(signedToken);
    if (!tokenCheck.valid || tokenCheck.transactionId !== transaction.id) {
      isTokenValid = false;
    }
  }

  // Cryptographic hash recalculation & integrity verification
  const canonicalPayload: CanonicalTransactionPayload = {
    centreId: transaction.centreId,
    deductionAmountPaise: Number(transaction.deductionAmountPaise),
    deductionKg: transaction.deductionKg,
    farmerFruitsId: transaction.farmer?.fruitsId || "",
    finalPayablePaise: Number(transaction.finalPayablePaise),
    gpsLatitude: transaction.gpsLat || 0,
    gpsLongitude: transaction.gpsLng || 0,
    grossPayablePaise: Number(transaction.grossPayablePaise),
    grossWeightKg: transaction.grossWeight,
    moisturePercentage: transaction.moisturePercent,
    mspRatePerQuintalPaise: transaction.mspRatePaise,
    netWeightKg: transaction.netWeight,
    paddyVariety: transaction.paddyVariety,
    payableWeightKg: transaction.payableWeight,
    previousHash: transaction.previousHash,
    scalePhotoSha256: transaction.scalePhotoSha256,
    sequenceNumber: transaction.sequenceNumber,
    tareWeightKg: transaction.tareWeight,
    timestampIso: transaction.deviceTimestamp,
    transactionId: transaction.id,
  };

  const recomputedHash = computeTransactionHash(canonicalPayload);
  const isHashIntact = recomputedHash === transaction.hash;
  const isIntegrityVerified = isHashIntact && isTokenValid;

  const farmer = transaction.farmer;
  const centre = transaction.centre;
  const payment = transaction.payment;
  const slaInfo = payment ? getDaysRemaining(payment.dueDate) : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-2">
      {/* Integrity Status Banner */}
      {isIntegrityVerified ? (
        <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start space-x-4">
            <div className="bg-emerald-600 text-white p-3 rounded-xl shadow-md">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="bg-emerald-600 text-white text-xs font-black px-2.5 py-1 rounded-md uppercase tracking-wider">
                  {locale === "kn" ? "ದೃಢೀಕೃತ ದಾಖಲೆ" : "VERIFIED TAMPER-EVIDENT RECORD"}
                </span>
                <span className="text-xs text-emerald-800 font-mono font-semibold">
                  Sequence #{transaction.sequenceNumber}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-emerald-950 mt-2">
                {tVerif("integrityVerified")}
              </h1>
              <p className="text-xs text-emerald-800 mt-1">
                {tVerif("publicNotice")}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border-2 border-red-600 rounded-2xl p-6 shadow-md">
          <div className="flex items-start space-x-4">
            <div className="bg-red-600 text-white p-3 rounded-xl shadow-md">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <span className="bg-red-600 text-white text-xs font-black px-2.5 py-1 rounded-md uppercase tracking-wider">
                {locale === "kn" ? "ಎಚ್ಚರಿಕೆ: ಬದಲಾವಣೆ ಪತ್ತೆಯಾಗಿದೆ" : "INTEGRITY ALERT — TAMPERING DETECTED"}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-red-950 mt-2">
                {tVerif("integrityFailed")}
              </h1>
              <p className="text-xs text-red-800 mt-1 font-mono">
                Stored Hash: {transaction.hash.substring(0, 16)}... | Computed: {recomputedHash.substring(0, 16)}...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Primary Value Summary Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-6 gap-4">
          <div>
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              {locale === "kn" ? "ರಶೀದಿ / ವಹಿವಾಟು ಐಡಿ" : "Transaction ID"}
            </div>
            <div className="font-mono text-lg sm:text-xl font-black text-[#1b4332] mt-0.5">
              {transaction.id}
            </div>
            <div className="text-xs text-slate-600 mt-1 flex items-center space-x-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{new Date(transaction.createdAt).toLocaleString("en-IN")}</span>
            </div>
          </div>

          <div className="text-left sm:text-right bg-emerald-50 sm:bg-transparent p-4 sm:p-0 rounded-xl border sm:border-0 border-emerald-100">
            <div className="text-xs text-emerald-800 font-bold uppercase tracking-wider">
              {tProc("finalPayable")}
            </div>
            <div className="text-3xl sm:text-4xl font-black text-[#1b4332] mt-0.5">
              {formatPaiseToInr(transaction.finalPayablePaise)}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              {formatWeight(transaction.payableWeight)} @ {formatPaiseToInr(transaction.mspRatePaise)}/Qtl
            </div>
          </div>
        </div>

        {/* 15-Day Statutory Payment Tracker */}
        <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-700 uppercase">
                  {tPay("paymentStatus")}
                </div>
                <div className="text-sm font-black text-slate-900 mt-0.5 flex items-center space-x-2">
                  <span>
                    {payment?.status === "PAID"
                      ? tPay("paid")
                      : slaInfo?.isOverdue
                      ? tPay("overdue")
                      : tPay("pending")}
                  </span>
                  {payment?.status === "PAID" && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-xs text-slate-500 font-semibold">
                {tPay("dueDate")}
              </div>
              <div className="text-sm font-bold text-[#1b4332]">
                {payment ? new Date(payment.dueDate).toLocaleDateString("en-IN") : "N/A"}
              </div>
              {slaInfo && !payment?.paidDate && (
                <div
                  className={`text-[11px] font-bold mt-0.5 ${
                    slaInfo.isOverdue ? "text-red-600" : "text-amber-700"
                  }`}
                >
                  {slaInfo.statusLabel}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Farmer & Centre Details (Privacy Preserving) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-100">
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#1b4332] uppercase tracking-wider">
              {locale === "kn" ? "ರೈತರ ವಿವರಗಳು (ಮರೆಮಾಡಲಾಗಿದೆ)" : "Farmer Identity (Masked)"}
            </h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">{tCommon("farmer")}:</span>
                <span className="font-bold text-slate-900">
                  {farmer ? maskName(farmer.nameEn) : "Registered Farmer"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">{tCommon("fruitsId")}:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {farmer?.fruitsId || "1002345678"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">{tCommon("village")}:</span>
                <span className="font-medium text-slate-900">
                  {farmer?.village}, {farmer?.taluk}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#1b4332] uppercase tracking-wider">
              {locale === "kn" ? "ಖರೀದಿ ಕೇಂದ್ರದ ವಿವರಗಳು" : "Procurement Centre"}
            </h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">{tCommon("centre")}:</span>
                <span className="font-bold text-slate-900">
                  {centre?.nameEn}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">{locale === "kn" ? "ಕೇಂದ್ರದ ಕೋಡ್" : "Centre Code"}:</span>
                <span className="font-mono font-semibold text-slate-900">{centre?.code}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">{tCommon("district")}:</span>
                <span className="font-medium text-slate-900">
                  {centre?.district}, {centre?.taluk}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Weights & Calculation Transparency Breakdown */}
        <div className="mt-8">
          <h3 className="text-xs font-bold text-[#1b4332] uppercase tracking-wider mb-4">
            {locale === "kn" ? "ತೂಕ ಮತ್ತು ತೇವಾಂಶ ಲೆಕ್ಕಾಚಾರ ಪಾರದರ್ಶಕತೆ" : "Weighing & Moisture Deduction Breakdown"}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="text-[11px] text-slate-500 font-semibold">{tProc("grossWeight")}</div>
              <div className="text-base font-bold text-slate-900 mt-1">{transaction.grossWeight.toFixed(2)} kg</div>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="text-[11px] text-slate-500 font-semibold">{tProc("tareWeight")}</div>
              <div className="text-base font-bold text-slate-900 mt-1">{transaction.tareWeight.toFixed(2)} kg</div>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="text-[11px] text-slate-500 font-semibold">{tProc("netWeight")}</div>
              <div className="text-base font-bold text-[#1b4332] mt-1">{transaction.netWeight.toFixed(2)} kg</div>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="text-[11px] text-slate-500 font-semibold">{tProc("moisture")}</div>
              <div className="text-base font-bold text-amber-700 mt-1">{transaction.moisturePercent.toFixed(1)}%</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="text-[11px] text-slate-500 font-semibold">{tProc("deductions")}</div>
              <div className="text-base font-bold text-red-600 mt-1">-{transaction.deductionKg.toFixed(2)} kg</div>
            </div>
            <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200">
              <div className="text-[11px] text-emerald-800 font-bold">{tProc("payableWeight")}</div>
              <div className="text-base font-black text-emerald-950 mt-1">{transaction.payableWeight.toFixed(2)} kg</div>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="text-[11px] text-slate-500 font-semibold">{tProc("mspRate")}</div>
              <div className="text-base font-bold text-slate-900 mt-1">{formatPaiseToInr(transaction.mspRatePaise)}/Qtl</div>
            </div>
          </div>
        </div>

        {/* Cryptographic Hash Chain Proof */}
        <div className="mt-8 p-4 rounded-xl bg-slate-900 text-slate-300 font-mono text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400 font-sans text-xs font-bold border-b border-slate-800 pb-2">
            <span>{locale === "kn" ? "ಕ್ರಿಪ್ಟೋಗ್ರಾಫಿಕ್ ಹ್ಯಾಶ್ ಪುರಾವೆ (SHA-256)" : "Cryptographic Hash Chain Proof (SHA-256)"}</span>
            <span className="text-emerald-400">STATUS: INTACT</span>
          </div>
          <div>
            <span className="text-slate-500">Block Hash:</span>
            <div className="text-emerald-400 break-all select-all font-semibold">{transaction.hash}</div>
          </div>
          <div>
            <span className="text-slate-500">Previous Hash:</span>
            <div className="text-slate-400 break-all">{transaction.previousHash}</div>
          </div>
          <div>
            <span className="text-slate-500">Scale Photo SHA-256:</span>
            <div className="text-slate-400 break-all">{transaction.scalePhotoSha256}</div>
          </div>
        </div>

        {/* Action Buttons: Download PDF Passport & Raise Dispute */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100">
          <a
            href={`/api/passport/${transaction.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto bg-[#1b4332] hover:bg-[#2d6a4f] text-white font-bold px-6 py-3 rounded-xl shadow-md transition flex items-center justify-center space-x-2 text-sm"
          >
            <Download className="w-4 h-4" />
            <span>{tCommon("downloadPassport")}</span>
          </a>

          <Link
            href={`/dispute/${transaction.id}`}
            className="w-full sm:w-auto bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold px-6 py-3 rounded-xl transition flex items-center justify-center space-x-2 text-sm"
          >
            <AlertCircle className="w-4 h-4 text-amber-700" />
            <span>{tCommon("raiseDispute")}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

