import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useTheme } from 'react-native-paper';

export default function TabLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          elevation: 8,
          backgroundColor: theme.colors.surface,
          borderRadius: 24,
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
          borderTopWidth: 0,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
            },
            android: {
              elevation: 8,
            },
          }),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="listen"
        options={{
          title: 'Listen',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="headphones" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="speak"
        options={{
          title: 'Speak',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="microphone" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="book-open-variant" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="cog" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
