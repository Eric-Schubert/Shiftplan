const EXACT_DESCRIPTIONS = {
  "POST /api/auth/login": "Create a session and CSRF token",
  "POST /api/auth/logout": "Clear the current session",
  "GET /api/auth/session": "Read the current session state",
  "POST /api/auth/change-password": "Change the current user's password",
  "GET /api/auth/users": "List application users",
  "POST /api/auth/users": "Create an application user",
  "DELETE /api/auth/users/:id": "Delete an application user",
  "GET /api/audit": "List audit log entries",
  "POST /api/shiftplan/assign": "Assign staff to a weekly shift",
  "POST /api/shiftplan/unassign": "Remove staff from a weekly shift",
  "POST /api/shiftplan/generate": "Generate plans from the rotation pattern",
  "GET /api/shiftplan/generate-preview": "Preview which weeks a rollout would fill or overwrite",
  "POST /api/shiftplan/copy-year": "Copy shift plans between years",
  "POST /api/shiftplan/day-change": "Put someone into or out of a shift for one day",
  "GET /api/shiftplan/year-summary": "Read yearly planning coverage",
  "GET /api/holidays/public": "Read public holidays",
  "GET /api/holidays/school": "Read school holidays",
  "POST /api/member/login": "Sign in with Kürzel and PIN",
  "POST /api/member/redeem": "Redeem a personal QR code",
  "PUT /api/member/pin": "Set or change the own PIN",
  "GET /api/member/me": "Read the signed-in employee",
  "POST /api/viewer/login": "Unlock the plan with the team access code",
};

export function getDescription(endpoint) {
  const route = endpoint.route;
  const method = endpoint.method;

  const key = `${method} ${route}`;
  if (EXACT_DESCRIPTIONS[key]) return EXACT_DESCRIPTIONS[key];

  const resource = route.split("/")[2] || "resource";
  if (method === "GET" && route.includes(":id")) return `Read one ${resource} record`;
  if (method === "GET") return `List ${resource} records`;
  if (method === "POST") return `Create or update ${resource} data`;
  if (method === "PATCH") return `Update one ${resource} record`;
  if (method === "DELETE") return `Delete one ${resource} record`;
  return "API endpoint";
}
