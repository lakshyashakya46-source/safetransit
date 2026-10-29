import { useEffect, useState } from "react";
import {
  Wrench, CheckCircle2, AlertTriangle, BusFront, ShieldAlert,
  ClipboardList, Plus, AlertCircle
} from "lucide-react";
import { api } from "../services/api";
import StatusBadge from "../components/StatusBadge";

export default function VehicleHealthPage({ user }) {
  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState("");

  const [formData, setFormData] = useState({
    busId: "BUS-102",
    driverName: user.name,
    brakes: "Pass",
    tyres: "Pass",
    steering: "Pass",
    lights: "Pass",
    horn: "Pass",
    emergencyExits: "Pass",
    firstAidFireExtinguisher: "Pass",
    engineFluids: "Pass",
    notes: "All mechanical and pneumatic checks conform to fitness standards."
  });

  useEffect(() => {
    loadChecklists();
  }, []);

  async function loadChecklists() {
    setLoading(true);
    try {
      const data = await api.list("checklists");
      setChecklists(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const result = await api.submitChecklist(formData);
      setMessage(
        result.overallStatus.includes("Fail")
          ? `CRITICAL INSPECTION FAILED: Bus ${formData.busId} has been grounded with Maintenance Required status.`
          : `Inspection verified: Bus ${formData.busId} cleared for passenger dispatch.`
      );
      setModalOpen(false);
      loadChecklists();
    } catch (err) {
      alert("Submission error: " + err.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wide">
            <Wrench size={14} />
            Preventive Fleet Maintenance
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
            Vehicle Health & Pre-Trip Inspection Audit
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Mandatory walkaround inspection prior to departure. Critical brake, tyre, or steering defects automatically lock vehicles from duty.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="primary-button flex items-center gap-2 text-xs font-bold py-2.5 self-start"
        >
          <Plus size={16} />
          Conduct Pre-Trip Inspection
        </button>
      </div>

      {message && (
        <div className={`rounded-2xl border p-4 text-xs font-bold flex items-center gap-2 ${
          message.includes("FAILED")
            ? "bg-rose-50 border-rose-300 text-rose-800"
            : "bg-emerald-50 border-emerald-300 text-emerald-800"
        }`}>
          <AlertTriangle size={18} />
          {message}
        </div>
      )}

      {/* Checklists Table */}
      <div className="surface p-6">
        <h2 className="text-base font-bold text-navy mb-4">Inspection Records & Fitness Certificates</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="p-3">Checklist ID</th>
                <th className="p-3">Bus Unit</th>
                <th className="p-3">Inspected By</th>
                <th className="p-3">Inspection Date</th>
                <th className="p-3">Critical Systems (Brakes/Tyres/Steering)</th>
                <th className="p-3">Safety Kit</th>
                <th className="p-3">Overall Result</th>
                <th className="p-3">Inspector Findings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {checklists.map((chk) => (
                <tr key={chk._id} className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-navy">{chk.checklistId || "CHK-101"}</td>
                  <td className="p-3 font-bold text-blue-600">{chk.busId}</td>
                  <td className="p-3 text-slate-700">{chk.driverName}</td>
                  <td className="p-3 text-slate-500 whitespace-nowrap">
                    {new Date(chk.date || chk.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-3 space-x-1">
                    <StatusBadge value={chk.brakes} />
                    <StatusBadge value={chk.tyres} />
                    <StatusBadge value={chk.steering} />
                  </td>
                  <td className="p-3">
                    <StatusBadge value={chk.firstAidFireExtinguisher} />
                  </td>
                  <td className="p-3">
                    <StatusBadge value={chk.overallStatus} />
                  </td>
                  <td className="p-3 max-w-xs text-slate-600 truncate" title={chk.notes}>
                    {chk.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pre-Trip Inspection Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="surface max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div>
                <h3 className="font-bold text-navy text-base">New Pre-Trip Vehicle Walkaround Inspection</h3>
                <p className="text-xs text-slate-400">8-Point Fitness Checklist as per State Transport Regulations</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="font-semibold block mb-1">Bus Fleet ID</label>
                  <input
                    className="field"
                    value={formData.busId}
                    onChange={e => setFormData({ ...formData, busId: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Inspector / Captain Name</label>
                  <input
                    className="field"
                    value={formData.driverName}
                    onChange={e => setFormData({ ...formData, driverName: e.target.value })}
                  />
                </div>
              </div>

              {[
                ["brakes", "Braking System (Pneumatic Pressure > 8 Bar)", true],
                ["tyres", "Tyres & Rims (No cuts/bulges, min 3mm tread)", true],
                ["steering", "Steering Column Play & Power Assist", true],
                ["lights", "High/Low Beams, Hazard Lights & Blinkers", false],
                ["horn", "Dual Electric/Air Warning Horn", false],
                ["emergencyExits", "Emergency Window Hammers & Rear Door", false],
                ["firstAidFireExtinguisher", "Dry Chemical Powder Extinguisher & Kit", false],
                ["engineFluids", "Coolant Reservoir & Engine Oil Dipstick", false]
              ].map(([key, label, isCritical]) => (
                <div key={key} className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <span className="font-semibold text-slate-800">{label}</span>
                    {isCritical && <span className="ml-1 text-[10px] font-bold text-rose-500 uppercase">(Critical Safety)</span>}
                  </div>
                  <select
                    className="field w-40 text-xs py-1"
                    value={formData[key]}
                    onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                  >
                    <option value="Pass">Pass (Compliant)</option>
                    <option value="Fail - Defect Found">Fail (Defect Found)</option>
                  </select>
                </div>
              ))}

              <div className="pt-2">
                <label className="font-semibold text-slate-700 block mb-1">Inspection Notes / Defect Description</label>
                <textarea
                  rows={2}
                  className="field"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setModalOpen(false)} className="secondary-button">Cancel</button>
                <button type="submit" className="primary-button font-bold">Submit & Certify Inspection</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
