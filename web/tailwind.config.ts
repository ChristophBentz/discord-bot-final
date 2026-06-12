import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        // Background-Skala
        bg: {
          base: "#0a0a0f",
          raised: "#11111a",
          card: "#15151f",
          elevated: "#1a1a26",
          hover: "#22222e",
        },
        line: {
          DEFAULT: "rgba(255,255,255,0.06)",
          strong: "rgba(255,255,255,0.10)",
        },
        ink: {
          DEFAULT: "#f4f4f6",
          muted: "#a1a1aa",
          subtle: "#71717a",
        },
        // Primary-Akzent — Werte kommen als CSS-Variablen aus dem Root-Layout
        // (global einstellbar im Dashboard, Default: Violet → Pink)
        brand: {
          DEFAULT: "rgb(var(--accent-from) / <alpha-value>)",
          hover: "rgb(var(--accent-from) / 0.85)",
          subtle: "rgb(var(--accent-from) / 0.12)",
        },
        // Modul-Icon-Farben (pastellig getönte Hintergründe).
        icon: {
          red: { bg: "rgba(239,68,68,0.12)", fg: "#f87171" },
          orange: { bg: "rgba(249,115,22,0.12)", fg: "#fb923c" },
          amber: { bg: "rgba(245,158,11,0.12)", fg: "#fbbf24" },
          green: { bg: "rgba(34,197,94,0.12)", fg: "#4ade80" },
          teal: { bg: "rgba(20,184,166,0.12)", fg: "#2dd4bf" },
          blue: { bg: "rgba(59,130,246,0.12)", fg: "#60a5fa" },
          violet: { bg: "rgba(168,85,247,0.12)", fg: "#c084fc" },
          pink: { bg: "rgba(236,72,153,0.12)", fg: "#f472b6" },
          slate: { bg: "rgba(148,163,184,0.10)", fg: "#94a3b8" },
        },
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.25)",
        "card-lg": "0 1px 0 rgba(255,255,255,0.04) inset, 0 16px 48px rgba(0,0,0,0.45)",
        glow: "0 0 0 1px rgb(var(--accent-from) / 0.30), 0 8px 24px rgb(var(--accent-from) / 0.20)",
      },
      backdropBlur: {
        xs: "4px",
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
        "3xl": "24px",
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, rgb(var(--accent-from)) 0%, rgb(var(--accent-to)) 100%)",
        "brand-gradient-soft":
          "linear-gradient(135deg, rgb(var(--accent-from) / 0.2) 0%, rgb(var(--accent-to) / 0.15) 100%)",
      },
    },
  },
  plugins: [],
} satisfies Config;
