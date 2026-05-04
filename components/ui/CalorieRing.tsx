import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors, Typography } from '@/constants/theme';

interface CalorieRingProps {
  consumed: number;
  goal: number;
  size?: number;
}

export function CalorieRing({ consumed, goal, size = 160 }: CalorieRingProps) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(consumed / (goal || 1), 1);
  const exceeded = consumed > goal;
  const strokeDashoffset = circumference * (1 - progress);
  const remaining = Math.max(goal - consumed, 0);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.surfaceHigh}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={exceeded ? Colors.tertiary : Colors.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2},${size / 2}`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={styles.remaining}>{remaining}</Text>
        <Text style={styles.label}>remaining</Text>
        <Text style={styles.unit}>kcal</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
  },
  remaining: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    color: Colors.onSurface,
    lineHeight: 36,
  },
  label: {
    ...Typography.labelMd,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  unit: {
    ...Typography.labelSm,
    color: Colors.outlineVariant,
  },
});
