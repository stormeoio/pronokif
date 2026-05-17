/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Orbitron', 'sans-serif'],
        body: ['Rajdhani', 'sans-serif'],
        data: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))"
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        gaming: {
          orange: '#ff6600',
          red: '#ff0040',
          blue: '#00ccff',
          yellow: '#ffcc00',
          green: '#00ff66',
          dark: '#0a0f1a',
          card: '#1a1f2e',
          metallic: '#4a4a5a',
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" }
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" }
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 10px rgba(255, 102, 0, 0.4)" },
          "50%": { boxShadow: "0 0 25px rgba(255, 102, 0, 0.8), 0 0 40px rgba(255, 102, 0, 0.4)" }
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" }
        },
        "gold-shimmer": {
          "0%, 100%": { boxShadow: "0 0 8px rgba(251, 191, 36, 0.3)" },
          "50%": { boxShadow: "0 0 16px rgba(251, 191, 36, 0.6), 0 0 32px rgba(251, 191, 36, 0.3)" }
        },
        "neon-border": {
          "0%, 100%": { boxShadow: "0 0 5px rgba(0, 212, 255, 0.4), inset 0 0 5px rgba(0, 212, 255, 0.1)" },
          "50%": { boxShadow: "0 0 20px rgba(0, 212, 255, 0.6), inset 0 0 10px rgba(0, 212, 255, 0.2)" }
        },
        "slide-in": {
          "from": { opacity: "0", transform: "translateX(-12px)" },
          "to": { opacity: "1", transform: "translateX(0)" }
        },
        "scale-in": {
          "from": { opacity: "0", transform: "scale(0)" },
          "to": { opacity: "1", transform: "scale(1)" }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "gold": "gold-shimmer 2s ease-in-out infinite",
        "neon": "neon-border 2s ease-in-out infinite",
        "slide-in": "slide-in 0.4s ease-out both",
        "scale-in": "scale-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) both"
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
}
