import Aura from "@primevue/themes/aura";
import { definePreset } from "@primevue/themes";

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
        primary: {
          color: "{primary.500}",
          contrastColor: "#f8f5f5",
          hoverColor: "{primary.600}",
          activeColor: "{primary.700}",
        },
      },
      dark: {
        primary: {
          color: "{primary.500}",
          contrastColor: "#f8f5f5",
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
