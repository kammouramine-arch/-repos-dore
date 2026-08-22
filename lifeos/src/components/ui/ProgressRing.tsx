import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/theme';
import { Text } from './Text';

/** Circular progress used for the daily and life-progress indicators. */
export function ProgressRing({
  progress,
  size = 72,
  thickness = 7,
  color,
  label,
  caption,
}: {
  progress: number;
  size?: number;
  thickness?: number;
  color?: string;
  label?: string;
  caption?: string;
}) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const stroke = color ?? theme.colors.accent;

  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessibilityRole="progressbar"
      accessibilityValue={{ now: clamped, min: 0, max: 100 }}
      accessibilityLabel={caption ? `${caption}: ${clamped}%` : `${clamped}%`}
    >
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.surfaceSunken}
          strokeWidth={thickness}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={stroke}
          strokeWidth={thickness}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text variant={size > 60 ? 'title3' : 'caption'}>{label ?? `${clamped}%`}</Text>
    </View>
  );
}

/** Horizontal progress bar used inside goal, project and area rows. */
export function ProgressBar({
  progress,
  color,
  height = 6,
}: {
  progress: number;
  color?: string;
  height?: number;
}) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(100, progress));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ now: Math.round(clamped), min: 0, max: 100 }}
      style={{
        height,
        borderRadius: height,
        backgroundColor: theme.colors.surfaceSunken,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${clamped}%`,
          height: '100%',
          borderRadius: height,
          backgroundColor: color ?? theme.colors.accent,
        }}
      />
    </View>
  );
}
