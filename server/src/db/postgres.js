import pg from "pg";
import { config } from "../config/env.js";

const { Pool } = pg;

let pool = null;
let isConnected = false;

export function getPool() {
  return pool;
}

export function isPostgresConnected() {
  return isConnected;
}

const TABLE_NAMES = [
  "users",
  "crew",
  "buses",
  "routes",
  "trips",
  "duties",
  "overtime",
  "leaves",
  "emergencies",
  "collections",
  "checklists",
  "handovers",
  "audit_logs",
  "notifications",
  "policies",
  "duty_sessions",
  "rest_periods",
  "overtime_requests",
  "driver_work_records"
];

export async function initPostgres() {
  try {
    pool = new Pool({
      connectionString: config.databaseUrl,
      connectionTimeoutMillis: 2500,
      idleTimeoutMillis: 10000,
      max: 15
    });

    // Test connection with a fast query
    const client = await pool.connect();
    try {
      await client.query("SELECT 1 AS health");
    } finally {
      client.release();
    }

    // Auto-create tables and GIN indexes if they do not exist
    for (const tableName of TABLE_NAMES) {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "${tableName}" (
          id VARCHAR(64) PRIMARY KEY,
          data JSONB NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS "idx_${tableName}_gin" ON "${tableName}" USING GIN (data);
      `);
    }

    isConnected = true;
    return true;
  } catch (err) {
    isConnected = false;
    if (pool) {
      try {
        await pool.end();
      } catch {}
      pool = null;
    }
    return false;
  }
}

function generateId() {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

function formatRow(row) {
  if (!row) return null;
  const data = typeof row.data === "string" ? JSON.parse(row.data) : (row.data || {});
  return {
    ...data,
    _id: row.id,
    id: row.id,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : data.createdAt,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : data.updatedAt
  };
}

function buildWhere(query) {
  if (!query || Object.keys(query).length === 0) {
    return { whereClause: "", params: [] };
  }

  const conditions = [];
  const params = [];
  let pIndex = 1;

  for (const [key, val] of Object.entries(query)) {
    if (key === "_id" || key === "id") {
      conditions.push(`id = $${pIndex++}`);
      params.push(String(val));
    } else if (val && typeof val === "object" && !Array.isArray(val)) {
      if ("$in" in val) {
        conditions.push(`data->>'${key}' = ANY($${pIndex++})`);
        params.push(val.$in.map(String));
      } else if ("$nin" in val) {
        conditions.push(`NOT (data->>'${key}' = ANY($${pIndex++}))`);
        params.push(val.$nin.map(String));
      } else if ("$ne" in val) {
        conditions.push(`(data->>'${key}' IS NULL OR data->>'${key}' != $${pIndex++})`);
        params.push(String(val.$ne));
      }
    } else {
      conditions.push(`data->>'${key}' = $${pIndex++}`);
      params.push(String(val));
    }
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    params
  };
}

export function createPostgresModel(tableName) {
  class PostgresModel {
    static find(query = {}) {
      let sortField = "created_at";
      let sortDir = "DESC";
      let limitVal = null;

      const queryObj = {
        sort(sortCriteria = {}) {
          const [field, dir] = Object.entries(sortCriteria)[0] || ["createdAt", -1];
          sortField = (field === "createdAt" || field === "created_at") ? "created_at" : `data->>'${field}'`;
          sortDir = dir === -1 ? "DESC" : "ASC";
          return queryObj;
        },
        limit(n) {
          limitVal = n;
          return queryObj;
        },
        async execute() {
          if (!pool || !isConnected) return [];
          const { whereClause, params } = buildWhere(query);
          let sql = `SELECT id, data, created_at, updated_at FROM "${tableName}" ${whereClause} ORDER BY ${sortField} ${sortDir}`;
          if (limitVal) {
            sql += ` LIMIT ${parseInt(limitVal, 10)}`;
          }
          const res = await pool.query(sql, params);
          return res.rows.map(formatRow);
        },
        then(resolve, reject) {
          queryObj.execute().then(resolve, reject);
        },
        catch(reject) {
          return queryObj.execute().catch(reject);
        }
      };

      return queryObj;
    }

    static async findOne(query = {}) {
      if (!pool || !isConnected) return null;
      const { whereClause, params } = buildWhere(query);
      const sql = `SELECT id, data, created_at, updated_at FROM "${tableName}" ${whereClause} ORDER BY created_at DESC LIMIT 1`;
      const res = await pool.query(sql, params);
      return res.rows.length > 0 ? formatRow(res.rows[0]) : null;
    }

    static async findById(id) {
      if (!pool || !isConnected || !id) return null;
      const res = await pool.query(
        `SELECT id, data, created_at, updated_at FROM "${tableName}" WHERE id = $1 LIMIT 1`,
        [String(id)]
      );
      return res.rows.length > 0 ? formatRow(res.rows[0]) : null;
    }

    static async create(doc) {
      if (!pool || !isConnected) throw new Error("PostgreSQL is not connected");
      const id = doc._id ? String(doc._id) : (doc.id ? String(doc.id) : generateId());
      const now = new Date().toISOString();
      const cleanDoc = {
        ...doc,
        _id: id,
        id,
        createdAt: doc.createdAt || now,
        updatedAt: now
      };

      await pool.query(
        `INSERT INTO "${tableName}" (id, data, created_at, updated_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = $4`,
        [id, JSON.stringify(cleanDoc), cleanDoc.createdAt, cleanDoc.updatedAt]
      );

      return cleanDoc;
    }

    static async insertMany(docs) {
      if (!pool || !isConnected) throw new Error("PostgreSQL is not connected");
      const results = [];
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        for (const doc of docs) {
          const id = doc._id ? String(doc._id) : (doc.id ? String(doc.id) : generateId());
          const now = new Date().toISOString();
          const cleanDoc = {
            ...doc,
            _id: id,
            id,
            createdAt: doc.createdAt || now,
            updatedAt: now
          };
          await client.query(
            `INSERT INTO "${tableName}" (id, data, created_at, updated_at)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = $4`,
            [id, JSON.stringify(cleanDoc), cleanDoc.createdAt, cleanDoc.updatedAt]
          );
          results.push(cleanDoc);
        }
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
      return results;
    }

    static async findByIdAndUpdate(id, update, options = {}) {
      if (!pool || !isConnected || !id) return null;
      const existingRes = await pool.query(
        `SELECT id, data, created_at, updated_at FROM "${tableName}" WHERE id = $1 LIMIT 1`,
        [String(id)]
      );

      if (existingRes.rows.length === 0) {
        if (options.upsert) {
          return await PostgresModel.create({ ...update, _id: id });
        }
        return null;
      }

      const current = formatRow(existingRes.rows[0]);
      const now = new Date().toISOString();
      const merged = {
        ...current,
        ...update,
        _id: current._id,
        id: current.id,
        updatedAt: now
      };

      await pool.query(
        `UPDATE "${tableName}" SET data = $1, updated_at = $2 WHERE id = $3`,
        [JSON.stringify(merged), now, String(id)]
      );

      return merged;
    }

    static async findOneAndUpdate(query = {}, update, options = {}) {
      if (!pool || !isConnected) return null;
      const existing = await PostgresModel.findOne(query);

      if (!existing) {
        if (options.upsert) {
          return await PostgresModel.create({ ...update });
        }
        return null;
      }

      return await PostgresModel.findByIdAndUpdate(existing._id, update, options);
    }

    static async deleteMany(query = {}) {
      if (!pool || !isConnected) return { acknowledged: true };
      const { whereClause, params } = buildWhere(query);
      await pool.query(`DELETE FROM "${tableName}" ${whereClause}`, params);
      return { acknowledged: true };
    }

    static async countDocuments(query = {}) {
      if (!pool || !isConnected) return 0;
      const { whereClause, params } = buildWhere(query);
      const res = await pool.query(
        `SELECT COUNT(*) AS count FROM "${tableName}" ${whereClause}`,
        params
      );
      return parseInt(res.rows[0]?.count || 0, 10);
    }
  }

  return PostgresModel;
}
