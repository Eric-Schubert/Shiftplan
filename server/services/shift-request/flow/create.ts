import { PushService } from "~/server/services/push.service";
import { ShiftRequestService } from "~/server/services/shift-request/store";
import type { ShiftRequest } from "~/server/services/shift-request/types";
import { weekOfDate } from "~/shared/utils/week";
import { REQUESTS_URL, describeRequest, notify, notifyStaff } from "./notify";

export async function createTakeover(input: {
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
    const extra = request.message ? `\n${request.message}` : "";
    await notify(
      PushService.sendTeamNotice(
        {
          title: "Übernahme gesucht",
          body: `${request.requester_name} sucht Ersatz: ${describeRequest(request)}${extra}`,
          url: REQUESTS_URL,
          year,
          week,
        },
        { excludeStaffId: request.requester_staff_id }
      )
    );
  }
  return request;
}

export async function createSwap(input: {
  staffId: number;
  staffName: string;
  partnerStaffId: number;
  from: string;
  to: string;
  message?: string | null;
}): Promise<ShiftRequest> {
  const request = ShiftRequestService.createSwap({ ...input, createdBy: input.staffName });
  const extra = request.message ? `\n${request.message}` : "";
  await notifyStaff(
    [request.partner_staff_id!],
    "Tauschanfrage",
    `${request.requester_name} möchte ${describeRequest(request)} die Schichten mit dir tauschen.${extra}`
  );
  return request;
}
