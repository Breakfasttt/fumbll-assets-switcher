/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/renderer/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        app: "#17171c",
        sidebar: "#1a1a20",
        card: "#23232b",
        "card-raised": "#2a2a33",
        input: "#17171c",
        well: "#111114",
        border: {
          DEFAULT: "#34343e",
          strong: "#454552",
        },
        muted: "#8b8b96",
        faint: "#5c5c68",
        accent: {
          DEFAULT: "#3d5afe",
          hover: "#5570ff",
          active: "#f5a623",
        },
        success: "#4ade80",
        danger: {
          DEFAULT: "#f43f5e",
          hover: "#fb3f63",
        },
      },
      borderRadius: {
        DEFAULT: "6px",
        lg: "8px",
      },
    },
  },
  plugins: [],
};
