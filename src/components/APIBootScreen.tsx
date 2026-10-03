import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useTheme } from '../ThemeProvider';

type APIBootScreenProps = {
  attempt?: number;
  error?: string;
  onRetry?: () => void;
};

export function APIBootScreen({ attempt = 0, error, onRetry }: APIBootScreenProps) {
  const { colors } = useTheme();
  const isError = Boolean(error);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {!isError && <ActivityIndicator size="large" color={colors.accent} />}
        <Text style={[styles.title, { color: colors.heading }]}>{isError ? 'Server unavailable' : 'Preparing StockApp'}</Text>
        <Text style={[styles.message, { color: colors.textMuted }]}>
          {isError
            ? error
            : attempt > 0
              ? 'The server is waking up. Retrying your connection.'
              : 'Restoring your session and connecting to your household.'}
        </Text>
        {isError && onRetry && (
          <TouchableOpacity accessibilityRole="button" style={[styles.retryButton, { backgroundColor: colors.accent }]} onPress={onRetry}>
            <Text style={[styles.retryText, { color: colors.white }]}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: 28 },
  content: { alignItems: 'center', gap: 16 },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  message: { fontSize: 15, lineHeight: 23, maxWidth: 300, textAlign: 'center' },
  retryButton: { borderRadius: 14, marginTop: 8, minWidth: 148, paddingHorizontal: 20, paddingVertical: 14 },
  retryText: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
});