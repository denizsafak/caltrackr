import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'elevated' | 'flat' | 'tinted';
  padding?: number;
}

export function Card({ children, style, variant = 'elevated', padding = Spacing.lg }: CardProps) {
  return (
    <View
      style={[
        styles.base,
        variant === 'elevated' && styles.elevated,
        variant === 'flat' && styles.flat,
        variant === 'tinted' && styles.tinted,
        { padding },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
  },
  elevated: {
    backgroundColor: Colors.surfaceLowest,
    ...Shadow.card,
  },
  flat: {
    backgroundColor: Colors.surfaceLow,
  },
  tinted: {
    backgroundColor: Colors.secondaryContainer + '40',
  },
});
