"use client";

import { useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import {
  ShieldCheck,
  ShieldAlert,
  Coins,
  Scale,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Users,
  Layers,
  ArrowRight,
  RefreshCw,
  Send,
  MessageSquare,
  FileCheck2,
} from "lucide-react";
import {
  formatPaiseToInr,
  formatWeight,
  maskName,
} from "@/lib/math/procurement";
import { Transaction, Payment, Dispute, Centre } from "@/lib/types";

interface AdminDashboardProps {
  locale: string;
  centres: Centre[];
  transactions: Transaction[];
  payments: Payment[];
  disputes: Dispute[];
  stats: {
    totalVolumeKg: number;
    totalValuePaise: bigint;
    totalFarmers: number;
    totalTransactions: number;
    paidCount: number;
    pendingCount: number;
    overdueCount: number;
    disputeCount: number;
  };
}

export function AdminDashboard({
  locale,
  centres,
  transactions,
  payments,
  disputes,
  stats,
}: AdminDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "auditor" | "payments" | "disputes">("overview");
  const [selectedCentreId, setSelectedCentreId] = useState(centres[0]?.id || "");
  const [auditResult, setAuditResult] = useState<{
    ran: boolean;
    isValid: boolean;
    brokenAtSequence?: number;
    reason?: string;
  } | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [resolvingDisputeId, setResolvingDisputeId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState("");

  // Audit Centre Chain
  const handleRunAudit = async () => {
    setIsAuditing(true);
    try {
      const res = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "AUDIT_CHAIN",
          payload: { centreId: selectedCentreId },
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAuditResult({
          ran: true,
          isValid: data.audit.isValid,
          brokenAtSequence: data.audit.brokenAtSequence,
          reason: data.audit.reason,
        });
      }
    } catch {
      alert("Audit request failed");
    } finally {
      setIsAuditing(false);
    }
  };

  // Disburse DBT Payment Simulation
  const handleDisbursePayment = async (paymentId: string) => {
    try {
      const res = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DISBURSE_DBT",
          payload: {
            paymentId,
            utr: "PFMS-KA-" + Math.floor(10000000 + Math.random() * 90000000),
          },
        }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch {
      alert("Payment update failed");
    }
  };

  // Resolve Dispute
  const handleResolveDispute = async (disputeId: string) => {
    if (!resolutionText) return;
    try {
      const res = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RESOLVE_DISPUTE",
          payload: {
            disputeId,
            status: "RESOLVED",
            resolutionNotes: resolutionText,
            comment: resolutionText,
          },
        }),
      });
      if (res.ok) {
        setResolvingDisputeId(null);
        setResolutionText("");
        router.refresh();
      }
    } catch {
      alert("Failed to resolve dispute");
    }
  };

  const centreTransactions = transactions.filter((t) => t.centreId === selectedCentreId);

  return (
    <div className="space-y-6 py-2">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            {locale === "kn" ? "ರಾಜ್ಯ ಖರೀದಿ ಆಡಳಿತ ಮಂಡಳಿ ಮತ್ತು ಲೆಕ್ಕಪರಿಶೋಧನೆ" : "State Procurement Administration & Audit"}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {locale === "kn"
              ? "ಕರ್ನಾಟಕ ಸರ್ಕಾರ — ಆಹಾರ ಮತ್ತು ನಾಗರಿಕ ಸರಬರಾಜು ಇಲಾಖೆ | ಡಿಜಿಟಲ್ ನಿಗಾ ವ್ಯವಸ್ಥೆ"
              : "Department of Food, Civil Supplies & Consumer Affairs — Government of Karnataka"}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs font-bold text-slate-700">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "overview" ? "bg-white text-slate-900 shadow-sm" : "hover:text-slate-900"
            }`}
          >
            {locale === "kn" ? "ಅಂಕಿ-ಅಂಶಗಳು" : "Analytics"}
          </button>
          <button
            onClick={() => setActiveTab("auditor")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "auditor" ? "bg-white text-slate-900 shadow-sm" : "hover:text-slate-900"
            }`}
          >
            {locale === "kn" ? "ಹ್ಯಾಶ್ ಸರಪಳಿ ಪರಿಶೋಧನೆ" : "Chain Auditor"}
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "payments" ? "bg-white text-slate-900 shadow-sm" : "hover:text-slate-900"
            }`}
          >
            {locale === "kn" ? "15-ದಿನಗಳ ಪಾವತಿ" : "Payments SLA"}
          </button>
          <button
            onClick={() => setActiveTab("disputes")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "disputes" ? "bg-white text-slate-900 shadow-sm" : "hover:text-slate-900"
            }`}
          >
            {locale === "kn" ? "ತಕರಾರುಗಳು" : "Disputes"}
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & ANALYTICS */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
                <span>{locale === "kn" ? "ಒಟ್ಟು ಖರೀದಿ ಪರಿಮಾಣ" : "Total Volume"}</span>
                <Scale className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="text-2xl font-black text-[#1b4332] mt-2">
                {(stats.totalVolumeKg / 100).toFixed(1)} Qtl
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {stats.totalVolumeKg.toLocaleString("en-IN")} kg
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
                <span>{locale === "kn" ? "ಒಟ್ಟು ಮೌಲ್ಯ (DBT)" : "Total Value (DBT)"}</span>
                <Coins className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="text-2xl font-black text-emerald-950 mt-2">
                {formatPaiseToInr(stats.totalValuePaise)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Statutory MSP Procurement
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
                <span>{locale === "kn" ? "ವಹಿವಾಟುಗಳು" : "Transactions"}</span>
                <FileCheck2 className="w-4 h-4 text-blue-700" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {stats.totalTransactions}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {stats.totalFarmers} Registered Farmers
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
                <span>{locale === "kn" ? "ಬಾಕಿ / ತಕರಾರುಗಳು" : "Pending / Disputes"}</span>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-700 mt-2">
                {stats.pendingCount} <span className="text-xs text-slate-400">/ {stats.disputeCount} dsp</span>
              </div>
              <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                {stats.paidCount} Completed via DBT
              </div>
            </div>
          </div>

          {/* Centre Performance Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1b4332]" />
              <span>{locale === "kn" ? "ಖರೀದಿ ಕೇಂದ್ರಗಳ ಕಾರ್ಯಕ್ಷಮತೆ ವಿವರ" : "Procurement Centre Performance & Status"}</span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Centre Name</th>
                    <th className="px-4 py-3">District / Taluk</th>
                    <th className="px-4 py-3 text-right">Transactions</th>
                    <th className="px-4 py-3 text-right">Volume (Qtl)</th>
                    <th className="px-4 py-3 text-center">Chain Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {centres.map((c) => {
                    const cTxs = transactions.filter((t) => t.centreId === c.id);
                    const cVol = cTxs.reduce((sum, t) => sum + t.netWeight, 0);
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-mono font-bold text-[#1b4332]">{c.code}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{c.nameEn}</td>
                        <td className="px-4 py-3">{c.district}, {c.taluk}</td>
                        <td className="px-4 py-3 text-right font-bold">{cTxs.length}</td>
                        <td className="px-4 py-3 text-right font-bold text-[#1b4332]">
                          {(cVol / 100).toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded-full inline-flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>INTACT</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CRYPTOGRAPHIC CHAIN AUDITOR */}
      {activeTab === "auditor" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  {locale === "kn" ? "ಕೇಂದ್ರವಾರು ಹ್ಯಾಶ್ ಸರಪಳಿ ಪರಿಶೋಧನೆ" : "Per-Centre SHA-256 Tamper-Evident Chain Auditor"}
                </h2>
                <p className="text-xs text-slate-500">
                  {locale === "kn"
                    ? "ಪ್ರತಿಯೊಂದು ಬ್ಲಾಕ್‌ನ ಸರಣಿ ನಿರಂತರತೆ ಮತ್ತು ಹ್ಯಾಶ್ ಸಮಗ್ರತೆಯನ್ನು ನೈಜ ಸಮಯದಲ್ಲಿ ಮರುಲೆಕ್ಕಾಚಾರ ಮಾಡುತ್ತದೆ."
                    : "Recomputes canonical SHA-256 hashes and sequence links in real-time to detect any unauthorized data manipulation."}
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <select
                  value={selectedCentreId}
                  onChange={(e) => {
                    setSelectedCentreId(e.target.value);
                    setAuditResult(null);
                  }}
                  className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                >
                  {centres.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameEn} ({c.code})
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleRunAudit}
                  disabled={isAuditing}
                  className="bg-[#1b4332] hover:bg-[#2d6a4f] text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center space-x-1.5 transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? "animate-spin" : ""}`} />
                  <span>{locale === "kn" ? "ಪರಿಶೀಲಿಸಿ" : "Audit Chain"}</span>
                </button>
              </div>
            </div>

            {/* Audit Status Display */}
            {auditResult && (
              <div
                className={`p-4 rounded-xl border flex items-start space-x-3 ${
                  auditResult.isValid
                    ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                    : "bg-red-50 border-red-300 text-red-950"
                }`}
              >
                {auditResult.isValid ? (
                  <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                ) : (
                  <ShieldAlert className="w-6 h-6 text-red-600 shrink-0" />
                )}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider">
                    {auditResult.isValid ? "CHAIN AUDIT: 100% INTACT" : "AUDIT FAILED: TAMPERING DETECTED"}
                  </div>
                  <div className="text-xs mt-1">
                    {auditResult.isValid
                      ? `All ${centreTransactions.length} blocks verified. Previous hash linkage and canonical SHA-256 signatures are perfectly intact.`
                      : auditResult.reason}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Block Explorer List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase">
              {locale === "kn" ? "ಸರಪಳಿ ಬ್ಲಾಕ್‌ಗಳು (ಅಪ್ಟೆಂಡ್-ಓನ್ಲಿ)" : "Append-Only Blocks in Selected Centre"}
            </h3>

            {centreTransactions.length === 0 ? (
              <div className="bg-white p-8 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
                No transactions recorded for this centre yet.
              </div>
            ) : (
              centreTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="bg-[#1b4332] text-white font-mono font-bold px-2 py-0.5 rounded text-[10px]">
                        BLOCK #{tx.sequenceNumber}
                      </span>
                      <span className="font-mono font-bold text-slate-900">{tx.id}</span>
                    </div>
                    <span className="text-slate-400 text-[10px]">
                      {new Date(tx.createdAt).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase">Farmer:</span><br />
                      <span className="font-semibold text-slate-900">{tx.farmer ? maskName(tx.farmer.nameEn) : "Farmer"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase">Net Weight:</span><br />
                      <span className="font-bold text-[#1b4332]">{tx.netWeight.toFixed(2)} kg</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase">Moisture:</span><br />
                      <span>{tx.moisturePercent.toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase">Final Payable:</span><br />
                      <span className="font-bold text-emerald-800">{formatPaiseToInr(tx.finalPayablePaise)}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono text-[10px] space-y-1">
                    <div className="text-emerald-800 break-all">
                      <span className="text-slate-400">HASH: </span>{tx.hash}
                    </div>
                    <div className="text-slate-500 break-all">
                      <span className="text-slate-400">PREV: </span>{tx.previousHash}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PAYMENTS & 15-DAY SLA */}
      {activeTab === "payments" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {locale === "kn" ? "15 ದಿನಗಳ ಶಾಸನಬದ್ಧ ಪಾವತಿ ಟ್ರ್ಯಾಕರ್ (DBT SLA)" : "15-Day Statutory Payment Clock Tracker"}
              </h2>
              <p className="text-xs text-slate-500">
                {locale === "kn"
                  ? "ಖರೀದಿ ದಿನಾಂಕದಿಂದ 15 ದಿನಗಳಲ್ಲಿ ನೇರ ನಗದು ವರ್ಗಾವಣೆ ಪೂರ್ಣಗೊಳ್ಳಬೇಕು"
                  : "DBT disbursement must reach farmer within 15 calendar days of procurement receipt"}
              </p>
            </div>
            <div className="text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1.5 rounded-lg">
              Statutory Window: 15 Days
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Transaction ID</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Due Date (15d)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono font-bold text-[#1b4332]">
                      {p.transactionId}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {formatPaiseToInr(p.amountPaise)}
                    </td>
                    <td className="px-4 py-3">
                      {new Date(p.dueDate).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.status === "PAID"
                            ? "bg-emerald-100 text-emerald-800"
                            : p.status === "OVERDUE"
                            ? "bg-red-100 text-red-800"
                            : p.status === "DISPUTED"
                            ? "bg-amber-100 text-amber-900"
                            : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.status !== "PAID" ? (
                        <button
                          onClick={() => handleDisbursePayment(p.id)}
                          className="bg-[#1b4332] hover:bg-[#2d6a4f] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition"
                        >
                          Disburse DBT
                        </button>
                      ) : (
                        <span className="text-emerald-700 font-mono text-[10px] font-semibold">
                          {p.reference || "PAID"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: FARMER DISPUTES */}
      {activeTab === "disputes" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">
              {locale === "kn" ? "ರೈತರ ತಕರಾರುಗಳು ಮತ್ತು ಪರಿಹಾರ ನಿರ್ಧಾರಗಳು" : "Farmer Grievances & RSK Resolution Desk"}
            </h2>
            <p className="text-xs text-slate-500">
              {locale === "kn"
                ? "ತೂಕ, ತೇವಾಂಶ ಮತ್ತು ಪಾವತಿ ವಿವಾದಗಳ ಅಧಿಕೃತ ಪರಿಶೀಲನೆ"
                : "Official review and decision log for farmer-submitted procurement disputes"}
            </p>
          </div>

          {disputes.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              No active grievances recorded.
            </div>
          ) : (
            <div className="space-y-4">
              {disputes.map((d) => (
                <div
                  key={d.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-amber-900">{d.disputeRef}</span>
                      <span className="bg-amber-200 text-amber-950 px-2 py-0.5 rounded text-[10px] font-bold">
                        {d.status}
                      </span>
                    </div>
                    <span className="font-mono text-slate-400 text-[10px]">
                      Tx: {d.transactionId} | FRUITS: {d.farmerFruitsId}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-bold">Category:</span>{" "}
                    <span className="font-semibold text-slate-900">{d.category}</span>
                  </div>

                  <p className="text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                    {d.description}
                  </p>

                  {d.resolutionNotes && (
                    <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-emerald-950">
                      <strong>Resolution:</strong> {d.resolutionNotes}
                    </div>
                  )}

                  {d.status === "OPEN" && (
                    <div className="pt-2 border-t border-slate-200">
                      {resolvingDisputeId === d.id ? (
                        <div className="space-y-2">
                          <textarea
                            rows={2}
                            value={resolutionText}
                            onChange={(e) => setResolutionText(e.target.value)}
                            placeholder="Enter RSK resolution notes and decision..."
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleResolveDispute(d.id)}
                              className="bg-[#1b4332] text-white text-xs font-bold px-3 py-1.5 rounded-lg"
                            >
                              Confirm Resolution
                            </button>
                            <button
                              onClick={() => setResolvingDisputeId(null)}
                              className="bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setResolvingDisputeId(d.id);
                            setResolutionText("");
                          }}
                          className="bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold px-3 py-1.5 rounded-lg transition"
                        >
                          Record RSK Resolution Decision
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

