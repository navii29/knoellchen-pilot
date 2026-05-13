import { AbsoluteFill, Sequence } from "remotion";
import { SCENE_FRAMES, SCENE_STARTS, COLORS, FONT_DISPLAY } from "./lib/constants";
import { SceneHook } from "./scenes/SceneHook";
import { SceneProblem } from "./scenes/SceneProblem";
import { SceneDemo } from "./scenes/SceneDemo";
import { SceneFeatures } from "./scenes/SceneFeatures";
import { SceneTagline } from "./scenes/SceneTagline";
import { SceneCTA } from "./scenes/SceneCTA";
import { GlobalGrain } from "./components/GlobalGrain";

export const Pitch = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        fontFamily: FONT_DISPLAY,
        color: COLORS.white,
      }}
    >
      <Sequence from={SCENE_STARTS.hook} durationInFrames={SCENE_FRAMES.hook}>
        <SceneHook />
      </Sequence>
      <Sequence from={SCENE_STARTS.problem} durationInFrames={SCENE_FRAMES.problem}>
        <SceneProblem />
      </Sequence>
      <Sequence from={SCENE_STARTS.demo} durationInFrames={SCENE_FRAMES.demo}>
        <SceneDemo />
      </Sequence>
      <Sequence from={SCENE_STARTS.features} durationInFrames={SCENE_FRAMES.features}>
        <SceneFeatures />
      </Sequence>
      <Sequence from={SCENE_STARTS.tagline} durationInFrames={SCENE_FRAMES.tagline}>
        <SceneTagline />
      </Sequence>
      <Sequence from={SCENE_STARTS.cta} durationInFrames={SCENE_FRAMES.cta}>
        <SceneCTA />
      </Sequence>

      <GlobalGrain />
    </AbsoluteFill>
  );
};
