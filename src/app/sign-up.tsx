import { Link, router } from 'expo-router';
import { UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Field } from '@/components/ui';
import { colors, fonts, layout, spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';

export default function SignUpScreen() {
  const { signInWithGoogle, signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async () => {
    setMessage('');
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setMessage('Enter an email address first.');
      return;
    }
    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.');
      return;
    }

    setBusy(true);
    try {
      await signUp(name, trimmedEmail, password);
      router.replace('/dashboard');
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : 'Account creation is unavailable. Try again in a moment.';
      setMessage(nextMessage);
      Alert.alert('Sign up failed', nextMessage);
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

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.wrap}>
        <View style={styles.copyBlock}>
          <Text style={styles.eyebrow}>New profile</Text>
          <Text style={styles.title}>Build your week around real life.</Text>
          <Text style={styles.copy}>Create an account to track meals, set nutrition goals, plan your week, and build shopping lists.</Text>
        </View>
        <Card style={styles.form}>
          <Field label="Name" value={name} onChangeText={setName} placeholder="Your name" />
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <Button onPress={submit} disabled={busy}>
            {busy ? 'Creating...' : 'Create account'}
          </Button>
          <Button variant="secondary" icon={UserRound} onPress={googleSignIn} disabled={busy}>
            Continue with Google
          </Button>
          <Link href="/sign-in" asChild>
            <Pressable style={styles.switchLink}>
              <Text style={styles.switchText}>I already have an account</Text>
            </Pressable>
          </Link>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
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
  copyBlock: {
    flex: 1,
    minWidth: 300,
    gap: spacing.md,
  },
  eyebrow: {
    color: colors.primary,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
    fontSize: 12,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.extraBold,
    fontSize: 52,
    lineHeight: 56,
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
  switchText: {
    color: colors.primary,
    fontFamily: fonts.bold,
  },
  message: {
    color: colors.warning,
    fontFamily: fonts.bold,
    lineHeight: 20,
  },
});
