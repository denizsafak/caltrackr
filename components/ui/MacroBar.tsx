import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Radius, Spacing } from '@/constants/theme';

interface MacroBarProps {
  protein: number;
  carbs: number;
  fat: number;
  proteinGoal?: number;
  carbsGoal?: number;
  fatGoal?: number;
  compact?: boolean;
}

export function MacroBar({ protein, carbs, fat, proteinGoal, carbsGoal, fatGoal, compact }: MacroBarProps) {
  const total = protein + carbs + fat || 1;
  const proteinPct = protein / total;
  const carbsPct = carbs / total;
  const fatPct = fat / total;

  if (compact) {
    return (
      <View style={styles.barOnly}>
        <View style={[styles.segment, { flex: proteinPct, backgroundColor: Colors.primary }]} />
        <View style={[styles.segment, { flex: carbsPct, backgroundColor: Colors.secondaryContainer }]} />
        <View style={[styles.segment, { flex: fatPct, backgroundColor: Colors.tertiary }]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MacroItem label="Protein" value={protein} goal={proteinGoal} color={Colors.primary} />
      <MacroItem label="Carbs" value={carbs} goal={carbsGoal} color={Colors.secondaryContainer} />
      <MacroItem label="Fats" value={fat} goal={fatGoal} color={Colors.tertiary} />
    </View>
  );
}

interface MacroItemProps {
  label: string;
  value: number;
  goal?: number;
  color: string;
}

function MacroItem({ label, value, goal, color }: MacroItemProps) {
  const progress = goal ? Math.min(value / goal, 1) : 0;

  return (
    <View style={styles.macroItem}>
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroValue}>
        {value}
        <Text style={styles.macroUnit}>g</Text>
      </Text>
      {goal !== undefined && (
        <>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: color }]} />
          </View>
          <Text style={styles.macroGoal}>{goal}g</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  macroItem: {
    flex: 1,
    gap: 4,
  },
  macroLabel: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  macroValue: {
    ...Typography.headlineSm,
    color: Colors.onSurface,
  },
  macroUnit: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  track: {
    height: 4,
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  macroGoal: {
    ...Typography.labelSm,
    color: Colors.outlineVariant,
  },
  barOnly: {
    flexDirection: 'row',
    height: 4,
    borderRadius: Radius.full,
    overflow: 'hidden',
    gap: 1,
  },
  segment: {
    height: '100%',
  },
});
