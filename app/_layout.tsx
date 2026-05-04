import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Ionicons } from '@expo/vector-icons';
import { LoadingScreen } from '@/components/LoadingScreen';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '@/stores/auth';
import { Colors } from '@/constants/theme';

if (Platform.OS === 'web') {
  const warn = console.warn;
  console.warn = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('props.pointerEvents is deprecated')) return;
    warn(...args);
  };

  const error = console.error;
  console.error = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Blocked aria-hidden')) return;
    error(...args);
  };
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    ...Ionicons.font,
  });

  const { user, isLoading, initialize } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    try {
      SplashScreen.preventAutoHideAsync();
    } catch (e) {}
    const unsubscribe = initialize();
    return unsubscribe;
  }, [initialize]);

  useEffect(() => {
    if (fontsLoaded && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isLoading]);

  useEffect(() => {
    if (!fontsLoaded || isLoading) return;
    const inAuth = segments[0] === '(auth)';

    if (!user) {
      if (!inAuth) router.replace('/(auth)/login');
    } else if (!user.onboardingComplete) {
      router.replace('/(auth)/onboarding');
    } else {
      if (inAuth) router.replace('/(tabs)');
    }
  }, [user, isLoading, fontsLoaded, segments, router]);

  if (!fontsLoaded || isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <StatusBar style="dark" backgroundColor={Colors.background} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="recipe/[id]"
          options={{ presentation: 'card', headerShown: false, animation: 'slide_from_right' }}
        />
      </Stack>
    </>
  );
}
