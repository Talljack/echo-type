import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Divider, Switch, Text } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AIProviderSection } from '@/components/settings/AIProviderSection';
import { LanguageSection } from '@/components/settings/LanguageSection';
import { SpeedSlider } from '@/components/settings/SpeedSlider';
import { TranslationSection } from '@/components/settings/TranslationSection';
import { type Voice, VoiceSelector } from '@/components/settings/VoiceSelector';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAppTheme } from '@/contexts/ThemeContext';
import { haptics } from '@/lib/haptics';
import { previewTTS } from '@/lib/tts-preview';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { fontFamily } from '@/theme/typography';

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useAppTheme();
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const { settings, updateSettings } = useSettingsStore();
  const [voiceSelectorVisible, setVoiceSelectorVisible] = useState(false);
  const [speedSliderExpanded, setSpeedSliderExpanded] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleLogin = () => {
    router.push('/(auth)/login');
  };

  const handlePreviewCurrentVoice = async () => {
    try {
      await previewTTS({
        text: 'Hello! This is how I sound.',
        voice: settings.ttsVoice,
        speed: settings.ttsSpeed,
      });
    } catch (error) {
      console.warn('TTS preview failed', error);
    }
  };

  const handlePreviewVoice = async (voice: Voice) => {
    try {
      await previewTTS({
        text: voice.preview,
        voice: voice.id,
        speed: settings.ttsSpeed,
      });
    } catch (error) {
      console.warn('TTS preview failed', error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(320).springify()}>
          <View style={styles.header}>
            <Text variant="displaySmall" style={[styles.title, { color: colors.onBackground }]}>
              Settings
            </Text>
          </View>
        </Animated.View>

        {/* Account Section */}
        <Animated.View entering={FadeInDown.duration(360).delay(40).springify()} style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>
            Account
          </Text>
          <Card variant="elevated" padding={0}>
            {user ? (
              // Logged in state
              <>
                <View style={styles.accountCard}>
                  <LinearGradient
                    colors={[colors.primaryLight, colors.primary]}
                    style={[styles.avatar, { shadowColor: colors.primary }]}
                  >
                    <MaterialCommunityIcons name="account" size={32} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={styles.accountInfo}>
                    <Text variant="titleMedium" style={{ color: colors.onSurface }}>
                      {user.email?.split('@')[0] || 'User'}
                    </Text>
                    <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
                      {user.email}
                    </Text>
                    <View style={styles.syncBadge}>
                      <MaterialCommunityIcons name="cloud-check" size={16} color="#16A34A" />
                      <Text variant="bodySmall" style={{ color: '#16A34A', marginLeft: 4 }}>
                        Synced
                      </Text>
                    </View>
                  </View>
                </View>
                <Divider />
                <View style={styles.settingItem}>
                  <Button mode="text" onPress={handleSignOut} textColor={colors.error} style={styles.signOutButton}>
                    Sign Out
                  </Button>
                </View>
              </>
            ) : (
              // Not logged in state
              <View style={styles.loginPrompt}>
                <MaterialCommunityIcons name="cloud-off-outline" size={48} color={colors.onSurfaceVariant} />
                <Text variant="titleMedium" style={[styles.loginTitle, { color: colors.onSurface }]}>
                  Sign in to sync your progress
                </Text>
                <Text variant="bodyMedium" style={[styles.loginSubtitle, { color: colors.onSurfaceVariant }]}>
                  Sign in is optional. The current mobile MVP stores learning data locally on this device.
                </Text>
                <Button
                  mode="contained"
                  onPress={handleLogin}
                  style={styles.loginButton}
                  contentStyle={styles.loginButtonContent}
                >
                  Sign In
                </Button>
              </View>
            )}
          </Card>
        </Animated.View>

        {/* Appearance Section */}
        <Animated.View entering={FadeInDown.duration(360).delay(70).springify()} style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>
            Appearance
          </Text>
          <Card variant="elevated" padding={0}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <View style={[styles.settingIconContainer, { backgroundColor: colors.surfaceVariant }]}>
                  <MaterialCommunityIcons name="theme-light-dark" size={24} color={colors.primary} />
                </View>
                <View style={styles.settingText}>
                  <Text variant="bodyLarge" style={{ color: colors.onSurface }}>
                    Dark Mode
                  </Text>
                  <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                    Use dark theme
                  </Text>
                </View>
              </View>
              <Switch
                value={isDark}
                onValueChange={() => {
                  void haptics.tap();
                  toggleTheme();
                }}
              />
            </View>
          </Card>
        </Animated.View>

        {/* Language Section */}
        <Animated.View entering={FadeInDown.duration(360).delay(100).springify()} style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>
            Language
          </Text>
          <LanguageSection />
        </Animated.View>

        {/* AI Provider Section */}
        <Animated.View entering={FadeInDown.duration(360).delay(130).springify()} style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>
            AI Provider
          </Text>
          <AIProviderSection />
        </Animated.View>

        {/* Translation Section */}
        <Animated.View entering={FadeInDown.duration(360).delay(160).springify()} style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>
            Translation
          </Text>
          <TranslationSection />
        </Animated.View>

        {/* Recommendations Section */}
        <Animated.View entering={FadeInDown.duration(360).delay(190).springify()} style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>
            AI Recommendations
          </Text>
          <Card variant="elevated" padding={0}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <View style={[styles.settingIconContainer, { backgroundColor: colors.surfaceVariant }]}>
                  <MaterialCommunityIcons name="lightbulb-on" size={24} color={colors.primary} />
                </View>
                <View style={styles.settingText}>
                  <Text variant="bodyLarge" style={{ color: colors.onSurface }}>
                    Enable Recommendations
                  </Text>
                  <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                    AI-powered content suggestions
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.enableRecommendations}
                onValueChange={(value) => {
                  void haptics.tap();
                  void updateSettings({ enableRecommendations: value });
                }}
              />
            </View>
          </Card>
        </Animated.View>

        {/* Learning Section */}
        <Animated.View entering={FadeInDown.duration(360).delay(220).springify()} style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>
            Learning
          </Text>
          <Card variant="elevated" padding={0}>
            <Pressable
              style={styles.settingItem}
              onPress={() => {
                void haptics.light();
                setSpeedSliderExpanded(!speedSliderExpanded);
              }}
              accessibilityRole="button"
              accessibilityLabel="Adjust playback speed"
            >
              <View style={styles.settingInfo}>
                <View style={[styles.settingIconContainer, { backgroundColor: colors.surfaceVariant }]}>
                  <MaterialCommunityIcons name="speedometer" size={24} color={colors.primary} />
                </View>
                <View style={styles.settingText}>
                  <Text variant="bodyLarge" style={{ color: colors.onSurface }}>
                    Playback Speed
                  </Text>
                  <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                    {settings.ttsSpeed}x
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons
                name={speedSliderExpanded ? 'chevron-up' : 'chevron-down'}
                size={24}
                color={colors.onSurfaceVariant}
              />
            </Pressable>

            {speedSliderExpanded && (
              <View style={styles.expandedContent}>
                <SpeedSlider
                  value={settings.ttsSpeed}
                  onChange={(value) => updateSettings({ ttsSpeed: value })}
                  onPreview={handlePreviewCurrentVoice}
                />
              </View>
            )}

            <Divider />

            <Pressable
              style={styles.settingItem}
              onPress={() => {
                void haptics.light();
                setVoiceSelectorVisible(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Select TTS voice"
            >
              <View style={styles.settingInfo}>
                <View style={[styles.settingIconContainer, { backgroundColor: colors.surfaceVariant }]}>
                  <MaterialCommunityIcons name="account-voice" size={24} color={colors.primary} />
                </View>
                <View style={styles.settingText}>
                  <Text variant="bodyLarge" style={{ color: colors.onSurface }}>
                    TTS Voice
                  </Text>
                  <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                    {settings.ttsVoice}
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
            </Pressable>

            <Divider />

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <View style={[styles.settingIconContainer, { backgroundColor: colors.surfaceVariant }]}>
                  <MaterialCommunityIcons name="sync" size={24} color={colors.primary} />
                </View>
                <View style={styles.settingText}>
                  <Text variant="bodyLarge" style={{ color: colors.onSurface }}>
                    Auto Sync
                  </Text>
                  <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                    Sync progress automatically
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.autoSync}
                onValueChange={(value) => {
                  void haptics.tap();
                  updateSettings({ autoSync: value });
                }}
                disabled={!user}
              />
            </View>
          </Card>
        </Animated.View>

        {/* About Section */}
        <Animated.View entering={FadeInDown.duration(360).delay(250).springify()} style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>
            About
          </Text>
          <Card variant="elevated" padding={0}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <View style={[styles.settingIconContainer, { backgroundColor: colors.surfaceVariant }]}>
                  <MaterialCommunityIcons name="information" size={24} color={colors.primary} />
                </View>
                <View style={styles.settingText}>
                  <Text variant="bodyLarge" style={{ color: colors.onSurface }}>
                    Version
                  </Text>
                  <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                    1.0.0
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        </Animated.View>
      </ScrollView>

      {/* Voice Selector Modal */}
      <VoiceSelector
        visible={voiceSelectorVisible}
        selectedVoice={settings.ttsVoice}
        onDismiss={() => setVoiceSelectorVisible(false)}
        onSelect={(voiceId) => updateSettings({ ttsVoice: voiceId })}
        onPreview={handlePreviewVoice}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 140,
  },
  header: {
    paddingVertical: 20,
  },
  title: {
    fontFamily: fontFamily.headingBold,
    fontWeight: '700',
    fontSize: 34,
    letterSpacing: 0.4,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontFamily: fontFamily.bodyMedium,
    marginBottom: 8,
    fontWeight: '600',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingLeft: 4,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  accountInfo: {
    flex: 1,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#16A34A15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  loginPrompt: {
    alignItems: 'center',
    padding: 32,
  },
  loginTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  loginSubtitle: {
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  loginButton: {
    borderRadius: 14,
  },
  loginButtonContent: {
    height: 50,
    paddingHorizontal: 32,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 60,
  },
  settingInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderCurve: 'continuous',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  signOutButton: {
    width: '100%',
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});
