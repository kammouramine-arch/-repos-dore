import { canStartVoiceTurn, voicePromptFor } from './voicePrompt';

describe('telling the driver what the microphone is doing', () => {
  it('says nothing at all when nothing is happening', () => {
    // A permanent "Ask Avyro" badge is clutter in a car. Silence is the
    // resting state; the button is the affordance.
    expect(voicePromptFor('idle', null, null).visible).toBe(false);
  });

  it('is unambiguous while the microphone is open', () => {
    const prompt = voicePromptFor('listening', null, null);

    expect(prompt).toEqual({ label: 'Listening…', tone: 'listening', visible: true });
  });

  it('shows that it is working, so a slow answer is not read as no answer', () => {
    expect(voicePromptFor('thinking', null, null)).toEqual({
      label: 'Thinking…',
      tone: 'thinking',
      visible: true,
    });
  });

  it('shows Avyro’s own words while it speaks', () => {
    // Seeing the sentence confirms the command was heard correctly, which
    // hearing it alone does not at 110 km/h with the window down.
    expect(voicePromptFor('speaking', 'Heading home.', null)).toEqual({
      label: 'Heading home.',
      tone: 'speaking',
      visible: true,
    });
  });

  it('treats a maneuver interrupt as Avyro speaking, because it is', () => {
    expect(voicePromptFor('navigation-interrupt', 'Turn right', null).tone).toBe(
      'speaking',
    );
    expect(voicePromptFor('resuming', 'Heading home.', null).tone).toBe('speaking');
  });

  it('reports a failed turn', () => {
    const prompt = voicePromptFor('cancelled', null, 'not-allowed');

    expect(prompt.tone).toBe('error');
    expect(prompt.label).toBe('Sorry, I didn’t catch that.');
  });

  it('says nothing when the driver cancelled it themselves', () => {
    // They know they cancelled. Reporting it back is noise.
    expect(voicePromptFor('cancelled', null, null).visible).toBe(false);
  });

  it('shows nothing rather than an empty bubble', () => {
    expect(voicePromptFor('speaking', null, null).visible).toBe(false);
  });
});

describe('when tap-to-talk is offered', () => {
  it('is available when voice is ready and no turn is running', () => {
    expect(canStartVoiceTurn('listening', 'idle')).toBe(true);
    expect(canStartVoiceTurn('suspended', 'cancelled')).toBe(true);
    expect(canStartVoiceTurn('preparing', 'idle')).toBe(true);
  });

  it('is not offered when a turn is already under way', () => {
    // Pressing it mid-turn would open a second session on one microphone.
    expect(canStartVoiceTurn('suspended', 'listening')).toBe(false);
    expect(canStartVoiceTurn('suspended', 'thinking')).toBe(false);
    expect(canStartVoiceTurn('suspended', 'speaking')).toBe(false);
  });

  it('is not offered when voice cannot work at all', () => {
    expect(canStartVoiceTurn('off', 'idle')).toBe(false);
    expect(canStartVoiceTurn('unsupported', 'idle')).toBe(false);
    expect(canStartVoiceTurn('blocked', 'idle')).toBe(false);
  });

  it('is still offered after a refusal the driver can undo', () => {
    // `denied` means iOS will ask again — pressing the button is how they get
    // the dialog back.
    expect(canStartVoiceTurn('denied', 'idle')).toBe(true);
  });
});
