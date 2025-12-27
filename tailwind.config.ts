import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/data/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--border)",
        subtext: "var(--subtext)",
      },
      backgroundImage: {
        // This maps 'bg-instagram' to your CSS variable
        'instagram-bg': "var(--instagram-bg-gradient)",
        'instagram-icon-bg': "var(--instagram-icon-bg-gradient)",
      }
    },
    fontFamily: {
      pixel: ["var(--font-pixel)"], 
      sans: ["Inter", "Arial", "sans-serif"],
    },
  },
  plugins: [],
};
export default config;
