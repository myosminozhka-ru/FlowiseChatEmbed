// eslint-disable-next-line @typescript-eslint/no-var-requires
const defaultTheme = require('tailwindcss/defaultTheme')

function rem2px(input, fontSize = 16) {
    if (input == null) {
        return input
    }
    switch (typeof input) {
        case 'object':
            if (Array.isArray(input)) {
                return input.map((val) => rem2px(val, fontSize))
            }
            // eslint-disable-next-line no-case-declarations
            const ret = {}
            for (const key in input) {
                ret[key] = rem2px(input[key], fontSize)
            }
            return ret
        case 'string':
            return input.replace(/(\d*\.?\d+)rem$/, (_, val) => `${parseFloat(val) * fontSize}px`)
        case 'function':
            return eval(input.toString().replace(/(\d*\.?\d+)rem/g, (_, val) => `${parseFloat(val) * fontSize}px`))
        default:
            return input
    }
}

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/**/*.{js,jsx,ts,tsx}'],
    theme: {
        ...rem2px(defaultTheme),
        extend: {
            fontFamily: {
                sans: ['Manrope', 'sans-serif']
            },
            borderRadius: {
                '2xl': '20px'
            },
            colors: {
                border: {
                    DEFAULT: 'rgba(11, 17, 19, 0.12)'
                },
                gray: {
                    50: 'rgba(11, 17, 19, 0.05)',
                    100: 'rgba(11, 17, 19, 0.1)',
                    200: 'rgba(11, 17, 19, 0.2)',
                    300: 'rgba(11, 17, 19, 0.3)',
                    400: 'rgba(11, 17, 19, 0.4)',
                    500: 'rgba(11, 17, 19, 0.5)',
                    600: 'rgba(11, 17, 19, 0.6)',
                    700: 'rgba(11, 17, 19, 0.7)',
                    800: 'rgba(11, 17, 19, 0.8)',
                    850: 'rgba(11, 17, 19, 0.85)',
                    880: 'rgba(11, 17, 19, 0.88)',
                    900: 'rgba(11, 17, 19, 0.95)',
                    950: '#0B1113'
                },
                blue: {
                    50: '#F7FBFC',
                    100: '#E7EDEE',
                    200: '#DEE8FF',
                    300: '#C8D9FF',
                    400: '#8DA9E8',
                    500: '#2452B8',
                    600: '#0B389D',
                    700: '#08286F'
                },
                red: {
                    100: '#FDAAAA',
                    200: '#F66161',
                    300: '#DE360B',
                    400: '#BF0711',
                    500: '#9D091E'
                },
                black: '#2D3537'
            },
            textColor: {
                DEFAULT: '#0B1113'
            },
            borderColor: {
                DEFAULT: 'rgba(11, 17, 19, 0.12)'
            },
            keyframes: {
                'fade-in': {
                    '0%': {
                        opacity: '0'
                    },
                    '100%': {
                        opacity: '1'
                    }
                }
            },
            animation: {
                'fade-in': 'fade-in 0.3s ease-out'
            },
            boxShadow: {
                'xs': '0 4px 4px 0 rgba(0,0,0,0.05), 0 1px 0 0 rgba(0,0,0,0.05)'
            }
        }
    },
    plugins: [
      require('@tailwindcss/typography')
    ]
}
