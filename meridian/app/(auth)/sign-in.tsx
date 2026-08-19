import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { Banner, Button, Field, Screen, Text } from '@/components/ui';
import { resetPassword, signIn } from '@/services/auth';
import { track } from '@/services/analytics';
import { AppError } from '@/lib/errors';
import { features } from '@/config/features';

export default function SignIn() {
  const theme = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
      track('signed_in');
      router.replace('/');
    } catch (e) {
      setError(e instanceof AppError ? e.message : 'Could not sign you in.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <View style={{ gap: theme.spacing.lg, paddingTop: theme.spacing.xl }}>
          <Text variant="title1">Welcome back</Text>

          {error ? <Banner tone="danger" title="Sign in failed" body={error} /> : null}
          {notice ? <Banner tone="success" title="Check your email" body={notice} /> : null}

          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="you@example.com"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
            placeholder="Your password"
          />

          <Button label="Sign in" full size="lg" loading={busy} onPress={submit} />

          <Button
            label="Forgot password"
            variant="ghost"
            full
            onPress={async () => {
              if (!email.includes('@')) return setError('Enter your email address first.');
              try {
                await resetPassword(email);
                setNotice('We sent you a link to set a new password.');
              } catch {
                setError('Could not send the reset email.');
              }
            }}
          />

          {features.appleSignIn || features.googleSignIn ? null : (
            <Text variant="caption" color="tertiary" align="center">
              Apple and Google sign-in are wired for a future release — see docs/AUTH.md.
            </Text>
          )}

          <Button
            label="Create an account"
            variant="ghost"
            full
            onPress={() => router.replace('/(auth)/sign-up')}
          />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
