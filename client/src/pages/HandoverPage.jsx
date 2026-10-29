import { useEffect, useState } from "react";
import {
  ArrowLeftRight, CheckCircle2, AlertTriangle, BusFront,
  MapPin, Clock, Gauge, Plus
} from "lucide-react";
import { api } from "../services/api";
import StatusBadge from "../components/StatusBadge";

export default function HandoverPage({ user }) {
  const [handovers, setHandovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState("");

  const [formData, setFormData] = useState({
    tripId: "TRIP-2026-083",
    busId: "BUS-108",
    routeName: "Jaipur → Ahmedabad → Mumbai Mega Transit",
    outgoingCrew: "Captain Harish Gehlot",
    incomingCrew: "Captain Dharmendra Yadav",
    location: "Udaipur Central Transit Hub",
    scheduledTime: "2026-10-21T21:30",
    actualTime: "2026-10-21T21:35",
    odometer: 48620,
    fuelLevel: "85%",
    mismatchDetected: "None"
  });

  useEffect(() => {
    loadHandovers();
  }, []);

  async function loadHandovers() {
    setLoading(true);
    try {
      const data = await api.list("handovers");
      setHandovers(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await api.create("handovers", {
        handoverId: `HND-${Date.now().toString().slice(-4)}`,
        ...formData,
        odometer: Number(formData.odometer),
        status: "Completed"
      });
      setMessage("Digital crew transit handover completed successfully.");
      setModalOpen(false);
      loadHandovers();
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
            <ArrowLeftRight size={14} />
            Intercity Relay Operations
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
            Digital Crew Transit Handover
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Enables long-distance route splitting. Outgoing drivers certify bus condition and odometer before incoming relief crew takes over.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="primary-button flex items-center gap-2 text-xs font-bold py-2.5 self-start"
        >
          <Plus size={16} />
          Record Station Handover
        </button>
      </div>

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-600" />
          {message}
        </div>
      )}

      {/* Handover Records Table */}
      <div className="surface p-6">
        <h2 className="text-base font-bold text-navy mb-4">Relay Handover Log & Mismatch Audits</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="p-3">Handover ID</th>
                <th className="p-3">Bus & Trip</th>
                <th className="p-3">Route Corridor</th>
                <th className="p-3">Outgoing Crew</th>
                <th className="p-3">Incoming Relief</th>
                <th className="p-3">Handover Location</th>
                <th className="p-3">Odometer / Fuel</th>
                <th className="p-3">Mismatch Audit</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {handovers.map((h) => (
                <tr key={h._id} className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-navy">{h.handoverId || "HND-01"}</td>
                  <td className="p-3">
                    <span className="font-bold text-blue-600">{h.busId}</span>
                    <span className="text-slate-400 block text-[10px]">{h.tripId}</span>
                  </td>
                  <td className="p-3 max-w-xs text-slate-700 truncate">{h.routeName}</td>
                  <td className="p-3 font-medium text-slate-800">{h.outgoingCrew}</td>
                  <td className="p-3 font-medium text-purple-700">{h.incomingCrew}</td>
                  <td className="p-3 text-slate-600">{h.location}</td>
                  <td className="p-3 text-slate-500">{h.odometer} km • {h.fuelLevel}</td>
                  <td className="p-3">
                    <StatusBadge value={h.mismatchDetected || "None"} />
                  </td>
                  <td className="p-3">
                    <StatusBadge value={h.status || "Completed"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Handover Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="surface max-w-lg w-full p-6 shadow-2xl">
            <h3 className="font-bold text-navy text-base mb-1">Log Transit Relay Handover</h3>
            <p className="text-xs text-slate-400 mb-4">Certify vehicle condition at the intermediate change point</p>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Bus Unit</label>
                  <input
                    className="field"
                    value={formData.busId}
                    onChange={e => setFormData({ ...formData, busId: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Trip ID</label>
                  <input
                    className="field"
                    value={formData.tripId}
                    onChange={e => setFormData({ ...formData, tripId: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Route Corridor</label>
                <input
                  className="field"
                  value={formData.routeName}
                  onChange={e => setFormData({ ...formData, routeName: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Outgoing Driver</label>
                  <input
                    className="field"
                    value={formData.outgoingCrew}
                    onChange={e => setFormData({ ...formData, outgoingCrew: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Incoming Relief Driver</label>
                  <input
                    className="field"
                    value={formData.incomingCrew}
                    onChange={e => setFormData({ ...formData, incomingCrew: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Station Handover Location</label>
                <input
                  className="field"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Odometer Reading (Km)</label>
                  <input
                    type="number"
                    className="field"
                    value={formData.odometer}
                    onChange={e => setFormData({ ...formData, odometer: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Fuel / Charge Level</label>
                  <input
                    className="field"
                    value={formData.fuelLevel}
                    onChange={e => setFormData({ ...formData, fuelLevel: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setModalOpen(false)} className="secondary-button">Cancel</button>
                <button type="submit" className="primary-button font-bold">Certify & Save Handover</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
