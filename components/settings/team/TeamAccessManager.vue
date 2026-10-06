<script setup lang="ts">
type TeamAccess = { code: string | null; instanceName: string; subscriberCount: number };
type PendingAction = "generate" | "custom" | "remove";

const { authFetch } = useAuthFetch();
const access = ref<TeamAccess | null>(null);
const loading = ref(true);
const saving = ref(false);
const error = ref("");
const copied = ref(false);
const qrSvg = ref("");
const customCode = ref("");
const pendingAction = ref<PendingAction | null>(null);
const instanceName = ref("");
const savingName = ref(false);
const nameSaved = ref(false);

const accessLink = computed(() =>
  access.value?.code && import.meta.client
    ? `${window.location.origin}/?zugang=${encodeURIComponent(access.value.code)}`
    : ""
);

const confirmVisible = computed({
  get: () => pendingAction.value !== null,
  set: (value: boolean) => {
    if (!value) pendingAction.value = null;
  },
});

const confirmText = computed(() =>
  pendingAction.value === "remove"
    ? "Der Schichtplan ist danach wieder für alle mit dem Link lesbar. Bestehende Benachrichtigungen bleiben aktiv."
    : "Alle Geräte mit dem alten Code werden abgemeldet und ihre Benachrichtigungen gelöscht. Das Team muss den neuen Code einmal eingeben und Benachrichtigungen erneut aktivieren."
);

watch(accessLink, async (link) => {
  if (!link) {
    qrSvg.value = "";
    return;
  }
  const { toString } = await import("qrcode");
  qrSvg.value = await toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
});

async function load() {
  loading.value = true;
  try {
    access.value = await authFetch<TeamAccess>("/api/team-access");
    instanceName.value = access.value.instanceName;
  } finally {
    loading.value = false;
  }
}

function requestChange(action: PendingAction) {
  error.value = "";
  // The first code changes nothing for existing devices, so no confirmation needed.
  if (!access.value?.code && action !== "remove") {
    void applyChange(action);
    return;
  }
  pendingAction.value = action;
}

async function applyChange(action: PendingAction) {
  saving.value = true;
  error.value = "";
  try {
    const body =
      action === "generate" ? { generate: true } : { code: action === "remove" ? null : customCode.value };
    await authFetch("/api/team-access", {
      method: "POST",
      body,
    });
    customCode.value = "";
    pendingAction.value = null;
    await load();
  } catch (cause: any) {
    error.value = cause?.data?.statusMessage || "Zugangscode konnte nicht gespeichert werden";
    pendingAction.value = null;
  } finally {
    saving.value = false;
  }
}

async function saveInstanceName() {
  savingName.value = true;
  error.value = "";
  try {
    await authFetch("/api/team-access", { method: "POST", body: { instanceName: instanceName.value } });
    nameSaved.value = true;
    setTimeout(() => (nameSaved.value = false), 2000);
  } catch (cause: any) {
    error.value = cause?.data?.statusMessage || "Name konnte nicht gespeichert werden";
  } finally {
    savingName.value = false;
  }
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(accessLink.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  } catch {
    error.value = "Link konnte nicht kopiert werden";
  }
}

onMounted(load);
</script>

<template>
  <div class="space-y-5">
    <p class="max-w-[46rem] text-sm leading-6 text-[var(--text-2)]">
      Mit einem Zugangscode sieht nur dein Team den Schichtplan. Mitarbeitende brauchen kein eigenes
      Konto: Sie scannen den QR-Code, sehen den Plan und können Benachrichtigungen aktivieren. Ändern
      können Schichten weiterhin nur Planer und Admins.
    </p>

    <div v-if="loading" class="flex items-center gap-3 text-sm text-[var(--text-2)]">
      <PrimeProgressSpinner class="!h-5 !w-5" />
      Wird geladen.
    </div>

    <template v-else-if="access">
      <div class="flex flex-wrap items-center gap-2 text-sm">
        <span class="planner-chip">
          <i :class="access.code ? 'pi pi-lock' : 'pi pi-lock-open'" class="text-[0.7rem]" aria-hidden="true"></i>
          {{ access.code ? "Zugangscode aktiv" : "Plan öffentlich lesbar" }}
        </span>
        <span class="planner-chip">
          <i class="pi pi-bell text-[0.7rem]" aria-hidden="true"></i>
          {{ access.subscriberCount === 1 ? "1 Gerät mit Push" : `${access.subscriberCount} Geräte mit Push` }}
        </span>
      </div>

      <div v-if="access.code" class="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div
          class="h-44 w-44 flex-shrink-0 rounded-xl border border-[var(--border-soft)] bg-white p-2 [&_svg]:h-full [&_svg]:w-full"
          role="img"
          :aria-label="`QR-Code für ${accessLink}`"
          v-html="qrSvg"
        ></div>

        <div class="min-w-0 space-y-3">
          <div>
            <p class="text-xs font-medium uppercase tracking-wide text-[var(--text-3)]">Zugangscode</p>
            <p class="font-mono text-2xl font-semibold tracking-wider text-[var(--text-1)]">{{ access.code }}</p>
          </div>
          <div>
            <p class="text-xs font-medium uppercase tracking-wide text-[var(--text-3)]">Direktlink</p>
            <p class="break-all font-mono text-sm text-[var(--text-2)]">{{ accessLink }}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <PrimeButton
              :label="copied ? 'Kopiert' : 'Link kopieren'"
              :icon="copied ? 'pi pi-check' : 'pi pi-copy'"
              size="small"
              class="min-h-9"
              @click="copyLink"
            />
            <PrimeButton
              label="Neuen Code erzeugen"
              icon="pi pi-refresh"
              severity="secondary"
              size="small"
              outlined
              class="min-h-9"
              :loading="saving && pendingAction === 'generate'"
              @click="requestChange('generate')"
            />
            <PrimeButton
              label="Code entfernen"
              icon="pi pi-lock-open"
              severity="danger"
              size="small"
              outlined
              class="min-h-9"
              @click="requestChange('remove')"
            />
          </div>
        </div>
      </div>

      <PrimeButton
        v-else
        label="Zugangscode einrichten"
        icon="pi pi-lock"
        class="min-h-11"
        :loading="saving"
        @click="requestChange('generate')"
      />

      <form class="max-w-md space-y-1.5" @submit.prevent="requestChange('custom')">
        <label for="team-custom-code" class="block text-sm font-medium text-[var(--text-2)]">
          Eigenen Code festlegen (optional)
        </label>
        <div class="flex gap-2">
          <PrimeInputText
            id="team-custom-code"
            v-model="customCode"
            class="min-w-0 flex-1 font-mono uppercase placeholder:normal-case"
            placeholder="mind. 6 Zeichen"
            autocomplete="off"
            spellcheck="false"
            :disabled="saving"
          />
          <PrimeButton
            type="submit"
            label="Speichern"
            severity="secondary"
            outlined
            class="min-h-11"
            :disabled="customCode.trim().length < 6"
          />
        </div>
      </form>

      <form class="max-w-md space-y-1.5" @submit.prevent="saveInstanceName">
        <label for="team-instance-name" class="block text-sm font-medium text-[var(--text-2)]">
          Name in der App
        </label>
        <div class="flex gap-2">
          <PrimeInputText
            id="team-instance-name"
            v-model="instanceName"
            class="min-w-0 flex-1"
            maxlength="80"
            placeholder="z. B. Pflegeteam Nord"
            :disabled="savingName"
          />
          <PrimeButton
            type="submit"
            :label="nameSaved ? 'Gespeichert' : 'Speichern'"
            :icon="nameSaved ? 'pi pi-check' : undefined"
            severity="secondary"
            outlined
            class="min-h-11"
            :loading="savingName"
            :disabled="!instanceName.trim()"
          />
        </div>
      </form>

      <small v-if="error" class="block text-sm text-[var(--danger-ink)]" role="alert">{{ error }}</small>
    </template>

    <PrimeDialog
      v-model:visible="confirmVisible"
      :header="pendingAction === 'remove' ? 'Zugangscode entfernen' : 'Zugangscode ändern'"
      modal
      :style="{ width: '28rem', maxWidth: 'calc(100vw - 1.5rem)' }"
    >
      <p class="text-sm leading-6">{{ confirmText }}</p>
      <template #footer>
        <PrimeButton label="Abbrechen" text @click="pendingAction = null" />
        <PrimeButton
          :label="pendingAction === 'remove' ? 'Entfernen' : 'Code ändern'"
          :severity="pendingAction === 'remove' ? 'danger' : undefined"
          class="min-h-11"
          :loading="saving"
          @click="applyChange(pendingAction!)"
        />
      </template>
    </PrimeDialog>
  </div>
</template>
