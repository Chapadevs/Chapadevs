/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#059669',
          dark: '#047857',
          light: '#10b981',
        },
        ink: {
          DEFAULT: '#111827',
          secondary: '#374151',
          muted: '#6b7280',
        },
        surface: {
          DEFAULT: '#ffffff',
          gray: '#f9fafb',
          green: '#ecfdf5',
        },
        border: '#e5e7eb',
      },
      fontFamily: {
        heading: ['"Coolvetica"', 'Arial', 'Helvetica', 'sans-serif'],
        button: ['"GoogleSansCode"', 'Arial', 'Helvetica', 'sans-serif'],
        body: ['"Sansation-Regular"', 'serif'],
      },
      borderRadius: {
        none: '0',
        DEFAULT: '0',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.05)',
        md: '0 2px 4px rgba(0,0,0,0.1)',
        lg: '0 8px 24px rgba(0,0,0,0.1)',
        xl: '0 15px 45px rgba(0,0,0,0.1)',
      },
      maxWidth: {
        content: '1200px',
      },
    },
  },
  plugins: [],
}
