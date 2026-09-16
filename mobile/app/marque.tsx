import * as React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  DOCUMENT_TEMPLATE_LABELS,
  type BrandingDTO,
  type DocumentTemplateId,
} from '@devisia/shared';
import { Body, Button, Caption, Card, ErrorState, Screen, Skeleton } from '@/components/ui';
import { AuthField } from '@/components/auth-kit';
import { api } from '@/lib/api';
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
  en,
}: {
  template: DocumentTemplateId;
  color: string;
  businessName: string;
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
        aspectRatio: 0.72,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '700', color: colors.ink, flex: 1 }}>
          {businessName.toUpperCase()}
        </Text>
        <Text style={{ fontSize: 13, fontWeight: '700', color }}>{en ? 'QUOTE' : 'DEVIS'}</Text>
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
  const [saving, setSaving] = React.useState(false);
  const submitting = React.useRef(false);

  const currentTemplate = template ?? branding?.documentTemplate ?? 'MODERNE';
  const currentColor = color ?? branding?.brandColor ?? '#0F62FE';
  const currentFooter = footer ?? branding?.documentFooter ?? '';
  const currentPayment = paymentDetails ?? branding?.paymentDetails ?? '';

  const dirty =
    branding != null &&
    (currentTemplate !== branding.documentTemplate ||
      currentColor !== branding.brandColor ||
      currentFooter !== (branding.documentFooter ?? '') ||
      currentPayment !== (branding.paymentDetails ?? ''));

  async function save() {
    if (submitting.current || !branding) return;
    submitting.current = true;
    setSaving(true);
    try {
      const updated = await api.branding.update({
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
            businessName={branding.legalName}
            en={en}
          />
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
