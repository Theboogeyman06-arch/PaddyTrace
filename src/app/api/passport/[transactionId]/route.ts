import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { formatPaiseToInr, formatWeight, maskName } from "@/lib/math/procurement";
import { generateQrVerificationToken } from "@/lib/crypto/hash-chain";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  const { transactionId } = await params;

  const transaction = await db.transactions.findUnique({
    where: { id: transactionId },
  });

  if (!transaction) {
    return new NextResponse("Transaction not found", { status: 404 });
  }

  const farmer = transaction.farmer;
  const centre = transaction.centre;
  const payment = transaction.payment;

  const origin = request.nextUrl.origin;
  const token = await generateQrVerificationToken(
    transaction.id,
    farmer?.fruitsId || ""
  );
  const verificationUrl = `${origin}/kn/verify/${transaction.id}?t=${token}`;

  const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
    width: 200,
    margin: 1,
    color: {
      dark: "#1b4332",
      light: "#ffffff",
    },
  });

  const formattedNet = formatWeight(transaction.netWeight);
  const formattedGross = formatWeight(transaction.grossWeight);
  const formattedTare = formatWeight(transaction.tareWeight);
  const formattedPayable = formatWeight(transaction.payableWeight);
  const formattedFinalAmount = formatPaiseToInr(transaction.finalPayablePaise);
  const formattedMspRate = formatPaiseToInr(transaction.mspRatePaise);
  const formattedGrossAmount = formatPaiseToInr(transaction.grossPayablePaise);
  const formattedDeductionAmount = formatPaiseToInr(transaction.deductionAmountPaise);
  const dueDateStr = payment ? new Date(payment.dueDate).toLocaleDateString("en-IN") : "N/A";
  const txDateStr = new Date(transaction.createdAt).toLocaleString("en-IN");
  const maskedFarmer = farmer ? maskName(farmer.nameEn) : "Registered Farmer";

  // HTML Printable Official Digital Transaction Passport
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Digital Passport — ${transaction.id}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 24px;
    }
    .passport-border {
      border: 3px double #1b4332;
      border-radius: 8px;
      padding: 24px;
      position: relative;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #2d6a4f;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .title-kn {
      font-size: 20px;
      font-weight: 700;
      color: #1b4332;
      margin: 0;
    }
    .title-en {
      font-size: 16px;
      font-weight: 600;
      color: #2d6a4f;
      margin: 4px 0 0 0;
    }
    .dept-title {
      font-size: 11px;
      color: #64748b;
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .passport-badge {
      display: inline-block;
      background: #1b4332;
      color: #ffffff;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 1px;
      margin-top: 8px;
    }
    .section-title {
      font-size: 13px;
      font-weight: 700;
      color: #1b4332;
      background: #f1f5f9;
      padding: 6px 10px;
      border-left: 4px solid #1b4332;
      margin-top: 16px;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      font-size: 13px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
      font-size: 12px;
    }
    .label {
      color: #64748b;
      font-size: 11px;
      text-transform: uppercase;
    }
    .val {
      font-weight: 600;
      color: #0f172a;
      margin-top: 2px;
    }
    .highlight-box {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 6px;
      padding: 12px;
      margin-top: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .total-amount {
      font-size: 24px;
      font-weight: 800;
      color: #065f46;
    }
    .qr-section {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-top: 20px;
      border-top: 1px dashed #cbd5e1;
      padding-top: 16px;
    }
    .hash-box {
      font-family: monospace;
      font-size: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 8px;
      word-break: break-all;
      color: #334155;
      line-height: 1.4;
    }
    .watermark {
      position: absolute;
      top: 45%;
      left: 20%;
      font-size: 72px;
      font-weight: 900;
      color: rgba(27, 67, 50, 0.04);
      transform: rotate(-30deg);
      pointer-events: none;
      user-select: none;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 16px; text-align: right;">
    <button onclick="window.print()" style="background: #1b4332; color: #fff; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; cursor: pointer;">
      Print / Save as PDF
    </button>
  </div>

  <div class="passport-border">
    <div class="watermark">PADDYTRACE VERIFIED</div>

    <div class="header">
      <div class="title-kn">ಕರ್ನಾಟಕ ಸರ್ಕಾರ — ಆಹಾರ ಮತ್ತು ನಾಗರಿಕ ಸರಬರಾಜು ಇಲಾಖೆ</div>
      <div class="title-en">Government of Karnataka — Department of Food & Civil Supplies</div>
      <div class="dept-title">Digital Transaction Record & Procurement Passport</div>
      <div class="passport-badge">OFFICIAL VERIFICATION PASSPORT</div>
    </div>

    <div class="grid">
      <div>
        <div class="label">Passport / Transaction ID</div>
        <div class="val" style="font-family: monospace; color: #1b4332; font-size: 14px;">${transaction.id}</div>
      </div>
      <div>
        <div class="label">Date & Time of Procurement</div>
        <div class="val">${txDateStr}</div>
      </div>
    </div>

    <div class="section-title">Procurement Centre & Farmer Details</div>
    <div class="grid">
      <div>
        <div class="label">Procurement Centre</div>
        <div class="val">${centre?.nameEn || "Sindhanur APMC Centre"} (${centre?.code || "KA-RCH-01"})</div>
        <div style="font-size: 11px; color: #64748b;">${centre?.district || "Raichur"}, ${centre?.taluk || "Sindhanur"}</div>
      </div>
      <div>
        <div class="label">Farmer Identity (Masked)</div>
        <div class="val">${maskedFarmer}</div>
        <div style="font-size: 11px; color: #64748b;">FRUITS ID: ${farmer?.fruitsId || "1002345678"} | ${farmer?.village || "Rural"}</div>
      </div>
    </div>

    <div class="section-title">Weighing & Quality Deductions</div>
    <div class="grid-3">
      <div>
        <div class="label">Gross Weight</div>
        <div class="val">${formattedGross}</div>
      </div>
      <div>
        <div class="label">Tare Weight</div>
        <div class="val">${formattedTare}</div>
      </div>
      <div>
        <div class="label">Net Received Weight</div>
        <div class="val" style="color: #1b4332;">${formattedNet}</div>
      </div>
    </div>

    <div class="grid-3" style="margin-top: 10px;">
      <div>
        <div class="label">Moisture Content</div>
        <div class="val">${transaction.moisturePercent.toFixed(1)}% (Base 17.0%)</div>
      </div>
      <div>
        <div class="label">Moisture Deduction</div>
        <div class="val" style="color: #dc2626;">-${transaction.deductionKg.toFixed(2)} kg</div>
      </div>
      <div>
        <div class="label">Payable Quantity</div>
        <div class="val" style="color: #065f46; font-size: 14px;">${formattedPayable}</div>
      </div>
    </div>

    <div class="highlight-box">
      <div>
        <div class="label" style="color: #065f46;">Statutory MSP Rate (${transaction.paddyVariety})</div>
        <div style="font-size: 14px; font-weight: 700; color: #1b4332; margin-top: 2px;">
          ${formattedMspRate} / Quintal (100 kg)
        </div>
        <div style="font-size: 11px; color: #065f46; margin-top: 4px;">
          Gross: ${formattedGrossAmount} | Deduction: -${formattedDeductionAmount}
        </div>
      </div>
      <div style="text-align: right;">
        <div class="label" style="color: #065f46;">Total Payable to Farmer (DBT)</div>
        <div class="total-amount">${formattedFinalAmount}</div>
      </div>
    </div>

    <div class="section-title">15-Day Statutory Payment Accountability</div>
    <div class="grid">
      <div>
        <div class="label">Payment Status</div>
        <div class="val" style="color: #16a34a; font-weight: 700;">
          ${payment?.status === "PAID" ? "DISBURSED VIA DBT" : "PENDING (WITHIN 15-DAY SLA)"}
        </div>
      </div>
      <div>
        <div class="label">Statutory SLA Due Date (15 Days)</div>
        <div class="val" style="color: #1b4332;">${dueDateStr}</div>
      </div>
    </div>

    <div class="qr-section">
      <div>
        <img src="${qrDataUrl}" alt="Verification QR Code" width="130" height="130" style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px;" />
      </div>
      <div style="flex: 1;">
        <div style="font-weight: 700; color: #1b4332; font-size: 13px; margin-bottom: 4px;">
          Independent Farmer Verification & Tamper Detection
        </div>
        <div style="font-size: 11px; color: #475569; margin-bottom: 8px;">
          Scan this QR code with any smartphone camera to independently verify weighing authenticity, moisture deductions, and DBT payment status without logging in.
        </div>
        <div class="hash-box">
          <strong>Block Sequence:</strong> #${transaction.sequenceNumber} (Centre: ${centre?.code})<br/>
          <strong>SHA-256 Hash:</strong> ${transaction.hash}<br/>
          <strong>Previous Block:</strong> ${transaction.previousHash}
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

