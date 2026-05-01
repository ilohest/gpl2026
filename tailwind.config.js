// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
   theme: {
    extend: {
      colors: {
        primary: 'var(--primary-color)',
        accent: 'var(--accent-color)',
        'accent-hover': 'var(--accent-hover-color)',
        'accent-active': 'var(--accent-active-color)',
        ink: 'var(--text-color)',
        'secondary-text': 'var(--secondary-text-color)',
        'menu-active': 'var(--menu-active-color)',
      },
      fontFamily: {
        edith: ['Edith', 'sans-serif'],
        claudy: ['MsClaudy', 'cursive'],
        sans: ['var(--font-family)'],
        heading: ['var(--h-font-family)'],
      },
    },
  },
  plugins: [],
}
