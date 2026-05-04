import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { signInWithEmail, signInWithGoogle, signInWithGoogleWeb } from '@/services/firebase/auth';
import { useAuthStore } from '@/stores/auth';
import { getUserProfile } from '@/services/firebase/firestore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { setUser } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const isWeb = Platform.OS === 'web';
  useEffect(() => {
    if (!isWeb) {
      GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      });
    }
  }, [isWeb]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      if (isWeb) {
        const { user, isNewUser } = await signInWithGoogleWeb();
        const profile = await getUserProfile(user.uid);
        setUser(profile);
        if (isNewUser || !profile?.onboardingComplete) {
          router.replace('/(auth)/onboarding');
        } else {
          router.replace('/(tabs)');
        }
      } else {
        await GoogleSignin.hasPlayServices();
        const userInfo = await GoogleSignin.signIn();
        if (userInfo.data?.idToken) {
          const { user, isNewUser } = await signInWithGoogle(userInfo.data.idToken);
          const profile = await getUserProfile(user.uid);
          setUser(profile);
          if (isNewUser || !profile?.onboardingComplete) {
            router.replace('/(auth)/onboarding');
          } else {
            router.replace('/(tabs)');
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Google Sign-In Error', err?.message || 'Something went wrong');
    } finally {
      setGoogleLoading(false);
    }
  };

  const validate = () => {
    const errs: typeof errors = {};
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email';
    if (!password) errs.password = 'Password is required';
    else if (password.length < 6) errs.password = 'At least 6 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleEmailLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const fbUser = await signInWithEmail(email.trim(), password);
      const profile = await getUserProfile(fbUser.uid);
      setUser(profile);
      if (!profile?.onboardingComplete) {
        router.replace('/(auth)/onboarding');
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      const msg =
        err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
          ? 'Invalid email or password.'
          : err.message ?? 'Login failed.';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient colors={[Colors.primaryContainer + '60', 'transparent']} style={styles.headerGradient} />
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <Ionicons name="leaf" size={24} color={Colors.onPrimary} />
            </View>
            <Text style={styles.logoText}>CalTrackr</Text>
          </View>
          <Text style={styles.headline}>Welcome back.</Text>
          <Text style={styles.subheadline}>Track what you eat, live how you want.</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Google Button */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            activeOpacity={0.85}
            disabled={googleLoading}
          >
            <View style={styles.googleIcon}>
              <Text style={styles.googleG}>G</Text>
            </View>
            <Text style={styles.googleText}>
              {googleLoading ? 'Signing in...' : 'Continue with Google'}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            leftIcon="mail-outline"
            error={errors.email}
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry={!showPassword}
            autoComplete="password"
            leftIcon="lock-closed-outline"
            rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
            onRightIconPress={() => setShowPassword((v) => !v)}
            error={errors.password}
            containerStyle={{ marginTop: Spacing.md }}
          />

          <Button
            label="Sign In"
            onPress={handleEmailLogin}
            loading={loading}
            fullWidth
            style={{ marginTop: Spacing.xl }}
          />

          <TouchableOpacity style={styles.registerRow} onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.registerText}>Don&apos;t have an account? </Text>
            <Text style={styles.registerLink}>Create one</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  content: { flexGrow: 1 },
  header: {
    paddingTop: 80,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    overflow: 'hidden',
  },
  headerGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    ...Typography.headlineMd,
    color: Colors.onSurface,
  },
  headline: {
    fontSize: 42,
    fontFamily: 'Inter_700Bold',
    color: Colors.onSurface,
    letterSpacing: -1,
    lineHeight: 48,
  },
  subheadline: {
    ...Typography.bodyLg,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.sm,
  },
  form: {
    flex: 1,
    backgroundColor: Colors.surfaceLowest,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    paddingTop: Spacing.xxl,
    ...Shadow.modal,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceLowest,
    borderRadius: Radius.full,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: Colors.surfaceHigh,
    ...Shadow.card,
  },
  googleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#ffffff',
    lineHeight: 18,
  },
  googleText: {
    ...Typography.titleMd,
    color: Colors.onSurface,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginVertical: Spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.surfaceHigh,
  },
  dividerText: {
    ...Typography.labelMd,
    color: Colors.outlineVariant,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  registerText: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  registerLink: {
    ...Typography.bodyMd,
    color: Colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
});
