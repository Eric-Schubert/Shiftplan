/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./app.vue",
    "./error.vue",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          light: "#6750A4",
          dark: "#cfa2ff",
        },
        secondary: {
          light: "#f1f5f9",
          dark: "#2e3138",
        },
      },
    },
  },
  plugins: [require("tailwindcss-primeui")],
};
