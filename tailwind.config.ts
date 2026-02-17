import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#090d14",
        panel: "#111a29",
        electric: "#2f6dff",
        electricSoft: "#7ea2ff",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(47,109,255,0.35), 0 8px 30px rgba(47,109,255,0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
