const API_BASE = "https://safetransit-amx7.onrender.com";

async function request(path, options = {}) {
  const token = localStorage.getItem("safeTransitToken");

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    localStorage.removeItem("safeTransitToken");
    localStorage.removeItem("safeTransitUser");
    window.dispatchEvent(new Event("safetransit:logout"));
  }

  if (!response.ok) {
    throw new Error(data.message || data.error || "The server could not complete the request.");
  }

  return data;
}

export const api = {
  // Auth
  login: (email, password) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    }),

  register: (payload) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  switchDemoRole: (role) =>
    request("/auth/switch-role", {
      method: "POST",
      body: JSON.stringify({ role })
    }),

  me: () => request("/auth/me"),
  users: () => request("/auth/users"),

  // Analytics & Health
  health: () => request("/health"),
  analytics: () => request("/analytics"),
  resetSeed: () => request("/seed/reset", { method: "POST" }),

  // Generic Resources
  list: (resource) => request(`/${resource}`),

  create: (resource, payload) =>
    request(`/${resource}`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  update: (resource, id, payload) =>
    request(`/${resource}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),

  remove: (resource, id) =>
    request(`/${resource}/${id}`, {
      method: "DELETE"
    }),

  // Advanced Business Logic Endpoints
  safetyCheck: (payload) =>
    request("/safety/check", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  evaluateSmartAssignment: (payload) =>
    request("/smart-assignment/evaluate", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  suggestLeaveReplacement: (leaveId) =>
    request(`/leaves/${leaveId}/suggest-replacement`),

  submitChecklist: (payload) =>
    request("/checklists/submit", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  policies: () => request("/policies"),

  updatePolicies: (payload) =>
    request("/policies", {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),

  // Advanced Driver Duty Lifecycle, Rest & Overtime Engine
  dutyRestEligibility: (params = {}) => {
    const q = new URLSearchParams(typeof params === "string" ? { driverName: params } : params).toString();
    return request(`/duty/rest-eligibility${q ? `?${q}` : ""}`);
  },
  activeDuty: (params = {}) => {
    const q = new URLSearchParams(typeof params === "string" ? { driverName: params } : params).toString();
    return request(`/duty/active${q ? `?${q}` : ""}`);
  },
  startDuty: (payload = {}) =>
    request("/duty/start", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  startDutyBreak: (payload = {}) =>
    request("/duty/break/start", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  endDutyBreak: () =>
    request("/duty/break/end", {
      method: "POST"
    }),
  endDuty: (payload = {}) =>
    request("/duty/end", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  requestOvertime: (payload) =>
    request("/duty/overtime/request", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  recordActualOvertime: (payload) =>
    request("/duty/overtime/record-actual", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  dutyHistory: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/duty/history${q ? `?${q}` : ""}`);
  },
  driversClearanceBoard: (params = {}) => {
    const q = new URLSearchParams(typeof params === "string" ? { search: params } : params).toString();
    return request(`/duty/clearance-board${q ? `?${q}` : ""}`);
  },
  officerOvertimeQueue: () => request("/officer/overtime-queue"),
  officerOvertimeDecision: (payload) =>
    request("/officer/overtime-decision", {
      method: "POST",
      body: JSON.stringify(payload)
    })
};
