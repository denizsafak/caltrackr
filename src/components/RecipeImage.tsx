import { Image, ImageProps } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { getFoodImageForRecipe } from '@/services/food-images';
import { colors } from '@/constants/theme';

interface RecipeImageProps extends Omit<ImageProps, 'source'> {
  title: string;
  fallbackUrl?: string;
}

export function RecipeImage({ title, fallbackUrl, style, ...props }: RecipeImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(fallbackUrl || null);

  useEffect(() => {
    let cancelled = false;

    if (fallbackUrl) {
      setImageUrl(fallbackUrl);
      return;
    }

    getFoodImageForRecipe(title).then((fetchedUrl) => {
      if (!cancelled && fetchedUrl) {
        setImageUrl(fetchedUrl);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [title, fallbackUrl]);

  if (!imageUrl) {
    return (
      <View style={[styles.placeholder, style]}>
        <Text style={styles.placeholderText}>{title.charAt(0)}</Text>
      </View>
    );
  }

  return <Image source={{ uri: imageUrl }} style={style} cachePolicy="memory-disk" contentFit="cover" {...props} />;
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.muted,
    fontSize: 24,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});
