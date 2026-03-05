import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx,css}'],
  theme: {
    extend: {
      colors: {
        odp: {
          bg: '#23272e', // editor.background
          bgSoft: '#1e2227', // sideBar.background
          bgSofter: '#181a1f', // editorGroup.background
          surface: '#23272e', // cards, panels
          line: '#2c313c', // editor.lineHighlightBackground
          focusBg: '#323842', // list.focusBackground
          border: '#3e4452', // focusBorder
          borderSoft: '#23272e',
          borderStrong: '#343a45',
          fg: '#abb2bf', // editor.foreground
          fgStrong: '#d7dae0', // activityBar.foreground
          muted: '#7f848e',
          accentBlue: '#61afef',
          accentYellow: '#e5c07b',
          accentOrange: '#d19a66',
          accentRed: '#e06c75',
          accentGreen: '#98c379',
          accentPurple: '#c678dd',
          dangerSoft: '#3f262a',
          dangerSoftHover: '#5a3238',
          warningSoft: '#3d2e10',
          warningText: '#f0d38a',
        },
      },
      fontFamily: {
        sans: ['Paperozi', 'system-ui', 'sans-serif'],
        display: ['A2z', 'Paperozi', 'system-ui', 'sans-serif'],
        mono: [
          'JetBrainsMono',
          'D2Coding',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
};

export default config;
