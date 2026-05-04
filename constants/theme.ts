import { Platform } from 'react-native';

export const Colors = {
  primary: '#126c4a',
  primaryDim: '#006040',
  onPrimary: '#e6ffee',
  primaryContainer: '#a1f4c8',
  onPrimaryContainer: '#005e3e',
  secondary: '#006d48',
  secondaryContainer: '#92f7c3',
  onSecondaryContainer: '#005e3e',
  tertiary: '#a73b19',
  tertiaryContainer: '#fa7750',
  background: '#f8f9fa',
  surface: '#f8f9fa',
  surfaceLow: '#f1f4f5',
  surfaceLowest: '#ffffff',
  surfaceHigh: '#e5e9eb',
  surfaceHighest: '#dee3e6',
  surfaceContainer: '#ebeef0',
  onSurface: '#2d3335',
  onSurfaceVariant: '#5a6062',
  outline: '#767c7e',
  outlineVariant: '#adb3b5',
  error: '#a83836',
  errorContainer: '#fa746f',
  success: '#92f7c3',
  warning: '#fa7750',
} as const;

export const Typography = {
  displayLg: { fontSize: 48, letterSpacing: -0.96, fontFamily: 'Inter_700Bold' },
  displayMd: { fontSize: 40, letterSpacing: -0.8, fontFamily: 'Inter_700Bold' },
  headlineLg: { fontSize: 28, letterSpacing: -0.28, fontFamily: 'Inter_700Bold' },
  headlineMd: { fontSize: 24, letterSpacing: -0.24, fontFamily: 'Inter_600SemiBold' },
  headlineSm: { fontSize: 20, letterSpacing: -0.2, fontFamily: 'Inter_600SemiBold' },
  titleLg: { fontSize: 18, letterSpacing: -0.18, fontFamily: 'Inter_600SemiBold' },
  titleMd: { fontSize: 16, letterSpacing: -0.16, fontFamily: 'Inter_500Medium' },
  titleSm: { fontSize: 14, letterSpacing: -0.14, fontFamily: 'Inter_500Medium' },
  bodyLg: { fontSize: 16, lineHeight: 24, fontFamily: 'Inter_400Regular' },
  bodyMd: { fontSize: 14, lineHeight: 22, fontFamily: 'Inter_400Regular' },
  bodySm: { fontSize: 12, lineHeight: 18, fontFamily: 'Inter_400Regular' },
  labelLg: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  labelMd: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  labelSm: { fontSize: 11, fontFamily: 'Inter_400Regular' },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  full: 9999,
} as const;

export const Shadow = {
  card: Platform.select({
    web: {
      boxShadow: '0px 4px 12px rgba(45, 51, 53, 0.06)',
    },
    default: {
      shadowColor: '#2d3335',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
  }),
  modal: Platform.select({
    web: {
      boxShadow: '0px 20px 40px rgba(45, 51, 53, 0.08)',
    },
    default: {
      shadowColor: '#2d3335',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.08,
      shadowRadius: 40,
      elevation: 8,
    },
  }),
} as const;
