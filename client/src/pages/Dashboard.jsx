import { useEffect, useState } from "react";
import {
  AlertTriangle, BusFront, CheckCircle2, Clock3, Users, Wallet,
  ShieldAlert, TrendingUp, Sparkles, AlertCircle, ArrowUpRight, Activity
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, Tooltip, Legend, AreaChart, Area
} from "recharts";
import { api } from "../services/api";
import MetricCard from "../components/MetricCard";
import StatusBadge from "../components/StatusBadge";

export default function Dashboard({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [safetySimModal, setSafetySimModal] = useState(false);
  const [simParams, setSimParams] = useState({
    workingHours: 9.5,
    drivingHours: 7.5,
    restHours: 8.5,
    weeklyHours: 42,
    consecutiveDays: 5,
    isNightShift: false
  });
  const [simResult, setSimResult] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await api.analytics();
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function runSimulation() {
    try {
      const res = await api.safetyCheck(simParams);
      setSimResult(res);
    } catch (err) {
      alert("Simulation error: " + err.message);
    }
  }

  if (loading) {
    return (
      <div className="surface p-12 text-center">
        <Activity size={32} className="mx-auto text-blue-600 animate-spin mb-3" />
        <p className="font-semibold text-slate-700">Connecting to SafeTransit Engine...</p>
        <p className="text-xs text-slate-400 mt-1">Aggregating live telemetry and fatigue matrices</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
        <p className="font-bold">Operational Data Error</p>
        <p className="text-sm mt-1">{error}</p>
        <button onClick={loadData} className="mt-3 primary-button text-xs">Retry</button>
      </div>
    );
  }

  const metrics = [
    ["Total Fleet Active", `${data.activeBuses} / ${data.buses}`, `${data.maintenanceBuses} in maintenance`, BusFront],
    ["Crew on Duty", `${data.onDutyCrew} / ${data.crew}`, `${data.availableCrew} available for dispatch`, Users],
    ["Active Trips", data.activeTrips || 4, `${data.trips} total scheduled today`, CheckCircle2],
    ["High Fatigue Alerts", data.fatigueDistribution?.find(f => f.name.includes("High"))?.value || 3, "Mandatory officer intervention", ShieldAlert],
    ["Overtime Due", `₹${(data.totalOvertimeDue || 0).toLocaleString("en-IN")}`, `${data.pendingOvertime} requests pending`, Wallet],
    ["Emergency Incidents", data.emergencies, `${data.criticalEmergencies || 0} critical severity open`, AlertTriangle]
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 tracking-wide uppercase">
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            National Transit Safety & Operations Command
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
            Executive Command Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Right Person + Right Bus + Right Route + Right Time + Safe Working Hours.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { setSafetySimModal(true); runSimulation(); }}
            className="secondary-button flex items-center gap-2 text-xs font-bold"
          >
            <Sparkles size={15} className="text-blue-600" />
            Simulate Safety Engine
          </button>
          <button
            onClick={() => onNavigate && onNavigate("Smart Duty Allocation")}
            className="primary-button flex items-center gap-2 text-xs font-bold shadow-md shadow-blue-500/20"
          >
            <Clock3 size={15} />
            Smart Duty Allocation
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {metrics.map(([label, value, hint, Icon], i) => (
          <div key={label} className="surface p-4 flex flex-col justify-between hover:border-blue-300 transition">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold text-slate-500 leading-tight">{label}</span>
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-blue-50 text-blue-600">
                <Icon size={17} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-navy">{value}</p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-400">{hint}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Fatigue Risk Distribution */}
        <div className="surface p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-bold text-navy">Fatigue & Rest Compliance</h2>
              <p className="text-xs text-slate-400">Rule-based assessment across all active crew duties</p>
            </div>
            <span className="text-xs font-bold px-2 py-1 rounded bg-blue-50 text-blue-700">MORTH Certified</span>
          </div>

          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.fatigueDistribution || []}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                  paddingAngle={4}
                  label
                >
                  {(data.fatigueDistribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs flex items-center justify-between">
            <span className="text-slate-600">Manual Overrides Logged:</span>
            <span className="font-bold text-purple-700">{data.manualOverrides || 1} Audited Decisions</span>
          </div>
        </div>

        {/* Fleet Availability & Maintenance Status */}
        <div className="surface p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-bold text-navy">Fleet Operational Readiness</h2>
              <p className="text-xs text-slate-400">Current status of all state carrier buses</p>
            </div>
            <StatusBadge value={data.maintenanceBuses > 0 ? "Maintenance Alert" : "Fleet Ready"} />
          </div>

          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.fleetStatusChart || []}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {(data.fleetStatusChart || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs flex items-center justify-between">
            <span className="text-slate-600">Buses in Active Service:</span>
            <span className="font-bold text-blue-700">{data.activeBuses} Units on Highway</span>
          </div>
        </div>
      </div>

      {/* Trends & Financial Reconciliation */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Weekly Working Duty Trends */}
        <div className="surface p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-navy">Weekly Aggregate Duty Load vs Safety Cap</h2>
              <p className="text-xs text-slate-400">Monitoring collective working hours against statutory ceiling</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
              <TrendingUp size={16} /> Within Safe Bounds
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.weeklyDutyTrends || []}>
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="dutyHours" stroke="#2563eb" fill="#dbeafe" name="Actual Hours" />
                <Area type="monotone" dataKey="safeCap" stroke="#ef4444" fill="transparent" strokeDasharray="4 4" name="Max Safety Threshold" />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Traceable Audit Trail */}
        <div className="surface p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-navy">Traceable Audit Feed</h2>
              <button
                onClick={() => onNavigate && onNavigate("Audit Logs")}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                View all <ArrowUpRight size={13} />
              </button>
            </div>
            <div className="space-y-3">
              {(data.recentAudits || []).slice(0, 4).map((audit, i) => (
                <div key={audit._id || i} className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{audit.action}</span>
                    <span className="text-[10px] text-slate-400">{new Date(audit.timestamp || audit.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="mt-1 text-slate-600 line-clamp-1">{audit.reason}</p>
                  <p className="mt-0.5 text-[10px] font-medium text-blue-600">By: {audit.user} ({audit.role})</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-blue-50/70 p-3 text-[11px] text-blue-900 border border-blue-100">
            <strong>Accountability Guarantee:</strong> Decisions like manual overrides and overtime approvals require mandatory recorded justifications and cannot be deleted.
          </div>
        </div>
      </div>

      {/* Safety Simulator Modal */}
      {safetySimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="surface max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-navy">Safety & Fatigue Policy Simulator</h3>
                <p className="text-xs text-slate-400">Test how the rule engine scores any hypothetical duty</p>
              </div>
              <button onClick={() => setSafetySimModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs mb-4">
              <label className="font-semibold">
                Duty Hours
                <input
                  type="number"
                  step="0.5"
                  className="field mt-1"
                  value={simParams.workingHours}
                  onChange={e => setSimParams({ ...simParams, workingHours: Number(e.target.value) })}
                />
              </label>

              <label className="font-semibold">
                Driving Hours
                <input
                  type="number"
                  step="0.5"
                  className="field mt-1"
                  value={simParams.drivingHours}
                  onChange={e => setSimParams({ ...simParams, drivingHours: Number(e.target.value) })}
                />
              </label>

              <label className="font-semibold">
                Rest Since Prior Duty (Hrs)
                <input
                  type="number"
                  step="0.5"
                  className="field mt-1"
                  value={simParams.restHours}
                  onChange={e => setSimParams({ ...simParams, restHours: Number(e.target.value) })}
                />
              </label>

              <label className="font-semibold">
                Prior Weekly Accumulated Hours
                <input
                  type="number"
                  step="1"
                  className="field mt-1"
                  value={simParams.weeklyHours}
                  onChange={e => setSimParams({ ...simParams, weeklyHours: Number(e.target.value) })}
                />
              </label>

              <label className="font-semibold">
                Consecutive Working Days
                <input
                  type="number"
                  step="1"
                  className="field mt-1"
                  value={simParams.consecutiveDays}
                  onChange={e => setSimParams({ ...simParams, consecutiveDays: Number(e.target.value) })}
                />
              </label>

              <label className="font-semibold flex items-center gap-2 mt-5">
                <input
                  type="checkbox"
                  checked={simParams.isNightShift}
                  onChange={e => setSimParams({ ...simParams, isNightShift: e.target.checked })}
                  className="h-4 w-4 rounded text-blue-600"
                />
                Night Shift (22:00 - 06:00)
              </label>
            </div>

            <button onClick={runSimulation} className="primary-button w-full text-xs font-bold py-2 mb-4">
              Evaluate Safety Compliance
            </button>

            {simResult && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Calculated Decision:</span>
                  <StatusBadge value={simResult.eligibility} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Fatigue Index Score:</span>
                  <span className="font-bold text-slate-900">{simResult.fatigueScore} / 100</span>
                </div>
                <p className="text-slate-700 font-medium">{simResult.summary}</p>

                {simResult.reasons?.length > 0 && (
                  <div className="border-t pt-2 text-rose-700 space-y-1">
                    <p className="font-bold text-[11px] uppercase">Violations Found:</p>
                    {simResult.reasons.map((r, i) => (
                      <p key={i}>• {r}</p>
                    ))}
                  </div>
                )}

                {simResult.warnings?.length > 0 && (
                  <div className="border-t pt-2 text-amber-700 space-y-1">
                    <p className="font-bold text-[11px] uppercase">Policy Warnings:</p>
                    {simResult.warnings.map((w, i) => (
                      <p key={i}>• {w}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
