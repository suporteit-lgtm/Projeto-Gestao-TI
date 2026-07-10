/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Cores da marca (Locagora): azul principal + verde nos detalhes.
        marca: {
          DEFAULT: "#2445B3", // azul principal
          claro: "#3358D4",
          escuro: "#1B3690",
        },
        verde: {
          DEFAULT: "#45C93A", // verde de destaque
          claro: "#5ED653",
          escuro: "#37A52E",
        },
      },
    },
  },
  plugins: [],
};
