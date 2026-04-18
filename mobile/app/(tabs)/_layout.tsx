import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs, NativeTabTrigger } from 'expo-router/unstable-native-tabs';
import { StyleSheet, View } from 'react-native';
import { isIOS } from '@/lib/platform';

const VISIBLE_TABS = [
  { name: 'index', title: 'Home', sf: 'house.fill', mci: 'home-variant' },
  { name: 'listen', title: 'Listen', sf: 'headphones', mci: 'headphones' },
  { name: 'speak', title: 'Speak', sf: 'waveform', mci: 'microphone' },
  { name: 'read', title: 'Read', sf: 'book.fill', mci: 'book-open-variant' },
  { name: 'write', title: 'Write', sf: 'pencil', mci: 'pencil' },
  { name: 'more', title: 'More', sf: 'ellipsis.circle.fill', mci: 'dots-horizontal-circle' },
] as const;

const HIDDEN_TABS = ['library', 'vocabulary', 'settings'] as const;

export default function TabLayout() {
  if (isIOS) {
    return (
      <NativeTabs>
        {VISIBLE_TABS.map((t) => (
          <NativeTabTrigger key={t.name} name={t.name}>
            <Icon sf={t.sf} />
            <Label>{t.title}</Label>
          </NativeTabTrigger>
        ))}
        {HIDDEN_TABS.map((name) => (
          <NativeTabTrigger key={name} name={name} hidden />
        ))}
      </NativeTabs>
    );
  }

  return (
    <View style={styles.container}>
      <Tabs screenOptions={{ headerShown: false }}>
        {VISIBLE_TABS.map((t) => (
          <Tabs.Screen
            key={t.name}
            name={t.name}
            options={{
              title: t.title,
              tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name={t.mci} color={color} size={size} />,
            }}
          />
        ))}
        {HIDDEN_TABS.map((name) => (
          <Tabs.Screen key={name} name={name} options={{ href: null }} />
        ))}
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
