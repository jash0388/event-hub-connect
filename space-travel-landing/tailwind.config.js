/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                heading: ['"Instrument Serif"', 'serif'],
                body: ['"Barlow"', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
