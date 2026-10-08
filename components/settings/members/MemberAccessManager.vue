<script setup lang="ts">
import type { MemberDevice } from "~/types/absence";
import { renderQrSvg } from "~/utils/qr-code";

type Invite = { staffId: number; staffName: string; code: string; link: string; expiresAt: number };

const dataStore = useDataStore();
const { authFetch } = useAuthFetch();
const devices = ref<MemberDevice[]>([]);
const loading = ref(true);
const creatingFor = ref<number | null>(null);
const invite = ref<Invite | null>(null);
const qrSvg = ref("");
const deviceToRevoke = ref<MemberDevice | null>(null);
const withPin = ref<Set<number>>(new Set());
const resettingPin = ref<number | null>(null);
const revoking = ref(false);
const error = ref("");

const staff = computed(() => [...dataStore.activeStaff].sort((a, b) => a.name.localeCompare(b.name, "de")));
const devicesByStaff = computed(() => {
  const map = new Map<number, MemberDevice[]>();
  for (const device of devices.value) {
    map.set(device.staffId, [...(map.get(device.staffId) ?? []), device]);
  }
  return map;
});

const inviteVisible = computed({
  get: () => invite.value !== null,
  set: (value: boolean) => {
    if (!value) invite.value = null;
  },
});

async function loadDevices() {
  loading.value = true;
  try {
    const [sessions, pins] = await Promise.all([
      authFetch<MemberDevice[]>("/api/member-sessions"),
      authFetch<{ staffIds: number[] }>("/api/member-sessions/pins"),
    ]);
    devices.value = sessions;
    withPin.value = new Set(pins.staffIds);
  } finally {
    loading.value = false;
  }
}

async function createInvite(staffId: number, staffName: string) {
  creatingFor.value = staffId;
  error.value = "";
  try {
    const result = await authFetch<{ code: string; path: string; expiresAt: number }>("/api/member-invites", {
      method: "POST",
      body: { staffId },
    });
    const link = `${window.location.origin}${result.path}`;
    qrSvg.value = await renderQrSvg(link);
    invite.value = { staffId, staffName, code: result.code, link, expiresAt: result.expiresAt };
  } catch (cause: any) {
    error.value = cause?.data?.statusMessage || "QR-Code konnte nicht erzeugt werden";
  } finally {
    creatingFor.value = null;
  }
}

async function revoke() {
  if (!deviceToRevoke.value) return;
  revoking.value = true;
  try {
    await authFetch(`/api/member-sessions/${deviceToRevoke.value.sessionId}`, { method: "DELETE" });
    deviceToRevoke.value = null;
    await loadDevices();
  } catch (cause: any) {
    error.value = cause?.data?.statusMessage || "Gerät konnte nicht gesperrt werden";
  } finally {
    revoking.value = false;
  }
}

async function resetPin(staffId: number) {
  resettingPin.value = staffId;
  error.value = "";
  try {
    await authFetch(`/api/staff/${staffId}/pin`, { method: "DELETE" });
    await loadDevices();
  } catch (cause: any) {
    error.value = cause?.data?.statusMessage || "PIN konnte nicht zurückgesetzt werden";
  } finally {
    resettingPin.value = null;
  }
}

onMounted(async () => {
  await Promise.all([dataStore.init(), loadDevices()]);
});
</script>

<template>
  <div class="space-y-4">
    <p class="max-w-[46rem] text-sm leading-6 text-[var(--text-2)]">
      Jede Person bekommt einen eigenen QR-Code für die Shiftplan-App oder den Browser. Bei der ersten Anmeldung
      legt sie eine PIN fest und meldet sich danach auf jedem Gerät mit Kürzel und PIN an. Ein Code ist 7 Tage
      gültig und nur einmal nutzbar. Verliert jemand sein Handy, sperrst du hier das Gerät. PIN vergessen: PIN
      zurücksetzen und einen neuen QR-Code erzeugen.
    </p>

    <div v-if="loading" class="flex items-center gap-3 text-sm text-[var(--text-2)]">
      <PrimeProgressSpinner class="!h-5 !w-5" />
      Wird geladen.
    </div>

    <ul v-else class="divide-y divide-[var(--border-soft)] rounded-xl border border-[var(--border-soft)]">
      <MemberAccessStaffRow
        v-for="member in staff"
        :key="member.staff_id"
        :member="member"
        :devices="devicesByStaff.get(member.staff_id)"
        :has-pin="withPin.has(member.staff_id)"
        :resetting-pin="resettingPin === member.staff_id"
        :creating="creatingFor === member.staff_id"
        @reset-pin="resetPin(member.staff_id)"
        @revoke="deviceToRevoke = $event"
        @invite="createInvite(member.staff_id, member.name)"
      />
    </ul>

    <small v-if="error" class="block text-sm text-[var(--danger-ink)]" role="alert">{{ error }}</small>

    <MemberAccessInviteDialog v-model:visible="inviteVisible" :invite="invite" :qr-svg="qrSvg" @done="loadDevices" />
    <MemberAccessRevokeDialog v-model:device="deviceToRevoke" :revoking="revoking" @confirm="revoke" />
  </div>
</template>
