"use client";

import { useState, useTransition } from "react";
import { Link } from "@/i18n/routing";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  Building,
  User,
  Scale,
  Calendar,
  FileText,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  XCircle,
} from "lucide-react";
import { Dispute, Centre } from "@/lib/types";
import { formatPaiseToInr, formatWeight, maskName } from "@/lib/math/procurement";

interface GrievancesPortalProps {
  initialDisputes: Dispute[];
  centres: Centre[];
  locale: string;
}

export function GrievancesPortal({
  initialDisputes,
  centres,
  locale,
}: GrievancesPortalProps) {
  const [disputes, setDisputes] = useState<Dispute[]>(initialDisputes);
  const [selectedCentre, setSelectedCentre] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState("");
  const [isPending, startTransition] = useTransition();

  // Filter disputes
  const filteredDisputes = disputes.filter((d) => {
    // Centre match
    const tx = d.transaction;
    if (selectedCentre !== "ALL") {
      if (tx?.centreId !== selectedCentre && tx?.centre?.code !== selectedCentre) {
        return false;
      }
    }

    // Status match
    if (selectedStatus !== "ALL" && d.status !== selectedStatus) {
      return false;
    }

    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRef = d.disputeRef.toLowerCase().includes(q);
      const matchTx = d.transactionId.toLowerCase().includes(q);
      const matchFarmer = d.farmerFruitsId.toLowerCase().includes(q) || (d.farmer?.nameEn && d.farmer.nameEn.toLowerCase().includes(q));
      const matchDesc = d.description.toLowerCase().includes(q);
      if (!matchRef && !matchTx && !matchFarmer && !matchDesc) {
        return false;
      }
    }

    return true;
  });

  // Metrics
  const totalCount = disputes.length;
  const openCount = disputes.filter((d) => d.status === "OPEN").length;
  const reviewCount = disputes.filter((d) => d.status === "UNDER_REVIEW").length;
  const resolvedCount = disputes.filter((d) => d.status === "RESOLVED").length;

  // Handle officer actions
  const handleUpdateStatus = async (
    disputeId: string,
    newStatus: "UNDER_REVIEW" | "RESOLVED" | "REJECTED",
    notes?: string
  ) => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/disputes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            disputeId,
            status: newStatus,
            resolutionNotes: notes,
            officerComment: notes ? `Official action: ${newStatus}. Note: ${notes}` : undefined,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setDisputes((prev) =>
            prev.map((d) => (d.id === disputeId ? { ...d, ...data.dispute } : d))
          );
          setResolvingId(null);
          setResolutionText("");
        } else {
          alert("Failed to update dispute status");
        }
      } catch {
        alert("Network error updating dispute");
      }
    });
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "WEIGHT_MISMATCH":
        return locale === "kn" ? "ತೂಕದಲ್ಲಿ ವ್ಯತ್ಯಾಸ" : "Weighbridge Weight Mismatch";
      case "MOISTURE_DEDUCTION":
        return locale === "kn" ? "ತೇವಾಂಶ ಕಡಿತದಲ್ಲಿ ವ್ಯತ್ಯಾಸ" : "Moisture Deduction Disagreement";
      case "QUALITY_DISAGREEMENT":
        return locale === "kn" ? "ಗುಣಮಟ್ಟ / ದರ್ಜೆ ವಿವಾದ" : "Quality / Grading Disagreement";
      case "MSP_PRICE_DISAGREEMENT":
        return locale === "kn" ? "ಬೆಂಬಲ ಬೆಲೆ ದರ ವ್ಯತ್ಯಾಸ" : "MSP Price Disagreement";
      case "PAYMENT_NOT_RECEIVED":
        return locale === "kn" ? "15 ದಿನಗಳ ಪಾವತಿ ವಿಳಂಬ" : "Payment Not Received (15-Day SLA)";
      default:
        return locale === "kn" ? "ಇತರ ದೂರು" : "Other Grievance";
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 py-4">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-[#1b4332] via-[#2d6a4f] to-[#1b4332] rounded-2xl text-white p-6 sm:p-8 shadow-md border border-[#52b788]/30">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 bg-amber-500/20 border border-amber-400/40 px-3 py-1 rounded-full text-xs font-bold text-amber-300 mb-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {locale === "kn"
                  ? "ರೈತ ಕುಂದುಕೊರತೆ ಮತ್ತು ತಕರಾರು ನಿವಾರಣಾ ಪೋರ್ಟಲ್"
                  : "Official Farmer Grievance & Dispute Redressal Desk"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {locale === "kn"
                ? "ರೈತರ ದೂರುಗಳು ಮತ್ತು ಪರಿಶೀಲನಾ ವೇದಿಕೆ"
                : "Farmer Grievances & Resolution Registry"}
            </h1>
            <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              {locale === "kn"
                ? "ಕರ್ನಾಟಕದ ಎಲ್ಲಾ ಎಪಿಎಂಸಿ ಮತ್ತು ಪ್ರಾಥಮಿಕ ಕೃಷಿ ಖರೀದಿ ಕೇಂದ್ರಗಳಲ್ಲಿ ರೈತರು ಸಲ್ಲಿಸಿದ ದೂರುಗಳ ಪಾರದರ್ಶಕ ಪರಿಶೀಲನೆ ಮತ್ತು ಶಾಸನಬದ್ಧ ಪರಿಹಾರ."
                : "Transparent grievance registry covering all procurement market yards across Karnataka. Officials can review, verify physical weighbridge logs, and approve adjustments."}
            </p>
          </div>

          <div className="bg-emerald-950/60 p-4 rounded-xl border border-emerald-400/30 text-right">
            <span className="text-[11px] text-emerald-300 uppercase tracking-wider font-semibold">
              {locale === "kn" ? "ಶಾಸನಬದ್ಧ ಪರಿಹಾರ ಗಡುವು" : "Statutory SLA Clock"}
            </span>
            <div className="text-xl font-black text-amber-400 mt-0.5">15 Days</div>
            <span className="text-[10px] text-emerald-200">
              {locale === "kn" ? "ಆಹಾರ ಮತ್ತು ನಾಗರಿಕ ಸರಬರಾಜು ಇಲಾಖೆ" : "Dept of Food & Civil Supplies"}
            </span>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {locale === "kn" ? "ಒಟ್ಟು ದೂರುಗಳು" : "Total Grievances"}
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            {totalCount}
          </div>
          <span className="text-[11px] text-slate-500 font-medium">All 3 Market Yards</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-red-200 shadow-xs">
          <div className="text-xs font-bold text-red-700 uppercase tracking-wider flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>{locale === "kn" ? "ಹೊಸ ದೂರುಗಳು" : "Action Required"}</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-red-700 mt-1">
            {openCount}
          </div>
          <span className="text-[11px] text-red-600 font-medium">Awaiting Officer Review</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs">
          <div className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center space-x-1">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>{locale === "kn" ? "ಪರಿಶೀಲನೆಯಲ್ಲಿದೆ" : "Under Review"}</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-800 mt-1">
            {reviewCount}
          </div>
          <span className="text-[11px] text-amber-700 font-medium">RSK / Weighbridge Audit</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs">
          <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>{locale === "kn" ? "ಪರಿಹರಿಸಲಾಗಿದೆ" : "Resolved"}</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-800 mt-1">
            {resolvedCount}
          </div>
          <span className="text-[11px] text-emerald-700 font-medium">Adjustment Credited</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Market Yard Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center space-x-1">
              <Building className="w-3.5 h-3.5 text-[#1b4332]" />
              <span>{locale === "kn" ? "ಖರೀದಿ ಕೇಂದ್ರ / ಮಾರುಕಟ್ಟೆ" : "Market Yard / Centre"}</span>
            </label>
            <select
              value={selectedCentre}
              onChange={(e) => setSelectedCentre(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-[#1b4332]"
            >
              <option value="ALL">{locale === "kn" ? "ಎಲ್ಲಾ 3 ಖರೀದಿ ಕೇಂದ್ರಗಳು (All Centres)" : "All Market Yards (3 Centres)"}</option>
              {centres.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {locale === "kn" ? c.nameKn : c.nameEn} ({c.district})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center space-x-1">
              <Filter className="w-3.5 h-3.5 text-[#1b4332]" />
              <span>{locale === "kn" ? "ದೂರಿನ ಸ್ಥಿತಿ" : "Grievance Status"}</span>
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-[#1b4332]"
            >
              <option value="ALL">{locale === "kn" ? "ಎಲ್ಲಾ ಸ್ಥಿತಿಗಳು (All Statuses)" : "All Statuses"}</option>
              <option value="OPEN">🔴 {locale === "kn" ? "ಹೊಸ ದೂರು (OPEN)" : "OPEN (Action Required)"}</option>
              <option value="UNDER_REVIEW">🟡 {locale === "kn" ? "ಪರಿಶೀಲನೆಯಲ್ಲಿದೆ (UNDER REVIEW)" : "UNDER REVIEW"}</option>
              <option value="RESOLVED">🟢 {locale === "kn" ? "ಪರಿಹರಿಸಲಾಗಿದೆ (RESOLVED)" : "RESOLVED"}</option>
              <option value="REJECTED">⚪ {locale === "kn" ? "ತಿರಸ್ಕರಿಸಲಾಗಿದೆ (REJECTED)" : "REJECTED"}</option>
            </select>
          </div>

          {/* Search Query */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center space-x-1">
              <Search className="w-3.5 h-3.5 text-[#1b4332]" />
              <span>{locale === "kn" ? "ಹುಡುಕಿ" : "Search Grievance / Farmer"}</span>
            </label>
            <input
              type="text"
              placeholder={locale === "kn" ? "DSP ID, ವಹಿವಾಟು ID, FRUITS ID..." : "Search DSP-2026, TX ID, FRUITS ID..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-[#1b4332]"
            />
          </div>
        </div>
      </div>

      {/* Disputes List */}
      <div className="space-y-4">
        {filteredDisputes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">
              {locale === "kn" ? "ಯಾವುದೇ ದೂರುಗಳು ಬಾಕಿ ಇಲ್ಲ" : "No Grievances Found for this Filter"}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {locale === "kn"
                ? "ಆಯ್ಕೆ ಮಾಡಿದ ಮಾರುಕಟ್ಟೆ ಕೇಂದ್ರ ಅಥವಾ ಮಾನದಂಡಕ್ಕೆ ಯಾವುದೇ ಬಾಕಿ ದೂರುಗಳಿಲ್ಲ."
                : "No dispute records match your selected market yard or search filter."}
            </p>
          </div>
        ) : (
          filteredDisputes.map((dispute) => {
            const isExpanded = expandedId === dispute.id;
            const tx = dispute.transaction;
            const farmer = dispute.farmer || tx?.farmer;
            const centre = tx?.centre;

            return (
              <div
                key={dispute.id}
                className="bg-white rounded-2xl border-2 border-slate-200 shadow-xs hover:border-slate-300 transition overflow-hidden"
              >
                {/* Header Row */}
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-black text-base text-[#1b4332]">
                          {dispute.disputeRef}
                        </span>
                        <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          {new Date(dispute.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        {dispute.evidencePhotoUrl && (
                          <span className="bg-purple-100 text-purple-900 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            📷 Photo Attached
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900 flex items-center space-x-1">
                          <Building className="w-3.5 h-3.5 text-emerald-800" />
                          <span>{centre?.nameEn || "Karnataka APMC Centre"} ({centre?.code || "KA-01"})</span>
                        </span>
                        <span>•</span>
                        <span className="font-medium">District: {centre?.district || "Karnataka"}</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {dispute.status === "OPEN" && (
                        <span className="bg-red-100 text-red-900 border border-red-300 text-xs font-black px-3 py-1 rounded-full flex items-center space-x-1.5 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-red-600" />
                          <span>{locale === "kn" ? "ಹೊಸ ದೂರು (OPEN)" : "ACTION REQUIRED"}</span>
                        </span>
                      )}
                      {dispute.status === "UNDER_REVIEW" && (
                        <span className="bg-amber-100 text-amber-950 border border-amber-300 text-xs font-black px-3 py-1 rounded-full flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-700" />
                          <span>{locale === "kn" ? "ಪರಿಶೀಲನೆಯಲ್ಲಿದೆ" : "UNDER RSK REVIEW"}</span>
                        </span>
                      )}
                      {dispute.status === "RESOLVED" && (
                        <span className="bg-emerald-100 text-emerald-950 border border-emerald-300 text-xs font-black px-3 py-1 rounded-full flex items-center space-x-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          <span>{locale === "kn" ? "ಪರಿಹರಿಸಲಾಗಿದೆ" : "RESOLVED & CLOSED"}</span>
                        </span>
                      )}
                      {dispute.status === "REJECTED" && (
                        <span className="bg-slate-100 text-slate-700 border border-slate-300 text-xs font-black px-3 py-1 rounded-full flex items-center space-x-1.5">
                          <XCircle className="w-3.5 h-3.5 text-slate-500" />
                          <span>{locale === "kn" ? "ತಿರಸ್ಕರಿಸಲಾಗಿದೆ" : "REJECTED"}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Grievance Category & Summary */}
                  <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 text-xs space-y-1">
                    <div className="font-bold text-amber-950 uppercase tracking-wider text-[11px]">
                      {getCategoryLabel(dispute.category)}
                    </div>
                    <p className="text-slate-800 font-medium leading-relaxed">
                      &quot;{dispute.description}&quot;
                    </p>
                  </div>

                  {/* Farmer & Transaction Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-500 font-semibold block">{locale === "kn" ? "ರೈತರ ಹೆಸರು" : "Farmer"}:</span>
                      <span className="font-bold text-slate-900 mt-0.5 block">
                        {farmer ? maskName(farmer.nameEn) : "Registered Farmer"}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">FRUITS: {dispute.farmerFruitsId}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 font-semibold block">{locale === "kn" ? "ವಹಿವಾಟಿನ ವಿವರ" : "Associated Transaction"}:</span>
                      <Link
                        href={`/verify/${dispute.transactionId}`}
                        className="font-mono font-bold text-[#1b4332] hover:underline flex items-center space-x-1 mt-0.5"
                      >
                        <span>{dispute.transactionId}</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                      {tx && (
                        <span className="text-[11px] text-slate-600 block">
                          Net: {formatWeight(tx.netWeight)} @ {tx.paddyVariety}
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-slate-500 font-semibold block">{locale === "kn" ? "ವಿವಾದಿತ ಮೊತ್ತ" : "Payable Amount"}:</span>
                      <span className="font-black text-sm text-[#1b4332] block mt-0.5">
                        {tx ? formatPaiseToInr(tx.finalPayablePaise) : "N/A"}
                      </span>
                      <span className="text-[10px] text-amber-800 font-bold">
                        Payment: {tx?.payment?.status || "DISPUTED"}
                      </span>
                    </div>
                  </div>

                  {/* Resolution Notes (If Resolved) */}
                  {dispute.resolutionNotes && (
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-300 text-xs space-y-1">
                      <span className="font-bold text-emerald-900 uppercase text-[10px] flex items-center space-x-1">
                        <Check className="w-3 h-3 text-emerald-700" />
                        <span>{locale === "kn" ? "ಅಧಿಕೃತ ತೀರ್ಮಾನದ ವಿವರಣೆ" : "Official Resolution Notes"}</span>
                      </span>
                      <p className="text-emerald-950 font-medium">
                        {dispute.resolutionNotes}
                      </p>
                      {dispute.resolvedAt && (
                        <span className="text-[10px] text-emerald-700 block">
                          Resolved on: {new Date(dispute.resolvedAt).toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Officer Actions Bar */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/verify/${dispute.transactionId}`}
                        className="text-xs font-bold text-[#1b4332] hover:underline flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{locale === "kn" ? "ರಶೀದಿ / ಕ್ಯೂಆರ್ ವೀಕ್ಷಿಸಿ" : "View Verified Receipt & QR"}</span>
                      </Link>
                    </div>

                    {/* Official Decision Buttons */}
                    {dispute.status !== "RESOLVED" && dispute.status !== "REJECTED" && (
                      <div className="flex items-center space-x-2">
                        {dispute.status === "OPEN" && (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleUpdateStatus(dispute.id, "UNDER_REVIEW", "Officer assigned for physical weighbridge re-inspection")}
                            className="text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-950 px-3 py-1.5 rounded-lg border border-amber-300 transition flex items-center space-x-1"
                          >
                            <Clock className="w-3 h-3" />
                            <span>{locale === "kn" ? "ಪರಿಶೀಲನೆ ಪ್ರಾರಂಭಿಸಿ" : "Start RSK Review"}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            setResolvingId(dispute.id);
                            setResolutionText("Re-calibration verified. Approved adjustment credit to farmer bank account.");
                          }}
                          className="text-xs font-bold bg-[#1b4332] hover:bg-[#2d6a4f] text-white px-3 py-1.5 rounded-lg shadow-xs transition flex items-center space-x-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{locale === "kn" ? "ದೂರು ಪರಿಹರಿಸಿ" : "Resolve & Approve"}</span>
                        </button>

                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            if (confirm("Are you sure you want to reject this grievance?")) {
                              handleUpdateStatus(dispute.id, "REJECTED", "Inspected physical logs. Moisture reading confirmed accurate according to APMC protocol.");
                            }
                          }}
                          className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition"
                        >
                          {locale === "kn" ? "ತಿರಸ್ಕರಿಸಿ" : "Reject"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Resolution Input Drawer (When Resolving) */}
                  {resolvingId === dispute.id && (
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-300 space-y-3 mt-3 animate-in fade-in">
                      <div className="text-xs font-bold text-emerald-950">
                        {locale === "kn" ? "ಅಧಿಕೃತ ತೀರ್ಮಾನ ಮತ್ತು ಪರಿಹಾರ ವಿವರಣೆ ದಾಖಲಿಸಿ" : "Enter Official Resolution Notes & Action Taken:"}
                      </div>
                      <textarea
                        rows={2}
                        value={resolutionText}
                        onChange={(e) => setResolutionText(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white border border-emerald-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#1b4332]"
                        placeholder="Explain resolution, e.g. Scale re-calibrated, adjustment approved..."
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => setResolvingId(null)}
                          className="text-xs font-semibold px-3 py-1.5 bg-white text-slate-700 rounded-lg border border-slate-300 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isPending || !resolutionText.trim()}
                          onClick={() => handleUpdateStatus(dispute.id, "RESOLVED", resolutionText)}
                          className="text-xs font-bold px-4 py-1.5 bg-[#1b4332] text-white rounded-lg hover:bg-[#2d6a4f] shadow-xs flex items-center space-x-1"
                        >
                          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          <span>Confirm & Resolve Ticket</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
