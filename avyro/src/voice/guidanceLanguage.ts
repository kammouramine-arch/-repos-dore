import type { Preferences } from '@/core/domain/entities/preferences';
import { currentUiLanguage } from '@/ui/i18n';

/**
 * The language every spoken guidance sentence uses.
 *
 * 'bilingual' speaks the language the screen is written in. Following the
 * device locale instead is how EJXG3453 had a French banner reading
 * "Continuez tout droit" over a voice saying "Keep straight on". One rule, used
 * by turn guidance and by the speed warning alike.
 */
export const guidanceLanguageFor = (voiceLanguage: Preferences['voiceLanguage']): 'fr-FR' | 'en-US' =>
  voiceLanguage === 'fr-FR' || (voiceLanguage === 'bilingual' && currentUiLanguage() === 'fr') ? 'fr-FR' : 'en-US';
