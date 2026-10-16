import { defineStore } from "pinia";
import type { ClientConfig } from "~/types/instance";
import { toClientConfig } from "~/utils/client-config";

// The instance's runtime config, loaded by plugins/instance-settings.ts before the first render.
export const useConfigStore = defineStore("config", {
  state: (): ClientConfig => toClientConfig(),

  actions: {
    apply(response?: Partial<ClientConfig> | null) {
      this.$patch(toClientConfig(response));
    },
  },
});
