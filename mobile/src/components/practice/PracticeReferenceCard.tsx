import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';
import { fontFamily } from '@/theme/typography';

interface PracticeReferenceCardProps {
  title: string;
  titleColor: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function PracticeReferenceCard({ title, titleColor, actions, children }: PracticeReferenceCardProps) {
  const { colors } = useAppTheme();

  return (
    <Card style={[styles.card, { backgroundColor: colors.surface }]}>
      <Card.Content>
        <View style={styles.header}>
          <Text variant="titleMedium" style={[styles.title, { color: titleColor }]}>
            {title}
          </Text>
          {actions ? <View style={styles.actions}>{actions}</View> : null}
        </View>
        {children}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    marginBottom: 16,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  title: {
    fontFamily: fontFamily.headingBold,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
