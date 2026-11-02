import { getTranslations } from "next-intl/server";
import { OfficerWizard } from "@/components/OfficerWizard";
import { db } from "@/lib/db";

export default async function OfficerProcurePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });

  const centres = await db.centres.findMany();
  const mspRates = await db.mspRates.findMany();

  return (
    <div className="py-4 space-y-4">
      <div className="max-w-xl mx-auto text-center space-y-1">
        <h1 className="text-2xl font-black text-slate-900">
          {locale === "kn" ? "ಭತ್ತ ಖರೀದಿ ಅಧಿಕಾರಿಯ ವಿಝಾರ್ಡ್" : "Officer Weighing & Procurement Wizard"}
        </h1>
        <p className="text-xs text-slate-500">
          {locale === "kn"
            ? "ನೇರ ತೂಕ, ತೇವಾಂಶ ಲೆಕ್ಕಾಚಾರ ಮತ್ತು ಕ್ರಿಪ್ಟೋಗ್ರಾಫಿಕ್ ಹ್ಯಾಶ್ ಸೃಷ್ಟಿ (ಆನ್‌ಲೈನ್ / ಆಫ್‌ಲೈನ್)"
            : "Live weighbridge capture, moisture deduction & tamper-evident SHA-256 chain creation"}
        </p>
      </div>

      <OfficerWizard
        locale={locale}
        centres={centres}
        mspRates={mspRates}
      />
    </div>
  );
}

