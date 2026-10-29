import { useEffect, useState } from "react";
import {
  ClipboardCheck, Search, Filter, ShieldCheck,
  Calendar, UserCheck, ArrowRight, Lock
} from "lucide-react";
import { api } from "../services/api";
import StatusBadge from "../components/StatusBadge";

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedAction, setSelectedAction] = useState("ALL");

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);
    try {
      const data = await api.list("audit-logs");
      setLogs(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      (log.user || "").toLowerCase().includes(search.toLowerCase()) ||
      (log.reason || "").toLowerCase().includes(search.toLowerCase()) ||
      (log.action || "").toLowerCase().includes(search.toLowerCase()) ||
      (log.entity || "").toLowerCase().includes(search.toLowerCase());

    const matchesAction = selectedAction === "ALL" || log.action === selectedAction;
    return matchesSearch && matchesAction;
  });

  const uniqueActions = ["ALL", ...new Set(logs.map(l => l.action).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wide">
          <ShieldCheck size={14} />
          Tamper-Evident Governance
        </div>
        <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
          Operational Audit & Accountability Log
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Permanent immutable log of every duty assignment, officer manual override, overtime authorization, policy change, and emergency response.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="surface p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-80 rounded-xl border border-slate-200 px-3 py-2 bg-slate-50">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            className="w-full bg-transparent text-xs outline-none"
            placeholder="Search by officer, reason or entity..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto text-xs">
          <Filter size={15} className="text-slate-400" />
          <span className="font-semibold text-slate-600">Action:</span>
          <select
            className="field py-1.5 text-xs"
            value={selectedAction}
            onChange={e => setSelectedAction(e.target.value)}
          >
            {uniqueActions.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Table */}
      <div className="surface p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="p-3">Timestamp (IST)</th>
                <th className="p-3">Officer / User</th>
                <th className="p-3">Role</th>
                <th className="p-3">Operational Action</th>
                <th className="p-3">Target Entity</th>
                <th className="p-3">Mandatory Recorded Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log._id} className="hover:bg-slate-50">
                  <td className="p-3 whitespace-nowrap text-slate-500 font-medium">
                    {new Date(log.timestamp || log.createdAt).toLocaleString([], {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
                    })}
                  </td>
                  <td className="p-3 font-bold text-navy">{log.user}</td>
                  <td className="p-3 text-slate-600 font-medium">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-[11px] font-semibold">
                      {log.role}
                    </span>
                  </td>
                  <td className="p-3">
                    <StatusBadge value={log.action} />
                  </td>
                  <td className="p-3 font-semibold text-blue-700">
                    {log.entity} <span className="text-[10px] text-slate-400">({log.entityId || "N/A"})</span>
                  </td>
                  <td className="p-3 max-w-md text-slate-700 font-medium">
                    {log.reason || "Standard operational transaction"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!filteredLogs.length && (
          <p className="text-center py-8 text-xs text-slate-400">No matching audit events found.</p>
        )}
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 text-xs text-blue-900 flex items-center gap-2.5">
        <Lock size={16} className="text-blue-600 shrink-0" />
        <span>
          <b>Statutory Data Protection:</b> All audit entries are append-only. No officer, admin, or operator has administrative privilege to edit or purge operational logs.
        </span>
      </div>
    </div>
  );
}
