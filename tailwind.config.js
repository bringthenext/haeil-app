/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#1D9E75",
        "primary-foreground": "#ffffff",
        background: "#ffffff",
        foreground: "#0f172a",
        card: "#ffffff",
        "card-foreground": "#0f172a",
        border: "#e2e8f0",
        muted: "#f1f5f9",
        "muted-foreground": "#64748b",
        ring: "#1D9E75",
      },
    },
  },
  plugins: [],
};
