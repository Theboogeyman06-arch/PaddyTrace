import { getTranslations } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { locale } = await params;
  const { from } = await searchParams;
  const t = await getTranslations({ locale, namespace: "common" });

  return (
    <div className="max-w-md mx-auto py-10 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-[#1b4332] text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
          <ShieldCheck className="w-7 h-7 text-[#74c69d]" />
        </div>
        <h1 className="text-2xl font-black text-slate-900">{t("login")}</h1>
        <p className="text-xs text-slate-500">
          {locale === "kn"
            ? "ಆಹಾರ ಮತ್ತು ನಾಗರಿಕ ಸರಬರಾಜು ಇಲಾಖೆ — ಕರ್ನಾಟಕ ಸರ್ಕಾರ"
            : "Dept of Food, Civil Supplies & Consumer Affairs — Govt of Karnataka"}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <LoginForm locale={locale} from={from} />
      </div>
    </div>
  );
}

