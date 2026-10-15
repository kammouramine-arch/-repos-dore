import { puckMotionPath } from './puckMotion';
const a = { latitude: 50, longitude: 3 }, b = { latitude: 50, longitude: 3.0004 }, c = { latitude: 50.0004, longitude: 3.0004 };
test('position interpolation preserves the corner instead of crossing the inside of a bend', () => {
  expect(puckMotionPath(a, c, [a, b, c], 1)).toEqual([a, b, c]);
});
test('a distant GPS jump is not falsely animated along the planned road', () => {
  const far = { latitude: 50.1, longitude: 3 };
  expect(puckMotionPath(far, c, [a,b,c], 1)).toEqual([far,c]);
});
