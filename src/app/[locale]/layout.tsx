import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Navbar } from "@/components/Navbar";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "kn" | "en")) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased flex flex-col font-sans">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
          <footer className="bg-slate-900 text-slate-400 py-6 text-center text-xs border-t border-slate-800">
            <p className="font-semibold text-slate-300">
              PaddyTrace — Digital Procurement Transparency & Verification Platform
            </p>
            <p className="mt-1">
              Department of Food, Civil Supplies & Consumer Affairs | Government of Karnataka
            </p>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

