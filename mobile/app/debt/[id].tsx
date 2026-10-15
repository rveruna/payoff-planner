import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { formatPounds, monthlyInterest, parsePercent, parsePounds } from '@domain/money';
import { FormField } from '@/components/FormField';
import { Button, Heading, Note, Screen } from '@/components/ui';
import { debtFormSchema, toFormValues, toNewDebt, type DebtFormValues } from '@/lib/debtForm';
import { useScenarioStore } from '@/store/scenarioStore';
import { space } from '@/theme';
import { leave } from '@/lib/leave';

export default function DebtScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === 'new';
  const debt = useScenarioStore((s) => s.debts.find((d) => d.id === id));
  const { addDebt, updateDebt, removeDebt } = useScenarioStore.getState();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { control, handleSubmit, formState } = useForm<DebtFormValues>({
    resolver: zodResolver(debtFormSchema),
    defaultValues: toFormValues(debt),
    mode: 'onChange',
  });

  // hooks first: React needs the same hooks on every render, so nothing may return before this
  const values = useWatch({ control }) as DebtFormValues;

  if (!isNew && !debt) {
    return (
      <Screen style={styles.pad}>
        <Heading>That debt is not here</Heading>
        <Note>It may have been removed.</Note>
        <Button label="Go back" variant="secondary" onPress={() => leave(router)} />
      </Screen>
    );
  }

  const balance = parsePounds(values.balance);
  const apr = parsePercent(values.apr);
  const minimum = parsePounds(values.minimum);
  const interest = balance !== null && apr !== null ? monthlyInterest(balance, apr) : null;
  const stuck = interest !== null && minimum !== null && balance! > 0 && minimum <= interest;

  const save = handleSubmit((form) => {
    const next = toNewDebt(form);
    if (isNew) addDebt(next);
    else updateDebt(id!, next);
    leave(router);
  });

  return (
    <Screen>
      <Stack.Screen options={{ title: isNew ? 'New debt' : 'Edit debt' }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
          <Controller
            control={control}
            name="name"
            render={({ field, fieldState }) => (
              <FormField
                label="Name"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                autoCapitalize="sentences"
                returnKeyType="next"
                testID="field-name"
              />
            )}
          />
          <Controller
            control={control}
            name="balance"
            render={({ field, fieldState }) => (
              <FormField
                label="Balance owed"
                prefix="£"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                keyboardType="decimal-pad"
                testID="field-balance"
              />
            )}
          />
          <Controller
            control={control}
            name="apr"
            render={({ field, fieldState }) => (
              <FormField
                label="Interest rate (APR)"
                suffix="%"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                keyboardType="decimal-pad"
                testID="field-apr"
              />
            )}
          />
          <Controller
            control={control}
            name="minimum"
            render={({ field, fieldState }) => (
              <FormField
                label="Minimum payment each month"
                prefix="£"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                hint={
                  stuck
                    ? `This is not more than a month's interest (${formatPounds(interest!)}), so paying only this, the debt would not shrink.`
                    : null
                }
                keyboardType="decimal-pad"
                testID="field-minimum"
              />
            )}
          />

          <View style={styles.actions}>
            <Button
              label={isNew ? 'Add debt' : 'Save changes'}
              onPress={save}
              disabled={!formState.isValid}
              testID="save-debt"
            />
            <Button label="Cancel" variant="secondary" onPress={() => leave(router)} />
            {!isNew &&
              (confirmDelete ? (
                <Button
                  label="Tap again to delete this debt"
                  variant="danger"
                  onPress={() => {
                    removeDebt(id!);
                    leave(router);
                  }}
                  testID="confirm-delete"
                />
              ) : (
                <Button
                  label="Delete this debt"
                  variant="danger"
                  onPress={() => setConfirmDelete(true)}
                  testID="delete-debt"
                />
              ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { padding: space.lg, gap: space.sm },
  actions: { gap: space.sm, marginTop: space.md },
});
