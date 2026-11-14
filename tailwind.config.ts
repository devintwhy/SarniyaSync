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
        "almond-cream": "#f7e4d4ff",
        "almond-silk": "#e1b5a4ff",
        "rosy-taupe": "#cc9787ff",
        "dusty-rose": "#cc8c7dff",
        "terracotta-clay": "#9d5c4cff",
        "sarniya-cream": "#f7e4d4ff",
        "sarniya-silk": "#e1b5a4ff",
        "sarniya-taupe": "#cc9787ff",
        "sarniya-rose": "#cc8c7dff",
        "sarniya-clay": "#9d5c4cff",
        "neu-bg": "#f9fafb",
      },
      backgroundImage: {
        "sarniya-gradient":
          "linear-gradient(90deg, #f7e4d4ff, #e1b5a4ff, #cc9787ff, #cc8c7dff, #9d5c4cff)",
        "sarniya-button":
          "linear-gradient(to right, #cc8c7d, #c09485, #9d5c4c)",
      },
      boxShadow: {
        "neu-flat": "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        "neu-sm": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "neu-inset": "none",
        "neu-inset-sm": "none",
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
