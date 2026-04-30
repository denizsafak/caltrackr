import '@/global.css';

import { Platform } from 'react-native';

export const colors = {
  background: '#f8f9fa',
  surface: '#f8f9fa',
  surfaceLow: '#f1f4f5',
  surfaceContainer: '#ebeef0',
  surfaceHigh: '#e5e9eb',
  surfaceHighest: '#dee3e6',
  card: '#ffffff',
  text: '#2d3335',
  muted: '#5a6062',
  outline: '#adb3b5',
  primary: '#126c4a',
  primaryDim: '#006040',
  primarySoft: '#a1f4c8',
  secondary: '#006d48',
  secondarySoft: '#92f7c3',
  warning: '#a73b19',
  warningSoft: '#fa7750',
  danger: '#a83836',
  white: '#ffffff',
} as const;

export const radii = {
  sm: 14,
  md: 22,
  lg: 32,
  xl: 44,
  full: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const shadow = Platform.select({
  web: {
    boxShadow: '0 20px 40px rgba(45, 51, 53, 0.06)',
  },
  default: {
    shadowColor: '#2d3335',
    shadowOpacity: 0.06,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },
});

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
};

export const layout = {
  maxWidth: 1180,
  navHeight: 92,
};

export const formatCalories = (value: number) => `${Math.round(value).toLocaleString()} kcal`;

export const Colors = {
  light: {
    text: colors.text,
    background: colors.background,
    backgroundElement: colors.surfaceLow,
    backgroundSelected: colors.surfaceHigh,
    textSecondary: colors.muted,
  },
  dark: {
    text: colors.text,
    background: colors.background,
    backgroundElement: colors.surfaceLow,
    backgroundSelected: colors.surfaceHigh,
    textSecondary: colors.muted,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = {
  sans: fonts.regular,
  serif: fonts.regular,
  rounded: fonts.regular,
  mono: Platform.select({ web: 'monospace', default: 'monospace' }),
};

export const Spacing = {
  half: 2,
  one: spacing.xs,
  two: spacing.sm,
  three: spacing.md,
  four: spacing.lg,
  five: spacing.xl,
  six: 64,
} as const;

export const BottomTabInset = 0;
export const MaxContentWidth = layout.maxWidth;
