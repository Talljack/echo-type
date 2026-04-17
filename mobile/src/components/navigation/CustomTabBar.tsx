import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React, { type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useAppTheme } from '@/contexts/ThemeContext';
import { haptics } from '@/lib/haptics';
import { fontFamily } from '@/theme/typography';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const ROUTE_DISPLAY_LABELS: Record<string, string> = {
  index: 'Home',
  listen: 'Listen',
  speak: 'Speak',
  read: 'Read',
  write: 'Write',
  more: 'More',
};

const HIDDEN_TABS = new Set(['library', 'vocabulary', 'settings']);

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {state.routes.map((route, index) => {
        if (HIDDEN_TABS.has(route.name)) return null;

        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const fallback = ROUTE_DISPLAY_LABELS[route.name] ?? route.name;

        const rawLabel =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : fallback;

        const displayLabel = (() => {
          if (typeof rawLabel === 'function') {
            const node = rawLabel({
              focused: isFocused,
              color: isFocused ? colors.primary : colors.onSurfaceSecondary,
              position: 'below-icon',
              children: fallback,
            });
            return typeof node === 'string' ? node : fallback;
          }
          return String(rawLabel);
        })();

        const onPress = () => {
          void haptics.light();
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

        const getIconName = () => {
          switch (route.name) {
            case 'index':
              return 'home';
            case 'listen':
              return 'headphones';
            case 'speak':
              return 'microphone';
            case 'read':
              return 'book-open-variant';
            case 'write':
              return 'pencil';
            case 'more':
              return 'dots-horizontal';
            default:
              return 'circle';
          }
        };

        return (
          <TabBarItem
            key={route.key}
            label={displayLabel}
            iconName={getIconName()}
            isFocused={isFocused}
            onPress={onPress}
            onLongPress={onLongPress}
            colors={colors}
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
  colors: {
    primary: string;
    primaryContainer: string;
    onSurfaceSecondary: string;
  };
}

function TabBarItem({ label, iconName, isFocused, onPress, onLongPress, colors }: TabBarItemProps) {
  const scale = useSharedValue(1);
  const backgroundColor = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedBackgroundStyle = useAnimatedStyle(() => ({
    backgroundColor: backgroundColor.value === 1 ? colors.primaryContainer : 'transparent',
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.85, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  React.useEffect(() => {
    backgroundColor.value = withSpring(isFocused ? 1 : 0, { damping: 20, stiffness: 300 });
  }, [isFocused]);

  const iconColor = isFocused ? colors.primary : colors.onSurfaceSecondary;
  const labelColor = isFocused ? colors.primary : colors.onSurfaceSecondary;

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
      <Animated.View style={[styles.iconContainer, animatedBackgroundStyle]}>
        <MaterialCommunityIcons
          name={iconName as ComponentProps<typeof MaterialCommunityIcons>['name']}
          size={22}
          color={iconColor}
        />
      </Animated.View>
      <Text numberOfLines={1} style={[styles.tabLabel, { color: labelColor, fontFamily: fontFamily.bodyMedium }]}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 28,
    left: 12,
    right: 12,
    flexDirection: 'row',
    borderRadius: 28,
    paddingVertical: 4,
    paddingHorizontal: 2,
    borderCurve: 'continuous',
    boxShadow: [
      {
        offsetX: 0,
        offsetY: 4,
        blurRadius: 12,
        spreadDistance: 0,
        color: 'rgba(0, 0, 0, 0.15)',
      },
    ],
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
  },
});
