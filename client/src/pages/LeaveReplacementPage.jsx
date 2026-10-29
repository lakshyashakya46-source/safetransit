import { useEffect, useState } from "react";
import {
  CalendarCheck, UserCheck, ShieldCheck, AlertCircle,
  Sparkles, CheckCircle2, UserX, ArrowRight, UserPlus
} from "lucide-react";
import { api } from "../services/api";
import StatusBadge from "../components/StatusBadge";

export default function LeaveReplacementPage({ user }) {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replacementModal, setReplacementModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [suggestionData, setSuggestionData] = useState(null);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadLeaves();
  }, []);

  async function loadLeaves() {
    setLoading(true);
    try {
      const data = await api.list("leaves");
      setLeaves(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleFindReplacement(leave) {
    setSelectedLeave(leave);
    setReplacementModal(true);
    setSearching(true);
    setSuggestionData(null);
    try {
      const result = await api.suggestLeaveReplacement(leave._id);
      setSuggestionData(result);
    } catch (err) {
      alert("Failed to find replacement: " + err.message);
    } finally {
      setSearching(false);
    }
  }

  async function handleConfirmReplacement(candidateCrew) {
    if (!selectedLeave || !candidateCrew) return;

    try {
      await api.update("leaves", selectedLeave._id, {
        replacementStatus: "Replacement Assigned",
        replacementCrew: `${candidateCrew.name} (${candidateCrew.employeeId})`,
        status: "Approved"
      });

      setMessage(`Approved leave for ${selectedLeave.crew} and assigned backup crew: ${candidateCrew.name}!`);
      setReplacementModal(false);
      loadLeaves();
    } catch (err) {
      alert("Confirmation failed: " + err.message);
    }
  }

  async function handleDirectApprove(leave) {
    try {
      await api.update("leaves", leave._id, {
        status: "Approved"
      });
      setMessage(`Leave approved for ${leave.crew}.`);
      loadLeaves();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wide">
          <ShieldCheck size={14} />
          Workforce Continuity Engine
        </div>
        <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
          Leave Management & Smart Crew Replacement
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          When drivers or conductors take leave, the system identifies affected duty schedules and automatically finds verified replacements with compliant rest hours.
        </p>
      </div>

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-600" />
          {message}
        </div>
      )}

      {/* Leave Applications Table */}
      <div className="surface p-6">
        <h2 className="text-base font-bold text-navy mb-4">Active Leave Applications & Backup Rostering</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="p-3">Crew Member</th>
                <th className="p-3">Role & Depot</th>
                <th className="p-3">Leave Type</th>
                <th className="p-3">Dates</th>
                <th className="p-3">Reason</th>
                <th className="p-3">Leave Status</th>
                <th className="p-3">Backup Replacement</th>
                <th className="p-3 text-right">Depot Officer Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leaves.map((l) => (
                <tr key={l._id} className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-navy">{l.crew}</td>
                  <td className="p-3 text-slate-600">{l.role} • {l.depot || "Jaipur Central"}</td>
                  <td className="p-3 font-semibold text-blue-700">{l.type}</td>
                  <td className="p-3 text-slate-700 whitespace-nowrap">{l.start} to {l.end}</td>
                  <td className="p-3 max-w-xs text-slate-600 truncate" title={l.reason}>{l.reason}</td>
                  <td className="p-3">
                    <StatusBadge value={l.status} />
                  </td>
                  <td className="p-3">
                    <StatusBadge value={l.replacementStatus} />
                    {l.replacementCrew && (
                      <p className="mt-1 font-bold text-purple-700 text-[11px]">{l.replacementCrew}</p>
                    )}
                  </td>
                  <td className="p-3 text-right space-x-2">
                    {l.status === "Pending" && (
                      <button
                        onClick={() => handleFindReplacement(l)}
                        className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 text-xs shadow-sm transition inline-flex items-center gap-1.5"
                      >
                        <Sparkles size={13} />
                        Find Replacement
                      </button>
                    )}
                    {l.status === "Pending" && (
                      <button
                        onClick={() => handleDirectApprove(l)}
                        className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1.5 text-xs transition"
                      >
                        Approve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Replacement Heuristic Recommendation Modal */}
      {replacementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="surface max-w-xl w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-blue-600" />
                <div>
                  <h3 className="font-bold text-navy text-base">Automatic Replacement Recommendations</h3>
                  <p className="text-xs text-slate-400">Finding best available {selectedLeave?.role} for {selectedLeave?.crew}</p>
                </div>
              </div>
              <button onClick={() => setReplacementModal(false)} className="text-slate-400 font-bold text-lg">✕</button>
            </div>

            {searching ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Scanning available workforce for rest compliance and route eligibility...
              </div>
            ) : suggestionData ? (
              <div className="space-y-4">
                {/* Primary Suggested Candidate */}
                {suggestionData.suggestedReplacement ? (
                  <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50/50 p-4 text-xs">
                    <span className="font-bold text-emerald-800 uppercase tracking-wider text-[10px]">
                      ★ Top Ranked Replacement Candidate
                    </span>
                    <div className="flex items-center justify-between mt-2">
                      <div>
                        <h4 className="text-base font-extrabold text-navy">{suggestionData.suggestedReplacement.name}</h4>
                        <p className="text-slate-600 font-medium">
                          {suggestionData.suggestedReplacement.employeeId} • {suggestionData.suggestedReplacement.depot}
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-100 border border-emerald-300 px-3 py-1 font-bold text-emerald-800">
                        100% Eligible
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-slate-700 bg-white/80 p-2.5 rounded-xl border border-emerald-200">
                      <div>Rest Hours: <b>{suggestionData.suggestedReplacement.restHours || 14}h</b></div>
                      <div>Weekly Hours: <b>{suggestionData.suggestedReplacement.weeklyHours || 24}h / 48h</b></div>
                      <div>Status: <b className="text-emerald-700">Available</b></div>
                    </div>

                    <button
                      onClick={() => handleConfirmReplacement(suggestionData.suggestedReplacement)}
                      className="primary-button w-full mt-4 font-bold text-xs py-2.5 flex items-center justify-center gap-2"
                    >
                      <UserCheck size={16} />
                      Confirm & Assign {suggestionData.suggestedReplacement.name} as Replacement
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl bg-amber-50 p-4 text-xs text-amber-800">
                    No fully eligible unassigned crew member found in depot. Manual officer override required.
                  </div>
                )}

                {/* Other Candidates List */}
                {suggestionData.candidates?.length > 1 && (
                  <div>
                    <h5 className="font-bold text-xs text-slate-700 mb-2">Other Available Candidates</h5>
                    <div className="space-y-2 max-h-40 overflow-y-auto text-xs">
                      {suggestionData.candidates.slice(1).map((c, i) => (
                        <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                          <div>
                            <span className="font-bold text-slate-800">{c.crew.name}</span>
                            <span className="text-slate-400 ml-2">({c.restHours}h rest)</span>
                          </div>
                          <button
                            onClick={() => handleConfirmReplacement(c.crew)}
                            className="secondary-button text-[11px] font-semibold py-1 px-2.5"
                          >
                            Assign Instead
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
