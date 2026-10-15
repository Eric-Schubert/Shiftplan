/**
 * Public demo only: the planner account whose credentials the login page shows to everyone.
 * Visitors share it, so nobody may change its password and lock the others out.
 */
export function isDemoAccount(username: string): boolean {
  const demoUsername = process.env.NUXT_PUBLIC_DEMO_LOGIN_USERNAME?.trim();
  return Boolean(demoUsername && process.env.NUXT_PUBLIC_DEMO_LOGIN_PASSWORD && demoUsername === username);
}
