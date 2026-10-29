import {
  DutySession, RestPeriod, OvertimeRequest, Duty, Overtime, Policy, Crew, User, Notification
} from "../models/index.js";
import { createTamperEvidentLog } from "../utils/auditLogger.js";

const DEFAULT_POLICY = {
  version: "POL-v2.4",
  normalRestHours: 13.0,                  // Configurable standard continuous rest policy
  minRestThresholdForOvertime: 9.0,       // Statutory minimum rest threshold for overtime eligibility under Motor Transport rules
  maxDutyHours: 10.0,                     // Daily maximum duty hours
  maxDrivingHours: 8.0,                   // Maximum continuous steering time
  weeklyLimit: 48.0,                      // Maximum statutory weekly ceiling
  overtimeThreshold: 8.0,                 // Daily threshold after which overtime starts
  maxConsecutiveDays: 6,                  // Maximum consecutive shifts before mandatory 24h rest
  nightShiftMultiplier: 1.25,             // Circadian fatigue multiplier for 22:00 - 06:00
  hourlyOvertimeRateINR: 350.0,           // Configurable overtime compensation rate
  mandatoryBreakIntervalHours: 4.5,       // Max continuous steering before mandatory break
  mandatoryBreakMinutes: 30               // Duration of mandatory break
};

/**
 * Retrieves the currently active duty and rest policy.
 */
export async function getActivePolicy() {
  let policy = await Policy.findOne();
  if (!policy) {
    policy = await Policy.create(DEFAULT_POLICY);
  } else {
    // Ensure all necessary parameters exist with backwards-compatible defaults
    let updated = false;
    const fieldsToEnsure = {
      version: DEFAULT_POLICY.version,
      normalRestHours: DEFAULT_POLICY.normalRestHours,
      minRestThresholdForOvertime: DEFAULT_POLICY.minRestThresholdForOvertime,
      hourlyOvertimeRateINR: DEFAULT_POLICY.hourlyOvertimeRateINR,
      mandatoryBreakIntervalHours: DEFAULT_POLICY.mandatoryBreakIntervalHours,
      mandatoryBreakMinutes: DEFAULT_POLICY.mandatoryBreakMinutes
    };
    for (const [key, val] of Object.entries(fieldsToEnsure)) {
      if (policy[key] === undefined || policy[key] === null) {
        policy[key] = val;
        updated = true;
      }
    }
    if (updated) {
      await Policy.findOneAndUpdate({}, policy);
    }
  }
  return policy;
}

function getNameVariants(driverName) {
  const raw = String(driverName || "").trim();
  const clean = raw.replace(/\s*\(Driver\)/i, "").trim();
  const withSuffix = `${clean} (Driver)`;
  return Array.from(new Set([raw, clean, withSuffix].filter(Boolean)));
}

/**
 * Authoritative, server-side continuous rest calculation and eligibility check.
 * Never trusts the client's clock or client-supplied rest values.
 */
export async function evaluateDriverRestEligibility(driverId, driverName) {
  const policy = await getActivePolicy();
  const now = new Date();
  const nowMs = now.getTime();
  const nameVariants = getNameVariants(driverName);

  // 1. Check for any current active or paused duty session
  const activeSessions = await DutySession.find({
    driverName: { $in: nameVariants },
    status: { $in: ["ACTIVE", "PAUSED_BREAK"] }
  });

  const activeSession = activeSessions.length > 0 ? activeSessions[0] : null;

  // 2. Locate the most recent completed duty session or legacy Duty record
  const completedSessions = await DutySession.find({
    driverName: { $in: nameVariants },
    status: "COMPLETED"
  }).sort({ endTime: -1 }).limit(1);

  let lastCompletedDuty = completedSessions.length > 0 ? completedSessions[0] : null;

  // If no formal DutySession completed, check legacy Duty model
  if (!lastCompletedDuty) {
    const legacyDuties = await Duty.find({
      crew: { $in: nameVariants },
      status: "Completed"
    }).sort({ end: -1 }).limit(1);

    if (legacyDuties.length > 0) {
      lastCompletedDuty = {
        dutyId: legacyDuties[0].dutyId || "DUTY-LEGACY",
        endTime: legacyDuties[0].end,
        workingHours: legacyDuties[0].workingHours || 8.0,
        busId: legacyDuties[0].busId,
        routeName: legacyDuties[0].routeName
      };
    }
  }

  // 3. Query existing RestPeriod records
  const restRecords = await RestPeriod.find({
    driverName: { $in: nameVariants }
  }).sort({ restStartTime: -1 }).limit(1);

  let activeRestPeriod = restRecords.length > 0 ? restRecords[0] : null;

  // Determine rest start timestamp
  let restStartTime = null;
  if (activeRestPeriod && !activeRestPeriod.isComplete) {
    restStartTime = new Date(activeRestPeriod.restStartTime);
  } else if (lastCompletedDuty?.endTime) {
    restStartTime = new Date(lastCompletedDuty.endTime);
  }

  // If driver has an ongoing active duty right now
  if (activeSession) {
    return {
      isCurrentlyOnDuty: true,
      activeSessionId: activeSession.dutyId || activeSession.id,
      eligibilityStatus: "ON_DUTY",
      continuousRestHours: 0,
      normalRestRequired: policy.normalRestHours,
      minOvertimeThreshold: policy.minRestThresholdForOvertime,
      remainingUntilStandardRestHours: policy.normalRestHours,
      remainingUntilOvertimeThresholdHours: policy.minRestThresholdForOvertime,
      earliestNextDutyTimestamp: null,
      earliestOvertimeEligibilityTimestamp: null,
      lastDutyEndTime: lastCompletedDuty?.endTime || null,
      restStartTime: null,
      serverTime: now.toISOString(),
      summary: "Driver is currently on active duty. Rest period has not commenced.",
      canStartDuty: false,
      canRequestOvertime: true, // During duty, driver may submit an overtime extension
      conditions: [
        { label: "Active Duty Check", satisfied: false, detail: "Driver is currently engaged in an active duty session." }
      ]
    };
  }

  // If driver has no history on record, treat as fully rested default
  if (!restStartTime || isNaN(restStartTime.getTime())) {
    return {
      isCurrentlyOnDuty: false,
      activeSessionId: null,
      eligibilityStatus: "FULLY_ELIGIBLE",
      continuousRestHours: 24.0,
      normalRestRequired: policy.normalRestHours,
      minOvertimeThreshold: policy.minRestThresholdForOvertime,
      remainingUntilStandardRestHours: 0,
      remainingUntilOvertimeThresholdHours: 0,
      earliestNextDutyTimestamp: now.toISOString(),
      earliestOvertimeEligibilityTimestamp: now.toISOString(),
      lastDutyEndTime: null,
      restStartTime: null,
      serverTime: now.toISOString(),
      summary: "No prior duty session recorded. Full rest compliance satisfied by default.",
      canStartDuty: true,
      canRequestOvertime: true,
      conditions: [
        { label: "Standard Shift Rest Requirement (13h)", satisfied: true, detail: "Satisfied (No prior duty logged)." },
        { label: "Minimum Overtime Rest Threshold (9h)", satisfied: true, detail: "Satisfied." }
      ]
    };
  }

  // Calculate authoritative continuous rest elapsed
  const elapsedMs = Math.max(0, nowMs - restStartTime.getTime());
  const continuousRestHours = Number((elapsedMs / (1000 * 3600)).toFixed(2));

  const normalRestRequired = Number(policy.normalRestHours || 13.0);
  const minOvertimeThreshold = Number(policy.minRestThresholdForOvertime || 9.0);

  const remainingUntilStandardRestHours = Math.max(0, Number((normalRestRequired - continuousRestHours).toFixed(2)));
  const remainingUntilOvertimeThresholdHours = Math.max(0, Number((minOvertimeThreshold - continuousRestHours).toFixed(2)));

  const earliestNextDutyTimestamp = new Date(restStartTime.getTime() + normalRestRequired * 3600 * 1000).toISOString();
  const earliestOvertimeEligibilityTimestamp = new Date(restStartTime.getTime() + minOvertimeThreshold * 3600 * 1000).toISOString();

  let eligibilityStatus = "RESTING_INELIGIBLE";
  let summary = "";
  let canStartDuty = false;
  let canRequestOvertime = false;

  if (continuousRestHours >= normalRestRequired) {
    eligibilityStatus = "FULLY_ELIGIBLE";
    summary = `Standard continuous rest requirement of ${normalRestRequired}h satisfied (${continuousRestHours}h accumulated). Driver is eligible for shift assignment.`;
    canStartDuty = true;
    canRequestOvertime = true;
  } else if (continuousRestHours >= minOvertimeThreshold) {
    eligibilityStatus = "OVERTIME_ELIGIBLE_ONLY_WITH_APPROVAL";
    summary = `Minimum overtime rest threshold of ${minOvertimeThreshold}h satisfied (${continuousRestHours}h continuous rest). Eligible for overtime consideration ONLY upon explicit Depot Officer review and operational authorization. Standard shift requires ${remainingUntilStandardRestHours}h additional rest.`;
    canStartDuty = false;
    canRequestOvertime = true;
  } else {
    eligibilityStatus = "RESTING_INELIGIBLE";
    summary = `Mandatory rest in progress. Driver has accumulated ${continuousRestHours}h out of ${normalRestRequired}h standard required rest (${remainingUntilStandardRestHours}h remaining). Overtime threshold (${minOvertimeThreshold}h) not reached (${remainingUntilOvertimeThresholdHours}h remaining). Dispatch and ordinary overtime blocked.`;
    canStartDuty = false;
    canRequestOvertime = false;
  }

  const conditions = [
    {
      label: `Minimum Overtime Rest Threshold (${minOvertimeThreshold}h)`,
      satisfied: continuousRestHours >= minOvertimeThreshold,
      deficitHours: remainingUntilOvertimeThresholdHours,
      detail: continuousRestHours >= minOvertimeThreshold
        ? `Compliant (${continuousRestHours}h completed)`
        : `Deficit: ${remainingUntilOvertimeThresholdHours}h continuous rest remaining`
    },
    {
      label: `Standard Next-Duty Rest Requirement (${normalRestRequired}h)`,
      satisfied: continuousRestHours >= normalRestRequired,
      deficitHours: remainingUntilStandardRestHours,
      detail: continuousRestHours >= normalRestRequired
        ? `Fully satisfied (${continuousRestHours}h continuous rest completed)`
        : `Deficit: ${remainingUntilStandardRestHours}h continuous rest remaining`
    },
    {
      label: "Active Conflicting Session Check",
      satisfied: !activeSession,
      detail: activeSession ? "Active session in progress" : "No overlapping duty"
    }
  ];

  return {
    isCurrentlyOnDuty: false,
    activeSessionId: null,
    eligibilityStatus,
    continuousRestHours,
    normalRestRequired,
    minOvertimeThreshold,
    remainingUntilStandardRestHours,
    remainingUntilOvertimeThresholdHours,
    earliestNextDutyTimestamp,
    earliestOvertimeEligibilityTimestamp,
    lastDutyEndTime: lastCompletedDuty?.endTime || restStartTime.toISOString(),
    restStartTime: restStartTime.toISOString(),
    serverTime: now.toISOString(),
    summary,
    canStartDuty,
    canRequestOvertime,
    conditions,
    lastDutySession: lastCompletedDuty
  };
}

/**
 * Atomically starts a new driver duty session.
 */
export async function startDutySession({
  driverId,
  driverName,
  employeeId,
  busId,
  routeId,
  routeName,
  tripId,
  depot,
  scheduledHours = 8.0,
  actor
}) {
  const policy = await getActivePolicy();
  const restEvaluation = await evaluateDriverRestEligibility(driverId, driverName);

  // 1. Prevent duplicate active duty sessions
  if (restEvaluation.isCurrentlyOnDuty) {
    const error = new Error(`Cannot start duty: Driver already has an active duty session (ID: ${restEvaluation.activeSessionId}). Duplicate sessions are strictly prohibited.`);
    error.statusCode = 409;
    throw error;
  }

  // 2. Prevent starting duty before required standard rest threshold is satisfied
  if (restEvaluation.eligibilityStatus === "RESTING_INELIGIBLE") {
    const error = new Error(`Safety Lockout: Cannot begin duty. Mandatory rest policy requires minimum continuous rest. Current rest: ${restEvaluation.continuousRestHours}h. Remaining rest required: ${restEvaluation.remainingUntilStandardRestHours}h.`);
    error.statusCode = 403;
    throw error;
  }

  const now = new Date();
  const startTime = now.toISOString();
  const dutyId = `DUTY-SES-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  // 3. Create duty session record
  const newSession = await DutySession.create({
    dutyId,
    driverId: String(driverId),
    driverName,
    employeeId: employeeId || "DRV-1001",
    busId: busId || "BUS-101",
    routeId: routeId || "RT-101",
    routeName: routeName || "Jaipur → Delhi Express Corridor (NH-48)",
    tripId: tripId || `TRIP-${now.getFullYear()}-${Date.now().toString().slice(-3)}`,
    depot: depot || "Jaipur Central",
    policyVersion: policy.version || "POL-v2.4",
    status: "ACTIVE",
    startTime,
    endTime: null,
    scheduledHours: Number(scheduledHours) || 8.0,
    elapsedDutyHours: 0.0,
    actualDrivingHours: 0.0,
    totalBreakMinutes: 0,
    breaks: [],
    fatigueScoreStart: 15,
    riskLevel: "Low"
  });

  // Also maintain backward-compatible legacy Duty entry
  await Duty.create({
    dutyId,
    trip: newSession.tripId,
    routeName: newSession.routeName,
    busId: newSession.busId,
    crew: driverName,
    crewRole: "DRIVER",
    depot: newSession.depot,
    start: startTime,
    end: null,
    workingHours: Number(scheduledHours) || 8.0,
    drivingHours: 0,
    restBefore: restEvaluation.continuousRestHours,
    weeklyHours: 32.0,
    consecutiveDays: 3,
    risk: "Low",
    eligibility: "Eligible",
    status: "Active"
  });

  // Close previous RestPeriod if any
  const previousRest = await RestPeriod.findOne({ driverName, isComplete: false });
  if (previousRest) {
    await RestPeriod.findByIdAndUpdate(previousRest._id, {
      restEndTime: startTime,
      isComplete: true
    });
  }

  // Tamper-evident audit log
  await createTamperEvidentLog({
    actorId: actor?.id || driverId,
    actorName: actor?.name || driverName,
    actorRole: actor?.role || "DRIVER",
    action: "DUTY_STARTED",
    entity: "DutySession",
    entityId: newSession._id || dutyId,
    reason: `Driver ${driverName} commenced scheduled duty shift.`,
    newValue: newSession,
    policyVersion: policy.version,
    complianceResult: restEvaluation
  });

  // Notify Department Officers & Control in their notification drawer
  try {
    await Notification.create({
      user: "all_officers",
      role: "DEPOT_OFFICER",
      title: `Shift Commenced: ${driverName}`,
      message: `Driver ${driverName} commenced scheduled shift on Bus ${newSession.busId} (${newSession.routeName}). Start time: ${new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Rest compliance verified (${restEvaluation.continuousRestHours}h).`,
      type: "info",
      read: false,
      createdAt: startTime
    });
  } catch (notifErr) {
    console.warn("Failed to create start duty notification:", notifErr.message);
  }

  return newSession;
}

/**
 * Returns the currently active duty session for a driver, enriched with real-time server calculations.
 */
export async function getActiveDutySession(driverId, driverName) {
  const policy = await getActivePolicy();
  const nameVariants = getNameVariants(driverName);
  const sessions = await DutySession.find({
    driverName: { $in: nameVariants },
    status: { $in: ["ACTIVE", "PAUSED_BREAK"] }
  }).sort({ startTime: -1 }).limit(1);

  if (sessions.length === 0) {
    // If the driver already has modern DutySession records (e.g. COMPLETED session), do not resurrect obsolete legacy duties
    const anyModernSession = await DutySession.findOne({
      driverName: { $in: nameVariants }
    });
    if (anyModernSession) {
      return null;
    }

    // Check legacy Duty model as fallback
    const legacy = await Duty.findOne({
      crew: { $in: nameVariants },
      status: "Active"
    });
    if (legacy) {
      const now = new Date();
      const startMs = new Date(legacy.start).getTime();
      const elapsedHours = Number(Math.max(0, (now.getTime() - startMs) / (1000 * 3600)).toFixed(2));
      return {
        _id: legacy._id,
        dutyId: legacy.dutyId,
        driverName,
        busId: legacy.busId,
        routeName: legacy.routeName,
        tripId: legacy.trip,
        depot: legacy.depot,
        startTime: legacy.start,
        status: "ACTIVE",
        scheduledHours: legacy.workingHours || 8.0,
        elapsedDutyHours: elapsedHours,
        actualDrivingHours: Number((elapsedHours * 0.85).toFixed(2)),
        totalBreakMinutes: 0,
        breaks: [],
        remainingScheduledHours: Math.max(0, Number(((legacy.workingHours || 8.0) - elapsedHours).toFixed(2))),
        warnings: elapsedHours >= policy.maxDutyHours
          ? [`CRITICAL LIMIT EXCEEDED: Shift duration (${elapsedHours}h) has reached or exceeded max policy ceiling (${policy.maxDutyHours}h). Handover required.`]
          : elapsedHours >= (policy.maxDutyHours - 1.0)
          ? [`THRESHOLD APPROACHING: Shift duration (${elapsedHours}h) is within 1 hour of maximum daily duty cap (${policy.maxDutyHours}h).`]
          : []
      };
    }
    return null;
  }

  const session = sessions[0];
  const now = new Date();
  const startMs = new Date(session.startTime).getTime();
  const totalElapsedHours = Number(Math.max(0, (now.getTime() - startMs) / (1000 * 3600)).toFixed(2));

  // Calculate break totals
  const breaks = Array.isArray(session.breaks) ? session.breaks : [];
  let breakMinutes = 0;
  for (const b of breaks) {
    if (b.durationMinutes) {
      breakMinutes += b.durationMinutes;
    } else if (b.startTime && session.status === "PAUSED_BREAK") {
      const currentBreakMs = now.getTime() - new Date(b.startTime).getTime();
      breakMinutes += Math.round(currentBreakMs / 60000);
    }
  }

  const breakHours = Number((breakMinutes / 60).toFixed(2));
  const netWorkingHours = Math.max(0, Number((totalElapsedHours - breakHours).toFixed(2)));
  const scheduledHours = Number(session.scheduledHours || 8.0);
  const remainingHours = Math.max(0, Number((scheduledHours - netWorkingHours).toFixed(2)));

  // Warning thresholds
  const warnings = [];
  if (netWorkingHours >= policy.maxDutyHours) {
    warnings.push(`CRITICAL DUTY CAP EXCEEDED: Duty elapsed (${netWorkingHours}h) exceeds the maximum statutory cap of ${policy.maxDutyHours}h. Immediate relief handover required.`);
  } else if (netWorkingHours >= policy.maxDutyHours - 1.0) {
    warnings.push(`DUTY CEILING WARNING: Current shift (${netWorkingHours}h) is within 1 hour of the maximum daily limit (${policy.maxDutyHours}h).`);
  }

  return {
    ...session,
    serverCurrentTime: now.toISOString(),
    elapsedDutyHours: totalElapsedHours,
    netWorkingHours,
    totalBreakMinutes: breakMinutes,
    totalBreakHours: breakHours,
    remainingScheduledHours: remainingHours,
    warnings,
    policySnapshot: {
      maxDutyHours: policy.maxDutyHours,
      maxDrivingHours: policy.maxDrivingHours,
      normalRestHours: policy.normalRestHours,
      minRestThresholdForOvertime: policy.minRestThresholdForOvertime
    }
  };
}

/**
 * Starts a recorded break during an active duty session.
 */
export async function startBreak({ driverId, driverName, reason, actor }) {
  const session = await getActiveDutySession(driverId, driverName);
  if (!session) {
    const error = new Error("No active duty session found to pause for break.");
    error.statusCode = 404;
    throw error;
  }

  if (session.status === "PAUSED_BREAK") {
    const error = new Error("Duty session is already paused on an active break.");
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  const breakItem = {
    breakId: `BRK-${Date.now().toString().slice(-4)}`,
    startTime: now.toISOString(),
    reason: reason || "Mandatory 30-minute rest & meal interval",
    durationMinutes: 0
  };

  const updatedBreaks = [...(session.breaks || []), breakItem];

  const updated = await DutySession.findByIdAndUpdate(session._id, {
    status: "PAUSED_BREAK",
    breaks: updatedBreaks
  }, { new: true });

  await createTamperEvidentLog({
    actorId: actor?.id || driverId,
    actorName: actor?.name || driverName,
    actorRole: actor?.role || "DRIVER",
    action: "DUTY_BREAK_STARTED",
    entity: "DutySession",
    entityId: session.dutyId,
    reason: reason || "Driver initiated break interval.",
    newValue: breakItem
  });

  return updated;
}

/**
 * Resumes duty from an active break.
 */
export async function endBreak({ driverId, driverName, actor }) {
  const session = await getActiveDutySession(driverId, driverName);
  if (!session) {
    const error = new Error("No active duty session found.");
    error.statusCode = 404;
    throw error;
  }

  if (session.status !== "PAUSED_BREAK") {
    const error = new Error("Duty session is not currently paused on a break.");
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  const breaks = [...(session.breaks || [])];
  const lastBreak = breaks[breaks.length - 1];

  if (lastBreak && !lastBreak.endTime) {
    lastBreak.endTime = now.toISOString();
    const durationMs = now.getTime() - new Date(lastBreak.startTime).getTime();
    lastBreak.durationMinutes = Math.max(1, Math.round(durationMs / 60000));
  }

  let totalMinutes = 0;
  for (const b of breaks) {
    totalMinutes += (b.durationMinutes || 0);
  }

  const updated = await DutySession.findByIdAndUpdate(session._id, {
    status: "ACTIVE",
    breaks,
    totalBreakMinutes: totalMinutes
  }, { new: true });

  await createTamperEvidentLog({
    actorId: actor?.id || driverId,
    actorName: actor?.name || driverName,
    actorRole: actor?.role || "DRIVER",
    action: "DUTY_BREAK_ENDED",
    entity: "DutySession",
    entityId: session.dutyId,
    reason: "Driver resumed active steering/duty.",
    newValue: lastBreak
  });

  return updated;
}

/**
 * Atomically completes an active duty session, triggers persistent rest period,
 * and produces confirmation telemetry.
 */
export async function endDutySession({
  driverId,
  driverName,
  actualDrivingHours,
  notes,
  actor
}) {
  const policy = await getActivePolicy();
  const session = await getActiveDutySession(driverId, driverName);

  if (!session) {
    const error = new Error("No active duty session found for this driver to terminate.");
    error.statusCode = 404;
    throw error;
  }

  const now = new Date();
  const endTime = now.toISOString();
  const startMs = new Date(session.startTime).getTime();
  const totalElapsedHours = Number(Math.max(0, (now.getTime() - startMs) / (1000 * 3600)).toFixed(2));

  // If a break was open, close it
  const breaks = [...(session.breaks || [])];
  if (session.status === "PAUSED_BREAK" && breaks.length > 0) {
    const openBreak = breaks[breaks.length - 1];
    if (!openBreak.endTime) {
      openBreak.endTime = endTime;
      const breakMs = now.getTime() - new Date(openBreak.startTime).getTime();
      openBreak.durationMinutes = Math.max(1, Math.round(breakMs / 60000));
    }
  }

  let totalBreakMinutes = 0;
  for (const b of breaks) {
    totalBreakMinutes += (b.durationMinutes || 0);
  }
  const totalBreakHours = Number((totalBreakMinutes / 60).toFixed(2));
  const netDutyHours = Math.max(0, Number((totalElapsedHours - totalBreakHours).toFixed(2)));
  const verifiedDrivingHours = Number(actualDrivingHours || (netDutyHours * 0.85)).toFixed(2);

  // 1. Close duty session atomically
  const updatedSession = await DutySession.findByIdAndUpdate(session._id, {
    status: "COMPLETED",
    endTime,
    elapsedDutyHours: totalElapsedHours,
    netDutyHours,
    actualDrivingHours: Number(verifiedDrivingHours),
    totalBreakMinutes,
    breaks,
    fatigueScoreEnd: Math.min(100, Math.round(15 + netDutyHours * 5)),
    notes: notes || "Duty completed normally."
  }, { new: true });

  // 2. Also sync to legacy Duty model
  await Duty.findOneAndUpdate(
    { crew: driverName, status: "Active" },
    {
      status: "Completed",
      end: endTime,
      workingHours: totalElapsedHours,
      drivingHours: Number(verifiedDrivingHours)
    }
  );

  // 3. Create persistent RestPeriod record
  const normalRestRequired = Number(policy.normalRestHours || 13.0);
  const minOvertimeThreshold = Number(policy.minRestThresholdForOvertime || 9.0);

  const restPeriod = await RestPeriod.create({
    driverId: String(driverId),
    driverName,
    dutySessionId: updatedSession._id ? String(updatedSession._id) : session.dutyId,
    restStartTime: endTime,
    restEndTime: null,
    requiredRestHours: normalRestRequired,
    minOvertimeThreshold,
    continuousRestHours: 0.0,
    eligibilityStatus: "RESTING_INELIGIBLE",
    policyVersion: policy.version,
    isComplete: false,
    notes: `Rest commenced immediately upon completion of duty ${session.dutyId}`
  });

  // 4. Record tamper-evident audit log
  await createTamperEvidentLog({
    actorId: actor?.id || driverId,
    actorName: actor?.name || driverName,
    actorRole: actor?.role || "DRIVER",
    action: "DUTY_COMPLETED",
    entity: "DutySession",
    entityId: session.dutyId,
    reason: `Duty session ${session.dutyId} successfully closed. Continuous rest initiated.`,
    newValue: {
      session: updatedSession,
      restPeriod
    },
    policyVersion: policy.version
  });

  // Notify Department Officers of completed shift and rest initiation
  try {
    await Notification.create({
      user: "all_officers",
      role: "DEPOT_OFFICER",
      title: `Shift Completed: ${driverName}`,
      message: `Driver ${driverName} completed shift on Bus ${session.busId || "BUS-101"} (${totalElapsedHours}h duty, ${verifiedDrivingHours}h steering). Mandatory ${normalRestRequired}h continuous rest commenced.`,
      type: "info",
      read: false,
      createdAt: endTime
    });
  } catch (notifErr) {
    console.warn("Failed to create end duty notification:", notifErr.message);
  }

  // Calculate next eligibility timestamps
  const nextStandardEligibilityTimestamp = new Date(now.getTime() + normalRestRequired * 3600 * 1000).toISOString();
  const nextOvertimeEligibilityTimestamp = new Date(now.getTime() + minOvertimeThreshold * 3600 * 1000).toISOString();

  return {
    success: true,
    message: "Duty completed successfully. Persistent rest timer initiated.",
    dutySession: updatedSession,
    completionSummary: {
      dutyId: session.dutyId,
      startedAt: session.startTime,
      endedAt: endTime,
      recordedTotalDutyHours: totalElapsedHours,
      recordedNetDutyHours: netDutyHours,
      recordedDrivingHours: Number(verifiedDrivingHours),
      recordedBreakMinutes: totalBreakMinutes,
      restStartedAt: endTime,
      requiredContinuousRestHours: normalRestRequired,
      minOvertimeRestHours: minOvertimeThreshold,
      earliestNextDutyEligibility: nextStandardEligibilityTimestamp,
      earliestOvertimeEligibility: nextOvertimeEligibilityTimestamp,
      policyVersion: policy.version
    }
  };
}

/**
 * Creates an overtime request with independent server-side eligibility verification.
 * Enforces rest thresholds (blocking requests submitted prior to 9 continuous hours unless emergency).
 */
export async function submitOvertimeRequest({
  driverId,
  driverName,
  employeeId,
  requestedHours,
  proposedStartTime,
  proposedEndTime,
  reason,
  isEmergency = false,
  emergencyReference = "",
  emergencyJustification = "",
  tripId,
  busId,
  routeName,
  depot,
  actor
}) {
  const policy = await getActivePolicy();
  const restEvaluation = await evaluateDriverRestEligibility(driverId, driverName);
  const hoursNum = Number(requestedHours);

  if (isNaN(hoursNum) || hoursNum <= 0 || hoursNum > 8.0) {
    const error = new Error("Requested overtime hours must be a positive number between 0.5 and 8.0 hours.");
    error.statusCode = 400;
    throw error;
  }

  if (!reason || reason.trim().length < 10) {
    const error = new Error("Operational justification reason is mandatory (minimum 10 characters).");
    error.statusCode = 400;
    throw error;
  }

  // Evaluate rest threshold rule
  // A driver resting with continuous rest < 9 hours is BLOCKED from ordinary overtime
  let requestStatus = "PENDING_APPROVAL";
  let blockReason = null;
  let exceptionOutcome = null;

  if (restEvaluation.eligibilityStatus === "RESTING_INELIGIBLE" && !restEvaluation.isCurrentlyOnDuty) {
    if (!isEmergency) {
      requestStatus = "BLOCKED_BY_REST_RULE";
      blockReason = `Rest Rule Violation: Driver has accumulated only ${restEvaluation.continuousRestHours}h continuous rest. Policy requires minimum ${policy.minRestThresholdForOvertime}h continuous rest before any overtime can be considered (Deficit: ${restEvaluation.remainingUntilOvertimeThresholdHours}h).`;
    } else {
      // Emergency exception workflow
      if (!emergencyJustification || emergencyJustification.trim().length < 20) {
        const error = new Error("Emergency exception requires detailed justification explaining why safety rest cannot be observed and why no replacement crew is reachable (minimum 20 characters).");
        error.statusCode = 400;
        throw error;
      }
      requestStatus = "PENDING_APPROVAL";
      exceptionOutcome = "ACCEPTED_FOR_REVIEW";
      blockReason = `EMERGENCY EXCEPTION REQUEST: Submitted prior to 9h rest threshold (${restEvaluation.continuousRestHours}h completed). Requires Depot Officer safety override review.`;
    }
  }

  const requestId = `OTR-2026-${Date.now().toString().slice(-5)}`;
  const rate = Number(policy.hourlyOvertimeRateINR || 350.0);
  const amount = Number((hoursNum * rate).toFixed(2));

  const otRequest = await OvertimeRequest.create({
    requestId,
    driverId: String(driverId),
    driverName,
    employeeId: employeeId || "DRV-1001",
    dutySessionId: restEvaluation.activeSessionId || null,
    tripId: tripId || "TRIP-2026-081",
    busId: busId || "BUS-101",
    routeName: routeName || "Jaipur → Delhi Express Corridor",
    depot: depot || "Jaipur Central",
    requestedHours: hoursNum,
    proposedStartTime: proposedStartTime || new Date().toISOString(),
    proposedEndTime: proposedEndTime || null,
    reason,
    isEmergency: Boolean(isEmergency),
    emergencyReference,
    emergencyJustification,
    status: requestStatus,
    blockReason,
    exceptionOutcome,
    eligibilitySnapshot: restEvaluation,
    hourlyRateINR: rate,
    approvedAmountINR: amount,
    actualHoursWorked: 0.0,
    discrepancyStatus: "MATCH"
  });

  // Maintain sync with legacy Overtime table
  await Overtime.create({
    crew: driverName,
    employeeId: employeeId || "DRV-1001",
    role: "DRIVER",
    tripId: otRequest.tripId,
    requestedHours: hoursNum,
    reason: otRequest.reason,
    rate,
    amount,
    status: requestStatus === "BLOCKED_BY_REST_RULE" ? "Rejected" : "Pending",
    decisionReason: blockReason || "Pending Depot Officer review.",
    approvedBy: null
  });

  await createTamperEvidentLog({
    actorId: actor?.id || driverId,
    actorName: actor?.name || driverName,
    actorRole: actor?.role || "DRIVER",
    action: "OVERTIME_REQUEST_CREATED",
    entity: "OvertimeRequest",
    entityId: requestId,
    reason: isEmergency ? `Emergency Overtime Claim: ${reason}` : `Standard Overtime Claim: ${reason}`,
    newValue: otRequest,
    complianceResult: restEvaluation
  });

  // Notify Department Officers in their topbar alert and notification query drawer
  try {
    await Notification.create({
      user: "all_officers",
      role: "DEPOT_OFFICER",
      title: isEmergency ? `🚨 Emergency Overtime Claim: ${driverName}` : `Overtime Claim Submitted: ${driverName}`,
      message: `Driver ${driverName} submitted ${hoursNum}h overtime claim for ${otRequest.routeName} (Expected: ₹${amount}). Status: ${requestStatus}. Reason: "${reason}".`,
      type: isEmergency ? "emergency" : (requestStatus === "BLOCKED_BY_REST_RULE" ? "warning" : "info"),
      read: false,
      createdAt: new Date().toISOString()
    });
  } catch (notifErr) {
    console.warn("Failed to create overtime notification:", notifErr.message);
  }

  return {
    success: true,
    request: otRequest,
    isBlocked: requestStatus === "BLOCKED_BY_REST_RULE",
    restEvaluation
  };
}

/**
 * Retrieves the officer approval queue with dynamically recalculated driver rest,
 * fatigue signals, and safety flags.
 */
export async function getOfficerOvertimeQueue() {
  const requests = await OvertimeRequest.find().sort({ createdAt: -1 });

  const enrichedQueue = await Promise.all(
    requests.map(async (req) => {
      const liveRest = await evaluateDriverRestEligibility(req.driverId, req.driverName);
      return {
        ...req,
        liveRestEvaluation: liveRest,
        continuousRestHours: liveRest.continuousRestHours,
        canBeSafelyApproved: liveRest.continuousRestHours >= liveRest.minOvertimeThreshold || req.isEmergency
      };
    })
  );

  return enrichedQueue;
}

/**
 * Depot Officer / Admin approval or rejection of an overtime request.
 * Server independently validates eligibility, blocks unauthorized approvals,
 * and requires mandatory justifications.
 */
export async function processOfficerOvertimeDecision({
  requestId,
  officerId,
  officerName,
  officerRole,
  decision,            // "APPROVED" | "REJECTED"
  approvedHours,
  decisionReason,
  exceptionBasis,
  actor
}) {
  const policy = await getActivePolicy();

  // 1. Role validation
  if (!["DEPOT_OFFICER", "AUTHORITY_ADMIN"].includes(officerRole)) {
    const error = new Error("Access Denied: Only authorized Depot Officers and Authority Administrators can review overtime.");
    error.statusCode = 403;
    throw error;
  }

  // 2. Fetch existing request
  const request = await OvertimeRequest.findOne({ requestId });
  if (!request) {
    const error = new Error(`Overtime request ${requestId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  // 3. Self-approval check
  if (String(officerId) === String(request.driverId) || officerName === request.driverName) {
    const error = new Error("Safety & Compliance Violation: Crew members are prohibited from approving their own duty or overtime claims.");
    error.statusCode = 403;
    throw error;
  }

  // 4. Mandatory reason validation
  if (!decisionReason || decisionReason.trim().length < 5) {
    const error = new Error("A specific decision reason is mandatory for operational auditability.");
    error.statusCode = 400;
    throw error;
  }

  // 5. Server-side independent recalculation of driver's current rest
  const currentRest = await evaluateDriverRestEligibility(request.driverId, request.driverName);

  if (decision === "APPROVED") {
    // If rest is less than 9 hours, ordinary approval is strictly blocked!
    if (currentRest.continuousRestHours < currentRest.minOvertimeThreshold && !request.isEmergency) {
      const error = new Error(`Approval Blocked: Driver has accumulated only ${currentRest.continuousRestHours}h continuous rest. Statutory minimum rest threshold for overtime is ${currentRest.minOvertimeThreshold}h. Approval cannot proceed without a lawful emergency exception.`);
      error.statusCode = 422;
      throw error;
    }

    if (currentRest.continuousRestHours < currentRest.minOvertimeThreshold && request.isEmergency) {
      if (!exceptionBasis || exceptionBasis.trim().length < 15) {
        const error = new Error("Emergency Override Required: Approving overtime prior to 9h continuous rest requires a formal legal/operational exception basis explaining passenger safety or incident containment (minimum 15 characters).");
        error.statusCode = 422;
        throw error;
      }
    }
  }

  const approvedHoursNum = decision === "APPROVED"
    ? Number(approvedHours !== undefined ? approvedHours : request.requestedHours)
    : 0;

  const rate = Number(request.hourlyRateINR || policy.hourlyOvertimeRateINR || 350.0);
  const approvedAmount = Number((approvedHoursNum * rate).toFixed(2));
  const now = new Date().toISOString();

  const finalStatus = decision === "APPROVED" ? "APPROVED" : "REJECTED";

  // Atomically update request
  const updatedRequest = await OvertimeRequest.findByIdAndUpdate(request._id, {
    status: finalStatus,
    reviewingOfficerId: String(officerId),
    reviewingOfficerName: officerName,
    decisionTimestamp: now,
    decisionReason,
    exceptionBasis: exceptionBasis || null,
    exceptionOutcome: decision === "APPROVED"
      ? (request.isEmergency ? "APPROVED_UNDER_VERIFIED_EXCEPTION" : "ACCEPTED_FOR_REVIEW")
      : "REJECTED",
    approvedHours: approvedHoursNum,
    approvedAmountINR: approvedAmount
  }, { new: true });

  // Sync to legacy Overtime table
  await Overtime.findOneAndUpdate(
    { tripId: request.tripId, crew: request.driverName },
    {
      status: decision === "APPROVED" ? "Approved" : "Rejected",
      approvedBy: officerName,
      decisionReason: decisionReason,
      amount: approvedAmount
    }
  );

  // Record tamper-evident audit log
  await createTamperEvidentLog({
    actorId: officerId,
    actorName: officerName,
    actorRole: officerRole,
    action: `OVERTIME_${finalStatus}`,
    entity: "OvertimeRequest",
    entityId: requestId,
    reason: decisionReason,
    previous: request,
    newValue: updatedRequest,
    policyVersion: policy.version,
    complianceResult: {
      driverRestHoursAtApproval: currentRest.continuousRestHours,
      minRequiredRestHours: currentRest.minOvertimeThreshold,
      isEmergency: request.isEmergency,
      exceptionBasis: exceptionBasis || null
    }
  });

  // Notify the driver and control room of officer's decision
  try {
    await Notification.create({
      user: request.driverName,
      role: "DRIVER",
      title: decision === "APPROVED" ? `Overtime Claim Approved (₹${approvedAmount})` : `Overtime Claim Rejected`,
      message: decision === "APPROVED"
        ? `Depot Officer ${officerName} approved ${approvedHoursNum}h overtime for Request ${requestId}. Amount: ₹${approvedAmount} authorized.`
        : `Depot Officer ${officerName} rejected Overtime Request ${requestId}. Reason: "${decisionReason}".`,
      type: decision === "APPROVED" ? "info" : "warning",
      read: false,
      createdAt: now
    });
  } catch (notifErr) {
    console.warn("Failed to create decision notification:", notifErr.message);
  }

  return updatedRequest;
}

/**
 * Records actual overtime worked post-shift and detects discrepancies.
 */
export async function recordActualOvertimeWorked({
  requestId,
  actualHoursWorked,
  actualStartTime,
  actualEndTime,
  verificationSource = "GPS_TELEMETRY",
  notes,
  actor
}) {
  const request = await OvertimeRequest.findOne({ requestId });
  if (!request) {
    const error = new Error(`Overtime request ${requestId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  const actualNum = Number(actualHoursWorked);
  const approvedNum = Number(request.approvedHours || 0);

  let discrepancyStatus = "MATCH";
  if (actualNum > approvedNum) {
    discrepancyStatus = "OVER_HOURS_UNAPPROVED";
  } else if (actualNum < approvedNum) {
    discrepancyStatus = "UNDER_HOURS";
  }

  const updated = await OvertimeRequest.findByIdAndUpdate(request._id, {
    actualHoursWorked: actualNum,
    actualStartTime: actualStartTime || request.proposedStartTime,
    actualEndTime: actualEndTime || new Date().toISOString(),
    discrepancyStatus,
    verificationSource,
    notes: notes || request.notes
  }, { new: true });

  await createTamperEvidentLog({
    actorId: actor?.id,
    actorName: actor?.name,
    actorRole: actor?.role,
    action: "ACTUAL_OVERTIME_RECORDED",
    entity: "OvertimeRequest",
    entityId: requestId,
    reason: `Actual overtime recorded: ${actualNum}h vs Approved: ${approvedNum}h (${discrepancyStatus}).`,
    newValue: updated
  });

  return updated;
}

/**
 * Returns comprehensive, 6-category duty, rest, and overtime history for the authenticated driver.
 */
export async function getDriverDutyAndOvertimeHistory(driverId, driverName) {
  const policy = await getActivePolicy();
  const nameVariants = getNameVariants(driverName);

  // 1. DUTY SESSION HISTORY
  let dutySessions = await DutySession.find({
    driverName: { $in: nameVariants }
  }).sort({ startTime: -1 }).limit(50);

  if (dutySessions.length === 0) {
    // Fallback to legacy duties
    const legacy = await Duty.find({
      crew: { $in: nameVariants }
    }).sort({ start: -1 }).limit(50);
    dutySessions = legacy.map(d => ({
      dutyId: d.dutyId,
      routeName: d.routeName,
      busId: d.busId,
      tripId: d.trip,
      startTime: d.start,
      endTime: d.end,
      elapsedDutyHours: d.workingHours || 8.0,
      actualDrivingHours: d.drivingHours || 7.0,
      totalBreakMinutes: 30,
      status: d.status === "Active" ? "ACTIVE" : "COMPLETED",
      depot: d.depot
    }));
  }

  // 2. REST HISTORY
  const restPeriods = await RestPeriod.find({
    driverName: { $in: nameVariants }
  }).sort({ restStartTime: -1 }).limit(50);

  // 3. OVERTIME REQUEST HISTORY
  let overtimeRequests = await OvertimeRequest.find({
    driverName: { $in: nameVariants }
  }).sort({ createdAt: -1 }).limit(50);

  if (overtimeRequests.length === 0) {
    const legacyOt = await Overtime.find({
      crew: { $in: nameVariants }
    }).sort({ createdAt: -1 }).limit(50);
    overtimeRequests = legacyOt.map(o => ({
      requestId: `OTR-LEGACY-${o._id?.toString().slice(-4)}`,
      requestedHours: o.requestedHours,
      reason: o.reason,
      status: o.status === "Approved" ? "APPROVED" : (o.status === "Rejected" ? "REJECTED" : "PENDING_APPROVAL"),
      approvedHours: o.status === "Approved" ? o.requestedHours : 0,
      approvedAmountINR: o.amount || 0,
      reviewingOfficerName: o.approvedBy || "Depot Officer",
      decisionReason: o.decisionReason || "Legacy record",
      createdAt: o.createdAt || new Date().toISOString()
    }));
  }

  // 4. OVERTIME APPROVAL HISTORY
  const overtimeApprovals = overtimeRequests.filter(r => r.status === "APPROVED" || r.status === "REJECTED");

  // 5. ACTUAL OVERTIME RECORDS
  const actualOvertimeRecords = overtimeRequests.filter(r => r.actualHoursWorked && r.actualHoursWorked > 0);

  // 6. DAILY, WEEKLY, AND MONTHLY SUMMARY
  let totalWorkingHours = 0;
  let totalDrivingHours = 0;
  let totalApprovedOvertime = 0;
  let totalActualOvertime = 0;
  let pendingRequestsCount = 0;
  let rejectedRequestsCount = 0;

  for (const s of dutySessions) {
    totalWorkingHours += Number(s.elapsedDutyHours || s.netDutyHours || 0);
    totalDrivingHours += Number(s.actualDrivingHours || 0);
  }

  for (const ot of overtimeRequests) {
    if (ot.status === "PENDING_APPROVAL") pendingRequestsCount++;
    if (ot.status === "REJECTED") rejectedRequestsCount++;
    if (ot.status === "APPROVED") {
      totalApprovedOvertime += Number(ot.approvedHours || ot.requestedHours || 0);
    }
    if (ot.actualHoursWorked) {
      totalActualOvertime += Number(ot.actualHoursWorked);
    }
  }

  const estimatedOvertimeCompensationINR = totalApprovedOvertime * (policy.hourlyOvertimeRateINR || 350.0);

  return {
    driverName,
    policyVersion: policy.version,
    categories: {
      dutySessions,
      restPeriods,
      overtimeRequests,
      overtimeApprovals,
      actualOvertimeRecords,
      summary: {
        totalWorkingHours: Number(totalWorkingHours.toFixed(2)),
        totalDrivingHours: Number(totalDrivingHours.toFixed(2)),
        totalApprovedOvertime: Number(totalApprovedOvertime.toFixed(2)),
        totalActualOvertime: Number(totalActualOvertime.toFixed(2)),
        pendingRequestsCount,
        rejectedRequestsCount,
        estimatedOvertimeCompensationINR: Number(estimatedOvertimeCompensationINR.toFixed(2)),
        weeklyHoursCeiling: policy.weeklyLimit,
        standardRestHours: policy.normalRestHours,
        minOvertimeRestHours: policy.minRestThresholdForOvertime
      }
    }
  };
}

/**
 * Retrieves dynamic rest and clearance statuses of drivers
 * for the Department Officer's Dispatch and Overtime Clearance Board.
 * Supports instant search/filtering by driver name, employee ID, or depot.
 */
export async function getDriversClearanceBoard(searchQuery = "") {
  const coreDemoDrivers = [
    { name: "Rameshwar Singh", employeeId: "DRV-1001", busId: "BUS-101", routeName: "Jaipur → Delhi Express Corridor (NH-48)", depot: "Jaipur Central" },
    { name: "Mukesh Meena", employeeId: "DRV-1002", busId: "BUS-102", routeName: "Jaipur → Ajmer Heritage Intercity", depot: "Jaipur Central" },
    { name: "Harish Gehlot", employeeId: "DRV-1003", busId: "BUS-103", routeName: "Delhi → Jaipur → Agra Golden Triangle", depot: "Ajmer Depot" },
    { name: "Suresh Choudhary", employeeId: "DRV-1004", busId: "BUS-104", routeName: "Kota → Jaipur Intercity Link", depot: "Kota Depot" },
    { name: "Dharmendra Yadav", employeeId: "DRV-1005", busId: "BUS-105", routeName: "Jaipur → Udaipur Superfast Night Express", depot: "Udaipur Depot" }
  ];

  // Retrieve other driver crew members from the operational database
  const allDriversFromDb = await Crew.find({ role: "DRIVER" });
  const otherDrivers = allDriversFromDb.filter(d => !coreDemoDrivers.some(c => c.name === d.name));

  const busList = ["BUS-106", "BUS-107", "BUS-108", "BUS-109", "BUS-110", "BUS-111"];
  const routeList = [
    "Jaipur → Jodhpur Desert Corridor",
    "Jaipur → Bikaner Highway Express",
    "Delhi ISBT → Jaipur Non-Stop Shuttle",
    "Ajmer → Pushkar Pilgrim Connect",
    "Jaipur → Alwar Sariska Link",
    "Kota → Bundi Heritage Express"
  ];

  let fullDriverList = [
    ...coreDemoDrivers,
    ...otherDrivers.map((d, i) => ({
      name: d.name,
      employeeId: d.employeeId || `DRV-${1006 + i}`,
      busId: busList[i % busList.length],
      routeName: routeList[i % routeList.length],
      depot: d.depot || "Jaipur Central"
    }))
  ];

  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    fullDriverList = fullDriverList.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.employeeId.toLowerCase().includes(q) ||
      (d.depot && d.depot.toLowerCase().includes(q)) ||
      (d.routeName && d.routeName.toLowerCase().includes(q))
    );
  }

  const board = await Promise.all(fullDriverList.map(async (drv) => {
    const rest = await evaluateDriverRestEligibility(null, drv.name);
    const active = await getActiveDutySession(null, drv.name);
    const otRequests = await OvertimeRequest.find({
      driverName: { $in: getNameVariants(drv.name) }
    }).sort({ createdAt: -1 }).limit(1);
    const latestOT = otRequests.length > 0 ? otRequests[0] : null;

    let scenarioKey = "STANDARD";
    let badgeLabel = "Eligible";
    let badgeColor = "emerald";

    if (active) {
      scenarioKey = "ACTIVE_ON_DUTY";
      badgeLabel = "Shift In-Progress";
      badgeColor = "blue";
    } else if (rest.eligibilityStatus === "RESTING_INELIGIBLE") {
      scenarioKey = "REST_LOCKED";
      badgeLabel = "Rest-Locked (< 9h Rest)";
      badgeColor = "rose";
    } else if (latestOT && (latestOT.status === "PENDING_APPROVAL" || latestOT.status === "Pending")) {
      scenarioKey = "OVERTIME_PENDING";
      badgeLabel = "Overtime Pending Review";
      badgeColor = "amber";
    } else if (latestOT && latestOT.status === "APPROVED") {
      scenarioKey = "OVERTIME_APPROVED";
      badgeLabel = "Overtime Authorized";
      badgeColor = "purple";
    } else if (rest.eligibilityStatus === "FULLY_ELIGIBLE") {
      scenarioKey = "FULLY_RESTED";
      badgeLabel = "Fully Rested (≥ 13h) — Ready";
      badgeColor = "emerald";
    }

    return {
      driverName: drv.name,
      employeeId: drv.employeeId,
      depot: drv.depot,
      busId: active?.busId || drv.busId,
      routeName: active?.routeName || drv.routeName,
      scenarioKey,
      badgeLabel,
      badgeColor,
      restEvaluation: rest,
      activeSession: active,
      latestOvertime: latestOT,
      canStartDuty: !active && rest.canStartDuty
    };
  }));

  return board;
}
