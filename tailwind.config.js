module.exports = {
  purge: [],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {},
  },
  variants: {
    extend: {},
  },
  plugins: [],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",     
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",   
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
}
