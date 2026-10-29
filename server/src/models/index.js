import { localStore } from "../db/localStore.js";
import { createPostgresModel } from "../db/postgres.js";

let usePostgres = false;

export function setUsePostgres(val) {
  usePostgres = Boolean(val);
}

export function isUsingPostgres() {
  return usePostgres;
}

export const VALID_ROLES = [
  "AUTHORITY_ADMIN",
  "DEPOT_OFFICER",
  "DRIVER",
  "CONDUCTOR",
  "ACCOUNTS"
];

// Register PostgreSQL models
const PostgresModels = {
  User: createPostgresModel("users"),
  Crew: createPostgresModel("crew"),
  Bus: createPostgresModel("buses"),
  Route: createPostgresModel("routes"),
  Trip: createPostgresModel("trips"),
  Duty: createPostgresModel("duties"),
  Overtime: createPostgresModel("overtime"),
  Leave: createPostgresModel("leaves"),
  Emergency: createPostgresModel("emergencies"),
  Collection: createPostgresModel("collections"),
  Checklist: createPostgresModel("checklists"),
  Handover: createPostgresModel("handovers"),
  AuditLog: createPostgresModel("audit_logs"),
  Notification: createPostgresModel("notifications"),
  Policy: createPostgresModel("policies"),
  DutySession: createPostgresModel("duty_sessions"),
  RestPeriod: createPostgresModel("rest_periods"),
  OvertimeRequest: createPostgresModel("overtime_requests"),
  DriverWorkRecord: createPostgresModel("driver_work_records")
};

// Register LocalStore fallback models
const LocalModels = {
  User: localStore.createModel("users"),
  Crew: localStore.createModel("crew"),
  Bus: localStore.createModel("buses"),
  Route: localStore.createModel("routes"),
  Trip: localStore.createModel("trips"),
  Duty: localStore.createModel("duties"),
  Overtime: localStore.createModel("overtime"),
  Leave: localStore.createModel("leaves"),
  Emergency: localStore.createModel("emergencies"),
  Collection: localStore.createModel("collections"),
  Checklist: localStore.createModel("checklists"),
  Handover: localStore.createModel("handovers"),
  AuditLog: localStore.createModel("auditLogs"),
  Notification: localStore.createModel("notifications"),
  Policy: localStore.createModel("policies"),
  DutySession: localStore.createModel("dutySessions"),
  RestPeriod: localStore.createModel("restPeriods"),
  OvertimeRequest: localStore.createModel("overtimeRequests"),
  DriverWorkRecord: localStore.createModel("driverWorkRecords")
};

// Factory proxy that routes to PostgreSQL if active, or LocalStore fallback
function createModelProxy(modelName) {
  return new Proxy({}, {
    get(target, prop) {
      const activeModel = usePostgres ? PostgresModels[modelName] : LocalModels[modelName];
      const val = activeModel[prop];
      if (typeof val === "function") {
        return val.bind(activeModel);
      }
      return val;
    }
  });
}

export const User = createModelProxy("User");
export const Crew = createModelProxy("Crew");
export const Bus = createModelProxy("Bus");
export const Route = createModelProxy("Route");
export const Trip = createModelProxy("Trip");
export const Duty = createModelProxy("Duty");
export const Overtime = createModelProxy("Overtime");
export const Leave = createModelProxy("Leave");
export const Emergency = createModelProxy("Emergency");
export const Collection = createModelProxy("Collection");
export const Checklist = createModelProxy("Checklist");
export const Handover = createModelProxy("Handover");
export const AuditLog = createModelProxy("AuditLog");
export const Notification = createModelProxy("Notification");
export const Policy = createModelProxy("Policy");
export const DutySession = createModelProxy("DutySession");
export const RestPeriod = createModelProxy("RestPeriod");
export const OvertimeRequest = createModelProxy("OvertimeRequest");
export const DriverWorkRecord = createModelProxy("DriverWorkRecord");
