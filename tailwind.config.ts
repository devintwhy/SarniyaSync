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
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Palet Resmi SarniyaSync
        "almond-cream": "#f7e4d4ff",
        "almond-silk": "#e1b5a4ff",
        "rosy-taupe": "#cc9787ff",
        "dusty-rose": "#cc8c7dff",
        "terracotta-clay": "#9d5c4cff",
        // Aliases sarniya-*
        "sarniya-cream": "#f7e4d4ff",
        "sarniya-silk": "#e1b5a4ff",
        "sarniya-taupe": "#cc9787ff",
        "sarniya-rose": "#cc8c7dff",
        "sarniya-clay": "#9d5c4cff",
        // Neumorphism canvas background
        "neu-bg": "#e0e5ec",
      },
      backgroundImage: {
        "sarniya-gradient":
          "linear-gradient(90deg, #f7e4d4ff, #e1b5a4ff, #cc9787ff, #cc8c7dff, #9d5c4cff)",
        "sarniya-button":
          "linear-gradient(to right, #cc8c7d, #c09485, #9d5c4c)",
      },
      boxShadow: {
        "neu-flat":
          "8px 8px 18px rgba(163, 177, 198, 0.6), -8px -8px 18px rgba(255, 255, 255, 0.9)",
        "neu-sm":
          "4px 4px 10px rgba(163, 177, 198, 0.5), -4px -4px 10px rgba(255, 255, 255, 0.8)",
        "neu-inset":
          "inset 6px 6px 12px rgba(163, 177, 198, 0.7), inset -6px -6px 12px rgba(255, 255, 255, 0.85)",
        "neu-inset-sm":
          "inset 3px 3px 6px rgba(163, 177, 198, 0.6), inset -3px -3px 6px rgba(255, 255, 255, 0.8)",
      },
      borderRadius: {
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};
export default config;
