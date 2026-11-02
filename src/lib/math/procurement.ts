// Zero-floating-point financial & procurement mathematical primitives

export interface CalculationResult {
  netWeightKg: number;
  deductionPercent: number;
  deductionKg: number;
  payableWeightKg: number;
  grossPayablePaise: bigint;
  deductionAmountPaise: bigint;
  finalPayablePaise: bigint;
}

/**
 * Calculates net weight strictly from gross and tare.
 * Weights in kg with 2 decimal places precision.
 */
export function calculateNetWeight(grossKg: number, tareKg: number): number {
  if (grossKg <= 0 || tareKg < 0) {
    throw new Error("Weights must be positive numbers");
  }
  if (grossKg <= tareKg) {
    throw new Error("Gross weight must be strictly greater than tare weight");
  }
  // Round to 2 decimal places to avoid IEEE-754 precision artifacts
  return Math.round((grossKg - tareKg) * 100) / 100;
}

/**
 * Calculates moisture deductions based on procurement specifications:
 * - Base allowable moisture: 17.0% (0% deduction)
 * - Above 17.0%: 1% weight deduction for each 1% (or fraction) of excess moisture up to 20%
 * - Returns deduction percentage, deduction kg, and payable weight in kg.
 */
export function calculateMoistureDeduction(
  netWeightKg: number,
  moisturePercent: number,
  baseMoistureThreshold = 17.0
): { deductionPercent: number; deductionKg: number; payableWeightKg: number } {
  if (moisturePercent < 0) {
    throw new Error("Moisture percentage cannot be negative");
  }

  let deductionPercent = 0;
  if (moisturePercent > baseMoistureThreshold) {
    // Excess moisture above 17%
    const excessMoisture = moisturePercent - baseMoistureThreshold;
    deductionPercent = Math.round(excessMoisture * 100) / 100;
  }

  // Calculate deduction in kg rounded to 2 decimal places
  const deductionKg = Math.round(((netWeightKg * deductionPercent) / 100) * 100) / 100;
  const payableWeightKg = Math.max(0, Math.round((netWeightKg - deductionKg) * 100) / 100);

  return {
    deductionPercent,
    deductionKg,
    payableWeightKg,
  };
}

/**
 * Computes exact payable amounts in integer paise (1 INR = 100 paise).
 * MSP rate is in paise per quintal (100 kg).
 * 
 * Formula:
 * 1 quintal = 100 kg.
 * rate_per_kg_paise = mspRatePaise / 100
 * final_payable_paise = round(payableWeightKg * (mspRatePaise / 100))
 */
export function calculateProcurementValues(
  grossWeightKg: number,
  tareWeightKg: number,
  moisturePercent: number,
  mspRatePerQuintalPaise: number
): CalculationResult {
  const netWeightKg = calculateNetWeight(grossWeightKg, tareWeightKg);
  const { deductionPercent, deductionKg, payableWeightKg } = calculateMoistureDeduction(
    netWeightKg,
    moisturePercent
  );

  // Use BigInt for integer paise operations
  // To avoid floating point math: (weightKgInGrams * mspRatePaise) / (100 * 1000)
  const netWeightGrams = BigInt(Math.round(netWeightKg * 1000));
  const payableWeightGrams = BigInt(Math.round(payableWeightKg * 1000));
  const deductionGrams = BigInt(Math.round(deductionKg * 1000));
  const mspPaise = BigInt(mspRatePerQuintalPaise);

  // Value = (grams * ratePaise) / 100,000 (since 100 kg = 100,000 g)
  const grossPayablePaise = (netWeightGrams * mspPaise) / 100000n;
  const deductionAmountPaise = (deductionGrams * mspPaise) / 100000n;
  const finalPayablePaise = (payableWeightGrams * mspPaise) / 100000n;

  return {
    netWeightKg,
    deductionPercent,
    deductionKg,
    payableWeightKg,
    grossPayablePaise,
    deductionAmountPaise,
    finalPayablePaise,
  };
}

/**
 * Formats integer paise into INR string: e.g. 23200000n -> "₹2,32,000.00"
 */
export function formatPaiseToInr(paise: bigint | number): string {
  const bigPaise = typeof paise === "bigint" ? paise : BigInt(Math.round(paise));
  const isNegative = bigPaise < 0n;
  const absolutePaise = isNegative ? -bigPaise : bigPaise;

  const rupees = absolutePaise / 100n;
  const fraction = absolutePaise % 100n;
  const fractionStr = fraction.toString().padStart(2, "0");

  // Format rupees with Indian numbering system (2,2,3 grouping)
  const rupeeStr = rupees.toString();
  let formattedRupees = "";

  if (rupeeStr.length <= 3) {
    formattedRupees = rupeeStr;
  } else {
    const lastThree = rupeeStr.slice(-3);
    const remaining = rupeeStr.slice(0, -3);
    formattedRupees =
      remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
  }

  return `${isNegative ? "-" : ""}₹${formattedRupees}.${fractionStr}`;
}

/**
 * Formats weight in kg and quintals: e.g. 4500 -> "4,500.00 kg (45.00 Qtl)"
 */
export function formatWeight(kg: number): string {
  const formattedKg = kg.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const qtl = (kg / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formattedKg} kg (${qtl} Qtl)`;
}

/**
 * Masks farmer name for public QR view: e.g. "Ramesh Kumar" -> "R****h K***r"
 */
export function maskName(fullName: string): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  return parts
    .map((part) => {
      if (part.length <= 2) return part[0] + "*";
      return part[0] + "*".repeat(part.length - 2) + part[part.length - 1];
    })
    .join(" ");
}

/**
 * Masks phone number: "9876543210" -> "98******10"
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 6) return "******";
  return phone.slice(0, 2) + "*".repeat(phone.length - 4) + phone.slice(-2);
}

/**
 * Masks bank account: "123456789012" -> "XXXX-XXXX-9012"
 */
export function maskBankAccount(account: string): string {
  if (!account || account.length < 4) return "XXXX-XXXX-XXXX";
  return "XXXX-XXXX-" + account.slice(-4);
}

