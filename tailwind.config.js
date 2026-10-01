/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Tajawal', 'Segoe UI', 'Tahoma', 'sans-serif'],
      },
      colors: {
        ink: 'var(--text)',
        mute: 'var(--muted)',
        line: 'var(--line)',
        surface: 'var(--surface)',
        primary: 'var(--primary)',
        accent: 'var(--accent)',
      },
      boxShadow: {
        soft: '0 18px 50px var(--shadow)',
      },
    },
  },
  plugins: [],
};
