import { describe, expect, it } from 'vitest';
import { localizeText } from '../../mobile/src/lib/i18n';

it.each([
  ['Votre devis est prêt', 'Your quote is ready'],
  ['Je vous écoute — appuyez pour arrêter', 'Listening — tap to stop'],
  ['Prestation mise à jour', 'Service updated'],
  ['Prestation ajoutée', 'Service added'],
  ['Prestation supprimée', 'Service removed'],
])('localizes premium polish copy: %s', (fr, en) => {
  expect(localizeText('en', fr)).toBe(en);
  expect(localizeText('fr', fr)).toBe(fr);
});

describe('mobile English compatibility localization', () => {
  it('translates shared navigation and status labels', () => {
    expect(localizeText('en', 'Catalogue de prix')).toBe('Price book');
    expect(localizeText('en', 'Devis envoyé')).toBe('Quote sent');
    expect(localizeText('en', 'Main-d’œuvre')).toBe('Labour');
  });

  it('translates dynamic counters and customer-facing errors', () => {
    expect(localizeText('en', '3 demandes à transformer en chantier.')).toBe('3 requests to turn into jobs.');
    expect(localizeText('en', 'DEVISERA n’a pas pu joindre le serveur. Vérifiez votre connexion, puis réessayez.')).toContain('could not reach the server');
    expect(localizeText('en', 'Créer « Alex »')).toBe('Create “Alex”');
    expect(localizeText('en', 'Ouvrir la demande de Alex')).toBe('Open request from Alex');
    expect(localizeText('en', 'Étape 2 sur 5')).toBe('Step 2 of 5');
    expect(localizeText('en', '3 devis sans réponse · relancez-les')).toBe('3 quotes without a reply · follow up');
    expect(localizeText('en', '2 nouvelles demandes')).toBe('2 new quote requests');
    expect(localizeText('en', 'Main-d’œuvre · par h')).toBe('Labour · per h');
    expect(localizeText('en', 'Dictez naturellement. DEVISERA transforme vos mots en lignes chiffrées.')).toContain('priced line items');
    expect(localizeText('en', 'Formule Pro')).toBe('Pro plan');
    expect(localizeText('en', '€ HT')).toBe('€ excl. VAT');
  });

  it('covers secondary mobile flows instead of only the tab bar', () => {
    expect(localizeText('en', 'Votre activité n’a pas pu être chargée.')).toBe('Your activity could not be loaded.');
    expect(localizeText('en', 'Choisissez une formule pour continuer à créer et envoyer des devis. Vos données restent intactes.')).toContain('Choose a plan');
    expect(localizeText('en', 'Indiquez votre adresse pour demander un lien de réinitialisation.')).toContain('Enter your email');
    expect(localizeText('en', 'Le taux horaire sert de référence quand une prestation n’est pas dans votre catalogue.')).toContain('hourly rate');
    expect(localizeText('en', '+ Ligne')).toBe('+ Line');
  });

  it('leaves French copy intact when French is selected', () => {
    const value = 'Votre catalogue est vide';
    expect(localizeText('fr', value)).toBe(value);
  });
});
