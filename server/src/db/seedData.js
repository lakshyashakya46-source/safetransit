import bcrypt from "bcryptjs";
import {
  User, Crew, Bus, Route, Trip, Duty, Overtime,
  Leave, Emergency, Collection, Checklist, Handover,
  AuditLog, Notification, Policy, DutySession, RestPeriod,
  OvertimeRequest, DriverWorkRecord
} from "../models/index.js";

export async function resetAndSeedDatabase() {
  console.log("[SafeTransit Seed] Purging and rebuilding operational dataset...");

  await Promise.all([
    User.deleteMany({}),
    Crew.deleteMany({}),
    Bus.deleteMany({}),
    Route.deleteMany({}),
    Trip.deleteMany({}),
    Duty.deleteMany({}),
    Overtime.deleteMany({}),
    Leave.deleteMany({}),
    Emergency.deleteMany({}),
    Collection.deleteMany({}),
    Checklist.deleteMany({}),
    Handover.deleteMany({}),
    AuditLog.deleteMany({}),
    Notification.deleteMany({}),
    Policy.deleteMany({}),
    DutySession.deleteMany({}),
    RestPeriod.deleteMany({}),
    OvertimeRequest.deleteMany({}),
    DriverWorkRecord.deleteMany({})
  ]);

  const passwordHash = await bcrypt.hash("Demo@12345", 10);

  // 1. USERS & ROLES
  const users = [
    {
      name: "Dr. Ananya Roy (Transport Authority)",
      email: "authority@demo.com",
      role: "AUTHORITY_ADMIN",
      depot: "State Transport Commissionerate",
      phone: "+91 98290 10002",
      password: passwordHash
    },
    {
      name: "Vikram Rathore (Depot Officer)",
      email: "officer@demo.com",
      role: "DEPOT_OFFICER",
      depot: "Jaipur Central Depot",
      phone: "+91 98290 10003",
      password: passwordHash
    },
    {
      name: "Rameshwar Singh (Driver)",
      email: "driver@demo.com",
      role: "DRIVER",
      depot: "Jaipur Central Depot",
      phone: "+91 98290 10004",
      password: passwordHash
    },
    {
      name: "Sanjay Kumar Verma (Conductor)",
      email: "conductor@demo.com",
      role: "CONDUCTOR",
      depot: "Jaipur Central Depot",
      phone: "+91 98290 10005",
      password: passwordHash
    },
    {
      name: "Meenakshi Sundaram (Accounts Officer)",
      email: "accounts@demo.com",
      role: "ACCOUNTS",
      depot: "Finance & Audit Division",
      phone: "+91 98290 10006",
      password: passwordHash
    }
  ];
  await User.insertMany(users);

  // 2. CREW (DRIVERS & CONDUCTORS)
  const driverNames = [
    "Rameshwar Singh", "Mukesh Meena", "Harish Gehlot", "Suresh Choudhary",
    "Dharmendra Yadav", "Nandkishore Sharma", "Pawan Gurjar", "Om Prakash Jat",
    "Dilip Chauhan", "Bhanwar Lal", "Kailash Chand", "Deepak Verma",
    "Ashok Kumar", "Satyanarayan", "Jagdish Prasad", "Mahendra Bishnoi"
  ];

  const conductorNames = [
    "Sanjay Kumar Verma", "Mohan Lal Saini", "Rajendra Prasad", "Sunil Sharma",
    "Vinod Kumar", "Devendra Singh", "Gopal Krishan", "Manoj Tiwari"
  ];

  const depots = ["Jaipur Central", "Delhi ISBT", "Ajmer Depot", "Kota Depot", "Udaipur Depot", "Alwar Depot"];

  const crewList = [];

  driverNames.forEach((name, i) => {
    crewList.push({
      name,
      employeeId: `DRV-${1001 + i}`,
      role: "DRIVER",
      depot: depots[i % depots.length],
      phone: `+91 98290 ${20000 + i}`,
      licenseNumber: `RJ-14-201${5 + (i % 8)}-${1000 + i}`,
      experienceYears: 6 + (i % 12),
      verified: true,
      availability: i === 3 ? "On Leave" : i === 7 ? "Rest Period" : i < 6 ? "On Trip" : "Available",
      workingHours: i % 4 === 0 ? 9.5 : 6.5,
      drivingHours: i % 4 === 0 ? 7.5 : 5.0,
      restHours: i === 2 ? 7.5 : i === 5 ? 9.0 : 13.5,
      weeklyHours: i % 3 === 0 ? 44.0 : 32.5,
      consecutiveDays: (i % 6) + 1,
      lastDutyEndTime: "2026-10-20T18:00:00.000Z"
    });
  });

  conductorNames.forEach((name, i) => {
    crewList.push({
      name,
      employeeId: `CND-${2001 + i}`,
      role: "CONDUCTOR",
      depot: depots[i % depots.length],
      phone: `+91 98290 ${30000 + i}`,
      licenseNumber: `CND-RJ14-${2000 + i}`,
      experienceYears: 4 + (i % 8),
      verified: true,
      availability: i === 1 ? "On Leave" : i < 4 ? "On Trip" : "Available",
      workingHours: 7.0,
      drivingHours: 0,
      restHours: 12.0,
      weeklyHours: 35.0,
      consecutiveDays: 3,
      lastDutyEndTime: "2026-10-20T19:30:00.000Z"
    });
  });
  await Crew.insertMany(crewList);

  // 3. BUS FLEET
  const busesData = [
    {
      busId: "BUS-101",
      registration: "RJ14-PA-1011",
      depot: "Jaipur Central",
      model: "Volvo 9600 Multi-Axle Luxury AC",
      capacity: 53,
      fuelType: "Diesel BS-VI",
      status: "On Trip",
      maintenanceStatus: "OK",
      lastInspectionDate: "2026-10-20",
      odometerKm: 78450
    },
    {
      busId: "BUS-102",
      registration: "RJ14-PA-1012",
      depot: "Jaipur Central",
      model: "Tata Starbus Ultra AC",
      capacity: 48,
      fuelType: "CNG Express",
      status: "Available",
      maintenanceStatus: "OK",
      lastInspectionDate: "2026-10-19",
      odometerKm: 54120
    },
    {
      busId: "BUS-103",
      registration: "RJ14-PA-1013",
      depot: "Delhi ISBT",
      model: "Ashok Leyland Viking Intercity",
      capacity: 52,
      fuelType: "Diesel BS-VI",
      status: "On Trip",
      maintenanceStatus: "OK",
      lastInspectionDate: "2026-10-20",
      odometerKm: 92300
    },
    {
      busId: "BUS-104",
      registration: "RJ14-PA-1014",
      depot: "Ajmer Depot",
      model: "Eicher Skyline Pro Electric",
      capacity: 42,
      fuelType: "Pure EV",
      status: "Available",
      maintenanceStatus: "OK",
      lastInspectionDate: "2026-10-20",
      odometerKm: 31200
    },
    {
      busId: "BUS-105",
      registration: "RJ14-PA-1015",
      depot: "Jaipur Central",
      model: "Volvo B11R Multi-Axle",
      capacity: 53,
      fuelType: "Diesel BS-VI",
      status: "Maintenance",
      maintenanceStatus: "Maintenance Required",
      lastInspectionDate: "2026-10-18",
      odometerKm: 142100
    },
    {
      busId: "BUS-106",
      registration: "RJ14-PA-1016",
      depot: "Kota Depot",
      model: "Tata Starbus Ultra",
      capacity: 48,
      fuelType: "Diesel BS-VI",
      status: "On Trip",
      maintenanceStatus: "OK",
      lastInspectionDate: "2026-10-20",
      odometerKm: 63400
    },
    {
      busId: "BUS-107",
      registration: "RJ14-PA-1017",
      depot: "Udaipur Depot",
      model: "Ashok Leyland 13.5M Super Express",
      capacity: 55,
      fuelType: "Diesel BS-VI",
      status: "Available",
      maintenanceStatus: "OK",
      lastInspectionDate: "2026-10-19",
      odometerKm: 81900
    },
    {
      busId: "BUS-108",
      registration: "RJ14-PA-1018",
      depot: "Jaipur Central",
      model: "Volvo 9600 Luxury AC",
      capacity: 53,
      fuelType: "Diesel BS-VI",
      status: "On Trip",
      maintenanceStatus: "OK",
      lastInspectionDate: "2026-10-20",
      odometerKm: 48200
    }
  ];
  await Bus.insertMany(busesData);

  // 4. ROUTES
  const routesData = [
    {
      name: "Jaipur → Delhi Express Corridor (NH-48)",
      source: "Jaipur Central Bus Station",
      destination: "Delhi Kashmere Gate ISBT",
      distance: 268,
      duration: 5.0,
      stops: ["Jaipur Sindhi Camp", "Shahpura", "Kotputli", "Neemrana Hub", "Behror", "Gurgaon IFFCO", "Delhi ISBT"],
      changePoints: ["Jaipur Sindhi Camp", "Neemrana Transit Hub", "Delhi ISBT"],
      coordinates: [
        [26.9224, 75.7958],
        [27.3872, 75.9582],
        [27.7088, 76.2046],
        [27.9865, 76.3846],
        [28.0125, 76.4382],
        [28.4721, 77.0725],
        [28.6692, 77.2285]
      ]
    },
    {
      name: "Jaipur → Ajmer → Udaipur Heritage Transit",
      source: "Jaipur Central Bus Station",
      destination: "Udaipur City Depot",
      distance: 410,
      duration: 7.5,
      stops: ["Jaipur", "Kishangarh Bypass", "Ajmer Bus Stand", "Beawar", "Bhilwara Bypass", "Udaipur"],
      changePoints: ["Jaipur", "Ajmer Bus Stand", "Udaipur"],
      coordinates: [
        [26.9224, 75.7958],
        [26.5746, 74.8624],
        [26.4499, 74.6399],
        [26.1011, 74.3214],
        [25.3475, 74.6342],
        [24.5854, 73.7125]
      ]
    },
    {
      name: "Jaipur → Ahmedabad → Mumbai Mega Transit",
      source: "Jaipur Central Bus Station",
      destination: "Mumbai Borivali Terminal",
      distance: 1150,
      duration: 20.0,
      stops: ["Jaipur", "Ajmer", "Udaipur", "Ahmedabad Geeta Mandir", "Vadodara", "Surat Ring Road", "Mumbai Borivali"],
      changePoints: ["Jaipur", "Udaipur", "Ahmedabad Geeta Mandir", "Surat", "Mumbai Borivali"],
      coordinates: [
        [26.9224, 75.7958],
        [26.4499, 74.6399],
        [24.5854, 73.7125],
        [23.0225, 72.5714],
        [22.3072, 73.1812],
        [21.1702, 72.8311],
        [19.2288, 72.8541]
      ]
    },
    {
      name: "Delhi → Jaipur → Agra Golden Triangle",
      source: "Delhi Kashmere Gate ISBT",
      destination: "Agra Idgah Bus Stand",
      distance: 490,
      duration: 9.0,
      stops: ["Delhi ISBT", "Gurgaon", "Neemrana", "Jaipur Sindhi Camp", "Dausa", "Bharatpur", "Agra Idgah"],
      changePoints: ["Delhi ISBT", "Jaipur Sindhi Camp", "Agra Idgah"],
      coordinates: [
        [28.6692, 77.2285],
        [28.4721, 77.0725],
        [27.9865, 76.3846],
        [26.9224, 75.7958],
        [26.8924, 76.3382],
        [27.2152, 77.5030],
        [27.1767, 78.0081]
      ]
    },
    {
      name: "Kota → Jaipur Intercity Link",
      source: "Kota Central Bus Stand",
      destination: "Jaipur Central Bus Station",
      distance: 250,
      duration: 4.5,
      stops: ["Kota", "Bundi", "Deoli", "Tonk", "Jaipur"],
      changePoints: ["Kota", "Jaipur"],
      coordinates: [
        [25.1804, 75.8373],
        [25.4415, 75.6441],
        [25.7584, 75.3812],
        [26.1664, 75.7885],
        [26.9224, 75.7958]
      ]
    }
  ];
  await Route.insertMany(routesData);

  // 5. TRIPS
  const tripsData = [
    {
      tripId: "TRIP-2026-081",
      route: "Jaipur → Delhi Express Corridor (NH-48)",
      bus: "BUS-101",
      source: "Jaipur Central Bus Station",
      destination: "Delhi Kashmere Gate ISBT",
      date: "2026-10-21",
      startTime: "06:30",
      endTime: "11:30",
      status: "In Progress",
      driver: "Rameshwar Singh",
      conductor: "Sanjay Kumar Verma",
      segments: [
        { leg: 1, from: "Jaipur", to: "Neemrana Hub", driver: "Rameshwar Singh", conductor: "Sanjay Kumar Verma", status: "Completed" },
        { leg: 2, from: "Neemrana Hub", to: "Delhi ISBT", driver: "Rameshwar Singh", conductor: "Sanjay Kumar Verma", status: "In Progress" }
      ]
    },
    {
      tripId: "TRIP-2026-082",
      route: "Jaipur → Ajmer → Udaipur Heritage Transit",
      bus: "BUS-103",
      source: "Jaipur Central Bus Station",
      destination: "Udaipur City Depot",
      date: "2026-10-21",
      startTime: "07:15",
      endTime: "14:45",
      status: "In Progress",
      driver: "Mukesh Meena",
      conductor: "Mohan Lal Saini",
      segments: [
        { leg: 1, from: "Jaipur", to: "Ajmer", driver: "Mukesh Meena", conductor: "Mohan Lal Saini", status: "Completed" },
        { leg: 2, from: "Ajmer", to: "Udaipur", driver: "Mukesh Meena", conductor: "Mohan Lal Saini", status: "In Progress" }
      ]
    },
    {
      tripId: "TRIP-2026-083",
      route: "Jaipur → Ahmedabad → Mumbai Mega Transit",
      bus: "BUS-108",
      source: "Jaipur Central Bus Station",
      destination: "Mumbai Borivali Terminal",
      date: "2026-10-21",
      startTime: "14:00",
      endTime: "10:00 (+1 day)",
      status: "Scheduled",
      driver: "Harish Gehlot",
      conductor: "Rajendra Prasad",
      segments: [
        { leg: 1, from: "Jaipur", to: "Udaipur", driver: "Harish Gehlot", status: "Scheduled" },
        { leg: 2, from: "Udaipur", to: "Ahmedabad", driver: "Dharmendra Yadav", status: "Handover Scheduled" },
        { leg: 3, from: "Ahmedabad", to: "Mumbai", driver: "Kailash Chand", status: "Handover Scheduled" }
      ]
    },
    {
      tripId: "TRIP-2026-084",
      route: "Kota → Jaipur Intercity Link",
      bus: "BUS-106",
      source: "Kota Central Bus Stand",
      destination: "Jaipur Central Bus Station",
      date: "2026-10-21",
      startTime: "08:00",
      endTime: "12:30",
      status: "In Progress",
      driver: "Nandkishore Sharma",
      conductor: "Sunil Sharma",
      segments: [
        { leg: 1, from: "Kota", to: "Jaipur", driver: "Nandkishore Sharma", conductor: "Sunil Sharma", status: "In Progress" }
      ]
    },
    {
      tripId: "TRIP-2026-085",
      route: "Jaipur → Delhi Express Corridor (NH-48)",
      bus: "BUS-102",
      source: "Jaipur Central Bus Station",
      destination: "Delhi Kashmere Gate ISBT",
      date: "2026-10-21",
      startTime: "16:00",
      endTime: "21:00",
      status: "Scheduled",
      driver: "Pawan Gurjar",
      conductor: "Vinod Kumar",
      segments: [
        { leg: 1, from: "Jaipur", to: "Delhi ISBT", driver: "Pawan Gurjar", conductor: "Vinod Kumar", status: "Scheduled" }
      ]
    }
  ];
  await Trip.insertMany(tripsData);

  // 6. DUTIES & SMART ASSIGNMENTS
  const dutiesData = [
    {
      dutyId: "DUTY-701",
      trip: "TRIP-2026-081",
      routeName: "Jaipur → Delhi Express Corridor (NH-48)",
      busId: "BUS-101",
      crew: "Rameshwar Singh",
      crewRole: "DRIVER",
      depot: "Jaipur Central",
      start: "2026-10-21T06:30:00.000Z",
      end: "2026-10-21T11:30:00.000Z",
      workingHours: 5.0,
      drivingHours: 4.5,
      restBefore: 13.5,
      weeklyHours: 32.5,
      consecutiveDays: 3,
      risk: "Low",
      eligibility: "Eligible",
      status: "Active"
    },
    {
      dutyId: "DUTY-702",
      trip: "TRIP-2026-081",
      routeName: "Jaipur → Delhi Express Corridor (NH-48)",
      busId: "BUS-101",
      crew: "Sanjay Kumar Verma",
      crewRole: "CONDUCTOR",
      depot: "Jaipur Central",
      start: "2026-10-21T06:30:00.000Z",
      end: "2026-10-21T11:30:00.000Z",
      workingHours: 5.0,
      drivingHours: 0,
      restBefore: 12.0,
      weeklyHours: 35.0,
      consecutiveDays: 3,
      risk: "Low",
      eligibility: "Eligible",
      status: "Active"
    },
    {
      dutyId: "DUTY-703",
      trip: "TRIP-2026-082",
      routeName: "Jaipur → Ajmer → Udaipur Heritage Transit",
      busId: "BUS-103",
      crew: "Mukesh Meena",
      crewRole: "DRIVER",
      depot: "Delhi ISBT",
      start: "2026-10-21T07:15:00.000Z",
      end: "2026-10-21T14:45:00.000Z",
      workingHours: 7.5,
      drivingHours: 6.5,
      restBefore: 11.0,
      weeklyHours: 39.0,
      consecutiveDays: 4,
      risk: "Low",
      eligibility: "Eligible",
      status: "Completed"
    },
    {
      dutyId: "DUTY-704",
      trip: "TRIP-2026-079",
      routeName: "Delhi → Jaipur → Agra Golden Triangle",
      busId: "BUS-104",
      crew: "Harish Gehlot",
      crewRole: "DRIVER",
      depot: "Ajmer Depot",
      start: "2026-10-20T10:00:00.000Z",
      end: "2026-10-20T21:00:00.000Z",
      workingHours: 11.0,
      drivingHours: 8.5,
      restBefore: 7.5,
      weeklyHours: 46.5,
      consecutiveDays: 6,
      risk: "High",
      eligibility: "Not Eligible",
      overrideReason: "Emergency staff shortage: previous driver reported severe fever at Bharatpur checkpoint.",
      overriddenBy: "Vikram Rathore (Depot Officer)",
      status: "Completed"
    },
    {
      dutyId: "DUTY-705",
      trip: "TRIP-2026-084",
      routeName: "Kota → Jaipur Intercity Link",
      busId: "BUS-106",
      crew: "Nandkishore Sharma",
      crewRole: "DRIVER",
      depot: "Kota Depot",
      start: "2026-10-21T08:00:00.000Z",
      end: "2026-10-21T12:30:00.000Z",
      workingHours: 4.5,
      drivingHours: 4.0,
      restBefore: 14.0,
      weeklyHours: 28.0,
      consecutiveDays: 2,
      risk: "Low",
      eligibility: "Eligible",
      status: "Active"
    }
  ];
  await Duty.insertMany(dutiesData);

  // 7. OVERTIME RECORDS
  const overtimeData = [
    {
      crew: "Rameshwar Singh",
      employeeId: "DRV-1001",
      role: "DRIVER",
      tripId: "TRIP-2026-081",
      requestedHours: 2.5,
      reason: "Heavy traffic jam near Behror flyover due to commercial truck overturning on NH-48.",
      rate: 350,
      amount: 875,
      status: "Approved",
      decisionReason: "Verified GPS delay and highway patrol traffic advisory.",
      approvedBy: "Vikram Rathore (Depot Officer)",
      paidAt: "2026-10-21T02:00:00.000Z",
      paymentRef: "PAY-OT-9841"
    },
    {
      crew: "Mukesh Meena",
      employeeId: "DRV-1002",
      role: "DRIVER",
      tripId: "TRIP-2026-082",
      requestedHours: 3.0,
      reason: "Assisted stranded passenger bus at Kishangarh bypass as per Control Room instruction.",
      rate: 350,
      amount: 1050,
      status: "Pending",
      decisionReason: "Awaiting depot officer operational review.",
      approvedBy: ""
    },
    {
      crew: "Sanjay Kumar Verma",
      employeeId: "CND-2001",
      role: "CONDUCTOR",
      tripId: "TRIP-2026-081",
      requestedHours: 2.5,
      reason: "Duty extended due to highway roadblock; handled passenger water and ticketing settlement.",
      rate: 350,
      amount: 875,
      status: "Approved",
      decisionReason: "Approved along with driver overtime.",
      approvedBy: "Vikram Rathore (Depot Officer)"
    },
    {
      crew: "Dharmendra Yadav",
      employeeId: "DRV-1005",
      role: "DRIVER",
      tripId: "TRIP-2026-077",
      requestedHours: 4.5,
      reason: "Consecutive return trip without scheduled relief driver.",
      rate: 350,
      amount: 1575,
      status: "Rejected",
      decisionReason: "Policy violation: Total duty would exceed maximum safe limit of 14 continuous hours.",
      approvedBy: "Vikram Rathore (Depot Officer)"
    }
  ];
  await Overtime.insertMany(overtimeData);

  // 8. LEAVE REQUESTS & AUTO-REPLACEMENT
  const leaveData = [
    {
      crew: "Suresh Choudhary",
      employeeId: "DRV-1004",
      role: "DRIVER",
      depot: "Jaipur Central",
      type: "Medical Leave",
      start: "2026-10-21",
      end: "2026-10-24",
      reason: "Acute back spasm diagnosed by district civil hospital; advised 3 days bed rest.",
      status: "Approved",
      replacementStatus: "Replacement Assigned",
      replacementCrew: "Dilip Chauhan (DRV-1009)"
    },
    {
      crew: "Mohan Lal Saini",
      employeeId: "CND-2002",
      role: "CONDUCTOR",
      depot: "Ajmer Depot",
      type: "Family Emergency",
      start: "2026-10-22",
      end: "2026-10-23",
      reason: "Family elder hospitalization in Ajmer.",
      status: "Pending",
      replacementStatus: "Replacement Suggested",
      replacementCrew: "Devendra Singh (CND-2006)"
    },
    {
      crew: "Kailash Chand",
      employeeId: "DRV-1011",
      role: "DRIVER",
      depot: "Kota Depot",
      type: "Casual Leave",
      start: "2026-10-25",
      end: "2026-10-26",
      reason: "Daughter's school admission ceremony.",
      status: "Pending",
      replacementStatus: "Not Required",
      replacementCrew: ""
    }
  ];
  await Leave.insertMany(leaveData);

  // 9. EMERGENCY INCIDENTS
  const emergencyData = [
    {
      emergencyId: "EMG-2026-012",
      type: "Breakdown",
      bus: "BUS-105",
      crew: "Dharmendra Yadav",
      route: "Jaipur → Delhi Express Corridor (NH-48)",
      location: "Near Shahpura Flyover (Km 62)",
      description: "Air compressor pressure drop alert on dashboard. Rear pneumatic suspension not inflating.",
      severity: "High",
      status: "Responding",
      responseNotes: "Depot mobile workshop team (Van 04) dispatched from Shahpura sub-station. Relief bus BUS-102 placed on standby.",
      reportedAt: "2026-10-21T01:15:00.000Z"
    },
    {
      emergencyId: "EMG-2026-011",
      type: "Medical Emergency",
      bus: "BUS-101",
      crew: "Rameshwar Singh",
      route: "Jaipur → Delhi Express Corridor (NH-48)",
      location: "Neemrana Transit Hub",
      description: "Elderly male passenger (Seat 22) experienced acute shortness of breath and dizziness.",
      severity: "Critical",
      status: "Resolved",
      responseNotes: "108 Emergency Ambulance escorted passenger to Neemrana Trauma Centre. Conductor assisted family. Trip resumed with 20m delay.",
      reportedAt: "2026-10-20T16:30:00.000Z",
      resolvedAt: "2026-10-20T17:15:00.000Z"
    },
    {
      emergencyId: "EMG-2026-010",
      type: "Route Obstruction",
      bus: "BUS-106",
      crew: "Nandkishore Sharma",
      route: "Kota → Jaipur Intercity Link",
      location: "Tonk Bypass Bridge",
      description: "Protest march with tractor barrier on state highway. Diversion via Deoli bypass recommended.",
      severity: "Medium",
      status: "Resolved",
      responseNotes: "Local police cleared single-lane traffic. Safe transit escort provided. Bus arrived on schedule +15m.",
      reportedAt: "2026-10-20T11:00:00.000Z",
      resolvedAt: "2026-10-20T12:00:00.000Z"
    }
  ];
  await Emergency.insertMany(emergencyData);

  // 10. CONDUCTOR TICKET & COLLECTIONS
  const collectionData = [
    {
      collectionId: "COL-501",
      trip: "TRIP-2026-081",
      routeName: "Jaipur → Delhi Express Corridor (NH-48)",
      busId: "BUS-101",
      conductor: "Sanjay Kumar Verma",
      date: "2026-10-21",
      totalTickets: 51,
      standardCount: 42,
      concessionCount: 6,
      passCount: 3,
      luggageCount: 4,
      cashCollected: 14200,
      digitalCollected: 11800,
      totalCollected: 26000,
      expectedAmount: 26350,
      discrepancyAmount: -350,
      status: "Discrepancy Flagged",
      explanation: "Network timeout at Neemrana hub caused one passenger QR payment of ₹350 to pend in banking gateway. Conductor collected phone number and utr screenshot.",
      remarks: "Accounts review pending verification against bank settlement batch."
    },
    {
      collectionId: "COL-502",
      trip: "TRIP-2026-078",
      routeName: "Jaipur → Ajmer → Udaipur Heritage Transit",
      busId: "BUS-103",
      conductor: "Mohan Lal Saini",
      date: "2026-10-20",
      totalTickets: 47,
      standardCount: 38,
      concessionCount: 5,
      passCount: 4,
      luggageCount: 2,
      cashCollected: 18500,
      digitalCollected: 9400,
      totalCollected: 27900,
      expectedAmount: 27900,
      discrepancyAmount: 0,
      status: "Reconciled",
      explanation: "",
      remarks: "100% matched with electronic ticketing machine (ETM) audit summary."
    },
    {
      collectionId: "COL-503",
      trip: "TRIP-2026-076",
      routeName: "Kota → Jaipur Intercity Link",
      busId: "BUS-106",
      conductor: "Sunil Sharma",
      date: "2026-10-20",
      totalTickets: 45,
      standardCount: 39,
      concessionCount: 4,
      passCount: 2,
      luggageCount: 3,
      cashCollected: 9800,
      digitalCollected: 8200,
      totalCollected: 18000,
      expectedAmount: 18000,
      discrepancyAmount: 0,
      status: "Reconciled",
      explanation: "",
      remarks: "Deposited at Jaipur Central Cash Counter."
    }
  ];
  await Collection.insertMany(collectionData);

  // 11. PRE-TRIP VEHICLE CHECKLIST
  const checklistData = [
    {
      checklistId: "CHK-901",
      busId: "BUS-101",
      driverName: "Rameshwar Singh",
      date: "2026-10-21T06:15:00.000Z",
      brakes: "Pass",
      tyres: "Pass",
      steering: "Pass",
      lights: "Pass",
      horn: "Pass",
      emergencyExits: "Pass",
      firstAidFireExtinguisher: "Pass",
      engineFluids: "Pass",
      overallStatus: "Pass",
      notes: "Tyre pressure verified at 120 PSI. First-aid kit sealed. Air conditioning cooling normal."
    },
    {
      checklistId: "CHK-902",
      busId: "BUS-105",
      driverName: "Dharmendra Yadav",
      date: "2026-10-18T14:00:00.000Z",
      brakes: "Fail - Air Leak Detected",
      tyres: "Pass",
      steering: "Pass",
      lights: "Pass",
      horn: "Pass",
      emergencyExits: "Pass",
      firstAidFireExtinguisher: "Pass",
      engineFluids: "Pass",
      overallStatus: "Fail - Maintenance Required",
      notes: "Hissing sound from rear brake actuator valve when pedal released. Immediate workshop repair required."
    }
  ];
  await Checklist.insertMany(checklistData);

  // 12. DIGITAL HANDOVERS
  const handoverData = [
    {
      handoverId: "HND-301",
      tripId: "TRIP-2026-083",
      busId: "BUS-108",
      routeName: "Jaipur → Ahmedabad → Mumbai Mega Transit",
      outgoingCrew: "Harish Gehlot (DRV-1003)",
      incomingCrew: "Dharmendra Yadav (DRV-1005)",
      location: "Udaipur City Bus Station (Leg 2 Handover Point)",
      scheduledTime: "2026-10-21T21:30:00.000Z",
      actualTime: "2026-10-21T21:35:00.000Z",
      odometer: 48610,
      fuelLevel: "85% Full",
      mismatchDetected: "None",
      status: "Completed"
    },
    {
      handoverId: "HND-302",
      tripId: "TRIP-2026-081",
      busId: "BUS-101",
      routeName: "Jaipur → Delhi Express Corridor (NH-48)",
      outgoingCrew: "Rameshwar Singh (DRV-1001)",
      incomingCrew: "Deepak Verma (DRV-1012)",
      location: "Neemrana Transit Hub",
      scheduledTime: "2026-10-21T09:00:00.000Z",
      actualTime: "2026-10-21T09:05:00.000Z",
      odometer: 78590,
      fuelLevel: "90% Full",
      mismatchDetected: "None",
      status: "Completed"
    }
  ];
  await Handover.insertMany(handoverData);

  // 13. AUDIT LOGS
  const auditLogsData = [
    {
      user: "Vikram Rathore",
      role: "DEPOT_OFFICER",
      action: "MANUAL_OVERRIDE_ASSIGNMENT",
      entity: "Duty",
      entityId: "DUTY-704",
      reason: "Emergency relief replacement: previous driver reported severe fever at Bharatpur checkpoint.",
      previous: { crew: "Unassigned", eligibility: "Pending" },
      newValue: { crew: "Harish Gehlot", eligibility: "Overridden", risk: "High" },
      timestamp: "2026-10-20T10:05:00.000Z"
    },
    {
      user: "Vikram Rathore",
      role: "DEPOT_OFFICER",
      action: "OVERTIME_APPROVED",
      entity: "Overtime",
      entityId: "PAY-OT-9841",
      reason: "Approved 2.5 hours extra driving due to accident-induced roadblock on NH-48.",
      previous: { status: "Pending" },
      newValue: { status: "Approved", amount: 875 },
      timestamp: "2026-10-21T01:50:00.000Z"
    },
    {
      user: "Meenakshi Sundaram",
      role: "ACCOUNTS",
      action: "OVERTIME_DISBURSED",
      entity: "OvertimePayment",
      entityId: "PAY-OT-9841",
      reason: "Disbursed ₹875 to Rameshwar Singh via Treasury Direct Benefit Transfer voucher.",
      previous: { status: "Approved" },
      newValue: { status: "Paid", paymentRef: "PAY-OT-9841" },
      timestamp: "2026-10-21T02:00:00.000Z"
    },
    {
      user: "Vikram Rathore",
      role: "DEPOT_OFFICER",
      action: "LEAVE_REPLACEMENT_ACCEPTED",
      entity: "LeaveRequest",
      entityId: "LEV-1004",
      reason: "Assigned Dilip Chauhan as replacement for Suresh Choudhary for 3-day medical leave window.",
      previous: { replacementStatus: "Suggested" },
      newValue: { replacementStatus: "Assigned", replacementCrew: "Dilip Chauhan" },
      timestamp: "2026-10-21T02:10:00.000Z"
    },
    {
      user: "Dr. Ananya Roy",
      role: "AUTHORITY_ADMIN",
      action: "POLICY_UPDATED",
      entity: "DepartmentPolicy",
      entityId: "POL-001",
      reason: "Adjusted minimum mandatory rest hours from 9.0 to 10.0 hours as per State Safety Directive.",
      previous: { minRestHours: 9.0 },
      newValue: { minRestHours: 10.0 },
      timestamp: "2026-10-20T08:30:00.000Z"
    }
  ];
  await AuditLog.insertMany(auditLogsData);

  // 14. NOTIFICATIONS
  const notificationsData = [
    {
      user: "officer@demo.com",
      role: "DEPOT_OFFICER",
      title: "Active Emergency Alert",
      message: "Bus BUS-105 reported air suspension leak near Shahpura (Km 62). Workshop van dispatched.",
      type: "emergency",
      read: false,
      createdAt: "2026-10-21T01:16:00.000Z"
    },
    {
      user: "officer@demo.com",
      role: "DEPOT_OFFICER",
      title: "Crew Replacement Required",
      message: "Mohan Lal Saini filed urgent family leave for tomorrow. Suggested replacement: Devendra Singh (CND-2006).",
      type: "warning",
      read: false,
      createdAt: "2026-10-21T02:05:00.000Z"
    },
    {
      user: "driver@demo.com",
      role: "DRIVER",
      title: "Duty Assigned: Jaipur → Delhi",
      message: "Your duty for Trip TRIP-2026-081 on Bus BUS-101 is scheduled for 06:30 AM.",
      type: "info",
      read: true,
      createdAt: "2026-10-20T20:00:00.000Z"
    },
    {
      user: "accounts@demo.com",
      role: "ACCOUNTS",
      title: "Fare Collection Discrepancy",
      message: "Trip TRIP-2026-081 reported -₹350 variance. Conductor explanation awaiting accounts review.",
      type: "warning",
      read: false,
      createdAt: "2026-10-21T02:15:00.000Z"
    }
  ];
  await Notification.insertMany(notificationsData);

  // 15. POLICY
  await Policy.create({
    version: "POL-v2.4",
    normalRestHours: 13.0,
    minRestThresholdForOvertime: 9.0,
    maxDutyHours: 10.0,
    maxDrivingHours: 8.0,
    minRestHours: 10.0,
    weeklyLimit: 48.0,
    overtimeThreshold: 8.0,
    maxConsecutiveDays: 6,
    nightShiftMultiplier: 1.25,
    hourlyOvertimeRateINR: 350.0,
    mandatoryBreakIntervalHours: 4.5,
    mandatoryBreakMinutes: 30
  });

  // 16. DRIVER DUTY LIFECYCLE & OVERTIME DEMONSTRATION SCENARIOS
  await seedDutyLifecycleScenarios();

  console.log("[SafeTransit Seed] ✓ Successfully seeded 19 interconnected models with rich Indian transport operations data.");
}

export async function seedDutyLifecycleScenarios() {
  const now = Date.now();

  // 1. Rameshwar Singh: Active on Shift with Live Duty Timer running
  const rameshwarStart = new Date(now - 4.25 * 3600 * 1000).toISOString();
  await DutySession.create({
    dutyId: "DUTY-SES-701",
    driverId: "3phteg7bmvicj1cl",
    driverName: "Rameshwar Singh",
    employeeId: "DRV-1001",
    busId: "BUS-101",
    routeId: "RT-101",
    routeName: "Jaipur → Delhi Express Corridor (NH-48)",
    tripId: "TRIP-2026-081",
    depot: "Jaipur Central",
    policyVersion: "POL-v2.4",
    status: "ACTIVE",
    startTime: rameshwarStart,
    endTime: null,
    scheduledHours: 8.0,
    elapsedDutyHours: 4.25,
    actualDrivingHours: 3.5,
    totalBreakMinutes: 30,
    breaks: [
      {
        breakId: "BRK-701",
        startTime: new Date(now - 2.5 * 3600 * 1000).toISOString(),
        endTime: new Date(now - 2.0 * 3600 * 1000).toISOString(),
        durationMinutes: 30,
        reason: "Mandatory 30m Highway Refreshment & Vehicle Check"
      }
    ],
    fatigueScoreStart: 15,
    riskLevel: "Low"
  });

  // 2. Mukesh Meena: Duty completed 3.5h ago, Rest in progress (< 9h), Start Duty BLOCKED
  const mukeshDutyEnd = new Date(now - 3.5 * 3600 * 1000).toISOString();
  const mukeshDutyStart = new Date(now - 11.5 * 3600 * 1000).toISOString();
  await DutySession.create({
    dutyId: "DUTY-SES-702",
    driverId: "drv-1002",
    driverName: "Mukesh Meena",
    employeeId: "DRV-1002",
    busId: "BUS-102",
    routeId: "RT-102",
    routeName: "Jaipur → Ajmer Heritage Intercity",
    tripId: "TRIP-2026-082",
    depot: "Jaipur Central",
    policyVersion: "POL-v2.4",
    status: "COMPLETED",
    startTime: mukeshDutyStart,
    endTime: mukeshDutyEnd,
    scheduledHours: 8.0,
    elapsedDutyHours: 8.0,
    actualDrivingHours: 7.0,
    totalBreakMinutes: 45,
    fatigueScoreStart: 15,
    fatigueScoreEnd: 55,
    riskLevel: "Low"
  });
  await RestPeriod.create({
    driverId: "drv-1002",
    driverName: "Mukesh Meena",
    dutySessionId: "DUTY-SES-702",
    restStartTime: mukeshDutyEnd,
    restEndTime: null,
    requiredRestHours: 13.0,
    minOvertimeThreshold: 9.0,
    continuousRestHours: 3.5,
    eligibilityStatus: "RESTING_INELIGIBLE",
    policyVersion: "POL-v2.4",
    isComplete: false,
    notes: "Mandatory rest in progress after completing Jaipur - Ajmer shift. Duty start locked."
  });
  await OvertimeRequest.create({
    requestId: "OTR-2026-901",
    driverId: "drv-1002",
    driverName: "Mukesh Meena",
    employeeId: "DRV-1002",
    requestedHours: 2.0,
    reason: "Requested late night Ajmer shuttle run without meeting statutory rest requirement",
    isEmergency: false,
    status: "BLOCKED_BY_REST_RULE",
    blockReason: "Rest Rule Violation: Driver has accumulated only 3.5h continuous rest. Policy requires minimum 9.0h continuous rest before any overtime can be considered (Deficit: 5.5h).",
    hourlyRateINR: 350.0,
    approvedAmountINR: 0,
    createdAt: new Date(now - 1.0 * 3600 * 1000).toISOString()
  });

  // 3. Harish Gehlot: Duty completed 9.5h ago, Rest in progress (>= 9h), Overtime Requested & PENDING APPROVAL
  const harishDutyEnd = new Date(now - 9.5 * 3600 * 1000).toISOString();
  const harishDutyStart = new Date(now - 17.5 * 3600 * 1000).toISOString();
  await DutySession.create({
    dutyId: "DUTY-SES-703",
    driverId: "drv-1003",
    driverName: "Harish Gehlot",
    employeeId: "DRV-1003",
    busId: "BUS-103",
    routeId: "RT-103",
    routeName: "Delhi → Jaipur → Agra Golden Triangle",
    tripId: "TRIP-2026-083",
    depot: "Ajmer Depot",
    policyVersion: "POL-v2.4",
    status: "COMPLETED",
    startTime: harishDutyStart,
    endTime: harishDutyEnd,
    scheduledHours: 8.0,
    elapsedDutyHours: 8.0,
    actualDrivingHours: 6.8,
    totalBreakMinutes: 40,
    riskLevel: "Low"
  });
  await RestPeriod.create({
    driverId: "drv-1003",
    driverName: "Harish Gehlot",
    dutySessionId: "DUTY-SES-703",
    restStartTime: harishDutyEnd,
    restEndTime: null,
    requiredRestHours: 13.0,
    minOvertimeThreshold: 9.0,
    continuousRestHours: 9.5,
    eligibilityStatus: "OVERTIME_ELIGIBLE_ONLY_WITH_APPROVAL",
    policyVersion: "POL-v2.4",
    isComplete: false,
    notes: "Rest threshold (9h) satisfied. Eligible for Depot Officer reviewed overtime."
  });
  await OvertimeRequest.create({
    requestId: "OTR-2026-902",
    driverId: "drv-1003",
    driverName: "Harish Gehlot",
    employeeId: "DRV-1003",
    busId: "BUS-103",
    routeName: "Jaipur → Agra Golden Triangle Link",
    tripId: "TRIP-2026-083",
    depot: "Jaipur Central",
    requestedHours: 2.5,
    reason: "Heavy passenger surge at Sindhi Camp Terminal due to express train cancellation; extra evening feeder relay requested.",
    isEmergency: false,
    status: "PENDING_APPROVAL",
    hourlyRateINR: 350.0,
    approvedAmountINR: 875.0,
    createdAt: new Date(now - 1.5 * 3600 * 1000).toISOString()
  });

  // 4. Suresh Choudhary: Overtime APPROVED 3.0h by Depot Officer, ₹1050 payable, Actual OT recorded with MATCH
  const sureshDutyEnd = new Date(now - 18.0 * 3600 * 1000).toISOString();
  await DutySession.create({
    dutyId: "DUTY-SES-704",
    driverId: "drv-1004",
    driverName: "Suresh Choudhary",
    employeeId: "DRV-1004",
    busId: "BUS-104",
    routeName: "Kota → Jaipur Intercity Link",
    tripId: "TRIP-2026-084",
    depot: "Kota Depot",
    policyVersion: "POL-v2.4",
    status: "COMPLETED",
    startTime: new Date(now - 26.0 * 3600 * 1000).toISOString(),
    endTime: sureshDutyEnd,
    scheduledHours: 8.0,
    elapsedDutyHours: 8.0,
    actualDrivingHours: 7.0,
    totalBreakMinutes: 30,
    riskLevel: "Low"
  });
  await RestPeriod.create({
    driverId: "drv-1004",
    driverName: "Suresh Choudhary",
    dutySessionId: "DUTY-SES-704",
    restStartTime: sureshDutyEnd,
    restEndTime: new Date(now - 5.0 * 3600 * 1000).toISOString(),
    requiredRestHours: 13.0,
    minOvertimeThreshold: 9.0,
    continuousRestHours: 13.0,
    eligibilityStatus: "FULLY_ELIGIBLE",
    policyVersion: "POL-v2.4",
    isComplete: true
  });
  await OvertimeRequest.create({
    requestId: "OTR-2026-884",
    driverId: "drv-1004",
    driverName: "Suresh Choudhary",
    employeeId: "DRV-1004",
    busId: "BUS-104",
    routeName: "Kota → Jaipur Intercity Link",
    tripId: "TRIP-2026-084",
    requestedHours: 3.0,
    approvedHours: 3.0,
    hourlyRateINR: 350.0,
    approvedAmountINR: 1050.0,
    reason: "Commercial truck overturned on NH-48 near Behror; assisted in highway traffic clearance and passenger shuttle.",
    isEmergency: true,
    emergencyReference: "INCIDENT-HW-774",
    status: "APPROVED",
    reviewingOfficerId: "2yk8366vmvicj1cl",
    reviewingOfficerName: "Vikram Rathore (Depot Officer)",
    decisionTimestamp: new Date(now - 12.0 * 3600 * 1000).toISOString(),
    decisionReason: "Verified highway traffic advisory and GPS delay logs. Overtime approved under section 13(2).",
    actualHoursWorked: 3.0,
    discrepancyStatus: "MATCH",
    verificationSource: "GPS_TELEMETRY",
    createdAt: new Date(now - 16.0 * 3600 * 1000).toISOString()
  });

  // 5. Dharmendra Yadav: Duty completed 14.5h ago, Rest in progress (>= 13h), FULLY_ELIGIBLE, Start Duty enabled
  const dharmanDutyEnd = new Date(now - 14.5 * 3600 * 1000).toISOString();
  await DutySession.create({
    dutyId: "DUTY-SES-705",
    driverId: "drv-1005",
    driverName: "Dharmendra Yadav",
    employeeId: "DRV-1005",
    busId: "BUS-105",
    routeName: "Jaipur → Udaipur Superfast Night Express",
    tripId: "TRIP-2026-085",
    depot: "Udaipur Depot",
    policyVersion: "POL-v2.4",
    status: "COMPLETED",
    startTime: new Date(now - 23.0 * 3600 * 1000).toISOString(),
    endTime: dharmanDutyEnd,
    scheduledHours: 8.5,
    elapsedDutyHours: 8.5,
    actualDrivingHours: 7.2,
    totalBreakMinutes: 45,
    riskLevel: "Low"
  });
  await RestPeriod.create({
    driverId: "drv-1005",
    driverName: "Dharmendra Yadav",
    dutySessionId: "DUTY-SES-705",
    restStartTime: dharmanDutyEnd,
    restEndTime: null,
    requiredRestHours: 13.0,
    minOvertimeThreshold: 9.0,
    continuousRestHours: 14.5,
    eligibilityStatus: "FULLY_ELIGIBLE",
    policyVersion: "POL-v2.4",
    isComplete: false,
    notes: "Full 13h statutory rest satisfied. Driver cleared and eligible for normal shift dispatch."
  });
}

export async function seedDatabaseIfEmpty() {
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    console.log("[SafeTransit DB] Database is uninitialized. Running initial seed...");
    await resetAndSeedDatabase();
  } else {
    console.log(`[SafeTransit DB] ✓ Database contains active records (${userCount} users).`);
    const sessionCount = await DutySession.countDocuments();
    if (sessionCount === 0) {
      console.log("[SafeTransit DB] Initializing demonstration driver duty & overtime scenarios...");
      await seedDutyLifecycleScenarios();
      console.log("[SafeTransit DB] ✓ Demonstration scenarios seeded successfully.");
    }
  }
}
