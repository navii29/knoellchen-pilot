import type { Config } from "tailwindcss";

/**
 * "Leitstelle" design system — the dispatch control room for a rental fleet.
 * Dark industrial chrome + light engineered workspace, one signal accent,
 * monospace telemetry, hairline structure, sharp-but-usable edges.
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        // Dark side — landing + app chrome (sidebar / topbar).
        void: {
          DEFAULT: "#0B0A0C", // page background, deepest layer
          800: "#131215", // raised chrome (sidebar/topbar surface)
          700: "#1A181C", // cards / panels on dark
          600: "#232026", // hover surface on dark
        },
        // Light side — the engineered workspace + light marketing bands.
        canvas: "#F4F3F0", // warm paper-gray app/page background
        paper: "#FFFFFF", // cards, inputs, elevated surfaces
        // Primary text/icons on the dark void chrome.
        "on-dark": "#F4F2EF",
        ink: {
          DEFAULT: "#14110F", // primary text on light (warm near-black)
          soft: "#423D39", // body text
          muted: "#8A847E", // secondary / meta text
        },
        hairline: {
          DEFAULT: "#E4E1DB", // light borders / dividers
          dark: "rgba(255,255,255,0.10)", // dark borders / dividers
        },
        // Single brand signal — CTA / active / live status ONLY.
        signal: {
          DEFAULT: "#FF5A1F",
          strong: "#E84A12",
          soft: "#FFEDE4", // tint background on light
          ink: "#9A3A12", // text on signal-soft
        },
        // License-plate chrome — EU strip ONLY, never a UI accent.
        plate: {
          eu: "#003399",
        },
        // Functional status semantics for the processing pipeline (muted).
        status: {
          neu: "#B45309",
          zugeordnet: "#1D4ED8",
          weiterbelastet: "#6D28D9",
          bezahlt: "#15803D",
        },
      },
      borderRadius: {
        card: "8px",
        panel: "6px",
        btn: "6px",
        input: "6px",
        frame: "4px", // dark technical frames on the landing
      },
      boxShadow: {
        // Restraint: depth comes from tone + hairline, not blur.
        panel: "0 1px 2px 0 rgba(20,17,15,0.04)",
        raised: "0 1px 0 0 rgba(20,17,15,0.04), 0 8px 24px -12px rgba(20,17,15,0.12)",
        frame: "0 40px 90px -48px rgba(0,0,0,0.55)",
        signal: "0 8px 24px -10px rgba(255,90,31,0.45)",
      },
      maxWidth: {
        site: "1200px",
        wide: "1320px",
      },
      letterSpacing: {
        tightest: "-0.03em",
      },
    },
  },
  plugins: [],
};
export default config;
