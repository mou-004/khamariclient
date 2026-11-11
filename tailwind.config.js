/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: { colors: { khamari: { navy: '#0A1931', pale: '#B3CFE5', blue: '#4A7FA7', ocean: '#1A3D63', white: '#F6FAFD' } }, fontFamily: { sans: ['DM Sans', 'sans-serif'], display: ['Manrope', 'sans-serif'] } } },
  plugins: [],
};
