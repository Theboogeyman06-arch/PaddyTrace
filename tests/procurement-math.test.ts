import { describe, it, expect } from "vitest";
import {
  calculateNetWeight,
  calculateMoistureDeduction,
  calculateProcurementValues,
  formatPaiseToInr,
  formatWeight,
  maskName,
  maskPhone,
  generateOfflinePassportText,
} from "../src/lib/math/procurement";

describe("Procurement Mathematical Primitives", () => {
  it("calculates net weight accurately without float distortion", () => {
    // Gross 5000.55 kg, Tare 250.25 kg -> 4750.30 kg
    const net = calculateNetWeight(5000.55, 250.25);
    expect(net).toBe(4750.3);
  });

  it("throws error when gross <= tare", () => {
    expect(() => calculateNetWeight(100, 100)).toThrow();
    expect(() => calculateNetWeight(50, 100)).toThrow();
  });

  it("applies 0% deduction when moisture is at or below 17.0%", () => {
    const res = calculateMoistureDeduction(1000, 16.5);
    expect(res.deductionPercent).toBe(0);
    expect(res.deductionKg).toBe(0);
    expect(res.payableWeightKg).toBe(1000);
  });

  it("applies 1% deduction per 1% excess moisture above 17.0%", () => {
    // 19.5% moisture -> 2.5% excess -> 2.5% deduction on 2000 kg = 50 kg deduction
    const res = calculateMoistureDeduction(2000, 19.5);
    expect(res.deductionPercent).toBe(2.5);
    expect(res.deductionKg).toBe(50);
    expect(res.payableWeightKg).toBe(1950);
  });

  it("computes integer paise amounts exactly for MSP ₹2,320/qtl", () => {
    // 2000 kg gross, 0 kg tare -> net 2000 kg. 17% moisture -> 0 deduction.
    // 2000 kg = 20 quintals.
    // 20 quintals * 232,000 paise = 4,640,000 paise = ₹46,400.00
    const values = calculateProcurementValues(2000, 0, 17.0, 232000);
    expect(values.netWeightKg).toBe(2000);
    expect(values.payableWeightKg).toBe(2000);
    expect(values.finalPayablePaise).toBe(4640000n);
    expect(formatPaiseToInr(values.finalPayablePaise)).toBe("₹46,400.00");
  });

  it("handles complex decimal moisture and weights with correct paise rounding", () => {
    // Gross: 3540.50 kg, Tare: 140.50 kg -> Net: 3400.00 kg
    // Moisture: 18.2% -> 1.2% deduction -> Deduction Kg: 40.8 kg -> Payable: 3359.2 kg
    // MSP: 230,000 paise (₹2,300/qtl)
    // Payable quintals: 33.592 -> 33.592 * 230,000 = 7,726,160 paise
    const values = calculateProcurementValues(3540.5, 140.5, 18.2, 230000);
    expect(values.netWeightKg).toBe(3400);
    expect(values.deductionPercent).toBe(1.2);
    expect(values.deductionKg).toBe(40.8);
    expect(values.payableWeightKg).toBe(3359.2);
    expect(values.finalPayablePaise).toBe(7726160n);
    expect(formatPaiseToInr(values.finalPayablePaise)).toBe("₹77,261.60");
  });

  it("formats weight and masks PII properly", () => {
    expect(formatWeight(4500)).toBe("4,500.00 kg (45.00 Qtl)");
    expect(maskName("Basavaraj Gowda")).toBe("B*******j G***a");
    expect(maskPhone("9845012345")).toBe("98******45");
  });

  it("generates structured offline self-contained passport text payload", () => {
    const text = generateOfflinePassportText({
      transactionId: "TX-TEST-999",
      centreCode: "KA-RCH-01",
      farmerFruitsId: "1002345678",
      farmerName: "Ramesh Patil",
      netWeightKg: 4250,
      moisturePercent: 16.5,
      finalPayablePaise: 9860000n,
      hash: "abc123def456",
    });
    expect(text).toContain("TX-TEST-999");
    expect(text).toContain("1002345678");
    expect(text).toContain("R****h P***l");
    expect(text).toContain("4250.00 kg");
    expect(text).toContain("₹98,600.00");
    expect(text).toContain("abc123def456");
    expect(text).toContain("PaddyTrace Karnataka");
  });
});

