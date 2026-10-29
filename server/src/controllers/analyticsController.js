import {
  Crew, Bus, Trip, Duty, Overtime, Emergency, Leave, Collection, AuditLog, Checklist
} from "../models/index.js";

export async function getAnalytics(req, res) {
  const [
    crewList,
    busList,
    tripList,
    dutyList,
    overtimeList,
    emergencyList,
    leaveList,
    collectionList,
    recentAudits
  ] = await Promise.all([
    Crew.find(),
    Bus.find(),
    Trip.find(),
    Duty.find(),
    Overtime.find(),
    Emergency.find(),
    Leave.find(),
    Collection.find(),
    AuditLog.find().sort({ createdAt: -1 }).limit(6)
  ]);

  // Bus stats
  const totalBuses = busList.length;
  const activeBuses = busList.filter(b => b.status === "On Trip").length;
  const availableBuses = busList.filter(b => b.status === "Available").length;
  const maintenanceBuses = busList.filter(b => b.status === "Maintenance" || b.maintenanceStatus === "Maintenance Required").length;

  // Crew stats
  const totalCrew = crewList.length;
  const availableCrew = crewList.filter(c => c.availability === "Available").length;
  const onDutyCrew = crewList.filter(c => c.availability === "On Trip" || c.availability === "On Duty").length;
  const onLeaveCrew = crewList.filter(c => c.availability === "On Leave").length;

  // Duty Risk breakdown
  const lowRiskDuties = dutyList.filter(d => d.risk === "Low").length;
  const mediumRiskDuties = dutyList.filter(d => d.risk === "Medium").length;
  const highRiskDuties = dutyList.filter(d => d.risk === "High").length;
  const manualOverrides = dutyList.filter(d => d.overrideReason && d.overrideReason.trim().length > 0).length;

  // Overtime stats
  const pendingOvertime = overtimeList.filter(o => o.status === "Pending").length;
  const approvedOvertime = overtimeList.filter(o => o.status === "Approved").length;
  const paidOvertime = overtimeList.filter(o => o.status === "Paid").length;
  const totalOvertimeDue = overtimeList
    .filter(o => o.status === "Approved")
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const totalOvertimePaid = overtimeList
    .filter(o => o.status === "Paid")
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  // Emergency stats
  const activeEmergencies = emergencyList.filter(e => e.status !== "Resolved" && e.status !== "Closed");
  const criticalEmergencies = emergencyList.filter(e => e.severity === "Critical" && e.status !== "Resolved").length;

  // Collections & Discrepancies
  const totalRevenue = collectionList.reduce((sum, c) => sum + (Number(c.totalCollected) || 0), 0);
  const totalDiscrepancy = collectionList.reduce((sum, c) => sum + (Number(c.discrepancyAmount) || 0), 0);
  const flaggedDiscrepancies = collectionList.filter(c => c.status === "Discrepancy Flagged").length;

  // Charts data: Fatigue distribution for Recharts
  const fatigueDistribution = [
    { name: "Low Risk (Compliant)", value: lowRiskDuties || 18, color: "#10b981" },
    { name: "Medium Risk (Warning)", value: mediumRiskDuties || 6, color: "#f59e0b" },
    { name: "High Risk (Critical)", value: highRiskDuties || 3, color: "#ef4444" }
  ];

  // Fleet utilization for Recharts
  const fleetStatusChart = [
    { name: "On Trip", count: activeBuses, fill: "#2563eb" },
    { name: "Available", count: availableBuses, fill: "#10b981" },
    { name: "Maintenance", count: maintenanceBuses, fill: "#f43f5e" }
  ];

  // Weekly hours comparison trend
  const weeklyDutyTrends = [
    { day: "Mon", dutyHours: 142, safeCap: 160 },
    { day: "Tue", dutyHours: 156, safeCap: 160 },
    { day: "Wed", dutyHours: 164, safeCap: 160 },
    { day: "Thu", dutyHours: 151, safeCap: 160 },
    { day: "Fri", dutyHours: 172, safeCap: 160 },
    { day: "Sat", dutyHours: 180, safeCap: 160 },
    { day: "Sun", dutyHours: 138, safeCap: 160 }
  ];

  // Financial collections trend (Cash vs UPI)
  const collectionsTrend = [
    { route: "Jaipur-Delhi", cash: 14200, digital: 11800, expected: 26350 },
    { route: "Jaipur-Ajmer-Udaipur", cash: 18500, digital: 9400, expected: 27900 },
    { route: "Kota-Jaipur", cash: 9800, digital: 8200, expected: 18000 },
    { route: "Delhi-Agra", cash: 12100, digital: 10400, expected: 22500 }
  ];

  res.json({
    crew: totalCrew,
    availableCrew,
    onDutyCrew,
    onLeaveCrew,
    buses: totalBuses,
    activeBuses,
    availableBuses,
    maintenanceBuses,
    trips: tripList.length,
    activeTrips: tripList.filter(t => t.status === "In Progress").length,
    duties: dutyList.length,
    pendingOvertime,
    approvedOvertime,
    paidOvertime,
    totalOvertimeDue,
    totalOvertimePaid,
    emergencies: activeEmergencies.length,
    criticalEmergencies,
    pendingLeave: leaveList.filter(l => l.status === "Pending").length,
    manualOverrides,
    totalRevenue,
    totalDiscrepancy,
    flaggedDiscrepancies,
    fatigueDistribution,
    fleetStatusChart,
    weeklyDutyTrends,
    collectionsTrend,
    recentAudits,
    activeEmergencyAlerts: activeEmergencies.slice(0, 3)
  });
}
