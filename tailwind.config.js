import colors from "tailwindcss/colors";
import primeui from "tailwindcss-primeui";

export default {
  content: ["./components/**/*.{js,vue,ts}", "./layouts/**/*.vue", "./pages/**/*.vue", "./plugins/**/*.{js,ts}", "./app.vue"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        gray: colors.zinc,
        primary: {
          light: "#c70512",
          dark: "#ff6b76",
        },
      },
    },
  },
  plugins: [primeui],
};
