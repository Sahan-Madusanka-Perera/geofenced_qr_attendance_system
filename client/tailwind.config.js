/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Archivo Variable', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        board: ['Martian Mono Variable', 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
      },
      // A flap board has no rounded corners. Radius exists only so the
      // inherited Radix primitives do not fall back to their own defaults.
      borderRadius: {
        lg: 'var(--radius)',
        md: 'var(--radius)',
        sm: 'var(--radius)',
      },
      colors: {
        board: 'hsl(var(--board) / <alpha-value>)',
        slat: {
          DEFAULT: 'hsl(var(--slat) / <alpha-value>)',
          raised: 'hsl(var(--slat-raised) / <alpha-value>)',
          edge: 'hsl(var(--slat-edge) / <alpha-value>)',
        },
        char: {
          DEFAULT: 'hsl(var(--char) / <alpha-value>)',
          dim: 'hsl(var(--char-dim) / <alpha-value>)',
          faint: 'hsl(var(--char-faint) / <alpha-value>)',
        },
        amber: 'hsl(var(--amber) / <alpha-value>)',
        green: 'hsl(var(--green) / <alpha-value>)',
        red: 'hsl(var(--red) / <alpha-value>)',
        pass: {
          DEFAULT: 'hsl(var(--pass) / <alpha-value>)',
          ink: 'hsl(var(--pass-ink) / <alpha-value>)',
          fade: 'hsl(var(--pass-fade) / <alpha-value>)',
        },

        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        card: { DEFAULT: 'hsl(var(--card) / <alpha-value>)', foreground: 'hsl(var(--card-foreground) / <alpha-value>)' },
        popover: { DEFAULT: 'hsl(var(--popover) / <alpha-value>)', foreground: 'hsl(var(--popover-foreground) / <alpha-value>)' },
        primary: { DEFAULT: 'hsl(var(--primary) / <alpha-value>)', foreground: 'hsl(var(--primary-foreground) / <alpha-value>)' },
        secondary: { DEFAULT: 'hsl(var(--secondary) / <alpha-value>)', foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)' },
        muted: { DEFAULT: 'hsl(var(--muted) / <alpha-value>)', foreground: 'hsl(var(--muted-foreground) / <alpha-value>)' },
        accent: { DEFAULT: 'hsl(var(--accent) / <alpha-value>)', foreground: 'hsl(var(--accent-foreground) / <alpha-value>)' },
        destructive: { DEFAULT: 'hsl(var(--destructive) / <alpha-value>)', foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)' },
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
      },
      letterSpacing: {
        board: '0.16em',
        gate: '0.32em',
      },
      boxShadow: {
        flap: '0 1px 0 hsl(var(--board) / <alpha-value>), 0 2px 6px -2px hsl(0 0% 0% / 0.8)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
