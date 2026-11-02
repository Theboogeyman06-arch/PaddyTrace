import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { calculateProcurementValues } from "@/lib/math/procurement";
import {
  GENESIS_HASH,
  computeTransactionHash,
  generateQrVerificationToken,
} from "@/lib/crypto/hash-chain";
import { CanonicalTransactionPayload, Transaction } from "@/lib/types";
import { notificationService } from "@/lib/services/notifications";
import { calculatePaymentDueDate } from "@/lib/services/payments";

const SyncTransactionSchema = z.object({
  clientLocalId: z.string().optional(),
  centreId: z.string().min(1, "Centre ID is required"),
  farmerFruitsId: z.string().length(10, "FRUITS ID must be exactly 10 characters"),
  paddyVariety: z.string().min(1, "Paddy variety is required"),
  grossWeight: z.number().positive("Gross weight must be greater than zero"),
  tareWeight: z.number().nonnegative("Tare weight cannot be negative"),
  moisturePercent: z.number().nonnegative("Moisture percentage cannot be negative"),
  scalePhotoBase64: z.string().optional(),
  scalePhotoSha256: z.string().min(32, "Scale photo hash required"),
  gpsLat: z.number().optional(),
  gpsLng: z.number().optional(),
  deviceTimestamp: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const validated = SyncTransactionSchema.parse(rawBody);

    // 1. Idempotency Check: if clientLocalId already exists, return existing
    if (validated.clientLocalId) {
      const existing = await db.transactions.findUnique({
        where: { clientLocalId: validated.clientLocalId },
      });
      if (existing) {
        const token = await generateQrVerificationToken(
          existing.id,
          validated.farmerFruitsId
        );
        return NextResponse.json({
          success: true,
          idempotentReplay: true,
          transaction: existing,
          verificationToken: token,
        });
      }
    }

    // 2. Validate Farmer Existence
    const farmer = await db.farmers.findUnique({
      where: { fruitsId: validated.farmerFruitsId },
    });
    if (!farmer) {
      return NextResponse.json(
        { error: "Farmer with specified FRUITS ID not registered" },
        { status: 404 }
      );
    }

    // 3. Validate Centre Existence
    const centre = await db.centres.findUnique({
      where: { id: validated.centreId },
    });
    if (!centre) {
      return NextResponse.json(
        { error: "Procurement centre not found or inactive" },
        { status: 404 }
      );
    }

    // 4. Server-Authoritative Recalculation
    const mspRateRecord = await db.mspRates.findFirst({
      where: { variety: validated.paddyVariety, isActive: true },
    });
    const mspRatePaise = mspRateRecord?.ratePerQuintalPaise || 230000;

    const calc = calculateProcurementValues(
      validated.grossWeight,
      validated.tareWeight,
      validated.moisturePercent,
      mspRatePaise
    );

    // 5. Concurrency Control: Execute inside Centre Lock
    const result = await db.acquireCentreLock(validated.centreId, async () => {
      const lastTx = await db.transactions.getLastInCentre(validated.centreId);
      const sequenceNumber = lastTx ? lastTx.sequenceNumber + 1 : 1;
      const previousHash = lastTx ? lastTx.hash : GENESIS_HASH;
      const transactionId = "TX-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();

      const canonicalPayload: CanonicalTransactionPayload = {
        centreId: validated.centreId,
        deductionAmountPaise: Number(calc.deductionAmountPaise),
        deductionKg: calc.deductionKg,
        farmerFruitsId: validated.farmerFruitsId,
        finalPayablePaise: Number(calc.finalPayablePaise),
        gpsLatitude: validated.gpsLat || 0,
        gpsLongitude: validated.gpsLng || 0,
        grossPayablePaise: Number(calc.grossPayablePaise),
        grossWeightKg: validated.grossWeight,
        moisturePercentage: validated.moisturePercent,
        mspRatePerQuintalPaise: mspRatePaise,
        netWeightKg: calc.netWeightKg,
        paddyVariety: validated.paddyVariety,
        payableWeightKg: calc.payableWeightKg,
        previousHash,
        scalePhotoSha256: validated.scalePhotoSha256,
        sequenceNumber,
        tareWeightKg: validated.tareWeight,
        timestampIso: validated.deviceTimestamp,
        transactionId,
      };

      const hash = computeTransactionHash(canonicalPayload);

      const newTx: Transaction = {
        id: transactionId,
        clientLocalId: validated.clientLocalId,
        centreId: validated.centreId,
        sequenceNumber,
        farmerId: farmer.id,
        paddyVariety: validated.paddyVariety,
        grossWeight: validated.grossWeight,
        tareWeight: validated.tareWeight,
        netWeight: calc.netWeightKg,
        moisturePercent: validated.moisturePercent,
        deductionKg: calc.deductionKg,
        payableWeight: calc.payableWeightKg,
        mspRatePaise,
        grossPayablePaise: calc.grossPayablePaise,
        deductionAmountPaise: calc.deductionAmountPaise,
        finalPayablePaise: calc.finalPayablePaise,
        scalePhotoUrl: validated.scalePhotoBase64 ? "data:image/jpeg;base64," + validated.scalePhotoBase64 : undefined,
        scalePhotoSha256: validated.scalePhotoSha256,
        gpsLat: validated.gpsLat,
        gpsLng: validated.gpsLng,
        deviceTimestamp: validated.deviceTimestamp,
        previousHash,
        hash,
        createdAt: new Date().toISOString(),
      };

      const createdTx = await db.transactions.create(newTx);

      // Create 15-day statutory payment record
      const dueDate = calculatePaymentDueDate(new Date());
      await db.payments.create({
        id: "PAY-" + transactionId,
        transactionId: createdTx.id,
        amountPaise: calc.finalPayablePaise,
        dueDate: dueDate.toISOString(),
        status: "PENDING",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Audit Log
      await db.auditLogs.create({
        action: "PROCUREMENT_TRANSACTION_COMMITTED",
        entityType: "Transaction",
        entityId: createdTx.id,
        metadataJson: JSON.stringify({
          centreCode: centre.code,
          sequenceNumber,
          netWeightKg: calc.netWeightKg,
          finalPayablePaise: Number(calc.finalPayablePaise),
          hash,
        }),
      });

      // Generate verification token for QR code
      const verificationToken = await generateQrVerificationToken(
        createdTx.id,
        farmer.fruitsId
      );

      // Send bilingual notification (SMS/WhatsApp)
      const origin = request.nextUrl.origin;
      const verifyUrl = `${origin}/kn/verify/${createdTx.id}?t=${verificationToken}`;
      await notificationService.sendProcurementReceipt({
        recipientPhone: farmer.phone,
        farmerNameEn: farmer.nameEn,
        farmerNameKn: farmer.nameKn,
        centreName: centre.nameKn,
        transactionId: createdTx.id,
        netWeightKg: calc.netWeightKg,
        finalPayablePaise: calc.finalPayablePaise,
        dueDateIso: dueDate.toISOString(),
        verificationUrl: verifyUrl,
        language: "kn",
      });

      return {
        transaction: createdTx,
        verificationToken,
      };
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || "Failed to commit procurement transaction" },
      { status: 400 }
    );
  }
}

