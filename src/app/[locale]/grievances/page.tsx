import { db } from "@/lib/db";
import { GrievancesPortal } from "@/components/GrievancesPortal";

export default async function GrievancesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Load all disputes and centres
  const [disputes, centres] = await Promise.all([
    db.disputes.findMany(),
    db.centres.findMany(),
  ]);

  return (
    <GrievancesPortal
      initialDisputes={disputes}
      centres={centres}
      locale={locale}
    />
  );
}

