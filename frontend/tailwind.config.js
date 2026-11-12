export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { ink: '#1F262E', chalk: '#F1F3EF', steel: '#6B7885', court: '#2F6BFF', bib: '#F2C230', line: '#D9DED6' },
      fontFamily: { display: ['"Barlow Condensed"', 'Impact', 'sans-serif'], sans: ['Barlow', 'system-ui', 'sans-serif'] }
    }
  },
  plugins: []
};
