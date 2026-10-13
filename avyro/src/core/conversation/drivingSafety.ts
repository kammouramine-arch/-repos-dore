import { normaliseUtterance } from './wakePhrase';

/** These questions require observations this app cannot obtain from a map. */
export const drivingSafetyReply = (transcript: string): string | null => {
  const text = normaliseUtterance(transcript);
  if (/\b(?:dont|don't|do not|never|no need to)\b.*\b(?:cancel|navigate|go|reroute|take|drive|route)\b/.test(text)) {
    return 'I will keep the current route. Please give a direct command if you want to change it.';
  }
  if (/\b(?:overtake|overtaking|pass this|safe to turn|safe to cross|can i turn|can i cross)\b/.test(text) ||
      /\b(?:change|switch|merge|cross|which|what|safe|should i|can i)\b.*\blanes?\b/.test(text)) {
    return 'I cannot judge whether a maneuver is safe. Check the road, mirrors and signs, and make the decision yourself.';
  }
  if (/\b(?:speed limit|maximum speed|how fast can|how fast should)\b/.test(text)) {
    return 'I do not have a verified speed limit for this road. Follow the posted signs.';
  }
  if (/\b(?:stop signs?|red lights?|traffic lights?|road signs?)\b/.test(text)) {
    return 'I do not have verified road-sign information ahead. Watch the road and follow the signs.';
  }
  if (/\b(?:hazards?|accidents?|police|crashes?|road closures?)\b/.test(text)) {
    return 'I do not have verified incident information for this road. Stay alert to conditions ahead.';
  }
  return null;
};
