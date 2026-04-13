import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native';

interface MvpNoticeCardProps {
  title: string;
  body: string;
}

export function MvpNoticeCard({ title, body }: MvpNoticeCardProps) {
  return (
    <View style={styles.card}>
      <Text variant="titleSmall" style={styles.title}>
        {title}
      </Text>
      <Text variant="bodyMedium" style={styles.body}>
        {body}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
  },
  title: {
    color: '#312E81',
    fontWeight: '600',
    marginBottom: 6,
  },
  body: {
    color: '#4B5563',
  },
});
