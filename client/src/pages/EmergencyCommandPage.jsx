import { useEffect, useState } from "react";
import {
  AlertTriangle, ShieldAlert, CheckCircle2, PhoneCall,
  Clock, MapPin, BusFront, Wrench, Plus, CheckCheck
} from "lucide-react";
import { api } from "../services/api";
import StatusBadge from "../components/StatusBadge";

export default function EmergencyCommandPage({ user }) {
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [actionModal, setActionModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [newStatus, setNewStatus] = useState("Responding");
  const [responseNotes, setResponseNotes] = useState("");
  const [createModal, setCreateModal] = useState(false);
  const [newIncident, setNewIncident] = useState({
    type: "Breakdown",
    bus: "BUS-102",
    crew: "Captain Mukesh Meena",
    route: "Jaipur - Delhi NH-48",
    location: "Shahpura Highway Checkpost",
    severity: "High",
    description: "Radiator hose rupture causing engine overheating. Vehicle halted safely at toll plaza."
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadEmergencies();
  }, []);

  async function loadEmergencies() {
    setLoading(true);
    try {
      const data = await api.list("emergencies");
      setEmergencies(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateResponse(e) {
    e.preventDefault();
    if (!selectedIncident) return;

    try {
      await api.update("emergencies", selectedIncident._id, {
        status: newStatus,
        responseNotes: responseNotes || `Updated to ${newStatus} by ${user.name}`,
        resolvedAt: newStatus === "Resolved" ? new Date().toISOString() : undefined
      });
      setMessage(`Incident ${selectedIncident.emergencyId || selectedIncident.type} updated to: ${newStatus}`);
      setActionModal(false);
      loadEmergencies();
    } catch (err) {
      alert("Update failed: " + err.message);
    }
  }

  async function handleCreateIncident(e) {
    e.preventDefault();
    try {
      await api.create("emergencies", {
        emergencyId: `EMG-${Date.now().toString().slice(-4)}`,
        ...newIncident,
        status: "Reported",
        reportedAt: new Date().toISOString()
      });
      setMessage("New emergency incident registered and broadcasted across Command Centers.");
      setCreateModal(false);
      loadEmergencies();
    } catch (err) {
      alert("Creation failed: " + err.message);
    }
  }

  const filtered = emergencies.filter(e => {
    if (filter === "ACTIVE") return e.status !== "Resolved" && e.status !== "Closed";
    if (filter === "RESOLVED") return e.status === "Resolved" || e.status === "Closed";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-rose-600 uppercase tracking-wide">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-600 animate-ping" />
            Control Room Incident Command
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
            Emergency Response & Breakdown Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time highway distress calls, breakdown assistance dispatch, medical triage, and multi-agency response tracking.
          </p>
        </div>

        <button
          onClick={() => setCreateModal(true)}
          className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2.5 flex items-center gap-2 shadow-md shadow-rose-600/30 transition self-start"
        >
          <Plus size={16} />
          Log Incident / SOS Call
        </button>
      </div>

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-600" />
          {message}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 text-xs font-bold">
        {[
          ["ALL", "All Incidents"],
          ["ACTIVE", "Active Critical Responding"],
          ["RESOLVED", "Resolved / Closed"]
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-xl transition ${
              filter === key
                ? "bg-navy text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Incidents Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((item) => {
          const isCritical = item.severity === "Critical";
          const isResolved = item.status === "Resolved" || item.status === "Closed";

          return (
            <div
              key={item._id}
              className={`surface p-5 flex flex-col justify-between border-2 transition ${
                isResolved
                  ? "border-slate-200 opacity-80"
                  : isCritical
                  ? "border-rose-400 bg-rose-50/20"
                  : "border-amber-300 bg-amber-50/10"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-navy text-base">
                      {item.emergencyId || "EMG-ACT"}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {item.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge value={`Severity: ${item.severity || "High"}`} />
                    <StatusBadge value={item.status} />
                  </div>
                </div>

                <p className="text-xs font-semibold text-slate-800 mt-2 leading-relaxed">
                  {item.description}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 truncate">
                    <BusFront size={14} className="text-blue-600 shrink-0" />
                    <span>Bus: <b>{item.bus}</b></span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin size={14} className="text-rose-500 shrink-0" />
                    <span>Location: <b>{item.location}</b></span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <Clock size={14} className="text-slate-400 shrink-0" />
                    <span>Reported: <b>{new Date(item.reportedAt || item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</b></span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-slate-400">Crew:</span>
                    <span className="font-bold text-slate-700">{item.crew}</span>
                  </div>
                </div>

                {item.responseNotes && (
                  <div className="mt-3 rounded-xl bg-blue-50 border border-blue-100 p-2.5 text-xs text-blue-900">
                    <span className="font-bold">Response Action: </span>
                    {item.responseNotes}
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {isResolved ? "Incident officially cleared and logged." : "Depot Officer coordination active"}
                </span>
                {!isResolved && (
                  <button
                    onClick={() => {
                      setSelectedIncident(item);
                      setNewStatus(item.status === "Reported" ? "Responding" : "Resolved");
                      setResponseNotes(item.responseNotes || "");
                      setActionModal(true);
                    }}
                    className="primary-button text-xs font-bold py-1.5 px-3"
                  >
                    Update Response Action
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action / Status Modal */}
      {actionModal && selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="surface max-w-md w-full p-6 shadow-2xl">
            <h3 className="font-bold text-navy text-base mb-1">
              Update Response: {selectedIncident.emergencyId || selectedIncident.type}
            </h3>
            <p className="text-xs text-slate-400 mb-4">Coordinate workshop van dispatch or mark incident as cleared</p>

            <form onSubmit={handleUpdateResponse} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Incident Operational Status</label>
                <select
                  className="field"
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                >
                  <option value="Acknowledged">Acknowledged (Dispatching Team)</option>
                  <option value="Responding">Responding (Relief En-Route)</option>
                  <option value="Resolved">Resolved (Safe to Resume / Passengers Shifted)</option>
                  <option value="Closed">Closed (Full Incident Report Filed)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Response Action Notes & Dispatch Log</label>
                <textarea
                  rows={3}
                  className="field"
                  placeholder="e.g. Mobile repair van 04 reached spot; replaced alternator belt. Trip resumed."
                  value={responseNotes}
                  onChange={e => setResponseNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setActionModal(false)} className="secondary-button">Cancel</button>
                <button type="submit" className="primary-button font-bold">Update Incident Status</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Incident Modal */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="surface max-w-md w-full p-6 shadow-2xl">
            <h3 className="font-bold text-navy text-base mb-1">Log New Operational Emergency</h3>
            <p className="text-xs text-slate-400 mb-4">Broadcast immediately to highway authorities and depot</p>

            <form onSubmit={handleCreateIncident} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Emergency Type</label>
                <select
                  className="field"
                  value={newIncident.type}
                  onChange={e => setNewIncident({ ...newIncident, type: e.target.value })}
                >
                  <option value="Breakdown">Breakdown</option>
                  <option value="Medical Emergency">Medical Emergency</option>
                  <option value="Accident">Accident</option>
                  <option value="Driver Unfit">Driver Unfit / Extreme Fatigue</option>
                  <option value="Route Obstruction">Route Obstruction</option>
                  <option value="Fire">Fire / Smoke</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Bus Fleet ID</label>
                  <input
                    className="field"
                    value={newIncident.bus}
                    onChange={e => setNewIncident({ ...newIncident, bus: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Severity</label>
                  <select
                    className="field"
                    value={newIncident.severity}
                    onChange={e => setNewIncident({ ...newIncident, severity: e.target.value })}
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Location Coordinates / Landmark</label>
                <input
                  className="field"
                  value={newIncident.location}
                  onChange={e => setNewIncident({ ...newIncident, location: e.target.value })}
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Description</label>
                <textarea
                  rows={2}
                  className="field"
                  value={newIncident.description}
                  onChange={e => setNewIncident({ ...newIncident, description: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setCreateModal(false)} className="secondary-button">Cancel</button>
                <button type="submit" className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2">
                  Broadcast Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
