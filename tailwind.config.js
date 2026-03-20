/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta Corporativa SGP - Morado Principal
        primary: {
          50: '#F5F0F6',   // Muy claro
          100: '#E6D9E9',  // Claro
          200: '#D4BBD9',  // Claro medio
          300: '#BBA4C0',  // Secundario
          400: '#977B9B',  // Medio
          500: '#6A2C75',  // Principal ⭐
          600: '#5A2563',  // Oscuro
          700: '#491E50',  // Más oscuro
          800: '#38183D',  // Muy oscuro
          900: '#27122A',  // Casi negro
          DEFAULT: '#6A2C75',
          light: '#8B4A95',
          lighter: '#BBA4C0',
        },
        // Paleta de Acento - Dorado (Warnings/Pendientes)
        accent: {
          50: '#FDF8ED',   // Muy claro
          100: '#FAEFD3',  // Claro
          200: '#F5E4AC',  // Claro medio
          300: '#EED39B',  // Medio claro
          400: '#E2C272',  // Medio
          500: '#D6A644',  // Principal ⭐
          600: '#B88B2E',  // Oscuro
          700: '#946F23',  // Más oscuro
          800: '#6F531A',  // Muy oscuro
          900: '#4A3812',  // Casi negro
          DEFAULT: '#D6A644',
          light: '#EED39B',
          gold: '#D6A644',
        },
        // Paleta Rosa (Alertas/Importante)
        alert: {
          50: '#FDF2F5',   // Muy claro
          100: '#FCE7ED',  // Claro
          200: '#F9CFD9',  // Claro medio
          300: '#F5A8BC',  // Medio claro
          400: '#E7789A',  // Medio
          500: '#AA4969',  // Principal ⭐
          600: '#943D5B',  // Oscuro
          700: '#7D324D',  // Más oscuro
          800: '#662840',  // Muy oscuro
          900: '#4F1F32',  // Casi negro
          DEFAULT: '#AA4969',
          light: '#C85A7E',
          rose: '#AA4969',
        },
        // Neutrales Corporativos
        neutral: {
          cream: '#D7C9B9',
          brown: '#473524',
          beige: '#EED39B',
        },
      },
      // Gradientes personalizados
      backgroundImage: {
        'gradient-primary': 'linear-gradient(to right, #6A2C75, #8B4A95)',
        'gradient-primary-dark': 'linear-gradient(to right, #5A2563, #6A2C75)',
        'gradient-primary-diagonal': 'linear-gradient(to bottom right, #6A2C75, #8B4A95)',
        'gradient-accent': 'linear-gradient(to right, #D6A644, #E9C16C)',
        'gradient-alert': 'linear-gradient(to right, #AA4969, #C85A7E)',
        'gradient-warm': 'linear-gradient(to right, #6A2C75, #AA4969)',
        'gradient-subtle': 'linear-gradient(to bottom right, #f9fafb, #f3f4f6)',
      },
      // Sombras personalizadas
      boxShadow: {
        'primary': '0 4px 14px 0 rgba(106, 44, 117, 0.39)',
        'primary-lg': '0 10px 40px 0 rgba(106, 44, 117, 0.2)',
        'accent': '0 4px 14px 0 rgba(214, 166, 68, 0.39)',
        'alert': '0 4px 14px 0 rgba(170, 73, 105, 0.39)',
        'elevated': '0 4px 6px -1px rgba(106, 44, 117, 0.1), 0 2px 4px -1px rgba(106, 44, 117, 0.06), 0 10px 15px -3px rgba(106, 44, 117, 0.1)',
        'glow-purple': '0 0 20px rgba(106, 44, 117, 0.3)',
        'glow-gold': '0 0 20px rgba(214, 166, 68, 0.3)',
      },
      // Animaciones personalizadas
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'shake': 'shake 0.5s ease-in-out',
        'pulse-subtle': 'pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin-slow 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-8px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(8px)' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      // Espaciados adicionales
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      // Anchos máximos personalizados
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      // Alturas personalizadas
      height: {
        '128': '32rem',
        '144': '36rem',
      },
      // Radios de borde personalizados
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      // Z-index personalizado
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
      // Fondos con opacidad
      backgroundColor: {
        'primary-light': 'rgba(106, 44, 117, 0.1)',
        'primary-lighter': 'rgba(106, 44, 117, 0.05)',
        'accent-light': 'rgba(214, 166, 68, 0.1)',
        'alert-light': 'rgba(170, 73, 105, 0.1)',
      },
    },
  },
  plugins: [],
}