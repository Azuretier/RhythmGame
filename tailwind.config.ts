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
        "instagram-icon": "var(--instagram-icon)",
        "youtube-bg": "var(--youtube-bg)",
        "youtube-icon-bg": "var(--youtube-icon-bg)",
        "youtube-icon": "var(--youtube-icon)",
        "discord-bg": "var(--discord-bg)",
        "discord-icon-bg": "var(--discord-icon-bg)",
        "discord-icon": "var(--discord-icon)",
        "github-bg": "var(--github-bg)",
        "github-icon-bg": "var(--github-icon-bg)",
        "github-icon": "var(--github-icon)",
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
