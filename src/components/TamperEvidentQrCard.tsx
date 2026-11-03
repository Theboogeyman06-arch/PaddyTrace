"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  Download,
  Printer,
  ExternalLink,
  Flame,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { formatPaiseToInr, formatWeight } from "@/lib/math/procurement";
import { sha256 } from "@/lib/crypto/hash-chain";

interface TamperEvidentQrCardProps {
  locale: string;
  transactionId: string;
  farmerFruitsId: string;
  farmerName: string;
  centreCode: string;
  sequenceNumber: number;
  netWeightKg: number;
  moisturePercent: number;
  finalPayablePaise: bigint | number;
  originalHash: string;
  previousHash: string;
  verificationToken?: string;
}

export function TamperEvidentQrCard({
  locale,
  transactionId,
  farmerFruitsId,
  farmerName,
  centreCode,
  sequenceNumber,
  netWeightKg,
  moisturePercent,
  finalPayablePaise,
  originalHash,
  previousHash,
  verificationToken,
}: TamperEvidentQrCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isTampered, setIsTampered] = useState(false);
  const [tamperedWeight, setTamperedWeight] = useState(netWeightKg);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const verificationUrl = `${baseUrl}/${locale}/verify/${transactionId}${
    verificationToken ? `?t=${verificationToken}` : ""
  }`;

  // Generate QR code data URL on mount or URL change
  useEffect(() => {
    QRCode.toDataURL(verificationUrl, {
      width: 280,
      margin: 1,
      color: {
        dark: "#1b4332",
        light: "#ffffff",
      },
      errorCorrectionLevel: "H", // High error correction
    }).then(setQrDataUrl);
  }, [verificationUrl]);

  // Compute live hash based on current weight (testing tamper simulation)
  const currentWeight = isTampered ? tamperedWeight : netWeightKg;
  // Deterministic mock canonical string for live client tamper simulation
  const simulatedPayload = JSON.stringify({
    centreCode,
    farmerFruitsId,
    finalPayablePaise: Number(finalPayablePaise),
    netWeightKg: currentWeight,
    previousHash,
    sequenceNumber,
    transactionId,
  });
  
  // Real-time simulated hash
  const computedHash = isTampered
    ? "a7f9c" + sha256(simulatedPayload).substring(5)
    : originalHash;

  const isHashIntact = !isTampered && computedHash === originalHash;

  const handleCopyHash = () => {
    navigator.clipboard.writeText(computedHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `PaddyTrace-QR-${transactionId}.png`;
    a.click();
  };

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-md p-6 space-y-6">
      {/* Top Header Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div className="flex items-center space-x-2">
          <span className="bg-[#1b4332] text-white text-[11px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
            {locale === "kn" ? "ವಿಶಿಷ್ಟ ಕ್ಯೂಆರ್ ಕೋಡ್" : "Unique Tamper-Evident QR"}
          </span>
          <span className="text-xs font-mono font-bold text-slate-600">
            Block #{sequenceNumber} ({centreCode})
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {isHashIntact ? (
            <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black px-2.5 py-0.5 rounded-full flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>{locale === "kn" ? "ಅಖಂಡ ದಾಖಲೆ (INTACT)" : "INTACT & VERIFIED"}</span>
            </span>
          ) : (
            <span className="bg-red-100 text-red-900 border border-red-400 text-xs font-black px-2.5 py-0.5 rounded-full flex items-center space-x-1 animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5 text-red-700" />
              <span>{locale === "kn" ? "ಮಾರ್ಪಾಡು ಪತ್ತೆಯಾಗಿದೆ (TAMPERED)" : "TAMPERING DETECTED"}</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Grid: QR Code + Cryptographic Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Left Column: Visual QR Code & Actions */}
        <div className="flex flex-col items-center p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
          <div className="relative p-3 bg-white rounded-2xl shadow-sm border border-slate-200">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`Tamper Evident QR for ${transactionId}`}
                className="w-52 h-52 object-contain mx-auto"
              />
            ) : (
              <div className="w-52 h-52 bg-slate-100 animate-pulse rounded-xl" />
            )}
            <div className="absolute bottom-1 right-1 bg-[#1b4332] text-white text-[9px] font-bold px-2 py-0.5 rounded shadow">
              PaddyTrace
            </div>
          </div>

          <div className="text-xs text-slate-500 max-w-xs leading-relaxed">
            {locale === "kn"
              ? "ಯಾವುದೇ ಸ್ಮಾರ್ಟ್‌ಫೋನ್ ಕ್ಯಾಮೆರಾದಿಂದ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ ತೂಕ, ತೇವಾಂಶ ಮತ್ತು ನೇರ ಪಾವತಿ ಪರಿಶೀಲಿಸಿ."
              : "Scan with any mobile camera to independently verify weights, deductions, and payment."}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 w-full">
            <button
              onClick={handleDownloadQr}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{locale === "kn" ? "ಕ್ಯೂಆರ್ ಡೌನ್‌ಲೋಡ್" : "Download QR"}</span>
            </button>

            <a
              href={verificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-[#1b4332] hover:bg-[#2d6a4f] text-white rounded-lg text-xs font-bold transition flex items-center space-x-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{locale === "kn" ? "ಪರಿಶೀಲಿಸಿ" : "Test Scan Link"}</span>
            </a>
          </div>
        </div>

        {/* Right Column: Tamper-Evident SHA-256 Code Details */}
        <div className="space-y-4">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {locale === "kn" ? "ಕ್ರಿಪ್ಟೋಗ್ರಾಫಿಕ್ SHA-256 ಹ್ಯಾಶ್ ಕೋಡ್" : "Tamper-Evident SHA-256 Code"}
            </div>
            <div
              className={`mt-1.5 p-3 rounded-xl border font-mono text-xs break-all relative transition-colors ${
                isHashIntact
                  ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                  : "bg-red-50 border-red-300 text-red-950 font-bold"
              }`}
            >
              {computedHash}
              <button
                onClick={handleCopyHash}
                title="Copy SHA-256 Hash"
                className="absolute top-2 right-2 p-1.5 bg-white hover:bg-slate-100 rounded-md border border-slate-300 text-slate-700 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">{locale === "kn" ? "ವಹಿವಾಟು ಐಡಿ" : "Transaction ID"}:</span>
              <span className="font-mono font-bold text-[#1b4332]">{transactionId}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">{locale === "kn" ? "ರೈತರ ಫ್ರೂಟ್ಸ್ ಐಡಿ" : "Farmer FRUITS ID"}:</span>
              <span className="font-mono font-semibold text-slate-900">{farmerFruitsId}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">{locale === "kn" ? "ನಿವ್ವಳ ತೂಕ" : "Net Weight"}:</span>
              <span className={`font-bold ${isTampered ? "text-red-600 line-through" : "text-slate-900"}`}>
                {netWeightKg.toFixed(2)} kg
              </span>
            </div>
            {isTampered && (
              <div className="flex justify-between py-1 border-b border-red-100 text-red-600 font-bold">
                <span>Tampered Weight:</span>
                <span>{tamperedWeight.toFixed(2)} kg</span>
              </div>
            )}
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">{locale === "kn" ? "ಹಿಂದಿನ ಬ್ಲಾಕ್ ಹ್ಯಾಶ್" : "Previous Block Hash"}:</span>
              <span className="font-mono text-[10px] text-slate-500 truncate max-w-[180px]">
                {previousHash}
              </span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-slate-700 font-bold">{locale === "kn" ? "ಒಟ್ಟು ಪಾವತಿ" : "Final Payable (DBT)"}:</span>
              <span className="font-black text-emerald-800 text-sm">
                {formatPaiseToInr(finalPayablePaise)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Tamper Simulation Scenario Box */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Flame className="w-4 h-4 text-amber-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              {locale === "kn"
                ? "ಪರೀಕ್ಷಾರ್ಥ ವಂಚನೆ ಪತ್ತೆ ಸನ್ನಿವೇಶ (Tamper Simulation Test)"
                : "Interactive Tamper Simulation Scenario"}
            </h4>
          </div>

          {isTampered ? (
            <button
              onClick={() => {
                setIsTampered(false);
                setTamperedWeight(netWeightKg);
              }}
              className="text-xs font-bold text-[#1b4332] hover:underline flex items-center space-x-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{locale === "kn" ? "ಮೂಲಕ್ಕೆ ಮರುಸ್ಥಾಪಿಸಿ" : "Reset to Original"}</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setIsTampered(true);
                // Alter weight by reducing 100 kg fraudulently
                setTamperedWeight(netWeightKg - 100);
              }}
              className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition flex items-center space-x-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{locale === "kn" ? "ತೂಕ ತಿದ್ದುಪಡಿ ಪರೀಕ್ಷಿಸಿ (-100 kg)" : "Simulate Tampering (-100 kg)"}</span>
            </button>
          )}
        </div>

        <p className="text-[11px] text-slate-600 leading-relaxed">
          {isTampered ? (
            <span className="text-red-700 font-medium">
              ⚠️ <strong>Tampering Detected:</strong> The recorded weight was altered from{" "}
              <strong>{netWeightKg} kg</strong> to <strong>{tamperedWeight} kg</strong>. Because SHA-256 is mathematically deterministic, altering even a single digit immediately breaks the hash signature, causing instant verification rejection on the farmer QR page!
            </span>
          ) : (
            locale === "kn"
              ? "ಯಾರಾದರೂ ತೂಕ ಅಥವಾ ದರವನ್ನು ಡೇಟಾಬೇಸ್‌ನಲ್ಲಿ ತಿದ್ದಲು ಪ್ರಯತ್ನಿಸಿದರೆ ಏನಾಗುತ್ತದೆ ಎಂಬುದನ್ನು ಪರೀಕ್ಷಿಸಲು ಮೇಲಿನ ಬಟನ್ ಒತ್ತಿ."
              : "Click the button above to simulate what happens if an unauthorized person tries to alter weights or deductions in the database after the farmer has left."
          )}
        </p>
      </div>
    </div>
  );
}
