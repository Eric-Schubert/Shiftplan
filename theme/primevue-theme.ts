import Aura from "@primevue/themes/aura";
import { definePreset } from "@primevue/themes";

const zinc = {
  0: "#ffffff",
  50: "#fafafa",
  100: "#f4f4f5",
  200: "#e4e4e7",
  300: "#d4d4d8",
  400: "#a1a1aa",
  500: "#71717a",
  600: "#52525b",
  700: "#3f3f46",
  800: "#27272a",
  900: "#18181b",
  950: "#09090b",
};

const BrandPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: "#fff1f2",
      100: "#ffe2e5",
      200: "#ffc8cd",
      300: "#ff9aa5",
      400: "#ff6674",
      500: "#e30613",
      600: "#c70512",
      700: "#a70410",
      800: "#88050f",
      900: "#69050d",
      950: "#3b0206",
    },
    colorScheme: {
      light: {
        surface: zinc,
        primary: {
          color: "{primary.500}",
          contrastColor: "#ffffff",
          hoverColor: "{primary.600}",
          activeColor: "{primary.700}",
        },
      },
      dark: {
        surface: { ...zinc, 900: "#131316", 950: "#09090b" },
        primary: {
          color: "{primary.500}",
          contrastColor: "#ffffff",
          hoverColor: "{primary.600}",
          activeColor: "{primary.700}",
        },
      },
    },
  },
});

export default {
  preset: BrandPreset,
  options: {
    prefix: "p",
    darkModeSelector: ".dark",
    cssLayer: false,
  },
};
