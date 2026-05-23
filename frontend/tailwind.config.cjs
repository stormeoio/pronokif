/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      /* ------------------------------------------------
         TYPOGRAPHY — DESIGN.md: Racing Sans One / Chivo / JetBrains Mono
         ------------------------------------------------ */
      fontFamily: {
        display: ['"Racing Sans One"', 'sans-serif'],
        heading: ['"Racing Sans One"', 'sans-serif'],
        body: ['Chivo', 'sans-serif'],
        data: ['"JetBrains Mono"', 'monospace'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        'hero-xl': ['clamp(3rem, 8vw, 6rem)', { lineHeight: '1.05', letterSpacing: '0.01em' }],
        'hero': ['2rem', { lineHeight: '1.1', letterSpacing: '0.01em' }],
        'h2': ['1.375rem', { lineHeight: '1.25' }],
        'h3': ['1.125rem', { lineHeight: '1.3' }],
        'body': ['0.9375rem', { lineHeight: '1.6' }],
        'caption': ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.15em' }],
        'data-lg': ['clamp(2rem, 4vw, 3rem)', { lineHeight: '1' }],
        'data': ['0.875rem', { lineHeight: '1.4' }],
      },

      /* ------------------------------------------------
         COLORS — Charte officielle PronoKif
         ------------------------------------------------ */
      colors: {
        /* shadcn/ui semantic tokens (HSL via CSS vars) */
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        /* Brand palette — DESIGN.md */
        pk: {
          red: '#E10600',
          'red-hover': '#C00500',
          'red-glow': 'rgba(225, 6, 0, 0.4)',
          'red-subtle': 'rgba(225, 6, 0, 0.08)',
          carbon: '#0B0D12',
          surface: '#121418',
          anthracite: '#1A1D24',
          piste: '#F4F4F4',
          titane: '#5F6673',
          emerald: '#10b981',
          amber: '#f59e0b',
          info: '#3b82f6',
          gold: '#FFD700',
          silver: '#C0C0C0',
          bronze: '#CD7F32',
        },
      },

      /* ------------------------------------------------
         SPACING — DESIGN.md base 4px
         ------------------------------------------------ */
      spacing: {
        '4.5': '1.125rem', /* 18px */
        '13': '3.25rem',   /* 52px */
        '15': '3.75rem',   /* 60px */
        '18': '4.5rem',    /* 72px */
      },

      /* ------------------------------------------------
         BORDER RADIUS — DESIGN.md scale
         ------------------------------------------------ */
      borderRadius: {
        lg: "12px",
        md: "6px",
        sm: "2px",
        xl: "16px",
        pill: "9999px",
      },

      /* ------------------------------------------------
         MAX WIDTH
         ------------------------------------------------ */
      maxWidth: {
        'content': '1200px',
      },

      /* ------------------------------------------------
         BOX SHADOW — Brand glows
         ------------------------------------------------ */
      boxShadow: {
        'glow-red': '0 0 15px rgba(225, 6, 0, 0.4)',
        'glow-red-lg': '0 0 20px rgba(225, 6, 0, 0.4)',
        'glow-red-xl': '0 0 30px rgba(225, 6, 0, 0.5)',
        'glow-emerald': '0 0 15px rgba(16, 185, 129, 0.4)',
        'glow-gold': '0 0 15px rgba(255, 215, 0, 0.4)',
        'glow-amber': '0 0 15px rgba(245, 158, 11, 0.4)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 8px 32px rgba(0, 0, 0, 0.4)',
      },

      /* ------------------------------------------------
         KEYFRAMES & ANIMATIONS — DESIGN.md motion
         ------------------------------------------------ */
      keyframes: {
        /* shadcn accordion */
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        /* Live badge pulse */
        "live-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
        /* Countdown text-shadow pulse */
        "countdown-pulse": {
          "0%, 100%": { textShadow: "0 0 8px rgba(225, 6, 0, 0.3)" },
          "50%": { textShadow: "0 0 20px rgba(225, 6, 0, 0.7), 0 0 40px rgba(225, 6, 0, 0.3)" },
        },
        /* CTA glow pulse */
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 10px rgba(225, 6, 0, 0.3)" },
          "50%": { boxShadow: "0 0 25px rgba(225, 6, 0, 0.6), 0 0 40px rgba(225, 6, 0, 0.3)" },
        },
        /* Score increment glow */
        "score-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "50%": { opacity: "1", textShadow: "0 0 12px rgba(16, 185, 129, 0.8)" },
          "100%": { opacity: "1", transform: "translateY(0)", textShadow: "none" },
        },
        /* Stagger reveal (classements) */
        "slide-in": {
          from: { opacity: "0", transform: "translateX(-12px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        /* Scale in */
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        /* Fade in up */
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        /* Start light fill */
        "light-on": {
          "0%": { background: "rgba(255,255,255,0.05)", boxShadow: "none" },
          "100%": { background: "#E10600", boxShadow: "0 0 30px rgba(225, 6, 0, 0.8)" },
        },
        /* Shimmer skeleton */
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        /* CTA sweep */
        "sweep": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "live-pulse": "live-pulse 1.5s ease-in-out infinite",
        "countdown-pulse": "countdown-pulse 3s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "score-up": "score-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
        "slide-in": "slide-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both",
        "scale-in": "scale-in 0.2s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-up": "fade-up 0.35s cubic-bezier(0.22, 1, 0.36, 1) both",
        "light-on": "light-on 0.4s ease-out forwards",
        "shimmer": "shimmer 1.5s infinite",
        "sweep": "sweep 0.6s ease-out",
      },

      /* ------------------------------------------------
         TRANSITIONS — DESIGN.md easing
         ------------------------------------------------ */
      transitionTimingFunction: {
        'pk-enter': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'pk-exit': 'ease-in',
        'pk-move': 'ease-in-out',
      },
      transitionDuration: {
        'micro': '80ms',
        'short': '200ms',
        'medium': '350ms',
        'long': '600ms',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
