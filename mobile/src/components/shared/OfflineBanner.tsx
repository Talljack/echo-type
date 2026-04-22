import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/hooks/useI18n';
import { useNetworkState } from '@/hooks/useNetworkState';

export function OfflineBanner() {
  const { colors } = useAppTheme();
  const { t } = useI18n();
  const { isConnected } = useNetworkState();

  if (isConnected) {
    return null;
  }

  return (
    <View style={[styles.banner, { backgroundColor: colors.errorLight }]}>
      <MaterialCommunityIcons name="wifi-off" size={16} color={colors.error} />
      <Text variant="bodySmall" style={[styles.text, { color: colors.error }]}>
        {t('offline.banner', 'You are offline')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  text: {
    fontWeight: '500',
  },
});
