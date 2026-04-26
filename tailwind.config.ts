import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Inter'", "system-ui", "-apple-system", "sans-serif"]
      },
      colors: {
        background: "var(--surface-bg)",
        card: "var(--surface-card)",
        "card-hover": "var(--surface-card-hover)",
        glass: "var(--surface-glass)",
        "glass-border": "var(--surface-glass-border)",
        border: "var(--surface-border)",
        foreground: "var(--text-primary)",
        muted: "var(--text-muted)",
        brand: {
          primary: "var(--brand-primary)",
          accent: "var(--brand-accent)",
          "gradient-start": "var(--brand-gradient-start)",
          "gradient-mid": "var(--brand-gradient-mid)",
          "gradient-end": "var(--brand-gradient-end)",
          glow: "var(--brand-glow)",
        }
      },
      boxShadow: {
        "glow-sm": "0 0 10px var(--brand-glow)",
        "glow-md": "0 0 20px var(--brand-glow)",
        "glow-lg": "0 0 30px var(--brand-glow)",
        "card-glow": "0 8px 30px rgba(0, 0, 0, 0.4), 0 0 20px var(--brand-glow)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out both",
        "slide-up": "slideUp 0.5s ease-out both",
        "slide-in-right": "slideInRight 0.4s ease-out both",
        "scale-in": "scaleIn 0.35s ease-out both",
        shimmer: "shimmer 1.8s infinite linear",
        "pulse-glow": "pulseGlow 2.5s ease-in-out infinite",
        float: "float 3.5s ease-in-out infinite",
        "border-beam": "borderBeam 3s linear infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" }
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(18px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        slideInRight: {
          from: { opacity: "0", transform: "translateX(24px)" },
          to: { opacity: "1", transform: "translateX(0)" }
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" }
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 var(--brand-glow)" },
          "50%": { boxShadow: "0 0 20px 4px var(--brand-glow)" }
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" }
        },
        borderBeam: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "100% 50%" }
        }
      }
    }
  },
  plugins: []
};

export default config;
