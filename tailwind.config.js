/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Le Tréteau — the trestle stage. Deep theatre-red velvet, gilt, footlights.
        // Semantic tokens are driven by CSS variables (see index.css) so light
        // (playbill cream) and dark (velvet house) share one vocabulary.
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2) / <alpha-value>)",
        "surface-3": "rgb(var(--surface-3) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        "ink-dim": "rgb(var(--ink-dim) / <alpha-value>)",
        "ink-faint": "rgb(var(--ink-faint) / <alpha-value>)",
        // Fixed brand pigments (same in both themes)
        velvet: {
          DEFAULT: "#7e1d1f",
          deep: "#4e1113",
          dark: "#2a0a0c",
          bright: "#a8302c",
        },
        gilt: {
          DEFAULT: "#c79a3e",
          bright: "#e3b341",
          pale: "#f0d893",
          deep: "#9c742a",
        },
        foot: "#f4d06f", // footlight glow
        // Cast accent set — distinct, legible on both cream and velvet.
        cast: {
          crimson: "#c0392b",
          amber: "#d68910",
          gold: "#caa83a",
          olive: "#7f8a30",
          jade: "#2e8b6f",
          teal: "#1f7a82",
          cobalt: "#3a5fae",
          indigo: "#5b4ba0",
          plum: "#8e3c79",
          rose: "#c45d7c",
          slate: "#5a6b78",
          rust: "#b0552d",
        },
      },
      fontFamily: {
        // Playbill display, garamond body, archivo for UI chrome, typewriter for script.
        display: ['"Playfair Display"', "Georgia", "serif"],
        body: ['"Cormorant Garamond"', "Georgia", "serif"],
        sans: ['"Archivo"', "system-ui", "sans-serif"],
        type: ['"Special Elite"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        proscenium: "0 24px 60px -28px rgba(0,0,0,0.7)",
        lift: "0 10px 30px -16px rgba(0,0,0,0.55)",
      },
      keyframes: {
        riseIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        footFlicker: {
          "0%, 100%": { opacity: "0.85" },
          "45%": { opacity: "1" },
          "55%": { opacity: "0.78" },
        },
        curtainUp: {
          "0%": { transform: "scaleY(1)" },
          "100%": { transform: "scaleY(0)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "0.3" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        riseIn: "riseIn 0.45s cubic-bezier(0.2,0.7,0.2,1) both",
        footFlicker: "footFlicker 3.5s ease-in-out infinite",
        pulseDot: "pulseDot 1.1s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
