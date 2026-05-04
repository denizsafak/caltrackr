import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Typography, Radius, Spacing } from '@/constants/theme';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export function Badge({ label, variant = 'neutral', style }: BadgeProps) {
  return (
    <View style={[styles.base, styles[variant], style]}>
      <Text style={[styles.text, textStyles[variant]]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.full,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    alignSelf: 'flex-start',
  },
  primary: { backgroundColor: Colors.primary },
  success: { backgroundColor: Colors.secondaryContainer },
  warning: { backgroundColor: Colors.tertiaryContainer + '33' },
  neutral: { backgroundColor: Colors.surfaceHigh },
  text: {
    ...Typography.labelSm,
    letterSpacing: 0.6,
  },
});

const textStyles = StyleSheet.create({
  primary: { color: Colors.onPrimary },
  success: { color: Colors.secondary },
  warning: { color: Colors.tertiary },
  neutral: { color: Colors.onSurfaceVariant },
});
