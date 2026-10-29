import { useEffect, useState } from "react";
import {
  Ticket, Wallet, ShieldAlert, CheckCircle2, AlertTriangle,
  Receipt, Calculator, ArrowRight, Sparkles, Send
} from "lucide-react";
import { api } from "../services/api";
import StatusBadge from "../components/StatusBadge";

export default function ConductorWorkbench({ user }) {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");

  // Waybill Form State
  const [formData, setFormData] = useState({
    routeName: "Jaipur → Delhi Express Corridor (NH-48)",
    busId: "BUS-101",
    standardCount: 42,
    concessionCount: 6,
    passCount: 3,
    luggageCount: 4,
    cashCollected: 14200,
    digitalCollected: 11800,
    explanation: ""
  });

  const [disputeModal, setDisputeModal] = useState(false);

  useEffect(() => {
    loadCollections();
  }, []);

  async function loadCollections() {
    setLoading(true);
    try {
      const data = await api.list("collections");
      setCollections(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Real-time Fare Math
  const standardPrice = 500;
  const concessionPrice = 250;
  const luggagePrice = 100;

  const expectedStandard = formData.standardCount * standardPrice;
  const expectedConcession = formData.concessionCount * concessionPrice;
  const expectedLuggage = formData.luggageCount * luggagePrice;
  const expectedTotal = expectedStandard + expectedConcession + expectedLuggage;

  const totalCollected = Number(formData.cashCollected || 0) + Number(formData.digitalCollected || 0);
  const discrepancy = totalCollected - expectedTotal;
  const hasDiscrepancy = discrepancy !== 0;

  async function handleSubmitWaybill(e) {
    if (e) e.preventDefault();

    if (hasDiscrepancy && !formData.explanation.trim() && !disputeModal) {
      setDisputeModal(true);
      return;
    }

    try {
      const payload = {
        collectionId: `COL-${Date.now().toString().slice(-4)}`,
        trip: "TRIP-2026-081",
        routeName: formData.routeName,
        busId: formData.busId,
        conductor: user.name,
        date: new Date().toISOString().split("T")[0],
        totalTickets: Number(formData.standardCount) + Number(formData.concessionCount) + Number(formData.passCount),
        standardCount: Number(formData.standardCount),
        concessionCount: Number(formData.concessionCount),
        passCount: Number(formData.passCount),
        luggageCount: Number(formData.luggageCount),
        cashCollected: Number(formData.cashCollected),
        digitalCollected: Number(formData.digitalCollected),
        totalCollected,
        expectedAmount: expectedTotal,
        discrepancyAmount: discrepancy,
        status: hasDiscrepancy ? "Discrepancy Flagged" : "Reconciled",
        explanation: formData.explanation,
        remarks: hasDiscrepancy ? "Explanation submitted for accounts review." : "100% electronic reconciliation passed."
      };

      await api.create("collections", payload);
      setSuccessMsg("Waybill and collection record successfully registered and sent to Accounts Division.");
      setDisputeModal(false);
      loadCollections();
    } catch (err) {
      alert("Submission error: " + err.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wide">
          <Ticket size={14} />
          Conductor Fare & Collection Console
        </div>
        <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
          Digital Passenger Waybill & Reconciliation
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Electronic ticketing records, cash/UPI splits, automated shortfall audit, and non-punitive dispute explanations.
        </p>
      </div>

      {successMsg && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-600" />
          {successMsg}
        </div>
      )}

      {/* Waybill Entry Card */}
      <div className="surface p-6">
        <h2 className="text-sm font-bold text-navy uppercase tracking-wider mb-4 flex items-center gap-2">
          <Calculator size={16} className="text-blue-600" />
          Trip Fare Settlement Form
        </h2>

        <form onSubmit={handleSubmitWaybill} className="space-y-6 text-xs">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Assigned Route</label>
              <input
                className="field bg-slate-50 text-slate-600"
                readOnly
                value={formData.routeName}
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Bus Fleet Unit</label>
              <input
                className="field bg-slate-50 text-slate-600"
                readOnly
                value={formData.busId}
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Conductor In-Charge</label>
              <input
                className="field bg-slate-50 text-slate-600 font-bold"
                readOnly
                value={user.name}
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Trip Date</label>
              <input
                className="field bg-slate-50 text-slate-600"
                readOnly
                value="Today (21 Oct 2026)"
              />
            </div>
          </div>

          {/* Passenger Ticket Breakdown */}
          <div>
            <h3 className="font-bold text-navy mb-3">Passenger Category Breakdown</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 p-3 bg-white">
                <span className="font-bold text-slate-700">Standard Adult (₹500)</span>
                <input
                  type="number"
                  min="0"
                  className="field mt-2 font-bold"
                  value={formData.standardCount}
                  onChange={e => setFormData({ ...formData, standardCount: Number(e.target.value) })}
                />
                <p className="mt-1 text-[11px] text-slate-400">Subtotal: ₹{expectedStandard.toLocaleString("en-IN")}</p>
              </div>

              <div className="rounded-xl border border-slate-200 p-3 bg-white">
                <span className="font-bold text-slate-700">Student / Concession (₹250)</span>
                <input
                  type="number"
                  min="0"
                  className="field mt-2 font-bold"
                  value={formData.concessionCount}
                  onChange={e => setFormData({ ...formData, concessionCount: Number(e.target.value) })}
                />
                <p className="mt-1 text-[11px] text-slate-400">Subtotal: ₹{expectedConcession.toLocaleString("en-IN")}</p>
              </div>

              <div className="rounded-xl border border-slate-200 p-3 bg-white">
                <span className="font-bold text-slate-700">Monthly Pass Holders (₹0)</span>
                <input
                  type="number"
                  min="0"
                  className="field mt-2 font-bold"
                  value={formData.passCount}
                  onChange={e => setFormData({ ...formData, passCount: Number(e.target.value) })}
                />
                <p className="mt-1 text-[11px] text-slate-400">Subtotal: ₹0</p>
              </div>

              <div className="rounded-xl border border-slate-200 p-3 bg-white">
                <span className="font-bold text-slate-700">Heavy Luggage Cargo (₹100)</span>
                <input
                  type="number"
                  min="0"
                  className="field mt-2 font-bold"
                  value={formData.luggageCount}
                  onChange={e => setFormData({ ...formData, luggageCount: Number(e.target.value) })}
                />
                <p className="mt-1 text-[11px] text-slate-400">Subtotal: ₹{expectedLuggage.toLocaleString("en-IN")}</p>
              </div>
            </div>
          </div>

          {/* Payment Method Split & Real-time Math */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl bg-blue-50/60 border border-blue-100 p-4">
              <label className="font-bold text-blue-900 block mb-1">Cash Handed Over at Depot (₹)</label>
              <input
                type="number"
                step="50"
                className="field bg-white font-bold text-base"
                value={formData.cashCollected}
                onChange={e => setFormData({ ...formData, cashCollected: Number(e.target.value) })}
              />
              <p className="text-[11px] text-slate-500 mt-1">Physical currency notes deposited</p>
            </div>

            <div className="rounded-xl bg-blue-50/60 border border-blue-100 p-4">
              <label className="font-bold text-blue-900 block mb-1">Digital UPI / QR Gateway Collection (₹)</label>
              <input
                type="number"
                step="50"
                className="field bg-white font-bold text-base"
                value={formData.digitalCollected}
                onChange={e => setFormData({ ...formData, digitalCollected: Number(e.target.value) })}
              />
              <p className="text-[11px] text-slate-500 mt-1">UPI E-ticketing transactions</p>
            </div>

            {/* Reconciliation Audit Summary Card */}
            <div className={`rounded-xl border p-4 flex flex-col justify-between ${
              hasDiscrepancy ? "bg-amber-50/70 border-amber-300" : "bg-emerald-50/70 border-emerald-300"
            }`}>
              <div>
                <span className="font-bold uppercase tracking-wider text-[11px]">Audit Settlement Result</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-slate-600">Expected: ₹{expectedTotal.toLocaleString("en-IN")}</span>
                  <span className="font-black text-base text-navy">Actual: ₹{totalCollected.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="font-semibold text-slate-700">Variance:</span>
                <span className={`font-black text-sm ${hasDiscrepancy ? "text-rose-600" : "text-emerald-700"}`}>
                  {discrepancy === 0 ? "✓ Zero Discrepancy" : `${discrepancy > 0 ? "+" : ""}₹${discrepancy}`}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="submit"
              className="primary-button flex items-center gap-2 text-xs font-bold py-2.5 px-6"
            >
              <Send size={15} />
              Submit Waybill to Accounts
            </button>
          </div>
        </form>
      </div>

      {/* Discrepancy Explanation Modal */}
      {disputeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="surface max-w-lg w-full p-6 shadow-2xl border-amber-300">
            <div className="flex items-center gap-3 text-amber-600 border-b pb-3 mb-4">
              <AlertTriangle size={24} />
              <div>
                <h3 className="font-bold text-navy text-base">Fare Discrepancy Explanation Required</h3>
                <p className="text-xs text-slate-500">Non-punitive transparent audit review</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-3">
              Calculated ticket sales (<b>₹{expectedTotal}</b>) does not match total funds submitted (<b>₹{totalCollected}</b>).
              Variance: <b className="text-rose-600">₹{discrepancy}</b>.
            </p>

            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Conductor Explanation Note <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              className="field text-xs mb-4"
              placeholder="e.g. UPI banking gateway timed out at Neemrana Hub for 1 passenger; passenger phone and UTR screenshot attached for bank settlement."
              value={formData.explanation}
              onChange={e => setFormData({ ...formData, explanation: e.target.value })}
            />

            <div className="flex justify-end gap-2">
              <button onClick={() => setDisputeModal(false)} className="secondary-button text-xs font-semibold">
                Back to Editing
              </button>
              <button
                disabled={!formData.explanation.trim()}
                onClick={() => handleSubmitWaybill()}
                className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2 disabled:opacity-50"
              >
                Submit with Explanation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Collections Table */}
      <div className="surface p-6">
        <h3 className="font-bold text-navy text-base mb-4">Recent Settled Waybills</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="p-3">Waybill ID</th>
                <th className="p-3">Route</th>
                <th className="p-3">Bus</th>
                <th className="p-3">Tickets</th>
                <th className="p-3">Cash / UPI Split</th>
                <th className="p-3">Total Deposited</th>
                <th className="p-3">Variance</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {collections.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-navy">{c.collectionId || "COL-001"}</td>
                  <td className="p-3 text-slate-700">{c.routeName}</td>
                  <td className="p-3 font-semibold text-blue-600">{c.busId}</td>
                  <td className="p-3">{c.totalTickets} pax</td>
                  <td className="p-3 text-slate-500">₹{c.cashCollected} / ₹{c.digitalCollected}</td>
                  <td className="p-3 font-bold text-navy">₹{c.totalCollected}</td>
                  <td className={`p-3 font-bold ${c.discrepancyAmount < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                    {c.discrepancyAmount === 0 ? "₹0" : `₹${c.discrepancyAmount}`}
                  </td>
                  <td className="p-3">
                    <StatusBadge value={c.status} />
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
