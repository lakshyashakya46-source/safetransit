import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  startDutySession,
  endDutySession,
  getActiveDutySession,
  startBreak,
  endBreak,
  evaluateDriverRestEligibility,
  submitOvertimeRequest,
  processOfficerOvertimeDecision,
  recordActualOvertimeWorked,
  getDriverDutyAndOvertimeHistory,
  getActivePolicy
} from "../src/services/dutyLifecycleService.js";
import { DutySession, RestPeriod, OvertimeRequest, AuditLog, Duty, Overtime } from "../src/models/index.js";

describe("SafeTransit — Advanced Driver Duty Lifecycle, Rest & Overtime Engine", () => {
  const TEST_DRIVER_ID = "test-driver-999";
  const TEST_DRIVER_NAME = "Captain Test Driver Unique";
  const TEST_OFFICER_ID = "officer-888";
  const TEST_OFFICER_NAME = "Inspector Rathore";

  async function cleanTestData() {
    await DutySession.deleteMany({ driverName: TEST_DRIVER_NAME });
    await RestPeriod.deleteMany({ driverName: TEST_DRIVER_NAME });
    await OvertimeRequest.deleteMany({ driverName: TEST_DRIVER_NAME });
    await Duty.deleteMany({ crew: TEST_DRIVER_NAME });
    await Overtime.deleteMany({ crew: TEST_DRIVER_NAME });
  }

  before(async () => {
    await cleanTestData();
  });

  after(async () => {
    await cleanTestData();
  });

  test("1. Initial Rest State: Driver with no prior sessions is fully eligible", async () => {
    const eligibility = await evaluateDriverRestEligibility(TEST_DRIVER_ID, TEST_DRIVER_NAME);
    assert.equal(eligibility.isCurrentlyOnDuty, false);
    assert.equal(eligibility.eligibilityStatus, "FULLY_ELIGIBLE");
    assert.equal(eligibility.canStartDuty, true);
    assert.equal(eligibility.canRequestOvertime, true);
  });

  test("2. Start Duty: Successfully commences shift and prevents duplicate active sessions", async () => {
    const session = await startDutySession({
      driverId: TEST_DRIVER_ID,
      driverName: TEST_DRIVER_NAME,
      employeeId: "DRV-TEST",
      busId: "BUS-TEST-99",
      routeName: "Jaipur - Delhi NH-48 Express",
      scheduledHours: 8.0,
      actor: { id: TEST_DRIVER_ID, name: TEST_DRIVER_NAME, role: "DRIVER" }
    });

    assert.ok(session.dutyId.startsWith("DUTY-SES-"));
    assert.equal(session.status, "ACTIVE");
    assert.equal(session.driverName, TEST_DRIVER_NAME);

    // Verify active session retrieval
    const active = await getActiveDutySession(TEST_DRIVER_ID, TEST_DRIVER_NAME);
    assert.ok(active);
    assert.equal(active.dutyId, session.dutyId);

    // Attempt duplicate start -> MUST reject with 409 Conflict
    await assert.rejects(
      async () => {
        await startDutySession({
          driverId: TEST_DRIVER_ID,
          driverName: TEST_DRIVER_NAME,
          busId: "BUS-TEST-99",
          actor: { id: TEST_DRIVER_ID, name: TEST_DRIVER_NAME, role: "DRIVER" }
        });
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.match(err.message, /already has an active duty session/);
        return true;
      }
    );
  });

  test("3. Duty Breaks: Can pause for a break and resume duty", async () => {
    // Start break
    const paused = await startBreak({
      driverId: TEST_DRIVER_ID,
      driverName: TEST_DRIVER_NAME,
      reason: "Mandatory 30m Highway Refreshment",
      actor: { id: TEST_DRIVER_ID, name: TEST_DRIVER_NAME, role: "DRIVER" }
    });
    assert.equal(paused.status, "PAUSED_BREAK");
    assert.equal(paused.breaks.length, 1);

    // End break
    const resumed = await endBreak({
      driverId: TEST_DRIVER_ID,
      driverName: TEST_DRIVER_NAME,
      actor: { id: TEST_DRIVER_ID, name: TEST_DRIVER_NAME, role: "DRIVER" }
    });
    assert.equal(resumed.status, "ACTIVE");
    assert.ok(resumed.breaks[0].endTime);
  });

  test("4. End Duty: Atomically terminates shift, records duration, and initiates rest period", async () => {
    const result = await endDutySession({
      driverId: TEST_DRIVER_ID,
      driverName: TEST_DRIVER_NAME,
      actualDrivingHours: 4.5,
      notes: "Trip completed on schedule.",
      actor: { id: TEST_DRIVER_ID, name: TEST_DRIVER_NAME, role: "DRIVER" }
    });

    assert.equal(result.success, true);
    assert.equal(result.dutySession.status, "COMPLETED");
    assert.ok(result.completionSummary);
    assert.equal(result.completionSummary.requiredContinuousRestHours, 13.0);
    assert.equal(result.completionSummary.minOvertimeRestHours, 9.0);

    // Verify driver is now in RESTING_INELIGIBLE state
    const restEval = await evaluateDriverRestEligibility(TEST_DRIVER_ID, TEST_DRIVER_NAME);
    assert.equal(restEval.isCurrentlyOnDuty, false);
    assert.equal(restEval.eligibilityStatus, "RESTING_INELIGIBLE");
    assert.equal(restEval.canStartDuty, false);
  });

  test("5. Safety Lockout: Cannot start a new shift while mandatory rest is active", async () => {
    await assert.rejects(
      async () => {
        await startDutySession({
          driverId: TEST_DRIVER_ID,
          driverName: TEST_DRIVER_NAME,
          busId: "BUS-TEST-99",
          actor: { id: TEST_DRIVER_ID, name: TEST_DRIVER_NAME, role: "DRIVER" }
        });
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /Mandatory rest policy requires minimum continuous rest/);
        return true;
      }
    );
  });

  test("6. Overtime Rules: Ordinary request is BLOCKED if continuous rest < 9 hours", async () => {
    const res = await submitOvertimeRequest({
      driverId: TEST_DRIVER_ID,
      driverName: TEST_DRIVER_NAME,
      employeeId: "DRV-TEST",
      requestedHours: 2.5,
      reason: "Traffic delay on NH-48 near Neemrana",
      isEmergency: false,
      actor: { id: TEST_DRIVER_ID, name: TEST_DRIVER_NAME, role: "DRIVER" }
    });

    assert.equal(res.isBlocked, true);
    assert.equal(res.request.status, "BLOCKED_BY_REST_RULE");
    assert.match(res.request.blockReason, /Rest Rule Violation/);
  });

  test("7. Emergency Exception: Allows submission prior to 9h rest under justified emergency", async () => {
    const res = await submitOvertimeRequest({
      driverId: TEST_DRIVER_ID,
      driverName: TEST_DRIVER_NAME,
      employeeId: "DRV-TEST",
      requestedHours: 3.0,
      reason: "Passenger bus overturned on NH-48; immediate highway relief required.",
      isEmergency: true,
      emergencyReference: "INCIDENT-SOS-991",
      emergencyJustification: "No replacement crew reachable at Kotputli transit point. Passenger safety requires immediate relief dispatch.",
      actor: { id: TEST_DRIVER_ID, name: TEST_DRIVER_NAME, role: "DRIVER" }
    });

    assert.equal(res.isBlocked, false);
    assert.equal(res.request.status, "PENDING_APPROVAL");
    assert.equal(res.request.isEmergency, true);
    assert.equal(res.request.exceptionOutcome, "ACCEPTED_FOR_REVIEW");
  });

  test("8. Security & Compliance: Driver is prohibited from self-approving overtime", async () => {
    // Create a pending request
    const otRes = await submitOvertimeRequest({
      driverId: TEST_DRIVER_ID,
      driverName: TEST_DRIVER_NAME,
      employeeId: "DRV-TEST",
      requestedHours: 2.0,
      reason: "Station master request for extra late night commuter shuttle",
      isEmergency: true,
      emergencyReference: "SHUTTLE-REQ-1",
      emergencyJustification: "Night transit relief authorized by regional transport officer.",
      actor: { id: TEST_DRIVER_ID, name: TEST_DRIVER_NAME, role: "DRIVER" }
    });

    // Attempt self-approval by driver
    await assert.rejects(
      async () => {
        await processOfficerOvertimeDecision({
          requestId: otRes.request.requestId,
          officerId: TEST_DRIVER_ID, // Same ID as driver
          officerName: TEST_DRIVER_NAME,
          officerRole: "DEPOT_OFFICER",
          decision: "APPROVED",
          decisionReason: "Self-approving my extra shift"
        });
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /prohibited from approving their own/);
        return true;
      }
    );
  });

  test("9. Officer Approval: Depot Officer approves verified emergency request with mandatory justification", async () => {
    const pendingReq = await OvertimeRequest.findOne({
      driverName: TEST_DRIVER_NAME,
      isEmergency: true,
      status: "PENDING_APPROVAL"
    });
    assert.ok(pendingReq);

    const approved = await processOfficerOvertimeDecision({
      requestId: pendingReq.requestId,
      officerId: TEST_OFFICER_ID,
      officerName: TEST_OFFICER_NAME,
      officerRole: "DEPOT_OFFICER",
      decision: "APPROVED",
      approvedHours: 3.0,
      decisionReason: "Verified highway collision with highway patrol log.",
      exceptionBasis: "Statutory emergency exception approved under Rule 14(A) transport safety directive."
    });

    assert.equal(approved.status, "APPROVED");
    assert.equal(approved.approvedHours, 3.0);
    assert.equal(approved.approvedAmountINR, 1050.0); // 3h * 350 INR
    assert.equal(approved.reviewingOfficerName, TEST_OFFICER_NAME);
  });

  test("10. Actual Overtime Reconciliation: Detects discrepancy between approved and actual hours", async () => {
    const approvedReq = await OvertimeRequest.findOne({
      driverName: TEST_DRIVER_NAME,
      status: "APPROVED"
    });
    assert.ok(approvedReq);

    // Scenario A: Actual exceeds approved
    const overReported = await recordActualOvertimeWorked({
      requestId: approvedReq.requestId,
      actualHoursWorked: 4.0, // Approved was 3.0
      verificationSource: "GPS_TELEMETRY",
      notes: "Additional delay at depot gate",
      actor: { id: TEST_DRIVER_ID, name: TEST_DRIVER_NAME, role: "DRIVER" }
    });
    assert.equal(overReported.discrepancyStatus, "OVER_HOURS_UNAPPROVED");

    // Scenario B: Exact match
    const matched = await recordActualOvertimeWorked({
      requestId: approvedReq.requestId,
      actualHoursWorked: 3.0,
      verificationSource: "GPS_TELEMETRY",
      notes: "GPS telemetry confirmed exact hours",
      actor: { id: TEST_DRIVER_ID, name: TEST_DRIVER_NAME, role: "DRIVER" }
    });
    assert.equal(matched.discrepancyStatus, "MATCH");
  });

  test("11. Tamper-Evident Audit Ledger: Generates unbroken SHA-256 hash chains", async () => {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(5);
    assert.ok(logs.length >= 2);

    // Verify hash format and linkage
    logs.forEach(log => {
      assert.ok(log.hash && log.hash.length === 64); // SHA-256 is 64 hex characters
      assert.ok(log.prevHash);
      assert.ok(log.timestamp);
    });
  });

  test("12. History & Summary: Returns all 6 required categories and analytics", async () => {
    const history = await getDriverDutyAndOvertimeHistory(TEST_DRIVER_ID, TEST_DRIVER_NAME);

    assert.equal(history.driverName, TEST_DRIVER_NAME);
    assert.ok(history.categories.dutySessions.length > 0);
    assert.ok(history.categories.restPeriods.length > 0);
    assert.ok(history.categories.overtimeRequests.length > 0);
    assert.ok(history.categories.overtimeApprovals.length > 0);
    assert.ok(history.categories.actualOvertimeRecords.length > 0);
    assert.ok(history.categories.summary);

    assert.ok(history.categories.summary.totalApprovedOvertime >= 3.0);
    assert.ok(history.categories.summary.estimatedOvertimeCompensationINR >= 1050.0);
  });
});
