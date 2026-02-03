/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        soc: {
          bg: "#0b1220",
          panel: "#121a2b",
          border: "#1f2a40",
          accent: "#1e90ff",
          critical: "#ff4d4f",
          high: "#ff9f1c",
          medium: "#ffd166",
          low: "#4cc9f0",
        },
      },
    },
  },
  plugins: [],
}
