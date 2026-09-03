import type { GeneratedQuoteDTO } from '@devisia/shared';

/**
 * Traduction des manques de l'IA en questions auxquelles on peut répondre.
 *
 * L'écran précédent affichait « Confiance 20 % » et une liste de questions
 * sans champ de réponse. Deux défauts s'y cumulaient : un pourcentage qui ne
 * veut rien dire pour un artisan, et des questions posées sans qu'aucun geste
 * ne permette d'y répondre. La confiance reste utile — mais comme déclencheur
 * interne, pas comme information affichée.
 */
export type AnswerKind = 'duree' | 'fournitures' | 'libre';

export interface MissingQuestion {
  id: string;
  kind: AnswerKind;
  /** Question posée à l'artisan, à la première personne. */
  prompt: string;
  /** Réponses proposées, pour éviter la saisie au clavier sur un chantier. */
  choices?: { value: string; label: string }[];
  placeholder?: string;
}

const DUREE: MissingQuestion = {
  id: 'duree',
  kind: 'duree',
  prompt: 'Combien de temps prévoyez-vous sur place ?',
  choices: [
    { value: '30 minutes', label: '30 min' },
    { value: '1 heure', label: '1 h' },
    { value: '2 heures', label: '2 h' },
    { value: 'une demi-journée', label: '½ journée' },
    { value: 'une journée', label: '1 journée' },
  ],
};

const FOURNITURES: MissingQuestion = {
  id: 'fournitures',
  kind: 'fournitures',
  prompt: 'Quelles fournitures faut-il prévoir ?',
  placeholder: 'Siphon laiton, joints, mitigeur…',
};

/**
 * Transforme les questions rendues par le moteur en formulaire.
 *
 * Le moteur les rend en texte libre ; on reconnaît les deux manques les plus
 * fréquents pour proposer des réponses en un geste, et on conserve les autres
 * en saisie libre plutôt que de les perdre.
 */
export function toQuestions(draft: GeneratedQuoteDTO): MissingQuestion[] {
  const questions: MissingQuestion[] = [];
  const seen = new Set<string>();

  for (const raw of draft.questions) {
    const text = raw.toLowerCase();
    if (/(temps|durée|duree|heure)/.test(text) && !seen.has('duree')) {
      questions.push(DUREE);
      seen.add('duree');
    } else if (/(fourniture|matériel|materiel|pièce|piece)/.test(text) && !seen.has('fournitures')) {
      questions.push(FOURNITURES);
      seen.add('fournitures');
    } else if (!seen.has(raw)) {
      questions.push({
        id: raw,
        kind: 'libre',
        prompt: raw,
        placeholder: 'Votre réponse',
      });
      seen.add(raw);
    }
  }

  // Une confiance basse sans question explicite signale un manque que le
  // moteur n'a pas su nommer : la durée est, de loin, le plus fréquent.
  if (questions.length === 0 && draft.confidence < 55 && draft.estimatedDurationMin == null) {
    questions.push(DUREE);
  }

  return questions;
}

/**
 * Complète la description avec les réponses, dans une langue naturelle que le
 * moteur sait relire — plutôt qu'un format technique qu'il ignorerait.
 */
export function applyAnswers(
  description: string,
  questions: MissingQuestion[],
  answers: Record<string, string>,
): string {
  const additions = questions
    .map((question) => {
      const answer = answers[question.id]?.trim();
      if (!answer) return null;
      if (question.kind === 'duree') return `Durée d'intervention : ${answer}.`;
      if (question.kind === 'fournitures') return `Fournitures à prévoir : ${answer}.`;
      return `${question.prompt} ${answer}`;
    })
    .filter((line): line is string => Boolean(line));

  if (additions.length === 0) return description;
  return `${description.trim()}\n${additions.join('\n')}`;
}

/** Phrase affichée à la place d'un pourcentage de confiance. */
export function missingLabel(count: number): string {
  if (count === 0) return '';
  return count === 1 ? 'Il me manque une information' : `Il me manque ${count} informations`;
}
