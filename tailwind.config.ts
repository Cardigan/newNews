import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand colors (kept for source badges)
        bbc: '#bb1919',
        guardian: '#052962',
        hn: '#ff6600',
        reddit: '#ff4500',
        // Light-Nintendo / SMB1 palette
        cream: '#fff8e7',
        ink: '#2d2d44',
        shadow: '#1a1a2e',
        mario: '#e52521',
        luigi: '#43b047',
        sky: '#5c94fc',
        princess: '#ffb7dd',
        coin: '#fbd000',
        cloud: '#f8f8f8',
        peach: '#ffd9a8',
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        retro: ['"VT323"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        // Chunky 3px black drop, NES-button style
        nes: '3px 3px 0 0 #1a1a2e',
        'nes-sm': '2px 2px 0 0 #1a1a2e',
        'nes-lg': '4px 4px 0 0 #1a1a2e',
        'nes-inset': 'inset -2px -2px 0 0 rgba(0,0,0,0.25), inset 2px 2px 0 0 rgba(255,255,255,0.4)',
      },
    },
  },
  plugins: [],
} satisfies Config;
