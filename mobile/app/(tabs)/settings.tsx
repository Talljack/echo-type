import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Divider, Switch, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSettingsStore } from '@/stores/useSettingsStore';

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const { settings, updateSettings } = useSettingsStore();

  const handleSignOut = async () => {
    await signOut();
  };

  const handleLogin = () => {
    router.push('/(auth)/login');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text variant="displaySmall" style={[styles.title, { color: theme.colors.onBackground }]}>
            Settings
          </Text>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
            Account
          </Text>
          <Card variant="elevated" padding={0}>
            {user ? (
              // Logged in state
              <>
                <View style={styles.accountCard}>
                  <LinearGradient colors={['#A78BFA', '#7C3AED']} style={styles.avatar}>
                    <MaterialCommunityIcons name="account" size={32} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={styles.accountInfo}>
                    <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                      {user.name || 'User'}
                    </Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
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
                  <Button
                    mode="text"
                    onPress={handleSignOut}
                    textColor={theme.colors.error}
                    style={styles.signOutButton}
                  >
                    Sign Out
                  </Button>
                </View>
              </>
            ) : (
              // Not logged in state
              <View style={styles.loginPrompt}>
                <MaterialCommunityIcons name="cloud-off-outline" size={48} color={theme.colors.onSurfaceVariant} />
                <Text variant="titleMedium" style={[styles.loginTitle, { color: theme.colors.onSurface }]}>
                  Sign in to sync your progress
                </Text>
                <Text variant="bodyMedium" style={[styles.loginSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                  Access your learning data across all devices
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
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
            Appearance
          </Text>
          <Card variant="elevated" padding={0}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <View style={[styles.settingIconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <MaterialCommunityIcons name="theme-light-dark" size={24} color={theme.colors.primary} />
                </View>
                <View style={styles.settingText}>
                  <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                    Dark Mode
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Use dark theme
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.theme === 'dark'}
                onValueChange={(value) => updateSettings({ theme: value ? 'dark' : 'light' })}
              />
            </View>
          </Card>
        </View>

        {/* Learning Section */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
            Learning
          </Text>
          <Card variant="elevated" padding={0}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <View style={[styles.settingIconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <MaterialCommunityIcons name="speedometer" size={24} color={theme.colors.primary} />
                </View>
                <View style={styles.settingText}>
                  <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                    Playback Speed
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {settings.ttsSpeed}x
                  </Text>
                </View>
              </View>
            </View>

            <Divider />

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <View style={[styles.settingIconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <MaterialCommunityIcons name="account-voice" size={24} color={theme.colors.primary} />
                </View>
                <View style={styles.settingText}>
                  <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                    TTS Voice
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {settings.ttsVoice}
                  </Text>
                </View>
              </View>
            </View>

            <Divider />

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <View style={[styles.settingIconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <MaterialCommunityIcons name="sync" size={24} color={theme.colors.primary} />
                </View>
                <View style={styles.settingText}>
                  <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                    Auto Sync
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Sync progress automatically
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.autoSync}
                onValueChange={(value) => updateSettings({ autoSync: value })}
                disabled={!user}
              />
            </View>
          </Card>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
            About
          </Text>
          <Card variant="elevated" padding={0}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <View style={[styles.settingIconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <MaterialCommunityIcons name="information" size={24} color={theme.colors.primary} />
                </View>
                <View style={styles.settingText}>
                  <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                    Version
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    1.0.0
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingBottom: 110,
  },
  header: {
    paddingVertical: 24,
  },
  title: {
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  accountInfo: {
    flex: 1,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  loginPrompt: {
    alignItems: 'center',
    padding: 32,
  },
  loginTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  loginSubtitle: {
    marginBottom: 24,
    textAlign: 'center',
  },
  loginButton: {
    borderRadius: 24,
  },
  loginButtonContent: {
    height: 48,
    paddingHorizontal: 24,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  settingInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingText: {
    flex: 1,
  },
  signOutButton: {
    width: '100%',
  },
});
