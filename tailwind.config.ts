import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bbc: '#bb1919',
        guardian: '#052962',
        hn: '#ff6600',
        reddit: '#ff4500',
      },
    },
  },
  plugins: [],
} satisfies Config;
