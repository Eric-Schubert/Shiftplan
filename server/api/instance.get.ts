import { TeamAccessService } from "~/server/services/team-access.service";

// Bumped only for breaking changes to the endpoints the app uses (docs/api/app-v1.yaml).
const APP_API_VERSION = 1;

export default defineEventHandler(() => {
  return {
    name: TeamAccessService.getInstanceName(),
    version: String(useRuntimeConfig().public.appVersion || ""),
    apiVersion: APP_API_VERSION,
    codeRequired: TeamAccessService.isCodeRequired(),
  };
});
