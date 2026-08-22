import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { Banner, Button, Field, Screen, Text } from '@/components/ui';
import { signUp } from '@/services/auth';
import { track } from '@/services/analytics';
import { AppError } from '@/lib/errors';
import { brand } from '@/config/brand';

export default function SignUp() {
  const theme = useTheme();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email.includes('@')) return setError('That email address does not look right.');
    if (password.length < 8) return setError('Use at least 8 characters.');

    setBusy(true);
    try {
      const result = await signUp(email, password, name);
      track('signed_up');
      // Projects with email confirmation on return no session until the link is used.
      if (!result.session) setConfirmation(true);
      else router.replace('/');
    } catch (e) {
      setError(e instanceof AppError ? e.message : 'Could not create your account.');
    } finally {
      setBusy(false);
    }
  };

  if (confirmation) {
    return (
      <Screen>
        <View style={{ gap: theme.spacing.lg, paddingTop: theme.spacing.xxl }}>
          <Text variant="title1">Check your email</Text>
          <Text variant="body" color="secondary">
            We sent a confirmation link to {email}. Open it, then come back and sign in.
          </Text>
          <Button label="Go to sign in" onPress={() => router.replace('/(auth)/sign-in')} />
        </View>
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <View style={{ gap: theme.spacing.lg, paddingTop: theme.spacing.xl }}>
          <View style={{ gap: theme.spacing.xs }}>
            <Text variant="title1">Create your {brand.name} account</Text>
            <Text variant="callout" color="secondary">
              One account, one life plan. It stays private to you.
            </Text>
          </View>

          {error ? <Banner tone="danger" title="Something is off" body={error} /> : null}

          <Field
            label="Your name"
            value={name}
            onChangeText={setName}
            placeholder="Alex"
            autoCapitalize="words"
            textContentType="givenName"
          />
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            secureTextEntry
            textContentType="newPassword"
          />

          <Button label="Create account" full size="lg" loading={busy} onPress={submit} />
          <Button
            label="I already have an account"
            variant="ghost"
            full
            onPress={() => router.replace('/(auth)/sign-in')}
          />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
