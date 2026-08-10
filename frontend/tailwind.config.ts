import type { Config } from "tailwindcss";

// Paleta "panel de instrumentos náutico": navy profundo de tormenta,
// acentos en latón/ámbar (compás, barómetro) en vez de la típica combinación
// crema+terracota o negro+verde-neón. Los tres "signal" son el lenguaje
// visual central de la app: vivo / envejeciendo / sin respuesta.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        abyss: "#0F2438",
        panel: "#16324A",
        "panel-hover": "#1B3C57",
        "panel-border": "#24445E",
        ink: "#EAF2F5",
        "ink-muted": "#6E8FA3",
        signal: {
          live: "#4F9B8C",
          amber: "#E8A33D",
          alert: "#E85C4A",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
