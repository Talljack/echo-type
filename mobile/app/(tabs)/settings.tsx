import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Divider, Switch, Text } from 'react-native-paper';
import Animated, {
  Extrapolate,
  FadeInDown,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AIProviderSection } from '@/components/settings/AIProviderSection';
import { LanguageSection } from '@/components/settings/LanguageSection';
import { SpeedSlider } from '@/components/settings/SpeedSlider';
import { TranslationSection } from '@/components/settings/TranslationSection';
import { type Voice, VoiceSelector } from '@/components/settings/VoiceSelector';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/hooks/useI18n';
import { clearCache, deleteAllLocalData, exportAllData, getCacheSizeLabel } from '@/lib/data-management';
import { haptics } from '@/lib/haptics';
import {
  cancelAllScheduledNotifications,
  formatTime,
  parseTimeString,
  scheduleDailyReminder,
} from '@/lib/notifications';
import { previewTTS } from '@/lib/tts-preview';
import { isSupabaseConfigured } from '@/services/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useSyncStore } from '@/stores/useSyncStore';
import { fontFamily } from '@/theme/typography';

const PRIVACY_URL = 'https://echotype.app/privacy';
const TERMS_URL = 'https://echotype.app/terms';
const FEEDBACK_EMAIL = 'feedback@echotype.app';
const APP_STORE_URL = 'itms-apps://itunes.apple.com/app/idYOUR_APP_ID?action=write-review';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface RowProps {
  icon: IconName;
  title: string;
  subtitle?: string;
  iconColor?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  destructive?: boolean;
}

function SettingRow({ icon, title, subtitle, iconColor, onPress, right, destructive }: RowProps) {
  const { colors } = useAppTheme();
  const tint = destructive ? colors.error : (iconColor ?? colors.primary);
  const bg = destructive ? `${colors.error}15` : colors.surfaceVariant;

  const content = (
    <View style={rowStyles.row}>
      <View style={[rowStyles.iconBox, { backgroundColor: bg }]}>
        <MaterialCommunityIcons name={icon} size={20} color={tint} />
      </View>
      <View style={rowStyles.text}>
        <Text variant="bodyLarge" style={{ color: destructive ? colors.error : colors.onSurface }}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ??
        (onPress ? <MaterialCommunityIcons name="chevron-right" size={22} color={colors.onSurfaceVariant} /> : null)}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={() => {
          void haptics.light();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={title}
        android_ripple={{ color: colors.surfaceVariant }}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

interface SectionProps {
  title: string;
  delay?: number;
  children: React.ReactNode;
}

function Section({ title, delay = 0, children }: SectionProps) {
  const { colors } = useAppTheme();
  return (
    <Animated.View entering={FadeInDown.duration(360).delay(delay).springify()} style={styles.section}>
      <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>
        {title}
      </Text>
      <Card variant="elevated" padding={0}>
        {children}
      </Card>
    </Animated.View>
  );
}

function formatLastSyncedLabel(
  ts: number | null,
  t: (k: string, fb?: string) => string,
  ti: (k: string, vars: Record<string, string | number>, fb?: string) => string,
): string {
  if (!ts) return t('sync.neverSynced');
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return t('sync.justNow');
  if (mins < 60) return ti('sync.minutesAgo', { n: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return ti('sync.hoursAgo', { n: hrs });
  const days = Math.floor(hrs / 24);
  return ti('sync.daysAgo', { n: days });
}

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useAppTheme();
  const { t, tInterpolate } = useI18n();
  const router = useRouter();
  const { openVoice } = useLocalSearchParams<{ openVoice?: string }>();
  const { user, signOut } = useAuthStore();
  const { settings, updateSettings } = useSettingsStore();
  const lastSyncTime = useSyncStore((s) => s.lastSyncTime);
  const autoSync = useSyncStore((s) => s.autoSync);
  const setAutoSync = useSyncStore((s) => s.setAutoSync);
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const syncNow = useSyncStore((s) => s.syncNow);
  const syncError = useSyncStore((s) => s.syncError);
  const lastSyncItems = useSyncStore((s) => s.lastSyncItems);
  const [clockTick, setClockTick] = useState(0);
  const [voiceSelectorVisible, setVoiceSelectorVisible] = useState(false);
  const [cacheLabel, setCacheLabel] = useState('—');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const scrollY = useSharedValue(0);

  const reminderDate = useMemo(() => {
    const { hour, minute } = parseTimeString(settings.dailyReminderTime);
    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    return d;
  }, [settings.dailyReminderTime]);

  const handleReminderToggle = async (enabled: boolean) => {
    void haptics.tap();
    void updateSettings({ dailyReminderEnabled: enabled });
    if (enabled) {
      const { hour, minute } = parseTimeString(settings.dailyReminderTime);
      await scheduleDailyReminder(hour, minute);
    } else {
      await cancelAllScheduledNotifications();
    }
  };

  const handleTimeChange = async (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (!selectedDate) return;
    const hour = selectedDate.getHours();
    const minute = selectedDate.getMinutes();
    const timeStr = formatTime(hour, minute);
    void haptics.light();
    void updateSettings({ dailyReminderTime: timeStr });
    if (settings.dailyReminderEnabled) {
      await scheduleDailyReminder(hour, minute);
    }
  };

  const refreshCacheLabel = useCallback(async () => setCacheLabel(await getCacheSizeLabel()), []);

  useEffect(() => {
    void refreshCacheLabel();
  }, [refreshCacheLabel]);

  const openVoiceParam = Array.isArray(openVoice) ? openVoice[0] : openVoice;
  useFocusEffect(
    useCallback(() => {
      if (openVoiceParam === '1') {
        setVoiceSelectorVisible(true);
      }
    }, [openVoiceParam]),
  );

  useFocusEffect(
    useCallback(() => {
      const id = setInterval(() => setClockTick((n) => n + 1), 30_000);
      return () => clearInterval(id);
    }, []),
  );

  const lastSyncedLabel = useMemo(() => {
    void clockTick;
    return formatLastSyncedLabel(lastSyncTime, t, tInterpolate);
  }, [lastSyncTime, clockTick, t, tInterpolate]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const largeTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 48], [1, 0], Extrapolate.CLAMP),
    transform: [{ scale: interpolate(scrollY.value, [0, 80], [1, 0.9], Extrapolate.CLAMP) }],
  }));

  const compactTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [40, 70], [0, 1], Extrapolate.CLAMP),
  }));

  const initials = user?.email?.split('@')[0]?.slice(0, 2).toUpperCase() ?? 'U';

  const handlePreviewCurrentVoice = async () => {
    try {
      await previewTTS({
        text: 'Hello! This is how I sound.',
        voice: settings.ttsVoice,
        speed: settings.ttsSpeed,
      });
    } catch (err) {
      console.warn('TTS preview failed', err);
    }
  };

  const handlePreviewVoice = async (voice: Voice) => {
    try {
      await previewTTS({ text: voice.preview, voice: voice.id, speed: settings.ttsSpeed });
    } catch (err) {
      console.warn('TTS preview failed', err);
    }
  };

  const handleClearCache = () => {
    Alert.alert('Clear cache?', 'This removes downloaded audio. It will be fetched again next time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await clearCache();
          void haptics.success();
          await refreshCacheLabel();
        },
      },
    ]);
  };

  const handleExport = async () => {
    try {
      await exportAllData();
      void haptics.success();
    } catch (err) {
      console.warn('Export failed', err);
      void haptics.error();
      Alert.alert('Export failed', 'Please try again.');
    }
  };

  const handleDeleteAll = () => {
    Alert.alert(
      'Delete all local data?',
      'This wipes your library, progress, conversations, and settings on this device. Synced cloud data is not affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteAllLocalData();
            if (user) await signOut();
            void haptics.warning();
            router.replace('/welcome');
          },
        },
      ],
    );
  };

  const openURL = (url: string) => {
    Linking.openURL(url).catch(() => Alert.alert('Unable to open link'));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Compact floating title that fades in on scroll */}
      <Animated.View
        pointerEvents="none"
        style={[styles.compactHeader, { backgroundColor: `${colors.background}F5` }, compactTitleStyle]}
      >
        <Text variant="titleMedium" style={{ color: colors.onBackground, fontWeight: '600' }}>
          Settings
        </Text>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* Large Title */}
        <Animated.View style={[styles.header, largeTitleStyle]}>
          <Text variant="displaySmall" style={[styles.title, { color: colors.onBackground }]}>
            Settings
          </Text>
        </Animated.View>

        {/* Account */}
        <Animated.View entering={FadeInDown.duration(360).delay(40).springify()} style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>
            Account
          </Text>
          <Card variant="elevated" padding={0}>
            {user ? (
              <View style={styles.accountCard}>
                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                  <Text variant="titleLarge" style={styles.avatarText}>
                    {initials}
                  </Text>
                </View>
                <View style={styles.accountInfo}>
                  <Text variant="titleMedium" style={{ color: colors.onSurface }} numberOfLines={1}>
                    {user.email?.split('@')[0] || 'User'}
                  </Text>
                  <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }} numberOfLines={1}>
                    {user.email}
                  </Text>
                  <View style={styles.syncBadge}>
                    {isSyncing ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <MaterialCommunityIcons name="check-circle" size={14} color={colors.success} />
                    )}
                    <Text variant="labelSmall" style={{ color: colors.success, marginLeft: 4 }}>
                      {isSyncing ? t('sync.syncing') : 'Signed in'}
                    </Text>
                  </View>
                  <Divider style={{ marginTop: 16 }} />
                  <SettingRow
                    icon="cloud-sync-outline"
                    title={t('sync.lastSynced')}
                    subtitle={[
                      lastSyncedLabel,
                      lastSyncItems > 0 ? tInterpolate('sync.itemsSynced', { n: lastSyncItems }) : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  />
                  {syncError ? (
                    <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
                      <Text variant="bodySmall" style={{ color: colors.error }}>
                        {syncError}
                      </Text>
                    </View>
                  ) : null}
                  {!isSupabaseConfigured() ? (
                    <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                        {t('sync.notConfigured')}
                      </Text>
                    </View>
                  ) : null}
                  <SettingRow
                    icon="sync"
                    title={t('sync.syncNow')}
                    subtitle={isSyncing ? t('sync.syncing') : undefined}
                    onPress={
                      isSupabaseConfigured() && !isSyncing
                        ? () => {
                            void haptics.medium();
                            void syncNow();
                          }
                        : undefined
                    }
                    right={
                      isSyncing ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <MaterialCommunityIcons name="chevron-right" size={22} color={colors.onSurfaceVariant} />
                      )
                    }
                  />
                  <Divider />
                  <SettingRow
                    icon="cloud-clock-outline"
                    title={t('sync.autoSync')}
                    subtitle={t('sync.autoSyncSubtitle')}
                    right={
                      <Switch
                        value={autoSync}
                        disabled={!isSupabaseConfigured()}
                        onValueChange={(value) => {
                          void haptics.tap();
                          setAutoSync(value);
                        }}
                      />
                    }
                  />
                </View>
              </View>
            ) : (
              <View style={styles.loginPrompt}>
                <MaterialCommunityIcons name="account-circle-outline" size={40} color={colors.onSurfaceVariant} />
                <Text variant="titleMedium" style={[styles.loginTitle, { color: colors.onSurface }]}>
                  Sign in to your account
                </Text>
                <Text variant="bodySmall" style={[styles.loginSubtitle, { color: colors.onSurfaceVariant }]}>
                  Learning data is stored on this device.
                </Text>
                <Button
                  mode="contained"
                  onPress={() => router.push('/(auth)/login')}
                  style={styles.loginButton}
                  contentStyle={styles.loginButtonContent}
                >
                  Sign In
                </Button>
              </View>
            )}
          </Card>

          {user ? (
            <Card variant="elevated" padding={0} style={styles.signOutCard}>
              <Pressable
                onPress={() => {
                  void haptics.medium();
                  void signOut();
                }}
                accessibilityRole="button"
                accessibilityLabel="Sign out"
              >
                <View style={[styles.row, styles.signOutRow]}>
                  <Text variant="bodyLarge" style={{ color: colors.error, fontWeight: '500' }}>
                    Sign Out
                  </Text>
                </View>
              </Pressable>
            </Card>
          ) : null}
        </Animated.View>

        {/* Appearance */}
        <Section title="Appearance" delay={70}>
          <SettingRow
            icon="theme-light-dark"
            title="Dark Mode"
            subtitle="Use dark theme"
            right={
              <Switch
                value={isDark}
                onValueChange={() => {
                  void haptics.tap();
                  toggleTheme();
                }}
              />
            }
          />
        </Section>

        {/* Language */}
        <Animated.View entering={FadeInDown.duration(360).delay(100).springify()} style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>
            Language
          </Text>
          <LanguageSection />
        </Animated.View>

        {/* AI */}
        <Animated.View entering={FadeInDown.duration(360).delay(130).springify()} style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>
            AI Provider
          </Text>
          <AIProviderSection />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(360).delay(160).springify()} style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>
            Translation
          </Text>
          <TranslationSection />
        </Animated.View>

        <Section title="AI Recommendations" delay={190}>
          <SettingRow
            icon="lightbulb-on"
            title="Enable Recommendations"
            subtitle="AI-powered content suggestions"
            right={
              <Switch
                value={settings.enableRecommendations}
                onValueChange={(value) => {
                  void haptics.tap();
                  void updateSettings({ enableRecommendations: value });
                }}
              />
            }
          />
        </Section>

        {/* Audio & Feedback */}
        <Section title="Audio & Feedback" delay={220}>
          <View style={styles.expandedContent}>
            <SpeedSlider
              value={settings.ttsSpeed}
              onChange={(value) => updateSettings({ ttsSpeed: value })}
              onPreview={handlePreviewCurrentVoice}
            />
          </View>

          <Divider />

          <SettingRow
            icon="account-voice"
            title="TTS Voice"
            subtitle={settings.ttsVoice}
            onPress={() => setVoiceSelectorVisible(true)}
          />

          <Divider />

          <SettingRow
            icon="vibrate"
            title="Haptic Feedback"
            subtitle="Vibrations on taps and events"
            right={
              <Switch
                value={settings.hapticsEnabled}
                onValueChange={(value) => {
                  if (value) void haptics.tap();
                  void updateSettings({ hapticsEnabled: value });
                }}
              />
            }
          />
        </Section>

        {/* Notifications */}
        <Section title="Notifications" delay={250}>
          <SettingRow
            icon="bell-outline"
            title="Daily Reminder"
            subtitle={settings.dailyReminderEnabled ? `Every day at ${settings.dailyReminderTime}` : 'Off'}
            right={
              <Switch
                value={settings.dailyReminderEnabled}
                onValueChange={(value) => void handleReminderToggle(value)}
              />
            }
          />
          {settings.dailyReminderEnabled ? (
            <>
              <Divider />
              <SettingRow
                icon="clock-outline"
                title="Reminder Time"
                subtitle={settings.dailyReminderTime}
                onPress={() => setShowTimePicker(true)}
              />
              {showTimePicker && Platform.OS !== 'web' ? (
                <View style={styles.expandedContent}>
                  <DateTimePicker
                    value={reminderDate}
                    mode="time"
                    is24Hour
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleTimeChange}
                    themeVariant={isDark ? 'dark' : 'light'}
                  />
                  {Platform.OS === 'ios' ? (
                    <Pressable
                      onPress={() => setShowTimePicker(false)}
                      style={{ alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 4 }}
                    >
                      <Text variant="labelLarge" style={{ color: colors.primary }}>
                        Done
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </>
          ) : null}
        </Section>

        {/* Data */}
        <Section title="Data" delay={280}>
          <SettingRow
            icon="database-outline"
            title="Clear Cache"
            subtitle={`Audio cache: ${cacheLabel}`}
            onPress={handleClearCache}
          />
          <Divider />
          <SettingRow icon="export-variant" title="Export Data" subtitle="Save a JSON backup" onPress={handleExport} />
          <Divider />
          <SettingRow
            icon="trash-can-outline"
            title="Delete All Local Data"
            subtitle="Wipe this device's learning data"
            destructive
            onPress={handleDeleteAll}
          />
        </Section>

        {/* About */}
        <Section title="About" delay={310}>
          <SettingRow icon="shield-lock-outline" title="Privacy Policy" onPress={() => openURL(PRIVACY_URL)} />
          <Divider />
          <SettingRow icon="file-document-outline" title="Terms of Service" onPress={() => openURL(TERMS_URL)} />
          <Divider />
          <SettingRow
            icon="email-outline"
            title="Send Feedback"
            onPress={() => openURL(`mailto:${FEEDBACK_EMAIL}?subject=EchoType Feedback`)}
          />
          <Divider />
          <SettingRow icon="star-outline" title="Rate EchoType" onPress={() => openURL(APP_STORE_URL)} />
          <Divider />
          <SettingRow icon="information-outline" title="Version" subtitle="1.0.0" />
        </Section>
      </Animated.ScrollView>

      <VoiceSelector
        visible={voiceSelectorVisible}
        selectedVoice={settings.ttsVoice}
        onDismiss={() => {
          setVoiceSelectorVisible(false);
          if (openVoiceParam === '1') {
            router.setParams({ openVoice: undefined });
          }
        }}
        onSelect={(voiceId) => updateSettings({ ttsVoice: voiceId })}
        onPreview={handlePreviewVoice}
      />
    </SafeAreaView>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderCurve: 'continuous',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  text: {
    flex: 1,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 140 },
  compactHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 44,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 8,
    zIndex: 10,
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
    marginBottom: 28,
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
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  accountInfo: {
    flex: 1,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  loginPrompt: {
    alignItems: 'center',
    padding: 28,
  },
  loginTitle: {
    marginTop: 14,
    marginBottom: 6,
    textAlign: 'center',
    fontWeight: '600',
  },
  loginSubtitle: {
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 18,
  },
  loginButton: {
    borderRadius: 14,
  },
  loginButtonContent: {
    height: 48,
    paddingHorizontal: 28,
  },
  signOutCard: {
    marginTop: 10,
  },
  signOutRow: {
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderCurve: 'continuous',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rowText: {
    flex: 1,
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});
