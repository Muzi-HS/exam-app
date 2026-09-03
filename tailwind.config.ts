import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        "text-primary": "rgb(var(--text-primary) / <alpha-value>)",
        "text-secondary": "rgb(var(--text-secondary) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-soft": "rgb(var(--accent-soft) / <alpha-value>)",
        status: {
          blank: "rgb(var(--status-blank) / <alpha-value>)",
          unknown: "rgb(var(--status-unknown) / <alpha-value>)",
          partial: "rgb(var(--status-partial) / <alpha-value>)",
          mastered: "rgb(var(--status-mastered) / <alpha-value>)",
        },
        subject: {
          1: "rgb(var(--subject-1) / <alpha-value>)",
          "1-soft": "rgb(var(--subject-1-soft) / <alpha-value>)",
          2: "rgb(var(--subject-2) / <alpha-value>)",
          "2-soft": "rgb(var(--subject-2-soft) / <alpha-value>)",
          3: "rgb(var(--subject-3) / <alpha-value>)",
          "3-soft": "rgb(var(--subject-3-soft) / <alpha-value>)",
          4: "rgb(var(--subject-4) / <alpha-value>)",
          "4-soft": "rgb(var(--subject-4-soft) / <alpha-value>)",
          5: "rgb(var(--subject-5) / <alpha-value>)",
          "5-soft": "rgb(var(--subject-5-soft) / <alpha-value>)",
          6: "rgb(var(--subject-6) / <alpha-value>)",
          "6-soft": "rgb(var(--subject-6-soft) / <alpha-value>)",
          7: "rgb(var(--subject-7) / <alpha-value>)",
          "7-soft": "rgb(var(--subject-7-soft) / <alpha-value>)",
          8: "rgb(var(--subject-8) / <alpha-value>)",
          "8-soft": "rgb(var(--subject-8-soft) / <alpha-value>)",
          9: "rgb(var(--subject-9) / <alpha-value>)",
          "9-soft": "rgb(var(--subject-9-soft) / <alpha-value>)",
          10: "rgb(var(--subject-10) / <alpha-value>)",
          "10-soft": "rgb(var(--subject-10-soft) / <alpha-value>)",
          11: "rgb(var(--subject-11) / <alpha-value>)",
          "11-soft": "rgb(var(--subject-11-soft) / <alpha-value>)",
          12: "rgb(var(--subject-12) / <alpha-value>)",
          "12-soft": "rgb(var(--subject-12-soft) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "12px",
      },
      boxShadow: {
        subtle: "0 1px 2px rgb(0 0 0 / 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
