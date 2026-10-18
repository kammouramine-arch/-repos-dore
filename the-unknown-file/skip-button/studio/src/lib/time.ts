import { useCurrentFrame, useVideoConfig } from "remotion";
/** Current time in seconds within the enclosing Sequence. */
export const useT = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return f / fps;
};
