import { Router } from "express";
import { requireAuth, allowRoles } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getAnalytics } from "../controllers/analyticsController.js";
import {
  Crew, Bus, Route, Trip, Duty, Overtime, Leave,
  Emergency, Collection, Checklist, Handover,
  AuditLog, Notification, Policy, DutySession, RestPeriod,
  OvertimeRequest, DriverWorkRecord
} from "../models/index.js";
import { evaluateDuty, segmentRoute, rankCrewForDuty } from "../services/safety.js";
import {
  handleGetRestEligibility,
  handleStartDuty,
  handleGetActiveDuty,
  handleStartBreak,
  handleEndBreak,
  handleEndDuty,
  handleSubmitOvertime,
  handleGetOfficerOvertimeQueue,
  handleOfficerOvertimeDecision,
  handleRecordActualOvertime,
  handleGetDriverDutyHistory,
  handleGetDriversClearanceBoard
} from "../controllers/dutyLifecycleController.js";

const router = Router();
router.use(requireAuth);

// Helper for standard CRUD registration
function registerCrud(path, Model, entityName) {
  router.get(`/${path}`, asyncHandler(async (req, res) => {
    const records = await Model.find().sort({ createdAt: -1 }).limit(250);
    res.json(records);
  }));

  router.post(`/${path}`, asyncHandler(async (req, res) => {
    const record = await Model.create({
      ...req.body,
      createdBy: req.user?.name || "System"
    });

    // Automatically create audit log
    await AuditLog.create({
      user: req.user.name,
      role: req.user.role,
      action: `${entityName.toUpperCase()}_CREATED`,
      entity: entityName,
      entityId: record._id ? record._id.toString() : "new",
      reason: req.body.reason || `New ${entityName} entry created.`,
      newValue: record,
      timestamp: new Date().toISOString()
    });

    res.status(201).json(record);
  }));

  router.patch(`/${path}/:id`, asyncHandler(async (req, res) => {
    const existing = await Model.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Record not found." });

    const record = await Model.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    await AuditLog.create({
      user: req.user.name,
      role: req.user.role,
      action: `${entityName.toUpperCase()}_UPDATED`,
      entity: entityName,
      entityId: req.params.id,
      reason: req.body.decisionReason || req.body.overrideReason || req.body.reason || `Updated ${entityName} state.`,
      previous: existing,
      newValue: record,
      timestamp: new Date().toISOString()
    });

    res.json(record);
  }));

  router.delete(`/${path}/:id`, asyncHandler(async (req, res) => {
    const existing = await Model.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Record not found." });

    await Model.deleteMany({ _id: req.params.id });

    await AuditLog.create({
      user: req.user.name,
      role: req.user.role,
      action: `${entityName.toUpperCase()}_DELETED`,
      entity: entityName,
      entityId: req.params.id,
      reason: "Manual deletion by authorized user",
      previous: existing,
      timestamp: new Date().toISOString()
    });

    res.json({ message: "Record deleted successfully." });
  }));
}

registerCrud("crew", Crew, "Crew");
registerCrud("buses", Bus, "Bus");
registerCrud("routes", Route, "Route");
registerCrud("trips", Trip, "Trip");
registerCrud("duties", Duty, "Duty");
registerCrud("overtime", Overtime, "Overtime");
registerCrud("leaves", Leave, "Leave");
registerCrud("emergencies", Emergency, "Emergency");
registerCrud("collections", Collection, "Collection");
registerCrud("checklists", Checklist, "Checklist");
registerCrud("handovers", Handover, "Handover");
registerCrud("notifications", Notification, "Notification");
registerCrud("duty-sessions", DutySession, "DutySession");
registerCrud("rest-periods", RestPeriod, "RestPeriod");
registerCrud("overtime-requests", OvertimeRequest, "OvertimeRequest");
registerCrud("driver-work-records", DriverWorkRecord, "DriverWorkRecord");

router.get("/analytics", asyncHandler(getAnalytics));

// Audit Logs
router.get("/audit-logs", asyncHandler(async (req, res) => {
  res.json(await AuditLog.find().sort({ createdAt: -1 }).limit(250));
}));

router.post("/audit-logs", asyncHandler(async (req, res) => {
  const log = await AuditLog.create({
    ...req.body,
    user: req.user.name,
    role: req.user.role,
    timestamp: new Date().toISOString()
  });
  res.status(201).json(log);
}));

// Policy Management
router.get("/policies", asyncHandler(async (req, res) => {
  let policy = await Policy.findOne();
  if (!policy) {
    policy = await Policy.create({
      maxDutyHours: 10,
      maxDrivingHours: 8,
      minRestHours: 10,
      weeklyLimit: 48,
      overtimeThreshold: 8,
      maxConsecutiveDays: 6,
      nightShiftMultiplier: 1.25
    });
  }
  res.json(policy);
}));

router.patch(
  "/policies",
  allowRoles("AUTHORITY_ADMIN"),
  asyncHandler(async (req, res) => {
    const existing = await Policy.findOne();
    const policy = await Policy.findOneAndUpdate(
      {},
      req.body,
      { new: true, upsert: true, runValidators: true }
    );

    await AuditLog.create({
      user: req.user.name,
      role: req.user.role,
      action: "POLICY_UPDATED",
      entity: "DepartmentPolicy",
      entityId: policy._id ? policy._id.toString() : "POL-001",
      reason: req.body.reason || "Safety policy configuration revised by Authority.",
      previous: existing,
      newValue: policy,
      timestamp: new Date().toISOString()
    });

    res.json(policy);
  })
);

// Real-time Safety Check Simulation
router.post("/safety/check", asyncHandler(async (req, res) => {
  const policy = (await Policy.findOne()) || {
    maxDutyHours: 10,
    maxDrivingHours: 8,
    minRestHours: 10,
    weeklyLimit: 48,
    maxConsecutiveDays: 6,
    nightShiftMultiplier: 1.25
  };
  res.json(evaluateDuty(req.body, policy));
}));

// Smart Duty Assignment: Route Segmentation & Crew Candidate Ranking
router.post("/smart-assignment/evaluate", asyncHandler(async (req, res) => {
  const { routeId, busId, date, startTime } = req.body;

  const [route, bus, policy, allCrew] = await Promise.all([
    Route.findById(routeId),
    Bus.findById(busId),
    Policy.findOne(),
    Crew.find()
  ]);

  if (!route) return res.status(404).json({ message: "Route not found." });

  const activePolicy = policy || {
    maxDutyHours: 10,
    maxDrivingHours: 8,
    minRestHours: 10,
    weeklyLimit: 48,
    maxConsecutiveDays: 6,
    nightShiftMultiplier: 1.25
  };

  // 1. Divide route into segments if long journey
  const segments = segmentRoute(route);

  // 2. Rank Drivers and Conductors
  const drivers = allCrew.filter(c => c.role === "DRIVER");
  const conductors = allCrew.filter(c => c.role === "CONDUCTOR");

  const rankedDrivers = rankCrewForDuty(drivers, Number(route.duration || 5), activePolicy);
  const rankedConductors = rankCrewForDuty(conductors, Number(route.duration || 5), activePolicy);

  // Check Bus health
  const busHealthWarning = bus && (bus.maintenanceStatus === "Maintenance Required" || bus.status === "Maintenance")
    ? "BUS MAINTENANCE ALERT: This vehicle has an open critical defect flag and should not be dispatched without clearance."
    : null;

  res.json({
    route,
    bus,
    busHealthWarning,
    segments,
    rankedDrivers,
    rankedConductors,
    primaryRecommendedDriver: rankedDrivers.find(d => d.evaluation.eligible) || rankedDrivers[0],
    primaryRecommendedConductor: rankedConductors.find(c => c.evaluation.eligible) || rankedConductors[0]
  });
}));

// Automatic Leave Replacement Search
router.get("/leaves/:id/suggest-replacement", asyncHandler(async (req, res) => {
  const leave = await Leave.findById(req.params.id);
  if (!leave) return res.status(404).json({ message: "Leave record not found." });

  const policy = (await Policy.findOne()) || { minRestHours: 10, weeklyLimit: 48 };
  const allCrew = await Crew.find();

  // Find unassigned crew in same role with highest rest
  const candidateList = allCrew
    .filter(c => c.role === leave.role && c.name !== leave.crew && c.availability === "Available")
    .map(c => {
      const evaluation = evaluateDuty({
        workingHours: 8,
        restHours: c.restHours ?? 12,
        weeklyHours: c.weeklyHours ?? 24,
        crewAvailability: c.availability,
        isVerified: c.verified
      }, policy);

      return {
        crew: c,
        eligible: evaluation.eligible,
        restHours: c.restHours,
        weeklyHours: c.weeklyHours,
        reasons: evaluation.reasons
      };
    })
    .sort((a, b) => (b.restHours || 0) - (a.restHours || 0));

  res.json({
    leave,
    suggestedReplacement: candidateList[0]?.crew || null,
    candidates: candidateList
  });
}));

// Pre-Trip Vehicle Checklist Submission
router.post("/checklists/submit", asyncHandler(async (req, res) => {
  const {
    busId, driverName, brakes, tyres, steering, lights, horn,
    emergencyExits, firstAidFireExtinguisher, engineFluids, notes
  } = req.body;

  const criticalIssues = [];
  if (brakes && brakes.toLowerCase().includes("fail")) criticalIssues.push("Brake system critical issue");
  if (tyres && tyres.toLowerCase().includes("fail")) criticalIssues.push("Tyre failure / low pressure");
  if (steering && steering.toLowerCase().includes("fail")) criticalIssues.push("Steering / suspension failure");

  const overallStatus = criticalIssues.length > 0 ? "Fail - Maintenance Required" : "Pass";

  const checklist = await Checklist.create({
    checklistId: `CHK-${Date.now().toString().slice(-4)}`,
    busId,
    driverName,
    date: new Date().toISOString(),
    brakes: brakes || "Pass",
    tyres: tyres || "Pass",
    steering: steering || "Pass",
    lights: lights || "Pass",
    horn: horn || "Pass",
    emergencyExits: emergencyExits || "Pass",
    firstAidFireExtinguisher: firstAidFireExtinguisher || "Pass",
    engineFluids: engineFluids || "Pass",
    overallStatus,
    notes: notes || (criticalIssues.length > 0 ? criticalIssues.join(", ") : "All safety checkpoints verified.")
  });

  // If critical, update Bus status to Maintenance Required!
  if (overallStatus.includes("Fail")) {
    const bus = await Bus.findOne({ busId });
    if (bus) {
      await Bus.findByIdAndUpdate(bus._id, {
        status: "Maintenance",
        maintenanceStatus: "Maintenance Required"
      });

      await Notification.create({
        user: "all_officers",
        role: "DEPOT_OFFICER",
        title: `Bus ${busId} Grounded for Maintenance`,
        message: `Driver ${driverName} reported critical inspection failure: ${criticalIssues.join(", ")}. Bus marked unavailable.`,
        type: "emergency",
        createdAt: new Date().toISOString()
      });
    }
  }

  res.status(201).json(checklist);
}));

// =========================================================================
// ADVANCED DRIVER DUTY LIFECYCLE, REST TIMER & OVERTIME APPROVAL ENGINE
// =========================================================================

// Duty Lifecycle Endpoints (Driver)
router.get("/duty/rest-eligibility", asyncHandler(handleGetRestEligibility));
router.get("/duty/active", asyncHandler(handleGetActiveDuty));
router.get("/duty/clearance-board", asyncHandler(handleGetDriversClearanceBoard));
router.post("/duty/start", asyncHandler(handleStartDuty));
router.post("/duty/break/start", asyncHandler(handleStartBreak));
router.post("/duty/break/end", asyncHandler(handleEndBreak));
router.post("/duty/end", asyncHandler(handleEndDuty));

// Overtime & Exception Requests (Driver)
router.post("/duty/overtime/request", asyncHandler(handleSubmitOvertime));
router.post("/duty/overtime/record-actual", asyncHandler(handleRecordActualOvertime));
router.get("/duty/history", asyncHandler(handleGetDriverDutyHistory));

// Officer Overtime Approval Queue & Decision Enforcement (Depot Officer & Admin)
router.get(
  "/officer/overtime-queue",
  allowRoles("DEPOT_OFFICER", "AUTHORITY_ADMIN"),
  asyncHandler(handleGetOfficerOvertimeQueue)
);
router.post(
  "/officer/overtime-decision",
  allowRoles("DEPOT_OFFICER", "AUTHORITY_ADMIN"),
  asyncHandler(handleOfficerOvertimeDecision)
);

export default router;
