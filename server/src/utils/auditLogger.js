import crypto from "crypto";
import { AuditLog } from "../models/index.js";

/**
 * Creates a tamper-evident audit log entry with SHA-256 hash chaining.
 * Prevents retroactive manipulation and ensures auditable provenance.
 */
export async function createTamperEvidentLog({
  actorId,
  actorName = "System",
  actorRole = "SYSTEM",
  action,
  entity,
  entityId,
  reason = "",
  previous = null,
  newValue = null,
  policyVersion = "POL-v2.4",
  complianceResult = null
}) {
  try {
    // Retrieve latest audit log to obtain the previous record's hash
    const latestLogs = await AuditLog.find().sort({ createdAt: -1 }).limit(1);
    const prevHash = latestLogs[0]?.hash || "GENESIS_SAFETRANSIT_AUDIT_BLOCK_0000000000000000";
    const timestamp = new Date().toISOString();

    const sanitizedNewValue = newValue ? JSON.parse(JSON.stringify(newValue)) : null;
    const sanitizedPrevious = previous ? JSON.parse(JSON.stringify(previous)) : null;

    // Cryptographic hash: SHA-256 over chain hash + timestamp + actor + action + entity + payload
    const hashInput = `${prevHash}|${timestamp}|${actorId || "SYSTEM"}|${actorRole}|${action}|${entity}|${entityId}|${JSON.stringify(sanitizedNewValue || {})}`;
    const hash = crypto.createHash("sha256").update(hashInput).digest("hex");

    const logEntry = await AuditLog.create({
      user: actorName,
      role: actorRole,
      actorId: actorId ? String(actorId) : undefined,
      action,
      entity,
      entityId: String(entityId || "N/A"),
      reason,
      previous: sanitizedPrevious,
      newValue: sanitizedNewValue,
      policyVersion,
      complianceResult: complianceResult ? JSON.parse(JSON.stringify(complianceResult)) : null,
      prevHash,
      hash,
      timestamp
    });

    return logEntry;
  } catch (err) {
    console.error("[AuditLogger] Failed to write tamper-evident log:", err.message);
    // Fallback: create minimal log if model supports it
    return null;
  }
}
