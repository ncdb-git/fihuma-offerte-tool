import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        fihuma: {
          ink: "#17221d",
          green: "#50ae4c",
          mint: "#dff3e8",
          lime: "#c8df64",
          sand: "#f5f0e7",
          line: "#d8ded8"
        }
      },
      boxShadow: {
        panel: "0 18px 50px rgba(23, 34, 29, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
