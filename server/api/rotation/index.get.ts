import { RotationService } from "~/server/services/rotation.service";

export default defineEventHandler(() => {
  return RotationService.getFullPattern();
});
