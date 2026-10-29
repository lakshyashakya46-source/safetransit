import { useEffect, useState } from "react";
import { Save, ShieldCheck, AlertTriangle, CheckCircle2, Sliders, History } from "lucide-react";
import { api } from "../services/api";

const fields = [
  ["maxDutyHours", "Maximum Daily Duty Hours", "Total shift time including prep, depot handover and delays", "Hours"],
  ["maxDrivingHours", "Maximum Daily Steering Hours", "Continuous steering time behind the wheel", "Hours"],
  ["minRestHours", "Minimum Mandatory Rest Interval", "Required uninterrupted rest between two shifts", "Hours"],
  ["weeklyLimit", "Statutory Weekly Working Cap", "Maximum cumulative duty hours allowed per rolling 7 days", "Hours"],
  ["overtimeThreshold", "Daily Overtime Threshold", "Shift hours beyond which duty is billed as overtime", "Hours"],
  ["maxConsecutiveDays", "Maximum Consecutive Working Days", "Days allowed before mandatory 24-hour weekly rest", "Days"],
  ["nightShiftMultiplier", "Night Shift Fatigue Multiplier", "Risk weight applied for shifts between 22:00 - 06:00", "Multiplier"]
];

export default function PolicyPage({ user }) {
  const [policy, setPolicy] = useState(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadPolicy();
  }, []);

  async function loadPolicy() {
    try {
      const data = await api.policies();
      setPolicy(data || {});
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!reason.trim()) {
      alert("Please provide an administrative reason for this safety policy change (required for statutory audit).");
      return;
    }

    setSaving(true);
    try {
      const updated = await api.updatePolicies({
        ...policy,
        reason
      });
      setPolicy(updated);
      setMessage("Department safety policy successfully updated and permanently logged to Audit Trail.");
      setReason("");
    } catch (err) {
      alert("Update failed: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!policy) {
    return <div className="surface p-10 text-center text-xs text-slate-500">Loading Safety Policy Configuration...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wide">
          <Sliders size={14} />
          Statutory Governance Engine
        </div>
        <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
          Department Safety Policy Engine
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Configure real-time safety thresholds instead of hard-coding static rules. Every modification generates an immutable administrative audit record.
        </p>
      </div>

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-600" />
          {message}
        </div>
      )}

      {/* Policy Form */}
      <form onSubmit={handleSave} className="surface p-6 space-y-6">
        <div className="grid gap-5 sm:grid-cols-2 text-xs">
          {fields.map(([key, label, desc, unit]) => (
            <div key={key} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-navy">{label}</label>
                <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{unit}</span>
              </div>
              <p className="text-slate-500 mb-3 text-[11px] leading-relaxed">{desc}</p>
              <input
                type="number"
                step="0.1"
                className="field font-bold text-base bg-white"
                value={policy[key] ?? ""}
                onChange={e => setPolicy({ ...policy, [key]: Number(e.target.value) })}
              />
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 pt-5">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Administrative Rationale for Policy Modification <span className="text-rose-500">*</span>
          </label>
          <input
            className="field text-xs"
            placeholder="e.g. Aligned minimum rest from 9.0h to 10.0h pursuant to State Road Transport Safety Circular No. 2026/04."
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
          <p className="mt-1 text-[11px] text-slate-400">
            Recorded in the public audit ledger with officer username and timestamp.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="primary-button flex items-center gap-2 text-xs font-bold py-2.5 px-6"
        >
          <Save size={16} />
          {saving ? "Saving & Logging..." : "Save Safety Policy Configuration"}
        </button>
      </form>
    </div>
  );
}
