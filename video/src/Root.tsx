import { Composition } from "remotion";
import { Pitch } from "./Pitch";
import { FPS, DURATION_FRAMES, WIDTH, HEIGHT } from "./lib/constants";

export const Root = () => {
  return (
    <>
      <Composition
        id="Pitch"
        component={Pitch}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
