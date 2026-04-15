import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useAuthStore } from '@/stores/useAuthStore';

const { width } = Dimensions.get('window');

// Google Icon Component
function GoogleIcon() {
  return (
    <View style={{ width: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 18 }}>G</Text>
    </View>
  );
}

export default function SignupScreen() {
  const router = useRouter();
  const { signUp, signInWithOAuth, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  const handleEmailSignup = async () => {
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setError('');
      await signUp(email.trim(), password.trim());
      Alert.alert('Success', 'Account created! Please check your email to verify your account.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleOAuthSignup = async (provider: 'google' | 'github') => {
    try {
      setError('');
      await signInWithOAuth(provider);
      router.replace('/(tabs)');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      {/* Animated Background Gradient */}
      <LinearGradient colors={['#F3E8FF', '#E9D5FF', '#DDD6FE']} style={styles.backgroundGradient}>
        {/* Floating Blobs */}
        <View style={[styles.blob, styles.blob1]} />
        <View style={[styles.blob, styles.blob2]} />
        <View style={[styles.blob, styles.blob3]} />
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.logoGradient}>
              <MaterialCommunityIcons name="book-alphabet" size={48} color="#FFFFFF" />
            </LinearGradient>
          </View>

          {/* Title */}
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Start your language learning journey today</Text>

          {/* Glass Card */}
          <BlurView intensity={80} tint="light" style={styles.glassCard}>
            <View style={styles.cardContent}>
              {/* OAuth Buttons */}
              <View style={styles.oauthContainer}>
                <Pressable
                  onPress={() => handleOAuthSignup('google')}
                  disabled={isLoading}
                  style={({ pressed }) => [styles.oauthButton, pressed && styles.oauthButtonPressed]}
                >
                  <BlurView intensity={60} tint="light" style={styles.oauthButtonBlur}>
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#8B5CF6" />
                    ) : (
                      <>
                        <GoogleIcon />
                        <Text style={styles.oauthButtonText}>Google</Text>
                      </>
                    )}
                  </BlurView>
                </Pressable>

                <Pressable
                  onPress={() => handleOAuthSignup('github')}
                  disabled={isLoading}
                  style={({ pressed }) => [styles.oauthButton, pressed && styles.oauthButtonPressed]}
                >
                  <BlurView intensity={60} tint="light" style={styles.oauthButtonBlur}>
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#8B5CF6" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="github" size={20} color="#1F2937" />
                        <Text style={styles.oauthButtonText}>GitHub</Text>
                      </>
                    )}
                  </BlurView>
                </Pressable>
              </View>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or sign up with email</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="email-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="lock-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password (min 6 characters)"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <MaterialCommunityIcons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#6B7280"
                  />
                </Pressable>
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="lock-check-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor="#9CA3AF"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                  <MaterialCommunityIcons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#6B7280"
                  />
                </Pressable>
              </View>

              {/* Error Message */}
              {error ? (
                <View style={styles.errorContainer}>
                  <MaterialCommunityIcons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Sign Up Button */}
              <Pressable
                onPress={handleEmailSignup}
                disabled={isLoading}
                style={({ pressed }) => [styles.signUpButton, pressed && styles.signUpButtonPressed]}
              >
                <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.signUpGradient}>
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.signUpText}>Create Account</Text>
                      <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
                    </>
                  )}
                </LinearGradient>
              </Pressable>

              {/* Sign In Link */}
              <View style={styles.signInContainer}>
                <Text style={styles.signInText}>Already have an account? </Text>
                <Pressable onPress={() => router.push('/(auth)/login')} disabled={isLoading}>
                  <Text style={styles.signInLink}>Sign In</Text>
                </Pressable>
              </View>
            </View>
          </BlurView>

          {/* Skip Button */}
          <Pressable onPress={handleSkip} disabled={isLoading} style={styles.skipButton}>
            <Text style={styles.skipText}>Continue without signing in</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  blob: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.3,
  },
  blob1: {
    width: 300,
    height: 300,
    backgroundColor: '#A78BFA',
    top: -100,
    left: -80,
  },
  blob2: {
    width: 250,
    height: 250,
    backgroundColor: '#C4B5FD',
    top: 100,
    right: -60,
  },
  blob3: {
    width: 200,
    height: 200,
    backgroundColor: '#DDD6FE',
    bottom: 100,
    left: 50,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  glassCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  cardContent: {
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  oauthContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  oauthButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  oauthButtonPressed: {
    opacity: 0.7,
  },
  oauthButtonBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  oauthButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  dividerText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginHorizontal: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 16,
  },
  eyeIcon: {
    padding: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#EF4444',
  },
  signUpButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  signUpButtonPressed: {
    opacity: 0.8,
  },
  signUpGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  signUpText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    fontSize: 14,
    color: '#6B7280',
  },
  signInLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  skipButton: {
    marginTop: 24,
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
