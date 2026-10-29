import { useEffect, useState } from "react";
import {
  Wallet, CheckCircle2, AlertTriangle, FileText,
  DollarSign, ArrowUpRight, ShieldCheck, CheckCheck, Landmark
} from "lucide-react";
import { api } from "../services/api";
import StatusBadge from "../components/StatusBadge";

export default function AccountsPortal({ user }) {
  const [overtimeList, setOvertimeList] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [ot, cols] = await Promise.all([
        api.list("overtime"),
        api.list("collections")
      ]);
      setOvertimeList(ot || []);
      setCollections(cols || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleDisbursePayment(otRecord) {
    const voucherRef = `PAY-OT-${Date.now().toString().slice(-4)}`;
    try {
      await api.update("overtime", otRecord._id, {
        status: "Paid",
        paidAt: new Date().toISOString(),
        paymentRef: voucherRef,
        decisionReason: `Disbursed by Accounts Officer (${user.name}) via Treasury Direct Voucher ${voucherRef}`
      });
      setMessage(`Overtime of ₹${otRecord.amount} successfully disbursed to ${otRecord.crew} (Ref: ${voucherRef})`);
      loadData();
    } catch (err) {
      alert("Payment disbursement failed: " + err.message);
    }
  }

  async function handleSettleCollection(colRecord, action) {
    try {
      const newStatus = action === "settle" ? "Settled" : "Audit Inquiry Initiated";
      await api.update("collections", colRecord._id, {
        status: newStatus,
        remarks: action === "settle"
          ? `Discrepancy accepted and written off after bank gateway verification by Accounts Officer (${user.name})`
          : `Formal audit inquiry flagged by Accounts Officer (${user.name}) for further verification`
      });
      setMessage(`Waybill ${colRecord.collectionId} status updated to: ${newStatus}`);
      loadData();
    } catch (err) {
      alert("Collection settlement error: " + err.message);
    }
  }

  // Summary Metrics
  const totalApprovedDue = overtimeList
    .filter(o => o.status === "Approved")
    .reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

  const totalPaid = overtimeList
    .filter(o => o.status === "Paid")
    .reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

  const totalCollected = collections.reduce((sum, c) => sum + (Number(c.totalCollected) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wide">
          <Landmark size={14} />
          Finance, Payroll & Fare Audit Division
        </div>
        <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
          Accounts Officer Reconciliation Center
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Overtime disbursement authorization, statutory rate calculations (₹350/hr), and electronic fare discrepancy settlements.
        </p>
      </div>

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-600" />
          {message}
        </div>
      )}

      {/* Financial Metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="surface p-5 border-blue-100">
          <span className="text-xs font-semibold text-slate-500">Total Ticket Fare Reconciled</span>
          <p className="text-2xl font-black text-navy mt-1">₹{totalCollected.toLocaleString("en-IN")}</p>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">✓ Across all depot corridors</p>
        </div>

        <div className="surface p-5 border-amber-100 bg-amber-50/20">
          <span className="text-xs font-semibold text-amber-800">Pending Overtime Liability</span>
          <p className="text-2xl font-black text-amber-900 mt-1">₹{totalApprovedDue.toLocaleString("en-IN")}</p>
          <p className="text-[11px] text-amber-700 font-medium mt-1">Approved by Depot Officers, awaiting payout</p>
        </div>

        <div className="surface p-5 border-emerald-100 bg-emerald-50/20">
          <span className="text-xs font-semibold text-emerald-800">Total Overtime Disbursed</span>
          <p className="text-2xl font-black text-emerald-900 mt-1">₹{totalPaid.toLocaleString("en-IN")}</p>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">Direct Treasury Benefit Transfer</p>
        </div>
      </div>

      {/* Section 1: Overtime Payout Authorization */}
      <div className="surface p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-navy">Overtime Claims & Payout Authorization Queue</h2>
            <p className="text-xs text-slate-500">Hourly Overtime Rate: ₹350/hr • Requires Depot Officer prior authorization</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="p-3">Crew Member</th>
                <th className="p-3">Role</th>
                <th className="p-3">Hours Claimed</th>
                <th className="p-3">Operational Reason</th>
                <th className="p-3">Payable Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Accounts Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {overtimeList.map((ot) => (
                <tr key={ot._id} className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-navy">{ot.crew}</td>
                  <td className="p-3 text-slate-600">{ot.role}</td>
                  <td className="p-3 font-semibold">{ot.requestedHours} Hours</td>
                  <td className="p-3 max-w-xs text-slate-600 truncate" title={ot.reason}>{ot.reason}</td>
                  <td className="p-3 font-bold text-blue-700">₹{ot.amount || ot.requestedHours * 350}</td>
                  <td className="p-3">
                    <StatusBadge value={ot.status} />
                  </td>
                  <td className="p-3 text-right">
                    {ot.status === "Approved" ? (
                      <button
                        onClick={() => handleDisbursePayment(ot)}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 text-xs shadow-sm transition"
                      >
                        Authorize & Pay
                      </button>
                    ) : ot.status === "Paid" ? (
                      <span className="text-[11px] font-semibold text-emerald-700">
                        Paid ({ot.paymentRef || "Voucher"})
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">Needs Officer Approval</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Conductor Fare Discrepancy Audits */}
      <div className="surface p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-navy">Conductor Fare Reconciliations & Discrepancies</h2>
            <p className="text-xs text-slate-500">Non-punitive audit resolution for passenger ticketing shortfalls</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="p-3">Waybill</th>
                <th className="p-3">Conductor</th>
                <th className="p-3">Route</th>
                <th className="p-3">Expected vs Actual</th>
                <th className="p-3">Shortfall</th>
                <th className="p-3">Conductor Explanation</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Audit Resolution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {collections.map((col) => (
                <tr key={col._id} className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-navy">{col.collectionId || "COL-001"}</td>
                  <td className="p-3 font-semibold">{col.conductor}</td>
                  <td className="p-3 text-slate-600">{col.routeName}</td>
                  <td className="p-3 font-medium">₹{col.expectedAmount} / ₹{col.totalCollected}</td>
                  <td className={`p-3 font-bold ${col.discrepancyAmount < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                    {col.discrepancyAmount === 0 ? "₹0" : `₹${col.discrepancyAmount}`}
                  </td>
                  <td className="p-3 max-w-xs text-slate-600 truncate" title={col.explanation}>
                    {col.explanation || "—"}
                  </td>
                  <td className="p-3">
                    <StatusBadge value={col.status} />
                  </td>
                  <td className="p-3 text-right space-x-2">
                    {col.status === "Discrepancy Flagged" ? (
                      <>
                        <button
                          onClick={() => handleSettleCollection(col, "settle")}
                          className="rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-bold px-2 py-1 text-[11px]"
                        >
                          Accept & Settle
                        </button>
                        <button
                          onClick={() => handleSettleCollection(col, "inquiry")}
                          className="rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold px-2 py-1 text-[11px]"
                        >
                          Flag Inquiry
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] text-slate-400">{col.status}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
