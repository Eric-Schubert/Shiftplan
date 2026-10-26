import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import RotationWizardFooter from "~/components/settings/rotation/RotationWizardFooter.vue";

const PrimeButton = defineComponent({
  props: { label: { type: String, default: "" } },
  setup: (props) => () => h("button", props.label),
});

async function footerButtons(props: { activeStep: number; importPending: boolean; rolledOut?: boolean }): Promise<string[]> {
  const app = createSSRApp({
    render: () => h(RotationWizardFooter, { stepCount: 3, rolledOut: false, importing: false, ...props }),
  });
  app.component("PrimeButton", PrimeButton);
  app.config.globalProperties.$t = (key: string) => key;
  const html = await renderToString(app);
  return [...html.matchAll(/<button[^>]*>([^<]*)<\/button>/g)].map((match) => match[1]!);
}

describe("rotation wizard footer", () => {
  it("goes on to the next step without a checked Excel file", async () => {
    expect(await footerButtons({ activeStep: 0, importPending: false })).toEqual(["common.actions.close", "common.actions.next"]);
  });

  // "Next" used to drop a checked file without a word, so the pattern stayed the old one.
  it("offers to replace the pattern instead of next while a checked file waits", async () => {
    expect(await footerButtons({ activeStep: 0, importPending: true })).toEqual(["common.actions.close", "settings.wizard.excel.replaceAndNext"]);
  });
});
