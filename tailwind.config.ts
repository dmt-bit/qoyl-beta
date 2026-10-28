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
        // Stark black/white redesign (anarealmuto.com-inspired) - these
        // token NAMES are kept (dark/bronze/bronze2/cream/warm/muted)
        // so the diff stays a palette swap rather than a rename across
        // every component, but their roles are now inverted: `dark` is
        // the app's one near-black ink color, `cream` is near-white.
        dark: "#0a0a0a",
        bronze: "#0a0a0a",
        // Kept as gray-700 rather than the literal spec's #0a0a0a so
        // hover:bg-bronze2 (used on nearly every primary button) still
        // reads as a visible state change instead of collapsing to the
        // same solid black as the resting state.
        bronze2: "#444444",
        sand: "#e8e8e8",
        cream: "#ffffff",
        warm: "#f5f5f5",
        muted: "#888888",
        green: "#2D7A3D",
        amber: "#C4831A",
        red: "#B03030",
        "gray-100": "#f5f5f5",
        "gray-200": "#e8e8e8",
        "gray-300": "#d0d0d0",
        "gray-500": "#888888",
        "gray-700": "#444444",
      },
      fontFamily: {
        serif: ["var(--font-space-grotesk)"],
        sans: ["var(--font-space-grotesk)"],
        mono: ["var(--font-space-mono)"],
        display: ["var(--font-fredoka)", "cursive"],
      },
    },
  },
  plugins: [],
};
export default config;
