import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { DisputeCategory, Dispute } from "@/lib/types";

const DisputeSchema = z.object({
  transactionId: z.string().min(1, "Transaction ID required"),
  farmerFruitsId: z.string().length(10, "10-digit FRUITS ID required"),
  category: z.enum([
    "WEIGHT_MISMATCH",
    "MOISTURE_DEDUCTION",
    "QUALITY_DISAGREEMENT",
    "MSP_PRICE_DISAGREEMENT",
    "PAYMENT_NOT_RECEIVED",
    "OTHER",
  ]),
  description: z.string().min(10, "Please provide at least 10 characters explaining your grievance"),
  evidencePhotoBase64: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = DisputeSchema.parse(body);

    const tx = await db.transactions.findUnique({
      where: { id: validated.transactionId },
    });

    if (!tx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const disputeRef = "DSP-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000);

    const dispute: Dispute = {
      id: "dsp-" + Date.now().toString(36),
      disputeRef,
      transactionId: validated.transactionId,
      farmerFruitsId: validated.farmerFruitsId,
      category: validated.category as DisputeCategory,
      description: validated.description,
      evidencePhotoUrl: validated.evidencePhotoBase64 ? "data:image/jpeg;base64," + validated.evidencePhotoBase64 : undefined,
      status: "OPEN",
      createdAt: new Date().toISOString(),
    };

    const created = await db.disputes.create(dispute);

    // Update payment status to DISPUTED
    const payment = await db.payments.findUnique({
      where: { transactionId: validated.transactionId },
    });
    if (payment) {
      await db.payments.update(payment.id, { status: "DISPUTED" });
    }

    // Audit log
    await db.auditLogs.create({
      action: "FARMER_DISPUTE_RAISED",
      entityType: "Dispute",
      entityId: created.id,
      metadataJson: JSON.stringify({
        disputeRef,
        category: validated.category,
        transactionId: validated.transactionId,
      }),
    });

    return NextResponse.json({ success: true, dispute: created });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || "Failed to create dispute" }, { status: 400 });
  }
}

