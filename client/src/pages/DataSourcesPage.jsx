import { Database, CheckCircle2, FileText, Globe, ShieldCheck, Download, Code } from "lucide-react";

export default function DataSourcesPage() {
  const sources = [
    {
      name: "Jaipur-Delhi-Mumbai Intercity Corridor GTFS",
      type: "GTFS Transit Feed",
      format: "Static GTFS 2.0 (agency, routes, trips, stop_times)",
      license: "Open Data Commons / Synthetic State Transport",
      description: "Synthetic schedule dataset modeled on NH-48 interstate bus transit frequencies, stops, and crew relay waypoints."
    },
    {
      name: "OpenStreetMap Highway Cartography",
      type: "Geospatial Road Network",
      format: "GeoJSON / Leaflet Tile Layer",
      license: "ODbL (Open Database License)",
      description: "Live basemap tiles and highway milestone coordinates connecting Jaipur Sindhi Camp, Neemrana Hub, and Delhi Kashmere Gate ISBT."
    },
    {
      name: "Ministry of Road Transport & Highways (MORTH) Directives",
      type: "Statutory Safety Policy",
      format: "Regulatory Norms",
      license: "Government of India Public Domain",
      description: "Motor Transport Workers Act provisions defining 48-hour weekly working maximums and mandatory continuous rest intervals."
    },
    {
      name: "Electronic Ticketing Machine (ETM) Synthetic Logs",
      type: "Fare Collection Simulation",
      format: "JSON Electronic Waybill Stream",
      license: "Proprietary Demo Protocol",
      description: "Synthetic fare collection records simulating UPI QR scans, passenger count splits, and discrepancy reconciliation workflows."
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wide">
          <Database size={14} />
          Open Standards & Provenance
        </div>
        <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
          Data Sources & GTFS Interoperability
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Transparency documentation regarding dataset provenance, synthetic data governance, and open transit format standards.
        </p>
      </div>

      {/* Transparency Table */}
      <div className="surface p-6">
        <h2 className="text-base font-bold text-navy mb-4">Operational Data Provenance Matrix</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="p-3">Data Stream Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Format / Standard</th>
                <th className="p-3">Licensing</th>
                <th className="p-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sources.map((s, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-navy">{s.name}</td>
                  <td className="p-3 font-semibold text-blue-600">{s.type}</td>
                  <td className="p-3 text-slate-700">{s.format}</td>
                  <td className="p-3 text-slate-500">{s.license}</td>
                  <td className="p-3 max-w-sm text-slate-600">{s.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* GTFS Adapter Architecture */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="surface p-6">
          <div className="flex items-center gap-2 text-navy font-bold text-base mb-2">
            <Code size={18} className="text-blue-600" />
            GTFS & Open Mobility Adapter Architecture
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            SafeTransit implements an extensible adapter layer that ingests standard General Transit Feed Specification (GTFS) feeds:
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            {["agency.txt", "routes.txt", "trips.txt", "stops.txt", "stop_times.txt", "calendar.txt"].map(file => (
              <div key={file} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] font-bold text-blue-800">
                <CheckCircle2 size={13} className="text-emerald-500" /> {file}
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Enables state road transport undertakings to sync live schedules with National Transit Gateways without custom database migrations.
          </p>
        </div>

        <div className="surface p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-navy font-bold text-base mb-2">
              <ShieldCheck size={18} className="text-emerald-600" />
              Synthetic Privacy & PII Protection
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              In accordance with strict personal data protection standards, this hackathon prototype does NOT utilize real Aadhaar numbers, PAN cards, or private personal data of government drivers and conductors.
            </p>
            <div className="mt-4 rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900 space-y-1">
              <p>• Employee IDs are fictionalized under format <code>DRV-1001</code> / <code>CND-2001</code></p>
              <p>• Phone numbers utilize synthetic test ranges (<code>+91 98290 XXXXX</code>)</p>
              <p>• Vehicle registrations utilize dummy RTO combinations (<code>RJ14-PA-XXXX</code>)</p>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Full compliance with Digital Personal Data Protection (DPDP) Act 2023 guidelines.
          </div>
        </div>
      </div>
    </div>
  );
}
