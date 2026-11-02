import crypto from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { CanonicalTransactionPayload, Transaction } from "../types";

export const GENESIS_HASH = "0".repeat(64);
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "paddytrace-production-cryptographic-secret-2026-secure"
);

/**
 * Produces a strictly deterministic, sorted-key JSON string of the transaction payload.
 */
export function serializeCanonicalPayload(payload: CanonicalTransactionPayload): string {
  const sortedKeys = Object.keys(payload).sort() as (keyof CanonicalTransactionPayload)[];
  const sortedObj: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    sortedObj[key] = payload[key];
  }
  return JSON.stringify(sortedObj);
}

/**
 * Computes SHA-256 hash in lowercase hexadecimal.
 */
export function sha256(data: string): string {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex").toLowerCase();
}

/**
 * Computes transaction hash from canonical payload.
 */
export function computeTransactionHash(payload: CanonicalTransactionPayload): string {
  const canonicalString = serializeCanonicalPayload(payload);
  return sha256(canonicalString);
}

/**
 * Verifies the mathematical and cryptographic integrity of an entire centre's chain.
 */
export function verifyCentreChain(transactions: Transaction[]): {
  isValid: boolean;
  brokenAtSequence?: number;
  reason?: string;
} {
  if (transactions.length === 0) {
    return { isValid: true };
  }

  // Sort by sequence number ascending
  const sorted = [...transactions].sort((a, b) => a.sequenceNumber - b.sequenceNumber);

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const expectedSequence = i + 1;

    // 1. Verify sequence order
    if (current.sequenceNumber !== expectedSequence) {
      return {
        isValid: false,
        brokenAtSequence: current.sequenceNumber,
        reason: `Sequence gap detected: expected ${expectedSequence}, found ${current.sequenceNumber}`,
      };
    }

    // 2. Verify previousHash linking
    if (i === 0) {
      if (current.previousHash !== GENESIS_HASH) {
        return {
          isValid: false,
          brokenAtSequence: current.sequenceNumber,
          reason: `Genesis block previousHash must be 64 zeros, found: ${current.previousHash}`,
        };
      }
    } else {
      const previous = sorted[i - 1];
      if (current.previousHash !== previous.hash) {
        return {
          isValid: false,
          brokenAtSequence: current.sequenceNumber,
          reason: `Hash chain broken at sequence ${current.sequenceNumber}: previousHash ${current.previousHash} does not match block ${previous.sequenceNumber} hash ${previous.hash}`,
        };
      }
    }

    // 3. Recompute hash from block content
    const canonicalPayload: CanonicalTransactionPayload = {
      centreId: current.centreId,
      deductionAmountPaise: Number(current.deductionAmountPaise),
      deductionKg: current.deductionKg,
      farmerFruitsId: current.farmer?.fruitsId || (current as unknown as { farmerFruitsId?: string }).farmerFruitsId || "",
      finalPayablePaise: Number(current.finalPayablePaise),
      gpsLatitude: current.gpsLat || 0,
      gpsLongitude: current.gpsLng || 0,
      grossPayablePaise: Number(current.grossPayablePaise),
      grossWeightKg: current.grossWeight,
      moisturePercentage: current.moisturePercent,
      mspRatePerQuintalPaise: current.mspRatePaise,
      netWeightKg: current.netWeight,
      paddyVariety: current.paddyVariety,
      payableWeightKg: current.payableWeight,
      previousHash: current.previousHash,
      scalePhotoSha256: current.scalePhotoSha256,
      sequenceNumber: current.sequenceNumber,
      tareWeightKg: current.tareWeight,
      timestampIso: current.deviceTimestamp,
      transactionId: current.id,
    };

    const recomputedHash = computeTransactionHash(canonicalPayload);
    if (recomputedHash !== current.hash) {
      return {
        isValid: false,
        brokenAtSequence: current.sequenceNumber,
        reason: `Tampering detected at block ${current.sequenceNumber}: stored hash ${current.hash} does not match computed hash ${recomputedHash}`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Generates a signed QR token with farmer transaction verification claim.
 */
export async function generateQrVerificationToken(
  transactionId: string,
  farmerFruitsId: string
): Promise<string> {
  return await new SignJWT({
    tid: transactionId,
    fid: farmerFruitsId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("paddytrace.karnataka.gov.in")
    // Long-lived signature for physical paper receipts (e.g. 180 days)
    .setExpirationTime("180d")
    .sign(JWT_SECRET);
}

/**
 * Verifies a signed QR token.
 */
export async function verifyQrToken(
  token: string
): Promise<{ valid: boolean; transactionId?: string; farmerFruitsId?: string }> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: "paddytrace.karnataka.gov.in",
    });
    return {
      valid: true,
      transactionId: payload.tid as string,
      farmerFruitsId: payload.fid as string,
    };
  } catch {
    return { valid: false };
  }
}
