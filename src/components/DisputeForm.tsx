"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/routing";
import { AlertCircle, CheckCircle2, Upload, Loader2 } from "lucide-react";

export function DisputeForm({
  transactionId,
  farmerFruitsId,
  locale,
}: {
  transactionId: string;
  farmerFruitsId: string;
  locale: string;
}) {
  const router = useRouter();
  const [category, setCategory] = useState("WEIGHT_MISMATCH");
  const [description, setDescription] = useState("");
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successRef, setSuccessRef] = useState<string | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      setPhotoBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId,
          farmerFruitsId,
          category,
          description,
          evidencePhotoBase64: photoBase64 || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit dispute");
      }

      setSuccessRef(data.dispute.disputeRef);
      router.refresh();
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successRef) {
    return (
      <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-3">
        <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-emerald-950">
          {locale === "kn" ? "ದೂರು ಯಶಸ್ವಿಯಾಗಿ ದಾಖಲಾಗಿದೆ!" : "Grievance Successfully Registered!"}
        </h3>
        <p className="text-xs text-emerald-800">
          {locale === "kn"
            ? "ನಿಮ್ಮ ದೂರನ್ನು ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರದ (RSK) ಕೃಷಿ ಅಧಿಕಾರಿಗೆ ಕಳುಹಿಸಲಾಗಿದೆ."
            : "Your grievance has been assigned to the local Raitha Samparka Kendra officer."}
        </p>
        <div className="inline-block bg-white px-4 py-2 rounded-lg border border-emerald-300 font-mono font-bold text-emerald-900 text-sm">
          {successRef}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
          {locale === "kn" ? "ತಕರಾರಿನ ವರ್ಗ" : "Grievance Category"}
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
        >
          <option value="WEIGHT_MISMATCH">
            {locale === "kn" ? "ತೂಕದಲ್ಲಿ ವ್ಯತ್ಯಾಸ (Weight Mismatch)" : "Weighbridge Weight Mismatch"}
          </option>
          <option value="MOISTURE_DEDUCTION">
            {locale === "kn" ? "ತೇವಾಂಶ ಕಡಿತದಲ್ಲಿ ವ್ಯತ್ಯಾಸ (Moisture Deduction)" : "Moisture / Deduction Disagreement"}
          </option>
          <option value="QUALITY_DISAGREEMENT">
            {locale === "kn" ? "ಗುಣಮಟ್ಟ / ದರ್ಜೆ ವಿವಾದ (Quality / Grade)" : "Quality / Grading Disagreement"}
          </option>
          <option value="MSP_PRICE_DISAGREEMENT">
            {locale === "kn" ? "ಬೆಂಬಲ ಬೆಲೆ ದರ ವ್ಯತ್ಯಾಸ (MSP Price)" : "MSP Price Disagreement"}
          </option>
          <option value="PAYMENT_NOT_RECEIVED">
            {locale === "kn" ? "15 ದಿನಗಳ ನಂತರವೂ ಹಣ ಜಮಾ ಆಗಿಲ್ಲ (Payment Delayed)" : "Payment Not Received after 15 Days"}
          </option>
          <option value="OTHER">
            {locale === "kn" ? "ಇತರ ದೂರು (Other)" : "Other Grievance"}
          </option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
          {locale === "kn" ? "ದೂರಿನ ವಿವರಣೆ" : "Detailed Description"}
        </label>
        <textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={
            locale === "kn"
              ? "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಆಕ್ಷೇಪಣೆಯ ವಿವರಗಳನ್ನು ನಮೂದಿಸಿ..."
              : "Please explain the exact reason for grievance and disputed figures..."
          }
          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
          {locale === "kn" ? "ಪುರಾವೆ ಫೋಟೋ (ಐಚ್ಛಿಕ)" : "Evidence Photo (Optional)"}
        </label>
        <div className="flex items-center space-x-3">
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="text-xs text-slate-500 file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-[#1b4332] hover:bg-[#2d6a4f] text-white font-bold py-3 px-4 rounded-xl shadow-md transition flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{locale === "kn" ? "ದಾಖಲಿಸಲಾಗುತ್ತಿದೆ..." : "Submitting Grievance..."}</span>
          </>
        ) : (
          <span>{locale === "kn" ? "ದೂರು ಸಲ್ಲಿಸಿ" : "Submit Grievance"}</span>
        )}
      </button>
    </form>
  );
}

