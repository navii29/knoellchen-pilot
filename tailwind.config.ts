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
        // Dark side — occasional dark surfaces (now true Apple blacks).
        void: {
          DEFAULT: "#000000", // page background, deepest layer
          800: "#0a0a0a", // raised chrome
          700: "#161617", // cards / panels on dark
          600: "#1d1d1f", // hover surface on dark
        },
        // Light side — Apple workspace.
        canvas: "#f5f5f7", // app/page background (cool mist)
        paper: "#FFFFFF", // cards, inputs, elevated surfaces
        // Primary text/icons on dark chrome.
        "on-dark": "#f5f5f7",
        ink: {
          DEFAULT: "#1d1d1f", // primary text (graphite)
          soft: "#424245", // body text
          muted: "#86868b", // secondary / meta text
        },
        hairline: {
          DEFAULT: "#d2d2d7", // light borders / dividers (Apple silver)
          dark: "rgba(255,255,255,0.12)", // dark borders / dividers
        },
        // "signal" is now Apple vivid blue (CTA / active / link).
        signal: {
          DEFAULT: "#0071e3",
          strong: "#0066cc",
          soft: "#e9f2fe", // tint background on light
          ink: "#0066cc", // text on signal-soft
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

        // ── "Aperture" Apple-grade website palette ──────────────────
        graphite: { DEFAULT: "#1d1d1f", soft: "#474747", muted: "#86868b" },
        mist: "#f5f5f7", // light canvas (cool)
        frost: "#e8e8ed", // tertiary light surface
        silver: "#d6d6d6", // hairline on light
        pitch: "#000000", // immersive black hero/section void
        space: "#161617", // raised dark surface
        azure: { DEFAULT: "#0071e3", link: "#0066cc", sky: "#2997ff" }, // CTA / link / active
      },
      borderRadius: {
        card: "16px", // Apple soft cards
        panel: "12px",
        btn: "10px",
        input: "10px",
        frame: "12px",
        apple: "28px", // large soft cards/images
        pill: "9999px",
      },
      boxShadow: {
        // Restraint: depth comes from tone + hairline, not blur.
        panel: "0 1px 2px 0 rgba(20,17,15,0.04)",
        raised: "0 1px 0 0 rgba(20,17,15,0.04), 0 8px 24px -12px rgba(20,17,15,0.12)",
        frame: "0 40px 90px -48px rgba(0,0,0,0.55)",
        signal: "0 8px 24px -10px rgba(255,90,31,0.45)",
        // Apple-grade soft product elevation + glass.
        product: "0 30px 80px -24px rgba(0,0,0,0.28), 0 8px 24px -12px rgba(0,0,0,0.12)",
        glassdark: "0 1px 0 0 rgba(255,255,255,0.06) inset, 0 30px 80px -30px rgba(0,0,0,0.6)",
        azure: "0 10px 30px -10px rgba(0,113,227,0.5)",
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
