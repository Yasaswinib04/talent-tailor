/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        app: "#0A0A0A",
        surface: "#141414",
        card: "#1A1A1A",
        subtle: "#262626",
        brand: "#B28A5D",
        gold: "#D4AF37",
        success: "#2E8B57",
        danger: "#8B0000",
      },
      fontFamily: {
        editorial: ["'Cormorant Garamond'", "serif"],
        display: ["'Cabinet Grotesk'", "'Satoshi'", "system-ui", "sans-serif"],
        sans: ["'Satoshi'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        widest2: "0.2em",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        fadeup: {
          "0%": { opacity: 0, transform: "translateY(12px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        trace: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(200%)" },
        },
      },
      animation: {
        shimmer: "shimmer 2.4s linear infinite",
        fadeup: "fadeup 0.5s ease-out both",
        trace: "trace 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
