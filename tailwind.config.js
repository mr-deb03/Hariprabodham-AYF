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
        gold: "#D4AF37", // divine gold — decorative fills/borders only, 2.0:1 as text
        goldDark: "#C19B2E", // richer gold (hover)
        saffron: "#E08A1E", // deep saffron — decorative only, 2.4:1 as text
        maroon: "#7A2E2E", // temple maroon
        maroonDark: "#5C2121", // deep maroon (gradient end)
        bronze: "#96643B", // sacred bronze — darkened from #A97142 for WCAG AA (4.54:1 on cream)
        ink: "#2B2B2B", // primary text
        textSoft: "#5E5E5E", // secondary text
        textMuted: "#6F6F6F", // muted text — darkened from #757575 for WCAG AA (4.54:1 on cream)

        // Accessible text-safe variants of the decorative brand colours. Use
        // these whenever gold/saffron carry meaning as TEXT or as an icon that
        // isn't purely ornamental — the originals fail AA badly (2.0:1, 2.4:1).
        goldText: "#856D1D", // 4.52:1 on cream
        saffronText: "#9E6215", // 4.51:1 on cream
        onDark: "#FAF8F5", // text on dark sections

        // Legacy aliases → remapped to the new palette
        primaryBrown: "#7A2E2E",
        primaryDark: "#5C2121",
        accent: "#E08A1E",
        mutedBlue: "#5E5E5E",
        softGray: "#F8F3E8",

        // Logo gradient (turban crimson → magenta → royal blue)
        logoCrimson: "#E01E5A",
        logoMagenta: "#C2186F",
        logoBlue: "#1E3A8A",
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
