import { InteractiveQrLab } from "@/components/InteractiveQrLab";

export default async function QrLabPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <InteractiveQrLab locale={locale} />;
}

