import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        line: 'var(--border)',
        lilac: {
          50: 'var(--lilac-50)',
          100: 'var(--lilac-100)',
          200: 'var(--lilac-200)',
          400: 'var(--lilac-400)',
        500: 'var(--lilac-500)',
          600: 'var(--lilac-600)',
          700: 'var(--lilac-700)',
        },
        success: 'var(--success)',
        danger: 'var(--danger)',
      },
      fontFamily: {
        script: ['var(--font-script)', 'cursive'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 20px 40px -20px rgba(87, 64, 139, 0.14)',
        lift: '0 28px 60px -24px rgba(87, 64, 139, 0.22)',
        hair: '0 1px 0 0 var(--border)',
      },
      borderRadius: {
        xl2: '1.25rem',
        xl3: '1.75rem',
      },
      transitionTimingFunction: {
        soft: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
