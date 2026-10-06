<script setup lang="ts">
import type { MemberDevice } from "~/types/absence";

type Invite = { staffId: number; staffName: string; code: string; link: string; expiresAt: number };

const dataStore = useDataStore();
const { authFetch } = useAuthFetch();
const devices = ref<MemberDevice[]>([]);
const loading = ref(true);
const creatingFor = ref<number | null>(null);
const invite = ref<Invite | null>(null);
const qrSvg = ref("");
const deviceToRevoke = ref<MemberDevice | null>(null);
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
const revokeVisible = computed({
  get: () => deviceToRevoke.value !== null,
  set: (value: boolean) => {
    if (!value) deviceToRevoke.value = null;
  },
});

function formatDate(timestamp: number, withTime = false): string {
  return new Date(timestamp).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

async function loadDevices() {
  loading.value = true;
  try {
    devices.value = await authFetch<MemberDevice[]>("/api/member-sessions");
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
    const { toString } = await import("qrcode");
    qrSvg.value = await toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
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

onMounted(async () => {
  await Promise.all([dataStore.init(), loadDevices()]);
});
</script>

<template>
  <div class="space-y-4">
    <p class="max-w-[46rem] text-sm leading-6 text-[var(--text-2)]">
      Jede Person bekommt einen eigenen QR-Code für die Shiftplan-App. Damit sieht sie den Plan, wird bei
      Änderungen benachrichtigt und kann eigene Ausfälle melden. Ein Code ist 7 Tage gültig und nur einmal
      nutzbar. Verliert jemand sein Handy, sperrst du hier das Gerät.
    </p>

    <div v-if="loading" class="flex items-center gap-3 text-sm text-[var(--text-2)]">
      <PrimeProgressSpinner class="!h-5 !w-5" />
      Wird geladen.
    </div>

    <ul v-else class="divide-y divide-[var(--border-soft)] rounded-xl border border-[var(--border-soft)]">
      <li v-for="member in staff" :key="member.staff_id" class="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
        <div class="min-w-0 flex-1">
          <p class="font-medium text-[var(--text-1)]">{{ member.name }}</p>
          <p v-if="!devicesByStaff.get(member.staff_id)" class="text-xs text-[var(--text-3)]">Noch kein Gerät eingerichtet</p>
          <ul v-else class="mt-1 space-y-1">
            <li
              v-for="device in devicesByStaff.get(member.staff_id)"
              :key="device.sessionId"
              class="flex items-center gap-2 text-xs text-[var(--text-2)]"
            >
              <i class="pi pi-mobile text-[0.7rem]" aria-hidden="true"></i>
              <span>{{ device.deviceName || "Unbenanntes Gerät" }}</span>
              <span class="text-[var(--text-3)]">· zuletzt {{ formatDate(device.lastSeenAt, true) }}</span>
              <button
                type="button"
                class="ml-1 font-semibold text-[var(--danger-ink)] hover:underline"
                @click="deviceToRevoke = device"
              >
                Sperren
              </button>
            </li>
          </ul>
        </div>
        <PrimeButton
          label="QR-Code erzeugen"
          icon="pi pi-qrcode"
          size="small"
          severity="secondary"
          outlined
          class="min-h-9 self-start sm:self-center"
          :loading="creatingFor === member.staff_id"
          @click="createInvite(member.staff_id, member.name)"
        />
      </li>
    </ul>

    <small v-if="error" class="block text-sm text-[var(--danger-ink)]" role="alert">{{ error }}</small>

    <PrimeDialog
      v-model:visible="inviteVisible"
      :header="`App-Zugang für ${invite?.staffName}`"
      modal
      :style="{ width: '24rem', maxWidth: 'calc(100vw - 1.5rem)' }"
    >
      <div v-if="invite" class="space-y-3 text-center text-sm">
        <div
          class="mx-auto h-56 w-56 rounded-xl border border-[var(--border-soft)] bg-white p-2 [&_svg]:h-full [&_svg]:w-full"
          role="img"
          :aria-label="`Persönlicher QR-Code für ${invite.staffName}`"
          v-html="qrSvg"
        ></div>
        <p class="text-[var(--text-2)]">Mit der Shiftplan-App scannen. Ohne Kamera geht auch der Code:</p>
        <p class="font-mono text-xl font-semibold tracking-widest text-[var(--text-1)]">{{ invite.code }}</p>
        <p class="text-xs text-[var(--text-3)]">
          Gültig bis {{ formatDate(invite.expiresAt, true) }}, nur einmal nutzbar. Nur an {{ invite.staffName }} weitergeben.
        </p>
      </div>
      <template #footer>
        <PrimeButton label="Fertig" class="min-h-11" @click="inviteVisible = false; loadDevices()" />
      </template>
    </PrimeDialog>

    <PrimeDialog
      v-model:visible="revokeVisible"
      header="Gerät sperren"
      modal
      :style="{ width: '26rem', maxWidth: 'calc(100vw - 1.5rem)' }"
    >
      <p class="text-sm leading-6">
        „{{ deviceToRevoke?.deviceName || "Unbenanntes Gerät" }}“ von {{ deviceToRevoke?.staffName }} wird abgemeldet und
        bekommt keine Benachrichtigungen mehr. Für einen neuen Zugang einfach einen neuen QR-Code erzeugen.
      </p>
      <template #footer>
        <PrimeButton label="Abbrechen" text @click="deviceToRevoke = null" />
        <PrimeButton label="Sperren" severity="danger" class="min-h-11" :loading="revoking" @click="revoke" />
      </template>
    </PrimeDialog>
  </div>
</template>
