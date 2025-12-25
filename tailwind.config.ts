import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
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
        border: "var(--border)",
        subtext: "var(--subtext)",
      },
      backgroundImage: {
        // This maps 'bg-instagram' to your CSS variable
        'instagram-gradient': "var(--instagram-gradient)",
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
