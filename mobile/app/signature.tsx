import * as React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Line, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { BrandingDTO } from '@devisia/shared';
import { Body, Button, Caption, Card, ErrorState, Heading, Muted, Screen, Skeleton } from '@/components/ui';
import { SignatureSheet } from '@/components/signature-pad';
import { useToast } from '@/components/toast';
import { useQuery } from '@/lib/query';
import { api } from '@/lib/api';
import { useMobileLocale } from '@/lib/i18n';
import { colors, radius, spacing } from '@/theme';

/**
 * Ma signature.
 *
 * C'est la signature de **l'entreprise** : celle que l'artisan trace une fois,
 * et qui figure ensuite au bas de chaque devis et de chaque facture qu'il
 * émet. Ce n'est pas l'acceptation du client — celle-ci se recueille sur la
 * fiche du devis, et n'a rien à faire ici.
 *
 * Elle vivait dans un coin de Ma marque, entre la couleur et le pied de page.
 * Une signature n'est pas un réglage de mise en page : c'est ce qui engage
 * l'entreprise. Elle a donc son écran, atteignable depuis l'accueil en un
 * geste, et Ma marque n'en garde qu'un renvoi.
 *
 * ## Ce que l'écran garantit
 *
 * L'enregistrement est immédiat : on vient de tracer, on s'attend à ce que ce
 * soit pris. Rien à valider ensuite, rien à perdre en quittant l'écran.
 *
 * Les documents déjà finalisés ne bougent pas. Remplacer sa signature ici
 * change les documents à venir, jamais ceux qui sont partis chez un client —
 * c'est le serveur qui le garantit, en figeant le tracé au moment où un
 * document est envoyé.
 */

/** Aperçu du tracé, dans le repère fixe où il est enregistré. */
function Preview({ path }: { path: string }) {
  return (
    <Svg width="100%" height={96} viewBox="0 0 1000 400" preserveAspectRatio="xMidYMid meet">
      <Line x1={60} y1={318} x2={940} y2={318} stroke={colors.line} strokeWidth={3} />
      <Path d={path} stroke={colors.ink} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export default function SignatureScreen() {
  const router = useRouter();
  const en = useMobileLocale() === 'en';
  const { toast } = useToast();
  const query = useQuery<BrandingDTO>(() => api.branding.get(), [], 'branding');
  const branding = query.data;
  const [drawing, setDrawing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const signature = branding?.signature.strokePath ?? null;
  const drawnAt = branding?.signature.drawnAt ?? null;

  async function save(strokePath: string | null) {
    setSaving(true);
    try {
      const updated = await api.branding.update({
        signatureStrokePath: strokePath,
        ...(strokePath ? { signatureName: branding?.legalName } : {}),
      });
      query.setData(updated);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      toast({
        title: strokePath
          ? (en ? 'Signature saved.' : 'Signature enregistrée.')
          : (en ? 'Signature removed.' : 'Signature retirée.'),
      });
    } catch (cause) {
      toast({ title: cause instanceof Error ? cause.message : (en ? 'It could not be saved.' : 'Cela n’a pas pu être enregistré.') });
    } finally {
      setSaving(false);
    }
  }

  if (query.loading && !branding) {
    return (
      <Screen>
        <Card style={{ gap: spacing.md }}>
          <Skeleton height={14} width="50%" />
          <Skeleton height={96} />
          <Skeleton height={14} width="70%" />
        </Card>
      </Screen>
    );
  }

  if (!branding) {
    return (
      <Screen>
        <ErrorState
          description={query.error ?? (en ? 'Your branding could not be loaded.' : 'Votre marque n’a pas pu être chargée.')}
          onRetry={() => void query.reload()}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ gap: spacing.sm }}>
        <Heading>{en ? 'Your business signature' : 'La signature de votre entreprise'}</Heading>
        <Muted>
          {en
            ? 'Draw it once. It is added at the bottom of every quote and invoice you issue — you never have to sign again.'
            : 'Tracez-la une fois. Elle est apposée au bas de chaque devis et de chaque facture que vous émettez — vous n’avez plus à signer.'}
        </Muted>
      </View>

      <Card style={{ gap: spacing.md }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={signature
            ? (en ? 'Replace my signature' : 'Remplacer ma signature')
            : (en ? 'Draw my signature' : 'Tracer ma signature')}
          disabled={saving}
          onPress={() => {
            void Haptics.selectionAsync().catch(() => undefined);
            setDrawing(true);
          }}
          style={({ pressed }) => ({
            minHeight: 164,
            borderRadius: radius.lg,
            borderWidth: 1.5,
            borderStyle: signature ? 'solid' : 'dashed',
            borderColor: signature ? colors.accentBorder : colors.lineStrong,
            backgroundColor: signature ? colors.canvas : colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            padding: spacing.lg,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          {signature ? (
            <>
              <Preview path={signature} />
              <Caption style={{ color: colors.subtle }}>
                {branding.legalName}
                {drawnAt
                  ? ` · ${new Date(drawnAt).toLocaleDateString(en ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
                  : ''}
              </Caption>
            </>
          ) : (
            <>
              <Ionicons name="create-outline" size={30} color={colors.accent} />
              <Body style={{ color: colors.accent, fontWeight: '700' }}>
                {en ? 'Draw my signature' : 'Tracer ma signature'}
              </Body>
              <Caption style={{ color: colors.subtle, textAlign: 'center' }}>
                {en ? 'With your finger, as you would on paper' : 'Au doigt, comme sur papier'}
              </Caption>
            </>
          )}
        </Pressable>

        {/*
          Remplacer est l'action courante ; supprimer ne l'est pas.

          Les mettre côte à côte à poids égal, l'une en rouge plein, donnait
          deux boutons qui se disputent l'attention pour un geste réversible.
          La suppression prend la forme d'une ligne rouge, comme dans les
          réglages d'iOS : lisible, atteignable, et sans crier.
        */}
        {signature ? (
          <>
            <Button
              title={en ? 'Replace my signature' : 'Remplacer ma signature'}
              variant="secondary"
              icon="refresh-outline"
              disabled={saving}
              onPress={() => setDrawing(true)}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={en ? 'Remove my signature' : 'Supprimer ma signature'}
              disabled={saving}
              onPress={() => void save(null)}
              hitSlop={8}
              style={({ pressed }) => ({ alignSelf: 'center', minHeight: 36, justifyContent: 'center', opacity: pressed || saving ? 0.6 : 1 })}
            >
              <Caption style={{ color: colors.danger, fontWeight: '700' }}>
                {en ? 'Remove my signature' : 'Supprimer ma signature'}
              </Caption>
            </Pressable>
          </>
        ) : null}
      </Card>

      {/*
        Ce que le remplacement ne fait pas.

        Un artisan qui change sa signature se demande légitimement si les
        devis déjà partis viennent de changer sous les yeux de ses clients. La
        réponse est non, et elle est écrite ici plutôt que supposée.
      */}
      {signature ? (
        <Card style={{ gap: spacing.sm, backgroundColor: colors.surface, borderColor: colors.line }}>
          <Caption upper style={{ color: colors.subtle }}>{en ? 'Good to know' : 'Bon à savoir'}</Caption>
          <Muted>
            {en
              ? 'Replacing your signature applies to the documents you issue from now on. Quotes and invoices already sent keep the signature they were issued with.'
              : 'Remplacer votre signature vaut pour les documents que vous émettrez ensuite. Les devis et factures déjà envoyés gardent la signature avec laquelle ils sont partis.'}
          </Muted>
        </Card>
      ) : null}

      {/* Ma marque et la signature vont ensemble : logo, couleur, modèle d'un
          côté ; la main de l'artisan de l'autre. */}
      <Card style={{ gap: spacing.md }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={en ? 'Open my branding' : 'Ouvrir Ma marque'}
          onPress={() => router.push('/marque')}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.md, opacity: pressed ? 0.6 : 1, minHeight: 44 })}
        >
          <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="color-palette-outline" size={19} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Body style={{ fontWeight: '600' }}>{en ? 'My branding' : 'Ma marque'}</Body>
            <Muted style={{ fontSize: 13 }}>{en ? 'Logo, colour and document style' : 'Logo, couleur et modèle de document'}</Muted>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
        </Pressable>
      </Card>

      <SignatureSheet
        visible={drawing}
        en={en}
        purpose="business"
        signerName={branding.legalName}
        onCancel={() => setDrawing(false)}
        onConfirm={(path) => {
          setDrawing(false);
          void save(path);
        }}
      />
    </Screen>
  );
}
