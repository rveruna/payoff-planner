import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, font, MIN_TARGET, radius, space } from '@/theme';

interface Props extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  /** Guidance shown under the field and read with it. */
  hint?: string | null;
  prefix?: string;
  suffix?: string;
}

/** A labelled text field. The error is announced when it appears, and the field is marked invalid. */
export function FormField({ label, error, hint, prefix, suffix, ...input }: Props) {
  const description = error ?? hint ?? undefined;
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.box, !!error && styles.boxError]}>
        {prefix ? <Text style={styles.affix}>{prefix}</Text> : null}
        <TextInput
          {...input}
          style={styles.input}
          accessibilityLabel={label}
          accessibilityHint={description}
          aria-invalid={!!error}
          placeholderTextColor="#6b7686"
        />
        {suffix ? <Text style={styles.affix}>{suffix}</Text> : null}
      </View>
      {error ? (
        <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.md },
  label: { fontSize: font.small, fontWeight: '700', color: colors.text, marginBottom: space.xs },
  box: {
    minHeight: MIN_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#8a94a6',
    borderRadius: radius.md,
    backgroundColor: colors.card,
    paddingHorizontal: space.md,
    gap: space.xs,
  },
  boxError: { borderColor: colors.danger, borderWidth: 2 },
  input: { flex: 1, fontSize: font.body, color: colors.text, paddingVertical: space.sm },
  affix: { fontSize: font.body, color: colors.muted },
  error: { color: colors.danger, fontSize: font.small, marginTop: space.xs },
  hint: { color: colors.muted, fontSize: font.small, marginTop: space.xs },
});
