import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      fontFamily: {
        sans: ['Cairo', 'system-ui', '-apple-system', 'sans-serif'],
        cairo: ['Cairo', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        xs:   ['0.8125rem', { lineHeight: '1.25rem' }],
        sm:   ['0.9375rem', { lineHeight: '1.5rem' }],
        base: ['1rem',      { lineHeight: '1.625rem' }],
        lg:   ['1.125rem',  { lineHeight: '1.75rem' }],
        xl:   ['1.25rem',   { lineHeight: '1.875rem' }],
        '2xl':['1.5rem',    { lineHeight: '2rem' }],
      },
      colors: {
        border:     'hsl(var(--border))',
        input:      'hsl(var(--input))',
        ring:       'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        /* UAE-specific tokens */
        gold: {
          DEFAULT: 'hsl(var(--gold))',
          light:   'hsl(var(--gold-light))',
        },
        uae: {
          green: '#007A3D',
          deep:  '#005A2E',
          gold:  '#C9A84C',
          red:   '#CE1126',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        'uae':     '0 2px 12px hsl(150 100% 24% / 0.2)',
        'uae-lg':  '0 6px 24px hsl(150 100% 24% / 0.25)',
        'gold':    '0 2px 8px hsl(41 62% 52% / 0.25)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up':   { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'fade-in':  { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-in': { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
        shimmer:    { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
        'pulse-green': {
          '0%, 100%': { boxShadow: '0 0 0 0 hsl(150 100% 24% / 0.4)' },
          '50%':      { boxShadow: '0 0 0 6px hsl(150 100% 24% / 0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        'fade-in':        'fade-in 0.25s ease-out',
        'slide-in':       'slide-in 0.3s ease-out',
        shimmer:          'shimmer 2s infinite linear',
        'pulse-green':    'pulse-green 2s ease-in-out infinite',
      },
    },
  },
  plugins: [animate],
}

export default config
