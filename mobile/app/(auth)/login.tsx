import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Banner, Text, TextInput, useTheme } from 'react-native-paper';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { isSupabaseConfigured } from '@/services/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { signIn, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      setError('');
      await signIn(email, password);
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <Screen scrollable>
      <View style={styles.container}>
        {!isSupabaseConfigured && (
          <Banner visible={true} icon="information" style={{ marginBottom: 16 }}>
            Supabase is not configured. Please update .env file with your Supabase URL and anon key to enable
            authentication.
          </Banner>
        )}

        <View style={styles.header}>
          <Text variant="displaySmall" style={[styles.title, { color: theme.colors.primary }]}>
            EchoType
          </Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            Welcome back! Sign in to continue.
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            mode="outlined"
            style={styles.input}
          />

          {error ? (
            <Text variant="bodySmall" style={[styles.error, { color: theme.colors.error }]}>
              {error}
            </Text>
          ) : null}

          <Button
            onPress={handleLogin}
            loading={isLoading}
            disabled={!email || !password || isLoading}
            style={styles.button}
          >
            Sign In
          </Button>

          <Button variant="ghost" onPress={() => router.push('/(auth)/signup')} disabled={isLoading}>
            Don't have an account? Sign Up
          </Button>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 48,
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: 'transparent',
  },
  button: {
    marginTop: 8,
  },
  error: {
    textAlign: 'center',
  },
});
