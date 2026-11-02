import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCentreChain } from "@/lib/crypto/hash-chain";

export async function POST(request: NextRequest) {
  try {
    const { action, payload } = await request.json();

    if (action === "DISBURSE_DBT") {
      const { paymentId, utr } = payload;
      const updated = await db.payments.update(paymentId, {
        status: "PAID",
        paidDate: new Date().toISOString(),
        paymentMode: "DBT-PFMS",
        reference: utr || "PFMS" + Math.floor(1000000000 + Math.random() * 9000000000),
      });

      await db.auditLogs.create({
        action: "PAYMENT_DISBURSED_DBT",
        entityType: "Payment",
        entityId: paymentId,
        metadataJson: JSON.stringify({ reference: updated.reference }),
      });

      return NextResponse.json({ success: true, payment: updated });
    }

    if (action === "RESOLVE_DISPUTE") {
      const { disputeId, resolutionNotes, status } = payload;
      const updated = await db.disputes.update(disputeId, {
        status: status || "RESOLVED",
        resolutionNotes,
        resolvedAt: new Date().toISOString(),
      });

      if (payload.comment) {
        await db.disputeComments.create({
          id: "cmt-" + Date.now(),
          disputeId,
          authorId: "usr-rsk-01",
          authorName: "RSK Agricultural Officer",
          comment: payload.comment,
          createdAt: new Date().toISOString(),
        });
      }

      await db.auditLogs.create({
        action: "DISPUTE_STATUS_UPDATED",
        entityType: "Dispute",
        entityId: disputeId,
        metadataJson: JSON.stringify({ status: updated.status, resolutionNotes }),
      });

      return NextResponse.json({ success: true, dispute: updated });
    }

    if (action === "AUDIT_CHAIN") {
      const { centreId } = payload;
      const txs = await db.transactions.findMany({ centreId });
      const audit = verifyCentreChain(txs);
      return NextResponse.json({ success: true, audit, totalBlocks: txs.length });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

