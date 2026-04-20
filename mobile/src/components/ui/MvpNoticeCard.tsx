import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';

interface MvpNoticeCardProps {
  title: string;
  body: string;
}

export function MvpNoticeCard({ title, body }: MvpNoticeCardProps) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.primaryContainer }]}>
      <Text variant="titleSmall" style={[styles.title, { color: colors.onPrimaryContainer }]}>
        {title}
      </Text>
      <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
        {body}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
  },
  title: {
    fontWeight: '600',
    marginBottom: 6,
  },
});
