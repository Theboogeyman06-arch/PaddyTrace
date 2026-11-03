"use client";

import { useState } from "react";
import {
  QrCode,
  Scale,
  ShieldCheck,
  ShieldAlert,
  Flame,
  RotateCcw,
  Sparkles,
  Download,
  Copy,
  Check,
  Building,
  User,
  ArrowRight,
} from "lucide-react";
import { TamperEvidentQrCard } from "@/components/TamperEvidentQrCard";
import {
  calculateProcurementValues,
  formatPaiseToInr,
  formatWeight,
} from "@/lib/math/procurement";
import { computeTransactionHash, GENESIS_HASH } from "@/lib/crypto/hash-chain";
import { CanonicalTransactionPayload } from "@/lib/types";

export function InteractiveQrLab({ locale }: { locale: string }) {
  const [variety, setVariety] = useState<"PADDY_GRADE_A" | "PADDY_COMMON">("PADDY_GRADE_A");
  const [grossWeight, setGrossWeight] = useState(4500);
  const [tareWeight, setTareWeight] = useState(250);
  const [moisture, setMoisture] = useState(16.5);
  const [farmerFruitsId, setFarmerFruitsId] = useState("1002345678");
  const [farmerName, setFarmerName] = useState("Ramesh Patil");
  const [centreCode, setCentreCode] = useState("KA-RCH-01");

  const mspRate = variety === "PADDY_GRADE_A" ? 232000 : 230000;
  const calc = calculateProcurementValues(grossWeight, tareWeight, moisture, mspRate);
  const transactionId = "TX-DEMO-" + farmerFruitsId.slice(-4);

  // Compute canonical SHA-256 hash live
  const canonicalPayload: CanonicalTransactionPayload = {
    centreId: "centre-raichur-01",
    deductionAmountPaise: Number(calc.deductionAmountPaise),
    deductionKg: calc.deductionKg,
    farmerFruitsId,
    finalPayablePaise: Number(calc.finalPayablePaise),
    gpsLatitude: 15.7745,
    gpsLongitude: 76.8282,
    grossPayablePaise: Number(calc.grossPayablePaise),
    grossWeightKg: grossWeight,
    moisturePercentage: moisture,
    mspRatePerQuintalPaise: mspRate,
    netWeightKg: calc.netWeightKg,
    paddyVariety: variety,
    payableWeightKg: calc.payableWeightKg,
    previousHash: GENESIS_HASH,
    scalePhotoSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    sequenceNumber: 1,
    tareWeightKg: tareWeight,
    timestampIso: new Date().toISOString(),
    transactionId,
  };

  const currentSha256 = computeTransactionHash(canonicalPayload);

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-2">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-[#1b4332] via-[#2d6a4f] to-[#1b4332] rounded-2xl text-white p-6 sm:p-8 shadow-md border border-[#52b788]/30">
        <div className="inline-flex items-center space-x-2 bg-emerald-900/60 border border-emerald-400/40 px-3 py-1 rounded-full text-xs font-bold text-emerald-300 mb-3">
          <QrCode className="w-3.5 h-3.5 text-[#74c69d]" />
          <span>
            {locale === "kn"
              ? "ಕ್ರಿಪ್ಟೋಗ್ರಾಫಿಕ್ ಕ್ಯೂಆರ್ ಮತ್ತು ವಂಚನೆ ಪತ್ತೆ ಪ್ರಾಯೋಗಿಕ ವೇದಿಕೆ"
              : "Interactive Cryptographic QR & Tamper Detection Lab"}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug">
          {locale === "kn"
            ? "ವಿಶಿಷ್ಟ ಕ್ಯೂಆರ್ ಕೋಡ್ ಮತ್ತು SHA-256 ಹ್ಯಾಶ್ ಸೃಷ್ಟಿ ಸನ್ನಿವೇಶ"
            : "Tamper-Evident QR Generation & SHA-256 Verification Scenario"}
        </h1>
        <p className="text-emerald-100 text-xs sm:text-sm mt-2 max-w-2xl leading-relaxed">
          {locale === "kn"
            ? "ಭತ್ತದ ತೂಕ, ತೇವಾಂಶ ಮತ್ತು ಬೆಂಬಲ ಬೆಲೆಯನ್ನು ಬದಲಾಯಿಸಿದಂತೆ ವಿಶಿಷ್ಟ ಕ್ಯೂಆರ್ ಕೋಡ್ ಮತ್ತು SHA-256 ಹ್ಯಾಶ್ ನೈಜ ಸಮಯದಲ್ಲಿ ಹೇಗೆ ಬದಲಾಗುತ್ತದೆ ಹಾಗೂ ಯಾವುದೇ ವಂಚನೆಯನ್ನು ಹೇಗೆ ಪತ್ತೆ ಮಾಡುತ್ತದೆ ಎಂಬುದನ್ನು ಇಲ್ಲಿ ಪರೀಕ್ಷಿಸಿ."
            : "Test live how procurement parameters dynamically generate unique QR codes and 64-character SHA-256 hash signatures, and see how altering even 1 kg immediately triggers a tamper detection alert."}
        </p>
      </div>

      {/* Interactive Controls & Parameter Adjustments */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#1b4332]" />
          <span>{locale === "kn" ? "1. ಖರೀದಿ ನಿಯತಾಂಕಗಳನ್ನು ಬದಲಾಯಿಸಿ" : "1. Adjust Procurement Parameters Live"}</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              {locale === "kn" ? "ಭತ್ತದ ತಳಿ" : "Paddy Variety"}
            </label>
            <select
              value={variety}
              onChange={(e) => setVariety(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-[#1b4332]"
            >
              <option value="PADDY_GRADE_A">Grade A (₹2,320 / Qtl)</option>
              <option value="PADDY_COMMON">Common (₹2,300 / Qtl)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              {locale === "kn" ? "ಒಟ್ಟು ತೂಕ (Gross kg)" : "Gross Weight (kg)"}
            </label>
            <input
              type="number"
              step="10"
              value={grossWeight}
              onChange={(e) => setGrossWeight(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#1b4332]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              {locale === "kn" ? "ಖಾಲಿ ವಾಹನ (Tare kg)" : "Tare Weight (kg)"}
            </label>
            <input
              type="number"
              step="5"
              value={tareWeight}
              onChange={(e) => setTareWeight(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#1b4332]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              {locale === "kn" ? "ತೇವಾಂಶ ಪ್ರಮಾಣ (%)" : "Moisture Content (%)"}
            </label>
            <input
              type="number"
              step="0.1"
              value={moisture}
              onChange={(e) => setMoisture(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#1b4332]"
            />
            <span className="text-[10px] text-slate-500">
              {moisture > 17.0 ? `Excess: ${(moisture - 17.0).toFixed(1)}% deduction` : "Within 17.0% statutory threshold (0% deduction)"}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              {locale === "kn" ? "ರೈತರ ಫ್ರೂಟ್ಸ್ ಐಡಿ" : "Farmer FRUITS ID"}
            </label>
            <input
              type="text"
              maxLength={10}
              value={farmerFruitsId}
              onChange={(e) => setFarmerFruitsId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#1b4332]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              {locale === "kn" ? "ಖರೀದಿ ಕೇಂದ್ರದ ಕೋಡ್" : "Centre Code"}
            </label>
            <input
              type="text"
              value={centreCode}
              onChange={(e) => setCentreCode(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#1b4332]"
            />
          </div>
        </div>

        {/* Live Calculation Preview Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs">
          <div>
            <span className="text-emerald-800 font-semibold">{locale === "kn" ? "ನಿವ್ವಳ ತೂಕ" : "Net Weight"}:</span>
            <div className="text-sm font-black text-emerald-950 mt-0.5">{calc.netWeightKg.toFixed(2)} kg</div>
          </div>
          <div>
            <span className="text-emerald-800 font-semibold">{locale === "kn" ? "ತೇವಾಂಶ ಕಡಿತ" : "Moisture Deduction"}:</span>
            <div className="text-sm font-bold text-red-600 mt-0.5">-{calc.deductionKg.toFixed(2)} kg</div>
          </div>
          <div>
            <span className="text-emerald-800 font-semibold">{locale === "kn" ? "ಅರ್ಹ ತೂಕ" : "Payable Weight"}:</span>
            <div className="text-sm font-black text-emerald-950 mt-0.5">{calc.payableWeightKg.toFixed(2)} kg</div>
          </div>
          <div>
            <span className="text-emerald-800 font-semibold">{locale === "kn" ? "ಒಟ್ಟು ಪಾವತಿ" : "Payable (DBT)"}:</span>
            <div className="text-sm font-black text-[#1b4332] mt-0.5">{formatPaiseToInr(calc.finalPayablePaise)}</div>
          </div>
        </div>
      </div>

      {/* 2. Real-Time Generated Tamper-Evident QR Card */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#1b4332]" />
          <span>
            {locale === "kn"
              ? "2. ಸ್ವಯಂ ರಚಿತ ವಿಶಿಷ್ಟ ಕ್ಯೂಆರ್ ಕೋಡ್ ಮತ್ತು SHA-256 ಹ್ಯಾಶ್"
              : "2. Dynamically Generated Tamper-Evident QR Code & SHA-256 Hash"}
          </span>
        </h2>

        <TamperEvidentQrCard
          locale={locale}
          transactionId={transactionId}
          farmerFruitsId={farmerFruitsId}
          farmerName={farmerName}
          centreCode={centreCode}
          sequenceNumber={1}
          netWeightKg={calc.netWeightKg}
          moisturePercent={moisture}
          finalPayablePaise={calc.finalPayablePaise}
          originalHash={currentSha256}
          previousHash={GENESIS_HASH}
        />
      </div>
    </div>
  );
}

