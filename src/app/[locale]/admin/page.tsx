import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { AdminDashboard } from "@/components/AdminDashboard";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });

  const centres = await db.centres.findMany();
  const transactions = await db.transactions.findMany();
  const payments = await db.payments.findMany();
  const disputes = await db.disputes.findMany();
  const farmers = await db.farmers.findMany();

  const totalVolumeKg = transactions.reduce((acc, t) => acc + t.netWeight, 0);
  const totalValuePaise = transactions.reduce((acc, t) => acc + BigInt(t.finalPayablePaise), 0n);
  const paidCount = payments.filter((p) => p.status === "PAID").length;
  const pendingCount = payments.filter((p) => p.status === "PENDING").length;
  const overdueCount = payments.filter((p) => p.status === "OVERDUE").length;

  const stats = {
    totalVolumeKg,
    totalValuePaise,
    totalFarmers: farmers.length,
    totalTransactions: transactions.length,
    paidCount,
    pendingCount,
    overdueCount,
    disputeCount: disputes.length,
  };

  return (
    <AdminDashboard
      locale={locale}
      centres={centres}
      transactions={transactions}
      payments={payments}
      disputes={disputes}
      stats={stats}
    />
  );
}

