import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#FFFFFF',
          secondary: '#F5F5F5',
          card: '#FAFAFA',
        },
        foreground: {
          DEFAULT: '#0A0A0A',
          secondary: '#656565',
          muted: '#9B9B9B',
        },
        cta: {
          DEFAULT: '#0A0A0A',
          hover: '#333333',
          text: '#FFFFFF',
        },
        'dark-card': {
          DEFAULT: '#1A1A1A',
          text: '#FFFFFF',
        },
        accent: '#4F46E5',
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
        gold: '#D4A017',
        border: '#E5E7EB',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        card: '16px',
        'card-lg': '20px',
        pill: '9999px',
      },
    },
  },
  plugins: [],
};

export default config;
