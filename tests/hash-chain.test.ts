import { describe, it, expect } from "vitest";
import {
  GENESIS_HASH,
  serializeCanonicalPayload,
  computeTransactionHash,
  verifyCentreChain,
  generateQrVerificationToken,
  verifyQrToken,
} from "../src/lib/crypto/hash-chain";
import { CanonicalTransactionPayload, Transaction } from "../src/lib/types";

describe("Cryptographic Hash Chain Engine", () => {
  const samplePayload1: CanonicalTransactionPayload = {
    centreId: "centre-raichur-01",
    deductionAmountPaise: 0,
    deductionKg: 0,
    farmerFruitsId: "1002345678",
    finalPayablePaise: 4640000,
    gpsLatitude: 15.7745,
    gpsLongitude: 76.8282,
    grossPayablePaise: 4640000,
    grossWeightKg: 2000,
    moisturePercentage: 16.5,
    mspRatePerQuintalPaise: 232000,
    netWeightKg: 2000,
    paddyVariety: "PADDY_GRADE_A",
    payableWeightKg: 2000,
    previousHash: GENESIS_HASH,
    scalePhotoSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    sequenceNumber: 1,
    tareWeightKg: 0,
    timestampIso: "2026-11-02T10:00:00.000Z",
    transactionId: "tx-test-001",
  };

  it("produces deterministic canonical serialization regardless of property order", () => {
    const raw1 = serializeCanonicalPayload(samplePayload1);
    // Shuffle keys
    const shuffled: CanonicalTransactionPayload = {
      transactionId: "tx-test-001",
      sequenceNumber: 1,
      previousHash: GENESIS_HASH,
      centreId: "centre-raichur-01",
      farmerFruitsId: "1002345678",
      paddyVariety: "PADDY_GRADE_A",
      grossWeightKg: 2000,
      tareWeightKg: 0,
      netWeightKg: 2000,
      moisturePercentage: 16.5,
      deductionKg: 0,
      payableWeightKg: 2000,
      mspRatePerQuintalPaise: 232000,
      grossPayablePaise: 4640000,
      deductionAmountPaise: 0,
      finalPayablePaise: 4640000,
      scalePhotoSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      gpsLatitude: 15.7745,
      gpsLongitude: 76.8282,
      timestampIso: "2026-11-02T10:00:00.000Z",
    };
    const raw2 = serializeCanonicalPayload(shuffled);
    expect(raw1).toBe(raw2);
  });

  it("creates valid SHA-256 hash for genesis block", () => {
    const hash1 = computeTransactionHash(samplePayload1);
    expect(hash1).toHaveLength(64);
    expect(/^[a-f0-9]{64}$/.test(hash1)).toBe(true);
  });

  it("validates an intact 3-block chain correctly", () => {
    const hash1 = computeTransactionHash(samplePayload1);

    const samplePayload2: CanonicalTransactionPayload = {
      ...samplePayload1,
      transactionId: "tx-test-002",
      sequenceNumber: 2,
      previousHash: hash1,
      timestampIso: "2026-11-02T11:00:00.000Z",
    };
    const hash2 = computeTransactionHash(samplePayload2);

    const samplePayload3: CanonicalTransactionPayload = {
      ...samplePayload1,
      transactionId: "tx-test-003",
      sequenceNumber: 3,
      previousHash: hash2,
      timestampIso: "2026-11-02T12:00:00.000Z",
    };
    const hash3 = computeTransactionHash(samplePayload3);

    const tx1: Transaction = {
      id: "tx-test-001",
      centreId: "centre-raichur-01",
      sequenceNumber: 1,
      farmerId: "f-001",
      farmer: {
        id: "f-001",
        fruitsId: "1002345678",
        nameEn: "Ramesh Patil",
        nameKn: "ರಮೇಶ್ ಪಾಟೀಲ್",
        phone: "9845012345",
        village: "Sindhanur Rural",
        taluk: "Sindhanur",
        district: "Raichur",
        bankAccountMasked: "XXXX-XXXX-4589",
        ifsc: "SBIN0040123",
      },
      paddyVariety: "PADDY_GRADE_A",
      grossWeight: 2000,
      tareWeight: 0,
      netWeight: 2000,
      moisturePercent: 16.5,
      deductionKg: 0,
      payableWeight: 2000,
      mspRatePaise: 232000,
      grossPayablePaise: 4640000n,
      deductionAmountPaise: 0n,
      finalPayablePaise: 4640000n,
      scalePhotoSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      gpsLat: 15.7745,
      gpsLng: 76.8282,
      deviceTimestamp: "2026-11-02T10:00:00.000Z",
      previousHash: GENESIS_HASH,
      hash: hash1,
      createdAt: "2026-11-02T10:00:00.000Z",
    };

    const tx2: Transaction = {
      ...tx1,
      id: "tx-test-002",
      sequenceNumber: 2,
      previousHash: hash1,
      hash: hash2,
      deviceTimestamp: "2026-11-02T11:00:00.000Z",
      createdAt: "2026-11-02T11:00:00.000Z",
    };

    const tx3: Transaction = {
      ...tx1,
      id: "tx-test-003",
      sequenceNumber: 3,
      previousHash: hash2,
      hash: hash3,
      deviceTimestamp: "2026-11-02T12:00:00.000Z",
      createdAt: "2026-11-02T12:00:00.000Z",
    };

    const verification = verifyCentreChain([tx1, tx2, tx3]);
    expect(verification.isValid).toBe(true);
  });

  it("detects tampering when payload fields are modified post-recording", () => {
    const hash1 = computeTransactionHash(samplePayload1);
    const tx1: Transaction = {
      id: "tx-test-001",
      centreId: "centre-raichur-01",
      sequenceNumber: 1,
      farmerId: "f-001",
      farmer: {
        id: "f-001",
        fruitsId: "1002345678",
        nameEn: "Ramesh Patil",
        nameKn: "ರಮೇಶ್ ಪಾಟೀಲ್",
        phone: "9845012345",
        village: "Sindhanur Rural",
        taluk: "Sindhanur",
        district: "Raichur",
        bankAccountMasked: "XXXX-XXXX-4589",
        ifsc: "SBIN0040123",
      },
      paddyVariety: "PADDY_GRADE_A",
      grossWeight: 2000,
      tareWeight: 0,
      netWeight: 2000,
      moisturePercent: 16.5,
      deductionKg: 0,
      payableWeight: 2000,
      mspRatePaise: 232000,
      grossPayablePaise: 4640000n,
      deductionAmountPaise: 0n,
      finalPayablePaise: 4640000n,
      scalePhotoSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      gpsLat: 15.7745,
      gpsLng: 76.8282,
      deviceTimestamp: "2026-11-02T10:00:00.000Z",
      previousHash: GENESIS_HASH,
      hash: hash1,
      createdAt: "2026-11-02T10:00:00.000Z",
    };

    // An attacker alters payableWeight from 2000 to 1500 without recalculating hash
    const tamperedTx = { ...tx1, payableWeight: 1500 };
    const check = verifyCentreChain([tamperedTx]);
    expect(check.isValid).toBe(false);
    expect(check.reason).toContain("Tampering detected");
  });

  it("generates and verifies farmer QR verification tokens", async () => {
    const token = await generateQrVerificationToken("tx-999", "1002345678");
    expect(token).toBeDefined();

    const verification = await verifyQrToken(token);
    expect(verification.valid).toBe(true);
    expect(verification.transactionId).toBe("tx-999");
    expect(verification.farmerFruitsId).toBe("1002345678");

    // Invalid token check
    const invalidVerification = await verifyQrToken("corrupted-token-xyz");
    expect(invalidVerification.valid).toBe(false);
  });
});
