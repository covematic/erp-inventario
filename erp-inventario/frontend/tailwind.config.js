/** @type {import('tailwindcss').Config} */
// Identidad "almacén": piso de concreto (grises verdosos), rack azul (estructura y enlaces),
// viga naranja (acción principal) y etiqueta amarilla (códigos de productos y documentos).
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Barlow', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Barlow Condensed"', 'Barlow', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Neutros con leve tinte verde (concreto pintado de almacén)
        slate: {
          50: '#F4F6F3', 100: '#ECEEEA', 200: '#D9DED7', 300: '#C0C7BE', 400: '#8E978C',
          500: '#5F685E', 600: '#4C554C', 700: '#3A423B', 800: '#273029', 900: '#1B2420', 950: '#111814',
        },
        // Rack azul
        brand: {
          50: '#EEF3FA', 100: '#D8E3F3', 200: '#B3C8E7', 300: '#84A5D5', 400: '#5381C0',
          500: '#3265AA', 600: '#1F4F95', 700: '#1A417B', 800: '#173663', 900: '#142D51', 950: '#0D1C33',
        },
        // Viga naranja: solo para la acción principal
        beam: { 300: '#F7B27A', 400: '#F59540', 500: '#EE7A1E', 600: '#D5630B', 700: '#A94C08' },
        // Etiqueta amarilla de ubicación
        label: { 100: '#FDF3C8', 300: '#F8DD6E', 400: '#F5CF3A', 600: '#C99A0C' },
      },
      boxShadow: {
        card: '0 1px 0 0 rgb(27 36 32 / 0.04)',
      },
    },
  },
  plugins: [],
};
