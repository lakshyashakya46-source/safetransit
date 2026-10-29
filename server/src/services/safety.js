/**
 * SafeTransit Advanced Transport Crew Safety & Fatigue Engine
 * Complies with Motor Transport Workers Act & Departmental Safety Directives.
 */

export function evaluateDuty(dutyContext, policy) {
  const {
    workingHours = 0,
    drivingHours = 0,
    restHours = 12,
    weeklyHours = 20,
    consecutiveDays = 1,
    isNightShift = false,
    crewAvailability = "Available",
    isVerified = true
  } = dutyContext;

  const reasons = [];
  const warnings = [];
  let fatigueScore = 15; // baseline

  // 1. Availability & Verification Checks
  if (!isVerified) {
    reasons.push("Crew member credentials are not verified by Depot Authority.");
  }
  if (crewAvailability === "On Leave") {
    reasons.push("Crew member is currently marked On Leave.");
  }
  if (crewAvailability === "On Trip" || crewAvailability === "On Duty") {
    reasons.push("Crew member is already engaged in an active trip.");
  }

  // 2. Daily Duty & Driving Limit Checks
  if (workingHours > policy.maxDutyHours) {
    const excess = (workingHours - policy.maxDutyHours).toFixed(1);
    reasons.push(`Total duty (${workingHours}h) exceeds maximum allowed ${policy.maxDutyHours}h by ${excess}h.`);
    fatigueScore += 30;
  } else if (workingHours >= policy.maxDutyHours - 1.0) {
    warnings.push(`Duty duration (${workingHours}h) is near the upper policy limit (${policy.maxDutyHours}h).`);
    fatigueScore += 15;
  }

  if (drivingHours > policy.maxDrivingHours) {
    const excess = (drivingHours - policy.maxDrivingHours).toFixed(1);
    reasons.push(`Continuous steering time (${drivingHours}h) exceeds safe ceiling of ${policy.maxDrivingHours}h.`);
    fatigueScore += 35;
  }

  // 3. Minimum Rest Compliance
  if (restHours < policy.minRestHours) {
    const deficit = (policy.minRestHours - restHours).toFixed(1);
    reasons.push(`Insufficient rest: only ${restHours}h provided since previous shift (Policy requires minimum ${policy.minRestHours}h, deficit: ${deficit}h).`);
    fatigueScore += 45;
  } else if (restHours < policy.minRestHours + 2.0) {
    warnings.push(`Rest period (${restHours}h) meets threshold but leaves limited recovery margin.`);
    fatigueScore += 10;
  }

  // 4. Weekly Accumulated Working Hours
  const projectedWeekly = Number(weeklyHours) + Number(workingHours);
  if (projectedWeekly > policy.weeklyLimit) {
    const excess = (projectedWeekly - policy.weeklyLimit).toFixed(1);
    reasons.push(`Weekly limit violation: Projected ${projectedWeekly.toFixed(1)}h exceeds weekly cap of ${policy.weeklyLimit}h by ${excess}h.`);
    fatigueScore += 25;
  } else if (projectedWeekly > policy.weeklyLimit - 4) {
    warnings.push(`Weekly hours nearing saturation: ${projectedWeekly.toFixed(1)}h / ${policy.weeklyLimit}h limit.`);
    fatigueScore += 12;
  }

  // 5. Consecutive Duty Days
  const maxDays = policy.maxConsecutiveDays || 6;
  if (consecutiveDays >= maxDays) {
    reasons.push(`Consecutive duty rule: Crew has worked ${consecutiveDays} consecutive days without mandatory 24h rest.`);
    fatigueScore += 30;
  } else if (consecutiveDays === maxDays - 1) {
    warnings.push(`Crew member is on day ${consecutiveDays} of continuous duty; mandatory weekly off required after next shift.`);
    fatigueScore += 10;
  }

  // 6. Night Shift Fatigue Factor
  if (isNightShift) {
    const nightMultiplier = policy.nightShiftMultiplier || 1.25;
    fatigueScore = Math.round(fatigueScore * nightMultiplier);
    warnings.push("Circadian disruption risk: Night duty between 22:00 - 06:00 applies 1.25x fatigue multiplier.");
  }

  // Cap fatigue score 0 - 100
  fatigueScore = Math.min(100, Math.max(5, fatigueScore));

  // Determine Risk Category
  let risk = "Low";
  if (fatigueScore >= 70 || reasons.length >= 2) {
    risk = "High";
  } else if (fatigueScore >= 40 || reasons.length === 1 || warnings.length >= 2) {
    risk = "Medium";
  }

  // Determine Eligibility
  let eligibility = "Eligible";
  if (reasons.length > 0 || risk === "High") {
    eligibility = "Not Eligible";
  } else if (warnings.length > 0 || risk === "Medium") {
    eligibility = "Review Required";
  }

  return {
    eligible: eligibility === "Eligible",
    eligibility,
    risk,
    fatigueScore,
    reasons,
    warnings,
    summary: eligibility === "Eligible"
      ? "Safe for dispatch. Rest and duty hours fully conform to safety policy."
      : eligibility === "Review Required"
      ? "Operational caution: Marginal compliance detected. Depot Officer confirmation advised."
      : "Safety lockout: Critical compliance violations detected. Requires replacement or manual override justification."
  };
}

/**
 * Intelligent Route Segmentation
 * Automatically breaks multi-hour long distance journeys into crew-safe segments.
 */
export function segmentRoute(route) {
  const duration = Number(route.duration || 5);
  const distance = Number(route.distance || 250);

  if (duration <= 6.0 && distance <= 350) {
    return [
      {
        segmentIndex: 1,
        title: `${route.source} → ${route.destination}`,
        from: route.source,
        to: route.destination,
        estimatedHours: duration,
        distanceKm: distance,
        handoverPoint: null,
        changeRequired: false
      }
    ];
  }

  // Long journey: Split into 2 or 3 legs based on changePoints
  const changePoints = route.changePoints && route.changePoints.length >= 2
    ? route.changePoints
    : [route.source, "Midway Transit Hub", route.destination];

  const segments = [];
  const numLegs = changePoints.length - 1;
  const legHours = Number((duration / numLegs).toFixed(1));
  const legDist = Math.round(distance / numLegs);

  for (let i = 0; i < numLegs; i++) {
    segments.push({
      segmentIndex: i + 1,
      title: `Leg ${i + 1}: ${changePoints[i]} → ${changePoints[i + 1]}`,
      from: changePoints[i],
      to: changePoints[i + 1],
      estimatedHours: legHours,
      distanceKm: legDist,
      handoverPoint: i < numLegs - 1 ? changePoints[i + 1] : null,
      changeRequired: i < numLegs - 1
    });
  }

  return segments;
}

/**
 * Heuristic Ranker for Smart Duty Assignment
 */
export function rankCrewForDuty(crewList, dutyHours, policy) {
  return crewList.map(crew => {
    const evaluation = evaluateDuty({
      workingHours: dutyHours,
      drivingHours: crew.role === "DRIVER" ? Math.min(dutyHours, dutyHours * 0.9) : 0,
      restHours: crew.restHours ?? 12,
      weeklyHours: crew.weeklyHours ?? 25,
      consecutiveDays: crew.consecutiveDays ?? 2,
      crewAvailability: crew.availability,
      isVerified: crew.verified
    }, policy);

    // Score from 0 to 100 (higher is better for assignment)
    let fitnessScore = 100 - evaluation.fatigueScore;
    if (crew.availability !== "Available") fitnessScore -= 50;
    if (!crew.verified) fitnessScore -= 40;
    if (crew.restHours >= 14) fitnessScore += 10;

    return {
      crewId: crew._id,
      employeeId: crew.employeeId,
      name: crew.name,
      role: crew.role,
      depot: crew.depot,
      restHours: crew.restHours,
      weeklyHours: crew.weeklyHours,
      availability: crew.availability,
      evaluation,
      fitnessScore: Math.max(0, Math.min(100, fitnessScore))
    };
  }).sort((a, b) => b.fitnessScore - a.fitnessScore);
}
