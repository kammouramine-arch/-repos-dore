import * as React from 'react';
import { Modal, Platform, Pressable, StatusBar, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import { activeScheme, colors, radius, shadows, spacing } from '@/theme';
import {
  VIEWBOX_HEIGHT,
  VIEWBOX_WIDTH,
  isSignature,
  joinPaths,
  pathFrom,
  type Point,
} from '@/lib/signature-geometry';

/**
 * Signature au doigt, sur une feuille plein écran.
 *
 * Le client signe sur l'iPhone de l'artisan, sur le chantier, sans rien
 * installer. Trois choses rendaient l'ancien cadre inutilisable pour ça : il
 * mesurait deux cents points de haut au milieu d'une vue défilante — le
 * défilement volait le geste dès qu'on partait vers le bas —, il reliait les
 * points par des segments droits, ce qui donnait une écriture en zigzag, et
 * une fois raté il fallait tout effacer.
 *
 * Ici : une feuille qui prend tout l'écran, un trait lissé, un retour en
 * arrière trait par trait, et une validation qui refuse ce qui n'est
 * visiblement pas une signature.
 *
 * ## Le repère
 *
 * Le tracé est enregistré comme chemin vectoriel dans un repère fixe de
 * 1000 × 400 : il reste net à l'impression, là où une capture d'écran
 * baverait, et une signature faite sur un iPhone SE se superpose exactement à
 * la même faite sur un Pro Max.
 *
 * La mise à l'échelle est **uniforme** et centrée. L'ancienne version
 * divisait x et y par des facteurs différents : une signature tracée dans un
 * cadre plus haut que 5:2 ressortait écrasée sur le PDF, et personne ne
 * reconnaissait la sienne.
 */

/**
 * La surface de tracé.
 *
 * Les gestes passent par les propriétés de réponse tactile de la vue : ce
 * sont de simples gestionnaires d'événements, reconstruits à chaque rendu
 * sans conséquence, là où un `PanResponder` recréé couperait le trait en
 * cours. Le trait courant vit dans une référence — la reconnaissance émet
 * des dizaines de points par seconde, et un rendu par point saccaderait.
 */
function Canvas({
  strokes,
  current,
  onStart,
  onMove,
  onEnd,
  onMeasure,
  box,
  en,
}: {
  strokes: Point[][];
  current: Point[];
  onStart: (event: { x: number; y: number }) => void;
  onMove: (event: { x: number; y: number }) => void;
  onEnd: () => void;
  onMeasure: (event: LayoutChangeEvent) => void;
  box: { width: number; height: number; offsetX: number; offsetY: number; scale: number } | null;
  en: boolean;
}) {
  const empty = strokes.length === 0 && current.length < 2;

  return (
    <View
      onLayout={onMeasure}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      // Le défilement d'un parent ne doit jamais reprendre le geste en cours.
      onStartShouldSetResponderCapture={() => true}
      onMoveShouldSetResponderCapture={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(event) => onStart({ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY })}
      onResponderMove={(event) => onMove({ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY })}
      onResponderRelease={onEnd}
      onResponderTerminate={onEnd}
      accessible
      accessibilityRole="image"
      accessibilityLabel={en ? 'Signature area. Draw your signature with your finger.' : 'Zone de signature. Tracez votre signature avec le doigt.'}
      accessibilityHint={en ? 'Double tap and drag to sign.' : 'Touchez et faites glisser pour signer.'}
      style={{
        flex: 1,
        borderRadius: radius.lg,
        backgroundColor: colors.canvas,
        borderWidth: 1.5,
        borderColor: empty ? colors.line : colors.accentBorder,
        overflow: 'hidden',
        justifyContent: 'center',
      }}
    >
      {box ? (
        <Svg
          pointerEvents="none"
          style={{ position: 'absolute', left: box.offsetX, top: box.offsetY }}
          width={VIEWBOX_WIDTH * box.scale}
          height={VIEWBOX_HEIGHT * box.scale}
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        >
          {/* La ligne de signature d'un document, avec sa croix à gauche. */}
          <Line x1={60} y1={318} x2={940} y2={318} stroke={colors.line} strokeWidth={3} />
          <Line x1={32} y1={306} x2={50} y2={324} stroke={colors.subtle} strokeWidth={3} strokeLinecap="round" />
          <Line x1={50} y1={306} x2={32} y2={324} stroke={colors.subtle} strokeWidth={3} strokeLinecap="round" />
          {[...strokes, current].map((stroke, index) =>
            stroke.length > 1 ? (
              <Path
                key={index}
                d={pathFrom(stroke)}
                stroke={colors.ink}
                strokeWidth={6}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ) : null,
          )}
        </Svg>
      ) : null}

      {empty ? (
        <Text
          pointerEvents="none"
          style={{ position: 'absolute', alignSelf: 'center', top: '38%', fontSize: 16, color: colors.subtle }}
        >
          {en ? 'Sign here with your finger' : 'Signez ici avec votre doigt'}
        </Text>
      ) : null}
    </View>
  );
}

function ToolButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={() => {
        void Haptics.selectionAsync().catch(() => undefined);
        onPress();
      }}
      hitSlop={6}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        minHeight: 44,
        paddingHorizontal: spacing.md,
        borderRadius: radius.full,
        opacity: disabled ? 0.35 : pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name={icon} size={18} color={colors.accent} />
      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.accent }}>{label}</Text>
    </Pressable>
  );
}

/**
 * La feuille de signature.
 *
 * Elle se ferme de trois façons : Annuler (rien n'est retenu), Valider (le
 * tracé remonte), ou le geste système. Tant que le tracé n'est pas une
 * signature, Valider reste inactif : on ne veut pas d'un devis accepté par
 * une paume posée sur l'écran.
 */
export function SignatureSheet({
  visible,
  en,
  signerName,
  purpose = 'client',
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  en: boolean;
  signerName: string;
  /**
   * Qui signe.
   *
   * `client` : l'acceptation d'un devis, sur le chantier. `business` : la
   * signature de l'entreprise, tracée une fois par l'artisan pour ses propres
   * documents. La consigne « tendez le téléphone à votre client » n'a aucun
   * sens dans le second cas — et c'est très exactement ce qu'elle disait.
   */
  purpose?: 'client' | 'business';
  onCancel: () => void;
  onConfirm: (strokePath: string) => void;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'fullScreen' : undefined}
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      {/*
        La feuille n'est montée que pendant qu'elle est visible.

        C'est ce qui garantit la feuille blanche : la signature du client
        précédent ne peut pas réapparaître sous le doigt du suivant, et il n'y
        a aucun effet de remise à zéro à écrire — donc rien qui puisse
        déclencher un rendu en cascade à chaque ouverture.
      */}
      {visible ? <SignatureSheetBody en={en} signerName={signerName} purpose={purpose} onCancel={onCancel} onConfirm={onConfirm} /> : null}
    </Modal>
  );
}

function SignatureSheetBody({
  en,
  signerName,
  purpose,
  onCancel,
  onConfirm,
}: {
  en: boolean;
  signerName: string;
  purpose: 'client' | 'business';
  onCancel: () => void;
  onConfirm: (strokePath: string) => void;
}) {
  const [strokes, setStrokes] = React.useState<Point[][]>([]);
  const [current, setCurrent] = React.useState<Point[]>([]);
  const size = React.useRef({ width: 1, height: 1 });
  const [box, setBox] = React.useState<{ width: number; height: number; offsetX: number; offsetY: number; scale: number } | null>(null);
  const drawing = React.useRef<Point[]>([]);

  const measure = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    size.current = { width, height };
    // Échelle unique pour les deux axes, et boîte centrée : le tracé garde ses
    // proportions du doigt jusqu'au PDF.
    const scale = Math.min(width / VIEWBOX_WIDTH, height / VIEWBOX_HEIGHT);
    setBox({
      width,
      height,
      scale,
      offsetX: (width - VIEWBOX_WIDTH * scale) / 2,
      offsetY: (height - VIEWBOX_HEIGHT * scale) / 2,
    });
  };

  const toViewBox = React.useCallback((x: number, y: number): Point => {
    if (!box || box.scale <= 0) return { x: 0, y: 0 };
    return {
      x: Math.max(0, Math.min(VIEWBOX_WIDTH, (x - box.offsetX) / box.scale)),
      y: Math.max(0, Math.min(VIEWBOX_HEIGHT, (y - box.offsetY) / box.scale)),
    };
  }, [box]);

  const start = (event: { x: number; y: number }) => {
    drawing.current = [toViewBox(event.x, event.y)];
    setCurrent(drawing.current);
  };
  const move = (event: { x: number; y: number }) => {
    drawing.current = [...drawing.current, toViewBox(event.x, event.y)];
    setCurrent(drawing.current);
  };
  const end = () => {
    if (drawing.current.length > 1) {
      const stroke = drawing.current;
      setStrokes((all) => [...all, stroke]);
      void Haptics.selectionAsync().catch(() => undefined);
    }
    drawing.current = [];
    setCurrent([]);
  };

  const undo = () => setStrokes((all) => all.slice(0, -1));
  const clear = () => {
    setStrokes([]);
    setCurrent([]);
    drawing.current = [];
  };

  const valid = isSignature(strokes);

  return (
    <>
      {/* La feuille couvre l'écran : la barre d'état doit suivre le thème,
          sinon ses icônes disparaissent sur le fond de la nuit. */}
      <StatusBar barStyle={activeScheme() === 'dark' ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
        <View style={{ flex: 1, padding: spacing.lg, gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={en ? 'Cancel signing' : 'Annuler la signature'}
              onPress={onCancel}
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, minHeight: 44, justifyContent: 'center' })}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.accent }}>
                {en ? 'Cancel' : 'Annuler'}
              </Text>
            </Pressable>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>
                {en ? 'Signature' : 'Signature'}
              </Text>
              {signerName ? (
                <Text numberOfLines={1} style={{ fontSize: 13, color: colors.muted, maxWidth: 200 }}>
                  {signerName}
                </Text>
              ) : null}
            </View>
            {/* Largeur symétrique pour que le titre reste centré. */}
            <View style={{ width: 62 }} />
          </View>

          <Text style={{ fontSize: 14.5, lineHeight: 20, color: colors.muted, textAlign: 'center' }}>
            {purpose === 'business'
              ? en
                ? 'Sign above the line, as you would on paper. Drawn once, it goes on every document you issue.'
                : 'Signez au-dessus de la ligne, comme sur papier. Tracée une fois, elle figure sur chaque document que vous émettez.'
              : en
                ? 'Hand the phone to your client. They sign above the line.'
                : 'Tendez le téléphone à votre client. Il signe au-dessus de la ligne.'}
          </Text>

          <Canvas
            strokes={strokes}
            current={current}
            onStart={start}
            onMove={move}
            onEnd={end}
            onMeasure={measure}
            box={box}
            en={en}
          />

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.lg, minHeight: 44 }}>
            <ToolButton
              icon="arrow-undo-outline"
              label={en ? 'Undo' : 'Annuler le trait'}
              disabled={strokes.length === 0}
              onPress={undo}
            />
            <ToolButton
              icon="trash-outline"
              label={en ? 'Clear' : 'Tout effacer'}
              disabled={strokes.length === 0}
              onPress={clear}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={en ? 'Confirm signature' : 'Valider la signature'}
            accessibilityState={{ disabled: !valid }}
            accessibilityHint={valid ? undefined : (en ? 'Draw a signature first.' : 'Tracez d’abord une signature.')}
            disabled={!valid}
            onPress={() => {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
              onConfirm(joinPaths(strokes));
            }}
            style={({ pressed }) => ({
              minHeight: 54,
              borderRadius: radius.lg,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: valid ? (pressed ? colors.accentHover : colors.accent) : colors.surface2,
              ...(valid ? shadows.card : {}),
            })}
          >
            <Text style={{ fontSize: 16.5, fontWeight: '700', color: valid ? colors.white : colors.subtle }}>
              {en ? 'Confirm signature' : 'Valider la signature'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </>
  );
}
