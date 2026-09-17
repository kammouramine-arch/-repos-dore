import * as React from 'react';
import { Linking, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { PaymentAccountDTO } from '@devisia/shared';
import { Body, Button, Caption, Card, ErrorState, Screen, Skeleton, Title } from '@/components/ui';
import { api } from '@/lib/api';
import { useQuery } from '@/lib/query';
import { useMobileLocale } from '@/lib/i18n';
import { useToast } from '@/components/toast';
import { colors, radius, spacing } from '@/theme';

/**
 * Encaissement en ligne : l'activation, côté artisan.
 *
 * Ce que l'artisan veut savoir en arrivant ici tient en une phrase : est-ce
 * que mes clients peuvent me payer par carte, oui ou non. L'écran répond à
 * cela d'abord, et ne parle de démarches qu'ensuite.
 *
 * Le prestataire de paiement n'est pas le sujet. Il est nommé une fois, dans
 * la ligne qui explique où vont les coordonnées bancaires — parce que
 * l'artisan a le droit de savoir à qui il les confie — et nulle part
 * ailleurs. DEVISERA est le produit ; l'infrastructure reste en coulisse.
 */

type State = 'ABSENT' | 'EN_COURS' | 'ACTIF' | 'RESTREINT';

const TONE: Record<State, { bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  ACTIF: { bg: colors.successSoft, fg: colors.success, icon: 'checkmark-circle' },
  EN_COURS: { bg: colors.warningSoft, fg: colors.warning, icon: 'time-outline' },
  RESTREINT: { bg: colors.warningSoft, fg: colors.warning, icon: 'alert-circle-outline' },
  ABSENT: { bg: colors.surface2, fg: colors.muted, icon: 'card-outline' },
};

function headline(state: State, en: boolean): { title: string; body: string } {
  switch (state) {
    case 'ACTIF':
      return {
        title: en ? 'Your clients can pay you by card' : 'Vos clients peuvent vous régler par carte',
        body: en
          ? 'Every invoice carries a secure payment link. The money goes straight to your account, and the invoice updates itself once the payment clears.'
          : 'Chaque facture porte un lien de paiement sécurisé. L’argent arrive directement sur votre compte, et la facture se met à jour dès que le règlement est confirmé.',
      };
    case 'EN_COURS':
      return {
        title: en ? 'Your details are not complete yet' : 'Votre dossier n’est pas encore complet',
        body: en
          ? 'Pick up where you left off. Until it is finished, your invoices show your bank details instead of a payment button.'
          : 'Reprenez là où vous vous êtes arrêté. Tant que ce n’est pas terminé, vos factures affichent vos coordonnées bancaires au lieu d’un bouton de paiement.',
      };
    case 'RESTREINT':
      return {
        title: en ? 'A document is still missing' : 'Une pièce manque encore',
        body: en
          ? 'Your account was opened but something still needs checking before payments can go through.'
          : 'Votre compte est ouvert mais une vérification reste à faire avant que les paiements puissent aboutir.',
      };
    default:
      return {
        title: en ? 'Let your clients pay by card' : 'Laissez vos clients vous régler par carte',
        body: en
          ? 'Add a payment button to every invoice you send. It takes a few minutes: your business details and the account where you want the money.'
          : 'Ajoutez un bouton de paiement à chaque facture que vous envoyez. Quelques minutes suffisent : vos informations d’entreprise et le compte sur lequel vous voulez être payé.',
      };
  }
}

export default function EncaissementScreen() {
  const en = useMobileLocale() === 'en';
  const { toast } = useToast();
  const [opening, setOpening] = React.useState(false);
  const acting = React.useRef(false);

  const query = useQuery<PaymentAccountDTO>(() => api.invoicePayments.account(), [], 'encaissement');
  const account = query.data;

  /**
   * Ouvre l'inscription, puis relit l'état au retour.
   *
   * Le webhook `account.updated` finit par arriver, mais pas toujours avant
   * que l'artisan ne revienne dans l'application : on redemande donc l'état à
   * la source plutôt que de lui montrer un écran en retard sur la réalité.
   */
  async function start() {
    if (acting.current) return;
    acting.current = true;
    setOpening(true);
    try {
      const { url } = await api.invoicePayments.startOnboarding();
      await WebBrowser.openBrowserAsync(url).catch(() => Linking.openURL(url));
      await query.reload();
    } catch (cause) {
      toast({
        title: cause instanceof Error
          ? cause.message
          : en ? 'Activation could not be opened.' : 'L’activation n’a pas pu être ouverte.',
      });
    } finally {
      acting.current = false;
      setOpening(false);
    }
  }

  if (query.loading && !account) {
    return (
      <Screen>
        <Card style={{ gap: spacing.md }}>
          <Skeleton height={16} width="45%" />
          <Skeleton height={28} width="75%" />
          <Skeleton height={16} width="60%" />
        </Card>
      </Screen>
    );
  }

  if (!account) {
    return (
      <Screen>
        <ErrorState
          description={query.error ?? (en ? 'This could not be loaded.' : 'Ceci n’a pas pu être chargé.')}
          onRetry={() => void query.reload()}
        />
      </Screen>
    );
  }

  const state = account.status as State;
  const tone = TONE[state];
  const text = headline(state, en);
  const active = state === 'ACTIF';

  return (
    <Screen>
      <Card style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: tone.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={tone.icon} size={19} color={tone.fg} />
          </View>
          <Caption upper style={{ color: tone.fg, flex: 1 }}>
            {active
              ? (en ? 'Active' : 'Actif')
              : state === 'ABSENT'
                ? (en ? 'Not set up' : 'Non activé')
                : (en ? 'To finish' : 'À terminer')}
          </Caption>
        </View>
        <Title style={{ fontSize: 21 }}>{text.title}</Title>
        <Body style={{ color: colors.muted, lineHeight: 22 }}>{text.body}</Body>
      </Card>

      {/* La formule ne le couvre pas : on le dit sans détour, et on n'ouvre
          pas une inscription qui échouerait ensuite. */}
      {!account.includedInPlan ? (
        <Card style={{ backgroundColor: colors.warningSoft, borderColor: colors.warningSoft, gap: spacing.sm }}>
          <Body style={{ color: colors.warning }}>{account.planReason}</Body>
        </Card>
      ) : !account.configured ? (
        <Card style={{ backgroundColor: colors.surface2, borderColor: colors.surface2 }}>
          <Body style={{ color: colors.muted }}>
            {en
              ? 'Online payment is not available on this installation yet.'
              : 'Le paiement en ligne n’est pas encore disponible sur cette installation.'}
          </Body>
        </Card>
      ) : active ? (
        <Card style={{ gap: spacing.md }}>
          <Caption upper style={{ color: colors.subtle }}>{en ? 'Where to use it' : 'Où cela sert'}</Caption>
          <Row en={en} icon="document-text-outline" fr="Ouvrez une facture, puis « Encaisser »." enText="Open an invoice, then “Collect payment”." />
          <Row en={en} icon="link-outline" fr="Le lien part au client : il paie par carte." enText="The link goes to your client: they pay by card." />
          <Row en={en} icon="checkmark-done-outline" fr="La facture passe à « payée » toute seule." enText="The invoice marks itself as paid." />
        </Card>
      ) : (
        <Button
          title={state === 'ABSENT'
            ? (en ? 'Set up card payments' : 'Activer le paiement par carte')
            : (en ? 'Finish setting up' : 'Terminer l’activation')}
          icon="card-outline"
          haptic
          loading={opening}
          onPress={() => {
            void Haptics.selectionAsync().catch(() => undefined);
            void start();
          }}
        />
      )}

      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', paddingHorizontal: spacing.xs }}>
        <Ionicons name="lock-closed-outline" size={17} color={colors.subtle} style={{ marginTop: 1 }} />
        <Caption style={{ flex: 1, color: colors.subtle, lineHeight: 17 }}>
          {en
            ? 'Card details are entered with our payment provider, Stripe, and never pass through DEVISERA. Your bank details are given to them, not to us.'
            : 'Les informations de carte sont saisies chez notre prestataire de paiement, Stripe, et ne transitent jamais par DEVISERA. Vos coordonnées bancaires lui sont confiées, pas à nous.'}
        </Caption>
      </View>
    </Screen>
  );
}

function Row({ en, icon, fr, enText }: { en: boolean; icon: keyof typeof Ionicons.glyphMap; fr: string; enText: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
      <View style={{ width: 30, height: 30, borderRadius: radius.sm, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={16} color={colors.accent} />
      </View>
      <Body style={{ flex: 1 }}>{en ? enText : fr}</Body>
    </View>
  );
}
