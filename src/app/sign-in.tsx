import { Link, router } from 'expo-router';
import { UserRound, Utensils } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Field } from '@/components/ui';
import { colors, fonts, layout, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';

export default function SignInScreen() {
  const { signIn, signInWithGoogle, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async () => {
    setMessage('');
    setBusy(true);
    try {
      await signIn(email, password);
      router.replace('/dashboard');
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : 'Check your email and password, then try again.';
      setMessage(nextMessage);
      Alert.alert('Sign in failed', nextMessage);
    } finally {
      setBusy(false);
    }
  };

  const googleSignIn = async () => {
    setMessage('');
    setBusy(true);
    try {
      await signInWithGoogle();
      router.replace('/dashboard');
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : 'Google sign-in is unavailable. Try email sign-in instead.';
      setMessage(nextMessage);
      Alert.alert('Google sign in failed', nextMessage);
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setMessage('Please enter your email address to reset password.');
      return;
    }
    setMessage('');
    setBusy(true);
    try {
      await resetPassword(email);
      Alert.alert('Password reset email sent', 'Check your inbox for further instructions.');
      setMessage('Password reset email sent. Check your inbox.');
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : 'Failed to send reset email. Try again later.';
      setMessage(nextMessage);
      Alert.alert('Reset failed', nextMessage);
    } finally {
      setBusy(false);
    }
  };


  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.wrap}>
        <View style={styles.hero}>
          <View style={styles.brandMark}>
            <Utensils size={28} color={colors.primary} />
          </View>
          <Text style={styles.brand}>CalTrackr</Text>
          <Text style={styles.title}>Smart nutrition planning, made calm.</Text>
          <Text style={styles.copy}>Sign in with Google or email to manage meals, goals, weekly plans, and shopping lists.</Text>
        </View>
        <Card style={styles.form}>
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <Pressable onPress={handleForgotPassword} disabled={busy} style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </Pressable>
          <Button onPress={submit} disabled={busy}>
            {busy ? 'Signing in...' : 'Sign in'}
          </Button>
          <Button variant="secondary" icon={UserRound} onPress={googleSignIn} disabled={busy}>
            Continue with Google
          </Button>
          <View style={styles.divider} />
          <Text style={styles.switchTextCenter}>Don&apos;t have an account?</Text>
          <Link href="/sign-up" asChild>
            <Button variant="secondary" disabled={busy}>
              Sign Up
            </Button>
          </Link>
        </Card>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  wrap: {
    flex: 1,
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
    padding: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xl,
  },
  hero: {
    flex: 1,
    minWidth: 300,
    gap: spacing.md,
  },
  brandMark: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    color: colors.primary,
    fontFamily: fonts.extraBold,
    fontSize: 24,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.extraBold,
    fontSize: 54,
    lineHeight: 58,
    letterSpacing: 0,
  },
  copy: {
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 17,
    lineHeight: 26,
    maxWidth: 520,
  },
  form: {
    flex: 1,
    minWidth: 310,
    maxWidth: 460,
  },
  switchLink: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  switchTextCenter: {
    color: colors.muted,
    fontFamily: fonts.medium,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    color: colors.warning,
    fontFamily: fonts.bold,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceHigh,
    marginVertical: spacing.md,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: spacing.md,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontFamily: fonts.medium,
    fontSize: 14,
  },
});
