import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#f8f2e8",
        ink: "#1c1d1f",
        sand: "#e8dcc7",
        clay: "#c98f5d",
        pine: "#26453d",
        ember: "#8a3f2b",
        mist: "#fbf8f2",
      },
      boxShadow: {
        card: "0 18px 50px rgba(28, 29, 31, 0.08)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      fontFamily: {
        display: [
          "Iowan Old Style",
          "Palatino Linotype",
          "Book Antiqua",
          "Georgia",
          "serif",
        ],
        body: [
          "Avenir Next",
          "Segoe UI",
          "Helvetica Neue",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;

