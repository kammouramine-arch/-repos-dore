import * as React from 'react';
import { View } from 'react-native';
import { PLANS, type PlanId } from '@devisia/shared';
import { Body, Button, Caption, Card, Heading, Muted } from './ui';
import { Enter, SuccessCheck } from './motion';
import { colors, spacing } from '@/theme';

/**
 * Résultat d'une action d'abonnement lancée depuis Mon espace.
 *
 * Un changement de formule ne doit pas téléporter l'artisan vers l'accueil :
 * il a demandé quelque chose, on lui dit ce qui s'est passé, puis il choisit
 * de rester ou de revenir à son atelier. Le texte suit la sémantique Apple :
 * une montée prend effet tout de suite, une descente au renouvellement.
 */
export type PlanActionOutcome =
  | { kind: 'upgrade'; plan: PlanId }
  | { kind: 'reconciled'; plan: PlanId }
  | { kind: 'downgrade'; plan: PlanId; pending: PlanId; date: string | null }
  | { kind: 'recorded'; plan: PlanId; pending: PlanId }
  | { kind: 'restored'; plan: PlanId };

export function PlanActionResult({ outcome, en, onLeave, onStay }: { outcome: PlanActionOutcome; en: boolean; onLeave: () => void; onStay: () => void }) {
  const name = PLANS[outcome.plan].name;
  const date = outcome.kind === 'downgrade' && outcome.date
    ? new Date(outcome.date).toLocaleDateString(en ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  const copy = (() => {
    switch (outcome.kind) {
      case 'upgrade': return { eyebrow: en ? 'Plan changed' : 'Formule modifiée', title: en ? `${name} is now active` : `${name} est maintenant actif`, body: en ? 'Apple confirmed your change. Your new features are available right away.' : 'Apple a confirmé votre changement. Vos nouvelles fonctions sont disponibles tout de suite.' };
      case 'reconciled': return { eyebrow: en ? 'Subscription' : 'Abonnement', title: en ? `${name} is already active` : `${name} est déjà actif`, body: en ? 'Your access has been reconciled with Apple. Nothing else to do.' : 'Votre accès a été réconcilié avec Apple. Rien d’autre à faire.' };
      case 'downgrade': return { eyebrow: en ? 'Change scheduled' : 'Changement programmé', title: en ? `${name} stays active${date ? ` until ${date}` : ''}` : `${name} reste actif${date ? ` jusqu’au ${date}` : ''}`, body: en ? `${PLANS[outcome.pending].name} will then take over, as confirmed by Apple.` : `${PLANS[outcome.pending].name} prendra ensuite le relais, comme confirmé par Apple.` };
      case 'recorded': return { eyebrow: en ? 'Request sent to Apple' : 'Demande transmise à Apple', title: en ? `${name} stays active for now` : `${name} reste actif pour le moment`, body: en ? `Your change to ${PLANS[outcome.pending].name} will appear here as soon as Apple confirms it, usually within moments.` : `Votre passage à ${PLANS[outcome.pending].name} apparaîtra ici dès la confirmation d’Apple, généralement en quelques instants.` };
      case 'restored': return { eyebrow: en ? 'Purchases restored' : 'Achats restaurés', title: en ? `Your ${name} subscription is active` : `Votre abonnement ${name} est actif`, body: en ? 'Your access has been confirmed with Apple on this account.' : 'Votre accès a été confirmé avec Apple sur ce compte.' };
    }
  })();
  return (
    <Enter distance={10}>
      <Card style={{ gap: spacing.md, borderColor: colors.accentBorder, backgroundColor: colors.canvas }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' }}>
            <SuccessCheck size={26} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Caption upper style={{ color: colors.accent }}>{copy.eyebrow}</Caption>
            <Heading>{copy.title}</Heading>
          </View>
        </View>
        <Body>{copy.body}</Body>
        <Muted>{en ? 'Apple manages billing. You can change your mind in your Apple subscriptions at any time.' : 'Apple gère la facturation. Vous pouvez changer d’avis dans vos abonnements Apple à tout moment.'}</Muted>
        <View style={{ gap: spacing.sm }}>
          <Button title={en ? 'Back to workspace' : 'Retour à mon atelier'} haptic onPress={onLeave} />
          <Button title={en ? 'Stay here' : 'Rester ici'} variant="ghost" onPress={onStay} />
        </View>
      </Card>
    </Enter>
  );
}
