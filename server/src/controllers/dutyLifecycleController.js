import {
  evaluateDriverRestEligibility,
  startDutySession,
  getActiveDutySession,
  startBreak,
  endBreak,
  endDutySession,
  submitOvertimeRequest,
  getOfficerOvertimeQueue,
  processOfficerOvertimeDecision,
  recordActualOvertimeWorked,
  getDriverDutyAndOvertimeHistory,
  getDriversClearanceBoard
} from "../services/dutyLifecycleService.js";

export async function handleGetRestEligibility(req, res) {
  const driverId = req.query.driverId || req.user.id;
  const driverName = req.query.driverName || req.user.name;
  const evaluation = await evaluateDriverRestEligibility(driverId, driverName);
  res.json(evaluation);
}

export async function handleStartDuty(req, res) {
  const driverId = req.body.driverId || req.user.id;
  const driverName = req.body.driverName || req.user.name;

  const session = await startDutySession({
    driverId,
    driverName,
    employeeId: req.body.employeeId,
    busId: req.body.busId,
    routeId: req.body.routeId,
    routeName: req.body.routeName,
    tripId: req.body.tripId,
    depot: req.user.depot || req.body.depot,
    scheduledHours: req.body.scheduledHours || 8.0,
    actor: req.user
  });

  res.status(201).json(session);
}

export async function handleGetActiveDuty(req, res) {
  const driverId = req.query.driverId || req.user.id;
  const driverName = req.query.driverName || req.user.name;
  const session = await getActiveDutySession(driverId, driverName);
  res.json(session);
}

export async function handleStartBreak(req, res) {
  const driverId = req.body.driverId || req.user.id;
  const driverName = req.body.driverName || req.user.name;
  const updated = await startBreak({
    driverId,
    driverName,
    reason: req.body.reason,
    actor: req.user
  });
  res.json(updated);
}

export async function handleEndBreak(req, res) {
  const driverId = req.body.driverId || req.user.id;
  const driverName = req.body.driverName || req.user.name;
  const updated = await endBreak({
    driverId,
    driverName,
    actor: req.user
  });
  res.json(updated);
}

export async function handleEndDuty(req, res) {
  const driverId = req.body.driverId || req.user.id;
  const driverName = req.body.driverName || req.user.name;

  const result = await endDutySession({
    driverId,
    driverName,
    actualDrivingHours: req.body.actualDrivingHours,
    notes: req.body.notes,
    actor: req.user
  });

  res.json(result);
}

export async function handleSubmitOvertime(req, res) {
  const driverId = req.body.driverId || req.user.id;
  const driverName = req.body.driverName || req.user.name;

  const result = await submitOvertimeRequest({
    driverId,
    driverName,
    employeeId: req.body.employeeId,
    requestedHours: req.body.requestedHours,
    proposedStartTime: req.body.proposedStartTime,
    proposedEndTime: req.body.proposedEndTime,
    reason: req.body.reason,
    isEmergency: req.body.isEmergency,
    emergencyReference: req.body.emergencyReference,
    emergencyJustification: req.body.emergencyJustification,
    tripId: req.body.tripId,
    busId: req.body.busId,
    routeName: req.body.routeName,
    depot: req.user.depot,
    actor: req.user
  });

  res.status(201).json(result);
}

export async function handleGetOfficerOvertimeQueue(req, res) {
  const queue = await getOfficerOvertimeQueue();
  res.json(queue);
}

export async function handleOfficerOvertimeDecision(req, res) {
  const officerId = req.user.id;
  const officerName = req.user.name;
  const officerRole = req.user.role;

  const {
    requestId,
    decision,
    approvedHours,
    decisionReason,
    exceptionBasis
  } = req.body;

  const updated = await processOfficerOvertimeDecision({
    requestId,
    officerId,
    officerName,
    officerRole,
    decision,
    approvedHours,
    decisionReason,
    exceptionBasis,
    actor: req.user
  });

  res.json(updated);
}

export async function handleRecordActualOvertime(req, res) {
  const {
    requestId,
    actualHoursWorked,
    actualStartTime,
    actualEndTime,
    verificationSource,
    notes
  } = req.body;

  const updated = await recordActualOvertimeWorked({
    requestId,
    actualHoursWorked,
    actualStartTime,
    actualEndTime,
    verificationSource,
    notes,
    actor: req.user
  });

  res.json(updated);
}

export async function handleGetDriverDutyHistory(req, res) {
  const driverId = req.query.driverId || req.user.id;
  const driverName = req.query.driverName || req.user.name;

  // Authorization check: only driver themselves or officer/admin can view
  if (req.user.role === "DRIVER" && req.user.name !== driverName && req.user.id !== driverId) {
    return res.status(403).json({ message: "You can only view your own duty records." });
  }

  const history = await getDriverDutyAndOvertimeHistory(driverId, driverName);
  res.json(history);
}

export async function handleGetDriversClearanceBoard(req, res) {
  const board = await getDriversClearanceBoard(req.query.search);
  res.json(board);
}
