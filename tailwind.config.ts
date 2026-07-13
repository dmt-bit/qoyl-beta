import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        dark: "#1C1612",
        bronze: "#9C7B5A",
        bronze2: "#C4A882",
        sand: "#D4C4AD",
        cream: "#F5F0EA",
        warm: "#EDE5D8",
        muted: "#7A6A5A",
        green: "#5BA67A",
        amber: "#D4893A",
        red: "#D05555",
      },
      fontFamily: {
        serif: ["var(--font-cormorant)"],
        sans: ["var(--font-dm-sans)"],
      },
    },
  },
  plugins: [],
};
export default config;
