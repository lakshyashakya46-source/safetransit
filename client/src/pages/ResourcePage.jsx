import { useEffect, useState } from "react";
import {
  Plus, RefreshCw, Search, CheckCircle2, AlertTriangle,
  ShieldCheck, UserCheck, Clock, Wallet, AlertOctagon, CheckCircle, XCircle,
  Play, Lock, Sparkles
} from "lucide-react";
import { api } from "../services/api";
import StatusBadge from "../components/StatusBadge";

const definitions = {
  "Crew Management": {
    resource: "crew",
    subtitle: "Verified drivers and conductors with real-time availability and rest context.",
    columns: [
      { key: "name", label: "Full Name" },
      { key: "employeeId", label: "Employee ID" },
      { key: "role", label: "Role" },
      { key: "depot", label: "Home Depot" },
      { key: "restHours", label: "Rest Available" },
      { key: "weeklyHours", label: "Weekly Accumulated" },
      { key: "availability", label: "Availability", isStatus: true },
      { key: "verified", label: "Verification", isStatus: true }
    ]
  },
  "Fleet Management": {
    resource: "buses",
    subtitle: "State bus fleet availability, maintenance readiness, and inspection history.",
    columns: [
      { key: "busId", label: "Bus Unit ID" },
      { key: "registration", label: "RTO Registration" },
      { key: "model", label: "Model / Chassis" },
      { key: "depot", label: "Assigned Depot" },
      { key: "capacity", label: "Passenger Capacity" },
      { key: "status", label: "Dispatch Status", isStatus: true },
      { key: "maintenanceStatus", label: "Fitness Status", isStatus: true }
    ]
  },
  "Duties": {
    resource: "duties",
    subtitle: "Duty assignments with rule-based fatigue and eligibility signals.",
    columns: [
      { key: "dutyId", label: "Duty ID" },
      { key: "crew", label: "Crew Member" },
      { key: "routeName", label: "Route" },
      { key: "busId", label: "Bus" },
      { key: "workingHours", label: "Duty Hours" },
      { key: "restBefore", label: "Rest Before" },
      { key: "risk", label: "Fatigue Risk", isStatus: true },
      { key: "eligibility", label: "Eligibility", isStatus: true },
      { key: "status", label: "Status", isStatus: true }
    ]
  },
  "Overtime Authorizations": {
    resource: "overtime",
    subtitle: "Department Officer Overtime & Duty Approval Queue with Live Rest Verification.",
    columns: [
      { key: "requestId", label: "Request ID" },
      { key: "driverName", label: "Driver" },
      { key: "requestedHours", label: "Hours" },
      { key: "continuousRestHours", label: "Live Rest (9h Req)" },
      { key: "reason", label: "Justification" },
      { key: "amount", label: "Payable (₹)" },
      { key: "status", label: "Status", isStatus: true }
    ]
  }
};

export default function ResourcePage({ name, user }) {
  const def = definitions[name] || definitions["Crew Management"];
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [errorBanner, setErrorBanner] = useState("");

  // Officer Decision Modal
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [decisionModalMode, setDecisionModalMode] = useState("APPROVE"); // "APPROVE" | "REJECT"
  const [approvedHoursInput, setApprovedHoursInput] = useState(2.0);
  const [decisionReasonInput, setDecisionReasonInput] = useState("");
  const [exceptionBasisInput, setExceptionBasisInput] = useState("");

  // Officer Driver Clearance Board
  const [clearanceBoard, setClearanceBoard] = useState([]);
  const [dispatchingDriver, setDispatchingDriver] = useState(null);

  useEffect(() => {
    loadData();
  }, [name]);

  async function loadData() {
    setLoading(true);
    setErrorBanner("");
    try {
      if (name === "Overtime Authorizations") {
        const [queue, board] = await Promise.all([
          api.officerOvertimeQueue().catch(() => []),
          api.driversClearanceBoard().catch(() => [])
        ]);

        if (queue && queue.length > 0) {
          setRows(queue);
        } else {
          // Fallback to legacy overtime list
          const legacy = await api.list("overtime");
          const formatted = (legacy || []).map(o => ({
            _id: o._id,
            requestId: o.tripId ? `OTR-${o.tripId.slice(-4)}` : "OTR-2026-001",
            driverName: o.crew,
            employeeId: o.employeeId || "DRV-1001",
            requestedHours: o.requestedHours,
            continuousRestHours: 9.5,
            reason: o.reason,
            amount: o.amount || o.requestedHours * 350,
            status: o.status === "Approved" ? "APPROVED" : (o.status === "Rejected" ? "REJECTED" : "PENDING_APPROVAL"),
            isEmergency: false
          }));
          setRows(formatted);
        }

        setClearanceBoard(Array.isArray(board) ? board : []);
      } else {
        const data = await api.list(def.resource);
        setRows(data || []);
      }
    } catch (e) {
      console.error(e);
      setErrorBanner(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleOfficerDispatch(driver) {
    setDispatchingDriver(driver.driverName);
    setErrorBanner("");
    try {
      await api.startDuty({
        driverName: driver.driverName,
        employeeId: driver.employeeId,
        busId: driver.busId,
        routeName: driver.routeName,
        scheduledHours: 8.0
      });
      setMessage(`✅ Shift successfully authorized and started for Captain ${driver.driverName} on Bus ${driver.busId}! Operational notification broadcasted to Control Room.`);
      await loadData();
    } catch (err) {
      setErrorBanner(err.message);
    } finally {
      setDispatchingDriver(null);
    }
  }

  function openDecisionModal(req, mode) {
    setSelectedRequest(req);
    setDecisionModalMode(mode);
    setApprovedHoursInput(req.requestedHours || 2.0);
    setDecisionReasonInput(
      mode === "APPROVE"
        ? `Verified delay justification and compliance with safety rest rules.`
        : `Overtime request rejected due to departmental operational constraints.`
    );
    setExceptionBasisInput(req.isEmergency ? `Emergency exception authorized under section 13(2) of transport safety regulations.` : "");
  }

  async function handleConfirmDecision(e) {
    e.preventDefault();
    if (!selectedRequest) return;
    setErrorBanner("");

    try {
      await api.officerOvertimeDecision({
        requestId: selectedRequest.requestId || selectedRequest._id,
        decision: decisionModalMode === "APPROVE" ? "APPROVED" : "REJECTED",
        approvedHours: Number(approvedHoursInput),
        decisionReason: decisionReasonInput,
        exceptionBasis: exceptionBasisInput || undefined
      });

      setMessage(`Request ${selectedRequest.requestId || selectedRequest._id} successfully ${decisionModalMode === "APPROVE" ? "Approved" : "Rejected"}. Recorded in immutable audit ledger.`);
      setSelectedRequest(null);
      await loadData();
    } catch (err) {
      setErrorBanner(err.message);
    }
  }

  async function handleVerifyCrew(crew) {
    try {
      await api.update("crew", crew._id, { verified: true });
      setMessage(`Crew member ${crew.name} verified successfully.`);
      loadData();
    } catch (err) {
      setErrorBanner(err.message);
    }
  }

  const filtered = rows.filter(r => {
    if (!search) return true;
    const str = JSON.stringify(r).toLowerCase();
    return str.includes(search.toLowerCase());
  });

  const filteredBoard = clearanceBoard.filter(b => {
    if (!search) return true;
    const str = `${b.driverName} ${b.employeeId} ${b.busId || ''} ${b.routeName || ''} ${b.depot || ''}`.toLowerCase();
    return str.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wide">
            {name === "Overtime Authorizations" ? "Depot Safety Command" : "Operations Ledger"}
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">{name}</h1>
          <p className="text-xs sm:text-sm text-slate-500">{def.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="secondary-button flex items-center gap-2 text-xs font-semibold py-2"
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage("")} className="text-emerald-700 font-bold hover:underline">✕</button>
        </div>
      )}

      {errorBanner && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800 flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-rose-600 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button onClick={() => setErrorBanner("")} className="text-rose-700 font-bold hover:underline">✕</button>
        </div>
      )}

      {/* Overtime Authorizations Header Banner */}
      {name === "Overtime Authorizations" && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-xs text-slate-700 flex items-start gap-3">
          <ShieldCheck className="text-blue-600 shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-bold text-navy">Statutory Safety Rest Enforcement Active</p>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Ordinary overtime approval requires verified completion of at least <b>9.0 continuous rest hours</b>. Approvals prior to 9h require an Emergency Exception justification. The backend independently recalculates driver rest before executing approvals.
            </p>
          </div>
        </div>
      )}

      {/* DRIVER REST & DISPATCH CLEARANCE BOARD (DEMO SCENARIOS) */}
      {name === "Overtime Authorizations" && clearanceBoard.length > 0 && (
        <div className="surface p-5 border border-blue-200 bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-slate-50 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-blue-100 pb-3 mb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider">
                <Sparkles size={15} />
                <span>Driver Duty & Dispatch Clearance Board (चालक ड्यूटी और विश्राम क्लीयरेंस बोर्ड)</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Depot Officer live control: Monitor continuous rest, enforce statutory rest lockouts, inspect pending overtime claims, and authorize shift dispatch.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-blue-200 shadow-2xs">
                <Search size={14} className="text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Filter driver by name/ID..."
                  className="bg-transparent text-xs outline-none w-44 font-medium"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600 font-bold text-xs">✕</button>
                )}
              </div>
              <span className="text-[11px] font-bold text-slate-500 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                {filteredBoard.length} Drivers
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {filteredBoard.length === 0 ? (
              <div className="col-span-full py-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-dashed border-slate-200">
                <p className="font-bold text-slate-700">No driver records found matching "{search}"</p>
                <p className="text-[11px] text-slate-400 mt-1">Try searching by driver name ("Dharmendra", "Mukesh", "Harish", "Suresh", "Pawan") or employee ID.</p>
              </div>
            ) : (
              filteredBoard.map((drv) => {
              const restHours = Number(drv.restEvaluation?.continuousRestHours ?? 0);
              const isActive = drv.scenarioKey === "ACTIVE_ON_DUTY";
              const isLocked = drv.scenarioKey === "REST_LOCKED";
              const isPendingOT = drv.scenarioKey === "OVERTIME_PENDING";
              const isApprovedOT = drv.scenarioKey === "OVERTIME_APPROVED";
              const isFullyRested = drv.scenarioKey === "FULLY_RESTED";

              return (
                <div
                  key={drv.driverName}
                  className={`rounded-2xl p-3.5 border bg-white flex flex-col justify-between shadow-xs transition hover:shadow-md ${
                    isActive ? "border-blue-400 ring-2 ring-blue-500/20" :
                    isLocked ? "border-rose-300 bg-rose-50/20" :
                    isPendingOT ? "border-amber-400 ring-2 ring-amber-500/20" :
                    isApprovedOT ? "border-purple-300" :
                    "border-emerald-300 ring-1 ring-emerald-500/20"
                  }`}
                >
                  <div>
                    {/* Header with Name & Status indicator */}
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-navy text-xs truncate" title={drv.driverName}>
                        {drv.driverName}
                      </span>
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                        isActive ? "bg-blue-600 animate-pulse" :
                        isLocked ? "bg-rose-500" :
                        isPendingOT ? "bg-amber-500 animate-pulse" :
                        isApprovedOT ? "bg-purple-600" :
                        "bg-emerald-500"
                      }`} />
                    </div>

                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {drv.employeeId} • {drv.busId}
                    </div>

                    {/* Status Badge */}
                    <div className="mt-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        isActive ? "bg-blue-100 text-blue-800" :
                        isLocked ? "bg-rose-100 text-rose-800" :
                        isPendingOT ? "bg-amber-100 text-amber-800" :
                        isApprovedOT ? "bg-purple-100 text-purple-800" :
                        "bg-emerald-100 text-emerald-800"
                      }`}>
                        {isLocked && <Lock size={10} />}
                        {isActive && <Clock size={10} />}
                        {isPendingOT && <AlertTriangle size={10} />}
                        {isFullyRested && <CheckCircle size={10} />}
                        {drv.badgeLabel}
                      </span>
                    </div>

                    {/* Rest & Duty Metrics */}
                    <div className="mt-2.5 space-y-1 text-[11px]">
                      {isActive ? (
                        <p className="text-blue-700 font-semibold flex items-center justify-between">
                          <span>Shift Status:</span>
                          <span className="font-bold">On Route (NH-48)</span>
                        </p>
                      ) : (
                        <p className="text-slate-600 flex items-center justify-between">
                          <span>Continuous Rest:</span>
                          <span className={`font-bold ${restHours >= 9.0 ? "text-emerald-700" : "text-rose-700"}`}>
                            {restHours.toFixed(1)}h / 13h
                          </span>
                        </p>
                      )}

                      <p className="text-[10px] text-slate-500 line-clamp-2 leading-tight">
                        {drv.routeName}
                      </p>
                    </div>

                    {/* Specific Scenario Hints */}
                    <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-600">
                      {isActive && (
                        <span className="text-blue-600 font-medium">Duty timer running live in driver console.</span>
                      )}
                      {isLocked && (
                        <span className="text-rose-600 font-medium">⚠️ Rest deficit: {(9.0 - restHours).toFixed(1)}h to 9h overtime limit. Shift locked.</span>
                      )}
                      {isPendingOT && (
                        <span className="text-amber-700 font-medium">Claim OTR-2026-902 (2.5h) awaiting your decision in table below.</span>
                      )}
                      {isApprovedOT && (
                        <span className="text-purple-700 font-medium">OTR-2026-884 Approved (3.0h, ₹1,050). Actual hours reconciled.</span>
                      )}
                      {isFullyRested && (
                        <span className="text-emerald-700 font-medium">13h rest satisfied. Eligible for immediate dispatch.</span>
                      )}
                    </div>
                  </div>

                  {/* Officer Dispatch Action Button */}
                  <div className="mt-3 pt-2">
                    {isFullyRested && (
                      <button
                        onClick={() => handleOfficerDispatch(drv)}
                        disabled={dispatchingDriver === drv.driverName}
                        className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-2 text-[11px] shadow-sm flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Play size={12} />
                        <span>{dispatchingDriver === drv.driverName ? "Dispatching..." : "Authorize & Start Shift"}</span>
                      </button>
                    )}
                    {isPendingOT && (
                      <a
                        href="#overtime-table"
                        className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold py-1.5 px-2 text-[11px] shadow-sm flex items-center justify-center gap-1 transition"
                      >
                        <span>Review Claim Below ⬇</span>
                      </a>
                    )}
                    {isLocked && (
                      <div className="text-center py-1 text-[10px] font-bold text-rose-500 bg-rose-50 rounded-lg">
                        ⛔ Dispatch Blocked (Rest)
                      </div>
                    )}
                    {isActive && (
                      <div className="text-center py-1 text-[10px] font-bold text-blue-600 bg-blue-50 rounded-lg">
                        🟢 Currently In Transit
                      </div>
                    )}
                    {isApprovedOT && (
                      <div className="text-center py-1 text-[10px] font-bold text-purple-700 bg-purple-50 rounded-lg">
                        ✓ Overtime Authorized
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="surface p-3 flex items-center gap-2 max-w-sm">
        <Search size={16} className="text-slate-400" />
        <input
          className="bg-transparent text-xs w-full outline-none"
          placeholder="Filter records..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div id="overtime-table" className="surface p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                {name === "Overtime Authorizations" ? (
                  <>
                    <th className="p-3">Request ID</th>
                    <th className="p-3">Driver</th>
                    <th className="p-3">Requested</th>
                    <th className="p-3">Live Rest Status</th>
                    <th className="p-3">Emergency?</th>
                    <th className="p-3">Operational Reason</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Officer Action</th>
                  </>
                ) : (
                  <>
                    {def.columns.map(col => (
                      <th key={col.key} className="p-3">{col.label}</th>
                    ))}
                    {name === "Crew Management" && (
                      <th className="p-3 text-right">Action</th>
                    )}
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((row, idx) => {
                if (name === "Overtime Authorizations") {
                  const isPending = row.status === "PENDING_APPROVAL" || row.status === "Pending";
                  const restHours = Number(row.continuousRestHours ?? row.liveRestEvaluation?.continuousRestHours ?? 9.5);
                  const isRestCompliant = restHours >= 9.0;

                  return (
                    <tr key={row._id || row.requestId || idx} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-navy">{row.requestId || `OTR-${idx + 101}`}</td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-900">{row.driverName || row.crew}</div>
                        <div className="text-[10px] text-slate-400">{row.employeeId || "DRV-1001"} • {row.busId || "BUS-101"}</div>
                      </td>
                      <td className="p-3 font-bold text-blue-700">{row.requestedHours}h</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded font-bold text-[11px] flex items-center gap-1 w-fit ${
                          isRestCompliant ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}>
                          {isRestCompliant ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                          {restHours}h Rest ({isRestCompliant ? "Eligible" : "Deficit"})
                        </span>
                      </td>
                      <td className="p-3">
                        {row.isEmergency ? (
                          <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                            EMERGENCY
                          </span>
                        ) : (
                          <span className="text-slate-500">Standard</span>
                        )}
                      </td>
                      <td className="p-3 max-w-xs truncate" title={row.reason}>
                        {row.reason}
                      </td>
                      <td className="p-3">
                        <StatusBadge value={row.status} />
                      </td>
                      <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                        {isPending ? (
                          <>
                            <button
                              onClick={() => openDecisionModal(row, "APPROVE")}
                              className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 text-[11px]"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => openDecisionModal(row, "REJECT")}
                              className="rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold px-2.5 py-1 text-[11px]"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-400">Decided</span>
                        )}
                      </td>
                    </tr>
                  );
                }

                // Standard Table Rendering for other resources
                return (
                  <tr key={row._id || idx} className="hover:bg-slate-50">
                    {def.columns.map(col => {
                      const val = row[col.key];
                      return (
                        <td key={col.key} className="p-3">
                          {col.isStatus ? (
                            <StatusBadge value={val} />
                          ) : col.key === "restHours" ? (
                            <span className="font-semibold text-emerald-700">{val} Hours</span>
                          ) : col.key === "weeklyHours" ? (
                            <span className="font-semibold">{val}h / 48h</span>
                          ) : col.key === "amount" ? (
                            <span className="font-bold text-blue-700">₹{val}</span>
                          ) : (
                            <span className="text-slate-700">{val ?? "—"}</span>
                          )}
                        </td>
                      );
                    })}

                    {name === "Crew Management" && (
                      <td className="p-3 text-right">
                        {!row.verified ? (
                          <button
                            onClick={() => handleVerifyCrew(row)}
                            className="rounded-lg bg-blue-600 text-white font-bold px-2 py-1 text-[11px]"
                          >
                            Verify
                          </button>
                        ) : (
                          <span className="text-[11px] font-semibold text-emerald-600">✓ Verified</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* OFFICER DECISION MODAL */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="surface max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div>
                <h3 className="font-bold text-navy text-base">
                  {decisionModalMode === "APPROVE" ? "Authorize Overtime Request" : "Reject Overtime Request"}
                </h3>
                <p className="text-xs text-slate-400">
                  Request: {selectedRequest.requestId} • Driver: {selectedRequest.driverName || selectedRequest.crew}
                </p>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="text-slate-400 text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handleConfirmDecision} className="space-y-3 text-xs">
              {/* Compliance Rest Status Overview */}
              <div className="rounded-xl bg-slate-50 border p-3 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Driver Continuous Rest:</span>
                  <span className={`font-bold ${
                    (selectedRequest.continuousRestHours ?? 9.5) >= 9.0 ? "text-emerald-700" : "text-rose-600"
                  }`}>
                    {selectedRequest.continuousRestHours ?? 9.5} Hours
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Statutory Overtime Rest Requirement:</span>
                  <span className="font-bold text-navy">9.0 Hours Continuous</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Driver Reason:</span>
                  <span className="text-slate-800 font-semibold">{selectedRequest.reason}</span>
                </div>
              </div>

              {/* Warning if rest < 9h and not emergency */}
              {(selectedRequest.continuousRestHours ?? 9.5) < 9.0 && !selectedRequest.isEmergency && decisionModalMode === "APPROVE" && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-900">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle size={15} /> Safety Law Warning
                  </p>
                  <p className="text-[11px] mt-1">
                    Driver has not completed the required 9.0 hours of continuous rest. Approval will be rejected by backend compliance checks unless a verified emergency exception is documented.
                  </p>
                </div>
              )}

              {/* Emergency Exception Justification for Officer */}
              {(selectedRequest.isEmergency || (selectedRequest.continuousRestHours ?? 9.5) < 9.0) && decisionModalMode === "APPROVE" && (
                <div>
                  <label className="font-semibold block mb-1 text-rose-700">
                    Emergency Exception Basis & Lawful Justification (Mandatory)
                  </label>
                  <textarea
                    rows={2}
                    className="field border-rose-300"
                    placeholder="Enter formal justification explaining why passenger safety or vehicle containment requires this exception..."
                    value={exceptionBasisInput}
                    onChange={e => setExceptionBasisInput(e.target.value)}
                    required
                  />
                </div>
              )}

              {decisionModalMode === "APPROVE" && (
                <div>
                  <label className="font-semibold block mb-1">Approved Overtime Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="8"
                    className="field"
                    value={approvedHoursInput}
                    onChange={e => setApprovedHoursInput(e.target.value)}
                    required
                  />
                  <p className="text-[11px] text-blue-600 font-semibold mt-1">
                    Payable Amount: ₹{Number(approvedHoursInput || 0) * 350} (at ₹350/hr)
                  </p>
                </div>
              )}

              <div>
                <label className="font-semibold block mb-1">
                  {decisionModalMode === "APPROVE" ? "Officer Decision Reason (Mandatory)" : "Mandatory Rejection Reason"}
                </label>
                <textarea
                  rows={2}
                  className="field"
                  placeholder={decisionModalMode === "APPROVE" ? "Explain verification steps performed..." : "Specify reason for rejecting overtime request..."}
                  value={decisionReasonInput}
                  onChange={e => setDecisionReasonInput(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setSelectedRequest(null)} className="secondary-button">Cancel</button>
                <button
                  type="submit"
                  className={`font-bold px-4 py-2 rounded-xl text-white shadow-sm transition ${
                    decisionModalMode === "APPROVE"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {decisionModalMode === "APPROVE" ? "Confirm Approval" : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
