/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#059669', // Emerald 600
                    hover: '#047857',
                },
                danger: {
                    DEFAULT: '#EF4444',
                    hover: '#FEF2F2',
                },
                bg: {
                    app: '#F1F5F9', // Slate 100
                    surface: '#FFFFFF',
                },
                text: {
                    main: '#1E293B', // Slate 800
                    muted: '#64748B',
                },
                border: {
                    light: '#E2E8F0',
                },
                warning: {
                    bg: '#FEF3C7',
                    text: '#B45309',
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            spacing: {
                'xs': '0.25rem',
                'sm': '0.5rem',
                'md': '1rem',
                'lg': '1.5rem',
                'xl': '2rem',
            }
        },
    },
    plugins: [],
}
