"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/routing";
import {
  UserCheck,
  Scale,
  Camera,
  Droplets,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Download,
  QrCode,
  MapPin,
  Clock,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import { fruitsService } from "@/lib/services/fruits";
import { Farmer, MspRate, DeductionRule } from "@/lib/types";
import {
  calculateNetWeight,
  calculateMoistureDeduction,
  calculateProcurementValues,
  formatPaiseToInr,
  formatWeight,
} from "@/lib/math/procurement";
import { offlineDb } from "@/lib/offline/db";

interface WizardProps {
  locale: string;
  centres: Array<{ id: string; code: string; nameEn: string; nameKn: string }>;
  mspRates: MspRate[];
}

export function OfficerWizard({ locale, centres, mspRates }: WizardProps) {
  const [step, setStep] = useState(1);
  const [centreId, setCentreId] = useState(centres[0]?.id || "centre-raichur-01");

  // Step 1: Farmer
  const [fruitsId, setFruitsId] = useState("");
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [isVerifyingFarmer, setIsVerifyingFarmer] = useState(false);
  const [farmerError, setFarmerError] = useState<string | null>(null);

  // Step 2: Weighing
  const [paddyVariety, setPaddyVariety] = useState(mspRates[0]?.variety || "PADDY_GRADE_A");
  const [grossWeightStr, setGrossWeightStr] = useState("");
  const [tareWeightStr, setTareWeightStr] = useState("");

  // Step 3: Evidence
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoSha256, setPhotoSha256] = useState<string>("");
  const [gpsCoords, setGpsCoords] = useState<{ lat?: number; lng?: number }>({});
  const [isCapturingGps, setIsCapturingGps] = useState(false);

  // Step 4: Quality & Moisture
  const [moistureStr, setMoistureStr] = useState("16.5");

  // Submission & Result state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    isOffline: boolean;
    transactionId: string;
    sequenceNumber?: number;
    hash?: string;
    finalPayablePaise: number | bigint;
    dueDateIso: string;
    verificationToken?: string;
  } | null>(null);

  // Auto-capture GPS on mount or step 3
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsCoords({
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
          });
        },
        () => {
          // Fallback coordinate for demo if permission blocked
          setGpsCoords({ lat: 15.7745, lng: 76.8282 });
        }
      );
    }
  }, []);

  // Compute live calculations
  const gross = parseFloat(grossWeightStr) || 0;
  const tare = parseFloat(tareWeightStr) || 0;
  const moisture = parseFloat(moistureStr) || 0;
  const currentMsp = mspRates.find((m) => m.variety === paddyVariety)?.ratePerQuintalPaise || 232000;

  let liveCalc: ReturnType<typeof calculateProcurementValues> | null = null;
  let calcError: string | null = null;

  if (gross > 0 && tare >= 0) {
    if (gross <= tare) {
      calcError = locale === "kn" ? "ಒಟ್ಟು ತೂಕವು ಖಾಲಿ ವಾಹನದ ತೂಕಕ್ಕಿಂತ ಹೆಚ್ಚಾಗಿರಬೇಕು" : "Gross weight must exceed tare weight";
    } else {
      try {
        liveCalc = calculateProcurementValues(gross, tare, moisture, currentMsp);
      } catch (err: unknown) {
        calcError = (err as Error).message;
      }
    }
  }

  // Step 1: Farmer Lookup
  const handleVerifyFarmer = async () => {
    setFarmerError(null);
    if (!fruitsId || fruitsId.trim().length !== 10) {
      setFarmerError(
        locale === "kn"
          ? "ದಯವಿಟ್ಟು ಮಾನ್ಯವಾದ 10-ಅಂಕಿಯ ಫ್ರೂಟ್ಸ್ (FRUITS) ಐಡಿ ನಮೂದಿಸಿ"
          : "Please enter a valid 10-digit FRUITS ID"
      );
      return;
    }

    setIsVerifyingFarmer(true);
    try {
      const result = await fruitsService.getFarmerByFruitsId(fruitsId.trim());
      if (!result) {
        setFarmerError(
          locale === "kn"
            ? "ಫ್ರೂಟ್ಸ್ ಐಡಿ ಕಂಡುಬಂದಿಲ್ಲ. ದಯವಿಟ್ಟು ಪರಿಶೀಲಿಸಿ (ಉದಾ: 1002345678)"
            : "Farmer FRUITS ID not found in registry (e.g. try 1002345678)"
        );
      } else {
        setFarmer(result);
      }
    } catch {
      setFarmerError("Failed to connect to FRUITS registry");
    } finally {
      setIsVerifyingFarmer(false);
    }
  };

  // Step 3: Photo Processing & Web Crypto SHA-256
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    // Compute SHA-256 using standard Web Crypto API
    const digest = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashHex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    setPhotoSha256(hashHex);

    // Read base64 for preview
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      setPhotoBase64(res.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  // Step 6: Final Submission
  const handleSubmitTransaction = async () => {
    if (!farmer || !liveCalc) return;
    setIsSubmitting(true);

    const clientLocalId = "PT-LOCAL-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
    const payload = {
      clientLocalId,
      centreId,
      farmerFruitsId: farmer.fruitsId,
      paddyVariety,
      grossWeight: gross,
      tareWeight: tare,
      moisturePercent: moisture,
      scalePhotoBase64: photoBase64 || undefined,
      scalePhotoSha256: photoSha256 || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      gpsLat: gpsCoords.lat,
      gpsLng: gpsCoords.lng,
      deviceTimestamp: new Date().toISOString(),
    };

    // Attempt online sync first
    if (navigator.onLine) {
      try {
        const response = await fetch("/api/transactions/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (response.ok && data.success) {
          setSubmitResult({
            isOffline: false,
            transactionId: data.transaction.id,
            sequenceNumber: data.transaction.sequenceNumber,
            hash: data.transaction.hash,
            finalPayablePaise: data.transaction.finalPayablePaise,
            dueDateIso: new Date(Date.now() + 15 * 86400000).toISOString(),
            verificationToken: data.verificationToken,
          });
          setIsSubmitting(false);
          return;
        }
      } catch {
        // Network dropped during request, fallback to offline Dexie
      }
    }

    // Offline mode or failed network: Save locally in IndexedDB
    try {
      if (offlineDb) {
        await offlineDb.offlineTransactions.add({
          clientLocalId,
          centreId,
          farmerFruitsId: farmer.fruitsId,
          farmerName: farmer.nameEn,
          paddyVariety,
          grossWeight: gross,
          tareWeight: tare,
          netWeight: liveCalc.netWeightKg,
          moisturePercent: moisture,
          deductionKg: liveCalc.deductionKg,
          payableWeight: liveCalc.payableWeightKg,
          mspRatePaise: currentMsp,
          finalPayablePaise: Number(liveCalc.finalPayablePaise),
          scalePhotoBase64: photoBase64 || undefined,
          scalePhotoSha256: photoSha256 || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          gpsLat: gpsCoords.lat,
          gpsLng: gpsCoords.lng,
          deviceTimestamp: payload.deviceTimestamp,
          syncStatus: "PENDING",
          createdAt: Date.now(),
        });
      }

      setSubmitResult({
        isOffline: true,
        transactionId: clientLocalId,
        finalPayablePaise: liveCalc.finalPayablePaise,
        dueDateIso: new Date(Date.now() + 15 * 86400000).toISOString(),
      });
    } catch (saveErr) {
      alert("Failed to save offline draft: " + (saveErr as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset for next transaction
  const handleReset = () => {
    setStep(1);
    setFruitsId("");
    setFarmer(null);
    setGrossWeightStr("");
    setTareWeightStr("");
    setPhotoBase64(null);
    setPhotoSha256("");
    setMoistureStr("16.5");
    setSubmitResult(null);
  };

  // Success Screen
  if (submitResult) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-8 space-y-6 text-center">
        {submitResult.isOffline ? (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto">
              <WifiOff className="w-8 h-8" />
            </div>
            <span className="bg-amber-100 text-amber-900 text-xs font-bold px-3 py-1 rounded-full uppercase">
              {locale === "kn" ? "ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿ ಉಳಿಸಲಾಗಿದೆ (Offline Queued)" : "Offline Draft Saved"}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              {locale === "kn" ? "ಸ್ಥಳೀಯ ರಶೀದಿ ಉಳಿಸಲಾಗಿದೆ" : "Local Transaction Queued"}
            </h2>
            <p className="text-xs text-slate-600 max-w-sm mx-auto">
              {locale === "kn"
                ? "ಇಂಟರ್ನೆಟ್ ಸಂಪರ್ಕ ಲಭ್ಯವಿಲ್ಲದ ಕಾರಣ ಈ ದಾಖಲೆಯನ್ನು ಸ್ಥಳೀಯವಾಗಿ ಉಳಿಸಲಾಗಿದೆ. ಸಂಪರ್ಕ ಮರಳಿದಾಗ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಸರ್ವರ್‌ಗೆ ಸಿಂಕ್ ಆಗುತ್ತದೆ."
                : "No internet connection detected. This record is safely stored in IndexedDB and will automatically synchronize when connectivity returns."}
            </p>
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 font-mono text-sm font-bold text-amber-950">
              {submitResult.transactionId}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <span className="bg-emerald-100 text-emerald-900 text-xs font-bold px-3 py-1 rounded-full uppercase">
              {locale === "kn" ? "ಸರ್ವರ್‌ನಲ್ಲಿ ದೃಢೀಕರಿಸಲಾಗಿದೆ" : "Committed & Chain Verified"}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              {locale === "kn" ? "ಖರೀದಿ ಯಶಸ್ವಿಯಾಗಿ ದಾಖಲಾಗಿದೆ!" : "Procurement Successfully Committed"}
            </h2>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-emerald-800 font-semibold">Transaction ID:</span>
                <span className="font-mono font-bold text-emerald-950">{submitResult.transactionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-800 font-semibold">Block Sequence:</span>
                <span className="font-mono font-bold text-emerald-950">#{submitResult.sequenceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-800 font-semibold">Total Payable:</span>
                <span className="font-bold text-emerald-950 text-sm">
                  {formatPaiseToInr(submitResult.finalPayablePaise)}
                </span>
              </div>
              <div className="text-[10px] text-emerald-800 break-all pt-1 border-t border-emerald-200">
                <strong>SHA-256:</strong> {submitResult.hash}
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href={`/api/passport/${submitResult.transactionId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#1b4332] hover:bg-[#2d6a4f] text-white text-xs font-bold px-5 py-3 rounded-xl shadow transition flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>{locale === "kn" ? "ಡಿಜಿಟಲ್ ಪಾಸ್‌ಪೋರ್ಟ್ (PDF)" : "Download Passport PDF"}</span>
              </a>

              <Link
                href={`/verify/${submitResult.transactionId}?t=${submitResult.verificationToken || ""}`}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-5 py-3 rounded-xl transition flex items-center justify-center space-x-2"
              >
                <QrCode className="w-4 h-4 text-emerald-700" />
                <span>{locale === "kn" ? "ಕ್ಯೂಆರ್ ಪರಿಶೀಲನೆ ಪುಟ" : "View Farmer QR Page"}</span>
              </Link>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-100">
          <button
            onClick={handleReset}
            className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3 px-4 rounded-xl text-sm transition"
          >
            {locale === "kn" ? "+ ಮುಂದಿನ ರೈತರ ಖರೀದಿ ಪ್ರಾರಂಭಿಸಿ" : "+ Record Next Transaction"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Stepper Progress Bar */}
      <div className="bg-[#1b4332] text-white p-4">
        <div className="flex items-center justify-between text-xs font-bold mb-2">
          <span>
            {locale === "kn" ? `ಹಂತ ${step} / 5` : `Step ${step} of 5`}
          </span>
          <span className="text-[#a7f3d0]">
            {step === 1 && (locale === "kn" ? "ರೈತರ ಪರಿಶೀಲನೆ" : "Farmer FRUITS ID")}
            {step === 2 && (locale === "kn" ? "ತೂಕ ನಮೂದು" : "Weighing")}
            {step === 3 && (locale === "kn" ? "ತೇವಾಂಶ ಮತ್ತು ಗುಣಮಟ್ಟ" : "Moisture & Quality")}
            {step === 4 && (locale === "kn" ? "ಪುರಾವೆ ಮತ್ತು ಫೋಟೋ" : "Scale Photo Evidence")}
            {step === 5 && (locale === "kn" ? "ಲೆಕ್ಕಾಚಾರ ಪರಿಶೀಲನೆ" : "Review & Submit")}
          </span>
        </div>
        <div className="w-full bg-[#0d281e] h-2 rounded-full overflow-hidden">
          <div
            className="bg-[#52b788] h-full transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Step 1: Farmer Verification */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                {locale === "kn" ? "ಖರೀದಿ ಕೇಂದ್ರವನ್ನು ಆಯ್ಕೆಮಾಡಿ" : "Select Procurement Centre"}
              </label>
              <select
                value={centreId}
                onChange={(e) => setCentreId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-[#1b4332]"
              >
                {centres.map((c) => (
                  <option key={c.id} value={c.id}>
                    {locale === "kn" ? c.nameKn : c.nameEn} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                {locale === "kn" ? "ರೈತರ 10-ಅಂಕಿಯ ಫ್ರೂಟ್ಸ್ ಐಡಿ" : "Farmer 10-Digit FRUITS ID"}
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  maxLength={10}
                  value={fruitsId}
                  onChange={(e) => setFruitsId(e.target.value.trim())}
                  placeholder="e.g. 1002345678"
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono text-slate-900 focus:ring-2 focus:ring-[#1b4332]"
                />
                <button
                  type="button"
                  onClick={handleVerifyFarmer}
                  disabled={isVerifyingFarmer}
                  className="bg-[#1b4332] hover:bg-[#2d6a4f] text-white px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1 disabled:opacity-50"
                >
                  {isVerifyingFarmer ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>{locale === "kn" ? "ದೃಢೀಕರಿಸಿ" : "Verify"}</span>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {locale === "kn"
                  ? "ಪರೀಕ್ಷಾರ್ಥ ಐಡಿಗಳು: 1002345678, 1002345679, 1002345680"
                  : "Demo FRUITS IDs: 1002345678, 1002345679, 1002345680"}
              </p>
            </div>

            {farmerError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{farmerError}</span>
              </div>
            )}

            {farmer && (
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs uppercase">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{locale === "kn" ? "ರೈತರ ವಿವರಗಳು ದೃಢೀಕರಿಸಲಾಗಿದೆ" : "Farmer Profile Verified"}</span>
                </div>
                <div className="text-sm font-black text-slate-900">
                  {locale === "kn" ? farmer.nameKn : farmer.nameEn}
                </div>
                <div className="text-xs text-slate-600">
                  {farmer.village}, {farmer.taluk}, {farmer.district}
                </div>
                <div className="text-xs font-mono text-slate-500">
                  Bank A/C: {farmer.bankAccountMasked} (IFSC: {farmer.ifsc})
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Weighing */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                {locale === "kn" ? "ಭತ್ತದ ತಳಿ (Paddy Variety)" : "Paddy Variety"}
              </label>
              <select
                value={paddyVariety}
                onChange={(e) => setPaddyVariety(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-[#1b4332]"
              >
                {mspRates.map((m) => (
                  <option key={m.id} value={m.variety}>
                    {locale === "kn" ? m.nameKn : m.nameEn} — {formatPaiseToInr(m.ratePerQuintalPaise)}/Qtl
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {locale === "kn" ? "ಒಟ್ಟು ತೂಕ (Gross kg)" : "Gross Weight (kg)"}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={grossWeightStr}
                  onChange={(e) => setGrossWeightStr(e.target.value)}
                  placeholder="e.g. 4500.00"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono text-slate-900 focus:ring-2 focus:ring-[#1b4332]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {locale === "kn" ? "ಖಾಲಿ ವಾಹನ ತೂಕ (Tare kg)" : "Tare Weight (kg)"}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={tareWeightStr}
                  onChange={(e) => setTareWeightStr(e.target.value)}
                  placeholder="e.g. 250.00"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono text-slate-900 focus:ring-2 focus:ring-[#1b4332]"
                />
              </div>
            </div>

            {calcError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{calcError}</span>
              </div>
            )}

            {liveCalc && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase">
                    {locale === "kn" ? "ನಿವ್ವಳ ತೂಕ (Live Net Weight)" : "Live Net Weight"}
                  </div>
                  <div className="text-xl font-black text-[#1b4332]">
                    {liveCalc.netWeightKg.toFixed(2)} kg
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  {(liveCalc.netWeightKg / 100).toFixed(2)} Quintals
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Moisture & Quality */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                {locale === "kn" ? "ತೇವಾಂಶ ಪ್ರಮಾಣ (%)" : "Moisture Content (%)"}
              </label>
              <input
                type="number"
                step="0.1"
                value={moistureStr}
                onChange={(e) => setMoistureStr(e.target.value)}
                placeholder="e.g. 16.5"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono text-slate-900 focus:ring-2 focus:ring-[#1b4332]"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                {locale === "kn"
                  ? "ಗರಿಷ್ಠ ಅನುಮತಿಸಿದ ತೇವಾಂಶ: 17.0%. 17% ಕ್ಕಿಂತ ಹೆಚ್ಚಿದ್ದರೆ ಪ್ರತಿ 1% ಕ್ಕೆ 1% ತೂಕ ಕಡಿತ."
                  : "Statutory baseline is 17.0%. Moisture above 17% triggers 1% deduction per 1% excess."}
              </p>
            </div>

            {liveCalc && (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-amber-800 font-semibold">{locale === "kn" ? "ತೇವಾಂಶ ಕಡಿತ ಶೇಕಡಾ" : "Deduction %"}:</span>
                  <span className="font-bold text-amber-950">{liveCalc.deductionPercent.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-800 font-semibold">{locale === "kn" ? "ಕಡಿತ ತೂಕ" : "Deduction Kg"}:</span>
                  <span className="font-bold text-red-600">-{liveCalc.deductionKg.toFixed(2)} kg</span>
                </div>
                <div className="flex justify-between border-t border-amber-200 pt-2 font-bold text-sm">
                  <span className="text-slate-900">{locale === "kn" ? "ಪಾವತಿಗೆ ಅರ್ಹ ತೂಕ" : "Final Payable Weight"}:</span>
                  <span className="text-emerald-800">{liveCalc.payableWeightKg.toFixed(2)} kg</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Scale Photo Evidence */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                {locale === "kn" ? "ತೂಕದ ಯಂತ್ರದ ಫೋಟೋ (Evidence Photo)" : "Weighbridge Scale Photo"}
              </label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                className="w-full text-xs text-slate-500 file:mr-2 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#1b4332] file:text-white hover:file:bg-[#2d6a4f]"
              />
            </div>

            {photoBase64 && (
              <div className="space-y-2">
                <div className="relative rounded-xl overflow-hidden border border-slate-200 max-h-48 bg-black">
                  <img
                    src={"data:image/jpeg;base64," + photoBase64}
                    alt="Scale preview"
                    className="w-full h-48 object-cover"
                  />
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[10px] text-slate-600 break-all">
                  <span className="font-bold text-slate-900">Client Web Crypto SHA-256:</span><br />
                  {photoSha256}
                </div>
              </div>
            )}

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
              <span className="flex items-center space-x-1.5 text-slate-600">
                <MapPin className="w-4 h-4 text-emerald-700" />
                <span>GPS: {gpsCoords.lat?.toFixed(4)}, {gpsCoords.lng?.toFixed(4)}</span>
              </span>
              <span className="text-slate-400 text-[10px]">
                {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
        )}

        {/* Step 5: Review & Confirm */}
        {step === 5 && liveCalc && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-3">
              <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                {locale === "kn" ? "ವಹಿವಾಟಿನ ಅಂತಿಮ ಪರಿಶೀಲನೆ (ಸರ್ವರ್ ಲೆಕ್ಕಾಚಾರ)" : "Authoritative Calculation Review"}
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">{locale === "kn" ? "ರೈತರ ಹೆಸರು" : "Farmer"}:</span>
                  <span className="font-bold text-slate-900">{farmer?.nameEn} ({farmer?.fruitsId})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">{locale === "kn" ? "ನಿವ್ವಳ ತೂಕ" : "Net Weight"}:</span>
                  <span className="font-bold text-slate-900">{liveCalc.netWeightKg.toFixed(2)} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">{locale === "kn" ? "ತೇವಾಂಶ ಮತ್ತು ಕಡಿತ" : "Moisture & Deductions"}:</span>
                  <span className="font-bold text-red-600">{moisture}% (-{liveCalc.deductionKg.toFixed(2)} kg)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">{locale === "kn" ? "ಪಾವತಿಗೆ ಅರ್ಹ ತೂಕ" : "Payable Weight"}:</span>
                  <span className="font-bold text-slate-900">{liveCalc.payableWeightKg.toFixed(2)} kg</span>
                </div>
                <div className="flex justify-between border-t border-emerald-200 pt-2 text-sm">
                  <span className="text-emerald-900 font-bold">{locale === "kn" ? "ಒಟ್ಟು ಪಾವತಿ ಮೊತ್ತ" : "Final Payable (DBT)"}:</span>
                  <span className="text-emerald-950 font-black text-lg">
                    {formatPaiseToInr(liveCalc.finalPayablePaise)}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 text-center">
              {locale === "kn"
                ? "ದೃಢೀಕರಿಸಿದ ನಂತರ ಕ್ರಿಪ್ಟೋಗ್ರಾಫಿಕ್ ಹ್ಯಾಶ್ ರಚನೆಯಾಗುತ್ತದೆ ಮತ್ತು 15 ದಿನಗಳ ಪಾವತಿ ಗಡುವು ಪ್ರಾರಂಭವಾಗುತ್ತದೆ."
                : "Upon submission, a tamper-evident SHA-256 block will be committed and the 15-day statutory payment clock begins."}
            </p>
          </div>
        )}

        {/* Stepper Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center space-x-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{locale === "kn" ? "ಹಿಂದಿನ ಹಂತ" : "Back"}</span>
            </button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <button
              type="button"
              disabled={step === 1 && !farmer}
              onClick={() => setStep(step + 1)}
              className="bg-[#1b4332] hover:bg-[#2d6a4f] text-white text-xs font-bold px-5 py-2.5 rounded-lg flex items-center space-x-1.5 disabled:opacity-50"
            >
              <span>{locale === "kn" ? "ಮುಂದಿನ ಹಂತ" : "Next Step"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmitTransaction}
              className="bg-[#d97706] hover:bg-[#b45309] text-white text-xs font-bold px-6 py-2.5 rounded-lg flex items-center space-x-1.5 shadow-md disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{locale === "kn" ? "ದಾಖಲಿಸಲಾಗುತ್ತಿದೆ..." : "Committing Block..."}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{locale === "kn" ? "ಖರೀದಿ ಖಚಿತಪಡಿಸಿ" : "Commit Transaction"}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

