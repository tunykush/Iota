import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#EFE9DA",
        foreground: "#1A1A1A",
        accent: "#D96C4E",
        "accent-hover": "#C45A3D",
        muted: "#8B8680",
        "card-bg": "#F5F1E6",
        "dark-bg": "#1A1A1A",
        gold: "#C4A24D",
        cream: "#EFE9DA",
      },
      fontFamily: {
        display: ['"Inter Tight"', 'sans-serif'],
        serif: ['"Playfair Display"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        marquee: "marquee 48s linear infinite",
        "marquee-reverse": "marqueeReverse 56s linear infinite",
        "fade-in": "fadeIn 0.6s ease-out forwards",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        marqueeReverse: {
          "0%": { transform: "translateX(-50%)" },
          "100%": { transform: "translateX(0)" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
