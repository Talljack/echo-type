import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <LinearGradient colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.98)']} style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const iconName = getIconName(route.name);
          const label = options.title || route.name;

          return (
            <Pressable key={route.key} onPress={onPress} style={styles.tab}>
              {isFocused && (
                <LinearGradient
                  colors={['#A78BFA', '#7C3AED']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.activeBackground}
                />
              )}
              <View style={[styles.iconContainer, isFocused && styles.activeIconContainer]}>
                <MaterialCommunityIcons name={iconName} size={24} color={isFocused ? '#FFFFFF' : '#6B7280'} />
              </View>
              <Animated.Text
                style={[styles.label, { color: isFocused ? '#7C3AED' : '#6B7280' }, isFocused && styles.activeLabel]}
              >
                {label}
              </Animated.Text>
            </Pressable>
          );
        })}
      </LinearGradient>
    </View>
  );
}

function getIconName(routeName: string): any {
  switch (routeName) {
    case 'index':
      return 'view-dashboard';
    case 'listen':
      return 'headphones';
    case 'speak':
      return 'microphone';
    case 'library':
      return 'book-open-variant';
    case 'settings':
      return 'cog';
    default:
      return 'circle';
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    height: 68,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    paddingVertical: 8,
  },
  activeBackground: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    top: 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeIconContainer: {
    transform: [{ scale: 1.05 }],
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  activeLabel: {
    fontWeight: '600',
  },
});
