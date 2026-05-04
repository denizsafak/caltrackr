import { useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';

import { signUpWithEmail } from '@/services/firebase/auth';
import { getUserProfile } from '@/services/firebase/firestore';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const { setUser } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  const validate = () => {
    const errs: typeof errors = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email';
    if (!password) errs.password = 'Password is required';
    else if (password.length < 6) errs.password = 'At least 6 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const fbUser = await signUpWithEmail(email.trim(), password, name.trim());
      const profile = await getUserProfile(fbUser.uid);
      setUser(profile);
      router.replace('/(auth)/onboarding');
    } catch (err: any) {
      const msg =
        err.code === 'auth/email-already-in-use'
          ? 'An account with this email already exists.'
          : err.message ?? 'Registration failed.';
      Alert.alert('Registration Failed', msg);
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
        {/* Back button */}
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.headline}>Create account.</Text>
          <Text style={styles.subheadline}>Start your wellness journey today.</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Full Name"
            value={name}
            onChangeText={setName}
            placeholder="Alex Sterling"
            autoCapitalize="words"
            autoComplete="name"
            leftIcon="person-outline"
            error={errors.name}
          />
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
            containerStyle={{ marginTop: Spacing.md }}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry={!showPassword}
            autoComplete="new-password"
            leftIcon="lock-closed-outline"
            rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
            onRightIconPress={() => setShowPassword((v) => !v)}
            error={errors.password}
            containerStyle={{ marginTop: Spacing.md }}
          />

          <Text style={styles.passwordHint}>
            Password must be at least 6 characters.
          </Text>

          <Button
            label="Create Account"
            onPress={handleRegister}
            loading={loading}
            fullWidth
            style={{ marginTop: Spacing.xl }}
          />

          <TouchableOpacity style={styles.loginRow} onPress={() => router.back()}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <Text style={styles.loginLink}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  content: { flexGrow: 1, paddingTop: 60 },
  back: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceLowest,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.card,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  headline: {
    fontSize: 38,
    fontFamily: 'Inter_700Bold',
    color: Colors.onSurface,
    letterSpacing: -1,
    lineHeight: 44,
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
  passwordHint: {
    ...Typography.bodySm,
    color: Colors.outlineVariant,
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  loginText: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  loginLink: {
    ...Typography.bodyMd,
    color: Colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
});
