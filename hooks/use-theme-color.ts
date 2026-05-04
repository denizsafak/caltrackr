import { Colors } from '@/constants/theme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors
) {
  const colorFromProps = props.light;
  if (colorFromProps) return colorFromProps;
  return Colors[colorName] as string;
}
