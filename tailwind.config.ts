import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#e8eef5',
          100: '#cdd9e8',
          200: '#9bb3d1',
          300: '#698cba',
          400: '#3766a3',
          500: '#0A233F', // Main Navy Blue
          600: '#081c32',
          700: '#061526',
          800: '#040e19',
          900: '#02070d',
        },
        crimson: {
          50: '#fbe8ea',
          100: '#f6d1d5',
          200: '#eda3ab',
          300: '#e47581',
          400: '#db4757',
          500: '#C1121F', // Main Crimson Red
          600: '#9a0e19',
          700: '#740b13',
          800: '#4d070c',
          900: '#270406',
        },
        gold: {
          50: '#fefaed',
          100: '#fdf5db',
          200: '#fbebb7',
          300: '#f9e193',
          400: '#f7d76f',
          500: '#F6C623', // Main Golden Yellow
          600: '#c49e1c',
          700: '#937715',
          800: '#624f0e',
          900: '#312807',
        },
        slate: {
          50: '#f9fafb',
          100: '#E6E9EE', // Main Slate Gray
          200: '#ced3dd',
          300: '#b5bdcc',
          400: '#9da7bb',
          500: '#8491aa',
          600: '#6b7a99',
          700: '#536488',
          800: '#3a4d77',
          900: '#213766',
        },
        cool: {
          50: '#eef4fa',
          100: '#dde9f5',
          200: '#bbd3eb',
          300: '#99bde1',
          400: '#77a7d7',
          500: '#3A6EA5', // Main Cool Blue
          600: '#2e5884',
          700: '#234263',
          800: '#172c42',
          900: '#0c1621',
        },
        primary: {
          50: '#e8eef5',
          100: '#cdd9e8',
          200: '#9bb3d1',
          300: '#698cba',
          400: '#3766a3',
          500: '#0A233F', // Main Navy Blue (alias)
          600: '#081c32',
          700: '#061526',
          800: '#040e19',
          900: '#02070d',
        },
      },
      borderRadius: {
        'card': '12px',
        'button': '8px',
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
      },
      backdropBlur: {
        'glass': '4px',
      },
    },
  },
  plugins: [],
}
export default config

