import {
  formatArrivalTime,
  formatDistance,
  formatDuration,
  initialsOf,
} from './format';

describe('formatDistance', () => {
  it('rounds metric distances the way a driver reads them', () => {
    expect(formatDistance(0)).toBe('0 m');
    expect(formatDistance(247)).toBe('250 m');
    expect(formatDistance(999)).toBe('1000 m');
    expect(formatDistance(1500)).toBe('1.5 km');
    expect(formatDistance(24_700)).toBe('25 km');
  });

  it('switches to feet and miles', () => {
    expect(formatDistance(100, 'imperial')).toBe('330 ft');
    expect(formatDistance(1609.344, 'imperial')).toBe('1.0 mi');
    expect(formatDistance(48_280, 'imperial')).toBe('30 mi');
  });

  it('never reports a negative distance', () => {
    expect(formatDistance(-50)).toBe('0 m');
  });
});

describe('formatDuration', () => {
  it('shows minutes, then hours and minutes', () => {
    expect(formatDuration(30)).toBe('1 min');
    expect(formatDuration(480)).toBe('8 min');
    expect(formatDuration(3600)).toBe('1 hr');
    expect(formatDuration(5040)).toBe('1 hr 24 min');
  });
});

describe('formatArrivalTime', () => {
  it('adds the trip duration to the start time', () => {
    const start = new Date('2026-01-01T09:00:00');
    expect(formatArrivalTime(1800, start)).toContain('30');
  });
});

describe('initialsOf', () => {
  it('takes the first letter of the first two words', () => {
    expect(initialsOf('Alex Durand')).toBe('AD');
    expect(initialsOf('alex')).toBe('A');
    expect(initialsOf('Marie Claire Dupont')).toBe('MC');
  });

  it('falls back when there is no name', () => {
    expect(initialsOf('')).toBe('?');
  });
});
