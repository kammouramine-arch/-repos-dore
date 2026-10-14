import type { ConversationReply, ConversationRequest } from '@/core/domain/entities/conversation';
import { formatDistance, formatDuration } from '@/utils/format';

export const isFrenchUtterance = (text: string): boolean => /\b(?:emm[eè]ne|am[eè]ne|conduis|annule|arr[eê]te|combien|quelle|o[uù]|maison|travail|trouve|cherche|recalcule|itin[eé]raire|peux|suis|sommes)\b/i.test(text);

/** Translate only supported, grounded reply templates, never a provider's invented prose. */
export const frenchReply = (reply: ConversationReply, request: ConversationRequest): ConversationReply => {
  if (!isFrenchUtterance(request.transcript)) return { ...reply, language: 'en-US' };
  const { context } = request;
  const { action, intent } = reply;
  let speech: string;
  if (action.type === 'navigate-to') speech = `Direction ${action.place.name}.`;
  else if (reply.speech === 'I could not search just now. Try again in a moment.') speech = 'La recherche est indisponible. Réessayez dans un instant.';
  else switch (intent.kind) {
    case 'navigate-saved': speech = `Enregistrez d’abord votre adresse ${intent.slot === 'home' ? 'de domicile' : 'de travail'} sur la carte.`; break;
    case 'navigate-to-place': speech = reply.referent ? `J’ai trouvé ${reply.referent.name}. Dites « emmène-moi là-bas » pour y aller.` : `Je n’ai pas trouvé ${intent.query}. Précisez la ville ou la rue.`; break;
    case 'find-nearby': speech = reply.referent ? `J’ai trouvé ${reply.referent.name}. Dites « emmène-moi là-bas » pour y aller.` : context.location ? 'Je n’ai pas trouvé de lieu correspondant à proximité.' : 'Activez votre position pour chercher à proximité.'; break;
    case 'cancel-navigation': speech = action.type === 'cancel-navigation' ? 'Navigation annulée.' : 'Aucun trajet en cours.'; break;
    case 'reroute': speech = action.type === 'reroute' ? 'Je cherche un autre itinéraire.' : 'Démarrez un trajet pour recalculer l’itinéraire.'; break;
    case 'ask-eta': speech = context.arrivalAt && context.remainingDurationSeconds !== null ? `Arrivée prévue à ${new Date(context.arrivalAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}, dans environ ${formatDuration(context.remainingDurationSeconds)}.` : 'Aucun trajet en cours.'; break;
    case 'ask-remaining-distance': speech = context.remainingDistanceMeters !== null ? `Il reste ${formatDistance(context.remainingDistanceMeters, context.distanceUnit)}${context.destination ? ` jusqu’à ${context.destination.name}` : ''}.` : 'Aucun trajet en cours.'; break;
    case 'ask-location': speech = context.currentRoadName ? `Vous êtes sur ${context.currentRoadName}.` : 'Je ne dispose pas d’un nom de rue vérifié ici.'; break;
    case 'ask-speed-limit': speech = context.mappedSpeedLimit ? `La carte TomTom indique ${context.mappedSpeedLimit.value} ${context.mappedSpeedLimit.unit}. Suivez toujours les panneaux routiers.` : 'Je n’ai pas de limitation de vitesse vérifiée ici. Suivez les panneaux routiers.'; break;
    case 'ask-traffic': speech = 'Je ne dispose pas du trafic en direct. Je peux rechercher un autre itinéraire.'; break;
    case 'navigate-referent': speech = 'Demandez-moi d’abord de trouver un lieu.'; break;
    case 'restore-destination': speech = 'Je n’ai pas de destination précédente à restaurer.'; break;
    case 'ask-fastest-route': speech = 'Je ne peux pas vérifier les conditions de circulation en direct.'; break;
    case 'unknown': speech = 'Je n’ai pas compris. Essayez « emmène-moi à Paris » ou « annule la navigation ».'; break;
  }
  return { ...reply, speech, language: 'fr-FR' };
};

export const speechLanguage = (text: string): string => /[àâéèêîôùûçœ]|\b(?:je|vous|votre|dans|reste|continuez|prenez|partez|sortez|rejoignez|faites|direction|navigation annul[eé]e)\b/i.test(text) ? 'fr-FR' : 'en-US';
