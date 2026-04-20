import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';
import { Button as PaperButton, useTheme } from 'react-native-paper';

interface ButtonProps {
  children: ReactNode;
  onPress: () => void;
  mode?: 'text' | 'outlined' | 'contained' | 'elevated' | 'contained-tonal';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  labelStyle?: TextStyle;
  textColor?: string;
  gradient?: boolean;
}

export function Button({
  children,
  onPress,
  mode = 'contained',
  disabled = false,
  loading = false,
  icon,
  style,
  contentStyle,
  labelStyle,
  textColor,
  gradient = false,
}: ButtonProps) {
  const theme = useTheme();

  if (gradient && mode === 'contained') {
    return (
      <LinearGradient
        colors={['#A78BFA', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.gradient, style]}
      >
        <PaperButton
          mode="text"
          onPress={onPress}
          disabled={disabled}
          loading={loading}
          icon={icon}
          contentStyle={contentStyle}
          labelStyle={[{ color: '#FFFFFF' }, labelStyle]}
          style={styles.gradientButton}
        >
          {children}
        </PaperButton>
      </LinearGradient>
    );
  }

  return (
    <PaperButton
      mode={mode}
      onPress={onPress}
      disabled={disabled}
      loading={loading}
      icon={icon}
      style={style}
      contentStyle={contentStyle}
      labelStyle={labelStyle}
      textColor={textColor}
    >
      {children}
    </PaperButton>
  );
}

const styles = StyleSheet.create({
  gradient: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  gradientButton: {
    backgroundColor: 'transparent',
  },
});
