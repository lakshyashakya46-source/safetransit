import { useEffect, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, Polyline, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../services/api";
import { BusFront, MapPin, AlertTriangle, ShieldCheck, Filter } from "lucide-react";
import StatusBadge from "../components/StatusBadge";

// Fix default leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

export default function MapPage() {
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("ALL");
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);

  useEffect(() => {
    Promise.all([
      api.list("routes").catch(() => []),
      api.list("buses").catch(() => []),
      api.list("emergencies").catch(() => [])
    ]).then(([r, b, e]) => {
      setRoutes(Array.isArray(r) ? r : []);
      setBuses(Array.isArray(b) ? b : []);
      setEmergencies(Array.isArray(e) ? e : []);
    });
  }, []);

  const routeColors = ["#2563eb", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899"];

  // Synthetic live bus locations along the corridors
  const liveBuses = [
    { busId: "BUS-101", pos: [27.7088, 76.2046], label: "Kotputli Bypass (Km 110)", status: "On Trip", speed: "68 km/h", route: "Jaipur → Delhi", driver: "Rameshwar Singh" },
    { busId: "BUS-102", pos: [26.9224, 75.7958], label: "Jaipur Central Workshop", status: "Available", speed: "0 km/h", route: "Standby", driver: "Pawan Gurjar" },
    { busId: "BUS-103", pos: [26.4499, 74.6399], label: "Ajmer Central Station", status: "On Trip", speed: "42 km/h", route: "Jaipur → Udaipur", driver: "Mukesh Meena" },
    { busId: "BUS-105", pos: [27.3872, 75.9582], label: "Shahpura Flyover (Km 62)", status: "Maintenance", speed: "0 km/h", route: "Roadside Breakdown", driver: "Dharmendra Yadav" },
    { busId: "BUS-106", pos: [25.7584, 75.3812], label: "Deoli Bypass", status: "On Trip", speed: "55 km/h", route: "Kota → Jaipur", driver: "Nandkishore Sharma" },
    { busId: "BUS-108", pos: [24.5854, 73.7125], label: "Udaipur Handover Point", status: "On Trip", speed: "15 km/h", route: "Jaipur → Mumbai", driver: "Harish Gehlot" }
  ];

  const depots = [
    { name: "Jaipur Central Control", pos: [26.9224, 75.7958], type: "Headquarters Depot" },
    { name: "Delhi Kashmere Gate ISBT", pos: [28.6692, 77.2285], type: "Interstate Terminal" },
    { name: "Ajmer Regional Depot", pos: [26.4499, 74.6399], type: "Sub-Depot" },
    { name: "Kota City Depot", pos: [25.1804, 75.8373], type: "Sub-Depot" },
    { name: "Udaipur Central Terminal", pos: [24.5854, 73.7125], type: "Transit Terminal" }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wide">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Geospatial Telemetry
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
            National Operations Highway Map
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time intercity corridors, live fleet positioning, emergency incident locations, and crew handover checkpoints.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Filter size={15} className="text-slate-400" />
          <span className="font-semibold text-slate-600">Layer Filter:</span>
          <select
            className="field py-1.5 text-xs w-44"
            value={selectedFilter}
            onChange={e => setSelectedFilter(e.target.value)}
          >
            <option value="ALL">Show All Layers</option>
            <option value="ACTIVE_BUSES">Active Buses Only</option>
            <option value="EMERGENCIES">Emergency Incidents Only</option>
            <option value="DEPOTS">Depots & Terminals</option>
          </select>
        </div>
      </div>

      {/* Map Container */}
      <div className="surface overflow-hidden shadow-lg border-blue-200">
        <MapContainer
          center={[26.9224, 75.7958]}
          zoom={7}
          style={{ height: "600px", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Render Route Polylines */}
          {routes.map((route, i) => {
            if (!route.coordinates || !route.coordinates.length) return null;
            return (
              <Polyline
                key={route._id || i}
                positions={route.coordinates}
                color={routeColors[i % routeColors.length]}
                weight={4}
                opacity={0.8}
              >
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold text-navy">{route.name}</p>
                    <p className="text-slate-500">{route.distance} km • ~{route.duration} hrs</p>
                    <p className="text-[11px] text-blue-600 font-semibold mt-1">Stops: {route.stops?.join(" → ")}</p>
                  </div>
                </Popup>
              </Polyline>
            );
          })}

          {/* Render Depots */}
          {(selectedFilter === "ALL" || selectedFilter === "DEPOTS") && depots.map((d, i) => (
            <CircleMarker
              key={i}
              center={d.pos}
              radius={7}
              fillColor="#2563eb"
              fillOpacity={0.9}
              color="#ffffff"
              weight={2}
            >
              <Popup>
                <div className="text-xs">
                  <p className="font-bold text-navy">🏛️ {d.name}</p>
                  <p className="text-slate-500 font-medium">{d.type}</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* Render Live Fleet Markers */}
          {(selectedFilter === "ALL" || selectedFilter === "ACTIVE_BUSES") && liveBuses.map((bus, i) => {
            const isBroken = bus.status === "Maintenance";
            return (
              <CircleMarker
                key={i}
                center={bus.pos}
                radius={isBroken ? 9 : 8}
                fillColor={isBroken ? "#e11d48" : "#10b981"}
                fillOpacity={0.95}
                color="#ffffff"
                weight={2}
              >
                <Popup>
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-navy">🚍 {bus.busId} ({bus.route})</p>
                    <p className="text-slate-600">Location: {bus.label}</p>
                    <p className="text-slate-600">Current Speed: <b>{bus.speed}</b></p>
                    <p className="text-slate-600">Captain: <b>{bus.driver}</b></p>
                    <div className="mt-1">
                      <StatusBadge value={bus.status} />
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {/* Emergency Alert Pin */}
          {(selectedFilter === "ALL" || selectedFilter === "EMERGENCIES") && (
            <CircleMarker
              center={[27.3872, 75.9582]}
              radius={11}
              fillColor="#f43f5e"
              fillOpacity={0.9}
              color="#ffffff"
              weight={3}
            >
              <Popup>
                <div className="text-xs text-rose-800 space-y-1">
                  <p className="font-bold text-sm">🚨 ACTIVE EMERGENCY: BUS-105</p>
                  <p>Type: <b>Air Suspension Failure</b></p>
                  <p>Location: Shahpura Flyover (Km 62)</p>
                  <p className="font-semibold text-blue-700">Workshop Van 04 dispatched</p>
                </div>
              </Popup>
            </CircleMarker>
          )}
        </MapContainer>
      </div>

      {/* Map Legend */}
      <div className="surface p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500 border border-white shadow-sm" />
            <span className="font-medium text-slate-700">Bus In Transit</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-blue-600 border border-white shadow-sm" />
            <span className="font-medium text-slate-700">Depot Terminal</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-600 border border-white shadow-sm animate-pulse" />
            <span className="font-medium text-slate-700">Emergency / Breakdown</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1 w-6 bg-blue-600 rounded" />
            <span className="font-medium text-slate-700">NH-48 Intercity Corridor</span>
          </div>
        </div>

        <span className="text-slate-400 font-medium">GPS Frequency: 30s Telemetry Poll</span>
      </div>
    </div>
  );
}
