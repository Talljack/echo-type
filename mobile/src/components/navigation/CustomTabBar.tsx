import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '@/theme/colors';
import { componentSpacing, spacing } from '@/theme/spacing';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name;

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

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        // Get icon name based on route
        const getIconName = () => {
          switch (route.name) {
            case 'index':
              return 'view-dashboard';
            case 'library':
              return 'book-open-variant';
            case 'vocabulary':
              return 'card-text';
            case 'settings':
              return 'cog';
            default:
              return 'circle';
          }
        };

        return (
          <TabBarItem
            key={route.key}
            label={String(label)}
            iconName={getIconName()}
            isFocused={isFocused}
            onPress={onPress}
            onLongPress={onLongPress}
          />
        );
      })}
    </View>
  );
}

interface TabBarItemProps {
  label: string;
  iconName: string;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

function TabBarItem({ label, iconName, isFocused, onPress, onLongPress }: TabBarItemProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={`${label} tab`}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.tab, animatedStyle]}
    >
      <Icon name={iconName} size={24} color={isFocused ? colors.primary : colors.onSurfaceVariant} />
      <Text
        variant="labelSmall"
        style={[styles.label, { color: isFocused ? colors.primary : colors.onSurfaceVariant }]}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 28,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    minHeight: componentSpacing.touchTargetMin,
  },
  label: {
    marginTop: spacing.xs,
    fontWeight: '500',
  },
});
