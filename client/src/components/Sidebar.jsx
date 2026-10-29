import { useEffect, useState } from "react";
import {
  Activity, AlertTriangle, BusFront, ClipboardCheck, Clock3, FileText,
  LayoutDashboard, LogOut, Map, Settings, Users, Wallet,
  CalendarCheck, ShieldCheck, Gauge, Ticket, Wrench, ArrowLeftRight, Database
} from "lucide-react";
import { api } from "../services/api";

export default function Sidebar({ active, onChange, user, onLogout, collapsed }) {
  const role = user?.role || "DEPOT_OFFICER";
  const [pendingOtCount, setPendingOtCount] = useState(0);

  useEffect(() => {
    if (role === "DRIVER" || role === "CONDUCTOR") return;

    let mounted = true;
    async function checkPending() {
      try {
        const queue = await api.officerOvertimeQueue();
        if (!mounted) return;
        if (Array.isArray(queue)) {
          const count = queue.filter(q => q.status === "PENDING_APPROVAL" || q.status === "Pending").length;
          setPendingOtCount(count);
        }
      } catch {
        // quiet
      }
    }

    checkPending();
    const interval = setInterval(checkPending, 8000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [role]);

  let navItems = [];

  if (role === "DRIVER") {
    navItems = [
      ["Driver Cockpit", Gauge],
      ["Vehicle Health Checklist", Wrench],
      ["Digital Handover", ArrowLeftRight],
      ["Overtime", Wallet],
      ["Leave Requests", CalendarCheck],
      ["Emergencies", AlertTriangle],
      ["Operations Map", Map]
    ];
  } else if (role === "CONDUCTOR") {
    navItems = [
      ["Conductor Workbench", Ticket],
      ["Fare Collections", Wallet],
      ["Digital Handover", ArrowLeftRight],
      ["Leave Requests", CalendarCheck],
      ["Emergencies", AlertTriangle],
      ["Operations Map", Map]
    ];
  } else if (role === "ACCOUNTS") {
    navItems = [
      ["Accounts Reconciliation", Wallet],
      ["Overtime Payouts", Clock3],
      ["Fare Collection Audits", Ticket],
      ["Dashboard", LayoutDashboard],
      ["Audit Logs", ClipboardCheck],
      ["Reports", FileText]
    ];
  } else {
    // AUTHORITY_ADMIN, DEPOT_OFFICER - Streamlined core operational navigation
    navItems = [
      ["Dashboard", LayoutDashboard],
      ["Overtime Authorizations", Wallet],
      ["Smart Duty Allocation", CalendarCheck],
      ["Crew Management", Users],
      ["Vehicle Inspections", Wrench],
      ["Emergency Command", AlertTriangle],
      ["Operations Map", Map],
      ["Policy Engine", Settings],
      ["Audit Logs", ClipboardCheck]
    ];
  }

  return (
    <aside className={`${collapsed ? "w-20" : "w-64"} fixed inset-y-0 left-0 z-30 border-r border-blue-100 bg-white transition-all flex flex-col shadow-sm`}>
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-blue-100 px-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
          <Activity size={20} />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-extrabold text-navy text-base leading-tight tracking-tight">SafeTransit</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">Operations Control</p>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map(([label, Icon]) => {
          const isSelected = active === label;
          const showPendingOtBadge = label === "Overtime Authorizations" && pendingOtCount > 0;

          return (
            <button
              key={label}
              onClick={() => onChange(label)}
              title={collapsed ? (showPendingOtBadge ? `${label} (${pendingOtCount} Pending)` : label) : undefined}
              className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${
                isSelected
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-bold"
                  : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
              }`}
            >
              <Icon size={18} className={isSelected ? "text-white" : "text-slate-400"} />
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="truncate">{label}</span>
                  {showPendingOtBadge && (
                    <span className="ml-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 shadow-xs shrink-0 animate-pulse">
                      {pendingOtCount} Pending
                    </span>
                  )}
                </div>
              )}
              {collapsed && showPendingOtBadge && (
                <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white animate-pulse" />
              )}
            </button>
          );
        })}
      </nav>

      {/* User Footer Profile */}
      <div className="border-t border-blue-100 p-3">
        {!collapsed && (
          <div className="mb-2 rounded-xl bg-slate-50 p-2.5 border border-slate-100">
            <p className="truncate text-xs font-bold text-slate-800">{user.name}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-blue-600 uppercase tracking-wide">
              {user.role.replaceAll("_", " ")}
            </p>
          </div>
        )}
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
        >
          <LogOut size={16} />
          {!collapsed && "Sign out"}
        </button>
      </div>
    </aside>
  );
}
