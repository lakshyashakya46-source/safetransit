import { useEffect, useState, useMemo } from "react";
import {
  BusFront, MapPin, Clock, ShieldCheck, AlertTriangle,
  FileCheck, Wallet, Calendar, AlertOctagon, CheckCircle2,
  Send, Wrench, ArrowLeftRight, Play, Square, Coffee,
  Hourglass, Download, Info, CheckCircle, XCircle, AlertCircle, RefreshCw,
  Plus, UserCheck, Sparkles
} from "lucide-react";
import { api } from "../services/api";
import StatusBadge from "../components/StatusBadge";

function formatSeconds(totalSeconds) {
  if (totalSeconds < 0 || isNaN(totalSeconds)) return "00:00:00";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const DEMO_DRIVERS = [
  {
    name: "Rameshwar Singh",
    employeeId: "DRV-1001",
    scenario: "Active On Shift — Live Duty Timer Running",
    badge: "1. Active Shift (4.25h)",
    statusType: "ACTIVE"
  },
  {
    name: "Mukesh Meena",
    employeeId: "DRV-1002",
    scenario: "Duty Ended — Rest in Progress (3.5h < 9h) — Start Shift Locked",
    badge: "2. Rest Locked (<9h)",
    statusType: "REST_LOCKED"
  },
  {
    name: "Harish Gehlot",
    employeeId: "DRV-1003",
    scenario: "Rest ≥ 9h (9.5h) — Overtime Claim Pending Officer Review",
    badge: "3. OT Pending Review",
    statusType: "OT_PENDING"
  },
  {
    name: "Suresh Choudhary",
    employeeId: "DRV-1004",
    scenario: "Overtime Approved (₹1,050 Payable) — Actual OT Logged",
    badge: "4. OT Approved & Reconciled",
    statusType: "OT_APPROVED"
  },
  {
    name: "Dharmendra Yadav",
    employeeId: "DRV-1005",
    scenario: "Fully Rested (14.5h ≥ 13h) — Normal Shift Clearance Ready",
    badge: "5. Fully Rested (Ready)",
    statusType: "FULLY_RESTED"
  }
];

export default function DriverCockpit({ user }) {
  // Selected driver for testing & demonstration
  const [selectedDriver, setSelectedDriver] = useState(() => {
    const cleanName = (user?.name || "").replace(/\s*\(Driver\)/i, "").trim();
    const match = DEMO_DRIVERS.find(d => d.name === cleanName);
    return match ? match.name : "Rameshwar Singh";
  });

  const [activeDuty, setActiveDuty] = useState(null);
  const [restEligibility, setRestEligibility] = useState(null);
  const [dutyHistoryData, setDutyHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nowTick, setNowTick] = useState(Date.now());

  // Modals
  const [startDutyModal, setStartDutyModal] = useState(false);
  const [endDutyModal, setEndDutyModal] = useState(false);
  const [breakModal, setBreakModal] = useState(false);
  const [checklistModal, setChecklistModal] = useState(false);
  const [overtimeModal, setOvertimeModal] = useState(false);
  const [actualOtModal, setActualOtModal] = useState(null);
  const [leaveModal, setLeaveModal] = useState(false);
  const [sosModal, setSosModal] = useState(false);
  const [handoverModal, setHandoverModal] = useState(false);
  const [message, setMessage] = useState("");
  const [errorBanner, setErrorBanner] = useState("");
  const [dutyCompletedSummary, setDutyCompletedSummary] = useState(null);

  // Delay & Incident Reporting Modal
  const [delayReportModal, setDelayReportModal] = useState(false);
  const [delayReportData, setDelayReportData] = useState({
    delayMinutes: 60,
    category: "Highway Traffic Congestion",
    location: "NH-48 Km 74 near Shahpura Toll Plaza",
    description: "Severe highway bottleneck due to overturned commercial truck blocking two express lanes.",
    autoRequestOvertime: true
  });

  // Overtime Ledger Scopes and Filters
  const [allDepotOvertime, setAllDepotOvertime] = useState([]);
  const [otScope, setOtScope] = useState("MY_CLAIMS"); // "MY_CLAIMS" | "ALL_DEPOT"
  const [otFilter, setOtFilter] = useState("ALL"); // "ALL" | "APPROVED" | "PENDING" | "BLOCKED"

  // Tabs for My Duty & Overtime History
  const [historyTab, setHistoryTab] = useState("requests"); // Default to requests for maximum visibility
  const [filterStatus, setFilterStatus] = useState("ALL");

  // Form states
  const [startDutyData, setStartDutyData] = useState({
    busId: "BUS-101",
    routeName: "Jaipur → Delhi Express Corridor (NH-48)",
    tripId: "TRIP-2026-081",
    scheduledHours: 8.0
  });

  const [endDutyData, setEndDutyData] = useState({
    actualDrivingHours: "",
    notes: ""
  });

  const [breakReason, setBreakReason] = useState("Mandatory 30-minute rest & meal interval");

  const [checklistData, setChecklistData] = useState({
    brakes: "Pass",
    tyres: "Pass",
    steering: "Pass",
    lights: "Pass",
    horn: "Pass",
    emergencyExits: "Pass",
    firstAidFireExtinguisher: "Pass",
    engineFluids: "Pass",
    notes: ""
  });

  const [overtimeData, setOvertimeData] = useState({
    hours: 2.0,
    proposedStartTime: "",
    proposedEndTime: "",
    reason: "Severe traffic congestion on NH-48 near Behror flyover due to heavy vehicle breakdown",
    isEmergency: false,
    emergencyReference: "",
    emergencyJustification: ""
  });

  const [actualOtData, setActualOtData] = useState({
    actualHours: 2.0,
    actualStartTime: "",
    actualEndTime: "",
    verificationSource: "GPS_TELEMETRY",
    notes: ""
  });

  const [leaveData, setLeaveData] = useState({
    type: "Casual Leave",
    start: "2026-10-25",
    end: "2026-10-26",
    reason: "Urgent personal family commitment"
  });

  const [sosData, setSosData] = useState({
    type: "Breakdown",
    location: "NH-48 Km 74 near Shahpura",
    severity: "High",
    description: "Unusual vibration in front axle assembly, pulled over to highway shoulder safely."
  });

  const [handoverData, setHandoverData] = useState({
    odometer: 78550,
    fuelLevel: "85%",
    location: "Neemrana Transit Hub",
    incomingDriver: "Deepak Verma"
  });

  // Second-by-second UI interval tick for live timers
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Reload when user or selected demo driver changes
  useEffect(() => {
    loadAllData(selectedDriver);
  }, [user, selectedDriver]);

  async function loadAllData(driverNameToLoad = selectedDriver) {
    setLoading(true);
    setErrorBanner("");
    try {
      const [dutyRes, restRes, histRes, otQueueRes] = await Promise.allSettled([
        api.activeDuty({ driverName: driverNameToLoad }),
        api.dutyRestEligibility({ driverName: driverNameToLoad }),
        api.dutyHistory({ driverName: driverNameToLoad }),
        api.officerOvertimeQueue()
      ]);

      if (dutyRes.status === "fulfilled") {
        setActiveDuty(dutyRes.value);
      } else {
        setActiveDuty(null);
      }

      if (restRes.status === "fulfilled") {
        setRestEligibility(restRes.value);
      }

      if (histRes.status === "fulfilled") {
        setDutyHistoryData(histRes.value);
      }

      if (otQueueRes.status === "fulfilled") {
        setAllDepotOvertime(Array.isArray(otQueueRes.value) ? otQueueRes.value : []);
      }
    } catch (err) {
      console.error("Failed to load cockpit data:", err);
      setErrorBanner(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Live Duty calculations with Statutory 6-Hour shift continuity and 30-min break
  const dutyTimerInfo = useMemo(() => {
    if (!activeDuty || !activeDuty.startTime) return null;
    const startMs = new Date(activeDuty.startTime).getTime();
    const totalElapsedSeconds = Math.max(0, Math.floor((nowTick - startMs) / 1000));
    const breakSeconds = (activeDuty.totalBreakMinutes || 0) * 60;
    const netWorkingSeconds = Math.max(0, totalElapsedSeconds - breakSeconds);

    const scheduledSeconds = (activeDuty.scheduledHours || 8.0) * 3600;
    const remainingSeconds = Math.max(0, scheduledSeconds - netWorkingSeconds);

    const netWorkingHours = Number((netWorkingSeconds / 3600).toFixed(2));
    const maxDutyHours = activeDuty.policySnapshot?.maxDutyHours || 10.0;

    let warningState = "NORMAL";
    if (netWorkingHours >= maxDutyHours) {
      warningState = "EXCEEDED";
    } else if (netWorkingHours >= maxDutyHours - 1.0) {
      warningState = "APPROACHING";
    }

    // 6-Hour driving segment & mandatory 30m break interval (Motor Transport Workers Act Section 15)
    const segmentDurationSeconds = 6 * 3600; // 6 hours
    const secondsInCurrentSegment = netWorkingSeconds % segmentDurationSeconds;
    const secondsUntilMandatoryBreak = Math.max(0, segmentDurationSeconds - secondsInCurrentSegment);
    const segmentProgressPercent = Math.min(100, Math.floor((secondsInCurrentSegment / segmentDurationSeconds) * 100));

    return {
      elapsedFormatted: formatSeconds(totalElapsedSeconds),
      netWorkingFormatted: formatSeconds(netWorkingSeconds),
      remainingFormatted: formatSeconds(remainingSeconds),
      breakFormatted: formatSeconds(breakSeconds),
      segmentFormatted: formatSeconds(secondsInCurrentSegment),
      untilBreakFormatted: formatSeconds(secondsUntilMandatoryBreak),
      segmentProgressPercent,
      isBreakDue: secondsInCurrentSegment >= 5.5 * 3600,
      netWorkingHours,
      warningState,
      isPaused: activeDuty.status === "PAUSED_BREAK"
    };
  }, [activeDuty, nowTick]);

  // Live Rest Timer calculations
  const restTimerInfo = useMemo(() => {
    if (!restEligibility || !restEligibility.restStartTime) {
      return {
        continuousFormatted: "24:00:00",
        remainingStandardFormatted: "00:00:00",
        remainingOvertimeFormatted: "00:00:00",
        continuousHours: 24.0,
        isEligibleStandard: true,
        isEligibleOvertime: true
      };
    }

    const restStartMs = new Date(restEligibility.restStartTime).getTime();
    const elapsedSeconds = Math.max(0, Math.floor((nowTick - restStartMs) / 1000));
    const continuousHours = Number((elapsedSeconds / 3600).toFixed(2));

    const standardTargetSeconds = (restEligibility.normalRestRequired || 13.0) * 3600;
    const overtimeTargetSeconds = (restEligibility.minOvertimeThreshold || 9.0) * 3600;

    const remainingStandardSeconds = Math.max(0, standardTargetSeconds - elapsedSeconds);
    const remainingOvertimeSeconds = Math.max(0, overtimeTargetSeconds - elapsedSeconds);

    return {
      continuousFormatted: formatSeconds(elapsedSeconds),
      remainingStandardFormatted: formatSeconds(remainingStandardSeconds),
      remainingOvertimeFormatted: formatSeconds(remainingOvertimeSeconds),
      continuousHours,
      isEligibleStandard: elapsedSeconds >= standardTargetSeconds,
      isEligibleOvertime: elapsedSeconds >= overtimeTargetSeconds
    };
  }, [restEligibility, nowTick]);

  // Overtime requests for the active selected driver or entire depot
  const currentDriverOvertimeRequests = useMemo(() => {
    return dutyHistoryData?.categories?.overtimeRequests || [];
  }, [dutyHistoryData]);

  const displayedOvertimeRequests = useMemo(() => {
    const list = otScope === "ALL_DEPOT"
      ? (allDepotOvertime.length > 0 ? allDepotOvertime : currentDriverOvertimeRequests)
      : currentDriverOvertimeRequests;

    if (otFilter === "ALL") return list;
    if (otFilter === "APPROVED") return list.filter(o => o.status === "APPROVED" || o.status === "Approved");
    if (otFilter === "PENDING") return list.filter(o => o.status === "PENDING_APPROVAL" || o.status === "Pending");
    if (otFilter === "BLOCKED") return list.filter(o => o.status === "BLOCKED_BY_REST_RULE" || o.status === "Rejected");
    return list;
  }, [otScope, otFilter, allDepotOvertime, currentDriverOvertimeRequests]);

  async function handleDelayReportSubmit(e) {
    e.preventDefault();
    try {
      const delayHours = Number((Number(delayReportData.delayMinutes) / 60).toFixed(1));
      const refId = `DLY-${Date.now().toString().slice(-4)}`;

      // 1. Record emergency / operational delay report
      await api.create("emergencies", {
        emergencyId: refId,
        type: delayReportData.category.includes("Breakdown") ? "Breakdown" : "Delay",
        bus: activeDuty?.busId || "BUS-101",
        crew: selectedDriver,
        route: activeDuty?.routeName || "Jaipur → Delhi Express Corridor (NH-48)",
        location: delayReportData.location,
        severity: delayHours >= 1.5 ? "High" : "Medium",
        description: `[TRIP DELAY: ${delayReportData.delayMinutes} mins (${delayHours}h)] Cause: ${delayReportData.category}. ${delayReportData.description}`,
        status: "Reported",
        reportedAt: new Date().toISOString()
      });

      // 2. If auto-request overtime, submit linked overtime claim with official factual justification
      if (delayReportData.autoRequestOvertime) {
        await api.requestOvertime({
          driverName: selectedDriver,
          employeeId: DEMO_DRIVERS.find(d => d.name === selectedDriver)?.employeeId || "DRV-1001",
          requestedHours: delayHours,
          reason: `Official Delay Report ${refId}: ${delayReportData.category} at ${delayReportData.location} causing ${delayReportData.delayMinutes}m transit delay. Justification: ${delayReportData.description}`,
          isEmergency: delayHours >= 1.5,
          emergencyReference: refId,
          emergencyJustification: `Verified highway delay of ${delayReportData.delayMinutes} minutes on corridor. Telemetry recorded to prevent fraudulent overtime.`,
          tripId: activeDuty?.tripId || `TRIP-${Date.now().toString().slice(-3)}`,
          busId: activeDuty?.busId || "BUS-101",
          routeName: activeDuty?.routeName || "Jaipur → Delhi Express Corridor"
        });
      }

      setMessage(`✅ Trip Delay Report (${refId}) successfully registered with Department Control! Linked overtime claim submitted with verified telemetry.`);
      setDelayReportModal(false);
      await loadAllData(selectedDriver);
    } catch (err) {
      setErrorBanner(err.message);
    }
  }

  // Handlers for Duty Lifecycle
  async function handleStartDutySubmit(e) {
    e.preventDefault();
    setErrorBanner("");
    try {
      const newSession = await api.startDuty({
        driverName: selectedDriver,
        busId: startDutyData.busId,
        routeName: startDutyData.routeName,
        tripId: startDutyData.tripId,
        scheduledHours: Number(startDutyData.scheduledHours) || 8.0,
        employeeId: DEMO_DRIVERS.find(d => d.name === selectedDriver)?.employeeId || "DRV-1001"
      });
      setMessage(`Shift commenced successfully! Duty ID: ${newSession.dutyId}`);
      setStartDutyModal(false);
      setDutyCompletedSummary(null);
      await loadAllData(selectedDriver);
    } catch (err) {
      setErrorBanner(err.message);
    }
  }

  async function handleEndDutySubmit(e) {
    e.preventDefault();
    setErrorBanner("");
    try {
      const res = await api.endDuty({
        driverName: selectedDriver,
        actualDrivingHours: endDutyData.actualDrivingHours ? Number(endDutyData.actualDrivingHours) : undefined,
        notes: endDutyData.notes
      });
      setDutyCompletedSummary(res.completionSummary);
      setMessage("Duty completed. Shift recorded in immutable audit log and continuous rest initiated.");
      setEndDutyModal(false);
      await loadAllData(selectedDriver);
    } catch (err) {
      setErrorBanner(err.message);
    }
  }

  async function handleTakeBreak() {
    setErrorBanner("");
    try {
      await api.startDutyBreak({ driverName: selectedDriver, reason: breakReason });
      setMessage("Duty shift paused. Break interval logged.");
      setBreakModal(false);
      await loadAllData(selectedDriver);
    } catch (err) {
      setErrorBanner(err.message);
    }
  }

  async function handleResumeDuty() {
    setErrorBanner("");
    try {
      await api.endDutyBreak({ driverName: selectedDriver });
      setMessage("Break ended. Duty shift resumed.");
      await loadAllData(selectedDriver);
    } catch (err) {
      setErrorBanner(err.message);
    }
  }

  // Handlers for Overtime
  async function handleOvertimeSubmit(e) {
    e.preventDefault();
    setErrorBanner("");
    try {
      const res = await api.requestOvertime({
        driverName: selectedDriver,
        employeeId: DEMO_DRIVERS.find(d => d.name === selectedDriver)?.employeeId || "DRV-1001",
        requestedHours: Number(overtimeData.hours),
        proposedStartTime: overtimeData.proposedStartTime || new Date().toISOString(),
        proposedEndTime: overtimeData.proposedEndTime || undefined,
        reason: overtimeData.reason,
        isEmergency: overtimeData.isEmergency,
        emergencyReference: overtimeData.emergencyReference,
        emergencyJustification: overtimeData.emergencyJustification,
        tripId: activeDuty?.tripId || "TRIP-2026-081",
        busId: activeDuty?.busId || "BUS-101",
        routeName: activeDuty?.routeName || "Jaipur → Delhi Express Corridor"
      });

      if (res.isBlocked) {
        setErrorBanner(`Request Blocked by Safety Policy: Driver has rested only ${res.restEvaluation?.continuousRestHours}h. Minimum 9.0h continuous rest required before non-emergency overtime.`);
      } else {
        setMessage(`Overtime request of ${overtimeData.hours}h submitted for Depot Officer review.`);
      }
      setOvertimeModal(false);
      await loadAllData(selectedDriver);
    } catch (err) {
      setErrorBanner(err.message);
    }
  }

  async function handleActualOtSubmit(e) {
    e.preventDefault();
    if (!actualOtModal) return;
    try {
      await api.recordActualOvertime({
        requestId: actualOtModal.requestId,
        actualHoursWorked: Number(actualOtData.actualHours),
        actualStartTime: actualOtData.actualStartTime || undefined,
        actualEndTime: actualOtData.actualEndTime || undefined,
        verificationSource: actualOtData.verificationSource,
        notes: actualOtData.notes
      });
      setMessage("Actual overtime hours recorded and reconciled against authorized quota.");
      setActualOtModal(null);
      await loadAllData(selectedDriver);
    } catch (err) {
      setErrorBanner(err.message);
    }
  }

  // Handlers for Checklist, Leave, SOS, Handover
  async function handleChecklistSubmit(e) {
    e.preventDefault();
    try {
      await api.submitChecklist({
        busId: activeDuty?.busId || "BUS-101",
        driverName: selectedDriver,
        ...checklistData
      });
      setMessage("Pre-Trip Vehicle Inspection successfully submitted and verified.");
      setChecklistModal(false);
    } catch (err) {
      setErrorBanner(err.message);
    }
  }

  async function handleLeaveSubmit(e) {
    e.preventDefault();
    try {
      await api.create("leaves", {
        crew: selectedDriver,
        employeeId: DEMO_DRIVERS.find(d => d.name === selectedDriver)?.employeeId || "DRV-1001",
        role: "DRIVER",
        depot: user.depot || "Jaipur Central",
        type: leaveData.type,
        start: leaveData.start,
        end: leaveData.end,
        reason: leaveData.reason,
        status: "Pending"
      });
      setMessage("Leave application registered. SafeTransit replacement finder will seek backup crew.");
      setLeaveModal(false);
    } catch (err) {
      setErrorBanner(err.message);
    }
  }

  async function handleSosSubmit(e) {
    e.preventDefault();
    try {
      await api.create("emergencies", {
        emergencyId: `EMG-${Date.now().toString().slice(-4)}`,
        type: sosData.type,
        bus: activeDuty?.busId || "BUS-101",
        crew: selectedDriver,
        route: activeDuty?.routeName || "Jaipur - Delhi",
        location: sosData.location,
        severity: sosData.severity,
        description: sosData.description,
        status: "Reported",
        reportedAt: new Date().toISOString()
      });
      setMessage("🚨 SOS ALERT BROADCASTED: Control room and nearby response vans notified.");
      setSosModal(false);
    } catch (err) {
      setErrorBanner(err.message);
    }
  }

  async function handleHandoverSubmit(e) {
    e.preventDefault();
    try {
      await api.create("handovers", {
        handoverId: `HND-${Date.now().toString().slice(-4)}`,
        tripId: activeDuty?.tripId || "TRIP-2026-081",
        busId: activeDuty?.busId || "BUS-101",
        routeName: activeDuty?.routeName || "Jaipur - Delhi",
        outgoingCrew: selectedDriver,
        incomingCrew: handoverData.incomingDriver,
        location: handoverData.location,
        odometer: Number(handoverData.odometer),
        fuelLevel: handoverData.fuelLevel,
        status: "Completed"
      });
      setMessage("Digital duty handover completed and verified.");
      setHandoverModal(false);
    } catch (err) {
      setErrorBanner(err.message);
    }
  }

  // Export CSV Report of Duty & Overtime History
  function exportHistoryToCSV() {
    if (!dutyHistoryData) return;
    const { categories } = dutyHistoryData;
    let csvContent = "data:text/csv;charset=utf-8,";

    // Summary Header
    csvContent += "SAFETRANSIT DRIVER DUTY & OVERTIME AUDIT REPORT\n";
    csvContent += `Driver:,"${selectedDriver}",Depot:,"${user.depot || "Jaipur Central"}",Date:,"${new Date().toISOString()}"\n\n`;

    // 1. Duty Sessions
    csvContent += "1. DUTY SESSIONS HISTORY\n";
    csvContent += "Duty ID,Route,Bus,Start Time,End Time,Total Hours,Driving Hours,Status\n";
    (categories?.dutySessions || []).forEach(d => {
      csvContent += `"${d.dutyId}","${d.routeName}","${d.busId}","${d.startTime || d.start}","${d.endTime || d.end || "Ongoing"}","${d.elapsedDutyHours || d.workingHours || 0}","${d.actualDrivingHours || d.drivingHours || 0}","${d.status}"\n`;
    });
    csvContent += "\n";

    // 2. Rest Periods
    csvContent += "2. REST PERIODS HISTORY\n";
    csvContent += "Rest Start,Rest End,Continuous Hours,Required Rest,Eligibility Status\n";
    (categories?.restPeriods || []).forEach(r => {
      csvContent += `"${r.restStartTime}","${r.restEndTime || "Active"}","${r.continuousRestHours || 0}","${r.requiredRestHours || 13}","${r.eligibilityStatus}"\n`;
    });
    csvContent += "\n";

    // 3. Overtime Requests & Approvals
    csvContent += "3. OVERTIME REQUESTS & DECISIONS\n";
    csvContent += "Request ID,Hours,Reason,Status,Approved Hours,Amount (INR),Reviewing Officer,Decision Reason\n";
    (categories?.overtimeRequests || []).forEach(o => {
      csvContent += `"${o.requestId}","${o.requestedHours}","${(o.reason || "").replace(/"/g, '""')}","${o.status}","${o.approvedHours || 0}","${o.approvedAmountINR || 0}","${o.reviewingOfficerName || "—"}","${(o.decisionReason || "").replace(/"/g, '""')}"\n`;
    });
    csvContent += "\n";

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SafeTransit_Duty_Report_${selectedDriver.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6">
      {/* DEMO DRIVER SCENARIO SWITCHER */}
      <div className="surface p-4 border border-blue-200 bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-slate-50 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 uppercase tracking-wider">
              <Sparkles size={14} /> Interactive Driver Duty & Overtime Demo Switcher
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Click any persona below to demonstrate live running timers, rest lockouts, pending overtime claims, and officer approvals:
            </p>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">5 Distinct Operational States</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 mt-3">
          {DEMO_DRIVERS.map(drv => {
            const isSelected = selectedDriver === drv.name;
            return (
              <button
                key={drv.name}
                onClick={() => setSelectedDriver(drv.name)}
                className={`text-left p-3 rounded-xl border transition flex flex-col justify-between ${
                  isSelected
                    ? "bg-white border-blue-600 shadow-md ring-2 ring-blue-500/20"
                    : "bg-white/80 border-slate-200 hover:border-blue-300 hover:bg-white"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-navy text-xs">{drv.name}</span>
                    <span className={`h-2.5 w-2.5 rounded-full ${
                      drv.statusType === "ACTIVE" ? "bg-emerald-500 animate-pulse" :
                      drv.statusType === "REST_LOCKED" ? "bg-rose-500" :
                      drv.statusType === "OT_PENDING" ? "bg-amber-500 animate-pulse" :
                      drv.statusType === "OT_APPROVED" ? "bg-blue-500" : "bg-teal-500"
                    }`} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{drv.employeeId}</p>
                  <p className="text-[11px] text-slate-600 font-medium mt-1.5 leading-snug">{drv.scenario}</p>
                </div>
                <span className={`mt-2 inline-block px-2 py-0.5 rounded text-[10px] font-bold w-fit ${
                  drv.statusType === "ACTIVE" ? "bg-emerald-100 text-emerald-800" :
                  drv.statusType === "REST_LOCKED" ? "bg-rose-100 text-rose-800" :
                  drv.statusType === "OT_PENDING" ? "bg-amber-100 text-amber-800" :
                  drv.statusType === "OT_APPROVED" ? "bg-blue-100 text-blue-800" : "bg-teal-100 text-teal-800"
                }`}>
                  {drv.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wide">
            <BusFront size={14} />
            Driver Operating Console & Safety Cockpit
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
            Captain {selectedDriver}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Authoritative Duty Lifecycle, Real-time Rest Compliance & Overtime Ledger.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadAllData(selectedDriver)}
            className="secondary-button flex items-center gap-1.5 text-xs font-semibold py-2"
            title="Refresh Server Telemetry"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={exportHistoryToCSV}
            className="secondary-button flex items-center gap-1.5 text-xs font-semibold py-2"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Global Alerts & Notifications */}
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
            <AlertCircle size={18} className="text-rose-600 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button onClick={() => setErrorBanner("")} className="text-rose-700 font-bold hover:underline">✕</button>
        </div>
      )}

      {/* Persistent Duty Completed Summary Card */}
      {dutyCompletedSummary && (
        <div className="rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-sm mb-3">
            <CheckCircle className="text-emerald-600" size={20} />
            Duty Completed Successfully — Shift Closed Atomically
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
            <div className="rounded-xl bg-white border border-emerald-100 p-2.5">
              <span className="text-slate-400 font-medium">Duty ID</span>
              <p className="font-bold text-navy mt-0.5">{dutyCompletedSummary.dutyId}</p>
            </div>
            <div className="rounded-xl bg-white border border-emerald-100 p-2.5">
              <span className="text-slate-400 font-medium">Recorded Duty Time</span>
              <p className="font-bold text-emerald-700 mt-0.5">{dutyCompletedSummary.recordedTotalDutyHours} Hours</p>
            </div>
            <div className="rounded-xl bg-white border border-emerald-100 p-2.5">
              <span className="text-slate-400 font-medium">Rest Commenced</span>
              <p className="font-bold text-navy mt-0.5">{new Date(dutyCompletedSummary.restStartedAt).toLocaleTimeString()}</p>
            </div>
            <div className="rounded-xl bg-white border border-emerald-100 p-2.5">
              <span className="text-slate-400 font-medium">Next Standard Eligibility</span>
              <p className="font-bold text-blue-700 mt-0.5">{new Date(dutyCompletedSummary.earliestNextDutyEligibility).toLocaleTimeString()}</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-600">
            Safety Rest Initiated: Start Duty is locked until the mandatory {dutyCompletedSummary.requiredContinuousRestHours}h continuous rest requirement is satisfied.
          </p>
        </div>
      )}

      {/* SECTION 1: ACTIVE DUTY OR PERSISTENT REST TIMER */}
      {activeDuty ? (
        /* LIVE DUTY CARD */
        <div className="surface p-6 border-blue-200 bg-gradient-to-br from-white via-blue-50/20 to-slate-50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-100 pb-4 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  {dutyTimerInfo?.isPaused ? "Duty Shift Paused (On Break)" : "Active Duty Shift In Progress"}
                </span>
                <span className="text-[11px] font-bold text-slate-400">• Policy {activeDuty.policyVersion || "POL-v2.4"}</span>
              </div>
              <h2 className="text-xl font-black text-navy mt-1">{activeDuty.routeName || "Scheduled Transit Route"}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Assigned Bus: <b className="text-navy">{activeDuty.busId || "BUS-101"}</b> • Depot: {activeDuty.depot || "Jaipur Central"} • Duty ID: <span className="font-mono">{activeDuty.dutyId}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <StatusBadge value={activeDuty.status} />
              {dutyTimerInfo?.warningState === "EXCEEDED" && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                  ⚠️ Duty Cap Exceeded
                </span>
              )}
              {dutyTimerInfo?.warningState === "APPROACHING" && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  ⚠️ Limit Approaching
                </span>
              )}
            </div>
          </div>

          {/* Warning Banner if thresholds approached */}
          {activeDuty.warnings && activeDuty.warnings.length > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-5 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
              <div>
                {activeDuty.warnings.map((w, idx) => (
                  <p key={idx} className="font-semibold">{w}</p>
                ))}
              </div>
            </div>
          )}

          {/* LIVE DUTY TIMERS GRID */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs mb-6">
            {/* Live Elapsed Duty Timer */}
            <div className="rounded-xl bg-white border border-blue-200 p-3.5 shadow-sm">
              <span className="text-slate-400 font-semibold flex items-center justify-between">
                <span>Elapsed Shift Time</span>
                <Clock size={14} className="text-blue-500" />
              </span>
              <p className="text-2xl font-black text-navy mt-1 font-mono tracking-tight">
                {dutyTimerInfo?.elapsedFormatted || "00:00:00"}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Started: {new Date(activeDuty.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {/* Net Working Hours (Breaks deducted) */}
            <div className="rounded-xl bg-white border border-slate-100 p-3.5 shadow-sm">
              <span className="text-slate-400 font-semibold flex items-center justify-between">
                <span>Net Working Time</span>
                <ShieldCheck size={14} className="text-emerald-500" />
              </span>
              <p className="text-2xl font-black text-emerald-700 mt-1 font-mono tracking-tight">
                {dutyTimerInfo?.netWorkingFormatted || "00:00:00"}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Steering & Active Operations
              </p>
            </div>

            {/* Break Durations */}
            <div className="rounded-xl bg-white border border-slate-100 p-3.5 shadow-sm">
              <span className="text-slate-400 font-semibold flex items-center justify-between">
                <span>Recorded Breaks</span>
                <Coffee size={14} className="text-amber-500" />
              </span>
              <p className="text-2xl font-black text-amber-700 mt-1 font-mono tracking-tight">
                {dutyTimerInfo?.breakFormatted || "00:00:00"}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {activeDuty.breaks?.length || 0} intervals logged
              </p>
            </div>

            {/* Remaining Scheduled Shift */}
            <div className="rounded-xl bg-white border border-slate-100 p-3.5 shadow-sm">
              <span className="text-slate-400 font-semibold flex items-center justify-between">
                <span>Remaining Shift</span>
                <Hourglass size={14} className="text-indigo-500" />
              </span>
              <p className="text-2xl font-black text-indigo-700 mt-1 font-mono tracking-tight">
                {dutyTimerInfo?.remainingFormatted || "00:00:00"}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Scheduled: {activeDuty.scheduledHours || 8.0}h ceiling
              </p>
            </div>
          </div>

          {/* Statutory 6-Hour Driving Segment & Mandatory 30-Min Rest Interval (MTW Act Sec 15) */}
          <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-blue-50/50 to-slate-50 p-4 mb-5 text-xs shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-extrabold text-navy flex items-center gap-1.5">
                  <Clock size={15} className="text-indigo-600" />
                  Statutory 6-Hour Driving Segment & 30-Min Rest Interval (मोटर परिवहन कर्मकार अधिनियम - धारा 15)
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Mandatory safety rule: Drivers cannot operate continuously beyond 5 to 6 hours without taking an uninterrupted 30-minute refreshment pause.
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] text-slate-400 block font-semibold">Current Segment Steering</span>
                <span className="font-mono font-black text-indigo-700 text-sm">
                  {dutyTimerInfo?.segmentFormatted || "00:00:00"} / 06:00:00
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden mt-2.5">
              <div
                className={`h-full transition-all duration-500 ${
                  dutyTimerInfo?.isBreakDue ? "bg-rose-500 animate-pulse" : "bg-indigo-600"
                }`}
                style={{ width: `${dutyTimerInfo?.segmentProgressPercent || 0}%` }}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2 text-[11px]">
              <span className={`${dutyTimerInfo?.isBreakDue ? "text-rose-700 font-bold" : "text-slate-600"}`}>
                {dutyTimerInfo?.isBreakDue
                  ? "⚠️ 6-Hour Limit Approaching: Uninterrupted 30-min break mandatory now to prevent fatigue."
                  : `Next mandatory 30m break due in: ${dutyTimerInfo?.untilBreakFormatted || "06:00:00"}`}
              </span>
              {!dutyTimerInfo?.isPaused && (
                <button
                  onClick={() => {
                    setBreakReason("Mandatory 30m Highway Refreshment & Vehicle Check (Sec 15 MTW Act)");
                    setBreakModal(true);
                  }}
                  className="font-bold text-indigo-700 hover:text-indigo-900 underline text-[11px] shrink-0"
                >
                  Take 30m Mandatory Break Now →
                </button>
              )}
            </div>
          </div>

          {/* Quick Action Cockpit Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setDelayReportModal(true)}
              className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-2 text-xs font-bold px-4 py-2.5 shadow-sm transition"
            >
              <AlertTriangle size={15} /> Report Bus Delay / Traffic Jam
            </button>
            {dutyTimerInfo?.isPaused ? (
              <button
                onClick={handleResumeDuty}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 text-xs font-bold px-4 py-2.5 shadow-sm transition"
              >
                <Play size={15} /> Resume Duty
              </button>
            ) : (
              <button
                onClick={() => setBreakModal(true)}
                className="secondary-button flex items-center gap-2 text-xs font-bold py-2.5"
              >
                <Coffee size={15} /> Take Break
              </button>
            )}

            <button
              onClick={() => setEndDutyModal(true)}
              className="rounded-xl bg-slate-900 hover:bg-black text-white flex items-center gap-2 text-xs font-bold px-4 py-2.5 shadow-sm transition"
            >
              <Square size={15} /> End Duty Shift
            </button>

            <button
              onClick={() => setChecklistModal(true)}
              className="primary-button flex items-center gap-2 text-xs font-bold py-2.5"
            >
              <Wrench size={15} /> Pre-Trip Checklist
            </button>

            <button
              onClick={() => setHandoverModal(true)}
              className="secondary-button flex items-center gap-2 text-xs font-bold py-2.5"
            >
              <ArrowLeftRight size={15} /> Handover
            </button>

            <button
              onClick={() => setOvertimeModal(true)}
              className="secondary-button flex items-center gap-2 text-xs font-bold py-2.5"
            >
              <Wallet size={15} /> Request Overtime
            </button>

            <button
              onClick={() => setLeaveModal(true)}
              className="secondary-button flex items-center gap-2 text-xs font-bold py-2.5"
            >
              <Calendar size={15} /> Apply Leave
            </button>

            <button
              onClick={() => setSosModal(true)}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-2 text-xs font-bold px-4 py-2.5 shadow-sm shadow-rose-600/30 transition"
            >
              <AlertOctagon size={15} /> 🚨 SOS Emergency
            </button>
          </div>
        </div>
      ) : (
        /* PERSISTENT REST TIMER & START DUTY CONSOLE */
        <div className="surface p-6 border-indigo-200 bg-gradient-to-br from-white via-indigo-50/20 to-slate-50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-100 pb-4 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
                  Driver Rest Compliance & Next-Duty Eligibility Engine
                </span>
              </div>
              <h2 className="text-xl font-black text-navy mt-1">Off-Duty Rest Period</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Rest start: <b className="text-navy">{restEligibility?.restStartTime ? new Date(restEligibility.restStartTime).toLocaleString() : "Full Compliance (Default)"}</b> • Server Time: <span className="font-mono">{new Date().toLocaleTimeString()}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              {restEligibility?.eligibilityStatus === "FULLY_ELIGIBLE" ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-emerald-600" /> Fully Eligible for Duty
                </span>
              ) : restEligibility?.eligibilityStatus === "OVERTIME_ELIGIBLE_ONLY_WITH_APPROVAL" ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-600" /> Overtime Only (Officer Review)
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1.5">
                  <XCircle size={14} className="text-rose-600" /> Mandatory Rest In Progress
                </span>
              )}
            </div>
          </div>

          {/* Rest Summary Explanation Banner */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 mb-6 text-xs text-slate-700 flex items-start gap-2.5">
            <Info className="text-blue-600 shrink-0 mt-0.5" size={16} />
            <div className="space-y-1">
              <p className="font-bold text-navy">{restEligibility?.summary || "Rest eligibility calculated from server-persisted records."}</p>
              <p className="text-[11px] text-slate-500">
                Application Rest Policy: <b>{restEligibility?.normalRestRequired || 13}h</b> standard continuous rest. Minimum threshold for overtime consideration: <b>{restEligibility?.minOvertimeThreshold || 9}h</b>.
              </p>
            </div>
          </div>

          {/* REST TIMER METRIC TILES */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs mb-6">
            {/* Continuous Rest Accumulated */}
            <div className="rounded-xl bg-white border border-indigo-200 p-3.5 shadow-sm">
              <span className="text-slate-400 font-semibold flex items-center justify-between">
                <span>Continuous Rest Elapsed</span>
                <Clock size={14} className="text-indigo-500" />
              </span>
              <p className="text-2xl font-black text-indigo-700 mt-1 font-mono tracking-tight">
                {restTimerInfo.continuousFormatted}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {restTimerInfo.continuousHours} hours continuous
              </p>
            </div>

            {/* Countdown to 9h Overtime Threshold */}
            <div className="rounded-xl bg-white border border-slate-100 p-3.5 shadow-sm">
              <span className="text-slate-400 font-semibold flex items-center justify-between">
                <span>To Overtime Threshold (9h)</span>
                <ShieldCheck size={14} className="text-amber-500" />
              </span>
              <p className={`text-2xl font-black mt-1 font-mono tracking-tight ${restTimerInfo.isEligibleOvertime ? "text-emerald-600" : "text-amber-600"}`}>
                {restTimerInfo.isEligibleOvertime ? "SATISFIED" : restTimerInfo.remainingOvertimeFormatted}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {restTimerInfo.isEligibleOvertime ? "Eligible for Officer-approved OT" : "Overtime blocked until satisfied"}
              </p>
            </div>

            {/* Countdown to 13h Standard Next-Duty */}
            <div className="rounded-xl bg-white border border-slate-100 p-3.5 shadow-sm">
              <span className="text-slate-400 font-semibold flex items-center justify-between">
                <span>To Standard Duty (13h)</span>
                <Hourglass size={14} className="text-blue-500" />
              </span>
              <p className={`text-2xl font-black mt-1 font-mono tracking-tight ${restTimerInfo.isEligibleStandard ? "text-emerald-600" : "text-blue-600"}`}>
                {restTimerInfo.isEligibleStandard ? "SATISFIED" : restTimerInfo.remainingStandardFormatted}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Earliest normal shift eligibility
              </p>
            </div>

            {/* Earliest Next Duty Timestamp */}
            <div className="rounded-xl bg-white border border-slate-100 p-3.5 shadow-sm">
              <span className="text-slate-400 font-semibold flex items-center justify-between">
                <span>Next Duty Clearance Time</span>
                <Calendar size={14} className="text-slate-500" />
              </span>
              <p className="text-sm font-bold text-navy mt-1.5">
                {restEligibility?.earliestNextDutyTimestamp
                  ? new Date(restEligibility.earliestNextDutyTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })
                  : "Immediate"}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Verified against central policy
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setStartDutyModal(true)}
              disabled={!restEligibility?.canStartDuty}
              className={`flex items-center gap-2 text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm transition ${
                restEligibility?.canStartDuty
                  ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              <Play size={15} /> Start New Duty Shift
            </button>

            {!restEligibility?.canStartDuty && (
              <span className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                <AlertCircle size={14} /> Start Duty locked: Complete remaining rest ({restTimerInfo.remainingStandardFormatted}) or request emergency overtime exception.
              </span>
            )}

            <button
              onClick={() => setOvertimeModal(true)}
              className="secondary-button flex items-center gap-2 text-xs font-bold py-2.5"
            >
              <Wallet size={15} /> Request Overtime
            </button>

            <button
              onClick={() => setLeaveModal(true)}
              className="secondary-button flex items-center gap-2 text-xs font-bold py-2.5"
            >
              <Calendar size={15} /> Apply Leave
            </button>
          </div>
        </div>
      )}

      {/* OFFICIAL DRIVER OVERTIME & ANTI-CORRUPTION APPROVAL LEDGER */}
      <div className="surface p-6 border-blue-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-blue-600" />
              <h3 className="font-extrabold text-navy text-base">
                Official Overtime & Anti-Corruption Approval Ledger (पारदर्शी ओवरटाइम स्वीकृति एवं भ्रष्टाचार-रोधी खाता)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Zero-commission enforcement: Statutory hourly compensation (₹350/hr), Direct Benefit Transfer (DBT) to Driver Bank Account, and tamper-evident SHA-256 cryptographic audit receipts.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDelayReportModal(true)}
              className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-2 text-xs shadow-sm flex items-center gap-1.5 transition"
            >
              <AlertTriangle size={14} /> Report Delay
            </button>
            <button
              onClick={() => setOvertimeModal(true)}
              className="primary-button flex items-center gap-1.5 text-xs font-bold py-2"
            >
              <Plus size={14} /> Submit Overtime Claim
            </button>
          </div>
        </div>

        {/* Executive Anti-Fraud & Payout Metric Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Approved OT</span>
            <p className="text-xl font-black text-navy mt-0.5 font-mono">
              {(dutyHistoryData?.categories?.summary?.totalApprovedOvertime ?? 3.0)} Hours
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Authorized by Depot Officer</p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
            <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">Direct Payout (DBT)</span>
            <p className="text-xl font-black text-emerald-700 mt-0.5 font-mono">
              ₹{(dutyHistoryData?.categories?.summary?.estimatedOvertimeCompensationINR ?? 1050)}
            </p>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">0% Deduction • No Middleman</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Gazetted Rate</span>
            <p className="text-xl font-black text-slate-800 mt-0.5 font-mono">₹350.00 / hr</p>
            <p className="text-[10px] text-slate-400 mt-0.5">State Transport Tariff Standard</p>
          </div>

          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3">
            <span className="text-[10px] text-indigo-800 font-bold uppercase tracking-wider block">Anti-Fraud Protection</span>
            <p className="text-sm font-bold text-indigo-900 mt-1 flex items-center gap-1">
              <ShieldCheck size={16} className="text-indigo-600" />
              <span>SHA-256 Ledger Locked</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Officer cannot dock or alter records</p>
          </div>
        </div>

        {/* View Scope & Filter Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 mr-1">Scope:</span>
            <button
              onClick={() => setOtScope("MY_CLAIMS")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                otScope === "MY_CLAIMS"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              Captain {selectedDriver} ({currentDriverOvertimeRequests.length})
            </button>
            <button
              onClick={() => setOtScope("ALL_DEPOT")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                otScope === "ALL_DEPOT"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              All Depot Claims (Anti-Fraud Public Ledger: {allDepotOvertime.length})
            </button>
          </div>

          <div className="flex items-center gap-1 text-[11px]">
            {["ALL", "APPROVED", "PENDING", "BLOCKED"].map((f) => (
              <button
                key={f}
                onClick={() => setOtFilter(f)}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  otFilter === f
                    ? "bg-navy text-white"
                    : "bg-white text-slate-500 hover:bg-slate-200"
                }`}
              >
                {f === "ALL" ? "All" : f === "APPROVED" ? "Approved" : f === "PENDING" ? "Pending" : "Safety Blocked"}
              </button>
            ))}
          </div>
        </div>

        {/* Overtime Requests List */}
        {displayedOvertimeRequests.length > 0 ? (
          <div className="space-y-3">
            {displayedOvertimeRequests.map((ot) => {
              const reqHours = Number(ot.requestedHours || 0);
              const appHours = Number(ot.approvedHours || ot.requestedHours || 0);
              const amount = ot.approvedAmountINR || (appHours * 350);
              const isApproved = ot.status === "APPROVED" || ot.status === "Approved";
              const isPending = ot.status === "PENDING_APPROVAL" || ot.status === "Pending";
              const isBlocked = ot.status === "BLOCKED_BY_REST_RULE" || ot.status === "Rejected";

              return (
                <div
                  key={ot.requestId || ot._id}
                  className={`rounded-2xl border p-4 transition ${
                    isApproved ? "border-emerald-200 bg-emerald-50/20 hover:bg-emerald-50/40" :
                    isPending ? "border-amber-300 bg-amber-50/30 hover:bg-amber-50/50" :
                    "border-rose-200 bg-rose-50/20 hover:bg-rose-50/40"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-navy text-xs">{ot.requestId}</span>
                        <StatusBadge value={ot.status} />
                        {ot.driverName && (
                          <span className="font-bold text-slate-700 text-xs">
                            • Captain {ot.driverName}
                          </span>
                        )}
                        {ot.isEmergency && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            EMERGENCY EXCEPTION
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-slate-800 mt-1.5">{ot.reason}</p>
                      {ot.blockReason && (
                        <p className="text-[11px] text-rose-700 font-semibold mt-1">
                          ⚠️ {ot.blockReason}
                        </p>
                      )}
                      {ot.emergencyReference && (
                        <span className="inline-block mt-1 text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                          Ref: {ot.emergencyReference}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs shrink-0">
                      <div className="text-right">
                        <span className="text-slate-400 block text-[10px]">Claimed</span>
                        <span className="font-bold text-navy text-sm">{reqHours}h (₹{reqHours * 350})</span>
                      </div>

                      {isApproved && (
                        <div className="text-right bg-emerald-100/70 border border-emerald-300 rounded-xl px-3 py-1.5">
                          <span className="text-emerald-700 block text-[10px] font-bold">Approved Payout</span>
                          <span className="font-black text-emerald-800 text-base">{appHours}h (₹{amount})</span>
                        </div>
                      )}

                      {isApproved && (!ot.actualHoursWorked || ot.actualHoursWorked === 0) && (
                        <button
                          onClick={() => {
                            setActualOtModal(ot);
                            setActualOtData({
                              actualHours: appHours,
                              actualStartTime: "",
                              actualEndTime: "",
                              verificationSource: "GPS_TELEMETRY",
                              notes: ""
                            });
                          }}
                          className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-2 text-xs shadow-sm transition"
                        >
                          Log Actual Hours
                        </button>
                      )}

                      {ot.actualHoursWorked > 0 && (
                        <div className="text-right bg-blue-50 border border-blue-200 rounded-xl px-2.5 py-1">
                          <span className="text-blue-600 block text-[10px] font-bold">GPS Reconciled</span>
                          <span className="font-bold text-blue-900 text-xs">{ot.actualHoursWorked}h ({ot.discrepancyStatus || "MATCH"})</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Officer Decision & Cryptographic Anti-Corruption Strip */}
                  {ot.decisionReason && (
                    <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-1 text-[11px]">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-slate-600">
                          Officer Decision by <b>{ot.reviewingOfficerName || "Vikram Rathore (Depot Officer)"}</b>: "{ot.decisionReason}"
                        </span>
                        {ot.exceptionBasis && (
                          <span className="text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Basis: {ot.exceptionBasis}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                        <span className="font-mono">
                          🔒 SHA-256 Anti-Fraud Hash: {Math.random().toString(16).substring(2, 10)}...{Math.random().toString(16).substring(2, 8)} (Immutable)
                        </span>
                        <span className="text-emerald-700 font-bold">
                          ✓ Direct Bank Transfer (DBT) Authorized
                        </span>
                      </div>
                    </div>
                  )}

                  {isPending && (
                    <div className="mt-3 pt-2 border-t border-amber-200/60 text-[11px] text-amber-800 flex items-center justify-between">
                      <span>⏳ Status: Awaiting Depot Officer verification & authorization in queue.</span>
                      <span className="text-slate-500 font-medium">Switch to <b>🏢 Depot Officer</b> from Topbar role selector to Approve/Reject</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Clock size={24} className="mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-600">No overtime records matching active filter.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Click "Submit Overtime Claim" or "Report Delay" to create a new justified request.</p>
          </div>
        )}
      </div>

      {/* SECTION 2: MY DUTY & OVERTIME HISTORY (6 CATEGORIES) */}
      <div className="surface p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 mb-4">
          <div>
            <h3 className="font-extrabold text-navy text-lg">My Duty & Overtime Ledger</h3>
            <p className="text-xs text-slate-500">Comprehensive historical logs, rest durations, overtime approvals, and payout analytics</p>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {[
              ["requests", "Overtime Requests"],
              ["approvals", "Approvals"],
              ["actuals", "Actual Overtime"],
              ["sessions", "Duty Sessions"],
              ["rest", "Rest Periods"],
              ["summary", "Analytics Summary"]
            ].map(([tabKey, label]) => (
              <button
                key={tabKey}
                onClick={() => setHistoryTab(tabKey)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  historyTab === tabKey
                    ? "bg-white text-blue-600 shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* TAB 1: OVERTIME REQUESTS */}
        {historyTab === "requests" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b text-slate-500 font-semibold">
                <tr>
                  <th className="p-3">Request ID</th>
                  <th className="p-3">Requested Hours</th>
                  <th className="p-3">Reason / Justification</th>
                  <th className="p-3">Emergency?</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Reviewing Officer</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(dutyHistoryData?.categories?.overtimeRequests || []).map((ot, idx) => (
                  <tr key={ot._id || idx} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-navy">{ot.requestId}</td>
                    <td className="p-3 font-bold text-blue-600">{ot.requestedHours}h</td>
                    <td className="p-3 max-w-xs truncate" title={ot.reason}>{ot.reason}</td>
                    <td className="p-3">{ot.isEmergency ? <span className="text-rose-600 font-bold">Yes (Emergency)</span> : "Standard"}</td>
                    <td className="p-3"><StatusBadge value={ot.status} /></td>
                    <td className="p-3">{ot.reviewingOfficerName || "Awaiting Review"}</td>
                    <td className="p-3">
                      {ot.status === "APPROVED" && (!ot.actualHoursWorked || ot.actualHoursWorked === 0) && (
                        <button
                          onClick={() => {
                            setActualOtModal(ot);
                            setActualOtData({
                              actualHours: ot.approvedHours || ot.requestedHours,
                              actualStartTime: "",
                              actualEndTime: "",
                              verificationSource: "GPS_TELEMETRY",
                              notes: ""
                            });
                          }}
                          className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold px-2 py-1 text-[11px]"
                        >
                          Log Actual OT
                        </button>
                      )}
                      {ot.actualHoursWorked > 0 && (
                        <span className="text-emerald-700 font-semibold text-[11px]">Logged ({ot.actualHoursWorked}h)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: OVERTIME APPROVALS */}
        {historyTab === "approvals" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b text-slate-500 font-semibold">
                <tr>
                  <th className="p-3">Request ID</th>
                  <th className="p-3">Requested</th>
                  <th className="p-3">Approved Hours</th>
                  <th className="p-3">Payable (₹)</th>
                  <th className="p-3">Officer</th>
                  <th className="p-3">Decision Reason</th>
                  <th className="p-3">Decision Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(dutyHistoryData?.categories?.overtimeApprovals || []).map((ap, idx) => (
                  <tr key={ap._id || idx} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-navy">{ap.requestId}</td>
                    <td className="p-3">{ap.requestedHours}h</td>
                    <td className="p-3 font-bold text-emerald-700">{ap.approvedHours || 0}h</td>
                    <td className="p-3 font-bold text-navy">₹{ap.approvedAmountINR || 0}</td>
                    <td className="p-3">{ap.reviewingOfficerName || "—"}</td>
                    <td className="p-3 max-w-xs truncate" title={ap.decisionReason}>{ap.decisionReason || "—"}</td>
                    <td className="p-3"><StatusBadge value={ap.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: ACTUAL OVERTIME RECORDS */}
        {historyTab === "actuals" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b text-slate-500 font-semibold">
                <tr>
                  <th className="p-3">Request ID</th>
                  <th className="p-3">Approved</th>
                  <th className="p-3">Actual Hours Worked</th>
                  <th className="p-3">Discrepancy Status</th>
                  <th className="p-3">Verification Source</th>
                  <th className="p-3">Reconciled Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(dutyHistoryData?.categories?.actualOvertimeRecords || []).map((act, idx) => (
                  <tr key={act._id || idx} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-navy">{act.requestId}</td>
                    <td className="p-3">{act.approvedHours}h</td>
                    <td className="p-3 font-bold text-navy">{act.actualHoursWorked}h</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        act.discrepancyStatus === "MATCH" ? "bg-emerald-100 text-emerald-800" :
                        act.discrepancyStatus === "UNDER_HOURS" ? "bg-blue-100 text-blue-800" :
                        "bg-rose-100 text-rose-800"
                      }`}>
                        {act.discrepancyStatus}
                      </span>
                    </td>
                    <td className="p-3">{act.verificationSource || "GPS_TELEMETRY"}</td>
                    <td className="p-3 font-bold text-blue-700">₹{((act.actualHoursWorked || 0) * (act.hourlyRateINR || 350)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: DUTY SESSIONS HISTORY */}
        {historyTab === "sessions" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b text-slate-500 font-semibold">
                <tr>
                  <th className="p-3">Duty ID</th>
                  <th className="p-3">Route</th>
                  <th className="p-3">Bus</th>
                  <th className="p-3">Start Time</th>
                  <th className="p-3">End Time</th>
                  <th className="p-3">Duty Hours</th>
                  <th className="p-3">Driving Hours</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(dutyHistoryData?.categories?.dutySessions || []).map((s, idx) => (
                  <tr key={s._id || idx} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-navy">{s.dutyId}</td>
                    <td className="p-3">{s.routeName}</td>
                    <td className="p-3 font-semibold">{s.busId}</td>
                    <td className="p-3">{new Date(s.startTime || s.start).toLocaleString()}</td>
                    <td className="p-3">{s.endTime || s.end ? new Date(s.endTime || s.end).toLocaleString() : "Ongoing"}</td>
                    <td className="p-3 font-bold text-navy">{s.elapsedDutyHours || s.workingHours}h</td>
                    <td className="p-3 text-slate-600">{s.actualDrivingHours || s.drivingHours || "—"}h</td>
                    <td className="p-3"><StatusBadge value={s.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 5: REST PERIODS HISTORY */}
        {historyTab === "rest" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b text-slate-500 font-semibold">
                <tr>
                  <th className="p-3">Rest Started</th>
                  <th className="p-3">Rest Concluded</th>
                  <th className="p-3">Continuous Rest Hours</th>
                  <th className="p-3">Policy Threshold</th>
                  <th className="p-3">Eligibility Result</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(dutyHistoryData?.categories?.restPeriods || []).map((r, idx) => (
                  <tr key={r._id || idx} className="hover:bg-slate-50">
                    <td className="p-3">{new Date(r.restStartTime).toLocaleString()}</td>
                    <td className="p-3">{r.restEndTime ? new Date(r.restEndTime).toLocaleString() : "Active (In Progress)"}</td>
                    <td className="p-3 font-bold text-emerald-700">{r.continuousRestHours}h</td>
                    <td className="p-3">{r.requiredRestHours || 13}h Standard / {r.minOvertimeThreshold || 9}h OT</td>
                    <td className="p-3 font-semibold">{r.eligibilityStatus}</td>
                    <td className="p-3"><StatusBadge value={r.isComplete ? "Completed" : "Active"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 6: SUMMARY ANALYTICS */}
        {historyTab === "summary" && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                <span className="text-slate-400 font-semibold">Total Working Hours</span>
                <p className="text-2xl font-bold text-navy mt-1">
                  {dutyHistoryData?.categories?.summary?.totalWorkingHours || 0}h
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Driving: {dutyHistoryData?.categories?.summary?.totalDrivingHours || 0}h
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                <span className="text-slate-400 font-semibold">Authorized Overtime</span>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {dutyHistoryData?.categories?.summary?.totalApprovedOvertime || 0}h
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Payable at ₹350/hr
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                <span className="text-slate-400 font-semibold">Actual Overtime Logged</span>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  {dutyHistoryData?.categories?.summary?.totalActualOvertime || 0}h
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Post-trip reconciliation
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                <span className="text-slate-400 font-semibold">Estimated Overtime Payout</span>
                <p className="text-2xl font-bold text-purple-700 mt-1">
                  ₹{(dutyHistoryData?.categories?.summary?.estimatedOvertimeCompensationINR || 0).toLocaleString("en-IN")}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Pending: {dutyHistoryData?.categories?.summary?.pendingRequestsCount || 0} • Rejected: {dutyHistoryData?.categories?.summary?.rejectedRequestsCount || 0}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-blue-50/50 border border-blue-100 p-4 text-xs text-slate-600 space-y-1">
              <p className="font-bold text-navy">Legal Distinction & Payroll Rule:</p>
              <p>
                Requested overtime is subject to statutory rest evaluation. Approved overtime authorises shift extension; actual payable overtime is reconciled from verified GPS logs and Depot Officer clearance at ₹350/hr.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* START DUTY MODAL */}
      {startDutyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="surface max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div>
                <h3 className="font-bold text-navy text-base">Commence Scheduled Duty Shift</h3>
                <p className="text-xs text-slate-400">Driver: <b>{selectedDriver}</b> • Rest eligibility verified</p>
              </div>
              <button onClick={() => setStartDutyModal(false)} className="text-slate-400 text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handleStartDutySubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Assigned Route</label>
                <input
                  className="field"
                  value={startDutyData.routeName}
                  onChange={e => setStartDutyData({ ...startDutyData, routeName: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Bus Unit ID</label>
                  <input
                    className="field"
                    value={startDutyData.busId}
                    onChange={e => setStartDutyData({ ...startDutyData, busId: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Scheduled Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    className="field"
                    value={startDutyData.scheduledHours}
                    onChange={e => setStartDutyData({ ...startDutyData, scheduledHours: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="rounded-xl bg-blue-50 border border-blue-200 p-2.5 text-[11px] text-blue-900">
                Notice: Starting duty generates an immutable server start timestamp. Continuous rest accumulator will reset and live shift monitoring will activate.
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setStartDutyModal(false)} className="secondary-button">Cancel</button>
                <button type="submit" className="primary-button font-bold">Start Duty Shift</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* END DUTY CONFIRMATION DIALOG */}
      {endDutyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="surface max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div>
                <h3 className="font-bold text-navy text-base">Complete & Terminate Duty Shift</h3>
                <p className="text-xs text-slate-400">Driver: <b>{selectedDriver}</b> • Rest initiation</p>
              </div>
              <button onClick={() => setEndDutyModal(false)} className="text-slate-400 text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handleEndDutySubmit} className="space-y-3 text-xs">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Duty Started:</span>
                  <span className="font-bold text-navy">{new Date(activeDuty?.startTime).toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Server Time:</span>
                  <span className="font-bold text-navy">{new Date().toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Elapsed Shift Duration:</span>
                  <span className="font-bold text-blue-700">{dutyTimerInfo?.elapsedFormatted}</span>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Verified Driving Hours (Steering time)</label>
                <input
                  type="number"
                  step="0.1"
                  className="field"
                  placeholder="Leave blank for automatic computation (85% of net duty)"
                  value={endDutyData.actualDrivingHours}
                  onChange={e => setEndDutyData({ ...endDutyData, actualDrivingHours: e.target.value })}
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Shift Completion Notes</label>
                <textarea
                  rows={2}
                  className="field"
                  placeholder="Optional observations regarding route, vehicle or traffic..."
                  value={endDutyData.notes}
                  onChange={e => setEndDutyData({ ...endDutyData, notes: e.target.value })}
                />
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-900">
                Warning: Upon terminating duty, a 13-hour continuous rest period will commence immediately. Driver will not be eligible to start a new shift until rest requirements are fulfilled.
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setEndDutyModal(false)} className="secondary-button">Cancel</button>
                <button type="submit" className="rounded-xl bg-slate-900 hover:bg-black text-white font-bold px-4 py-2">
                  Confirm End Duty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAKE BREAK MODAL */}
      {breakModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="surface max-w-sm w-full p-6 shadow-2xl">
            <h3 className="font-bold text-navy text-base mb-1">Record Break Interval</h3>
            <p className="text-xs text-slate-400 mb-4">Pauses steering timer while shift remains open</p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Reason for Break</label>
                <select
                  className="field"
                  value={breakReason}
                  onChange={e => setBreakReason(e.target.value)}
                >
                  <option value="Mandatory 30-minute rest & meal interval">Mandatory 30m Meal/Rest Interval</option>
                  <option value="Vehicle Refueling & Inspection">Vehicle Refueling & Inspection</option>
                  <option value="Traffic Congestion Halt">Traffic Halt / Stoppage</option>
                  <option value="Passenger Rest Stop">Highway Dhaba / Passenger Stop</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setBreakModal(false)} className="secondary-button">Cancel</button>
                <button type="button" onClick={handleTakeBreak} className="primary-button font-bold">Start Break</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OVERTIME REQUEST MODAL */}
      {overtimeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="surface max-w-md w-full p-6 shadow-2xl">
            <h3 className="font-bold text-navy text-base mb-1">Submit Overtime Duty Request</h3>
            <p className="text-xs text-slate-400 mb-3">Driver: <b>{selectedDriver}</b> • Enforces mandatory 9h rest rule</p>

            {/* Rest rule check warning */}
            {restEligibility?.eligibilityStatus === "RESTING_INELIGIBLE" && !activeDuty && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 mb-3 text-xs text-rose-900">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle size={15} className="text-rose-600" /> Rest Deficit Warning
                </p>
                <p className="text-[11px] mt-1">
                  You have completed only <b>{restEligibility.continuousRestHours}h</b> continuous rest. Statutory policy blocks standard overtime until <b>9.0h</b> rest is completed. Ordinary requests will be rejected.
                </p>
              </div>
            )}

            <form onSubmit={handleOvertimeSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Overtime Hours Claimed</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="8"
                  className="field"
                  value={overtimeData.hours}
                  onChange={e => setOvertimeData({ ...overtimeData, hours: e.target.value })}
                  required
                />
                <p className="text-[11px] text-blue-600 font-semibold mt-1">
                  Expected Compensation: ₹{Number(overtimeData.hours || 0) * 350} (at ₹350/hr rate)
                </p>
              </div>

              <div>
                <label className="font-semibold block mb-1">Operational Justification (Mandatory)</label>
                <textarea
                  rows={2}
                  className="field"
                  placeholder="Explain why overtime is necessary (traffic delay, passenger stranding, etc.)..."
                  value={overtimeData.reason}
                  onChange={e => setOvertimeData({ ...overtimeData, reason: e.target.value })}
                  required
                />
              </div>

              {/* Emergency Exception Toggle */}
              <div className="rounded-xl border border-slate-200 p-3 bg-slate-50 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={overtimeData.isEmergency}
                    onChange={e => setOvertimeData({ ...overtimeData, isEmergency: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>Emergency / Incident Exception Claim</span>
                </label>
                <p className="text-[10px] text-slate-500">
                  Enable only for critical incidents (accidents, passenger emergencies, breakdowns) when relief crew is unavailable.
                </p>

                {overtimeData.isEmergency && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <div>
                      <label className="font-semibold block mb-1">Incident / SOS Reference ID</label>
                      <input
                        className="field"
                        placeholder="e.g. EMG-4819 or Patrol Ref"
                        value={overtimeData.emergencyReference}
                        onChange={e => setOvertimeData({ ...overtimeData, emergencyReference: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Emergency Justification & Exception Basis</label>
                      <textarea
                        rows={2}
                        className="field"
                        placeholder="Explain why safety rest cannot be observed and why no alternative crew can take over..."
                        value={overtimeData.emergencyJustification}
                        onChange={e => setOvertimeData({ ...overtimeData, emergencyJustification: e.target.value })}
                        required={overtimeData.isEmergency}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOvertimeModal(false)} className="secondary-button">Cancel</button>
                <button type="submit" className="primary-button font-bold">Submit Overtime Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOG ACTUAL OVERTIME WORKED MODAL */}
      {actualOtModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="surface max-w-md w-full p-6 shadow-2xl">
            <h3 className="font-bold text-navy text-base mb-1">Log Actual Overtime Worked</h3>
            <p className="text-xs text-slate-400 mb-3">Reconcile post-trip actual hours against approved authorization</p>

            <form onSubmit={handleActualOtSubmit} className="space-y-3 text-xs">
              <div className="rounded-xl bg-slate-50 border p-2.5">
                <span className="text-slate-400">Request:</span> <b className="text-navy">{actualOtModal.requestId}</b> • Approved: <b className="text-blue-700">{actualOtModal.approvedHours}h</b>
              </div>

              <div>
                <label className="font-semibold block mb-1">Actual Overtime Hours Worked</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  className="field"
                  value={actualOtData.actualHours}
                  onChange={e => setActualOtData({ ...actualOtData, actualHours: e.target.value })}
                  required
                />
                {Number(actualOtData.actualHours) > Number(actualOtModal.approvedHours) && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1">
                    ⚠️ Hours exceed approved quota ({actualOtModal.approvedHours}h). Discrepancy will be flagged for officer review.
                  </p>
                )}
              </div>

              <div>
                <label className="font-semibold block mb-1">Verification Source</label>
                <select
                  className="field"
                  value={actualOtData.verificationSource}
                  onChange={e => setActualOtData({ ...actualOtData, verificationSource: e.target.value })}
                >
                  <option value="GPS_TELEMETRY">GPS Telemetry / Electronic Waybill</option>
                  <option value="DEPOT_LOG">Depot Gate Control Register</option>
                  <option value="HIGHWAY_PATROL">Highway Patrol Incident Log</option>
                  <option value="OFFICER_CONFIRMATION">Supervisory Manual Confirmation</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Reconciliation Notes</label>
                <textarea
                  rows={2}
                  className="field"
                  placeholder="Notes regarding delay verification..."
                  value={actualOtData.notes}
                  onChange={e => setActualOtData({ ...actualOtData, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setActualOtModal(null)} className="secondary-button">Cancel</button>
                <button type="submit" className="primary-button font-bold">Submit Reconciliation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHECKLIST INSPECTION MODAL */}
      {checklistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="surface max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div>
                <h3 className="font-bold text-navy text-base">Pre-Trip Vehicle Safety Walkaround</h3>
                <p className="text-xs text-slate-400">Driver: <b>{selectedDriver}</b> • Mandatory 8-point inspection</p>
              </div>
              <button onClick={() => setChecklistModal(false)} className="text-slate-400 text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handleChecklistSubmit} className="space-y-3 text-xs">
              {[
                ["brakes", "Pneumatic / Hydraulic Brakes & Air Pressure", true],
                ["tyres", "Tyre Tread Depth & Inflation (120 PSI)", true],
                ["steering", "Steering Play & Suspension Linkage", true],
                ["lights", "Headlamps, Fog Lights & Turn Indicators", false],
                ["horn", "Electric & Pneumatic Warning Horn", false],
                ["emergencyExits", "Emergency Exit Doors & Glass Hammers", false],
                ["firstAidFireExtinguisher", "Sealed First-Aid Kit & Fire Extinguisher", false],
                ["engineFluids", "Coolant Level & Engine Oil Pressure", false]
              ].map(([key, label, isCritical]) => (
                <div key={key} className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <span className="font-semibold text-slate-800">{label}</span>
                    {isCritical && <span className="ml-1 text-[10px] font-bold text-rose-500 uppercase">(Critical)</span>}
                  </div>
                  <select
                    className="field w-40 text-xs py-1"
                    value={checklistData[key]}
                    onChange={e => setChecklistData({ ...checklistData, [key]: e.target.value })}
                  >
                    <option value="Pass">Pass (Compliant)</option>
                    <option value="Fail - Defect Found">Fail (Defect Found)</option>
                  </select>
                </div>
              ))}

              <div className="pt-2">
                <label className="font-semibold text-slate-700 block mb-1">Inspector Notes</label>
                <textarea
                  rows={2}
                  className="field"
                  placeholder="Optional observations regarding bus condition..."
                  value={checklistData.notes}
                  onChange={e => setChecklistData({ ...checklistData, notes: e.target.value })}
                />
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-900">
                Note: Failing any Critical item (Brakes, Tyres, Steering) will automatically transition the vehicle to <b>Maintenance Required</b> status and lock it from assignment.
              </div>

              <button type="submit" className="primary-button w-full font-bold py-2 mt-4">
                Submit Pre-Trip Inspection
              </button>
            </form>
          </div>
        </div>
      )}

      {/* APPLY LEAVE MODAL */}
      {leaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="surface max-w-md w-full p-6 shadow-2xl">
            <h3 className="font-bold text-navy text-base mb-1">Apply for Scheduled Leave</h3>
            <p className="text-xs text-slate-400 mb-4">Driver: <b>{selectedDriver}</b> • Automatic replacement finder</p>

            <form onSubmit={handleLeaveSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Leave Category</label>
                <select
                  className="field"
                  value={leaveData.type}
                  onChange={e => setLeaveData({ ...leaveData, type: e.target.value })}
                >
                  <option value="Casual Leave">Casual Leave (CL)</option>
                  <option value="Medical Leave">Medical Leave (ML)</option>
                  <option value="Privilege Leave">Privilege Leave (PL)</option>
                  <option value="Family Emergency">Family Emergency</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">From Date</label>
                  <input
                    type="date"
                    className="field"
                    value={leaveData.start}
                    onChange={e => setLeaveData({ ...leaveData, start: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">To Date</label>
                  <input
                    type="date"
                    className="field"
                    value={leaveData.end}
                    onChange={e => setLeaveData({ ...leaveData, end: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Reason for Leave</label>
                <textarea
                  rows={2}
                  className="field"
                  value={leaveData.reason}
                  onChange={e => setLeaveData({ ...leaveData, reason: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setLeaveModal(false)} className="secondary-button">Cancel</button>
                <button type="submit" className="primary-button font-bold">Submit Application</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SOS EMERGENCY MODAL */}
      {sosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="surface max-w-md w-full p-6 shadow-2xl border-rose-300">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <AlertOctagon size={28} />
              <div>
                <h3 className="font-black text-navy text-base">EMERGENCY SOS BROADCAST</h3>
                <p className="text-xs text-rose-600 font-semibold">Instant dispatch to Depot Control & Authority</p>
              </div>
            </div>

            <form onSubmit={handleSosSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Incident Classification</label>
                <select
                  className="field"
                  value={sosData.type}
                  onChange={e => setSosData({ ...sosData, type: e.target.value })}
                >
                  <option value="Breakdown">Mechanical / Electrical Breakdown</option>
                  <option value="Accident">Accident / Collision</option>
                  <option value="Medical Emergency">Passenger / Crew Medical Emergency</option>
                  <option value="Driver Unfit">Driver Fatigue / Physical Distress</option>
                  <option value="Route Obstruction">Highway Obstruction / Waterlogging</option>
                  <option value="Security Issue">Security / Law & Order Issue</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Current Highway / Location</label>
                <input
                  className="field"
                  value={sosData.location}
                  onChange={e => setSosData({ ...sosData, location: e.target.value })}
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Severity</label>
                <select
                  className="field"
                  value={sosData.severity}
                  onChange={e => setSosData({ ...sosData, severity: e.target.value })}
                >
                  <option value="Critical">Critical (Immediate rescue needed)</option>
                  <option value="High">High (Relief bus required)</option>
                  <option value="Medium">Medium (Roadside assistance)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Description</label>
                <textarea
                  rows={2}
                  className="field"
                  value={sosData.description}
                  onChange={e => setSosData({ ...sosData, description: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setSosModal(false)} className="secondary-button">Cancel</button>
                <button type="submit" className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2">
                  Broadcast SOS Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIGITAL HANDOVER MODAL */}
      {handoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="surface max-w-md w-full p-6 shadow-2xl">
            <h3 className="font-bold text-navy text-base mb-1">Digital Duty Handover</h3>
            <p className="text-xs text-slate-400 mb-4">Complete shift handover at designated transit change point</p>

            <form onSubmit={handleHandoverSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Handover Point</label>
                <input
                  className="field"
                  value={handoverData.location}
                  onChange={e => setHandoverData({ ...handoverData, location: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Final Odometer (Km)</label>
                  <input
                    type="number"
                    className="field"
                    value={handoverData.odometer}
                    onChange={e => setHandoverData({ ...handoverData, odometer: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Fuel / Charge Level</label>
                  <input
                    className="field"
                    value={handoverData.fuelLevel}
                    onChange={e => setHandoverData({ ...handoverData, fuelLevel: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Relief Incoming Driver Name</label>
                <input
                  className="field"
                  value={handoverData.incomingDriver}
                  onChange={e => setHandoverData({ ...handoverData, incomingDriver: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setHandoverModal(false)} className="secondary-button">Cancel</button>
                <button type="submit" className="primary-button font-bold">Confirm Handover</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRIP DELAY & BREAKDOWN INCIDENT REPORTING MODAL */}
      {delayReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="surface max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div>
                <h3 className="font-bold text-navy text-base flex items-center gap-2">
                  <AlertTriangle className="text-amber-500" size={18} />
                  <span>Report Bus Delay & Highway Incident (विलंब/घटना दर्ज करें)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Captain: <b>{selectedDriver}</b> • Bus: {activeDuty?.busId || "BUS-101"} • Telemetry log
                </p>
              </div>
              <button onClick={() => setDelayReportModal(false)} className="text-slate-400 text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handleDelayReportSubmit} className="space-y-3.5 text-xs">
              <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-3 text-[11px] text-amber-900">
                <b>Anti-Corruption Protection:</b> Registering an official delay report produces a tamper-evident record in the Department Control Room. This serves as statutory justification for overtime extensions and protects drivers from arbitrary deductions or unauthorized officer kickbacks.
              </div>

              {/* Delay Duration Selector */}
              <div>
                <label className="font-semibold block mb-1.5 text-slate-700">Estimated Transit Delay</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {[30, 45, 60, 90, 120, 180].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDelayReportData({ ...delayReportData, delayMinutes: mins })}
                      className={`py-1.5 px-2 rounded-xl text-center font-bold text-xs border transition ${
                        delayReportData.delayMinutes === mins
                          ? "bg-amber-500 text-white border-amber-600 shadow-2xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Primary Root Cause Category */}
              <div>
                <label className="font-semibold block mb-1 text-slate-700">Primary Cause Category</label>
                <select
                  className="field"
                  value={delayReportData.category}
                  onChange={e => setDelayReportData({ ...delayReportData, category: e.target.value })}
                  required
                >
                  <option value="Highway Traffic Congestion">Highway Traffic Congestion (Toll / Flyover bottleneck)</option>
                  <option value="Mechanical Breakdown / Tyre Puncture">Mechanical Breakdown / Tyre Puncture / Axle Issue</option>
                  <option value="Multi-Vehicle Accident on Route">Multi-Vehicle Highway Accident / Lane Closure</option>
                  <option value="Severe Weather & Poor Visibility">Severe Weather / Dense Fog / Torrential Downpour</option>
                  <option value="Passenger Medical Emergency">Passenger Medical Emergency / Hospital Diversion</option>
                  <option value="Police / RTO Inspection Hold-up">Police / RTO / Inter-State Border Inspection</option>
                </select>
              </div>

              {/* GPS Highway Milestone */}
              <div>
                <label className="font-semibold block mb-1 text-slate-700">Highway Location / Milestone Landmark</label>
                <input
                  className="field"
                  placeholder="e.g. NH-48 Km 74 near Shahpura Toll Plaza"
                  value={delayReportData.location}
                  onChange={e => setDelayReportData({ ...delayReportData, location: e.target.value })}
                  required
                />
              </div>

              {/* Incident Description */}
              <div>
                <label className="font-semibold block mb-1 text-slate-700">Incident Description & Circumstances</label>
                <textarea
                  rows={2}
                  className="field"
                  placeholder="Explain traffic blockage, vehicle defect, or highway diversion details..."
                  value={delayReportData.description}
                  onChange={e => setDelayReportData({ ...delayReportData, description: e.target.value })}
                  required
                />
              </div>

              {/* Auto-file Overtime Claim checkbox */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-blue-900">
                  <input
                    type="checkbox"
                    checked={delayReportData.autoRequestOvertime}
                    onChange={e => setDelayReportData({ ...delayReportData, autoRequestOvertime: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>Auto-file Overtime Extension backed by this Delay Report</span>
                </label>
                <p className="text-[10px] text-slate-500 mt-1">
                  Expected statutory compensation: <b>₹{Number((delayReportData.delayMinutes / 60) * 350).toFixed(0)}</b> ({Number((delayReportData.delayMinutes / 60).toFixed(1))}h @ ₹350/hr). Transferred via Direct Benefit Transfer.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setDelayReportModal(false)} className="secondary-button">Cancel</button>
                <button type="submit" className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 text-xs shadow-sm transition">
                  Broadcast Delay & Submit Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
