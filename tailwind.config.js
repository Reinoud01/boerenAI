/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Brand guide: Karres en Brands / Boer Transitie Scanner
        brand: {
          black:   '#000000',
          white:   '#FFFFFF',
          green:   '#CBE6C7',  // Sauge Groen — primaire actie kleur
          gray: {
            light:  '#E6E6E6', // dividers
            mid:    '#B3B3B3', // muted / inactive
            dark:   '#8C8C8C', // secondary text / metadata
          }
        }
      },
      fontFamily: {
        sans: ['Arial', 'Helvetica Neue', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0px',
        none: '0px',
      }
    }
  },
  plugins: []
}
