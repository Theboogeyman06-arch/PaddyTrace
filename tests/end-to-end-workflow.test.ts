import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../src/lib/db";
import { fruitsService } from "../src/lib/services/fruits";
import { calculateProcurementValues, formatPaiseToInr } from "../src/lib/math/procurement";
import {
  GENESIS_HASH,
  computeTransactionHash,
  verifyCentreChain,
  generateQrVerificationToken,
  verifyQrToken,
} from "../src/lib/crypto/hash-chain";
import { calculatePaymentDueDate } from "../src/lib/services/payments";
import { CanonicalTransactionPayload, Transaction } from "../src/lib/types";

describe("PaddyTrace End-to-End Procurement Lifecycle", () => {
  const TEST_CENTRE_ID = "centre-raichur-01";
  const FARMER_FRUITS_ID = "1002345678";

  it("1. Verifies farmer registration via FRUITS service", async () => {
    const farmer = await fruitsService.getFarmerByFruitsId(FARMER_FRUITS_ID);
    expect(farmer).not.toBeNull();
    expect(farmer?.fruitsId).toBe(FARMER_FRUITS_ID);
    expect(farmer?.nameEn).toBe("Ramesh Patil");
    expect(farmer?.district).toBe("Raichur");
  });

  it("2. Calculates procurement weighing, moisture deduction, and integer paise value", () => {
    // 5000 kg gross, 200 kg tare -> 4800 kg net
    // Moisture 18.5% -> 1.5% excess -> 1.5% deduction -> 72.00 kg deduction
    // Payable weight = 4728.00 kg
    // Grade A MSP: ₹2,320 / quintal = 232,000 paise / 100 kg
    const calc = calculateProcurementValues(5000, 200, 18.5, 232000);
    expect(calc.netWeightKg).toBe(4800);
    expect(calc.deductionPercent).toBe(1.5);
    expect(calc.deductionKg).toBe(72);
    expect(calc.payableWeightKg).toBe(4728);
    // 4728 kg = 47.28 quintals * 232,000 paise = 10,968,960 paise = ₹1,09,689.60
    expect(calc.finalPayablePaise).toBe(10968960n);
    expect(formatPaiseToInr(calc.finalPayablePaise)).toBe("₹1,09,689.60");
  });

  it("3. Commits transaction to centre hash chain with serializable lock", async () => {
    const farmer = await db.farmers.findUnique({ where: { fruitsId: FARMER_FRUITS_ID } });
    expect(farmer).not.toBeNull();

    const mspRecord = await db.mspRates.findFirst({ where: { variety: "PADDY_GRADE_A" } });
    const mspRatePaise = mspRecord?.ratePerQuintalPaise || 232000;

    const calc = calculateProcurementValues(3000, 100, 16.5, mspRatePaise);

    const txResult = await db.acquireCentreLock(TEST_CENTRE_ID, async () => {
      const lastTx = await db.transactions.getLastInCentre(TEST_CENTRE_ID);
      const sequenceNumber = lastTx ? lastTx.sequenceNumber + 1 : 1;
      const previousHash = lastTx ? lastTx.hash : GENESIS_HASH;
      const transactionId = "TX-E2E-" + Date.now();
      const timestampIso = new Date().toISOString();
      const scalePhotoSha256 = "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9";

      const canonicalPayload: CanonicalTransactionPayload = {
        centreId: TEST_CENTRE_ID,
        deductionAmountPaise: Number(calc.deductionAmountPaise),
        deductionKg: calc.deductionKg,
        farmerFruitsId: FARMER_FRUITS_ID,
        finalPayablePaise: Number(calc.finalPayablePaise),
        gpsLatitude: 15.7745,
        gpsLongitude: 76.8282,
        grossPayablePaise: Number(calc.grossPayablePaise),
        grossWeightKg: 3000,
        moisturePercentage: 16.5,
        mspRatePerQuintalPaise: mspRatePaise,
        netWeightKg: calc.netWeightKg,
        paddyVariety: "PADDY_GRADE_A",
        payableWeightKg: calc.payableWeightKg,
        previousHash,
        scalePhotoSha256,
        sequenceNumber,
        tareWeightKg: 100,
        timestampIso,
        transactionId,
      };

      const hash = computeTransactionHash(canonicalPayload);

      const tx: Transaction = {
        id: transactionId,
        clientLocalId: "PT-LOCAL-E2E-" + Date.now(),
        centreId: TEST_CENTRE_ID,
        sequenceNumber,
        farmerId: farmer!.id,
        paddyVariety: "PADDY_GRADE_A",
        grossWeight: 3000,
        tareWeight: 100,
        netWeight: calc.netWeightKg,
        moisturePercent: 16.5,
        deductionKg: calc.deductionKg,
        payableWeight: calc.payableWeightKg,
        mspRatePaise,
        grossPayablePaise: calc.grossPayablePaise,
        deductionAmountPaise: calc.deductionAmountPaise,
        finalPayablePaise: calc.finalPayablePaise,
        scalePhotoSha256,
        gpsLat: 15.7745,
        gpsLng: 76.8282,
        deviceTimestamp: timestampIso,
        previousHash,
        hash,
        createdAt: timestampIso,
      };

      const createdTx = await db.transactions.create(tx);

      // Create 15-day statutory payment record
      const dueDate = calculatePaymentDueDate(new Date());
      const payment = await db.payments.create({
        id: "PAY-" + createdTx.id,
        transactionId: createdTx.id,
        amountPaise: calc.finalPayablePaise,
        dueDate: dueDate.toISOString(),
        status: "PENDING",
        createdAt: timestampIso,
        updatedAt: timestampIso,
      });

      return { tx: createdTx, payment };
    });

    expect(txResult.tx).toBeDefined();
    expect(txResult.tx.hash).toHaveLength(64);
    expect(txResult.payment.status).toBe("PENDING");

    // 4. Verify Signed QR Token
    const token = await generateQrVerificationToken(txResult.tx.id, FARMER_FRUITS_ID);
    const verifiedToken = await verifyQrToken(token);
    expect(verifiedToken.valid).toBe(true);
    expect(verifiedToken.transactionId).toBe(txResult.tx.id);

    // 5. Verify Centre Cryptographic Hash Chain
    const centreTxs = await db.transactions.findMany({ centreId: TEST_CENTRE_ID });
    const audit = verifyCentreChain(centreTxs);
    expect(audit.isValid).toBe(true);

    // 6. Test Dispute Raising Workflow
    const disputeRef = "DSP-E2E-001";
    const dispute = await db.disputes.create({
      id: "dsp-e2e-001",
      disputeRef,
      transactionId: txResult.tx.id,
      farmerFruitsId: FARMER_FRUITS_ID,
      category: "WEIGHT_MISMATCH",
      description: "Scale display showed 3,050 kg gross but recorded 3,000 kg",
      status: "OPEN",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    expect(dispute.disputeRef).toBe(disputeRef);
    expect(dispute.status).toBe("OPEN");

    // 7. RSK Staff Records Resolution Decision
    const resolvedDispute = await db.disputes.update(dispute.id, {
      status: "RESOLVED",
      resolutionNotes: "Weighbridge tare recalibrated and verification confirmed by RSK officer.",
      resolvedAt: new Date().toISOString(),
    });
    expect(resolvedDispute.status).toBe("RESOLVED");

    // 8. DBT Payment Disbursement
    const updatedPayment = await db.payments.update(txResult.payment.id, {
      status: "PAID",
      paidDate: new Date().toISOString(),
      paymentMode: "DBT-PFMS",
      reference: "PFMS-KA-E2E-TEST-8899",
    });
    expect(updatedPayment.status).toBe("PAID");
    expect(updatedPayment.reference).toContain("PFMS");
  });
});

