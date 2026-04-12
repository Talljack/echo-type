import type { ReactNode } from 'react';
import { StyleSheet, TouchableOpacity, View, type ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: number;
  style?: ViewStyle;
}

export function Card({ children, onPress, variant = 'elevated', padding = 16, style }: CardProps) {
  const theme = useTheme();

  const getCardStyle = () => {
    const baseStyle = [styles.card, { padding }, style];

    switch (variant) {
      case 'elevated':
        return [
          ...baseStyle,
          {
            backgroundColor: theme.colors.surface,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          },
        ];
      case 'outlined':
        return [
          ...baseStyle,
          {
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.outline,
          },
        ];
      case 'filled':
        return [
          ...baseStyle,
          {
            backgroundColor: theme.colors.surfaceVariant,
          },
        ];
      default:
        return baseStyle;
    }
  };

  if (onPress) {
    return (
      <TouchableOpacity style={getCardStyle()} onPress={onPress} activeOpacity={0.7}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={getCardStyle()}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 12,
  },
});
