import * as React from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  DOCUMENT_TEMPLATE_LABELS,
  type BrandingDTO,
  type DocumentTemplateId,
} from '@devisia/shared';
import { Body, Button, Caption, Card, ErrorState, Screen, Skeleton } from '@/components/ui';
import { AuthField } from '@/components/auth-kit';
import { api, API_URL } from '@/lib/api';
import { useQuery } from '@/lib/query';
import { useMobileLocale } from '@/lib/i18n';
import { useToast } from '@/components/toast';
import { colors, radius, spacing } from '@/theme';

/**
 * Marque documentaire.
 *
 * Ce qui fait qu'un devis ressemble à l'entreprise qui l'envoie : une couleur,
 * une mise en page, des coordonnées de règlement. L'aperçu montre le résultat
 * pendant le réglage — choisir un modèle dans une liste sans le voir revient à
 * choisir au hasard.
 */

const TEMPLATE_ORDER: DocumentTemplateId[] = ['MINIMAL', 'MODERNE', 'EXECUTIF'];

const TEMPLATE_EN: Record<DocumentTemplateId, { name: string; description: string }> = {
  MINIMAL: { name: 'Minimal', description: 'Black and white, plenty of air. Reads at a glance.' },
  MODERNE: { name: 'Modern', description: 'A band in your colour and totals brought forward. The default.' },
  EXECUTIF: { name: 'Executive', description: 'Dense header and fine rules, for the most formal files.' },
};

/** Palette resserrée : dix couleurs tenues valent mieux qu'un sélecteur libre. */
const PALETTE = [
  '#0F62FE', '#1D4ED8', '#0E7490', '#047857', '#4D7C0F',
  '#B45309', '#C2410C', '#B91C1C', '#9333EA', '#111827',
];

/**
 * Aperçu du document.
 *
 * Reproduit fidèlement ce que le moteur PDF dessine : le filet d'en-tête est
 * ce qui distingue les trois modèles, et l'aperçu montre exactement cela.
 */
function DocumentPreview({
  template,
  color,
  businessName,
  logoUrl,
  en,
}: {
  template: DocumentTemplateId;
  color: string;
  businessName: string;
  logoUrl: string | null;
  en: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.line,
        padding: spacing.lg,
        gap: 10,
        aspectRatio: 1.05,
      }}
    >
      {/*
        L'en-tête reproduit le PDF : type de document à gauche, logo en haut à
        droite. C'est là que le logo apparaît sur le document réel.
      */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: template === 'MINIMAL' ? colors.ink : color }}>
            {en ? 'QUOTE' : 'DEVIS'}
          </Text>
          <Text numberOfLines={1} style={{ fontSize: 9, fontWeight: '600', color: colors.subtle }}>
            {businessName.toUpperCase()}
          </Text>
        </View>
        {logoUrl ? (
          <Image
            source={{ uri: logoUrl }}
            resizeMode="contain"
            style={{ width: 42, height: 42, borderRadius: 4 }}
          />
        ) : (
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 4,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: colors.line,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="image-outline" size={17} color={colors.subtle} />
          </View>
        )}
      </View>

      {/* Le filet : seule différence visible entre les trois modèles. */}
      {template === 'MINIMAL' ? (
        <View style={{ height: 1, backgroundColor: colors.line }} />
      ) : template === 'MODERNE' ? (
        <View style={{ height: 3, backgroundColor: color, borderRadius: 2 }} />
      ) : (
        <View style={{ gap: 2 }}>
          <View style={{ height: 1.5, backgroundColor: color }} />
          <View style={{ height: 0.5, backgroundColor: colors.line }} />
        </View>
      )}

      <View style={{ gap: 4, marginTop: 2 }}>
        <View style={{ height: 5, width: '55%', backgroundColor: colors.surface2, borderRadius: 2 }} />
        <View style={{ height: 5, width: '40%', backgroundColor: colors.surface2, borderRadius: 2 }} />
      </View>

      <View style={{ gap: 5, marginTop: 6 }}>
        {[0.95, 0.8, 0.88, 0.6].map((width, index) => (
          <View key={index} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <View style={{ height: 4, flex: width, backgroundColor: colors.surface2, borderRadius: 2 }} />
            <View style={{ height: 4, width: 18, backgroundColor: colors.surface2, borderRadius: 2 }} />
          </View>
        ))}
      </View>

      <View style={{ flex: 1 }} />
      <View
        style={{
          alignSelf: 'flex-end',
          paddingHorizontal: 8,
          paddingVertical: 5,
          borderRadius: 4,
          backgroundColor: template === 'MINIMAL' ? colors.surface : `${color}1A`,
        }}
      >
        <Text style={{ fontSize: 10, fontWeight: '700', color: template === 'MINIMAL' ? colors.ink : color }}>
          {en ? 'TOTAL 1 245,00 €' : 'TOTAL 1 245,00 €'}
        </Text>
      </View>
    </View>
  );
}

export default function MarqueScreen() {
  const en = useMobileLocale() === 'en';
  const { toast } = useToast();
  const query = useQuery<BrandingDTO>(() => api.branding.get(), [], 'branding');
  const branding = query.data;

  const [template, setTemplate] = React.useState<DocumentTemplateId | null>(null);
  const [color, setColor] = React.useState<string | null>(null);
  const [footer, setFooter] = React.useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = React.useState<string | null>(null);
  const [name, setName] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const submitting = React.useRef(false);

  /**
   * Téléverse le logo de l'entreprise.
   *
   * L'image est réduite et convertie en PNG avant l'envoi : les logos sortent
   * souvent d'un export imprimeur de plusieurs mégaoctets, et le HEIC des
   * iPhone n'est lisible ni par le moteur PDF ni par le navigateur du client.
   * L'enregistrement est immédiat — un logo qu'on choisit puis qu'on oublie
   * d'enregistrer ne sert à rien.
   */
  async function pickLogo() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast({
        title: en
          ? 'Allow access to your photos to choose a logo.'
          : 'Autorisez l’accès à vos photos pour choisir un logo.',
      });
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (picked.canceled || !picked.assets[0]) return;

    setUploading(true);
    try {
      const asset = picked.assets[0];
      const context = ImageManipulator.manipulate(asset.uri);
      const longest = Math.max(asset.width ?? 0, asset.height ?? 0);
      if (longest > 600) {
        context.resize((asset.height ?? 0) > (asset.width ?? 0) ? { height: 600 } : { width: 600 });
      }
      const rendered = await context.renderAsync();
      // PNG : un logo a souvent un fond transparent, que le JPEG noircirait.
      const image = await rendered.saveAsync({ format: SaveFormat.PNG });
      rendered.release();

      const uploaded = await api.files.upload(
        { uri: image.uri, name: 'logo.png', type: 'image/png' },
        'LOGO',
      );
      const updated = await api.branding.update({ logoFileId: uploaded.id });
      query.setData(updated);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      toast({ title: en ? 'Logo updated.' : 'Logo mis à jour.' });
    } catch (cause) {
      toast({
        title:
          cause instanceof Error
            ? cause.message
            : en
              ? 'The logo could not be uploaded.'
              : 'Le logo n’a pas pu être envoyé.',
      });
    } finally {
      setUploading(false);
    }
  }

  async function removeLogo() {
    setUploading(true);
    try {
      const updated = await api.branding.update({ logoFileId: null });
      query.setData(updated);
      toast({ title: en ? 'Logo removed.' : 'Logo retiré.' });
    } catch {
      toast({ title: en ? 'The logo could not be removed.' : 'Le logo n’a pas pu être retiré.' });
    } finally {
      setUploading(false);
    }
  }

  const currentTemplate = template ?? branding?.documentTemplate ?? 'MODERNE';
  const currentColor = color ?? branding?.brandColor ?? '#0F62FE';
  const currentFooter = footer ?? branding?.documentFooter ?? '';
  const currentPayment = paymentDetails ?? branding?.paymentDetails ?? '';
  const currentName = name ?? branding?.legalName ?? '';

  const dirty =
    branding != null &&
    (currentTemplate !== branding.documentTemplate ||
      currentColor !== branding.brandColor ||
      currentFooter !== (branding.documentFooter ?? '') ||
      currentPayment !== (branding.paymentDetails ?? '') ||
      (currentName.trim().length >= 2 && currentName.trim() !== branding.legalName));

  async function save() {
    if (submitting.current || !branding) return;
    submitting.current = true;
    setSaving(true);
    try {
      const updated = await api.branding.update({
        // Un nom vidé par mégarde ne doit pas effacer l'en-tête des documents
        // déjà envoyés : sous deux caractères, on n'envoie rien.
        ...(currentName.trim().length >= 2 ? { legalName: currentName.trim() } : {}),
        documentTemplate: currentTemplate,
        brandColor: currentColor,
        documentFooter: currentFooter.trim() || null,
        paymentDetails: currentPayment.trim() || null,
      });
      query.setData(updated);
      setTemplate(null);
      setColor(null);
      setFooter(null);
      setPaymentDetails(null);
      setName(null);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      toast({ title: en ? 'Branding saved.' : 'Marque enregistrée.' });
    } catch (cause) {
      toast({
        title:
          cause instanceof Error
          ? cause.message
          : en
            ? 'Your branding could not be saved.'
            : 'Votre marque n’a pas pu être enregistrée.',
      });
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  if (query.loading && !branding) {
    return (
      <Screen>
        <Card style={{ gap: spacing.md }}>
          <Skeleton height={16} width="45%" />
          <Skeleton height={220} />
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
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing['3xl'] }}>
        <View style={{ gap: spacing.sm }}>
          <Caption upper style={{ color: colors.subtle }}>
            {en ? 'Preview' : 'Aperçu'}
          </Caption>
          <DocumentPreview
            template={currentTemplate}
            color={currentColor}
            businessName={currentName || branding.legalName}
            logoUrl={branding.logoUrl ? `${API_URL}${branding.logoUrl}` : null}
            en={en}
          />
        </View>

        {/*
          Le nom affiché.

          C'est la première ligne du document que reçoit le client, et jusqu'ici
          elle ne se corrigeait que depuis « Mon entreprise », deux écrans plus
          loin. On la modifie ici, là où l'aperçu montre l'effet immédiatement ;
          c'est la même valeur des deux côtés, pas un doublon.
        */}
        <View style={{ gap: spacing.sm }}>
          <Caption upper style={{ color: colors.subtle }}>
            {en ? 'Business name on documents' : 'Nom affiché sur les documents'}
          </Caption>
          <AuthField
            label={en ? 'Business name' : 'Nom de l’entreprise'}
            value={currentName}
            onChangeText={setName}
            editable={!saving}
            autoComplete="organization"
            placeholder="Plomberie Martin"
          />
        </View>

        <View style={{ gap: spacing.sm }}>
          <Caption upper style={{ color: colors.subtle }}>
            {en ? 'Your logo' : 'Votre logo'}
          </Caption>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
            {branding.logoUrl ? (
              <Image
                source={{ uri: `${API_URL}${branding.logoUrl}` }}
                resizeMode="contain"
                style={{ width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.surface }}
              />
            ) : (
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: radius.md,
                  backgroundColor: colors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="image-outline" size={26} color={colors.subtle} />
              </View>
            )}
            <View style={{ flex: 1, gap: 4 }}>
              <Body style={{ fontWeight: '600' }}>
                {branding.logoUrl ? (en ? 'Logo in place' : 'Logo en place') : en ? 'No logo yet' : 'Aucun logo'}
              </Body>
              <Caption style={{ color: colors.subtle, lineHeight: 16 }}>
                {en ? 'Appears top-right on every document.' : 'Apparaît en haut à droite de chaque document.'}
              </Caption>
              <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: 4 }}>
                <Pressable accessibilityRole="button" disabled={uploading} onPress={() => void pickLogo()} hitSlop={8}>
                  <Caption style={{ color: colors.accent, fontWeight: '700' }}>
                    {uploading
                      ? en ? 'Sending…' : 'Envoi…'
                      : branding.logoUrl
                        ? en ? 'Replace' : 'Remplacer'
                        : en ? 'Choose a logo' : 'Choisir un logo'}
                  </Caption>
                </Pressable>
                {branding.logoUrl ? (
                  <Pressable accessibilityRole="button" disabled={uploading} onPress={() => void removeLogo()} hitSlop={8}>
                    <Caption style={{ color: colors.danger, fontWeight: '700' }}>
                      {en ? 'Remove' : 'Retirer'}
                    </Caption>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </Card>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Caption upper style={{ color: colors.subtle }}>
            {en ? 'Document style' : 'Modèle de document'}
          </Caption>
          {TEMPLATE_ORDER.map((id) => {
            const selected = currentTemplate === id;
            // Minimal reste ouvert à tous ; les deux autres suivent la formule.
            const locked = id !== 'MINIMAL' && !branding.advancedTemplatesAvailable;
            const labels = en ? TEMPLATE_EN[id] : DOCUMENT_TEMPLATE_LABELS[id];
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: locked }}
                onPress={() => {
                  if (locked) {
                    toast({ title: branding.planReason ?? (en ? 'Not included in your plan.' : 'Non inclus dans votre formule.') });
                    return;
                  }
                  void Haptics.selectionAsync().catch(() => undefined);
                  setTemplate(id);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: spacing.lg,
                  borderRadius: radius.lg,
                  backgroundColor: selected ? colors.accentSoft : colors.surface,
                  borderWidth: 1.5,
                  borderColor: selected ? colors.accent : 'transparent',
                  opacity: locked ? 0.55 : 1,
                }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Body style={{ fontWeight: '700' }}>{labels.name}</Body>
                  <Caption style={{ color: colors.subtle, lineHeight: 17 }}>{labels.description}</Caption>
                </View>
                <Ionicons
                  name={locked ? 'lock-closed' : selected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={locked ? colors.subtle : selected ? colors.accent : colors.line}
                />
              </Pressable>
            );
          })}
          {!branding.advancedTemplatesAvailable && branding.planReason ? (
            <Caption style={{ color: colors.subtle }}>{branding.planReason}</Caption>
          ) : null}
        </View>

        <View style={{ gap: spacing.sm }}>
          <Caption upper style={{ color: colors.subtle }}>
            {en ? 'Your colour' : 'Votre couleur'}
          </Caption>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
            {PALETTE.map((value) => {
              const selected = currentColor.toLowerCase() === value.toLowerCase();
              return (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityLabel={value}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    void Haptics.selectionAsync().catch(() => undefined);
                    setColor(value);
                  }}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: value,
                    borderWidth: selected ? 3 : 0,
                    borderColor: colors.ink,
                  }}
                />
              );
            })}
          </View>
        </View>

        <AuthField
          label={en ? 'Payment details' : 'Coordonnées de règlement'}
          hint={en ? 'on invoices' : 'sur les factures'}
          help={en ? 'IBAN, cheque payee — printed on every invoice you send.' : 'IBAN, ordre du chèque — imprimés sur chaque facture envoyée.'}
          value={currentPayment}
          onChangeText={setPaymentDetails}
          multiline
          editable={!saving}
          style={{ height: 88, paddingTop: 14, textAlignVertical: 'top' }}
        />

        <AuthField
          label={en ? 'Document footer' : 'Pied de page'}
          hint={en ? 'optional' : 'facultatif'}
          value={currentFooter}
          onChangeText={setFooter}
          placeholder={en ? 'Thank you for your trust.' : 'Merci de votre confiance.'}
          editable={!saving}
        />

        <Button
          title={en ? 'Save' : 'Enregistrer'}
          haptic
          loading={saving}
          disabled={!dirty}
          onPress={() => void save()}
        />
      </ScrollView>
    </Screen>
  );
}
