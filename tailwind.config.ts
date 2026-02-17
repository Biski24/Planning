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
        bg: "#f5f6f8",
        panel: "#ffffff",
        electric: "#d71920",
        electricSoft: "#b3141a",
        maif: {
          primary: "#d71920",
          primaryHover: "#b3141a",
          surface: "#ffffff",
          surfaceAlt: "#f5f6f8",
          text: "#1f2937",
          muted: "#6b7280",
          border: "#e5e7eb",
          ring: "#fca5a5",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(215,25,32,0.14), 0 8px 24px rgba(17,24,39,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
