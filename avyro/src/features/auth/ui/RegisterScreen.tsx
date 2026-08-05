import { useNavigation } from '@react-navigation/native';
import { useRef } from 'react';
import type { TextInput } from 'react-native';

import { useAuthStore } from '@/app/stores/hooks';
import { Button, TextField } from '@/ui/components';
import {
  validateEmail,
  validateFullName,
  validatePassword,
  validatePasswordConfirmation,
} from '@/utils/validation';
import { useField } from '../hooks/useField';
import { AuthLayout } from './AuthLayout';
import { FormError } from './FormError';

export const RegisterScreen = () => {
  const navigation = useNavigation();
  const fullName = useField();
  const email = useField();
  const password = useField();
  const confirmation = useField();

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmationRef = useRef<TextInput>(null);

  const { signUp, submitting, error, clearError } = useAuthStore();

  const submit = async () => {
    const errors = {
      fullName: validateFullName(fullName.value),
      email: validateEmail(email.value),
      password: validatePassword(password.value),
      confirmation: validatePasswordConfirmation(password.value, confirmation.value),
    };

    fullName.setError(errors.fullName);
    email.setError(errors.email);
    password.setError(errors.password);
    confirmation.setError(errors.confirmation);

    if (Object.values(errors).some((message) => message !== null)) return;

    await signUp(fullName.value, email.value, password.value);
  };

  return (
    <AuthLayout
      title="Create your Avyro"
      subtitle="One account, every drive."
      footerPrompt="Already have an account?"
      footerAction="Sign in"
      onFooterPress={() => {
        clearError();
        navigation.navigate('Login');
      }}
    >
      <FormError message={error} />

      <TextField
        label="Name"
        icon="person-outline"
        placeholder="Alex Durand"
        value={fullName.value}
        onChangeText={fullName.set}
        error={fullName.error}
        autoCapitalize="words"
        autoComplete="name"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
      />

      <TextField
        label="Email"
        icon="mail-outline"
        placeholder="you@example.com"
        inputRef={emailRef}
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
        placeholder="At least 8 characters"
        inputRef={passwordRef}
        value={password.value}
        onChangeText={password.set}
        error={password.error}
        secure
        autoCapitalize="none"
        autoComplete="new-password"
        returnKeyType="next"
        onSubmitEditing={() => confirmationRef.current?.focus()}
      />

      <TextField
        label="Confirm password"
        icon="checkmark-circle-outline"
        placeholder="Repeat your password"
        inputRef={confirmationRef}
        value={confirmation.value}
        onChangeText={confirmation.set}
        error={confirmation.error}
        secure
        autoCapitalize="none"
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
      />

      <Button label="Create account" loading={submitting} onPress={() => void submit()} />
    </AuthLayout>
  );
};
