/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Cybersecurity palette
        cyber: {
          50:  '#ecfeff',
          100: '#cffafe',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          900: '#164e63',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow':  'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':     'fadeIn 0.5s ease-in-out',
        'slide-in':    'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' },            '100%': { opacity: '1' } },
        slideIn: { '0%': { transform: 'translateX(-20px)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
      },
      backdropBlur: { xs: '2px' },
      boxShadow: {
        'glow-cyan':   '0 0 20px rgba(34, 211, 238, 0.2)',
        'glow-red':    '0 0 20px rgba(239, 68, 68, 0.2)',
        'glow-blue':   '0 0 20px rgba(59, 130, 246, 0.2)',
        'glow-amber':  '0 0 20px rgba(245, 158, 11, 0.2)',
        'glass':       '0 8px 32px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
};

