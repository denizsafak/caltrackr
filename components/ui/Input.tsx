import { useState } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Radius, Spacing } from '@/constants/theme';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputRow, focused && styles.inputFocused, error && styles.inputError]}>
        {leftIcon && (
          <Ionicons name={leftIcon} size={18} color={focused ? Colors.primary : Colors.onSurfaceVariant} style={styles.leftIcon} />
        )}
        <TextInput
          {...props}
          style={styles.input}
          placeholderTextColor={Colors.outlineVariant}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon}>
            <Ionicons name={rightIcon} size={18} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  label: {
    ...Typography.labelMd,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceHighest,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputFocused: {
    backgroundColor: Colors.surfaceLowest,
    borderColor: Colors.primary + '33',
  },
  inputError: {
    borderColor: Colors.error + '66',
  },
  leftIcon: {
    marginRight: Spacing.sm,
  },
  rightIcon: {
    padding: Spacing.xs,
  },
  input: {
    flex: 1,
    ...Typography.bodyLg,
    color: Colors.onSurface,
    paddingVertical: 14,
  },
  error: {
    ...Typography.labelMd,
    color: Colors.error,
  },
});
