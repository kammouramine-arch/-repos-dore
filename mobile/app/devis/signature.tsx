import * as React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { formatCents, type QuoteDetailDTO } from '@devisia/shared';
import Svg, { Path } from 'react-native-svg';
import { Body, Button, Caption, Card, ErrorState, Ionicons, Screen, Skeleton, Title } from '@/components/ui';
import { AuthField } from '@/components/auth-kit';
import { SignatureSheet } from '@/components/signature-pad';
import { api } from '@/lib/api';
import { useQuery } from '@/lib/query';
import { useMobileLocale } from '@/lib/i18n';
import { colors, radius, spacing } from '@/theme';

/**
 * Signature du devis sur place.
 *
 * Le moment que l'artisan attend : le client vient de lire le devis, il est
 * encore là, et il peut accepter tout de suite sur l'iPhone qu'on lui tend.
 * Tant que la signature devait repasser par un e-mail, l'accord se perdait
 * dans la boîte de réception.
 *
 * Ce que l'écran annonce est exactement ce qu'il fait : une acceptation
 * électronique avec nom, horodatage et tracé. Il ne parle nulle part de
 * signature « qualifiée » ou « certifiée » — ce serait faux au sens d'eIDAS.
 */
export default function SignatureDevisScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const locale = useMobileLocale();
  const en = locale === 'en';

  const query = useQuery<QuoteDetailDTO>(
    () => api.quotes.get(String(id)),
    [id],
    `quote:sign:${id}`,
  );
  const quote = query.data;

  /*
   * Nom du signataire.
   *
   * Tant que personne n'a tapé, c'est le nom du client qui s'affiche ; dès la
   * première frappe, c'est la saisie qui fait foi. Valeur dérivée plutôt que
   * recopiée dans un effet : le champ ne peut pas se réinitialiser tout seul
   * pendant que le client écrit le nom de son gérant.
   */
  const [typedName, setTypedName] = React.useState<string | null>(null);
  const [strokePath, setStrokePath] = React.useState<string | null>(null);
  const [signing, setSigning] = React.useState(false);
  const [accepted, setAccepted] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);
  const submitting = React.useRef(false);

  const signerName = typedName ?? quote?.customerName ?? '';
  const ready = signerName.trim().length >= 2 && !!strokePath && accepted;

  async function submit() {
    if (submitting.current || !quote || !ready) return;
    submitting.current = true;
    setSaving(true);
    setError(null);
    try {
      await api.quotes.sign(quote.publicToken, {
        signerName: signerName.trim(),
        strokePath: strokePath!,
        accepted: true,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      setDone(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : en
            ? 'The signature could not be saved. Try again.'
            : 'La signature n’a pas pu être enregistrée. Réessayez.',
      );
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  if (query.loading && !quote) {
    return (
      <Screen>
          <Card style={{ gap: spacing.md }}>
          <Skeleton height={16} width="50%" />
          <Skeleton height={34} width="70%" />
          <Skeleton height={200} />
        </Card>
      </Screen>
    );
  }

  if (!quote) {
    return (
      <Screen>
          <ErrorState
          description={query.error ?? (en ? 'This quote could not be loaded.' : 'Ce devis n’a pas pu être chargé.')}
          onRetry={() => void query.reload()}
        />
      </Screen>
    );
  }

  // Confirmation : le client voit que c'est fait, l'artisan enchaîne.
  if (done) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, paddingHorizontal: spacing.lg }}>
          <View
            style={{
              width: 76,
              height: 76,
              borderRadius: 38,
              backgroundColor: colors.successSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 38 }}>✓</Text>
          </View>
          <Title style={{ textAlign: 'center' }}>{en ? 'Quote signed' : 'Devis signé'}</Title>
          <Body style={{ textAlign: 'center', color: colors.muted }}>
            {en
              ? `${signerName.trim()} accepted quote ${quote.number}. You can now turn it into an invoice.`
              : `${signerName.trim()} a accepté le devis ${quote.number}. Vous pouvez maintenant le facturer.`}
          </Body>
          <Button
            title={en ? 'Create the invoice' : 'Créer la facture'}
            haptic
            onPress={() => router.replace({ pathname: '/factures', params: { devis: quote.id } })}
          />
          <Pressable accessibilityRole="button" onPress={() => router.replace({ pathname: '/devis/[id]', params: { id: quote.id } })} hitSlop={8}>
            <Caption style={{ color: colors.accent, fontWeight: '700' }}>
              {en ? 'Back to the quote' : 'Revenir au devis'}
            </Caption>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const alreadySigned = quote.status === 'ACCEPTE';

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing['3xl'] }}>
        {/* Rappel de ce qui est signé : montant et objet, en grand. */}
        <Card style={{ gap: 6 }}>
          <Caption upper style={{ color: colors.subtle }}>
            {quote.number}
          </Caption>
          <Title style={{ fontSize: 21 }} numberOfLines={2}>
            {quote.title}
          </Title>
          <Text style={{ fontSize: 30, fontWeight: '700', letterSpacing: -1, color: colors.ink, marginTop: 4 }}>
            {formatCents(quote.totalCents)}
          </Text>
          <Caption style={{ color: colors.subtle }}>
            {en ? 'total incl. VAT' : 'total TTC'}
            {quote.depositCents > 0
              ? en
                ? ` · deposit ${formatCents(quote.depositCents)}`
                : ` · acompte ${formatCents(quote.depositCents)}`
              : ''}
          </Caption>
        </Card>

        {alreadySigned ? (
          <Card style={{ backgroundColor: colors.successSoft, borderColor: colors.successSoft }}>
            <Body style={{ color: colors.success }}>
              {en ? 'This quote has already been accepted.' : 'Ce devis a déjà été accepté.'}
            </Body>
          </Card>
        ) : null}

        {error ? (
          <Card style={{ backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft }}>
            <Body style={{ color: colors.danger }}>{error}</Body>
          </Card>
        ) : null}

        <AuthField
          label={en ? 'Name of the person signing' : 'Nom de la personne qui signe'}
          value={signerName}
          onChangeText={setTypedName}
          autoComplete="name"
          editable={!saving}
          placeholder="Jean Dupont"
        />

        {/*
          La signature elle-même.

          Elle se trace sur une feuille plein écran, pas dans un cadre coincé
          au milieu d'une vue défilante : le geste était volé par le
          défilement dès qu'il descendait. Ici, l'écran montre l'état — pas
          encore signé, ou signé avec le tracé visible — et le bouton ouvre la
          feuille.
        */}
        <View style={{ gap: spacing.sm }}>
          <Caption upper style={{ color: colors.subtle }}>
            {en ? 'Signature' : 'Signature'}
          </Caption>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strokePath
              ? (en ? 'Signature captured. Tap to sign again.' : 'Signature enregistrée. Touchez pour signer à nouveau.')
              : (en ? 'Open the signature pad' : 'Ouvrir la zone de signature')}
            disabled={saving}
            onPress={() => setSigning(true)}
            style={({ pressed }) => ({
              minHeight: 132,
              borderRadius: radius.lg,
              borderWidth: 1.5,
              borderStyle: strokePath ? 'solid' : 'dashed',
              borderColor: strokePath ? colors.accent : colors.lineStrong,
              backgroundColor: strokePath ? colors.canvas : colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.sm,
              padding: spacing.md,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            {strokePath ? (
              <>
                <Svg width="100%" height={72} viewBox="0 0 1000 400" preserveAspectRatio="xMidYMid meet">
                  <Path d={strokePath} stroke={colors.ink} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </Svg>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Caption style={{ color: colors.success, fontWeight: '700' }}>
                    {en ? 'Signature captured · tap to redo' : 'Signature enregistrée · touchez pour refaire'}
                  </Caption>
                </View>
              </>
            ) : (
              <>
                <Ionicons name="create-outline" size={28} color={colors.accent} />
                <Body style={{ color: colors.accent, fontWeight: '700' }}>
                  {en ? 'Sign here' : 'Signer ici'}
                </Body>
                <Caption style={{ color: colors.subtle, textAlign: 'center' }}>
                  {en ? 'Opens a full-screen signature pad' : 'Ouvre une zone de signature plein écran'}
                </Caption>
              </>
            )}
          </Pressable>
        </View>

        <SignatureSheet
          visible={signing}
          en={en}
          signerName={signerName.trim()}
          onCancel={() => setSigning(false)}
          onConfirm={(path) => {
            setStrokePath(path);
            setSigning(false);
          }}
        />

        {/* Acceptation explicite : une signature sans intention déclarée ne
            vaudrait pas grand-chose en cas de litige. */}
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
          onPress={() => {
            void Haptics.selectionAsync().catch(() => undefined);
            setAccepted((value) => !value);
          }}
          disabled={saving}
          style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}
        >
          <View
            style={{
              width: 26,
              height: 26,
              borderRadius: 8,
              borderWidth: 2,
              borderColor: accepted ? colors.accent : colors.line,
              backgroundColor: accepted ? colors.accent : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 1,
            }}
          >
            {accepted ? <Text style={{ color: colors.white, fontWeight: '700', fontSize: 15 }}>✓</Text> : null}
          </View>
          <Body style={{ flex: 1, lineHeight: 21 }}>
            {en
              ? `I accept quote ${quote.number} for ${formatCents(quote.totalCents)} incl. VAT and the terms it sets out.`
              : `J’accepte le devis ${quote.number} pour ${formatCents(quote.totalCents)} TTC et les conditions qu’il prévoit.`}
          </Body>
        </Pressable>

        <Button
          title={en ? 'Sign and accept' : 'Signer et accepter'}
          haptic
          loading={saving}
          disabled={!ready}
          onPress={() => void submit()}
        />

        {/* Ce que vaut cette signature, dit sans ambiguïté. */}
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md }}>
          <Caption style={{ color: colors.subtle, lineHeight: 17 }}>
            {en
              ? 'Electronic acceptance: DEVISERA records the name, the date, the signature and the exact content of the quote. It is not a qualified electronic signature under eIDAS.'
              : 'Acceptation électronique : DEVISERA enregistre le nom, la date, le tracé et le contenu exact du devis. Il ne s’agit pas d’une signature électronique qualifiée au sens du règlement eIDAS.'}
          </Caption>
        </View>
      </ScrollView>
    </Screen>
  );
}
