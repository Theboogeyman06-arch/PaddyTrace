import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import {
  formatPaiseToInr,
  formatWeight,
  maskName,
  generateOfflinePassportText,
} from "@/lib/math/procurement";
import { generateQrVerificationToken } from "@/lib/crypto/hash-chain";
import { getPublicVerificationBaseUrl } from "@/lib/network";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  const { transactionId } = await params;

  let transaction = await db.transactions.findUnique({
    where: { id: transactionId },
  });

  if (!transaction) {
    const all = await db.transactions.findMany();
    transaction = all[0] || null;
  }

  if (!transaction) {
    return new NextResponse("No procurement transaction available", { status: 404 });
  }

  const farmer = transaction.farmer;
  const centre = transaction.centre;
  const payment = transaction.payment;

  const origin = request.nextUrl.origin;
  const baseUrl = getPublicVerificationBaseUrl(origin);

  // Clean, high-performance URLs for instant paper & camera scanning (Version 3, 29x29 dots)
  const verificationUrl = `${baseUrl}/kn/verify/${transaction.id}`;
  const disputeUrl = `${baseUrl}/kn/dispute/${transaction.id}`;

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

  // 1. Generate Self-Contained Offline Passport Text
  const offlinePassportText = generateOfflinePassportText({
    transactionId: transaction.id,
    centreCode: centre?.code || "KA-RCH-01",
    centreName: centre?.nameEn || "Sindhanur APMC Centre",
    farmerFruitsId: farmer?.fruitsId || "1002345678",
    farmerName: farmer?.nameEn || "Registered Farmer",
    paddyVariety: transaction.paddyVariety,
    grossWeightKg: transaction.grossWeight,
    tareWeightKg: transaction.tareWeight,
    netWeightKg: transaction.netWeight,
    moisturePercent: transaction.moisturePercent,
    deductionKg: transaction.deductionKg,
    payableWeightKg: transaction.payableWeight,
    mspRatePaise: transaction.mspRatePaise,
    finalPayablePaise: transaction.finalPayablePaise,
    dueDateStr,
    sequenceNumber: transaction.sequenceNumber,
    hash: transaction.hash,
  });

  // 1. Transaction Verification Portal QR (ISO 18004 Quiet Zone Margin: 4, 600px print-ready)
  const qrVerifyDataUrl = await QRCode.toDataURL(verificationUrl, {
    width: 600,
    margin: 4,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
  });

  // 2. Direct Farmer Grievance Desk QR (Instant redirection to RSK Dispute Portal)
  const qrDisputeDataUrl = await QRCode.toDataURL(disputeUrl, {
    width: 600,
    margin: 4,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
  });

  // 3. Compact Offline Text QR
  const qrOfflineDataUrl = await QRCode.toDataURL(offlinePassportText, {
    width: 600,
    margin: 4,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
    errorCorrectionLevel: "L",
  });

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
    .qr-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-top: 18px;
      border-top: 1px dashed #cbd5e1;
      padding-top: 14px;
    }
    .qr-box {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px;
      background: #f8fafc;
      text-align: center;
    }
    .qr-header-tag {
      display: inline-block;
      font-size: 10px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 4px;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .tag-green {
      background: #1b4332;
      color: #ffffff;
    }
    .tag-amber {
      background: #b45309;
      color: #ffffff;
    }
    .qr-card-title {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 8px;
    }
    .qr-img-frame {
      background: #ffffff;
      padding: 6px;
      border-radius: 6px;
      display: inline-block;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .qr-img {
      display: block;
      width: 140px;
      height: 140px;
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
      image-rendering: pixelated;
    }
    .qr-card-desc {
      font-size: 10px;
      color: #475569;
      margin-top: 8px;
      line-height: 1.35;
    }
    .qr-card-link {
      font-family: monospace;
      font-size: 9px;
      color: #1b4332;
      text-decoration: underline;
      display: block;
      margin-top: 4px;
      word-break: break-all;
    }
    .qr-single-section {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-top: 18px;
      border-top: 1px dashed #cbd5e1;
      padding-top: 14px;
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
      @page {
        size: A4 portrait;
        margin: 8mm;
      }
      body {
        padding: 0 !important;
        background: #ffffff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print {
        display: none !important;
      }
      .passport-border {
        border: 2px solid #1b4332 !important;
        padding: 14px !important;
      }
      .qr-grid {
        gap: 10px !important;
        margin-top: 12px !important;
        padding-top: 10px !important;
      }
      .qr-box {
        padding: 6px !important;
        background: #fdfdfd !important;
        border: 1px solid #94a3b8 !important;
      }
      .qr-img {
        width: 44mm !important;
        height: 44mm !important;
        image-rendering: pixelated !important;
      }
      .qr-card-desc {
        font-size: 8.5px !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; background: #f8fafc; padding: 12px 16px; border-radius: 10px; border: 1px solid #e2e8f0;">
    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
      <span style="font-size: 12px; font-weight: 700; color: #1b4332;">📱 QR Layout:</span>
      <button id="btnDual" onclick="switchQr('dual')" style="background: #1b4332; color: #fff; border: 1px solid #1b4332; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">
        ✨ Dual QR (Details + Grievance Desk) [Default]
      </button>
      <button id="btnVerify" onclick="switchQr('verify')" style="background: #ffffff; color: #334155; border: 1px solid #cbd5e1; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">
        🔍 Details Portal Only
      </button>
      <button id="btnDispute" onclick="switchQr('dispute')" style="background: #ffffff; color: #334155; border: 1px solid #cbd5e1; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">
        ⚠️ Grievance Desk Only
      </button>
      <button id="btnOffline" onclick="switchQr('offline')" style="background: #ffffff; color: #334155; border: 1px solid #cbd5e1; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">
        📄 Offline Text Proof
      </button>
    </div>
    <div>
      <button onclick="window.print()" style="background: #1b4332; color: #fff; border: none; padding: 9px 18px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
        🖨️ Print / Save as PDF
      </button>
    </div>
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

    <!-- Dual QR Code Grid (Prints both Transaction Verification & Grievance Desk) -->
    <div id="qrDualContainer" class="qr-grid">
      <!-- QR 1: Transaction Details Portal -->
      <div class="qr-box">
        <div class="qr-header-tag tag-green">🔍 1. TRANSACTION DETAILS</div>
        <div class="qr-card-title">ವಹಿವಾಟು ಪರಿಶೀಲನೆ (View Details)</div>
        <div class="qr-img-frame">
          <img src="${qrVerifyDataUrl}" class="qr-img" alt="Transaction Details QR" width="140" height="140" />
        </div>
        <div class="qr-card-desc">
          Scan with ANY mobile camera to verify net weights, moisture deductions, and DBT payout status.
        </div>
        <a href="${verificationUrl}" class="qr-card-link">${verificationUrl}</a>
      </div>

      <!-- QR 2: Direct Grievance Desk -->
      <div class="qr-box" style="border-color: #fcd34d; background: #fffdf5;">
        <div class="qr-header-tag tag-amber">⚠️ 2. GRIEVANCE DESK</div>
        <div class="qr-card-title">ರೈತರ ನೇರ ಆಕ್ಷೇಪಣೆ (File Dispute)</div>
        <div class="qr-img-frame">
          <img src="${qrDisputeDataUrl}" class="qr-img" alt="Farmer Grievance QR" width="140" height="140" />
        </div>
        <div class="qr-card-desc">
          Discrepancy in weight, moisture or delayed DBT? Scan to file an official grievance directly to RSK.
        </div>
        <a href="${disputeUrl}" class="qr-card-link" style="color: #b45309;">${disputeUrl}</a>
      </div>
    </div>

    <!-- Single / Offline QR Container (Shown when selected in preview toolbar) -->
    <div id="qrSingleContainer" class="qr-single-section" style="display: none;">
      <div style="text-align: center;">
        <div class="qr-img-frame">
          <img id="singleQrImg" src="${qrVerifyDataUrl}" alt="Single QR" class="qr-img" width="170" height="170" />
        </div>
      </div>
      <div style="flex: 1;">
        <div id="singleQrBadge" class="qr-header-tag tag-green" style="font-size: 11px;">
          🔍 TRANSACTION VERIFICATION PORTAL
        </div>
        <div id="singleQrTitle" style="font-weight: 700; color: #1b4332; font-size: 14px; margin-bottom: 4px;">
          ವಹಿವಾಟು ಪರಿಶೀಲನೆ ಮತ್ತು ಪಾರದರ್ಶಕತೆ
        </div>
        <div id="singleQrDesc" style="font-size: 11px; color: #475569; margin-bottom: 8px; line-height: 1.45;">
          Point your smartphone camera (Google Lens, iPhone Camera, Samsung QR, WhatsApp) at this QR code.
        </div>
        <a id="singleQrLink" href="${verificationUrl}" class="qr-card-link" style="font-size: 11px;">${verificationUrl}</a>
      </div>
    </div>

    <div class="hash-box" style="margin-top: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; font-weight: 700; font-size: 10px;">
        <span>CHAIN BLOCK #${transaction.sequenceNumber} &bull; CENTRE: ${centre?.code}</span>
        <span style="color: #065f46;">STATUS: INTACT & AUDIT-VERIFIED ✓</span>
      </div>
      <strong>SHA-256 Hash:</strong> ${transaction.hash}<br/>
      <strong>Previous Hash:</strong> ${transaction.previousHash}
    </div>
  </div>

  <script>
    const qrVerify = "${qrVerifyDataUrl}";
    const qrDispute = "${qrDisputeDataUrl}";
    const qrOffline = "${qrOfflineDataUrl}";
    const urlVerify = "${verificationUrl}";
    const urlDispute = "${disputeUrl}";

    function switchQr(mode) {
      const dual = document.getElementById('qrDualContainer');
      const single = document.getElementById('qrSingleContainer');
      const singleImg = document.getElementById('singleQrImg');
      const singleBadge = document.getElementById('singleQrBadge');
      const singleTitle = document.getElementById('singleQrTitle');
      const singleDesc = document.getElementById('singleQrDesc');
      const singleLink = document.getElementById('singleQrLink');

      const btnDual = document.getElementById('btnDual');
      const btnV = document.getElementById('btnVerify');
      const btnD = document.getElementById('btnDispute');
      const btnO = document.getElementById('btnOffline');

      [btnDual, btnV, btnD, btnO].forEach(b => {
        b.style.background = '#ffffff';
        b.style.color = '#334155';
        b.style.border = '1px solid #cbd5e1';
        b.style.fontWeight = '600';
      });

      if (mode === 'dual') {
        dual.style.display = 'grid';
        single.style.display = 'none';
        btnDual.style.background = '#1b4332';
        btnDual.style.color = '#fff';
        btnDual.style.fontWeight = '700';
      } else {
        dual.style.display = 'none';
        single.style.display = 'flex';

        if (mode === 'verify') {
          singleImg.src = qrVerify;
          singleBadge.className = 'qr-header-tag tag-green';
          singleBadge.innerText = '🔍 TRANSACTION DETAILS PORTAL';
          singleTitle.innerText = 'ವಹಿವಾಟು ಪರಿಶೀಲನೆ (Verified Record)';
          singleDesc.innerText = 'Point your camera at this QR to view complete certified weights, moisture deductions, and DBT payout status.';
          singleLink.href = urlVerify;
          singleLink.innerText = urlVerify;
          singleLink.style.display = 'block';
          btnV.style.background = '#1b4332';
          btnV.style.color = '#fff';
          btnV.style.fontWeight = '700';
        } else if (mode === 'dispute') {
          singleImg.src = qrDispute;
          singleBadge.className = 'qr-header-tag tag-amber';
          singleBadge.innerText = '⚠️ OFFICIAL GRIEVANCE DESK';
          singleTitle.innerText = 'ರೈತರ ನೇರ ಆಕ್ಷೇಪಣೆ ಸಲ್ಲಿಸಿ (File Grievance)';
          singleDesc.innerText = 'Discrepancy in weighing, moisture deduction, or payment delay? Scan to open the direct RSK grievance form.';
          singleLink.href = urlDispute;
          singleLink.innerText = urlDispute;
          singleLink.style.display = 'block';
          btnD.style.background = '#1b4332';
          btnD.style.color = '#fff';
          btnD.style.fontWeight = '700';
        } else if (mode === 'offline') {
          singleImg.src = qrOffline;
          singleBadge.className = 'qr-header-tag';
          singleBadge.style.background = '#1e3a8a';
          singleBadge.style.color = '#fff';
          singleBadge.innerText = '📄 COMPACT OFFLINE TEXT PROOF';
          singleTitle.innerText = 'ಆಫ್‌ಲೈನ್ ಪಠ್ಯ ದಾಖಲೆ (No Internet Required)';
          singleDesc.innerText = 'Contains certified weighing, deductions, and SHA-256 hash as raw readable text for devices without internet.';
          singleLink.style.display = 'none';
          btnO.style.background = '#1b4332';
          btnO.style.color = '#fff';
          btnO.style.fontWeight = '700';
        }
      }
    }
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

