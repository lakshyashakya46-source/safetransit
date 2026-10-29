import { useState } from "react";
import { Activity, ArrowRight, LockKeyhole, ShieldCheck, BusFront, Users, Landmark, Ticket } from "lucide-react";
import { api } from "../services/api";

const demoAccounts = [
  ["Transport Authority", "authority@demo.com", "State Governance & HQ Norms", "🏛️"],
  ["Depot Officer", "officer@demo.com", "Smart Duty & Rostering", "🏢"],
  ["Driver Cockpit", "driver@demo.com", "Duty Tracking & Pre-Trip Checks", "🚍"],
  ["Conductor Workbench", "conductor@demo.com", "Digital Waybill & Fare UPI", "🎫"],
  ["Accounts Officer", "accounts@demo.com", "Overtime Payouts & Discrepancies", "💼"]
];

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("officer@demo.com");
  const [password, setPassword] = useState("Demo@12345");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    if (event) event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const result = await api.login(email, password);
      localStorage.setItem("safeTransitToken", result.token);
      localStorage.setItem("safeTransitUser", JSON.stringify(result.user));
      onLogin(result.user);
    } catch (err) {
      setError(err.message || "Invalid authentication credentials.");
    } finally {
      setBusy(false);
    }
  }

  function handleQuickLogin(accountEmail) {
    setEmail(accountEmail);
    setPassword("Demo@12345");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-blue-100/50 flex items-center justify-center p-4">
      <div className="mx-auto grid w-full max-w-5xl rounded-3xl border border-blue-200 bg-white/90 shadow-2xl backdrop-blur overflow-hidden lg:grid-cols-12">
        {/* Left Branding Showcase */}
        <div className="hidden lg:flex lg:col-span-6 flex-col justify-between p-10 bg-gradient-to-br from-navy via-slate-900 to-blue-950 text-white relative">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-blue-600/20 blur-3xl" />

          <div>
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
                <Activity size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-white leading-tight">SafeTransit</h2>
                <p className="text-[11px] font-bold uppercase tracking-widest text-blue-400">National Transit Safety</p>
              </div>
            </div>

            <div className="mt-10 space-y-3">
              <span className="inline-block rounded-full bg-blue-500/20 border border-blue-400/30 px-3 py-1 text-xs font-semibold text-blue-300">
                Hackathon Gold Standard • Enterprise Ready
              </span>
              <h1 className="text-3xl font-black leading-tight text-white">
                Right Person + Right Bus + Right Route + Right Time + Safe Working Hours.
              </h1>
              <p className="text-xs text-slate-300 leading-relaxed pt-2">
                Digital public transport crew safety, fatigue-rule engine, auditable overrides, transparent overtime compensation, pre-trip vehicle checklists, and fare discrepancy settlement.
              </p>
            </div>
          </div>

          <div className="space-y-2.5 pt-8 border-t border-slate-800">
            {[
              "Rule-based fatigue checks without AI hallucinations",
              "Traceable manual overrides with mandatory reason",
              "Automatic leave replacement ranking heuristic",
              "Conductor digital waybill & dispute workflow"
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-2 text-xs font-medium text-slate-300">
                <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <div className="text-[11px] text-slate-400 pt-4">
            Compliant with Motor Transport Workers Act & State Safety Directives.
          </div>
        </div>

        {/* Right Authentication Panel */}
        <div className="lg:col-span-6 p-8 sm:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-navy">Operations Sign In</h2>
            <p className="mt-1 text-xs text-slate-500">Select any role below for instant benchmark demonstration:</p>
          </div>

          {/* Quick Demo Role Picker Buttons */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            {demoAccounts.map(([role, accountEmail, subtitle, emoji]) => {
              const isSelected = email === accountEmail;
              return (
                <button
                  type="button"
                  key={role}
                  onClick={() => handleQuickLogin(accountEmail)}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 shadow-sm"
                      : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-navy">
                    <span>{emoji}</span>
                    <span className="truncate">{role}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{subtitle}</p>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <input
                className="field text-xs"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@demo.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Security Password</label>
              <input
                type="password"
                className="field text-xs"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="primary-button w-full flex items-center justify-center gap-2 text-xs font-bold py-3 mt-2 shadow-lg shadow-blue-500/25"
            >
              {busy ? "Authenticating Session..." : `Sign In as ${email.split("@")[0].toUpperCase()}`}
              <ArrowRight size={16} />
            </button>
          </form>

          <p className="mt-6 text-center text-[11px] text-slate-400">
            Synthetic demo database initialized • Password for all accounts: <b>Demo@12345</b>
          </p>
        </div>
      </div>
    </div>
  );
}
