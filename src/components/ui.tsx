import { Link, usePathname } from 'expo-router';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  ChefHat,
  Home,
  LucideIcon,
  Plus,
  Settings,
  ShoppingBasket,
  Utensils,
  User,
} from 'lucide-react-native';
import { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, formatCalories, layout, radii, shadow, spacing } from '@/constants/theme';
import { MacroTotals } from '@/types/domain';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = PropsWithChildren<{
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: LucideIcon;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export function Button({ children, onPress, variant = 'primary', icon: Icon, disabled, style }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      {Icon ? <Icon size={18} color={variant === 'primary' ? colors.white : colors.primary} /> : null}
      <Text style={[styles.buttonText, variant === 'primary' ? styles.buttonTextPrimary : styles.buttonTextSecondary]}>{children}</Text>
    </Pressable>
  );
}

export function IconButton({ icon: Icon, onPress }: { icon: LucideIcon; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      <Icon size={20} color={colors.muted} />
    </Pressable>
  );
}

export function Card({ children, tone = 'card', style }: PropsWithChildren<{ tone?: 'card' | 'low' | 'soft' | 'primary'; style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, styles[`card_${tone}`], style]}>{children}</View>;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.pageHeader}>
      <View style={styles.pageHeaderCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.pageTitle}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action ? <View style={styles.pageHeaderAction}>{action}</View> : null}
    </View>
  );
}

export function Metric({ label, value, unit, tone = 'default' }: { label: string; value: string | number; unit?: string; tone?: 'default' | 'primary' }) {
  return (
    <Card tone={tone === 'primary' ? 'soft' : 'low'} style={styles.metric}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.metricValueRow}>
        <Text style={[styles.metricValue, tone === 'primary' && styles.primaryText]}>{value}</Text>
        {unit ? <Text style={styles.metricUnit}>{unit}</Text> : null}
      </View>
    </Card>
  );
}

export function ProgressBar({ value, color = colors.primary }: { value: number; color?: string }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }]} />
    </View>
  );
}

export function MacroBars({ totals, targets }: { totals: MacroTotals; targets: MacroTotals }) {
  return (
    <View style={styles.macroGrid}>
      <MacroBar label="Protein" value={totals.protein} target={targets.protein} color={colors.secondarySoft} />
      <MacroBar label="Carbs" value={totals.carbs} target={targets.carbs} color={colors.primarySoft} />
      <MacroBar label="Fats" value={totals.fats} target={targets.fats} color={colors.warningSoft} />
    </View>
  );
}

function MacroBar({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  return (
    <View style={styles.macroItem}>
      <Text style={styles.label}>{label}</Text>
      <ProgressBar value={(value / Math.max(target, 1)) * 100} color={color} />
      <Text style={styles.microcopy}>
        {Math.round(value)}/{target}g
      </Text>
    </View>
  );
}

type FieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

export function Field({ label, style, inputStyle, ...props }: FieldProps) {
  return (
    <View style={[styles.fieldWrap, style]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.muted} style={[styles.input, inputStyle]} {...props} />
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionTitleText}>{title}</Text>
      {action}
    </View>
  );
}

export function LoadingState() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/planner', label: 'Planner', icon: CalendarDays },
  { href: '/tracker', label: 'Track', icon: Plus },
  { href: '/recipes', label: 'Recipes', icon: ChefHat },
  { href: '/shopping', label: 'List', icon: ShoppingBasket },
  { href: '/profile', label: 'Profile', icon: User },
];

export function AppShell({ children, scroll = true }: PropsWithChildren<{ scroll?: boolean }>) {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const content = (
    <View style={[styles.content, isWide && styles.contentWide]}>
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <View style={styles.brandIcon}>
            <Utensils size={20} color={colors.primary} />
          </View>
          <Text style={styles.brandText}>CalTrackr</Text>
        </View>
        <View style={styles.topActions}>
          <IconButton icon={Bell} />
          <Link href="/profile" asChild>
            <Pressable style={styles.settingsButton}>
              <Settings size={20} color={colors.primary} />
            </Pressable>
          </Link>
        </View>
      </View>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.shell}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
      <View style={styles.navWrap}>
        <View style={styles.nav}>
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href as never} asChild>
                <Pressable style={StyleSheet.flatten([styles.navItem, active && styles.navItemActive])}>
                  <Icon size={20} color={active ? colors.primary : colors.muted} />
                  <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
                </Pressable>
              </Link>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

export function TotalLine({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.totalLine}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.totalValue}>{formatCalories(value)}</Text>
    </View>
  );
}

export function LinkButton({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href as never} asChild>
      <Pressable style={styles.linkButton}>
        <Text style={styles.linkButtonText}>{label}</Text>
        <ArrowRight size={16} color={colors.primary} />
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: layout.navHeight + spacing.xl,
  },
  content: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.xl,
  },
  contentWide: {
    maxWidth: layout.maxWidth,
    paddingHorizontal: spacing.xl,
  },
  topBar: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceLow,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    color: colors.primary,
    fontFamily: fonts.extraBold,
    fontSize: 20,
    letterSpacing: 0,
  },
  topActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  pageHeaderCopy: {
    flex: 1,
    minWidth: 260,
    gap: spacing.xs,
  },
  pageHeaderAction: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  eyebrow: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  pageTitle: {
    color: colors.text,
    fontFamily: fonts.extraBold,
    fontSize: 44,
    lineHeight: 50,
    letterSpacing: 0,
  },
  subtitle: {
    maxWidth: 620,
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  card_card: {
    backgroundColor: colors.card,
    ...shadow,
  },
  card_low: {
    backgroundColor: colors.surfaceLow,
  },
  card_soft: {
    backgroundColor: colors.secondarySoft,
  },
  card_primary: {
    backgroundColor: colors.primary,
  },
  button: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  button_primary: {
    backgroundColor: colors.primary,
  },
  button_secondary: {
    backgroundColor: colors.surfaceHigh,
  },
  button_ghost: {
    backgroundColor: 'transparent',
  },
  button_danger: {
    backgroundColor: '#fa746f22',
  },
  buttonText: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  buttonTextPrimary: {
    color: colors.white,
  },
  buttonTextSecondary: {
    color: colors.primary,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
  metric: {
    minHeight: 136,
    justifyContent: 'space-between',
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  metricValue: {
    color: colors.text,
    fontFamily: fonts.extraBold,
    fontSize: 38,
    lineHeight: 44,
  },
  metricUnit: {
    color: colors.muted,
    fontFamily: fonts.semibold,
  },
  primaryText: {
    color: colors.primary,
  },
  label: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  microcopy: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  progressTrack: {
    height: 10,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.full,
  },
  macroGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  macroItem: {
    flex: 1,
    minWidth: 120,
    gap: spacing.sm,
  },
  fieldWrap: {
    gap: spacing.sm,
  },
  input: {
    minHeight: 48,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceHighest,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceHigh,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  chipTextActive: {
    color: colors.white,
  },
  sectionTitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  sectionTitleText: {
    color: colors.text,
    fontFamily: fonts.extraBold,
    fontSize: 24,
    letterSpacing: 0,
  },
  loading: {
    minHeight: 260,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navWrap: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    alignItems: 'center',
  },
  nav: {
    width: '100%',
    maxWidth: 720,
    minHeight: 66,
    borderRadius: radii.lg,
    padding: spacing.sm,
    backgroundColor: '#f1f4f5ee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    ...shadow,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    paddingVertical: spacing.xs,
    gap: 2,
  },
  navItemActive: {
    backgroundColor: '#92f7c333',
  },
  navLabel: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  navLabelActive: {
    color: colors.primary,
  },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalValue: {
    color: colors.text,
    fontFamily: fonts.extraBold,
    fontSize: 16,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  linkButtonText: {
    color: colors.primary,
    fontFamily: fonts.bold,
  },
});
