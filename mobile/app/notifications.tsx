import * as React from 'react';
import { AppState, Linking, Switch, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_LABELS,
  type NotificationCategory,
} from '@devisia/shared';
import { Body, Button, Caption, Card, ErrorState, Muted, Screen, Skeleton } from '@/components/ui';
import { useToast } from '@/components/toast';
import { useQuery } from '@/lib/query';
import { api } from '@/lib/api';
import { useMobileLocale } from '@/lib/i18n';
import { colors, spacing, useThemeScheme } from '@/theme';

/**
 * Notifications.
 *
 * ## Deux autorisations, pas une
 *
 * iOS décide si DEVISERA a le droit d'afficher une bannière ; DEVISERA décide
 * ce qu'il vaut la peine d'envoyer. Confondre les deux donne l'écran classique
 * où l'on coupe des catégories sans rien recevoir de toute façon, ou l'inverse.
 *
 * L'état iOS est donc affiché en premier, tel quel. S'il est refusé, aucune
 * application ne peut le rétablir de l'intérieur — prétendre le contraire
 * serait mentir. On ouvre les Réglages, et c'est tout ce qu'on peut faire.
 *
 * ## Ce que les interrupteurs commandent
 *
 * Chaque ligne correspond à des notifications réellement émises par le
 * serveur, et le tri est fait avant l'envoi : couper une catégorie coupe la
 * bannière, pas seulement son affichage dans l'application. La trace reste
 * dans l'activité — couper une alerte n'est pas effacer ce qui s'est passé.
 */

type Permission = 'granted' | 'denied' | 'undetermined';

function usePermission(): { status: Permission | null; request: () => Promise<void>; refresh: () => void } {
  const [status, setStatus] = React.useState<Permission | null>(null);

  const read = React.useCallback(() => {
    void Notifications.getPermissionsAsync()
      .then((result) => setStatus(result.granted ? 'granted' : result.canAskAgain ? 'undetermined' : 'denied'))
      .catch(() => setStatus('undetermined'));
  }, []);

  React.useEffect(() => {
    read();
    // L'artisan part dans les Réglages iOS et revient : l'état doit avoir
    // suivi, sinon l'écran ment jusqu'au prochain lancement.
    const subscription = AppState.addEventListener('change', (next) => { if (next === 'active') read(); });
    return () => subscription.remove();
  }, [read]);

  const request = React.useCallback(async () => {
    const result = await Notifications.requestPermissionsAsync().catch(() => null);
    if (result) setStatus(result.granted ? 'granted' : result.canAskAgain ? 'undetermined' : 'denied');
  }, []);

  return { status, request, refresh: read };
}

function PermissionCard({ status, en, onRequest }: { status: Permission; en: boolean; onRequest: () => void }) {
  const granted = status === 'granted';
  const denied = status === 'denied';
  const tone = granted ? colors.success : denied ? colors.danger : colors.warning;
  const soft = granted ? colors.successSoft : denied ? colors.dangerSoft : colors.warningSoft;

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: soft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons
            name={granted ? 'notifications' : denied ? 'notifications-off' : 'notifications-outline'}
            size={21}
            color={tone}
          />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Body style={{ fontWeight: '600' }}>
            {granted
              ? (en ? 'Notifications are allowed' : 'Les notifications sont autorisées')
              : denied
                ? (en ? 'Notifications are turned off in iOS' : 'Les notifications sont refusées dans iOS')
                : (en ? 'Notifications are not set up yet' : 'Les notifications ne sont pas encore activées')}
          </Body>
          <Muted style={{ fontSize: 13, lineHeight: 18 }}>
            {granted
              ? (en ? 'Your iPhone will show a banner for the categories below.' : 'Votre iPhone affichera une bannière pour les catégories ci-dessous.')
              : denied
                ? (en ? 'DEVISERA cannot re-enable them from here — only iOS Settings can.' : 'DEVISERA ne peut pas les réactiver d’ici : cela se passe dans les Réglages d’iOS.')
                : (en ? 'Allow them to be told when a client opens or answers a quote.' : 'Autorisez-les pour savoir quand un client ouvre ou répond à un devis.')}
          </Muted>
        </View>
      </View>

      {denied ? (
        <Button
          title={en ? 'Open Settings' : 'Ouvrir les réglages'}
          variant="secondary"
          icon="open-outline"
          onPress={() => void Linking.openSettings().catch(() => undefined)}
        />
      ) : granted ? null : (
        <Button title={en ? 'Allow notifications' : 'Autoriser les notifications'} icon="notifications-outline" haptic onPress={onRequest} />
      )}
    </Card>
  );
}

export default function NotificationsScreen() {
  // Re-rendu à chaque bascule d'apparence, sans démontage : la navigation
  // et la position de défilement survivent au changement de thème.
  useThemeScheme();
  const en = useMobileLocale() === 'en';
  const { toast } = useToast();
  const permission = usePermission();
  const query = useQuery<{ categories: Record<NotificationCategory, boolean> }>(
    () => api.notifications.preferences(),
    [],
    'notification-preferences',
  );
  const [pending, setPending] = React.useState<NotificationCategory | null>(null);
  const categories = query.data?.categories;

  async function toggle(category: NotificationCategory, value: boolean) {
    if (!categories) return;
    setPending(category);
    // Bascule optimiste : un interrupteur qui attend le réseau pour bouger
    // donne l'impression d'être cassé.
    query.setData({ categories: { ...categories, [category]: value } });
    void Haptics.selectionAsync().catch(() => undefined);
    try {
      const updated = await api.notifications.updatePreferences({ [category]: value });
      query.setData(updated);
    } catch (cause) {
      query.setData({ categories });
      toast({ title: cause instanceof Error ? cause.message : (en ? 'It could not be saved.' : 'Cela n’a pas pu être enregistré.') });
    } finally {
      setPending(null);
    }
  }

  return (
    <Screen>
      {permission.status ? (
        <PermissionCard status={permission.status} en={en} onRequest={() => void permission.request()} />
      ) : (
        <Card><Skeleton height={42} /></Card>
      )}

      <View style={{ gap: spacing.sm }}>
        <Caption upper style={{ color: colors.muted, paddingHorizontal: 4 }}>
          {en ? 'What you want to be told about' : 'Ce dont vous voulez être prévenu'}
        </Caption>

        {query.loading && !categories ? (
          <Card style={{ gap: spacing.lg }}>
            {[0, 1, 2].map((key) => <Skeleton key={key} height={18} />)}
          </Card>
        ) : !categories ? (
          <ErrorState
            description={query.error ?? (en ? 'Your preferences could not be loaded.' : 'Vos préférences n’ont pas pu être chargées.')}
            onRetry={() => void query.reload()}
          />
        ) : (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {NOTIFICATION_CATEGORIES.map((category, index) => {
              const label = NOTIFICATION_CATEGORY_LABELS[category];
              return (
                <View
                  key={category}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    paddingVertical: spacing.md,
                    paddingHorizontal: spacing.lg,
                    minHeight: 64,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: colors.line,
                  }}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Body style={{ fontWeight: '600' }}>{en ? label.title.en : label.title.fr}</Body>
                    <Muted style={{ fontSize: 13, lineHeight: 18 }}>{en ? label.body.en : label.body.fr}</Muted>
                  </View>
                  <Switch
                    accessibilityLabel={en ? label.title.en : label.title.fr}
                    value={categories[category]}
                    disabled={pending === category}
                    onValueChange={(value) => void toggle(category, value)}
                    trackColor={{ false: colors.lineStrong, true: colors.accent }}
                    thumbColor={colors.white}
                  />
                </View>
              );
            })}
          </Card>
        )}

        <Caption style={{ color: colors.subtle, paddingHorizontal: 4, lineHeight: 17 }}>
          {en
            ? 'Turning a category off stops the banner on your iPhone. What happened is still recorded in your activity.'
            : 'Couper une catégorie arrête la bannière sur votre iPhone. Ce qui s’est passé reste consigné dans votre activité.'}
        </Caption>
      </View>

      {permission.status === 'granted' ? null : (
        <Caption style={{ color: colors.subtle, paddingHorizontal: 4, lineHeight: 17 }}>
          {en
            ? 'These preferences are saved, and will take effect as soon as iOS allows notifications.'
            : 'Ces préférences sont enregistrées ; elles prendront effet dès qu’iOS autorisera les notifications.'}
        </Caption>
      )}

    </Screen>
  );
}
