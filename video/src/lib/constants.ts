export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const DURATION_SEC = 30;
export const DURATION_FRAMES = FPS * DURATION_SEC;

// Scene durations in seconds (sum must equal DURATION_SEC)
export const SCENE_HOOK = 4;
export const SCENE_PROBLEM = 4;
export const SCENE_DEMO = 7;
export const SCENE_FEATURES = 8;
export const SCENE_TAGLINE = 4;
export const SCENE_CTA = 3;

export const F = (sec: number) => Math.round(sec * FPS);

export const SCENE_FRAMES = {
  hook: F(SCENE_HOOK),
  problem: F(SCENE_PROBLEM),
  demo: F(SCENE_DEMO),
  features: F(SCENE_FEATURES),
  tagline: F(SCENE_TAGLINE),
  cta: F(SCENE_CTA),
};

export const SCENE_STARTS = {
  hook: 0,
  problem: SCENE_FRAMES.hook,
  demo: SCENE_FRAMES.hook + SCENE_FRAMES.problem,
  features: SCENE_FRAMES.hook + SCENE_FRAMES.problem + SCENE_FRAMES.demo,
  tagline:
    SCENE_FRAMES.hook +
    SCENE_FRAMES.problem +
    SCENE_FRAMES.demo +
    SCENE_FRAMES.features,
  cta:
    SCENE_FRAMES.hook +
    SCENE_FRAMES.problem +
    SCENE_FRAMES.demo +
    SCENE_FRAMES.features +
    SCENE_FRAMES.tagline,
};

export const COLORS = {
  black: "#000000",
  bg: "#000000",
  white: "#ffffff",
  teal: "#0d9488",
  tealLight: "#2dd4bf",
  emerald: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
  stone900: "#1c1917",
  stone700: "#44403c",
  stone500: "#78716c",
  stone400: "#a8a29e",
  stone200: "#e7e5e4",
  stone100: "#f5f5f4",
  stone50: "#fafaf9",
};

export const FONT_DISPLAY =
  '"DM Sans", system-ui, -apple-system, "Segoe UI", sans-serif';
