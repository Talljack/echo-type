import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useI18n } from '@/hooks/useI18n';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { fontFamily } from '@/theme/typography';

interface ConversationBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  colors: {
    primary: string;
    primaryContainer: string;
    surface: string;
    onSurface: string;
    onPrimaryContainer: string;
    onPrimary: string;
    onSurfaceVariant?: string;
    onSurfaceSecondary?: string;
  };
  /** Inline translation inside the bubble (e.g. user copy) */
  showTranslation?: boolean;
  translation?: string;
  /** Assistant: translate bar below the bubble */
  assistantTranslation?: string | null;
  assistantTranslationVisible?: boolean;
  assistantTranslationLoading?: boolean;
  onAssistantTranslatePress?: () => void;
  onPlayVoicePress?: () => void;
  isPlayingVoice?: boolean;
}

export function ConversationBubble({
  role,
  content,
  colors,
  showTranslation,
  translation,
  assistantTranslation,
  assistantTranslationVisible,
  assistantTranslationLoading,
  onAssistantTranslatePress,
  onPlayVoicePress,
  isPlayingVoice,
}: ConversationBubbleProps) {
  const isUser = role === 'user';
  const { t, tInterpolate } = useI18n();
  const translationTargetLang = useSettingsStore((s) => s.settings.translationTargetLang || 'zh');

  const mutedColor = colors.onSurfaceSecondary ?? colors.onPrimaryContainer;

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      <View
        style={[
          styles.bubble,
          isUser
            ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 }
            : { backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
        ]}
      >
        <Text style={[styles.text, { color: isUser ? colors.onPrimary : colors.onSurface }]}>{content}</Text>
        {showTranslation && translation ? (
          <Text style={[styles.translation, { color: isUser ? 'rgba(255,255,255,0.7)' : colors.onPrimaryContainer }]}>
            {translation}
          </Text>
        ) : null}
      </View>

      {onPlayVoicePress || (!isUser && onAssistantTranslatePress) ? (
        <View style={styles.assistantExtras}>
          {onPlayVoicePress ? (
            <Pressable
              onPress={onPlayVoicePress}
              accessibilityRole="button"
              accessibilityLabel={isPlayingVoice ? t('speak.stopVoice') : t('speak.playVoice')}
              style={({ pressed }) => [styles.translateBtn, pressed && { opacity: 0.75 }]}
            >
              <MaterialCommunityIcons
                name={isPlayingVoice ? 'volume-off' : 'volume-high'}
                size={18}
                color={mutedColor}
              />
            </Pressable>
          ) : null}
          {!isUser && onAssistantTranslatePress ? (
            <Pressable
              onPress={onAssistantTranslatePress}
              disabled={assistantTranslationLoading}
              accessibilityRole="button"
              accessibilityLabel={t('speak.translateMessage')}
              accessibilityHint={tInterpolate('speak.translateToLangHint', { lang: translationTargetLang })}
              style={({ pressed }) => [styles.translateBtn, pressed && { opacity: 0.75 }]}
            >
              {assistantTranslationLoading ? (
                <ActivityIndicator size="small" color={mutedColor} />
              ) : (
                <MaterialCommunityIcons name="translate" size={18} color={mutedColor} />
              )}
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {!isUser && assistantTranslationVisible && assistantTranslation ? (
        <Text style={[styles.translationBelow, { color: mutedColor }]}>{assistantTranslation}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderCurve: 'continuous',
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: fontFamily.body,
  },
  translation: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    fontStyle: 'italic',
    fontFamily: fontFamily.body,
  },
  assistantExtras: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '80%',
  },
  translateBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  translationBelow: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    maxWidth: '80%',
    fontStyle: 'italic',
    fontFamily: fontFamily.body,
  },
});
