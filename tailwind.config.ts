import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx,mdx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#1f2937',
        paper: '#fbfbfb',
        line: '#e5e7eb',
        muted: '#6b7280',
      },
      boxShadow: {
        soft: '0 18px 45px rgb(15 23 42 / 0.08)',
      },
    },
  },
  plugins: [typography],
};

export default config;
