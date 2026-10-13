import { drivingSafetyReply } from './drivingSafety';

describe('unobservable driving conditions', () => {
  it.each(['Can I change lane now?', 'Is it safe to overtake?', 'Is it safe to cross?'])('does not assure a driver: %s', (text) => {
    expect(drivingSafetyReply(text)).toContain('cannot judge');
  });
  it.each(['What is the speed limit?', 'Are there stop signs ahead?', 'Any accidents ahead?'])('admits missing verified data: %s', (text) => {
    expect(drivingSafetyReply(text)).toMatch(/verified/);
  });
  it('allows ordinary navigation commands', () => {
    expect(drivingSafetyReply('take me home')).toBeNull();
    expect(drivingSafetyReply('take me to 12 Park Lane')).toBeNull();
  });
  it('does not turn a negated control into a navigation action', () => {
    expect(drivingSafetyReply('Do not cancel navigation')).toContain('keep the current route');
  });
});
