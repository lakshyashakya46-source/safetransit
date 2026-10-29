import { useEffect, useState } from "react";
import {
  Calendar, Clock, ShieldCheck, AlertTriangle, CheckCircle2,
  BusFront, MapPin, ArrowRight, UserCheck, Sparkles, AlertCircle
} from "lucide-react";
import { api } from "../services/api";
import StatusBadge from "../components/StatusBadge";

export default function SmartDutyAssignment() {
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [selectedBusId, setSelectedBusId] = useState("");
  const [departureDate, setDepartureDate] = useState("2026-10-22");
  const [departureTime, setDepartureTime] = useState("07:00");

  const [loadingEvaluation, setLoadingEvaluation] = useState(false);
  const [evaluation, setEvaluation] = useState(null);

  // Assignment & Override State
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [selectedConductor, setSelectedConductor] = useState(null);
  const [overrideModal, setOverrideModal] = useState(false);
  const [overrideCandidate, setOverrideCandidate] = useState(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [assignmentSuccess, setAssignmentSuccess] = useState("");

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      const [routeList, busList] = await Promise.all([
        api.list("routes"),
        api.list("buses")
      ]);
      setRoutes(routeList || []);
      setBuses(busList || []);
      if (routeList?.length) setSelectedRouteId(routeList[0]._id);
      if (busList?.length) setSelectedBusId(busList[0]._id);
    } catch (err) {
      console.error("Failed to load setup data:", err);
    }
  }

  async function handleRunSmartEvaluation() {
    if (!selectedRouteId || !selectedBusId) return;
    setLoadingEvaluation(true);
    setAssignmentSuccess("");
    try {
      const result = await api.evaluateSmartAssignment({
        routeId: selectedRouteId,
        busId: selectedBusId,
        date: departureDate,
        startTime: departureTime
      });
      setEvaluation(result);
      if (result.primaryRecommendedDriver) setSelectedDriver(result.primaryRecommendedDriver);
      if (result.primaryRecommendedConductor) setSelectedConductor(result.primaryRecommendedConductor);
    } catch (err) {
      alert("Evaluation failed: " + err.message);
    } finally {
      setLoadingEvaluation(false);
    }
  }

  async function confirmDutyAssignment(isOverride = false) {
    if (!selectedDriver) {
      alert("Please select a driver.");
      return;
    }

    try {
      const dutyPayload = {
        dutyId: `DUTY-${Date.now().toString().slice(-4)}`,
        routeName: evaluation.route.name,
        busId: evaluation.bus?.busId || "BUS-GEN",
        crew: selectedDriver.name,
        crewRole: "DRIVER",
        depot: selectedDriver.depot || "Jaipur Central",
        start: `${departureDate}T${departureTime}:00.000Z`,
        workingHours: evaluation.route.duration || 5,
        drivingHours: (evaluation.route.duration || 5) * 0.9,
        restBefore: selectedDriver.restHours || 12,
        risk: selectedDriver.evaluation?.risk || "Low",
        eligibility: isOverride ? "Overridden" : selectedDriver.evaluation?.eligibility || "Eligible",
        overrideReason: isOverride ? overrideReason : "",
        overriddenBy: isOverride ? "Depot Officer" : "",
        status: "Scheduled"
      };

      await api.create("duties", dutyPayload);
      setAssignmentSuccess(`Successfully assigned Driver ${selectedDriver.name} to ${evaluation.route.name}!`);
      setOverrideModal(false);
      setOverrideReason("");
    } catch (err) {
      alert("Assignment error: " + err.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wide">
          <Sparkles size={14} />
          Rule-Based Operations Engine
        </div>
        <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
          Smart Duty Allocation
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Evaluates continuous driving hours, rest compliance, weekly caps, and journey segmentation before crew assignment.
        </p>
      </div>

      {assignmentSuccess && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-600" />
          {assignmentSuccess}
        </div>
      )}

      {/* Control Configuration Card */}
      <div className="surface p-6">
        <h2 className="text-sm font-bold text-navy uppercase tracking-wider mb-4">
          Step 1: Journey & Vehicle Specification
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Select Scheduled Route</label>
            <select
              className="field"
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
            >
              {routes.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name} ({r.distance} km, ~{r.duration}h)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Select Bus Fleet Unit</label>
            <select
              className="field"
              value={selectedBusId}
              onChange={(e) => setSelectedBusId(e.target.value)}
            >
              {buses.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.busId} — {b.registration} ({b.model}) [{b.status}]
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Departure Date</label>
            <input
              type="date"
              className="field"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Departure Time</label>
            <input
              type="time"
              className="field"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
            />
          </div>
        </div>

        <button
          onClick={handleRunSmartEvaluation}
          disabled={loadingEvaluation}
          className="primary-button mt-5 flex items-center gap-2 text-xs font-bold"
        >
          {loadingEvaluation ? "Analyzing Crew Fatigue Matrix..." : "Run Smart Allocation Engine"}
          <ArrowRight size={15} />
        </button>
      </div>

      {/* Evaluation Results */}
      {evaluation && (
        <div className="space-y-6">
          {/* Critical Bus Defect Alert if any */}
          {evaluation.busHealthWarning && (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs font-semibold text-rose-800 flex items-center gap-3">
              <AlertTriangle size={20} className="text-rose-600 shrink-0" />
              <div>
                <p className="font-bold">FLEET INTEGRITY ALERT</p>
                <p>{evaluation.busHealthWarning}</p>
              </div>
            </div>
          )}

          {/* Route Segmentation Card */}
          <div className="surface p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-bold text-navy">
                  Multi-Leg Journey Segmentation & Crew Change Points
                </h3>
                <p className="text-xs text-slate-500">
                  Total Journey: {evaluation.route.distance} km • {evaluation.route.duration} Hours
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {evaluation.segments.length > 1 ? `${evaluation.segments.length} Legs Required` : "Single Crew Route"}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-4">
              {evaluation.segments.map((seg) => (
                <div key={seg.segmentIndex} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-blue-700 uppercase tracking-wider">{seg.title}</span>
                    <span className="font-semibold text-slate-500">{seg.estimatedHours}h ({seg.distanceKm} km)</span>
                  </div>
                  <div className="space-y-1 text-slate-600">
                    <p className="flex items-center gap-1.5"><MapPin size={13} className="text-blue-500" /> Origin: {seg.from}</p>
                    <p className="flex items-center gap-1.5"><MapPin size={13} className="text-emerald-500" /> Destination: {seg.to}</p>
                  </div>
                  {seg.handoverPoint && (
                    <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-2 text-[11px] font-semibold text-amber-800">
                      Handover Point: {seg.handoverPoint}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Ranked Candidate Driver Roster */}
          <div className="surface p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-navy">Candidate Drivers Ranked by Safety Score</h3>
                <p className="text-xs text-slate-500">Heuristic rank based on rest duration, weekly accumulated hours, and verified status</p>
              </div>
              <span className="text-xs text-slate-400">Policy: Min 10h Rest • Max 48h/wk</span>
            </div>

            <div className="divide-y divide-slate-100">
              {evaluation.rankedDrivers.map((driver) => {
                const evalData = driver.evaluation;
                const isSelected = selectedDriver?.crewId === driver.crewId;

                return (
                  <div
                    key={driver.crewId}
                    className={`py-4 px-3 rounded-xl transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isSelected ? "bg-blue-50/70 border border-blue-200" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-navy">{driver.name}</span>
                        <span className="text-xs text-slate-400">({driver.employeeId})</span>
                        <StatusBadge value={evalData.eligibility} />
                        <span className="text-[11px] font-semibold text-slate-500">• {driver.depot}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                        <span>Rest Before: <b>{driver.restHours}h</b></span>
                        <span>Weekly Accumulated: <b>{driver.weeklyHours}h / 48h</b></span>
                        <span>Fatigue Index: <b>{evalData.fatigueScore} / 100</b></span>
                        <span>Availability: <b>{driver.availability}</b></span>
                      </div>

                      {evalData.reasons?.length > 0 && (
                        <p className="text-xs font-semibold text-rose-600 mt-1">
                          Violation: {evalData.reasons.join("; ")}
                        </p>
                      )}

                      {evalData.warnings?.length > 0 && (
                        <p className="text-xs font-semibold text-amber-600 mt-0.5">
                          Warning: {evalData.warnings.join("; ")}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {evalData.eligible ? (
                        <button
                          onClick={() => {
                            setSelectedDriver(driver);
                            confirmDutyAssignment(false);
                          }}
                          className="primary-button text-xs font-bold py-2"
                        >
                          Assign Driver
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setOverrideCandidate(driver);
                            setSelectedDriver(driver);
                            setOverrideModal(true);
                          }}
                          className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition flex items-center gap-1.5"
                        >
                          <AlertTriangle size={14} />
                          Manual Override
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Manual Override Modal */}
      {overrideModal && overrideCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="surface max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 border-b pb-3 mb-4 text-rose-700">
              <AlertTriangle size={24} />
              <div>
                <h3 className="font-bold text-base text-navy">Depot Officer Safety Override</h3>
                <p className="text-xs text-slate-500">Statutory requirement under Transport Accountability Rules</p>
              </div>
            </div>

            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 mb-4">
              <p className="font-bold mb-1">Non-Compliance Notice for {overrideCandidate.name}:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {overrideCandidate.evaluation.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>

            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Mandatory Justification for Exception Override <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              className="field text-xs mb-4"
              placeholder="e.g. Critical staff shortage due to monsoon highway diversion; relieved after 2 hours at Neemrana Hub."
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
            />

            <p className="text-[11px] text-slate-400 mb-5">
              This action, your officer identity, timestamp, and justification will be permanently inscribed into the immutable public audit log.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setOverrideModal(false)}
                className="secondary-button text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={!overrideReason.trim()}
                onClick={() => confirmDutyAssignment(true)}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2.5 transition disabled:opacity-50"
              >
                Confirm & Record Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
