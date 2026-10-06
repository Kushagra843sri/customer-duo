import { ShoppingBasket } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';

import { Button, IconChip, Muted, usePalette } from '@/components/ui';
import { authService } from '@/lib/authService';

function describeAuthError(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  switch (code) {
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email or password is incorrect.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Sign in instead.';
    case 'auth/weak-password':
      return 'Choose a password with at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a while and try again.';
    case 'auth/network-request-failed':
      return 'Unable to connect. Check your connection and try again.';
    default:
      return error instanceof Error && !code ? error.message : 'Something went wrong. Please try again.';
  }
}

export default function SignInScreen() {
  const palette = usePalette();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const busyRef = useRef(false);

  async function run(action: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const input =
    'h-14 rounded-2xl border border-line bg-surface px-4 text-base text-ink dark:border-line-dark dark:bg-surface-dark dark:text-ink-dark';
  const trimmed = email.trim();
  const canSubmit = trimmed.length > 3 && password.length >= 6;

  if (!authService.isConfigured) {
    return (
      <View className="flex-1 items-center justify-center gap-2 bg-canvas px-8 dark:bg-canvas-dark">
        <Text className="text-lg font-bold text-red-600">Sign-in is not configured</Text>
        <Text className="text-center text-sm text-muted dark:text-muted-dark">
          Firebase settings are missing from this build (see customer/.env.example). To browse the screens with sample data, set
          EXPO_PUBLIC_UI_PREVIEW=1 in customer/.env.local.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-canvas dark:bg-canvas-dark">
      <ScrollView contentContainerClassName="flex-grow justify-center gap-4 px-6 py-10" keyboardShouldPersistTaps="handled">
        <View className="items-center gap-3 pb-2">
          <IconChip icon={ShoppingBasket} size={80} />
          <Text className="text-3xl font-extrabold text-ink dark:text-ink-dark">Allz Bharat</Text>
          <Muted className="text-center">Groceries and essentials from shops near you.</Muted>
        </View>

        <TextInput
          className={input}
          placeholder="Email"
          placeholderTextColor={palette.muted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
          editable={!busy}
        />
        <TextInput
          className={input}
          placeholder="Password (6+ characters)"
          placeholderTextColor={palette.muted}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
          value={password}
          onChangeText={setPassword}
          editable={!busy}
        />

        {error ? <Text className="text-sm font-medium text-red-600">{error}</Text> : null}
        {notice ? <Text className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{notice}</Text> : null}

        <Button
          label={mode === 'in' ? 'Sign in' : 'Create account'}
          loading={busy}
          disabled={!canSubmit}
          onPress={() => run(() => (mode === 'in' ? authService.signIn(trimmed, password) : authService.signUp(trimmed, password)))}
        />
        <Button
          variant="ghost"
          label={mode === 'in' ? 'New here? Create an account' : 'Have an account? Sign in'}
          disabled={busy}
          onPress={() => {
            setMode(mode === 'in' ? 'up' : 'in');
            setError(null);
            setNotice(null);
          }}
        />
        {mode === 'in' ? (
          <Button
            variant="ghost"
            small
            fullWidth
            label="Forgot password?"
            disabled={busy || trimmed.length < 4}
            onPress={() =>
              run(async () => {
                await authService.sendPasswordReset(trimmed);
                setNotice('If an account exists for this email, a reset link is on its way.');
              })
            }
          />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
