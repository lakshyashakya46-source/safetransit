import { useEffect, useState } from "react";
import {
  Bell, Menu, RefreshCw, ShieldCheck, ChevronDown,
  AlertTriangle, CheckCheck, Clock, UserCheck
} from "lucide-react";
import { api } from "../services/api";

const roles = [
  { id: "AUTHORITY_ADMIN", label: "🏛️ Transport Authority", email: "authority@demo.com" },
  { id: "DEPOT_OFFICER", label: "🏢 Depot Officer", email: "officer@demo.com" },
  { id: "DRIVER", label: "🚍 Driver Cockpit", email: "driver@demo.com" },
  { id: "CONDUCTOR", label: "🎫 Conductor Workbench", email: "conductor@demo.com" },
  { id: "ACCOUNTS", label: "💼 Accounts Officer", email: "accounts@demo.com" }
];

export default function Topbar({ onMenu, user, onUserChange, onResetSuccess }) {
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [alertTicker, setAlertTicker] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function fetchAlerts() {
      try {
        const [notifs, emergencies] = await Promise.all([
          api.list("notifications").catch(() => []),
          api.list("emergencies").catch(() => [])
        ]);

        if (!mounted) return;
        setNotifications(Array.isArray(notifs) ? notifs : []);

        const activeEmergency = Array.isArray(emergencies)
          ? emergencies.find(e => e.status !== "Resolved" && e.status !== "Closed")
          : null;

        setAlertTicker(activeEmergency);
      } catch (e) {
        // quiet
      }
    }

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  async function handleRoleSwitch(roleId) {
    if (roleId === user.role) return;
    setSwitching(true);
    try {
      const res = await api.switchDemoRole(roleId);
      localStorage.setItem("safeTransitToken", res.token);
      localStorage.setItem("safeTransitUser", JSON.stringify(res.user));
      onUserChange(res.user);
    } catch (err) {
      alert("Failed to switch role: " + err.message);
    } finally {
      setSwitching(false);
    }
  }

  async function handleResetData() {
    if (!window.confirm("Reset all operational data to factory synthetic demonstration state?")) return;
    setResetting(true);
    try {
      await api.resetSeed();
      if (onResetSuccess) onResetSuccess();
      window.location.reload();
    } catch (err) {
      alert("Reset error: " + err.message);
    } finally {
      setResetting(false);
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="sticky top-0 z-20 border-b border-blue-100 bg-white/95 backdrop-blur">
      {/* Active Incident Alert Banner */}
      {alertTicker && (
        <div className="bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} />
            <span>
              LIVE INCIDENT ALERT: {alertTicker.bus} ({alertTicker.type}) - {alertTicker.location}: "{alertTicker.description}"
            </span>
          </div>
          <span className="bg-rose-700/80 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">
            Status: {alertTicker.status}
          </span>
        </div>
      )}

      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button onClick={onMenu} className="rounded-lg p-2 text-slate-600 hover:bg-blue-50">
            <Menu size={20} />
          </button>

          {/* Quick Role Switcher for Hackathon Judges */}
          <div className="relative inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-xs font-medium text-blue-900">
            <span className="text-slate-500 hidden sm:inline">Role View:</span>
            <select
              value={user.role}
              disabled={switching}
              onChange={(e) => handleRoleSwitch(e.target.value)}
              className="bg-transparent font-bold text-blue-800 outline-none cursor-pointer"
            >
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="text-blue-500 pointer-events-none -ml-1" />
          </div>

          <button
            onClick={handleResetData}
            disabled={resetting}
            title="Reset synthetic operational records"
            className="hidden md:flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 rounded-lg px-2 py-1 hover:bg-slate-100"
          >
            <RefreshCw size={13} className={resetting ? "animate-spin" : ""} />
            <span>Reset Demo Data</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative rounded-xl p-2 text-slate-600 hover:bg-blue-50"
            >
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-blue-100 bg-white p-4 shadow-xl z-50">
                <div className="flex items-center justify-between border-b pb-2 mb-3">
                  <div>
                    <h4 className="font-bold text-sm text-navy">Operational Notifications</h4>
                    <p className="text-[11px] text-slate-400">Shift starts, overtime claims & compliance alerts</p>
                  </div>
                  <button
                    onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                    className="text-[11px] text-blue-600 font-semibold hover:underline"
                  >
                    Mark read
                  </button>
                </div>
                <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">No recent notifications</p>
                  ) : (
                    notifications.slice(0, 15).map((n, i) => (
                      <div
                        key={n._id || i}
                        className={`rounded-xl p-3 text-xs transition ${
                          n.type === "emergency"
                            ? "bg-rose-50 border border-rose-100"
                            : n.type === "warning"
                            ? "bg-amber-50 border border-amber-100"
                            : "bg-slate-50 border border-slate-100"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <p className="font-bold text-slate-800 truncate">{n.title || "Operations Alert"}</p>
                          <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                            {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                          </span>
                        </div>
                        <p className="mt-1 text-slate-600 leading-relaxed text-[11px]">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="hidden h-8 w-px bg-slate-200 sm:block" />

          {/* User profile info */}
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-white font-bold text-xs shadow-sm">
              {user.name.charAt(0)}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-900 leading-tight">{user.name}</p>
              <p className="text-[11px] font-medium text-blue-600">{user.depot || "HQ Command"}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
