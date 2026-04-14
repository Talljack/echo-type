import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Banner, Text, TextInput } from 'react-native-paper';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { useAppTheme } from '@/contexts/ThemeContext';
import { isSupabaseConfigured } from '@/services/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

export default function LoginScreen() {
  const { colors } = useAppTheme();
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Gradient Header */}
      <LinearGradient colors={['#007AFF', '#5AC8FA']} style={styles.headerGradient}>
        <View style={styles.logoContainer}>
          <MaterialCommunityIcons name="book-alphabet" size={64} color="#FFFFFF" />
          <Text variant="displayMedium" style={styles.appName}>
            EchoType
          </Text>
          <Text variant="bodyLarge" style={styles.tagline}>
            Master languages through practice
          </Text>
        </View>
      </LinearGradient>

      {/* Form Container */}
      <View style={styles.formContainer}>
        {!isSupabaseConfigured && (
          <Banner visible={true} icon="information" style={styles.banner}>
            Supabase is not configured. Please update .env file with your Supabase URL and anon key to enable
            authentication.
          </Banner>
        )}

        <View style={[styles.formCard, { backgroundColor: colors.surface }]}>
          <Text variant="headlineSmall" style={[styles.formTitle, { color: colors.onSurface }]}>
            Welcome Back
          </Text>
          <Text variant="bodyMedium" style={[styles.formSubtitle, { color: colors.onSurfaceVariant }]}>
            Sign in to continue your learning journey
          </Text>

          <View style={styles.form}>
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              mode="outlined"
              style={styles.input}
              outlineColor={colors.outline}
              activeOutlineColor={colors.primary}
              textColor={colors.onSurface}
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              mode="outlined"
              style={styles.input}
              outlineColor={colors.outline}
              activeOutlineColor={colors.primary}
              textColor={colors.onSurface}
            />

            {error ? (
              <Text variant="bodySmall" style={[styles.error, { color: colors.error }]}>
                {error}
              </Text>
            ) : null}

            <Button
              onPress={handleLogin}
              loading={isLoading}
              disabled={!email || !password || isLoading}
              style={[styles.button, { backgroundColor: colors.primary }]}
            >
              Sign In
            </Button>

            <Button
              mode="text"
              onPress={() => router.push('/(auth)/signup')}
              disabled={isLoading}
              textColor={colors.primary}
            >
              Don't have an account? Sign Up
            </Button>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 80,
    paddingBottom: 60,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  logoContainer: {
    alignItems: 'center',
  },
  appName: {
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
  },
  tagline: {
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 8,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 24,
    marginTop: -30,
  },
  banner: {
    marginBottom: 16,
    borderRadius: 12,
  },
  formCard: {
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  formTitle: {
    fontWeight: '700',
    textAlign: 'center',
  },
  formSubtitle: {
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: 'transparent',
  },
  button: {
    marginTop: 8,
    borderRadius: 12,
  },
  error: {
    textAlign: 'center',
  },
});
