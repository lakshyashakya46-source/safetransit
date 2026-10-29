import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SmartDutyAssignment from "./pages/SmartDutyAssignment";
import DriverCockpit from "./pages/DriverCockpit";
import ConductorWorkbench from "./pages/ConductorWorkbench";
import AccountsPortal from "./pages/AccountsPortal";
import LeaveReplacementPage from "./pages/LeaveReplacementPage";
import EmergencyCommandPage from "./pages/EmergencyCommandPage";
import VehicleHealthPage from "./pages/VehicleHealthPage";
import HandoverPage from "./pages/HandoverPage";
import MapPage from "./pages/MapPage";
import PolicyPage from "./pages/PolicyPage";
import AuditLogPage from "./pages/AuditLogPage";
import DataSourcesPage from "./pages/DataSourcesPage";
import ResourcePage from "./pages/ResourcePage";

function defaultTabForRole(role) {
  if (role === "DRIVER") return "Driver Cockpit";
  if (role === "CONDUCTOR") return "Conductor Workbench";
  if (role === "ACCOUNTS") return "Accounts Reconciliation";
  return "Dashboard";
}

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("safeTransitUser") || "null");
    } catch {
      return null;
    }
  });

  const [active, setActive] = useState(() => defaultTabForRole(user?.role));
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const logout = () => setUser(null);
    window.addEventListener("safetransit:logout", logout);
    return () => window.removeEventListener("safetransit:logout", logout);
  }, []);

  function handleUserChange(newUser) {
    setUser(newUser);
    if (newUser) {
      setActive(defaultTabForRole(newUser.role));
    }
  }

  function logout() {
    localStorage.removeItem("safeTransitToken");
    localStorage.removeItem("safeTransitUser");
    setUser(null);
  }

  if (!user) return <Login onLogin={handleUserChange} />;

  let content = null;

  switch (active) {
    case "Dashboard":
      content = <Dashboard onNavigate={setActive} />;
      break;
    case "Smart Duty Allocation":
      content = <SmartDutyAssignment />;
      break;
    case "Driver Cockpit":
      content = <DriverCockpit user={user} />;
      break;
    case "Conductor Workbench":
      content = <ConductorWorkbench user={user} />;
      break;
    case "Accounts Reconciliation":
    case "Overtime Payouts":
    case "Fare Collection Audits":
      content = <AccountsPortal user={user} />;
      break;
    case "Leave & Replacement":
    case "Leave Requests":
      content = <LeaveReplacementPage user={user} />;
      break;
    case "Emergency Command":
    case "Emergencies":
      content = <EmergencyCommandPage user={user} />;
      break;
    case "Vehicle Inspections":
    case "Vehicle Health Checklist":
      content = <VehicleHealthPage user={user} />;
      break;
    case "Digital Handover":
      content = <HandoverPage user={user} />;
      break;
    case "Operations Map":
      content = <MapPage />;
      break;
    case "Policy Engine":
      content = <PolicyPage user={user} />;
      break;
    case "Audit Logs":
      content = <AuditLogPage />;
      break;
    case "Data Sources":
      content = <DataSourcesPage />;
      break;
    case "Crew Management":
    case "Fleet Management":
    case "Duties":
    case "Overtime Authorizations":
    case "Overtime":
    case "Fare Collections":
      content = <ResourcePage name={active} user={user} />;
      break;
    default:
      content = <Dashboard onNavigate={setActive} />;
  }

  return (
    <div className="min-h-screen bg-mist text-slate-800">
      <Sidebar
        active={active}
        onChange={setActive}
        user={user}
        onLogout={logout}
        collapsed={collapsed}
      />

      <div className={`${collapsed ? "lg:pl-20" : "lg:pl-64"} transition-all min-h-screen flex flex-col`}>
        <Topbar
          user={user}
          onMenu={() => setCollapsed(v => !v)}
          onUserChange={handleUserChange}
        />
        <main className="flex-1 mx-auto max-w-[1600px] w-full p-4 sm:p-6 lg:p-8">
          {content}
        </main>
      </div>
    </div>
  );
}
