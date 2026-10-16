import { PushService } from "~/server/services/push.service";
import { ShiftRequestService } from "~/server/services/shift-request/store";
import type { ShiftRequest } from "~/server/services/shift-request/types";
import { weekOfDate } from "~/shared/utils/week";
import { REQUESTS_URL, notify, notifyStaff, requestText } from "./notify";

export async function requestTakeover(input: {
  staffId: number;
  staffName: string;
  date: string;
  shiftId?: number | null;
  message?: string | null;
  absenceId?: number | null;
  notifyTeam?: boolean;
}): Promise<ShiftRequest> {
  const request = ShiftRequestService.createTakeover({ ...input, createdBy: input.staffName });
  if (input.notifyTeam !== false) {
    const { year, week } = weekOfDate(request.date_from);
    const text = requestText(request, "takeoverWanted", request.requester_name, request.message);
    await notify(
      PushService.sendTeamNotice((locale) => ({ ...text(locale), url: REQUESTS_URL, year, week }), {
        excludeStaffId: request.requester_staff_id,
      })
    );
  }
  return request;
}

export async function requestSwap(input: {
  staffId: number;
  staffName: string;
  partnerStaffId: number;
  from: string;
  to: string;
  message?: string | null;
}): Promise<ShiftRequest> {
  const request = ShiftRequestService.createSwap({ ...input, createdBy: input.staffName });
  await notifyStaff([request.partner_staff_id!], request, "swapAsked", request.requester_name, request.message);
  return request;
}
