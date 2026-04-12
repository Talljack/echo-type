import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTheme } from 'react-native-paper';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
}: ButtonProps) {
  const theme = useTheme();

  const getButtonStyle = () => {
    const baseStyle = [styles.button, styles[size]];

    if (fullWidth) baseStyle.push(styles.fullWidth);
    if (disabled) baseStyle.push(styles.disabled);

    switch (variant) {
      case 'primary':
        return [...baseStyle, { backgroundColor: theme.colors.primary }];
      case 'secondary':
        return [...baseStyle, { backgroundColor: theme.colors.secondary }];
      case 'outline':
        return [
          ...baseStyle,
          {
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderColor: theme.colors.primary,
          },
        ];
      case 'ghost':
        return [...baseStyle, { backgroundColor: 'transparent' }];
      default:
        return baseStyle;
    }
  };

  const getTextStyle = () => {
    const baseStyle = [styles.text, styles[`${size}Text`]];

    switch (variant) {
      case 'primary':
      case 'secondary':
        return [...baseStyle, { color: theme.colors.onPrimary }];
      case 'outline':
      case 'ghost':
        return [...baseStyle, { color: theme.colors.primary }];
      default:
        return baseStyle;
    }
  };

  return (
    <TouchableOpacity style={getButtonStyle()} onPress={onPress} disabled={disabled || loading} activeOpacity={0.7}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : theme.colors.primary} />
      ) : (
        <Text style={getTextStyle()}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  small: {
    height: 36,
    paddingHorizontal: 16,
  },
  medium: {
    height: 44,
    paddingHorizontal: 24,
  },
  large: {
    height: 52,
    paddingHorizontal: 32,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '600',
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
});
