import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { Heading, Note, Screen } from '@/components/ui';
import { space } from '@/theme';

export default function NotFound() {
  return (
    <Screen style={styles.pad}>
      <Stack.Screen options={{ title: 'Not found' }} />
      <Heading>That page does not exist</Heading>
      <Note>The link may be old or mistyped.</Note>
      <Link href="/" style={styles.link} accessibilityRole="link">
        Go to your debts
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: space.xl, gap: space.md },
  link: { color: '#1c4fd8', fontSize: 16, textDecorationLine: 'underline', paddingVertical: 12 },
});
