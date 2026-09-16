import * as React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ClientSheet } from './client-sheet';
import { useMobileLocale } from '@/lib/i18n';
import { colors, radius, shadows, spacing } from '@/theme';

/**
 * La feuille de création, derrière le « + ».
 *
 * Depuis que l'accueil ne porte plus de micro géant, c'est ici que commence
 * tout ce qu'on crée — et la voix passe en tête, parce que c'est la manière
 * la plus rapide de chiffrer un chantier.
 *
 * C'est un `Modal` monté dans la barre elle-même, pas une route. Une route
 * aurait imposé un montage d'écran, donc un blanc d'une fraction de seconde
 * sur un appui qu'on fait vingt fois par jour. Ici, l'ouverture est
 * immédiate ; le contenu existe déjà.
 */

type Action = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: { fr: string; en: string };
  body: { fr: string; en: string };
  /** Destination, ou `client` pour ouvrir la fiche client par-dessus. */
  href?: Href;
  kind?: 'client';
  primary?: boolean;
};

const ACTIONS: Action[] = [
  {
    id: 'voix',
    icon: 'mic',
    title: { fr: 'Devis à la voix', en: 'Quote by voice' },
    body: { fr: 'Décrivez le chantier, DEVISERA écrit les lignes', en: 'Describe the job, DEVISERA writes the line items' },
    href: '/devis/nouveau?dicter=1',
    primary: true,
  },
  {
    id: 'devis',
    icon: 'create-outline',
    title: { fr: 'Devis manuel', en: 'Quote by hand' },
    body: { fr: 'Saisir les lignes vous-même', en: 'Enter the line items yourself' },
    href: '/devis/nouveau',
  },
  {
    id: 'client',
    icon: 'person-add-outline',
    title: { fr: 'Nouveau client', en: 'New client' },
    body: { fr: 'Nom, adresse et coordonnées', en: 'Name, address and contact details' },
    kind: 'client',
  },
  {
    id: 'recu',
    icon: 'camera-outline',
    title: { fr: 'Scanner un reçu', en: 'Scan a receipt' },
    body: { fr: 'Le ticket est lu, relu par vous, puis classé', en: 'The receipt is read, you check it, then it is filed' },
    href: '/depenses',
  },
  {
    /*
     * Une facture naît d'un devis accepté — c'est la règle du serveur, qui
     * refuse toute facture sans devis. La feuille mène donc aux devis plutôt
     * que de promettre une facture vierge qui n'existerait pas.
     */
    id: 'facture',
    icon: 'cash-outline',
    title: { fr: 'Facturer un devis signé', en: 'Invoice a signed quote' },
    body: { fr: 'Ouvrez le devis accepté, puis « Créer la facture »', en: 'Open the accepted quote, then “Create the invoice”' },
    href: '/(app)/devis',
  },
];

function Row({ action, en, onPress }: { action: Action; en: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={en ? action.title.en : action.title.fr}
      accessibilityHint={en ? action.body.en : action.body.fr}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.lg,
        minHeight: 72,
        borderRadius: radius.lg,
        backgroundColor: action.primary ? colors.accent : pressed ? colors.surface2 : colors.surface,
        opacity: pressed ? 0.9 : 1,
        transform: [{ scale: pressed ? 0.99 : 1 }],
        ...(action.primary ? shadows.card : {}),
      })}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: action.primary ? 'rgba(255,255,255,0.2)' : colors.canvas,
        }}
      >
        <Ionicons name={action.icon} size={21} color={action.primary ? colors.white : colors.accent} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 16.5, fontWeight: '700', color: action.primary ? colors.white : colors.ink }}>
          {en ? action.title.en : action.title.fr}
        </Text>
        <Text style={{ fontSize: 13, lineHeight: 18, color: action.primary ? 'rgba(255,255,255,0.86)' : colors.muted }}>
          {en ? action.body.en : action.body.fr}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={action.primary ? 'rgba(255,255,255,0.8)' : colors.subtle} />
    </Pressable>
  );
}

export function CreateSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const en = useMobileLocale() === 'en';
  const [client, setClient] = React.useState(false);

  const run = (action: Action) => {
    void Haptics.selectionAsync().catch(() => undefined);
    if (action.kind === 'client') {
      setClient(true);
      return;
    }
    // La feuille se ferme avant de naviguer : l'écran suivant ne doit pas
    // apparaître derrière un voile qui s'attarde.
    onClose();
    if (action.href) router.push(action.href);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      {/* Toucher le voile ferme : le geste attendu d'une feuille iOS. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={en ? 'Close' : 'Fermer'}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(11, 18, 32, 0.38)', justifyContent: 'flex-end' }}
      >
        {/* Le contenu ne relaie pas l'appui au voile. */}
        <Pressable
          accessible={false}
          onPress={() => undefined}
          style={{
            backgroundColor: colors.canvas,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingTop: spacing.md,
          }}
        >
          <SafeAreaView edges={['bottom']}>
            <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md }}>
              <View style={{ alignSelf: 'center', width: 38, height: 5, borderRadius: 3, backgroundColor: colors.lineStrong }} />
              <Text style={{ fontSize: 21, fontWeight: '700', letterSpacing: -0.5, color: colors.ink, marginTop: spacing.xs }}>
                {en ? 'Create' : 'Créer'}
              </Text>
              {ACTIONS.map((action) => (
                <Row key={action.id} action={action} en={en} onPress={() => run(action)} />
              ))}
            </View>
          </SafeAreaView>
        </Pressable>
      </Pressable>

      <ClientSheet
        visible={client}
        onClose={() => setClient(false)}
        onCreated={(customer) => {
          setClient(false);
          onClose();
          router.push({ pathname: '/clients/[id]', params: { id: customer.id } });
        }}
      />
    </Modal>
  );
}
