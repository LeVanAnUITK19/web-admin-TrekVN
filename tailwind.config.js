/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // TrekViệt Brand Colors
        primary: {
          DEFAULT: '#287557',
          dark: '#183F35',
          light: '#E7EFE7',
          foreground: '#FFFFFF',
        },
        brand: {
          darkGreen: '#183F35',
          green: '#287557',
          lightGreen: '#E7EFE7',
          bg: '#F8F9F6',
          warning: '#E7AD65',
        },
        background: '#F8F9F6',
        foreground: '#1A1A1A',
        sidebar: {
          DEFAULT: '#183F35',
          foreground: '#FFFFFF',
          border: 'rgba(255,255,255,0.1)',
          accent: '#287557',
          'accent-foreground': '#FFFFFF',
        },
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#1A1A1A',
        },
        border: '#E2E8F0',
        input: '#E2E8F0',
        ring: '#287557',
        muted: {
          DEFAULT: '#F1F5F9',
          foreground: '#64748B',
        },
        accent: {
          DEFAULT: '#E7EFE7',
          foreground: '#183F35',
        },
        destructive: {
          DEFAULT: '#EF4444',
          foreground: '#FFFFFF',
        },
        success: {
          DEFAULT: '#22C55E',
          foreground: '#FFFFFF',
        },
        warning: {
          DEFAULT: '#E7AD65',
          foreground: '#FFFFFF',
        },
        info: {
          DEFAULT: '#3B82F6',
          foreground: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        dropdown: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [],
}
