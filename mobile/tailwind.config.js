/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // PhotoApp brand colors (matching web app)
        background: "#0f0a0a",
        foreground: "#ffffff",
        card: "#1a1a1a",
        "card-foreground": "#ffffff",
        primary: "#ffffff",
        "primary-foreground": "#0f0a0a",
        secondary: "#262626",
        "secondary-foreground": "#ffffff",
        muted: "#262626",
        "muted-foreground": "#a1a1a1",
        accent: "#262626",
        "accent-foreground": "#ffffff",
        destructive: "#ef4444",
        "destructive-foreground": "#ffffff",
        border: "#262626",
        input: "#262626",
        ring: "#ffffff",
      },
      fontFamily: {
        sans: ["System"],
      },
    },
  },
  plugins: [],
};
