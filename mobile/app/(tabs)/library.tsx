import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Screen } from '@/components/layout/Screen';
import { Card } from '@/components/ui/Card';

export default function LibraryScreen() {
  const theme = useTheme();

  return (
    <Screen scrollable>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Library
        </Text>
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
          Your learning content
        </Text>
      </View>

      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Books
        </Text>
        <Card variant="outlined" padding={24}>
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="book-open-variant" size={48} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
              No books yet
            </Text>
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Favorites
        </Text>
        <Card variant="outlined" padding={24}>
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="heart-outline" size={48} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
              No favorites yet
            </Text>
          </View>
        </Card>
      </View>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
});
