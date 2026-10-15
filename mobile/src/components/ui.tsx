import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { colors, font, MIN_TARGET, radius, space } from '@/theme';

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Heading({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <Text accessibilityRole="header" style={[styles.heading, style]}>
      {children}
    </Text>
  );
}

export function Note({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.note, style]}>{children}</Text>;
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  hint?: string;
  testID?: string;
  accessibilityLabel?: string;
}

/** A button at least 48 points tall, with its state announced. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  hint,
  testID,
  accessibilityLabel,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant !== 'primary' && styles.buttonTextDark,
          variant === 'danger' && styles.buttonTextDanger,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    // the page's main landmark on the web, where there is no other way to skip the tab bar
    <View role="main" style={[styles.screen, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
  },
  heading: { fontSize: font.title, fontWeight: '700', color: colors.text, marginBottom: space.xs },
  note: { fontSize: font.small, color: colors.muted, lineHeight: 19 },
  button: {
    minHeight: MIN_TARGET,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  primary: { backgroundColor: colors.accent, borderColor: '#1f6f50' },
  secondary: { backgroundColor: colors.card, borderColor: '#8a94a6' },
  danger: { backgroundColor: colors.card, borderColor: colors.danger },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
  buttonText: { fontSize: font.body, fontWeight: '600', color: colors.onAccent },
  buttonTextDark: { color: colors.text },
  buttonTextDanger: { color: colors.danger },
  screen: { flex: 1, backgroundColor: colors.background },
});
