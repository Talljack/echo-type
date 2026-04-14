import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { CustomTabBar } from '@/components/navigation/CustomTabBar';

export default function TabLayout() {
  return (
    <View style={styles.container}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="listen" options={{ title: 'Listen' }} />
        <Tabs.Screen name="speak" options={{ title: 'Speak' }} />
        <Tabs.Screen name="library" options={{ title: 'Library' }} />
        <Tabs.Screen name="vocabulary" options={{ title: 'Vocabulary' }} />
        <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
