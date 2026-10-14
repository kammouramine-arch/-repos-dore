import sizes from "../data/sizes.json";
/** pixel size of a staged image (studio/public/...), recorded by the asset prep step */
export const size = (src: string): [number, number] => {
  const s = (sizes as Record<string, number[]>)[src];
  if (!s) throw new Error(`unknown image ${src}`);
  return [s[0], s[1]];
};
