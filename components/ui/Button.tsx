import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Radius, Spacing } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'tertiary' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  icon,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.85}
        style={[styles.base, fullWidth && styles.fullWidth, style, isDisabled && styles.disabled]}
      >
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDim]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {loading ? (
            <ActivityIndicator color={Colors.onPrimary} size="small" />
          ) : (
            <>
              {icon}
              <Text style={[styles.primaryText, textStyle]}>{label}</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'secondary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}
        style={[styles.base, styles.secondary, fullWidth && styles.fullWidth, style, isDisabled && styles.disabled]}
      >
        {loading ? (
          <ActivityIndicator color={Colors.onSurface} size="small" />
        ) : (
          <>
            {icon}
            <Text style={[styles.secondaryText, textStyle]}>{label}</Text>
          </>
        )}
      </TouchableOpacity>
    );
  }

  if (variant === 'danger') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}
        style={[styles.base, styles.danger, fullWidth && styles.fullWidth, style, isDisabled && styles.disabled]}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Text style={[styles.dangerText, textStyle]}>{label}</Text>
        )}
      </TouchableOpacity>
    );
  }

  // Tertiary (text only)
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[styles.tertiary, style, isDisabled && styles.disabled]}
    >
      {icon}
      <Text style={[styles.tertiaryText, textStyle]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.full,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  secondary: {
    backgroundColor: Colors.surfaceHigh,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  danger: {
    backgroundColor: Colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  tertiary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  disabled: {
    opacity: 0.5,
  },
  primaryText: {
    ...Typography.titleMd,
    color: Colors.onPrimary,
  },
  secondaryText: {
    ...Typography.titleMd,
    color: Colors.onSurface,
  },
  dangerText: {
    ...Typography.titleMd,
    color: '#ffffff',
  },
  tertiaryText: {
    ...Typography.titleMd,
    color: Colors.primary,
  },
});
