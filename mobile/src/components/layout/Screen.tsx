import type { ReactNode } from 'react';
import { ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenProps {
  children: ReactNode;
  scrollable?: boolean;
  padding?: number;
  backgroundColor?: string;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export function Screen({ children, scrollable = false, padding = 16, backgroundColor, edges }: ScreenProps) {
  const theme = useTheme();
  const bgColor = backgroundColor || theme.colors.background;

  const content = scrollable ? (
    <View style={[styles.content, { padding }]}>{children}</View>
  ) : (
    <View style={styles.contentNoFlex}>{children}</View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={edges}>
      <StatusBar barStyle="dark-content" backgroundColor={bgColor} />
      {scrollable ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
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
    flexGrow: 1,
    paddingBottom: 120,
  },
  content: {
    flex: 1,
  },
  contentNoFlex: {
    flex: 1,
  },
});
