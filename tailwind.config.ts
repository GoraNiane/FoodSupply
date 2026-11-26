import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/modules/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Couleur principale : Bleu Royal vibrant (actions, CTA, éléments clés)
        brand: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#2563EB",
          600: "#1D4ED8",
          700: "#1E40AF",
          800: "#1E3A8A",
          900: "#172554",
        },
        // Couleur secondaire : Bleu profond + touche de noir élégante (950)
        navy: {
          50: "#F0F5FF",
          100: "#DCE7FD",
          200: "#BBD1FB",
          300: "#8BB0F7",
          400: "#5487F0",
          500: "#2A5CE0",
          600: "#1C43B8",
          700: "#17348F",
          800: "#122668",
          900: "#0D1B44",
          950: "#090D16", // Touche de noir bleuté subtil
        },
        // Accents noirs subtils pour contrastes fins
        ink: {
          900: "#0B0F19",
          950: "#05070C",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#F8FAFC",
          subtle: "#F1F5F9",
          border: "#E2E8F0",
        },
        success: {
          50: "#ECFDF5",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
        },
        danger: {
          50: "#FEF2F2",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
        },
        warning: {
          50: "#FFFBEB",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(9, 13, 22, 0.06), 0 1px 2px -1px rgba(9, 13, 22, 0.04)",
        elevated:
          "0 12px 28px -6px rgba(9, 13, 22, 0.10), 0 4px 10px -6px rgba(9, 13, 22, 0.06)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
    },
  },
  plugins: [],
};

export default config;
