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
        azure: {
          500: '#007FFF',
          600: '#0066CC',
        },
      },
      backgroundImage: {
        // This maps 'bg-instagram' to your CSS variable
        'instagram-widget-main': "var(--instagram-widget-main)",
        'instagram-icon-bg': "var(--instagram-icon-bg)",
      },
      animation: {
        'pulse-slow': 'pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
    fontFamily: {
      pixel: ["var(--font-pixel)"], 
      sans: ["Inter", "Arial", "sans-serif"],
    },
  },
  plugins: [],
};
export default config;
