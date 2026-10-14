import { normaliseUtterance } from './wakePhrase';
import { parseCommand } from './commandParser';

/** These questions require observations this app cannot obtain from a map. */
export const drivingSafetyReply = (transcript: string): string | null => {
  const text = normaliseUtterance(transcript);
  // Reporting an observation is different from asking the app to verify it.
  if (parseCommand(text).kind === 'report-incident') return null;
  if (/\b(?:ne|n)\b.*\b(?:pas|jamais)\b|\b(?:pas besoin de)\b/.test(text)) return 'Je garde le trajet actuel. Donnez une commande directe pour le modifier.';
  if (/\b(?:depasser|depassement|changer de voie|quelle voie|quelle file|sans danger|peux je tourner|peux je traverser)\b/.test(text)) return 'Je ne peux pas juger si une manœuvre est sûre. Vérifiez la route, les rétroviseurs et les panneaux.';
  if (/\bquelle vitesse\b/.test(text)) return 'Suivez les panneaux et adaptez votre vitesse aux conditions de circulation.';
  if (/\b(?:panneaux|feux rouges|feux de circulation|route fermee)\b/.test(text) || /\b(?:danger|dangers|accident|accidents|police)\b.*\b(?:devant|sur|ici|nous)\b/.test(text)) return 'Je ne dispose pas d’informations vérifiées sur les panneaux ou incidents à venir. Restez attentif à la route.';
  if (/\b(?:don\s*t|do not|never|no need to)\b.*\b(?:cancel|navigate|go|reroute|take|drive|route)\b/.test(text)) {
    return 'I will keep the current route. Please give a direct command if you want to change it.';
  }
  if (/\b(?:overtake|overtaking|pass this|safe to turn|safe to cross|can i turn|can i cross)\b/.test(text) ||
      /\b(?:change|switch|merge|cross|which|what|safe|should i|can i)\b.*\blanes?\b/.test(text)) {
    return 'I cannot judge whether a maneuver is safe. Check the road, mirrors and signs, and make the decision yourself.';
  }
  if (/\b(?:maximum speed|how fast can|how fast should)\b/.test(text)) {
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
