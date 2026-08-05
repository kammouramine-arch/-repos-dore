import { useNavigation } from '@react-navigation/native';
import { useRef } from 'react';
import type { TextInput } from 'react-native';

import { useAuthStore } from '@/app/stores/hooks';
import { Button, TextField } from '@/ui/components';
import { validateEmail } from '@/utils/validation';
import { useField } from '../hooks/useField';
import { AuthLayout } from './AuthLayout';
import { FormError } from './FormError';

export const LoginScreen = () => {
  const navigation = useNavigation();
  const email = useField();
  const password = useField();
  const passwordRef = useRef<TextInput>(null);

  const { signIn, submitting, error, clearError } = useAuthStore();

  const submit = async () => {
    const emailError = validateEmail(email.value);
    const passwordError = password.value.length === 0 ? 'Enter your password.' : null;

    email.setError(emailError);
    password.setError(passwordError);
    if (emailError || passwordError) return;

    await signIn(email.value, password.value);
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to pick up where you left off."
      footerPrompt="New to Nova?"
      footerAction="Create an account"
      onFooterPress={() => {
        clearError();
        navigation.navigate('Register');
      }}
    >
      <FormError message={error} />

      <TextField
        label="Email"
        icon="mail-outline"
        placeholder="you@example.com"
        value={email.value}
        onChangeText={email.set}
        error={email.error}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />

      <TextField
        label="Password"
        icon="lock-closed-outline"
        placeholder="Your password"
        inputRef={passwordRef}
        value={password.value}
        onChangeText={password.set}
        error={password.error}
        secure
        autoCapitalize="none"
        autoComplete="current-password"
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
      />

      <Button label="Sign in" loading={submitting} onPress={() => void submit()} />
    </AuthLayout>
  );
};
