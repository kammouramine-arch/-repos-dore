import { probationaryMaximum } from './probationaryLimit';
test('French probationary maxima are category-specific and never increase a restriction', () => {
  expect(probationaryMaximum(true, 'FRA', 'motorway-normal-130', 130)).toBe(110);
  expect(probationaryMaximum(true, 'FRA', 'other-motorway', 110)).toBe(100);
  expect(probationaryMaximum(true, 'FRA', 'divided-road', 110)).toBe(100);
  expect(probationaryMaximum(true, 'FRA', 'other-road', 90)).toBe(80);
  for (const limit of [20, 30, 50, 70]) expect(probationaryMaximum(true, 'FRA', 'motorway-normal-130', limit)).toBe(limit);
});
test('unknown category, country, limit or disabled setting never invents an adjustment', () => {
  expect(probationaryMaximum(true, 'FRA', undefined, 130)).toBeNull();
  expect(probationaryMaximum(true, 'MAR', 'other-road', 90)).toBeNull();
  expect(probationaryMaximum(false, 'FRA', 'other-road', 90)).toBeNull();
  expect(probationaryMaximum(true, 'FRA', 'other-road', null)).toBeNull();
  expect(probationaryMaximum(true, 'FRA', 'other-road', NaN)).toBeNull();
});
