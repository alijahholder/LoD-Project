import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f7fb",
          100: "#e8edf6",
          200: "#cdd8ec",
          300: "#a3b6dc",
          400: "#7390c8",
          500: "#4f70b3",
          600: "#3c5897",
          700: "#32487a",
          800: "#2d3e66",
          900: "#293656",
          950: "#1a2138",
        },
        accent: {
          500: "#c9a227",
          600: "#a8851d",
        },
      },
      fontFamily: {
        sans: ["system-ui", "ui-sans-serif", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
