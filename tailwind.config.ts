import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        chainora: {
          bg: '#f8fafc',
          ink: '#0f172a',
          accent: '#0ea5e9',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
