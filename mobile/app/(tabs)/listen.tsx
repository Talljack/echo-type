import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Screen } from '@/components/layout/Screen';
import { Card } from '@/components/ui/Card';

export default function ListenScreen() {
  const theme = useTheme();

  return (
    <Screen scrollable>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Listen & Learn
        </Text>
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
          Practice listening comprehension
        </Text>
      </View>

      <Card variant="outlined" padding={24}>
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="headphones" size={64} color={theme.colors.onSurfaceVariant} />
          <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>
            No content available
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, textAlign: 'center' }}
          >
            Add content to your library to start listening
          </Text>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 24,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
});
