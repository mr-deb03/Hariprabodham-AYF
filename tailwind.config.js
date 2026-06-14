/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Cormorant Garamond"', "Georgia", "serif"],
        serif: ['"Cormorant Garamond"', "Georgia", "serif"],
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      colors: {
        // Spiritual palette
        ivory: "#FFF8F0", // primary background
        cream: "#F8F3E8", // secondary background
        sand: "#F5E6C8", // gradient accent
        gold: "#D4AF37", // divine gold
        goldDark: "#C19B2E", // richer gold (hover)
        saffron: "#E08A1E", // deep saffron
        maroon: "#7A2E2E", // temple maroon
        maroonDark: "#5C2121", // deep maroon (gradient end)
        bronze: "#A97142", // sacred bronze
        ink: "#2B2B2B", // primary text
        textSoft: "#5E5E5E", // secondary text
        textMuted: "#757575", // muted text
        onDark: "#FAF8F5", // text on dark sections

        // Legacy aliases → remapped to the new palette
        primaryBrown: "#7A2E2E",
        primaryDark: "#5C2121",
        accent: "#E08A1E",
        mutedBlue: "#5E5E5E",
        softGray: "#F8F3E8",
      },
      boxShadow: {
        soft: "0 10px 30px rgba(0, 0, 0, 0.06)",
        card: "0 16px 40px rgba(0, 0, 0, 0.08)",
        gold: "0 12px 28px rgba(212, 175, 55, 0.25)",
        goldStrong: "0 16px 36px rgba(212, 175, 55, 0.4)",
      },
      keyframes: {
        floaty: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-22px)" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(30px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        floaty: "floaty 9s ease-in-out infinite",
        fadeUp: "fadeUp 0.8s ease-out both",
      },
      backgroundImage: {
        sacred:
          "linear-gradient(135deg, #FFF8F0 0%, #F8F3E8 40%, #F5E6C8 100%)",
        "hero-glow":
          "radial-gradient(circle at top center, rgba(212, 175, 55, 0.15), transparent 60%)",
      },
    },
  },
  plugins: [],
};
