import * as React from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { colors, radius, spacing } from '@/theme';

/**
 * Cadre de signature au doigt.
 *
 * Le client signe sur l'iPhone de l'artisan, sur le chantier, sans installer
 * quoi que ce soit. Le tracé est enregistré comme un chemin vectoriel : il
 * reste net à l'impression du PDF, là où une capture d'écran baverait.
 *
 * Le chemin est normalisé dans un repère fixe de 1000 × 400 avant d'être
 * envoyé. Sans cela, une signature tracée sur un iPhone SE et la même sur un
 * Pro Max produiraient des coordonnées incomparables, et le rendu PDF
 * dépendrait de l'appareil utilisé ce jour-là.
 */

const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 400;
/** Sous ce nombre de points, il s'agit d'un appui accidentel, pas d'une signature. */
const MIN_POINTS = 8;

type Point = { x: number; y: number };

function pathFrom(strokes: Point[][]): string {
  return strokes
    .filter((stroke) => stroke.length > 1)
    .map((stroke) =>
      stroke
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
        .join(' '),
    )
    .join(' ');
}

export function SignaturePad({
  onChange,
  en,
  disabled,
}: {
  onChange: (path: string | null) => void;
  en: boolean;
  disabled?: boolean;
}) {
  const [strokes, setStrokes] = React.useState<Point[][]>([]);
  const size = React.useRef({ width: 1, height: 1 });
  // Le tracé en cours vit dans une référence : PanResponder émet des dizaines
  // d'événements par seconde et un rendu par point saccaderait le trait.
  const current = React.useRef<Point[]>([]);
  const committed = React.useRef<Point[][]>([]);

  const toViewBox = React.useCallback((x: number, y: number): Point => {
    const { width, height } = size.current;
    return {
      x: Math.max(0, Math.min(VIEWBOX_WIDTH, (x / width) * VIEWBOX_WIDTH)),
      y: Math.max(0, Math.min(VIEWBOX_HEIGHT, (y / height) * VIEWBOX_HEIGHT)),
    };
  }, []);

  const publish = React.useCallback(() => {
    const all = [...committed.current, current.current].filter((s) => s.length > 1);
    const points = all.reduce((acc, stroke) => acc + stroke.length, 0);
    onChange(points >= MIN_POINTS ? pathFrom(all) : null);
  }, [onChange]);

  // Gestionnaire d'événement ordinaire : il s'exécute à l'appui, pas au rendu,
  // et n'a donc pas à être mémoïsé.
  function clear() {
    void Haptics.selectionAsync().catch(() => undefined);
    committed.current = [];
    current.current = [];
    setStrokes([]);
    onChange(null);
  }

  const empty = strokes.every((stroke) => stroke.length < 2);

  return (
    <View style={{ gap: spacing.sm }}>
      {/*
        Les gestes passent par les propriétés de réponse tactile de la vue.
        Elles sont de simples gestionnaires d'événements : pas de
        reconstruction à chaque rendu, donc pas de trait coupé en cours de
        signature, et rien qui lise une référence pendant le rendu.
      */}
      <View
        onStartShouldSetResponder={() => !disabled}
        onMoveShouldSetResponder={() => !disabled}
        onResponderGrant={(event) => {
          if (disabled) return;
          current.current = [toViewBox(event.nativeEvent.locationX, event.nativeEvent.locationY)];
        }}
        onResponderMove={(event) => {
          if (disabled) return;
          current.current = [
            ...current.current,
            toViewBox(event.nativeEvent.locationX, event.nativeEvent.locationY),
          ];
          setStrokes([...committed.current, current.current]);
        }}
        onResponderRelease={() => {
          if (disabled) return;
          if (current.current.length > 1) committed.current = [...committed.current, current.current];
          current.current = [];
          setStrokes([...committed.current]);
          publish();
        }}
        onLayout={(event) => {
          size.current = {
            width: event.nativeEvent.layout.width,
            height: event.nativeEvent.layout.height,
          };
        }}
        accessibilityLabel={en ? 'Signature area' : 'Cadre de signature'}
        style={{
          height: 200,
          borderRadius: radius.lg,
          backgroundColor: colors.surface,
          borderWidth: 1.5,
          borderColor: empty ? colors.line : colors.accent,
          overflow: 'hidden',
          justifyContent: 'center',
        }}
      >
        <Svg width="100%" height="100%" viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}>
          {strokes.map((stroke, index) =>
            stroke.length > 1 ? (
              <Path
                key={index}
                d={pathFrom([stroke])}
                stroke={colors.ink}
                strokeWidth={5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ) : null,
          )}
        </Svg>
        {empty ? (
          <Text
            pointerEvents="none"
            style={{
              position: 'absolute',
              alignSelf: 'center',
              fontSize: 15,
              color: colors.subtle,
            }}
          >
            {en ? 'Sign here with your finger' : 'Signez ici avec votre doigt'}
          </Text>
        ) : null}
      </View>

      {!empty ? (
        <Pressable accessibilityRole="button" onPress={clear} hitSlop={8} style={{ alignSelf: 'flex-end' }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.accent }}>
            {en ? 'Clear' : 'Effacer'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
